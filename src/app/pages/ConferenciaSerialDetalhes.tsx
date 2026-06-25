import { useState, useEffect, useRef } from 'react';
import { Search, Scan, Info, Trash2, Keyboard, LayoutList, Table2 } from 'lucide-react';
import { getTireByBarcode } from '../utils/storage';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner';

interface TireEntry {
  id: string;
  coluna1: string;
  piloto: string;
  ano: string;
  set: string;
  lado: string;
  tipo: string;
  situacao: 'Guardar' | 'Descartar' | '-';
  voltas: string;
  dataConferencia: Date;
  isTemp?: boolean;
}

interface ConferenciaSerialDetalhesProps {
  listaId: string;
  listaNome: string;
  onBack: () => void;
}

const isAndroid = () => /Android/i.test(navigator.userAgent);

// 📡 Função para verificar se é código RFID
function isRFIDCode(code: string): boolean {
  const trimmed = code.trim();
  return /^[0-9A-Fa-f]{24}$/.test(trimmed);
}

// 📡 Função para decodificar SGTIN-96 (EPC) e retornar código de barras e CAI
function decodeRFID(epcHex: string): { barcode: string; cai: string } | null {
  try {
    console.log(`📡 Decodificando RFID: ${epcHex}`);

    const epcBigInt = BigInt('0x' + epcHex);

    // Extrai Serial Number (38 bits finais)
    const serialMask = BigInt('0x3FFFFFFFFF');
    const serial = Number(epcBigInt & serialMask);

    // Remove Serial Number
    const withoutSerial = epcBigInt >> BigInt(38);

    // Extrai Item Reference (24 bits)
    const itemRefMask = BigInt('0xFFFFFF');
    const itemReference = Number(withoutSerial & itemRefMask);

    console.log(`📊 RFID Decodificado: ItemRef=${itemReference}, Serial=${serial}`);

    // Calcula o CAI
    const cai = Math.floor(itemReference / 16).toString();

    // Calcula o Código de Barras
    const barcodeNumber = Math.floor(serial / 4);
    const barcodeFormatted = barcodeNumber.toString().padStart(8, '0');

    console.log(`🔑 Código CAI: ${cai}`);
    console.log(`📊 Código de Barras: ${barcodeFormatted}`);

    return {
      cai,
      barcode: barcodeFormatted,
    };
  } catch (error) {
    console.error('❌ Erro ao decodificar RFID:', error);
    return null;
  }
}

export function ConferenciaSerialDetalhes({ listaId, listaNome, onBack }: ConferenciaSerialDetalhesProps) {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [items, setItems] = useState<TireEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<'scan' | 'search'>('scan');
  const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<string>('');
  const tempCounter = useRef(0);
  const initialLoadDone = useRef(false);
  const autoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Foco automático
  useEffect(() => {
    if (activeMode !== 'scan' || !inputRef.current) return;

    const interval = setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeMode]);

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
      }
    };
  }, []);
  
  // Carrega dados UMA VEZ
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    
    loadInitialData();
  }, []);
  
  async function loadInitialData() {
    try {
      setIsLoading(true);
      
      const { data, error } = await createClient()
        .from('conferencia_serial')
        .select('*')
        .eq('lista_id', listaId)
        .order('data_conferencia', { ascending: false });

      if (error) {
        console.error('Erro:', error);
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const list: TireEntry[] = data.map(item => ({
          id: item.id,
          coluna1: item.barcode || '-',
          piloto: item.piloto || '-',
          ano: item.ano || '-',
          set: item.set_pneu || '-',
          lado: item.lado || '-',
          tipo: item.tipo || '-',
          situacao: item.situacao,
          voltas: item.voltas || '-',
          dataConferencia: new Date(item.data_conferencia),
          isTemp: false
        }));
        
        setItems(list);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Erro:', error);
      setIsLoading(false);
    }
  }
  
  async function handleScan(serial: string) {
    if (!serial.trim()) return;

    let serialTrimmed = serial.trim();

    // 📡 DECODIFICA RFID se necessário
    if (isRFIDCode(serialTrimmed)) {
      console.log('📡 RFID DETECTADO:', serialTrimmed);
      const rfidData = decodeRFID(serialTrimmed);

      if (!rfidData) {
        toast.error('Erro ao decodificar RFID');
        return;
      }

      console.log('✅ RFID decodificado para código de barras:', rfidData.barcode);
      toast.success('RFID Decodificado', {
        description: `CAI: ${rfidData.cai} | Código: ${rfidData.barcode}`,
        duration: 2000
      });

      // Substitui pelo código de barras decodificado
      serialTrimmed = rfidData.barcode;
    }

    // Evita scan duplicado rápido
    if (lastScanRef.current === serialTrimmed) {
      return;
    }
    lastScanRef.current = serialTrimmed;
    setTimeout(() => { lastScanRef.current = ''; }, 500);
    
    // ========================================================================
    // PASSO 1: CRIA ITEM TEMPORÁRIO E ADICIONA IMEDIATAMENTE NA TELA
    // ========================================================================
    
    const tempId = `temp_${++tempCounter.current}_${Date.now()}`;
    
    const tempItem: TireEntry = {
      id: tempId,
      coluna1: serialTrimmed,
      piloto: 'Salvando...',
      ano: '...',
      set: '...',
      lado: '...',
      tipo: '...',
      situacao: '-',
      voltas: '...',
      dataConferencia: new Date(),
      isTemp: true
    };
    
    // ADICIONA NA TELA IMEDIATAMENTE
    setItems(prev => [tempItem, ...prev]);
    
    // Scroll
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = 0;
      }
    }, 10);
    
    // ========================================================================
    // PASSO 2: PROCESSA EM BACKGROUND (NÃO BLOQUEIA A UI)
    // ========================================================================
    
    processInBackground(serialTrimmed, tempId);
  }
  
  async function processInBackground(serial: string, tempId: string) {
    try {
      // Busca dados
      const tireData = await getTireByBarcode(serial);
      
      // Prepara para salvar
      const { data: user } = await createClient().auth.getUser();
      
      let insertData;
      
      if (!tireData) {
        insertData = {
          lista_id: listaId,
          barcode: serial,
          piloto: 'Pneu não cadastrado',
          ano: '-',
          set_pneu: '-',
          lado: '-',
          tipo: '-',
          situacao: '-',
          voltas: '-',
          user_id: user?.user?.id || null
        };
      } else {
        let situacao: 'Guardar' | 'Descartar' | '-' = 'Guardar';
        
        if (tireData.status) {
          const statusLower = tireData.status.toLowerCase();
          if (statusLower.includes('descarte') || statusLower.includes('descartado')) {
            situacao = 'Descartar';
          }
        }
        
        insertData = {
          lista_id: listaId,
          barcode: tireData.barcode || serial,
          piloto: tireData.pilot || '-',
          ano: tireData.ano || new Date().getFullYear().toString(),
          set_pneu: tireData.set_pneu || '-',
          lado: tireData.lado || '-',
          tipo: tireData.model_type || '-',
          situacao: situacao,
          voltas: tireData.tempo_vida || '-',
          user_id: user?.user?.id || null
        };
      }
      
      // Salva no banco
      const { data: saved, error } = await createClient()
        .from('conferencia_serial')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Erro ao salvar:', error);
        
        // Atualiza item temporário para mostrar erro
        setItems(prev => prev.map(item => 
          item.id === tempId 
            ? { ...item, piloto: '❌ Erro ao salvar', isTemp: false }
            : item
        ));
        
        toast.error(`Erro ao salvar ${serial}`);
        return;
      }
      
      // ======================================================================
      // PASSO 3: ATUALIZA O ITEM TEMPORÁRIO COM DADOS REAIS
      // IMPORTANTE: NÃO REMOVE E ADICIONA - APENAS ATUALIZA NO MESMO LUGAR
      // ======================================================================
      
      const realItem: TireEntry = {
        id: saved.id,
        coluna1: saved.barcode || serial,
        piloto: saved.piloto || '-',
        ano: saved.ano || '-',
        set: saved.set_pneu || '-',
        lado: saved.lado || '-',
        tipo: saved.tipo || '-',
        situacao: saved.situacao,
        voltas: saved.voltas || '-',
        dataConferencia: new Date(saved.data_conferencia),
        isTemp: false
      };
      
      // ATUALIZAÇÃO IN-PLACE - Item NUNCA sai da tela
      setItems(prev => prev.map(item => 
        item.id === tempId ? realItem : item
      ));
      
    } catch (error) {
      console.error('Erro:', error);
      
      setItems(prev => prev.map(item => 
        item.id === tempId 
          ? { ...item, piloto: '❌ Erro', isTemp: false }
          : item
      ));
      
      toast.error(`Erro ao processar ${serial}`);
    }
  }
  
  async function handleDelete(id: string) {
    if (!window.confirm('Deseja excluir?')) return;

    try {
      // Se for temporário, apenas remove
      const item = items.find(i => i.id === id);
      if (item?.isTemp) {
        setItems(prev => prev.filter(t => t.id !== id));
        toast.success('Excluído');
        return;
      }
      
      // Se for do banco, deleta
      const { error } = await createClient()
        .from('conferencia_serial')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Erro ao excluir');
        return;
      }

      setItems(prev => prev.filter(t => t.id !== id));
      toast.success('Excluído');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  }
  
  const filtered = items.filter(item =>
    item.coluna1.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.piloto.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const total = items.filter(i => !i.isTemp).length;
  const guardar = items.filter(t => !t.isTemp && t.situacao === 'Guardar').length;
  const descartar = items.filter(t => !t.isTemp && t.situacao === 'Descartar').length;
  const salvando = items.filter(i => i.isTemp).length;
  
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-gray-900 truncate mr-2">{listaNome}</h1>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {salvando > 0 && (
              <div className="bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                <span className="text-xs font-semibold text-blue-700">💾 {salvando}...</span>
              </div>
            )}
            {/* Habilitar Teclado */}
            <button
              onClick={() => setIsKeyboardEnabled(p => !p)}
              title={isKeyboardEnabled ? 'Desabilitar teclado' : 'Habilitar teclado'}
              className="flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              style={{ width: 36, height: 36, opacity: isKeyboardEnabled ? 1 : 0.4 }}
            >
              <Keyboard size={18} className="text-gray-700" />
            </button>
            {/* Alternar Cards / Tabela */}
            <button
              onClick={() => setViewMode(v => v === 'cards' ? 'table' : 'cards')}
              title={viewMode === 'cards' ? 'Visualizar como tabela' : 'Visualizar como cards'}
              className="flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              style={{ width: 36, height: 36 }}
            >
              {viewMode === 'cards' ? <Table2 size={18} className="text-gray-700" /> : <LayoutList size={18} className="text-gray-700" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveMode('scan');
              setSearchTerm('');
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm ${
              activeMode === 'scan'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Scan size={16} />
            <span>Escanear</span>
          </button>
          
          <button
            onClick={() => {
              setActiveMode('search');
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm ${
              activeMode === 'search'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Search size={16} />
            <span>Buscar</span>
          </button>
        </div>

        <input
          type="text"
          maxLength={24}
          value={activeMode === 'scan' ? serialNumber : searchTerm}
          onChange={(e) => {
            const value = e.target.value.toUpperCase();

            if (activeMode === 'scan') {
              // 🔥 Aceita hexadecimal (0-9, A-F) para RFID
              const cleaned = value.replace(/[^0-9A-F]/g, '');
              setSerialNumber(cleaned);

              console.log('📝 onChange - Conferência Serial:', cleaned, '| Length:', cleaned.length);

              // 🔥 Cancela timer anterior
              if (autoSubmitTimerRef.current) {
                clearTimeout(autoSubmitTimerRef.current);
                autoSubmitTimerRef.current = null;
              }

              // 🔥 RFID completo (24 chars) - auto-submit IMEDIATO
              if (cleaned.length === 24 && /^[0-9A-F]{24}$/.test(cleaned)) {
                console.log('🎯 RFID COMPLETO detectado - auto-submit imediato!');
                handleScan(cleaned);
                setSerialNumber('');
              }
              // 🔥 Código de barras (8 dígitos) - auto-submit após 1 segundo
              else if (cleaned.length === 8 && /^\d{8}$/.test(cleaned)) {
                console.log('⏰ Código de barras (8 dígitos) - iniciando timer de 1s...');
                autoSubmitTimerRef.current = setTimeout(() => {
                  console.log('✅ Timer disparado - auto-submit código de barras:', cleaned);
                  handleScan(cleaned);
                  setSerialNumber('');
                }, 1000);
              }
            } else {
              setSearchTerm(value);
            }
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && activeMode === 'scan' && serialNumber) {
              e.preventDefault();
              console.log('🔑 ENTER - Submetendo:', serialNumber);
              handleScan(serialNumber);
              setSerialNumber('');
            }
          }}
          inputMode={isKeyboardEnabled ? 'text' : 'none'}
          style={{
            position: 'fixed',
            top: '-9999px',
            left: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0
          }}
          autoFocus
          ref={inputRef}
        />
      </div>

      {/* Lista */}
      <div 
        className="flex-1 overflow-y-auto bg-gray-50" 
        ref={listRef}
        style={{ paddingBottom: isAndroid() ? '80px' : '0px' }}
      >
        <div className="p-3">
          {isLoading ? (
            <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-gray-500 text-sm">Carregando...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
              <Scan className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="text-gray-500 text-sm">
                {items.length === 0 ? 'Nenhum serial conferido' : 'Nenhum resultado'}
              </p>
            </div>
          ) : viewMode === 'cards' ? (
            /* ── Card view (padrão) ─────────────────────────────── */
            <div className="space-y-2">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-lg border p-3 transition-all ${
                    item.isTemp
                      ? 'border-blue-300 bg-blue-50 animate-pulse'
                      : item.piloto === 'Pneu não cadastrado'
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-bold text-gray-900 mb-1">{item.coluna1}</div>
                      <div className={`text-xs font-medium ${
                        item.isTemp ? 'text-blue-600' : item.piloto === 'Pneu não cadastrado' ? 'text-orange-700' : 'text-gray-600'
                      }`}>{item.piloto}</div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      {!item.isTemp && (
                        <>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                            item.situacao === '-' ? 'bg-gray-100 text-gray-700'
                              : item.situacao === 'Guardar' ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>{item.situacao}</span>
                          <button onClick={() => handleDelete(item.id)} className="p-1 rounded hover:bg-red-100">
                            <Trash2 size={14} className="text-red-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
                    <div><span className="text-gray-500">Ano:</span><span className="ml-1 text-gray-900 font-medium">{item.ano}</span></div>
                    <div><span className="text-gray-500">Set:</span><span className="ml-1 text-gray-900 font-medium">{item.set}</span></div>
                    <div><span className="text-gray-500">Lado:</span><span className="ml-1 text-gray-900 font-medium">{item.lado}</span></div>
                    <div className="col-span-2"><span className="text-gray-500">Tipo:</span><span className="ml-1 text-gray-900 font-medium">{item.tipo}</span></div>
                    <div><span className="text-gray-500">Voltas:</span><span className="ml-1 text-gray-900 font-medium">{item.voltas}</span></div>
                    {!item.isTemp && (
                      <div className="col-span-3 text-gray-500 mt-1">
                        {item.dataConferencia.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── Table view ─────────────────────────────────────── */
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="text-left py-1.5 px-2 font-semibold text-gray-600 w-24">Código</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-gray-600">Piloto</th>
                    <th className="text-center py-1.5 px-1 font-semibold text-gray-600 w-10">Ano</th>
                    <th className="text-center py-1.5 px-1 font-semibold text-gray-600 w-8">Set</th>
                    <th className="text-center py-1.5 px-1 font-semibold text-gray-600 w-10">Lado</th>
                    <th className="text-center py-1.5 px-1 font-semibold text-gray-600 w-12">Tipo</th>
                    <th className="text-center py-1.5 px-1 font-semibold text-gray-600 w-12">Voltas</th>
                    <th className="text-center py-1.5 px-1 font-semibold text-gray-600 w-16">Situação</th>
                    <th className="text-center py-1.5 px-1 font-semibold text-gray-600 w-20">Data</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 ${
                        item.isTemp ? 'bg-blue-50 animate-pulse'
                          : item.piloto === 'Pneu não cadastrado' ? 'bg-orange-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="py-1.5 px-2 font-mono font-bold text-gray-900 truncate">{item.coluna1}</td>
                      <td className="py-1.5 px-2 truncate">
                        <span className={`${
                          item.isTemp ? 'text-blue-600'
                            : item.piloto === 'Pneu não cadastrado' ? 'text-orange-700 font-semibold'
                            : 'text-gray-700'
                        }`}>{item.piloto}</span>
                      </td>
                      <td className="py-1.5 px-1 text-center text-gray-900">{item.ano || '-'}</td>
                      <td className="py-1.5 px-1 text-center text-gray-900">{item.set || '-'}</td>
                      <td className="py-1.5 px-1 text-center text-gray-900">{item.lado || '-'}</td>
                      <td className="py-1.5 px-1 text-center text-gray-900">{item.tipo || '-'}</td>
                      <td className="py-1.5 px-1 text-center text-gray-900">{item.voltas || '-'}</td>
                      <td className="py-1.5 px-1 text-center">
                        {!item.isTemp && (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            item.situacao === '-' ? 'bg-gray-100 text-gray-700'
                              : item.situacao === 'Guardar' ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>{item.situacao}</span>
                        )}
                      </td>
                      <td className="py-1.5 px-1 text-center text-gray-500">
                        {!item.isTemp && item.dataConferencia.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-1 px-1 text-center">
                        {!item.isTemp && (
                          <button onClick={() => handleDelete(item.id)} className="p-0.5 rounded hover:bg-red-100">
                            <Trash2 size={12} className="text-red-500" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-white p-3 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <button 
            onClick={onBack} 
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#D50000' }}
          >
            Voltar
          </button>
          
          <div className="flex items-center gap-2 text-xs flex-wrap justify-end">
            {total > 0 && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">Guardar:</span>
                  <span className="font-semibold text-green-700">{guardar}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-gray-600">Descartar:</span>
                  <span className="font-semibold text-red-700">{descartar}</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
              </>
            )}
            <div className="flex items-center gap-1.5">
              <Info size={14} className="text-gray-600" />
              <span className="font-semibold text-gray-600">
                {total} {total === 1 ? 'conferência' : 'conferências'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
