import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Radio, Zap, CheckCircle2, AlertCircle, Maximize2, Minimize2, Package, ArrowRight, Box } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { checkBarcodeExists, saveStockEntry, type TireModel, type Container, type StockEntry } from '../utils/storage';
import { generateUUID } from '../utils/uuid';
import type { TireEntry } from './TireStockEntry';

// ─── RFID decoding (SGTIN-96) ──────────────────────────────────────────────

function normalizeRFID(v: string) { return v.replace(/\s/g, '').toUpperCase(); }
function isRFIDCode(code: string) { return /^[0-9A-Fa-f]{24}$/.test(normalizeRFID(code)); }

function decodeRFID(hex: string): { barcode: string; cai: string } | null {
  try {
    const n = normalizeRFID(hex);
    const big = BigInt('0x' + n);
    const serial = Number(big & BigInt('0x3FFFFFFFFF'));
    const itemRef = Number((big >> BigInt(38)) & BigInt('0xFFFFFF'));
    return {
      cai: Math.floor(itemRef / 16).toString(),
      barcode: Math.floor(serial / 4).toString().padStart(8, '0'),
    };
  } catch { return null; }
}

// ─── Native Zebra RFID bridge ───────────────────────────────────────────────

type NativeRFIDPayload = string | {
  epc?: string;
  rfid?: string;
  tagId?: string;
  tagID?: string;
  idHex?: string;
  barcode?: string;
  code?: string;
  tags?: NativeRFIDPayload[];
  rssi?: number;
  seenCount?: number;
  source?: string;
  timestamp?: number;
};

interface NativeRFIDStatus {
  available?: boolean;
  connected?: boolean;
  reader?: string;
  mode?: 'sdk' | 'datawedge' | 'unknown';
  message?: string;
}

interface NativeRFIDBridgeApi {
  version: string;
  receiveTag: (payload: NativeRFIDPayload) => void;
  receiveStatus: (status: NativeRFIDStatus) => void;
}

type WindowWithNativeRFIDBridge = Window & {
  ConectaCupRFIDBridge?: NativeRFIDBridgeApi;
  ZebraRFIDBridge?: {
    startInventory?: () => void;
    stopInventory?: () => void;
    configure?: (config: unknown) => void;
  };
};

const NATIVE_RFID_EVENT_NAME = 'conectacup:rfid-tag';
const NATIVE_RFID_STATUS_EVENT_NAME = 'conectacup:rfid-status';
const NATIVE_RFID_BRIDGE_READY_EVENT_NAME = 'conectacup:rfid-bridge-ready';
const NATIVE_RFID_BRIDGE_VERSION = '1.0.0';

function splitRFIDHexCodes(value: unknown): string[] {
  if (value === undefined || value === null) return [];

  const normalized = String(value).toUpperCase();
  const directMatches = normalized.match(/[0-9A-F]{24}/g);

  if (directMatches?.length) {
    return directMatches.filter(isRFIDCode);
  }

  const hex = normalized.replace(/[^0-9A-F]/g, '');
  const codes: string[] = [];

  for (let i = hex.length % 24; i + 24 <= hex.length; i += 24) {
    const code = hex.slice(i, i + 24);
    if (isRFIDCode(code)) codes.push(code);
  }

  return codes;
}

function extractRFIDsFromNativePayload(payload: NativeRFIDPayload): string[] {
  const codes: string[] = [];

  const visit = (value: NativeRFIDPayload | NativeRFIDPayload[] | undefined) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (typeof value === 'object') {
      visit(value.tags);
      codes.push(
        ...splitRFIDHexCodes(value.epc),
        ...splitRFIDHexCodes(value.rfid),
        ...splitRFIDHexCodes(value.tagId),
        ...splitRFIDHexCodes(value.tagID),
        ...splitRFIDHexCodes(value.idHex),
        ...splitRFIDHexCodes(value.code),
        ...splitRFIDHexCodes(value.barcode)
      );
      return;
    }

    codes.push(...splitRFIDHexCodes(value));
  };

  visit(payload);
  return Array.from(new Set(codes));
}

function callNativeInventory(action: 'startInventory' | 'stopInventory') {
  if (typeof window === 'undefined') return;

  try {
    (window as WindowWithNativeRFIDBridge).ZebraRFIDBridge?.[action]?.();
  } catch (error) {
    console.warn(`Falha ao executar ZebraRFIDBridge.${action}`, error);
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface RFIDStockReading {
  id: string;
  rfid: string;
  barcode: string;
  cai: string;
  modelName: string;
  modelId: string;
  status: 'ok' | 'duplicate' | 'no_model' | 'processing';
  timestamp: number;
  readCount: number;
}

interface Props {
  tireModels: TireModel[];
  containers: Container[];
  onEntriesAdded?: (entries: TireEntry[]) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function RFIDStockPortal({ tireModels, containers, onEntriesAdded }: Props) {
  const [isActive, setIsActive] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [readings, setReadings] = useState<RFIDStockReading[]>([]);
  const [scanBuffer, setScanBuffer] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef('');
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const processedRFIDs = useRef<Set<string>>(new Set());
  const readingsMapRef = useRef<Map<string, RFIDStockReading>>(new Map());
  const isActiveRef = useRef(false);
  const processRFIDRef = useRef<(rfid: string) => void | Promise<void>>(() => undefined);

  // ── Container lookup ──────────────────────────────────────────────────────

  const selectedContainerData = containers.find(c => c.id === selectedContainer);

  // ── Process a single RFID ─────────────────────────────────────────────────

  const processRFID = useCallback(async (rfid: string) => {
    const clean = normalizeRFID(rfid);
    if (!isRFIDCode(clean)) return;

    // Duplicate within session
    if (processedRFIDs.current.has(clean)) {
      const existing = readingsMapRef.current.get(clean);
      if (existing) {
        existing.readCount++;
        setReadings(prev => prev.map(r => r.rfid === clean ? { ...r, readCount: existing.readCount } : r));
      }
      return;
    }

    const decoded = decodeRFID(clean);
    if (!decoded) return;

    // Find model by CAI
    const model = tireModels.find(m => String(m.cai) === decoded.cai);

    const reading: RFIDStockReading = {
      id: generateUUID(),
      rfid: clean,
      barcode: decoded.barcode,
      cai: decoded.cai,
      modelName: model?.name ?? 'Modelo não encontrado',
      modelId: model?.id ?? '',
      status: 'processing',
      timestamp: Date.now(),
      readCount: 1,
    };

    processedRFIDs.current.add(clean);
    readingsMapRef.current.set(clean, reading);
    setReadings(prev => [reading, ...prev]);

    // Validate duplicate in DB
    const exists = await checkBarcodeExists(decoded.barcode);
    const finalStatus: RFIDStockReading['status'] = exists
      ? 'duplicate'
      : !model
      ? 'no_model'
      : 'ok';

    readingsMapRef.current.set(clean, { ...reading, status: finalStatus });
    setReadings(prev => prev.map(r => r.rfid === clean ? { ...r, status: finalStatus } : r));

    if (exists) {
      toast.warning(`Pneu ${decoded.barcode} já está no estoque`);
    } else if (!model) {
      toast.error(`CAI ${decoded.cai} não encontrado em nenhum modelo`);
    }
  }, [tireModels]);

  useEffect(() => {
    processRFIDRef.current = processRFID;
  }, [processRFID]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleNativeRFIDTag = (payload: NativeRFIDPayload) => {
      const rfids = extractRFIDsFromNativePayload(payload);

      if (rfids.length === 0) {
        console.warn('Leitura RFID nativa ignorada: payload sem EPC de 24 caracteres', payload);
        return;
      }

      if (!isActiveRef.current) {
        return;
      }

      scanBufferRef.current = '';
      setScanBuffer('');
      rfids.forEach(rfid => void processRFIDRef.current(rfid));
    };

    const handleNativeRFIDStatus = (_status: NativeRFIDStatus) => undefined;

    const bridgeApi: NativeRFIDBridgeApi = {
      version: NATIVE_RFID_BRIDGE_VERSION,
      receiveTag: handleNativeRFIDTag,
      receiveStatus: handleNativeRFIDStatus
    };
    const win = window as WindowWithNativeRFIDBridge;

    win.ConectaCupRFIDBridge = bridgeApi;

    const handleTagEvent = (event: Event) => {
      handleNativeRFIDTag((event as CustomEvent<NativeRFIDPayload>).detail);
    };
    const handleStatusEvent = (event: Event) => {
      handleNativeRFIDStatus((event as CustomEvent<NativeRFIDStatus>).detail);
    };

    window.addEventListener(NATIVE_RFID_EVENT_NAME, handleTagEvent);
    window.addEventListener(NATIVE_RFID_STATUS_EVENT_NAME, handleStatusEvent);
    window.dispatchEvent(new CustomEvent(NATIVE_RFID_BRIDGE_READY_EVENT_NAME, {
      detail: { version: NATIVE_RFID_BRIDGE_VERSION, page: 'stock-entry' }
    }));

    return () => {
      window.removeEventListener(NATIVE_RFID_EVENT_NAME, handleTagEvent);
      window.removeEventListener(NATIVE_RFID_STATUS_EVENT_NAME, handleStatusEvent);

      if (win.ConectaCupRFIDBridge === bridgeApi) {
        delete win.ConectaCupRFIDBridge;
      }
    };
  }, []);

  // ── Keyboard buffer ───────────────────────────────────────────────────────

  const flushBuffer = useCallback((force = false) => {
    const hex = scanBufferRef.current.toUpperCase().replace(/[^0-9A-F]/g, '');
    const codes: string[] = [];
    let i = 0;
    while (i + 24 <= hex.length) { codes.push(hex.slice(i, i + 24)); i += 24; }
    const remainder = force ? '' : hex.slice(i);
    scanBufferRef.current = remainder;
    setScanBuffer(remainder);
    codes.forEach(processRFID);
    return codes.length > 0;
  }, [processRFID]);

  const processRFIDPayload = useCallback((rawValue: string): boolean => {
    const hex = rawValue.toUpperCase().replace(/[^0-9A-F]/g, '');
    const codes = splitRFIDHexCodes(rawValue);

    if (codes.length === 0) {
      scanBufferRef.current = hex.length < 24 ? hex : '';
      setScanBuffer(scanBufferRef.current);
      return false;
    }

    scanBufferRef.current = '';
    setScanBuffer('');
    codes.forEach(processRFID);
    return true;
  }, [processRFID]);

  useEffect(() => {
    if (!isActive) return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target !== inputRef.current) return;

      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); flushBuffer(true); return; }
      if (e.key.length > 1) return;

      const k = e.key.toUpperCase();
      if (!/^[0-9A-F]$/.test(k)) { flushBuffer(false); return; }

      const next = scanBufferRef.current + k;
      scanBufferRef.current = next;
      setScanBuffer(next);

      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      scanTimerRef.current = setTimeout(() => {
        if (scanBufferRef.current.length >= 24) flushBuffer(false);
      }, 150);
    };

    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') ?? '';
      const hex = text.toUpperCase().replace(/[^0-9A-F]/g, '');
      if (hex.length < 24) return;
      e.preventDefault();
      let i = 0;
      while (i + 24 <= hex.length) {
        processRFID(hex.slice(i, i + 24));
        i += 24;
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    const focusInterval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) inputRef.current.focus();
    }, 100);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('paste', onPaste);
      clearInterval(focusInterval);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [isActive, flushBuffer, processRFID]);

  // ── Start / stop ──────────────────────────────────────────────────────────

  const handleStart = () => {
    if (!selectedContainer) { toast.error('Selecione um contêiner antes de iniciar'); return; }
    isActiveRef.current = true;
    setIsActive(true);
    setReadings([]);
    processedRFIDs.current.clear();
    readingsMapRef.current.clear();
    scanBufferRef.current = '';
    setScanBuffer('');
    callNativeInventory('startInventory');
    setTimeout(() => inputRef.current?.focus(), 100);
    toast.info('Portal RFID ativado', { description: 'Passe os pneus pelo portal para registrar a entrada.' });
  };

  const handleStop = () => {
    isActiveRef.current = false;
    setIsActive(false);
    callNativeInventory('stopInventory');
  };

  // ── Finish: save valid readings as stock entries ───────────────────────────

  const handleFinish = async () => {
    const valid = readings.filter(r => r.status === 'ok');
    if (valid.length === 0) { toast.error('Nenhuma leitura válida para salvar'); return; }
    if (!selectedContainerData) { toast.error('Contêiner não encontrado'); return; }

    setIsFinishing(true);
    try {
      const userData = JSON.parse(localStorage.getItem('porsche-cup-user') || '{}');
      let saved = 0;
      let failed = 0;
      const addedEntries: TireEntry[] = [];
      const savedRFIDs = new Set<string>();

      for (const r of valid) {
        const model = tireModels.find(m => m.id === r.modelId);
        if (!model) {
          failed++;
          continue;
        }

        const createdAt = new Date().toISOString();
        const entry: StockEntry = {
          id: generateUUID(),
          barcode: r.barcode,
          model_id: model.id,
          model_name: model.name,
          model_type: model.type === 'Wet' ? 'Wet' : 'Slick',
          container_id: selectedContainer,
          container_name: selectedContainerData.name,
          created_at: createdAt,
          created_by: userData.id || undefined,
          status: 'Novo',
        };

        const success = await saveStockEntry(entry);
        if (success) {
          saved++;
          savedRFIDs.add(r.rfid);
          addedEntries.push({
            id: entry.id,
            barcode: entry.barcode,
            model: model.name,
            modelId: model.id,
            container: selectedContainerData.name,
            containerId: selectedContainer,
            timestamp: new Date(createdAt),
          });
        } else {
          failed++;
          console.error('Erro ao salvar leitura RFID no estoque', r.barcode);
        }
      }

      if (saved === 0) {
        toast.error('Nenhum pneu foi registrado no estoque', {
          description: 'As leituras válidas foram mantidas para nova tentativa.',
        });
        return;
      }

      if (failed > 0) {
        toast.warning('Entrada registrada parcialmente', {
          description: `${saved} salvo${saved !== 1 ? 's' : ''}, ${failed} com erro. As falhas ficaram na lista.`,
        });
      } else {
        toast.success(`${saved} pneu${saved !== 1 ? 's' : ''} registrado${saved !== 1 ? 's' : ''} no estoque`);
      }

      onEntriesAdded?.(addedEntries);
      window.dispatchEvent(new Event('stock-entries-updated'));

      if (failed === 0) {
        handleStop();
        setReadings([]);
        processedRFIDs.current.clear();
        readingsMapRef.current.clear();
      } else {
        setReadings(prev => {
          const remaining = prev.filter(r => !savedRFIDs.has(r.rfid));
          processedRFIDs.current = new Set(remaining.map(r => r.rfid));
          readingsMapRef.current = new Map(remaining.map(r => [r.rfid, r]));
          return remaining;
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar entradas');
    } finally {
      setIsFinishing(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const okCount = readings.filter(r => r.status === 'ok').length;
  const dupCount = readings.filter(r => r.status === 'duplicate').length;
  const noModelCount = readings.filter(r => r.status === 'no_model').length;

  // ── Row sub-component ─────────────────────────────────────────────────────

  const StatusIcon = ({ status }: { status: RFIDStockReading['status'] }) => {
    if (status === 'ok') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === 'processing') return <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />;
    if (status === 'duplicate') return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    return <AlertCircle className="w-4 h-4 text-red-400" />;
  };

  const ReadingRow = ({ r }: { r: RFIDStockReading }) => (
    <>
      {/* Mobile */}
      <div className="sm:hidden flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <div className="mt-0.5 flex-shrink-0"><StatusIcon status={r.status} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-semibold text-gray-900">{r.barcode}</span>
            <span className="text-xs text-gray-400">{new Date(r.timestamp).toLocaleTimeString('pt-BR')}</span>
          </div>
          <div className="text-xs text-gray-500 truncate mt-0.5">
            {r.modelName}
            {r.status === 'duplicate' && <span className="ml-1 text-yellow-600">· Duplicado</span>}
            {r.status === 'no_model' && <span className="ml-1 text-red-500">· Modelo não encontrado</span>}
          </div>
        </div>
      </div>
      {/* Desktop */}
      <div className="hidden sm:grid grid-cols-[2rem_1fr_1.5fr_6rem] items-center gap-x-4 px-4 py-2 hover:bg-gray-50 transition-colors text-sm border-b border-gray-100">
        <div className="flex justify-center"><StatusIcon status={r.status} /></div>
        <div className="font-mono text-gray-900 font-medium truncate">
          {r.barcode}
          <div className="text-[10px] text-gray-400 font-normal truncate">{r.rfid}</div>
        </div>
        <div className={`truncate ${r.status === 'no_model' ? 'text-red-500' : 'text-gray-700'}`}>{r.modelName}</div>
        <div className="text-xs text-gray-400 text-right">{new Date(r.timestamp).toLocaleTimeString('pt-BR')}</div>
      </div>
    </>
  );

  const TableContent = ({ bg }: { bg: string }) => (
    <div>
      <div className={`hidden sm:grid grid-cols-[2rem_1fr_1.5fr_6rem] gap-x-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-200 sticky top-0 ${bg}`}>
        <div /><div>Código</div><div>Modelo</div><div className="text-right">Hora</div>
      </div>
      {readings.map(r => <ReadingRow key={r.id} r={r} />)}
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full text-gray-900 space-y-4">
      {/* Hidden RFID input */}
      <input ref={inputRef} type="text" className="absolute opacity-0 pointer-events-none"
        inputMode="none" autoComplete="off" autoFocus={isActive}
        onChange={(e) => {
          if (processRFIDPayload(e.currentTarget.value)) {
            e.currentTarget.value = '';
          }
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== 'Tab') return;

          if (processRFIDPayload(e.currentTarget.value || scanBufferRef.current)) {
            e.preventDefault();
            e.currentTarget.value = '';
          }
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (processRFIDPayload(text)) {
            e.preventDefault();
            e.currentTarget.value = '';
          }
        }}
      />

      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <Radio className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-green-500' : 'text-gray-400'}`} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 leading-tight">Portal RFID — Entrada de Estoque</div>
          <div className="text-xs text-gray-500 leading-tight">
            {isActive ? (scanBuffer ? `Capturando: ${scanBuffer} (${scanBuffer.length}/24)` : 'Aguardando tags...') : 'Configure o contêiner e inicie o portal'}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${isActive ? 'border-green-200 text-green-700 bg-green-50' : 'border-gray-200 text-gray-500 bg-gray-50'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {isActive ? 'ON' : 'OFF'}
          </div>
          {!isActive ? (
            <Button size="sm" onClick={handleStart} className="bg-green-600 hover:bg-green-700 text-white font-semibold">
              <Zap className="w-3.5 h-3.5 mr-1.5" />Iniciar
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleStop} className="border-gray-300 text-gray-700 hover:bg-gray-100">
              Pausar
            </Button>
          )}
        </div>
      </div>

      {/* Setup: container + stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Container selector */}
        <div className="sm:col-span-2 lg:col-span-1 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm space-y-1.5">
          <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5"><Box className="w-3.5 h-3.5" />Contêiner de destino</div>
          <Select value={selectedContainer} onValueChange={setSelectedContainer} disabled={isActive}>
            <SelectTrigger className="h-8 text-sm border-gray-200">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {containers.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        {[
          { label: 'Válidos', value: okCount, color: 'text-green-600' },
          { label: 'Duplicados', value: dupCount, color: 'text-yellow-500' },
          { label: 'Sem modelo', value: noModelCount, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Readings + action */}
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
              onPointerDown={(e) => { e.stopPropagation(); setIsFullscreen(p => !p); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Fullscreen portal */}
          {isFullscreen && createPortal(
            <div className="fixed inset-0 z-[9999] bg-white flex flex-col text-gray-900">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0 shadow-sm">
                <span className="font-semibold">Leituras — {readings.length} pneu{readings.length !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-3">
                  {isActive && <div className="flex items-center gap-1.5 text-green-600 text-sm"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />Aguardando...</div>}
                  <button type="button" onPointerDown={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <Minimize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {readings.length === 0
                  ? <div className="py-16 text-center text-gray-400"><Radio className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>Nenhuma tag detectada</p></div>
                  : <TableContent bg="bg-white" />}
              </div>
            </div>,
            document.body
          )}

          <div className="max-h-[400px] overflow-y-auto">
            {readings.length === 0 ? (
              <div className="py-14 text-center text-gray-400">
                <Radio className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhuma tag detectada</p>
                <p className="text-xs mt-1 text-gray-300">Inicie o portal e passe os pneus para registrar</p>
              </div>
            ) : <TableContent bg="bg-white" />}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumo</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Total lido', value: readings.length, color: 'text-gray-900' },
                { label: 'Prontos para salvar', value: okCount, color: 'text-green-600' },
                { label: 'Duplicados (ignorados)', value: dupCount, color: 'text-yellow-600' },
                { label: 'Sem modelo (ignorados)', value: noModelCount, color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Save action */}
          {okCount > 0 && (
            <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-green-600" />
                Registrar Entrada
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                {okCount} pneu{okCount !== 1 ? 's' : ''} será{okCount !== 1 ? 'ão' : ''} salvo{okCount !== 1 ? 's' : ''} no contêiner <strong>{selectedContainerData?.name}</strong>.
              </p>
              <Button
                onClick={handleFinish}
                disabled={isFinishing || !selectedContainer}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {isFinishing ? 'Salvando...' : (
                  <><ArrowRight className="w-4 h-4 mr-2" />Confirmar Entrada</>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
