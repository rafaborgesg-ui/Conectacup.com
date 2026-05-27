import { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, Zap, CheckCircle2, Clock, TrendingUp, Box, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { getContainers, updateStockEntryByBarcode } from '../utils/storage';
import { createClient } from '../utils/supabase/client';

// 📡 Funções RFID (SGTIN-96 Decoding)
function isRFIDCode(code: string): boolean {
  const trimmed = code.trim();
  return /^[0-9A-Fa-f]{24}$/.test(trimmed);
}

function decodeRFID(epcHex: string): { barcode: string; cai: string } | null {
  try {
    const epcBigInt = BigInt('0x' + epcHex);
    const serial = Number(epcBigInt & BigInt('0x3FFFFFFFFF'));
    const itemReference = Number((epcBigInt >> BigInt(38)) & BigInt('0xFFFFFF'));
    const cai = Math.floor(itemReference / 16).toString();
    const barcodeNumber = Math.floor(serial / 4);
    const barcode = barcodeNumber.toString().padStart(8, '0');
    return { cai, barcode };
  } catch (error) {
    console.error('❌ Erro ao decodificar RFID:', error);
    return null;
  }
}

interface RFIDReading {
  id: string;
  rfid: string;
  barcode: string;
  cai: string;
  tireData?: any;
  timestamp: number;
  readCount: number;
}

export function RFIDPortal() {
  const [isActive, setIsActive] = useState(false);
  const [readings, setReadings] = useState<RFIDReading[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);
  const [scanBuffer, setScanBuffer] = useState<string>('');
  const [stats, setStats] = useState({
    totalReads: 0,
    uniqueTags: 0,
    duplicates: 0,
    readsPerMinute: 0,
    sessionStart: Date.now(),
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const readingsMapRef = useRef<Map<string, RFIDReading>>(new Map());
  const lastReadTimestampRef = useRef<number>(0);
  const readsInLastMinuteRef = useRef<number[]>([]);
  const scanBufferRef = useRef<string>('');
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadContainers = async () => {
    const containerList = await getContainers();
    setContainers(containerList);
  };

  const playReadFeedback = () => {
    const flash = document.getElementById('read-flash');
    if (flash) {
      flash.classList.add('flash-green');
      setTimeout(() => flash.classList.remove('flash-green'), 200);
    }
  };

  const fetchTireData = useCallback(async (rfid: string, rfidData: { barcode: string; cai: string }) => {
    try {
      console.log('📥 Buscando dados do pneu:', rfidData.barcode);
      const supabase = createClient();
      const { data } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('barcode', rfidData.barcode)
        .single();

      console.log('✅ Dados do pneu obtidos:', data ? 'Encontrado' : 'Não encontrado');

      const reading: RFIDReading = {
        id: rfid,
        rfid,
        barcode: rfidData.barcode,
        cai: rfidData.cai,
        tireData: data,
        timestamp: Date.now(),
        readCount: 1,
      };

      readingsMapRef.current.set(rfid, reading);

      setReadings(prev => {
        console.log('📝 Adicionando leitura à lista. Total anterior:', prev.length);
        return [reading, ...prev];
      });

      setStats(prev => ({
        ...prev,
        totalReads: prev.totalReads + 1,
        uniqueTags: prev.uniqueTags + 1,
      }));

      playReadFeedback();

      console.log('✅ Leitura processada com sucesso. Pronto para próxima!');
    } catch (error) {
      console.error('❌ Erro ao buscar dados do pneu:', error);
    }
  }, []);

  const handleRFIDInput = useCallback((value: string) => {
    console.log('🔍 handleRFIDInput chamado! Valor recebido:', value);
    console.log('   Ativo:', isActive);

    if (!isActive) {
      console.log('❌ Portal não está ativo - ignorando leitura');
      return;
    }

    const cleanValue = value.trim().toUpperCase();
    console.log('   Valor limpo:', cleanValue, 'Tamanho:', cleanValue.length);

    if (!isRFIDCode(cleanValue)) {
      console.log('❌ Não é código RFID válido (precisa 24 chars hex)');
      return;
    }

    console.log('✅ RFID VÁLIDO detectado! Processando...');

    // Anti-duplicidade: ignora se leitura muito próxima (< 200ms)
    const now = Date.now();
    if (now - lastReadTimestampRef.current < 200) {
      console.log('⚠️ Leitura ignorada (muito rápida)');
      return;
    }

    lastReadTimestampRef.current = now;
    readsInLastMinuteRef.current.push(now);

    const rfidData = decodeRFID(cleanValue);
    if (!rfidData) {
      console.error('❌ Erro ao decodificar RFID:', cleanValue);
      return;
    }

    const existingReading = readingsMapRef.current.get(cleanValue);

    if (existingReading) {
      // Tag duplicada - apenas incrementa contador
      existingReading.readCount++;
      existingReading.timestamp = now;

      setStats(prev => ({
        ...prev,
        totalReads: prev.totalReads + 1,
        duplicates: prev.duplicates + 1,
      }));

      // Destaque visual temporário
      const element = document.getElementById(`rfid-${cleanValue}`);
      if (element) {
        element.classList.add('animate-pulse-green');
        setTimeout(() => element.classList.remove('animate-pulse-green'), 500);
      }
    } else {
      // Nova tag - busca dados do pneu
      fetchTireData(cleanValue, rfidData);
    }

    // Limpa input para próxima leitura
    if (inputRef.current) {
      inputRef.current.value = '';
    }

    console.log('✅ handleRFIDInput concluído. Aguardando próxima leitura...');
  }, [isActive, fetchTireData]);

  // useEffects
  useEffect(() => {
    loadContainers();
  }, []);

  // Listener global de teclado para capturar RFID
  useEffect(() => {
    if (!isActive) {
      console.log('⏸️  Portal inativo - listener não registrado');
      return;
    }

    console.log('🎯 Portal RFID ativado - listener de teclado registrado');
    console.log('   Readings atuais:', readings.length);

    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        if (target !== inputRef.current) {
          console.log('⚠️ Tecla ignorada - foco em outro campo:', target.tagName);
          return;
        }
      }

      console.log('⌨️ Tecla pressionada:', e.key, 'Buffer atual:', scanBufferRef.current);

      if (e.key === 'Enter') {
        console.log('✅ ENTER detectado! Buffer completo:', scanBufferRef.current);
        if (scanBufferRef.current.length > 0) {
          const bufferToProcess = scanBufferRef.current;
          scanBufferRef.current = '';
          setScanBuffer('');
          handleRFIDInput(bufferToProcess);
        }
        return;
      }

      if (e.key.length > 1) return;

      const newBuffer = scanBufferRef.current + e.key.toUpperCase();
      scanBufferRef.current = newBuffer;
      setScanBuffer(newBuffer);

      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }

      scanTimerRef.current = setTimeout(() => {
        console.log('⏱️ Timeout atingido - processando buffer:', scanBufferRef.current);
        if (scanBufferRef.current.length >= 24) {
          const bufferToProcess = scanBufferRef.current;
          scanBufferRef.current = '';
          setScanBuffer('');
          handleRFIDInput(bufferToProcess);
        }
      }, 100);
    };

    window.addEventListener('keydown', handleKeyPress);

    const focusInterval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        console.log('🎯 Restaurando foco no input invisível');
        inputRef.current.focus();
      }
    }, 500);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      clearInterval(focusInterval);
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
      console.log('❌ Portal RFID desativado - listener removido');
    };
  }, [isActive, handleRFIDInput]);

  // Calcula tags por minuto
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      readsInLastMinuteRef.current = readsInLastMinuteRef.current.filter(t => t > oneMinuteAgo);

      setStats(prev => ({
        ...prev,
        readsPerMinute: readsInLastMinuteRef.current.length,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleStartPortal = () => {
    setIsActive(true);
    setStats({
      totalReads: 0,
      uniqueTags: 0,
      duplicates: 0,
      readsPerMinute: 0,
      sessionStart: Date.now(),
    });
    setReadings([]);
    setScanBuffer('');
    scanBufferRef.current = '';
    readingsMapRef.current.clear();
    readsInLastMinuteRef.current = [];

    toast.info('Portal RFID Ativado', {
      description: 'Sistema pronto para capturar tags. Passe os pneus pelo portal ou pressione F12 para ver logs de debug.',
      duration: 5000,
    });

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleStopPortal = () => {
    setIsActive(false);
  };

  const handleConfirmMovement = async () => {
    if (!selectedContainer || readings.length === 0) {
      toast.error('Selecione um container de destino');
      return;
    }

    setIsMoving(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const reading of readings) {
        try {
          await updateStockEntryByBarcode(reading.barcode, {
            containerId: selectedContainer,
          });
          successCount++;
        } catch (error) {
          console.error('Erro ao mover pneu:', reading.barcode, error);
          errorCount++;
        }
      }

      toast.success('Movimentação concluída', {
        description: `${successCount} pneus movidos com sucesso${errorCount > 0 ? `, ${errorCount} erros` : ''}`,
      });

      // Reset
      handleStopPortal();
      setSelectedContainer('');
    } catch (error) {
      toast.error('Erro ao realizar movimentação');
      console.error(error);
    } finally {
      setIsMoving(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const sessionDuration = Date.now() - stats.sessionStart;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Hidden input for RFID scanner */}
      <input
        ref={inputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleRFIDInput(e.currentTarget.value);
          }
        }}
        autoFocus={isActive}
      />

      {/* Flash effect overlay */}
      <div id="read-flash" className="fixed inset-0 pointer-events-none transition-opacity duration-200 opacity-0" />

      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Radio className="w-8 h-8 text-green-400" />
                <div>
                  <h1 className="text-2xl font-bold text-white">Portal RFID</h1>
                  <p className="text-sm text-gray-400">Leitura automática em tempo real</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Status Indicator */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                <span className="text-sm font-medium">
                  {isActive ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              {!isActive ? (
                <Button
                  onClick={handleStartPortal}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Iniciar Portal
                </Button>
              ) : (
                <Button
                  onClick={handleStopPortal}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Pausar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Debug Panel - TEMPORÁRIO */}
      {isActive && (
        <div className="bg-blue-900/30 border-b border-blue-700/50 backdrop-blur-sm">
          <div className="max-w-[1600px] mx-auto px-6 py-3">
            <div className="text-xs text-blue-300 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">🔧 DEBUG MODE:</span>
                <span>Portal Ativo: {isActive ? '✅' : '❌'}</span>
                <span>|</span>
                <span>Buffer: "{scanBuffer}" ({scanBuffer.length} chars)</span>
                <span>|</span>
                <span>Leituras: {readings.length}</span>
              </div>
              <div className="text-blue-400">
                Pressione qualquer tecla para verificar se está capturando. Abra o Console (F12) para ver logs detalhados.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Stats Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Tags Únicas
                </div>
                <div className="text-3xl font-bold text-green-400">{stats.uniqueTags}</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Radio className="w-4 h-4" />
                  Total Leituras
                </div>
                <div className="text-3xl font-bold text-blue-400">{stats.totalReads}</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <TrendingUp className="w-4 h-4" />
                  Tags/min
                </div>
                <div className="text-3xl font-bold text-purple-400">{stats.readsPerMinute}</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Tempo
                </div>
                <div className="text-2xl font-bold text-orange-400">{formatTime(sessionDuration)}</div>
              </div>
            </div>

            {/* Readings List */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Leituras ao Vivo</h2>
                {isActive && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Aguardando tags...
                    </div>
                    {scanBuffer && (
                      <div className="text-xs text-yellow-400 font-mono bg-yellow-400/10 px-2 py-1 rounded">
                        Capturando: {scanBuffer} ({scanBuffer.length}/24)
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                {readings.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <Radio className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">Nenhuma tag detectada</p>
                    <p className="text-sm mt-1">Passe os pneus pelo portal para iniciar a leitura</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {readings.map((reading) => (
                      <div
                        key={reading.id}
                        id={`rfid-${reading.rfid}`}
                        className="px-6 py-4 hover:bg-gray-700/30 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                              <div>
                                <div className="font-mono text-sm text-gray-400">
                                  RFID: {reading.rfid}
                                </div>
                                <div className="font-semibold text-white">
                                  Código: {reading.barcode}
                                </div>
                              </div>
                            </div>

                            {reading.tireData && (
                              <div className="ml-8 grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Modelo:</span>
                                  <span className="ml-2 text-gray-300">{reading.tireData.model_name || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Piloto:</span>
                                  <span className="ml-2 text-gray-300">{reading.tireData.pilot || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Categoria:</span>
                                  <span className="ml-2 text-gray-300">{reading.tireData.categoria || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Container:</span>
                                  <span className="ml-2 text-gray-300">{reading.tireData.container_name || '-'}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1 ml-4">
                            <div className="text-xs text-gray-500">
                              {new Date(reading.timestamp).toLocaleTimeString('pt-BR')}
                            </div>
                            {reading.readCount > 1 && (
                              <div className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                                {reading.readCount}x lido
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right - Movement Panel */}
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Resumo da Operação</h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Pneus detectados</span>
                  <span className="text-xl font-bold text-green-400">{stats.uniqueTags}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Leituras duplicadas</span>
                  <span className="text-xl font-bold text-yellow-400">{stats.duplicates}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Taxa de leitura</span>
                  <span className="text-xl font-bold text-purple-400">{stats.readsPerMinute}/min</span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400">Tempo de sessão</span>
                  <span className="text-xl font-bold text-orange-400">{formatTime(sessionDuration)}</span>
                </div>
              </div>
            </div>

            {/* Movement */}
            {readings.length > 0 && (
              <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Box className="w-5 h-5" />
                  Movimentação em Massa
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">
                      Mover {stats.uniqueTags} pneus para:
                    </label>
                    <Select value={selectedContainer} onValueChange={setSelectedContainer}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Selecione o container" />
                      </SelectTrigger>
                      <SelectContent>
                        {containers.map((container) => (
                          <SelectItem key={container.id} value={container.id}>
                            {container.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleConfirmMovement}
                    disabled={!selectedContainer || isMoving}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-6 text-lg"
                  >
                    {isMoving ? (
                      <>Movendo pneus...</>
                    ) : (
                      <>
                        <ArrowRight className="w-5 h-5 mr-2" />
                        Confirmar Movimentação
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes pulse-green {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
          }
        }

        .animate-pulse-green {
          animation: pulse-green 0.5s ease-out;
        }

        .flash-green {
          background: rgba(34, 197, 94, 0.1);
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
