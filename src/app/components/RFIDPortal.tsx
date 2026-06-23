import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Radio, Zap, CheckCircle2, Clock, TrendingUp, Box, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { getContainers, updateStockEntryContainer } from '../utils/storage';
import { createClient } from '../utils/supabase/client';

// 📡 Funções RFID (SGTIN-96 Decoding)
function normalizeRFIDPayload(value: string): string {
  return value.replace(/\s/g, '').toUpperCase();
}

function isRFIDCode(code: string): boolean {
  const trimmed = normalizeRFIDPayload(code);
  return /^[0-9A-Fa-f]{24}$/.test(trimmed);
}

function decodeRFID(epcHex: string): { barcode: string; cai: string } | null {
  try {
    const normalizedEpcHex = normalizeRFIDPayload(epcHex);
    const epcBigInt = BigInt('0x' + normalizedEpcHex);
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

function extractRFIDCodes(rawValue: string): string[] {
  const rawUpper = rawValue.toUpperCase();
  const directMatches = rawUpper.match(/[0-9A-F]{24}/g) || [];
  const codes = directMatches.length > 0 ? directMatches : (() => {
    const hexOnly = rawUpper.replace(/[^0-9A-F]/g, '');
    const chunks: string[] = [];

    for (let index = 0; index + 24 <= hexOnly.length; index += 24) {
      chunks.push(hexOnly.slice(index, index + 24));
    }

    return chunks;
  })();

  return Array.from(new Set(codes.map(normalizeRFIDPayload).filter(isRFIDCode)));
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
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const [stats, setStats] = useState({
    totalReads: 0,
    uniqueTags: 0,
    duplicates: 0,
    readsPerMinute: 0,
    sessionStart: 0,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const readingsMapRef = useRef<Map<string, RFIDReading>>(new Map());
  const lastReadByTagRef = useRef<Map<string, number>>(new Map());
  const readsInLastMinuteRef = useRef<number[]>([]);
  const scanBufferRef = useRef<string>('');
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadContainers = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('containers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setContainers(data);
        return;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar contêineres do Supabase:', error);
    }
    // fallback para a função original caso Supabase falhe
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
      const { data, error } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('barcode', rfidData.barcode)
        .maybeSingle();

      if (error) {
        throw error;
      }

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

    const cleanValue = normalizeRFIDPayload(value);
    console.log('   Valor limpo:', cleanValue, 'Tamanho:', cleanValue.length);

    if (!isRFIDCode(cleanValue)) {
      console.log('❌ Não é código RFID válido (precisa 24 chars hex)');
      return;
    }

    console.log('✅ RFID VÁLIDO detectado! Processando...');

    // Anti-duplicidade por tag: não bloqueia tags diferentes lidas na mesma rajada.
    const now = Date.now();
    const lastTagReadAt = lastReadByTagRef.current.get(cleanValue) || 0;
    if (now - lastTagReadAt < 200) {
      console.log('⚠️ Leitura duplicada ignorada (mesma tag em menos de 200ms)');
      return;
    }

    lastReadByTagRef.current.set(cleanValue, now);
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

  const processRFIDPayload = useCallback((rawValue: string): boolean => {
    if (rawValue.toUpperCase().replace(/[^0-9A-F]/g, '').length < 24) {
      return false;
    }

    const codes = extractRFIDCodes(rawValue);

    if (codes.length === 0) {
      console.log('❌ Nenhum EPC RFID completo encontrado no payload:', rawValue);
      return false;
    }

    console.log(`📡 Payload RFID processado: ${codes.length} tag(s) encontrada(s)`);
    codes.forEach(handleRFIDInput);
    return true;
  }, [handleRFIDInput]);

  const processBufferedRFID = useCallback((forceFlush = false) => {
    const hexOnly = scanBufferRef.current.toUpperCase().replace(/[^0-9A-F]/g, '');
    const codes: string[] = [];
    let consumedLength = 0;

    while (consumedLength + 24 <= hexOnly.length) {
      codes.push(hexOnly.slice(consumedLength, consumedLength + 24));
      consumedLength += 24;
    }

    const remainder = forceFlush ? '' : hexOnly.slice(consumedLength);
    scanBufferRef.current = remainder;
    setScanBuffer(remainder);

    if (codes.length === 0) {
      if (forceFlush && hexOnly.length > 0) {
        console.log('❌ Buffer descartado sem EPC completo:', hexOnly);
      }
      return false;
    }

    console.log(`📡 Buffer RFID processado: ${codes.length} tag(s), resto=${remainder.length}`);
    codes.forEach(handleRFIDInput);
    return true;
  }, [handleRFIDInput]);

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

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        console.log(`✅ ${e.key} detectado! Buffer completo:`, scanBufferRef.current);
        processBufferedRFID(true);
        return;
      }

      if (e.key.length > 1) return;

      const normalizedKey = e.key.toUpperCase();
      if (!/^[0-9A-F]$/.test(normalizedKey)) {
        processBufferedRFID(false);
        return;
      }

      const newBuffer = scanBufferRef.current + normalizedKey;
      scanBufferRef.current = newBuffer;
      setScanBuffer(newBuffer);

      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }

      scanTimerRef.current = setTimeout(() => {
        console.log('⏱️ Timeout atingido - processando buffer:', scanBufferRef.current);
        if (scanBufferRef.current.length >= 24) {
          processBufferedRFID(false);
        }
      }, 150);
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
  }, [isActive, processBufferedRFID]);

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
    lastReadByTagRef.current.clear();
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
    if (readings.length === 0) {
      toast.error('Nenhuma tag lida', {
        description: 'Inicie o portal e leia os pneus antes de confirmar.',
      });
      return;
    }

    if (!selectedContainer) {
      toast.error('Selecione um container de destino');
      return;
    }

    const targetContainer = containers.find(container => container.id === selectedContainer);
    if (!targetContainer) {
      toast.error('Container de destino inválido');
      return;
    }

    setIsMoving(true);

    try {
      const userData = JSON.parse(localStorage.getItem('porsche-cup-user') || '{}');
      const userId = userData.id || '';
      const userName = userData.name || 'Usuário';
      const validReadings = readings.filter(reading => reading.tireData);
      const missingStockCount = readings.length - validReadings.length;
      let skippedSameContainer = 0;

      const movements = validReadings
        .map(reading => {
          const tire = reading.tireData;
          const fromContainerId = tire.container_id || '';

          if (fromContainerId === selectedContainer) {
            skippedSameContainer++;
            return null;
          }

          return {
            barcode: reading.barcode,
            model_name: tire.model_name || '-',
            model_type: tire.model_type || 'Slick',
            from_container_id: fromContainerId || null,
            from_container_name: tire.container_name || 'Sem Contêiner',
            to_container_id: selectedContainer,
            to_container_name: targetContainer.name,
            moved_by: userId || null,
            moved_by_name: userName,
            reason: 'Movimentação via Portal RFID',
          };
        })
        .filter(Boolean) as Array<{
          barcode: string;
          model_name: string;
          model_type: string;
          from_container_id: string | null;
          from_container_name: string;
          to_container_id: string;
          to_container_name: string;
          moved_by: string | null;
          moved_by_name: string;
          reason: string;
        }>;

      if (movements.length === 0) {
        toast.warning('Nenhum pneu para movimentar', {
          description: missingStockCount > 0
            ? `${missingStockCount} tag(s) não encontrada(s) no estoque.`
            : 'Os pneus lidos já estão no container selecionado.',
        });
        return;
      }

      const supabase = createClient();
      const { error: movementError } = await supabase
        .from('tire_movements')
        .insert(movements);

      if (movementError) {
        throw movementError;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const movement of movements) {
        try {
          await updateStockEntryContainer(
            movement.barcode,
            selectedContainer,
            targetContainer.name
          );
          successCount++;
        } catch (error) {
          console.error('Erro ao mover pneu:', movement.barcode, error);
          errorCount++;
        }
      }

      const notes = [
        `${successCount} pneu${successCount === 1 ? '' : 's'} movido${successCount === 1 ? '' : 's'} com sucesso`,
        errorCount > 0 ? `${errorCount} erro${errorCount === 1 ? '' : 's'}` : '',
        skippedSameContainer > 0 ? `${skippedSameContainer} já estava${skippedSameContainer === 1 ? '' : 'm'} no destino` : '',
        missingStockCount > 0 ? `${missingStockCount} não encontrado${missingStockCount === 1 ? '' : 's'} no estoque` : '',
      ].filter(Boolean).join(' • ');

      if (errorCount > 0) {
        toast.warning('Movimentação concluída com erros', { description: notes });
      } else {
        toast.success('Movimentação concluída', { description: notes });
      }

      window.dispatchEvent(new Event('tire-moved'));

      // Reset
      handleStopPortal();
      setSelectedContainer('');
      setReadings([]);
      readingsMapRef.current.clear();
      lastReadByTagRef.current.clear();
      setScanBuffer('');
      scanBufferRef.current = '';
      readsInLastMinuteRef.current = [];
      setStats({
        totalReads: 0,
        uniqueTags: 0,
        duplicates: 0,
        readsPerMinute: 0,
        sessionStart: Date.now(),
      });
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

  const sessionDuration = isActive && stats.sessionStart > 0 ? Date.now() - stats.sessionStart : 0;

  const ReadingRow = ({ reading }: { reading: RFIDReading }) => (
    <>
      {/* Mobile card */}
      <div
        id={`rfid-${reading.rfid}`}
        className="sm:hidden flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <div className="mt-0.5 flex-shrink-0">
          {reading.tireData
            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
            : <span className="w-4 h-4 rounded-full border-2 border-yellow-400 inline-block" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-semibold text-gray-900">{reading.barcode}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {reading.readCount > 1 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">{reading.readCount}x</span>
              )}
              <span className="text-xs text-gray-400">{new Date(reading.timestamp).toLocaleTimeString('pt-BR')}</span>
            </div>
          </div>
          {reading.tireData ? (
            <div className="mt-0.5 text-xs text-gray-500 truncate">
              {[reading.tireData.model_name, reading.tireData.pilot, reading.tireData.container_name].filter(Boolean).join(' · ')}
            </div>
          ) : (
            <div className="mt-0.5 text-xs text-yellow-600">Não encontrado no estoque</div>
          )}
        </div>
      </div>

      {/* Desktop table row */}
      <div
        id={`rfid-${reading.rfid}`}
        className="hidden sm:grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_6rem] items-center gap-x-4 px-4 py-2 hover:bg-gray-50 transition-colors duration-150 text-sm border-b border-gray-100"
      >
        <div className="flex justify-center">
          {reading.tireData
            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
            : <span className="w-4 h-4 rounded-full border-2 border-yellow-400 inline-block" />}
        </div>
        <div className="font-mono text-gray-900 font-medium truncate">
          {reading.barcode}
          <div className="text-[10px] text-gray-400 font-normal truncate">{reading.rfid}</div>
        </div>
        <div className="text-gray-700 truncate">{reading.tireData?.model_name || <span className="text-gray-300">-</span>}</div>
        <div className="text-gray-700 truncate">{reading.tireData?.pilot || <span className="text-gray-300">-</span>}</div>
        <div className="text-gray-700 truncate">{reading.tireData?.categoria || <span className="text-gray-300">-</span>}</div>
        <div className="text-gray-700 truncate">{reading.tireData?.container_name || <span className="text-gray-300">-</span>}</div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-gray-400">{new Date(reading.timestamp).toLocaleTimeString('pt-BR')}</span>
          {reading.readCount > 1 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">{reading.readCount}x</span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="w-full text-gray-900 space-y-4">
      {/* Hidden input for RFID scanner */}
      <input
        ref={inputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none"
        inputMode="none"
        autoComplete="off"
        onChange={(e) => {
          if (processRFIDPayload(e.currentTarget.value)) {
            e.currentTarget.value = '';
            scanBufferRef.current = '';
            setScanBuffer('');
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (processRFIDPayload(e.currentTarget.value || scanBufferRef.current)) {
              e.currentTarget.value = '';
              scanBufferRef.current = '';
              setScanBuffer('');
            }
          }
        }}
        onPaste={(e) => {
          const pastedText = e.clipboardData.getData('text');
          if (processRFIDPayload(pastedText)) {
            e.preventDefault();
            e.currentTarget.value = '';
            scanBufferRef.current = '';
            setScanBuffer('');
          }
        }}
        autoFocus={isActive}
      />

      {/* Flash effect overlay */}
      <div id="read-flash" className="fixed inset-0 pointer-events-none transition-opacity duration-200 opacity-0" />

      {/* Control bar */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Radio className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-green-500' : 'text-gray-400'}`} />
          <div>
            <div className="font-semibold text-sm text-gray-900 leading-tight">Portal RFID</div>
            <div className="text-xs text-gray-500 leading-tight">
              {isActive
                ? scanBuffer
                  ? `Capturando: ${scanBuffer} (${scanBuffer.length}/24)`
                  : 'Aguardando tags...'
                : 'Leitura automática em tempo real'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isActive
              ? 'border-green-200 text-green-700 bg-green-50'
              : 'border-gray-200 text-gray-500 bg-gray-50'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {isActive ? 'ON' : 'OFF'}
          </div>

          {!isActive ? (
            <Button
              onClick={handleStartPortal}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Iniciar
            </Button>
          ) : (
            <Button
              onClick={handleStopPortal}
              size="sm"
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Pausar
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Tags únicas', value: stats.uniqueTags, color: 'text-green-600' },
          { icon: <Radio className="w-4 h-4" />, label: 'Total leituras', value: stats.totalReads, color: 'text-blue-600' },
          { icon: <TrendingUp className="w-4 h-4" />, label: 'Tags/min', value: stats.readsPerMinute, color: 'text-purple-600' },
          { icon: <Clock className="w-4 h-4" />, label: 'Tempo', value: formatTime(sessionDuration), color: 'text-orange-500' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">{icon}{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Main grid: readings + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Readings panel */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-sm text-gray-900">
              Leituras ao Vivo
              {readings.length > 0 && <span className="ml-2 text-xs text-gray-400">{readings.length}</span>}
            </span>
            <button
              type="button"
              onPointerDown={(e) => { e.stopPropagation(); setIsTableFullscreen(prev => !prev); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title={isTableFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isTableFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Fullscreen overlay via portal */}
          {isTableFullscreen && createPortal(
            <div className="fixed inset-0 z-[9999] bg-white flex flex-col text-gray-900">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0 shadow-sm">
                <span className="font-semibold text-gray-900">Leituras ao Vivo — {readings.length} pneu{readings.length !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-3">
                  {isActive && (
                    <div className="flex items-center gap-1.5 text-green-600 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Aguardando tags...
                    </div>
                  )}
                  <button
                    type="button"
                    onPointerDown={(e) => { e.stopPropagation(); setIsTableFullscreen(false); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    title="Sair da tela cheia"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {readings.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <Radio className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhuma tag detectada</p>
                  </div>
                ) : (
                  <div>
                    <div className="hidden sm:grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_6rem] gap-x-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 sticky top-0 bg-white">
                      <div /><div>Código</div><div>Modelo</div><div>Piloto</div><div>Categoria</div><div>Container</div><div className="text-right">Hora</div>
                    </div>
                    {readings.map((r) => <ReadingRow key={r.id} reading={r} />)}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}

          <div className="max-h-[420px] overflow-y-auto">
            {readings.length === 0 ? (
              <div className="py-14 text-center text-gray-400">
                <Radio className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhuma tag detectada</p>
                <p className="text-xs mt-1 text-gray-300">Passe os pneus pelo portal para iniciar</p>
              </div>
            ) : (
              <div>
                <div className="hidden sm:grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_6rem] gap-x-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 sticky top-0 bg-white">
                  <div /><div>Código</div><div>Modelo</div><div>Piloto</div><div>Categoria</div><div>Container</div><div className="text-right">Hora</div>
                </div>
                {readings.map((r) => <ReadingRow key={r.id} reading={r} />)}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: summary + movement */}
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumo da Operação</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Pneus detectados', value: stats.uniqueTags, color: 'text-green-600' },
                { label: 'Duplicadas', value: stats.duplicates, color: 'text-yellow-600' },
                { label: 'Tags/min', value: stats.readsPerMinute, color: 'text-purple-600' },
                { label: 'Tempo de sessão', value: formatTime(sessionDuration), color: 'text-orange-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Movement */}
          {readings.length > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-500" />
                Movimentação em Massa
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">
                    Mover {stats.uniqueTags} pneu{stats.uniqueTags !== 1 ? 's' : ''} para:
                  </label>
                  <Select value={selectedContainer} onValueChange={setSelectedContainer}>
                    <SelectTrigger className="bg-white border-gray-200 text-gray-900 text-sm h-9">
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
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  {isMoving ? 'Movendo...' : (
                    <><ArrowRight className="w-4 h-4 mr-2" />Confirmar Movimentação</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.7); }
          50% { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
        }
        .animate-pulse-green { animation: pulse-green 0.5s ease-out; }
        .flash-green { background: rgba(34,197,94,0.08); opacity: 1 !important; }
      `}</style>
    </div>
  );
}
