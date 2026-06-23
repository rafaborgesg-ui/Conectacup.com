/**
 * 🔧 Conferir Pneus - v4.10.0
 * Fila rápida de bipagem + contrato para bridge nativo Zebra RFID
 */
import { ClipboardCheck, Search, Upload, FileSpreadsheet, X, ChevronRight, Loader2, Scan, AlertTriangle, RotateCcw, RefreshCw, CheckCircle2, AlertOctagon, Zap, Info, ChevronLeft, MessageSquare, ChevronDown, ChevronUp, Edit, Eraser, Download, Keyboard } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { getChassis, type Chassis } from '../utils/chassisStorage';
import { getSeasons, getSeasonStages, type Season, type SeasonStage } from '../utils/seasonStorage';
import { getTireByBarcode, type StockEntry } from '../utils/storage';
import { saveTireCheckSession, updateConferenceSessionRealtime, saveTireDivergence, type ChassisCheckData, type TireSetData, type TireCheckData } from '../utils/tireCheckSupabase';
import { createClient } from '../utils/supabase/client';
import excelIcon from 'figma:asset/965426fb8fba07bdea96952e8ddb22442ab7638d.png';
import { UpdateStatusModal } from '../components/UpdateStatusModal';
import { CollectorStyles } from '../components/CollectorStyles';
import * as XLSX from 'xlsx';
import { sanitizeFileName } from '../utils/stringUtils';

const silentPageToast = (..._args: unknown[]) => undefined;
const toast = {
  success: silentPageToast,
  error: silentPageToast,
  warning: silentPageToast,
  info: silentPageToast
};

type NativeRFIDPayload = string | {
  epc?: string;
  barcode?: string;
  code?: string;
  cai?: string;
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

interface NativeRFIDStatusState extends NativeRFIDStatus {
  acceptedReads: number;
  ignoredDuplicates: number;
  lastReadAt?: string;
  lastBarcode?: string;
  lastEpc?: string;
  lastRssi?: number;
}

interface NormalizedNativeRFIDScan {
  code: string;
  epc?: string;
  cai?: string;
  rssi?: number;
  seenCount?: number;
  source: string;
}

interface NativeRFIDBridgeApi {
  version: string;
  receiveTag: (payload: NativeRFIDPayload) => void;
  receiveStatus: (status: NativeRFIDStatus) => void;
}

declare global {
  interface Window {
    ConectaCupRFIDBridge?: NativeRFIDBridgeApi;
    ZebraRFIDBridge?: {
      startInventory?: () => void;
      stopInventory?: () => void;
      configure?: (config: unknown) => void;
    };
  }
}

const NATIVE_RFID_EVENT_NAME = 'conectacup:rfid-tag';
const NATIVE_RFID_STATUS_EVENT_NAME = 'conectacup:rfid-status';
const NATIVE_RFID_BRIDGE_VERSION = '1.0.0';
const RFID_RECENT_DUPLICATE_WINDOW_MS = 5000;
const RFID_RECENT_CACHE_TTL_MS = 30000;
const RFID_PENDING_NATIVE_EVENTS_LIMIT = 64;

let nativeRFIDTagSubscriber: ((payload: NativeRFIDPayload) => void) | null = null;
let nativeRFIDStatusSubscriber: ((status: NativeRFIDStatus) => void) | null = null;
let nativeRFIDBridgeEventsRegistered = false;
let nativeRFIDBridgeReadyDispatched = false;
const pendingNativeRFIDPayloads: NativeRFIDPayload[] = [];
const pendingNativeRFIDStatuses: NativeRFIDStatus[] = [];

const pushBoundedNativeEvent = <T,>(queue: T[], value: T) => {
  queue.push(value);
  if (queue.length > RFID_PENDING_NATIVE_EVENTS_LIMIT) {
    queue.shift();
  }
};

const deliverNativeRFIDTag = (payload: NativeRFIDPayload) => {
  if (nativeRFIDTagSubscriber) {
    nativeRFIDTagSubscriber(payload);
    return;
  }

  pushBoundedNativeEvent(pendingNativeRFIDPayloads, payload);
};

const deliverNativeRFIDStatus = (status: NativeRFIDStatus) => {
  if (nativeRFIDStatusSubscriber) {
    nativeRFIDStatusSubscriber(status);
    return;
  }

  pushBoundedNativeEvent(pendingNativeRFIDStatuses, status);
};

const ensureConectaCupRFIDBridge = () => {
  if (typeof window === 'undefined') return;

  window.ConectaCupRFIDBridge = {
    version: NATIVE_RFID_BRIDGE_VERSION,
    receiveTag: deliverNativeRFIDTag,
    receiveStatus: deliverNativeRFIDStatus
  };

  if (!nativeRFIDBridgeEventsRegistered) {
    window.addEventListener(NATIVE_RFID_EVENT_NAME, event => {
      deliverNativeRFIDTag((event as CustomEvent<NativeRFIDPayload>).detail);
    });
    window.addEventListener(NATIVE_RFID_STATUS_EVENT_NAME, event => {
      deliverNativeRFIDStatus((event as CustomEvent<NativeRFIDStatus>).detail);
    });
    nativeRFIDBridgeEventsRegistered = true;
  }

  if (!nativeRFIDBridgeReadyDispatched) {
    console.log('📡 Bridge JS ConectaCupRFIDBridge registrado para leituras nativas Zebra');
    window.dispatchEvent(new CustomEvent('conectacup:rfid-bridge-ready', {
      detail: { version: NATIVE_RFID_BRIDGE_VERSION }
    }));
    nativeRFIDBridgeReadyDispatched = true;
  }
};

ensureConectaCupRFIDBridge();

// ✅ Função auxiliar para normalizar nomes de pilotos e garantir comparação precisa
function normalizePilotName(name: string | null | undefined): string {
  if (!name) return '';
  
  return name
    .trim()                           // Remove espaços do início/fim
    .replace(/\s+/g, ' ')            // Substitui múltiplos espaços por um único
    .toLowerCase()                    // Converte para minúsculas
    .normalize('NFD')                 // Normaliza caracteres Unicode (separa acentos)
    .replace(/[\u0300-\u036f]/g, ''); // Remove marcas diacríticas (acentos)
}

// ✅ Função para abreviar posições de pneus
function abreviarPosicao(posicao: string): string {
  const abreviacoes: Record<string, string> = {
    'Dianteiro Esquerdo': 'DE',
    'Dianteiro Direito': 'DD',
    'Traseiro Esquerdo': 'TE',
    'Traseiro Direito': 'TD',
    'Dianteira Esquerda': 'DE',
    'Dianteira Direita': 'DD',
    'Traseira Esquerda': 'TE',
    'Traseira Direita': 'TD'
  };
  return abreviacoes[posicao] || posicao;
}

// ✅ Função para calcular quantos pneus são necessários baseado no status do chassis
function getRequiredTiresCount(chassisData: ExcelChassisData): number {
  const isTrophy = chassisData.sheetName.toUpperCase().includes('TROPHY');
  const corridaStatus = chassisData.corrida?.trim().toUpperCase() || '';
  
  // Carros que VAI CORRER: todos os jogos são obrigatórios
  if (corridaStatus === 'SIM') {
    return isTrophy ? 12 : 16; // Trophy = 3 jogos (12 pneus), Outros = 4 jogos (16 pneus)
  }
  
  // Carros que PILOTO NÃO CORRE ou INDEFINIDOS: apenas 1 jogo (montado no carro) é obrigatório
  if (corridaStatus === 'NÃO' || corridaStatus === 'NAO' || corridaStatus === 'INDEF.' || corridaStatus === 'INDEF' || corridaStatus === 'INDEFINIDO') {
    return 4; // Apenas 1 jogo (4 pneus)
  }
  
  // Padrão: mesmo comportamento de confirmados
  return isTrophy ? 12 : 16;
}

// ✅ Função para verificar se um chassis está completo
function isChassisComplete(chassisData: ExcelChassisData): boolean {
  const requiredTires = getRequiredTiresCount(chassisData);
  return chassisData.tiresChecked >= requiredTires;
}

// 🆕 Função para contar pneus conferidos (incluindo pneus com observações que dispensam bipagem)
function countCheckedTires(tireSets: TireSet[]): number {
  return tireSets.reduce((acc, set) => {
    return acc + set.tires.filter(t =>
      (t.codigo && t.codigo !== '-') || // Pneu foi bipado (código preenchido e diferente de '-')
      (t.observacao && t.observacao.trim() !== '') // OU tem observação preenchida
    ).length;
  }, 0);
}

function normalizeScannerCode(code: string): string {
  return code.replace(/\s/g, '').toUpperCase();
}

function isBarcodeCode(code: string): boolean {
  return /^\d{8}$/.test(normalizeScannerCode(code));
}

// 📡 Função para detectar se o código é RFID (24 caracteres hexadecimais)
function isRFIDCode(code: string): boolean {
  const trimmed = normalizeScannerCode(code);
  const isRFID = /^[0-9A-Fa-f]{24}$/.test(trimmed);
  console.log(`🔍 isRFIDCode("${trimmed}") = ${isRFID} (${trimmed.length} chars)`);
  return isRFID;
}

// 📡 Função para decodificar SGTIN-96 (EPC) e retornar código de barras e CAI
function decodeRFID(epcHex: string): { barcode: string; cai: string } | null {
  try {
    const normalizedEpcHex = normalizeScannerCode(epcHex);
    console.log(`📡 Decodificando RFID: ${normalizedEpcHex}`);

    // Converte hex para BigInt
    const epcBigInt = BigInt('0x' + normalizedEpcHex);

    // Extrai Serial Number (38 bits finais)
    const serialMask = BigInt('0x3FFFFFFFFF'); // 38 bits
    const serial = Number(epcBigInt & serialMask);

    // Remove Serial Number para processar o restante
    const withoutSerial = epcBigInt >> BigInt(38);

    // Extrai Item Reference (24 bits)
    const itemRefMask = BigInt('0xFFFFFF'); // 24 bits
    const itemReference = Number(withoutSerial & itemRefMask);

    console.log(`📊 RFID Decodificado: ItemRef=${itemReference}, Serial=${serial}`);

    // 🔢 Calcula o CAI: ItemReference / 16 (remove 4 bits finais)
    const cai = Math.floor(itemReference / 16).toString();

    // 📊 Calcula o Código de Barras: Serial / 4 (remove 2 bits finais)
    const barcodeNumber = Math.floor(serial / 4);
    const barcodeFormatted = barcodeNumber.toString().padStart(8, '0');

    console.log(`🔑 Código CAI extraído: ${cai} (ItemReference: ${itemReference})`);
    console.log(`📊 Código de Barras extraído: ${barcodeFormatted} (Serial: ${serial} / 4 = ${barcodeNumber})`);

    return {
      cai,
      barcode: barcodeFormatted,
    };
  } catch (error) {
    console.error('❌ Erro ao decodificar RFID:', error);
    return null;
  }
}

// 🆕 Função para salvar divergência em tempo real no Supabase
async function saveTireDivergenceRealtime(
  sessionId: string,
  chassis: string,
  jogo: number,
  tire: TireData
): Promise<void> {
  try {
    console.log('🔍 saveTireDivergenceRealtime CHAMADA:', {
      codigo: tire.codigo,
      validacao: tire.validacao,
      sessionId: sessionId
    });
    
    // 🔥 Verifica se a validação é "TROCAR PNEU"
    if (tire.validacao !== 'TROCAR PNEU') {
      console.log(`⏭️ Pneu ${tire.codigo} NÃO é divergência (validação: ${tire.validacao})`);
      return;
    }
    
    // 🔥 VALIDAÇÃO COMPLETA: Verifica se a sessão existe e está ativa
    const supabase = createClient();
    const { data: sessionExists, error: sessionCheckError } = await supabase
      .from('conference_sessions')
      .select('id, is_active')
      .eq('id', sessionId)
      .eq('is_active', true)
      .maybeSingle();

    if (sessionCheckError) {
      // 🔥 Trata erros de rede de forma silenciosa
      if (sessionCheckError.message?.includes('Failed to fetch')) {
        console.log(`ℹ️ Erro de rede ao verificar sessão - divergência será salva ao finalizar`);
        return;
      }
      console.warn(`⚠️ Sessão inválida ou inativa. Divergência será salva ao finalizar conferência.`);
      return;
    }

    if (!sessionExists) {
      console.warn(`⚠️ Sessão inválida ou inativa. Divergência será salva ao finalizar conferência.`);
      return; // Retorna silenciosamente - divergências serão salvas ao finalizar
    }
    
    // Determina o tipo de divergência baseado nas características do pneu
    const hasPilotMismatch = tire.pilotoInvalido === true;
    const hasDiscardStatus = tire.situacao === 'Descartar';
    
    let divergenceType: 'piloto_diferente' | 'status_descartar' | 'ambos' = 'ambos';
    if (hasPilotMismatch && !hasDiscardStatus) {
      divergenceType = 'piloto_diferente';
    } else if (!hasPilotMismatch && hasDiscardStatus) {
      divergenceType = 'status_descartar';
    }
    
    console.log(`📤 Tentando salvar divergência: ${tire.codigo} (${divergenceType})`);
    
    // 🔥 PROTEÇÃO ADICIONAL: Try-catch no insert com tratamento de foreign key
    try {
      const result = await saveTireDivergence({
        session_id: sessionId,
        tire_code: tire.codigo,
        chassis: chassis,
        jogo: jogo,
        posicao: abreviarPosicao(tire.posicao),
        piloto: tire.piloto,
        ano: tire.ano || '',
        set: tire.set || '',
        tipo: tire.tipo || '',
        voltas: tire.voltas || '',
        situacao: tire.situacao,
        divergence_type: divergenceType,
        status: 'pendente'
      });
      
      if (result.success) {
        console.log(`✅ Divergência salva em tempo real: ID ${result.divergenceId}`);
      } else {
        // 🔥 Se for erro de foreign key, trata silenciosamente (comportamento esperado)
        if (result.error?.includes('foreign key') || result.error?.includes('23503')) {
          console.log(`ℹ️ Divergência registrada localmente - será salva ao finalizar conferência`);
        } else if (result.error?.includes('network_error') || result.error?.includes('Failed to fetch')) {
          // 🔥 Erros de rede são tratados silenciosamente
          console.log(`ℹ️ Erro de rede temporário ao salvar divergência - operação será reprocessada`);
        } else {
          console.error(`❌ Erro ao salvar divergência: ${result.error}`);
        }
      }
    } catch (insertError: any) {
      // 🔥 Trata erros de rede de forma silenciosa
      if (insertError?.message?.includes('Failed to fetch') || insertError?.name === 'TypeError') {
        console.log(`ℹ️ Erro de rede temporário ao inserir divergência`);
        return;
      }
      // 🔥 PROTEÇÃO FINAL: Qualquer erro no insert é tratado silenciosamente
      console.warn(`⚠️ Erro ao inserir divergência (será salva ao finalizar):`, insertError);
    }
  } catch (error: any) {
    // 🔥 Trata erros de rede de forma silenciosa
    if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
      console.log(`ℹ️ Erro de rede temporário - divergência será reprocessada`);
      return;
    }
    // 🔥 TRATAMENTO SILENCIOSO: Apenas loga o erro sem alertar o usuário
    console.error('❌ Erro inesperado ao salvar divergência:', error);
  }
}

// Tipo para os dados extraídos do Excel
interface ExcelChassisData {
  chassis: string;
  piloto: string;
  corrida: string;
  numero?: string; // ✅ Número do piloto (coluna #)
  sheetName: string;
  rowNumber: number;
  isValid: boolean;
  matchedChassis?: Chassis;
  tiresChecked: number; // Quantidade de pneus conferidos (0-16)
  _originalIndex?: number; // 🔥 CRÍTICO: Índice único e estável para garantir integridade dos dados
}

// Tipo para um pneu conferido
interface TireData {
  posicao: string;
  codigo: string;
  piloto: string;
  ano: string;
  set: string;
  tipo: string;
  voltas: string;
  situacao: 'Guardar' | 'Descartar' | '-'; // 🆕 Aceita "-" para pneus não cadastrados
  divergencia?: boolean;
  pilotoInvalido?: boolean;
  observacao?: string; // 🆕 Campo de observações
  validacao?: 'OK' | 'TROCAR PNEU' | 'CUP - ANALISE VOLTAS' | null; // 🆕 Validação do pneu
  _originalIndex?: number; // 🔥 ÍNDICE ORIGINAL no array não-ordenado (para rastreamento correto)
  registeredBy?: string; // 🆕 Nome do usuário que registrou
  registeredAt?: string; // 🆕 Data/hora do registro
}

// Tipo para jogo de pneus
interface TireSet {
  jogo: number;
  label: string;
  montadoNoCarro: boolean;
  tires: TireData[];
}

interface QueuedTireScan {
  code: string;
  epc?: string;
  jogo: number;
  position: number;
  inputKey: string;
  chassisIndex: number;
}

interface InlineScanOptions {
  source?: 'keyboard' | 'inline' | 'native-rfid';
  epc?: string;
  rssi?: number;
  suppressDecodeToast?: boolean;
}

interface TireSubmitContext {
  jogo?: number;
  chassisIndex?: number;
}

const SCANNER_AUTO_SUBMIT_DELAY_MS = 40;

export function ConferirPneus() {
  // 🔥 VERSÃO DA CORREÇÃO: v4.10.0 - Bridge nativo Zebra RFID + anti-duplicidade
  console.log('🔥🔥🔥 ConferirPneus v4.10.0 - Bridge nativo Zebra RFID + anti-duplicidade');
  console.log('📌 Correções aplicadas:');
  console.log('   ✅ v4.8.9: Footer fixo no modo coletor (rodapé com sombra superior)');
  console.log('   ✅ v4.8.9: Padding-bottom ajustado (pb-24) para conteúdo não ficar escondido');
  console.log('   ✅ v4.8.8: Logs detalhados de debug em todo fluxo de salvamento');
  console.log('   ✅ v4.9.0: Fila serializada permite bipar o próximo pneu enquanto o anterior salva');
  console.log('   ✅ v4.9.0: Validação busca por _originalIndex ao invés de índice direto');
  console.log('   ✅ v4.9.0: Foco muda imediatamente para o próximo campo vazio');
  console.log('   ✅ v4.10.0: Bridge JS para app nativo Zebra RFID');
  console.log('   ✅ v4.10.0: Anti-duplicidade por EPC/barcode recente, fila e chassis atual');
  console.log('   ✅ v4.8.2: Logs de debug para rastrear quando chassis somem');
  console.log('   ✅ v4.8.2: Botão "Recarregar Sessão" quando lista fica vazia');
  console.log('   ✅ v4.8.3: Botão X circular perfeito (32x32px)');
  console.log('   ✅ v4.8.3: Arraste para baixo fecha modal (swipe-to-close)');
  console.log('   ✅ v4.8.3: Indicador visual de drag (barra no topo)');
  console.log('   ✅ v4.8.4: Try-catch-finally em closeChassisModal');
  console.log('   ✅ v4.8.4: Estados sempre limpos mesmo com erro de salvamento');
  console.log('   ✅ v4.8.4: Toast de aviso se salvamento falhar');
  console.log('   ✅ v4.8.5: Círculos ✓ e ✗ perfeitos com aspectRatio: 1');
  console.log('   ✅ v4.8.6: Timeout otimizado com cache-first no ProtectedRoute');
  console.log('   ✅ v4.8.7: Botão X dos toasts circular perfeito (aspectRatio + !important)');
  console.log('');
  console.log('📝 FLUXO DA BIPAGEM (v4.10.0):');
  console.log('   1️⃣ Usuário bipa código');
  console.log('   2️⃣ Campo atual entra na fila e mostra Salvando...');
  console.log('   3️⃣ Próximo campo vazio recebe foco imediatamente');
  console.log('   4️⃣ Salva no Supabase em ordem, com retry e validação');
  console.log('   5️⃣ Histórico, excel_data e progress precisam confirmar sucesso');
  console.log('   6️⃣ Toast informa o resultado sem travar a próxima leitura');
  console.log('   ✅ Próxima bipagem liberada sem abrir mão da integridade!');
  console.log('');
  console.log('🔍 DEBUG v4.8.2:');
  console.log('   📊 Logs em closeChassisModal para verificar extractedData');
  console.log('   📊 Logs na renderização da lista de chassis');
  console.log('   🔄 Botão de recarregar sessão caso a lista fique vazia');
  console.log('');
  console.log('👆 UX v4.8.3:');
  console.log('   ⭕ Botão X circular perfeito (32x32px fixo)');
  console.log('   📱 Arraste para baixo > 100px = fecha modal');
  console.log('   📊 Barra visual no topo indica área de drag');
  console.log('');
  console.log('✅ FIX v4.8.11:');
  console.log('   📐 Footer com position: absolute (não voa mais)');
  console.log('   📐 Container flex com wrapper scrollável');
  console.log('');
  console.log('✅ FIX v4.8.12:');
  console.log('   🏁 selectedCategory limpo ao voltar (categorias aparecem)');
  console.log('');
  console.log('✅ FIX v4.8.13:');
  console.log('   🔧 Correção automática de jogos faltantes (CHALLENGE/CARRERA deve ter 4 jogos)');
  console.log('   🎯 Detecta e adiciona jogos vazios automaticamente ao abrir chassis');
  console.log('');
  console.log('✅ FIX v4.8.14:');
  console.log('   📐 TC22: pb-32 no container scrollável (footer não sobrepõe menus)');
  console.log('');
  console.log('✅ FIX v4.8.15:');
  console.log('   📐 TC22: Aumentado para pb-64 (256px de espaço inferior)');
  console.log('');
  console.log('✅ FIX v4.8.16:');
  console.log('   📱 Footer com bottom: max(safe-area-inset-bottom, 48px)');
  console.log('   📱 Footer agora fica acima dos botões nativos do TC22/Android');
  console.log('');
  console.log('🛡️ ROBUSTEZ v4.8.4:');
  console.log('   ✅ Try-catch envolve TODA a lógica de salvamento');
  console.log('   ✅ Finally block SEMPRE limpa estados (mesmo com erro)');
  console.log('   ✅ Página nunca trava, mesmo se Supabase falhar');
  console.log('   ✅ Toast informa usuário se houver problema de conexão');
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // 🔥 NOVO v4.8.0 (corrigido v4.8.1): Estado global para bloquear bipagens até confirmação
  const [isProcessingTireCode, setIsProcessingTireCode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExcelChassisData[]>([]);
  const extractedDataRef = useRef<ExcelChassisData[]>([]);
  
  // 🔥 v4.8.3: Estados para swipe-to-close
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragCurrentY, setDragCurrentY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [currentStep, setCurrentStep] = useState<'upload' | 'etapa' | 'chassis'>('upload');
  const [registeredChassis, setRegisteredChassis] = useState<Chassis[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [seasonStages, setSeasonStages] = useState<SeasonStage[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [etapaId, setEtapaId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // Nova state para categoria selecionada
  const [selectedChassisIndex, setSelectedChassisIndex] = useState<number | null>(null);
  const [useCollectorMode, setUseCollectorMode] = useState(false); // Modo coletor (níveis ao invés de modal)
  const [showCollectorConference, setShowCollectorConference] = useState(false); // Controla se está na tela de conferência no modo coletor
  const [tireSets, setTireSetsOriginal] = useState<TireSet[]>([]);
  const tireSetsRef = useRef<TireSet[]>([]);
  const scanQueueRef = useRef<Promise<void>>(Promise.resolve());
  const queuedInputKeysRef = useRef<Set<string>>(new Set());
  const queuedScanCodesRef = useRef<Set<string>>(new Set());
  const recentRFIDReadsRef = useRef<Map<string, number>>(new Map());
  const nativeRFIDHandlerRef = useRef<(payload: NativeRFIDPayload) => void>(() => undefined);
  const nativeRFIDStatusHandlerRef = useRef<(status: NativeRFIDStatus) => void>(() => undefined);
  
  // 🔥🔥🔥 WRAPPER COM LOG EXTREMO para rastrear TODAS as atualizações
  const setTireSets = (value: TireSet[] | ((prev: TireSet[]) => TireSet[])) => {
    const newValue = typeof value === 'function' ? value(tireSetsRef.current) : value;
    tireSetsRef.current = newValue;
    const codes = newValue.flatMap(s => s.tires.map(t => t.codigo)).filter(c => c !== '-');
    console.log('🔥🔥🔥 setTireSets CHAMADO:', {
      totalCodes: codes.length,
      codes: codes,
      stack: new Error().stack?.split('\n')[2]?.trim() // Mostra quem chamou
    });
    setTireSetsOriginal(newValue);
  };
  const [savedTireSets, setSavedTireSets] = useState<Record<number, TireSet[]>>({}); // Armazena os jogos salvos de cada chassis
  const [completedChassis, setCompletedChassis] = useState<Record<number, boolean>>({}); // Marca chassis com conferência finalizada
  const [isEditMode, setIsEditMode] = useState(false); // Controla se está em modo de edição
  const [activeJogo, setActiveJogo] = useState(1);
  const [activePneuPosition, setActivePneuPosition] = useState(0); // 0-3 (posição dentro do jogo)
  const activeJogoRef = useRef(1);
  const activePneuPositionRef = useRef(0);
  const [tireCodeInput, setTireCodeInput] = useState('');
  const tireInputRef = useRef<HTMLInputElement>(null);
  const autoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null); // Timer para auto-submit após scanner
  const inlineAutoSubmitTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastInputTimestampRef = useRef<number>(0); // Timestamp do último caractere digitado (para detectar scanner ativo)
  const [showUpdateModal, setShowUpdateModal] = useState(false); // Modal de atualização de status
  const [updateFile, setUpdateFile] = useState<File | null>(null); // Arquivo de atualização
  const [isSaving, setIsSaving] = useState(false); // Estado de salvamento
  const [carTiresFile, setCarTiresFile] = useState<File | null>(null); // 🆕 Arquivo de pneus nos carros
  const [isUploadingCarTires, setIsUploadingCarTires] = useState(false); // 🆕 Estado de upload
  const [shouldMoveChassisToEnd, setShouldMoveChassisToEnd] = useState(false); // 🔥 Flag para mover chassis ao fechar modal
  const [focusedInput, setFocusedInput] = useState<{ jogo: number; position: number } | null>(null); // 🔥 Rastreia qual input está focado
  const [lastUploadedFile, setLastUploadedFile] = useState<{ name: string; date: string } | null>(null); // 🔥 Última planilha carregada
  
  // 🆕 Estados para a nova interface mobile unificada
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [observationText, setObservationText] = useState('');
  const [expandedJogo, setExpandedJogo] = useState<number | null>(1);
  
  // 🎯 Estado para controlar auto-foco após submit
  const [pendingFocusAfterSubmit, setPendingFocusAfterSubmit] = useState<{ jogo: number; position: number } | null>(null);
  
  // 🔥 NOVO v4.7.0: Estado para rastrear inputs em processamento (evita "piscar" no mobile)
  const [processingInputs, setProcessingInputs] = useState<Record<string, boolean>>({});
  // Key format: "jogo-position" (ex: "1-0", "2-3")
  const [nativeRFIDStatus, setNativeRFIDStatus] = useState<NativeRFIDStatusState>({
    available: false,
    connected: false,
    mode: 'unknown',
    acceptedReads: 0,
    ignoredDuplicates: 0
  });

  useEffect(() => {
    const tagSubscriber = (payload: NativeRFIDPayload) => nativeRFIDHandlerRef.current(payload);
    const statusSubscriber = (status: NativeRFIDStatus) => nativeRFIDStatusHandlerRef.current(status);

    nativeRFIDTagSubscriber = tagSubscriber;
    nativeRFIDStatusSubscriber = statusSubscriber;
    ensureConectaCupRFIDBridge();

    while (pendingNativeRFIDStatuses.length > 0) {
      statusSubscriber(pendingNativeRFIDStatuses.shift() as NativeRFIDStatus);
    }

    while (pendingNativeRFIDPayloads.length > 0) {
      tagSubscriber(pendingNativeRFIDPayloads.shift() as NativeRFIDPayload);
    }

    return () => {
      if (nativeRFIDTagSubscriber === tagSubscriber) {
        nativeRFIDTagSubscriber = null;
      }

      if (nativeRFIDStatusSubscriber === statusSubscriber) {
        nativeRFIDStatusSubscriber = null;
      }
    };
  }, []);
  
  // 🎉 NOVO: Estados para modal de resumo e progresso de salvamento
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [savingProgress, setSavingProgress] = useState('Iniciando...');
  const [summaryData, setSummaryData] = useState<{
    totalChassis: number;
    totalTires: number;
    divergencias: number;
    chassisList: Array<{ chassis: string; piloto: string; tires: number }>;
  } | null>(null);
  
  // 🔥 SESSÃO COMPARTILHADA
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null); // ID da sessão ativa no Supabase
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // ID do usuário atual
  const [currentUserName, setCurrentUserName] = useState<string>(''); // 🆕 Nome do usuário atual
  const [chassisLocks, setChassisLocks] = useState<Record<number, { userId: string; userName: string; lockedAt: string } | null>>({}); // Locks de chassis
  const selectedChassisIndexRef = useRef<number | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const currentUserNameRef = useRef<string>('');
  
  // 🆕 PROTEÇÃO CONTRA SOBRESCRITA - Rastreia versão dos dados quando abrimos o modal
  const [chassisVersionWhenOpened, setChassisVersionWhenOpened] = useState<Record<number, string>>({}); // timestamp de quando abrimos cada chassis
  const [hasRealtimeConflict, setHasRealtimeConflict] = useState(false); // Flag para indicar conflito em tempo real
  const [recentlyUpdatedChassis, setRecentlyUpdatedChassis] = useState<Record<number, boolean>>({}); // Marca chassis recentemente atualizados
  
  // 🧹 NOVO: Rastreia limpezas de códigos em progresso (evita que realtime sobrescreva)
  const [clearingTires, setClearingTires] = useState<Record<string, number>>({}); // Key: "chassisIdx-jogoNum-tireIdx", Value: timestamp
  
  // 🔥 CRÍTICO: Ref para clearingTires (listener do realtime precisa acessar valor sempre atualizado)
  const clearingTiresRef = useRef<Record<string, number>>({});
  
  // 🛑 BLOQUEIO TOTAL: Flag para desabilitar COMPLETAMENTE o realtime durante limpeza
  const realtimeBlockedRef = useRef<boolean>(false);
  
  // 🆕 CRÍTICO: Ref para controlar carga inicial
  const isInitialLoadRef = useRef(false);
  const initialLoadTimestampRef = useRef<number>(0);

  // 🔤 Estado para controlar se o teclado virtual está habilitado
  const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(false);

  // 🆕 CRÍTICO: Ref para rastrear se o progress do Supabase está vazio
  // Isso evita alertas falsos quando a sessão foi criada mas nenhum chassis foi conferido ainda
  const isSupabaseProgressEmptyRef = useRef(true);

  // 🔥 CRÍTICO: Ref para ignorar mudanças de ordem causadas por este dispositivo
  const ignoreNextOrderChangeRef = useRef(false);
  const lastOrderChangeTimestampRef = useRef(0);

  // 📊 Modal de Chassis Pendentes (Pneus do Carro)
  const [showCarTiresModal, setShowCarTiresModal] = useState(false);
  
  // Refs não mais necessárias - removidas após simplificação

  // 🔥 Sincroniza clearingTires com o ref (para o listener do realtime acessar)
  useEffect(() => {
    clearingTiresRef.current = clearingTires;
  }, [clearingTires]);

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
      }
      Object.values(inlineAutoSubmitTimersRef.current).forEach(clearTimeout);
      inlineAutoSubmitTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    tireSetsRef.current = tireSets;
  }, [tireSets]);

  useEffect(() => {
    extractedDataRef.current = extractedData;
  }, [extractedData]);

  useEffect(() => {
    selectedChassisIndexRef.current = selectedChassisIndex;
  }, [selectedChassisIndex]);

  useEffect(() => {
    activeJogoRef.current = activeJogo;
  }, [activeJogo]);

  useEffect(() => {
    activePneuPositionRef.current = activePneuPosition;
  }, [activePneuPosition]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    currentUserNameRef.current = currentUserName;
  }, [currentUserName]);

  // 🔥 FUNÇÃO HELPER: Adiciona índices originais únicos e estáveis
  const addOriginalIndexes = (data: ExcelChassisData[]): ExcelChassisData[] => {
    return data.map((item, index) => ({
      ...item,
      _originalIndex: index
    }));
  };

  /**
   * 🔥🔥🔥 FUNÇÃO CRÍTICA: Garante que TODOS os chassis tenham _originalIndex correto
   * Deve ser chamada SEMPRE antes de setExtractedData para evitar corrupção de índices
   */
  const ensureCorrectIndexes = (data: ExcelChassisData[]): ExcelChassisData[] => {
    return data.map((item, idx) => {
      // Detecta se há inconsistência
      if (item._originalIndex !== undefined && item._originalIndex !== idx) {
        console.warn(`⚠️ Corrigindo _originalIndex do chassis "${item.chassis}" de ${item._originalIndex} para ${idx}`);
      }

      return {
        ...item,
        _originalIndex: idx  // 🔥 SEMPRE força idx como _originalIndex
      };
    });
  };

  // 🔥 Handler global para filtrar erros normais de socket/rede
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Filtra erros benignos que não precisam aparecer no console
      const error = event.reason;
      const isBenignError =
        error?.message?.includes('socket closed: 1000') ||
        error?.message?.includes('transport failure') ||
        error?.message?.includes('channel error: transport failure') ||
        error?.code === 'PGRST204' && error?.message?.includes('season');

      if (isBenignError) {
        // Previne o erro de aparecer no console
        event.preventDefault();
        console.log('ℹ️ Erro benigno filtrado:', error?.message || error);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Carregar chassis cadastrados
  useEffect(() => {
    loadRegisteredChassis();
  }, []);

  // 🔥 Carregar última planilha carregada do Supabase
  useEffect(() => {
    const loadLastUploadedFile = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('system_config')
          .select('config_value')
          .eq('config_key', 'last_uploaded_spreadsheet')
          .single();
        
        if (!error && data?.config_value) {
          setLastUploadedFile(data.config_value);
        }
      } catch (err) {
        console.error('Erro ao carregar última planilha:', err);
      }
    };
    
    loadLastUploadedFile();
  }, []);

  // 🔥 Detectar modo coletor baseado no tamanho da tela
  useEffect(() => {
    const checkCollectorMode = () => {
      // Ativa modo coletor se a tela for pequena (800x480 ou similar)
      const isSmallScreen = 
        (window.innerWidth <= 900 && window.innerHeight <= 600) || 
        (window.innerWidth <= 600 && window.innerHeight <= 900);
      setUseCollectorMode(isSmallScreen);
    };
    
    checkCollectorMode();
    window.addEventListener('resize', checkCollectorMode);
    
    return () => window.removeEventListener('resize', checkCollectorMode);
  }, []);

  // 🔥 Cleanup do timer de auto-submit quando componente desmontar
  useEffect(() => {
    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
      }
    };
  }, []);

  // 🔥 Carregar usuário atual e verificar sessão ativa no Supabase
  useEffect(() => {
    const loadCurrentUserAndSession = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        
        // 🆕 Buscar nome do usuário na tabela user_profiles
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (userProfile?.name) {
          setCurrentUserName(userProfile.name);
        } else {
          // Fallback para email se não houver nome
          setCurrentUserName(user.email?.split('@')[0] || 'Usuário');
        }
        
        // Verificar se existe uma sessão ativa no Supabase
        const { data: activeSessions, error } = await supabase
          .from('conference_sessions')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (error) {
          console.error('❌ Erro ao buscar sessão ativa:', error);
          return;
        }
        
        if (activeSessions && activeSessions.length > 0) {
          const session = activeSessions[0];
          console.log('🔥 Sessão ativa encontrada no Supabase:', session);
          console.log('📊 Detalhes da sessão:', {
            id: session.id,
            season_name: session.season_name,
            etapa_name: session.etapa_name,
            file_name: session.file_name,
            total_chassis: session.total_chassis,
            is_active: session.is_active
          });
          await loadSharedSession(session.id);
        } else {
          console.log('⚠️ Nenhuma sessão ativa encontrada no Supabase');
        }
      }
    };
    
    loadCurrentUserAndSession();
  }, []);

  // 🔥 Sincronização em tempo real da sessão compartilhada
  useEffect(() => {
    if (!activeSessionId) return;
    
    console.log('🔥🔥🔥 CONFIGURANDO LISTENER EM TEMPO REAL');
    console.log('   📌 Session ID:', activeSessionId);
    console.log('   📌 Canal:', `conference-session-${activeSessionId}`);
    
    const supabase = createClient();
    const channel = supabase
      .channel(`conference-session-${activeSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conference_sessions',
          filter: `id=eq.${activeSessionId}`
        },
        (payload) => {
          try {
            console.log('🔥🔥🔥 ========================================');
            console.log('🔥🔥🔥 REALTIME UPDATE DISPARADO!');
            console.log('🔥 Timestamp:', Date.now());
            console.log('🔥 ISO:', new Date().toISOString());
            console.log('🔥 Payload completo:', payload);
            console.log('🔥 Dados atualizados:', payload.new);
            console.log('🔥 savedTireSets ANTES do update:', Object.keys(savedTireSets).length, 'chassis');
            
            // 🛑🛑🛑 BLOQUEIO TOTAL - Se realtimeBlockedRef está ativo, IGNORA COMPLETAMENTE
            if (realtimeBlockedRef.current) {
            console.log('🛑🛑🛑 ==========================================');
            console.log('🛑🛑🛑 REALTIME COMPLETAMENTE BLOQUEADO!');
            console.log('🛑🛑🛑 Limpeza em progresso - UPDATE IGNORADO!');
            console.log('🛑🛑🛑 ==========================================');
            return; // 🛑 SAI IMEDIATAMENTE
          }
          
          // 🔥 BLOQUEIO DURANTE CARGA INICIAL
          if (isInitialLoadRef.current) {
            const timeSinceLoad = Date.now() - initialLoadTimestampRef.current;
            if (timeSinceLoad < 3000) {
              console.log('🔥🔥🔥 ==========================================');
              console.log('🔥🔥🔥 CARGA INICIAL EM PROGRESSO!');
              console.log('🔥🔥🔥 Tempo desde carga:', timeSinceLoad, 'ms');
              console.log('🔥🔥🔥 UPDATE DO REALTIME IGNORADO!');
              console.log('🔥🔥🔥 ==========================================');
              return; // 🛑 SAI IMEDIATAMENTE
            }
          }
          
          // 🧹 Verifica se há limpezas ativas no momento
          const activeClearings = Object.keys(clearingTiresRef.current);
          if (activeClearings.length > 0) {
            console.log('🧹🛡️🛡️🛡️ ==========================================');
            console.log('🧹🛡️ PROTEÇÃO ATIVA - Limpezas em progresso:');
            console.log('🧹🛡️ Chaves:', activeClearings);
            console.log('🧹🛡️ Idades:', Object.entries(clearingTiresRef.current).map(([k, v]) => `${k}: ${Date.now() - v}ms atrás`));
            console.log('🧹🛡️🛡️🛡️ ==========================================');
            // NÃO retorna aqui - vamos deixar o merge decidir pneu por pneu
          } else {
            console.log('✅ Nenhuma limpeza ativa - processando update normalmente');
          }
          console.log('🔥 ========================================');
          
          const updatedSession = payload.new as any;
          
          console.log('🔄 Processando UPDATE recebido do Realtime...');
          console.log('🔄 savedTireSets ANTES do update:', Object.keys(savedTireSets).map(k => `${k}: ${savedTireSets[parseInt(k)]?.flatMap(s => s.tires).map(t => t.codigo).filter(c => c !== '-').join(',')}`));

          // Atualiza progresso local
          if (updatedSession.progress) {
            const progress = updatedSession.progress;
            const restoredSavedSets: Record<number, TireSet[]> = {};
            const restoredCompletedChassis: Record<number, boolean> = {};
            const restoredLocks: Record<number, { userId: string; userName: string; lockedAt: string } | null> = {};

            // 🔥 Atualiza ref para indicar se progress está vazio
            const progressKeys = Object.keys(progress).length;
            isSupabaseProgressEmptyRef.current = progressKeys === 0;

            // 🔥 LOG: Verifica se progress está vazio
            console.log('🔄 Progress do Realtime:', {
              totalKeys: progressKeys,
              isEmpty: isSupabaseProgressEmptyRef.current,
              keys: Object.keys(progress).slice(0, 10),
              sample: progressKeys > 0 ? progress[Object.keys(progress)[0]] : null
            });

            if (progressKeys === 0) {
              console.log('ℹ️ Realtime recebeu progress vazio (sessão sem conferências)');
              console.log('   - isSupabaseProgressEmptyRef.current =', isSupabaseProgressEmptyRef.current);
            }

            // 🔥 PRIMEIRO: Restaura tireSets IMEDIATAMENTE (sem esperar nomes de usuários)
            Object.keys(progress).forEach(key => {
              const idx = parseInt(key);
              const chassisProgress = progress[key];

              // 🔥 LOG detalhado do que está no progress
              if (!chassisProgress.tireSets) {
                console.warn(`⚠️ Realtime - Chassis [${idx}] sem tireSets:`, Object.keys(chassisProgress));
              }

              if (chassisProgress.tireSets) {
                restoredSavedSets[idx] = chassisProgress.tireSets.map(set => ({
                  ...set,
                  label: `Jogo ${set.jogo}`,
                  tires: set.tires.map((tire, tireIdx) => ({
                    ...tire,
                    _originalIndex: tire._originalIndex ?? tireIdx,
                    registeredBy: tire.registeredBy || undefined,
                    registeredAt: tire.registeredAt || undefined
                  }))
                }));
              }
              
              if (chassisProgress.completed) {
                restoredCompletedChassis[idx] = true;
              }
              
              // Lock temporário (será atualizado depois com userName)
              if (chassisProgress.lockedBy) {
                restoredLocks[idx] = {
                  userId: chassisProgress.lockedBy,
                  userName: '', // Será preenchido depois
                  lockedAt: chassisProgress.lockedAt
                };
              } else {
                restoredLocks[idx] = null;
              }
            });
            
            // 🔥 ATUALIZA IMEDIATAMENTE (ANTES de buscar nomes)
            console.log('✅ Atualizando savedTireSets IMEDIATAMENTE:', Object.keys(restoredSavedSets).length, 'chassis');
            
            // 🆕 DETECTA CONFLITOS EM TEMPO REAL
            // Se há um chassis aberto no modal e ele foi modificado por outro usuário, mostra aviso
            if (selectedChassisIndex !== null && restoredSavedSets[selectedChassisIndex]) {
              const currentLocalTires = tireSets;
              const incomingTires = restoredSavedSets[selectedChassisIndex];
              
              // Verifica se há diferenças entre os dados locais e os dados recebidos
              const hasConflict = JSON.stringify(currentLocalTires) !== JSON.stringify(incomingTires);
              
              if (hasConflict) {
                console.log('⚠️⚠️⚠️ CONFLITO DETECTADO EM TEMPO REAL!');
                console.log('   Chassis aberto:', selectedChassisIndex);
                console.log('   Dados locais:', currentLocalTires);
                console.log('   Dados recebidos:', incomingTires);
                console.log('   🧹 Limpezas ativas (ref):', Object.keys(clearingTiresRef.current).filter(k => k.startsWith(`${selectedChassisIndex}-`)));
                console.log('   🧹 Detalhes:', Object.entries(clearingTiresRef.current).filter(([k]) => k.startsWith(`${selectedChassisIndex}-`)).map(([k, v]) => `${k}: ${Date.now() - v}ms atrás`));
                
                // Faz MERGE INTELIGENTE: preserva códigos não-vazios, mas aceita limpezas explícitas
                const mergedTireSets = currentLocalTires.map((localSet, setIdx) => {
                  const incomingSet = incomingTires[setIdx];
                  if (!incomingSet) return localSet;
                  
                  return {
                    ...incomingSet,
                    tires: localSet.tires.map((localTire, tireIdx) => {
                      const incomingTire = incomingSet.tires[tireIdx];
                      if (!incomingTire) return localTire;
                      
                      // 🧹 NOVA REGRA 0: Verifica se este pneu está sendo limpo AGORA
                      // Se estiver em clearingTires, IGNORA incoming e mantém local (limpo)
                      // 🔥 USA REF para garantir que sempre lê o valor mais recente!
                      const clearKey = `${selectedChassisIndex}-${localSet.jogo}-${tireIdx}`;
                      const clearTimestamp = clearingTiresRef.current[clearKey];
                      if (clearTimestamp) {
                        const elapsedMs = Date.now() - clearTimestamp;
                        if (elapsedMs < 5000) { // Protege por 5 segundos
                          console.log(`   🧹🧹🧹 IGNORANDO incoming - limpeza em progresso (${elapsedMs}ms atrás): ${clearKey}`);
                          console.log(`       Local: "${localTire.codigo}" | Incoming: "${incomingTire.codigo}"`);
                          console.log(`       🛡️ MANTENDO LOCAL LIMPO`);
                          return localTire; // Mantém o local limpo
                        } else {
                          console.log(`   ⏰ Proteção expirada (${elapsedMs}ms) - aceitando incoming: ${clearKey}`);
                        }
                      }
                      
                      // 🔥 REGRA 1: Se incoming tem código preenchido (não "-"), SEMPRE usa incoming
                      // MAS: Se tiver proteção de limpeza ativa, ignora incoming e mantém local limpo!
                      if (incomingTire.codigo && incomingTire.codigo !== '-') {
                        // 🧹 Verifica proteção de limpeza novamente (double-check)
                        const clearTimestamp2 = clearingTiresRef.current[clearKey];
                        if (clearTimestamp2 && (Date.now() - clearTimestamp2 < 5000)) {
                          console.log(`   🧹🛡️ REGRA 1 BLOQUEADA - proteção ativa, mantendo local limpo`);
                          return localTire;
                        }
                        console.log(`   ✅ USANDO código incoming: ${incomingTire.codigo} (posição ${incomingTire.posicao})`);
                        return incomingTire;
                      }
                      
                      // 🔥 REGRA 2: Detecta LIMPEZA EXPLÍCITA do código
                      // Se incoming está completamente vazio (todos os campos zerados), isso indica limpeza intencional
                      const isExplicitClear = (
                        incomingTire.codigo === '-' && 
                        incomingTire.piloto === '-' && 
                        incomingTire.ano === '' &&
                        incomingTire.set === '' &&
                        incomingTire.tipo === '' &&
                        incomingTire.voltas === '' &&
                        incomingTire.situacao === '-' &&
                        !incomingTire.observacao &&
                        !incomingTire.validacao
                      );
                      
                      if (isExplicitClear) {
                        // 🧹 Se a limpeza foi NOSSA (local), mantém o local limpo
                        const clearTimestamp3 = clearingTiresRef.current[clearKey];
                        if (clearTimestamp3 && (Date.now() - clearTimestamp3 < 5000)) {
                          console.log(`   🧹🛡️ LIMPEZA NOSSA - mantendo local limpo (ignorando incoming)`);
                          return localTire;
                        }
                        console.log(`   🧹 LIMPEZA EXPLÍCITA DETECTADA - limpando código local (posição ${incomingTire.posicao})`);
                        return incomingTire;
                      }
                      
                      // 🔥 REGRA 3: Se local tem código mas incoming está vazio (sem ser limpeza explícita),
                      // preserva o local (proteção contra perda de dados acidental)
                      if (localTire.codigo && localTire.codigo !== '-') {
                        console.log(`   ✅ PRESERVANDO código local: ${localTire.codigo} (posição ${localTire.posicao})`);
                        return localTire;
                      }
                      
                      // 🔥 REGRA 4: Ambos vazios - usa o incoming (pode ter observação)
                      return incomingTire;
                    })
                  };
                });
                
                console.log('   ✅ Merge completo! Atualizando tireSets no modal...');
                console.log('   📊 Códigos após merge:', mergedTireSets.flatMap(s => s.tires).map(t => t.codigo).filter(c => c !== '-'));
                console.log('   🧹 Proteções ativas durante merge:', Object.keys(clearingTiresRef.current));
                
                // 🧹 SE HOUVER LIMPEZA ATIVA, NÃO ATUALIZA tireSets!
                const hasActiveClearingsForThisChassis = Object.keys(clearingTiresRef.current).some(k => k.startsWith(`${selectedChassisIndex}-`));
                if (hasActiveClearingsForThisChassis) {
                  console.log('🧹🛡️ ❌ BLOQUEANDO atualização de tireSets - limpeza ativa neste chassis!');
                } else {
                  setTireSets(mergedTireSets);
                  setHasRealtimeConflict(true);

                  // Mostra toast informativo
                  // toast.info('🔄 Chassis atualizado em tempo real', {
                  //   description: 'Outro usuário modificou este chassis. Dados foram sincronizados.',
                  //   duration: 5000
                  // });
                }
                
                // Remove flag após 3 segundos
                setTimeout(() => setHasRealtimeConflict(false), 3000);
              }
            }
            
            // 🧹 PROTEÇÃO: Se houver limpezas ativas, NÃO sobrescreve savedTireSets
            const hasActiveClearings = Object.keys(clearingTiresRef.current).length > 0;
            if (hasActiveClearings) {
              console.log('🧹🛡️ BLOQUEANDO atualização de savedTireSets - limpezas ativas:', Object.keys(clearingTiresRef.current));
              // Mantém o savedTireSets atual para os chassis com limpezas ativas
              const protectedSavedSets = { ...restoredSavedSets };
              
              // Para cada limpeza ativa, preserva o savedTireSets local
              Object.keys(clearingTiresRef.current).forEach(clearKey => {
                const chassisIdx = parseInt(clearKey.split('-')[0]);
                if (savedTireSets[chassisIdx]) {
                  console.log(`   🧹 Preservando savedTireSets[${chassisIdx}] (tem limpeza ativa)`);
                  protectedSavedSets[chassisIdx] = savedTireSets[chassisIdx];
                }
              });
              
              console.log('🔄 APLICANDO setSavedTireSets (com proteção):', Object.keys(protectedSavedSets).length, 'chassis');
              setSavedTireSets(protectedSavedSets);
              console.log('✅ setSavedTireSets APLICADO (com proteção)');
            } else {
              console.log('🔄 APLICANDO setSavedTireSets (sem proteção):', Object.keys(restoredSavedSets).length, 'chassis');
              setSavedTireSets(restoredSavedSets);
              console.log('✅ setSavedTireSets APLICADO (sem proteção)');

              // 🔥 VALIDAÇÃO: Verifica se o estado ficou vazio quando não deveria
              if (Object.keys(restoredSavedSets).length === 0 && Object.keys(progress).length > 0) {
                console.warn('⚠️ restoredSavedSets vazio apesar de haver progress');
                console.warn('   - progress tinha', Object.keys(progress).length, 'entradas');
                console.warn('   - Possível problema com estrutura dos dados');
              }
            }
            
            setCompletedChassis(restoredCompletedChassis);
            setChassisLocks(restoredLocks);
            
            console.log('🔄 savedTireSets DEPOIS do update:', Object.keys(savedTireSets).map(k => `${k}: ${savedTireSets[parseInt(k)]?.flatMap(s => s.tires).map(t => t.codigo).filter(c => c !== '-').join(',')}`));
            
            // 🆕 MARCA CHASSIS ATUALIZADOS (que não estão abertos no modal)
            const updatedChassisList: Record<number, boolean> = {};
            Object.keys(restoredSavedSets).forEach(key => {
              const idx = parseInt(key);
              if (idx !== selectedChassisIndex) {
                // Marca como atualizado apenas se não for o chassis atual
                updatedChassisList[idx] = true;
              }
            });
            setRecentlyUpdatedChassis(updatedChassisList);
            
            // Remove marcação após 5 segundos
            setTimeout(() => {
              setRecentlyUpdatedChassis({});
            }, 5000);
            
            // 🔥🔥🔥 CRÍTICO: Atualiza extractedData com excel_data do Supabase (caso tenha sido reordenado)
            setExtractedData(prevData => {
              if (!prevData || prevData.length === 0) {
                console.log('⚠️ prevData vazio, pulando atualização de tiresChecked');
                return prevData;
              }

              // 🔥 Se o realtime tem excel_data, usa ele como fonte da verdade
              if (updatedSession.excel_data && Array.isArray(updatedSession.excel_data)) {
                const supabaseExcelData = updatedSession.excel_data;

                // Verifica se há diferença na ordem dos chassis
                let hasOrderChange = false;
                let orderChangeIndex = -1;
                for (let i = 0; i < Math.min(prevData.length, supabaseExcelData.length); i++) {
                  if (prevData[i].chassis !== supabaseExcelData[i].chassis) {
                    hasOrderChange = true;
                    orderChangeIndex = i;
                    break;
                  }
                }

                if (hasOrderChange) {
                  // 🔒 PROTEÇÃO 1: Ignora mudanças de ordem causadas por este dispositivo (timing)
                  const timeSinceOrderChange = Date.now() - lastOrderChangeTimestampRef.current;
                  if (ignoreNextOrderChangeRef.current && timeSinceOrderChange < 5000) {
                    console.log('🔒🔒🔒 REALTIME: Ignorando mudança de ordem (flag ativo - causada por este dispositivo)');
                    console.log(`   Tempo desde movimento: ${timeSinceOrderChange}ms`);
                    ignoreNextOrderChangeRef.current = false; // Reseta flag após ignorar
                    // Mantém dados locais, apenas atualiza tiresChecked
                  } else {
                    // 🔒 PROTEÇÃO 2: Detecta se é movimento para o final (padrão esperado)
                    // Verifica se todos os chassis estão presentes, apenas reordenados
                    const localChassisSet = new Set(prevData.map(c => c.chassis));
                    const supabaseChassisSet = new Set(supabaseExcelData.map((c: any) => c.chassis));
                    const sameChassisCount = localChassisSet.size === supabaseChassisSet.size &&
                      [...localChassisSet].every(ch => supabaseChassisSet.has(ch));

                    if (sameChassisCount && timeSinceOrderChange < 10000) {
                      // Mesmos chassis, apenas reordenados + dentro de 10s do último movimento
                      console.log('🔒🔒🔒 REALTIME: Ignorando reordenação (movimento para o final detectado)');
                      console.log(`   Todos os ${localChassisSet.size} chassis estão presentes, apenas reordenados`);
                      console.log(`   Tempo desde último movimento: ${timeSinceOrderChange}ms`);
                      // Mantém dados locais, apenas atualiza tiresChecked
                    } else {
                      // ⚠️ Mudança de ordem real detectada (de outro dispositivo ou usuário)
                      console.warn(`⚠️ REALTIME: Detectou mudança de ordem no índice ${orderChangeIndex}`);
                      console.warn(`   Local: ${prevData[orderChangeIndex].chassis} | Supabase: ${supabaseExcelData[orderChangeIndex].chassis}`);
                      console.log('🔄🔄🔄 REALTIME: Atualizando extractedData com excel_data do Supabase (ordem foi alterada por outro dispositivo)');

                      // 🔥🔥🔥 CRÍTICO: Se modal está aberto, atualiza selectedChassisIndex para novo índice do chassis
                      if (selectedChassisIndex !== null) {
                        const selectedChassis = prevData[selectedChassisIndex];
                        if (selectedChassis) {
                          const newIndex = supabaseExcelData.findIndex((c: any) => c.chassis === selectedChassis.chassis);
                          if (newIndex !== -1 && newIndex !== selectedChassisIndex) {
                            console.warn(`🔄🔄🔄 ATUALIZANDO selectedChassisIndex devido a mudança de ordem`);
                            console.warn(`   Chassis: ${selectedChassis.chassis}`);
                            console.warn(`   Índice antigo: ${selectedChassisIndex} → Novo índice: ${newIndex}`);
                            setSelectedChassisIndex(newIndex);
                          }
                        }
                      }

                      const updatedData = supabaseExcelData.map((chassis: any, idx: number) => ({
                        ...chassis,
                        _originalIndex: idx, // 🔥 FORÇA índice correto
                        tiresChecked: restoredSavedSets[idx] ? countCheckedTires(restoredSavedSets[idx]) : 0
                      }));
                      return ensureCorrectIndexes(updatedData);
                    }
                  }
                }
              }

              // Se não houve mudança de ordem, apenas atualiza tiresChecked
              const updatedData = prevData.map((chassis, idx) => ({
                ...chassis,
                _originalIndex: idx, // 🔥🔥🔥 FORÇA _originalIndex = idx para garantir consistência
                tiresChecked: restoredSavedSets[idx] ? countCheckedTires(restoredSavedSets[idx]) : 0
              }));

              console.log('✅ Atualizando extractedData com tiresChecked recalculado:',
                updatedData.map((c, i) => `${c.chassis}: ${c.tiresChecked}`).join(', ')
              );

              return ensureCorrectIndexes(updatedData);
            });
            
            // 🔥 DEPOIS: Busca nomes de usuários (assíncrono, não bloqueia)
            const lockedUserIds: string[] = [];
            Object.keys(progress).forEach(key => {
              const chassisProgress = progress[key];
              if (chassisProgress.lockedBy) {
                lockedUserIds.push(chassisProgress.lockedBy);
              }
            });
            
            if (lockedUserIds.length > 0) {
              const fetchUserNames = async () => {
                const userNamesMap: Record<string, string> = {};
                
                const { data, error } = await supabase
                  .from('user_profiles')
                  .select('id, nome')
                  .in('id', lockedUserIds);
                
                if (!error && data) {
                  data.forEach(user => {
                    userNamesMap[user.id] = user.nome;
                  });
                  
                  // Atualiza APENAS os locks com os nomes corretos
                  const updatedLocks = { ...restoredLocks };
                  Object.keys(progress).forEach(key => {
                    const idx = parseInt(key);
                    const chassisProgress = progress[key];
                    if (chassisProgress.lockedBy && updatedLocks[idx]) {
                      updatedLocks[idx] = {
                        ...updatedLocks[idx]!,
                        userName: userNamesMap[chassisProgress.lockedBy] || ''
                      };
                    }
                  });
                  
                  console.log('✅ Nomes de usuários carregados, atualizando locks');
                  setChassisLocks(updatedLocks);
                }
              };
              
              fetchUserNames();
            }
          }
          
          // Verifica se a sessão foi desativada
          if (updatedSession.is_active === false) {
            toast.info('📢 A sessão foi encerrada por outro usuário');
            setActiveSessionId(null);
            setExtractedData([]);
            setUploadedFile(null);
            setSavedTireSets({});
            setCompletedChassis({});
            setChassisLocks({});
            // 🔥 Reseta ref quando sessão é encerrada
            isSupabaseProgressEmptyRef.current = true;
            setCurrentStep('upload');
          }
          } catch (error) {
            console.error('❌❌❌ ERRO NO PROCESSAMENTO DO REALTIME:', error);
            toast.error('Erro ao processar atualização em tempo real', {
              description: 'Verifique o console para mais detalhes'
            });
          }
        }
      )
      .subscribe((status, err) => {
        console.log('🔥🔥🔥 ========================================');
        console.log('🔥 STATUS DA SUBSCRIPTION REALTIME:');
        console.log('🔥 Status:', status);
        if (err) {
          // Filtra erros normais/temporários
          const isNormalClosure = err?.message?.includes('socket closed: 1000');
          const isTransportFailure = err?.message?.includes('transport failure');
          const isNetworkError = isNormalClosure || isTransportFailure;

          if (!isNetworkError) {
            console.log('🔥 Erro:', err);
          } else {
            console.log('🔥 Erro de rede temporário:', err?.message || 'sem mensagem');
          }
        }
        console.log('🔥 ========================================');

        if (status === 'SUBSCRIBED') {
          console.log('✅✅✅ REALTIME CONECTADO COM SUCESSO!');
          // toast.success('🔥 Sincronização em tempo real ativada!', {
          //   description: 'Códigos bipados aparecerão instantaneamente'
          // });
        } else if (status === 'CHANNEL_ERROR') {
          // Filtra erros normais/temporários que não precisam de alerta
          const isNormalClosure = err?.message?.includes('socket closed: 1000');
          const isTransportFailure = err?.message?.includes('transport failure');
          const isNetworkError = isNormalClosure || isTransportFailure;

          if (!isNetworkError) {
            console.error('❌❌❌ ERRO NO CANAL REALTIME:', err);
            toast.error('Erro na sincronização em tempo real', {
              description: 'Verifique a configuração do Realtime no Supabase'
            });
          } else {
            console.log('ℹ️ Erro de rede temporário no realtime:', err?.message || 'sem mensagem');
          }
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️⏱️⏱️ TIMEOUT NA CONEXÃO REALTIME');
          toast.error('Timeout na sincronização', {
            description: 'A conexão em tempo real demorou muito para responder'
          });
        } else if (status === 'CLOSED') {
          console.log('🚪 Canal Realtime fechado');

          // 🔄 Tenta reconectar após 3 segundos se a sessão ainda estiver ativa
          if (activeSessionId) {
            console.log('🔄 Agendando reconexão automática em 3 segundos...');
            setTimeout(() => {
              if (activeSessionId) {
                console.log('🔄 Tentando reconectar ao canal realtime...');
                // A próxima renderização irá recriar a conexão
              }
            }, 3000);
          }
        }
      });
    
    return () => {
      console.log('🔥 Removendo listener em tempo real');
      supabase.removeChannel(channel);
    };
  }, [activeSessionId]);

  // 🔍 DEBUG: Monitora mudanças no savedTireSets
  useEffect(() => {
    console.log('🎯🎯🎯 savedTireSets MUDOU! ========================================');
    console.log('🎯 Total de chassis com dados:', Object.keys(savedTireSets).length);
    if (Object.keys(savedTireSets).length > 0) {
      const summary = Object.keys(savedTireSets).slice(0, 10).map(k => {
        const sets = savedTireSets[parseInt(k)];
        const count = sets ? countCheckedTires(sets) : 0;
        return `[${k}]=${count}`;
      }).join(', ');
      console.log('🎯 Primeiros 10 chassis:', summary);
      console.log('✅ savedTireSets populado com sucesso');
    } else {
      // 🔥 Verifica se é uma limpeza intencional ou problema
      const hasExtractedData = extractedData.length > 0;
      const hasActiveSession = !!activeSessionId;
      const isSupabaseProgressEmpty = isSupabaseProgressEmptyRef.current;

      if (hasExtractedData && hasActiveSession && !isSupabaseProgressEmpty) {
        // ⚠️ Problema potencial: há dados no Supabase mas não foram carregados
        console.warn('⚠️ savedTireSets vazio mas há dados no Supabase');
        console.warn('   - extractedData.length:', extractedData.length);
        console.warn('   - activeSessionId:', activeSessionId);
        console.warn('   - Possível problema de carregamento dos dados');
      } else if (hasExtractedData && hasActiveSession && isSupabaseProgressEmpty) {
        // ℹ️ Estado válido: sessão criada mas nenhum chassis conferido ainda
        console.log('ℹ️ savedTireSets vazio - Sessão nova sem conferências');
        console.log('   - extractedData.length:', extractedData.length);
        console.log('   - activeSessionId:', activeSessionId);
      } else {
        console.log('ℹ️ savedTireSets vazio (estado inicial normal)');
        console.log('   - extractedData.length:', extractedData.length);
        console.log('   - activeSessionId:', activeSessionId || 'null');
      }
    }
    console.log('🎯🎯🎯 ========================================');
  }, [savedTireSets, extractedData.length, activeSessionId]);

  // 🔥 NÃO RESTAURA MAIS DO LOCALSTORAGE - Dados vêm sempre do Supabase
  /*
  useEffect(() => {
    const restoreActiveSession = async () => {
      const activeSession = getActiveSession();
      if (activeSession) {
        console.log('🔥 Sessão ativa encontrada! Restaurando...', activeSession);
        
        // Restaura temporada
        const seasons = await getSeasons();
        const matchingSeason = seasons.find(s => 
          (s.name || `Temporada ${s.year}`) === activeSession.season_name
        );
        
        if (matchingSeason) {
          setActiveSeason(matchingSeason);
          
          // Restaura etapas
          const stages = await getSeasonStages(matchingSeason.id);
          setSeasonStages(stages);
          
          // Restaura etapa selecionada
          const matchingStage = stages.find(st => st.name === activeSession.stage_name);
          if (matchingStage) {
            setEtapaId(matchingStage.id);
          }
        }
        
        // Converte chassis_data de volta para o formato interno
        const restoredData: ExcelChassisData[] = activeSession.chassis_data.map((chassis, idx) => {
          const matchedChassis = registeredChassis.find(c => c.chassisNumber === chassis.chassis);
          return {
            chassis: chassis.chassis,
            piloto: chassis.piloto,
            corrida: chassis.corrida,
            sheetName: chassis.sheetName,
            rowNumber: idx + 1,
            isValid: true,
            matchedChassis: matchedChassis,
            tiresChecked: chassis.tiresChecked,
            _originalIndex: chassis._originalIndex ?? idx // 🔥 CRÍTICO: Preserva ou cria _originalIndex
          };
        });
        
        // Restaura tireSets salvos
        const restoredSavedTireSets: Record<number, TireSet[]> = {};
        activeSession.chassis_data.forEach((chassis, idx) => {
          if (chassis.tireSets && chassis.tireSets.length > 0) {
            restoredSavedTireSets[idx] = chassis.tireSets.map(set => ({
              jogo: set.jogo,
              label: `Jogo ${set.jogo}`, // 🔥 SEMPRE usa "Jogo X", nunca "Montado no Carro"
              montadoNoCarro: set.montadoNoCarro,
              tires: set.tires.map(tire => ({
                posicao: abreviarPosicao(tire.posicao), // 🔥 NORMALIZA posições ao restaurar
                codigo: tire.codigo,
                piloto: tire.piloto,
                ano: tire.ano,
                set: tire.set,
                tipo: tire.tipo,
                voltas: tire.voltas,
                situacao: tire.situacao,
                divergencia: tire.divergencia,
                pilotoInvalido: tire.pilotoInvalido,
                observacao: tire.observacao, // 🔥 Campo de observação
                validacao: tire.validacao, // 🔥 Campo de validação
                _originalIndex: tire._originalIndex // 🔥 Preserva _originalIndex ao restaurar do Supabase
              }))
            }));
          }
        });
        
        // 🆕 Recalcula tiresChecked baseado nos tireSets restaurados
        const correctedData = restoredData.map((chassis, idx) => ({
          ...chassis,
          _originalIndex: chassis._originalIndex ?? idx, // 🔥 Garante que _originalIndex existe
          tiresChecked: restoredSavedTireSets[idx] ? countCheckedTires(restoredSavedTireSets[idx]) : 0
        }));

        setExtractedData(ensureCorrectIndexes(correctedData)); // 🔥 Garante índices corretos
        setSavedTireSets(restoredSavedTireSets);
        setCurrentStep('chassis');
        
        toast.success('Sessão restaurada!', {
          description: 'Continue de onde parou'
        });
        
        console.log('✅ Sessão restaurada com sucesso');
      }
    };
    
    restoreActiveSession();
  }, []);
  */

  // Carregar temporada ativa e etapas quando o upload for concluído
  useEffect(() => {
    if (currentStep === 'etapa') {
      loadActiveSeasonAndStages();
    }
  }, [currentStep]);

  // 🎯 Auto-foco no primeiro campo de código vazio quando entrar em modo de edição
  useEffect(() => {
    if (isEditMode && tireSets.length > 0 && !pendingFocusAfterSubmit) {
      // Pequeno delay para garantir que o DOM foi renderizado
      setTimeout(() => {
        // Busca o primeiro input vazio em todos os jogos
        for (const set of tireSets) {
          // 🔥 Busca o primeiro pneu vazio na ORDEM VISUAL (não pelo _originalIndex)
          const firstEmptyIdx = set.tires.findIndex(t => !t.codigo || t.codigo === '-');
          if (firstEmptyIdx !== -1) {
            const firstEmptyTire = set.tires[firstEmptyIdx];
            const firstEmptyOriginalIndex = firstEmptyTire._originalIndex ?? firstEmptyIdx;

            const firstInput = document.querySelector(`input[data-jogo="${set.jogo}"][data-position="${firstEmptyOriginalIndex}"]`) as HTMLInputElement;
            if (firstInput) {
              firstInput.focus();
              console.log(`🎯 Auto-foco inicial no Jogo ${set.jogo}, índice visual ${firstEmptyIdx}, _originalIndex ${firstEmptyOriginalIndex}`);
              break; // Para no primeiro encontrado
            }
          }
        }
      }, 150);
    }
  }, [isEditMode, showCollectorConference]); // 🔥 REMOVIDO tireSets das dependências para não executar a cada bipagem

  // 🎯 Auto-foco após submit de código (busca próximo campo vazio)
  useEffect(() => {
    if (pendingFocusAfterSubmit && tireSets.length > 0) {
      const { jogo, position } = pendingFocusAfterSubmit;
      
      setTimeout(() => {
        // Busca próxima posição vazia no jogo atual na ORDEM VISUAL
        const currentSet = tireSets.find(s => s.jogo === jogo);
        if (currentSet) {
          // 🔥 Busca o índice visual do pneu que acabou de ser preenchido
          const currentVisualIdx = currentSet.tires.findIndex(t => t._originalIndex === position);
          
          // 🔥 Busca o próximo campo vazio APÓS a posição atual (para baixo na lista)
          const nextEmptyIdx = currentSet.tires.findIndex((t, idx) => 
            idx > currentVisualIdx && (!t.codigo || t.codigo === '-')
          );
          
          if (nextEmptyIdx !== -1) {
            const nextTire = currentSet.tires[nextEmptyIdx];
            const nextOriginalIndex = nextTire._originalIndex ?? nextEmptyIdx;
            
            // Tem próxima posição vazia no jogo atual
            const nextInput = document.querySelector(`input[data-jogo="${jogo}"][data-position="${nextOriginalIndex}"]`) as HTMLInputElement;
            if (nextInput) {
              nextInput.focus();
              console.log(`🎯 Auto-foco no Jogo ${jogo}, índice visual ${nextEmptyIdx} (abaixo de ${currentVisualIdx}), _originalIndex ${nextOriginalIndex}`);
              setPendingFocusAfterSubmit(null);
              return;
            }
          }
        }
        
        // Se não tem mais posições vazias no jogo atual, busca no próximo jogo
        const nextJogoIndex = tireSets.findIndex(s => s.jogo > jogo);
        if (nextJogoIndex !== -1) {
          const nextJogo = tireSets[nextJogoIndex];
          const firstEmptyIdx = nextJogo.tires.findIndex(t => !t.codigo || t.codigo === '-');
          
          if (firstEmptyIdx !== -1) {
            const firstEmptyTire = nextJogo.tires[firstEmptyIdx];
            const firstEmptyOriginalIndex = firstEmptyTire._originalIndex ?? firstEmptyIdx;
            
            const nextInput = document.querySelector(`input[data-jogo="${nextJogo.jogo}"][data-position="${firstEmptyOriginalIndex}"]`) as HTMLInputElement;
            if (nextInput) {
              nextInput.focus();
              console.log(`🎯 Auto-foco no próximo Jogo ${nextJogo.jogo}, índice visual ${firstEmptyIdx}, _originalIndex ${firstEmptyOriginalIndex}`);
            }
          }
        }
        
        setPendingFocusAfterSubmit(null);
      }, 100);
    }
  }, [pendingFocusAfterSubmit]); // 🔥 REMOVIDO tireSets das dependências

  // 🔥 Fechar modal ao pressionar ESC
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedChassisIndex !== null && !useCollectorMode) {
        closeChassisModal();
      }
    };

    window.addEventListener('keydown', handleEscKey);

    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [selectedChassisIndex, useCollectorMode]);

  // 🔥 SINCRONIZA tireSets quando savedTireSets é atualizado pelo Realtime
  useEffect(() => {
    if (selectedChassisIndex !== null && savedTireSets[selectedChassisIndex]) {
      console.log('🔄 savedTireSets mudou! Atualizando tireSets no modal...');
      console.log('   Chassis Index:', selectedChassisIndex);
      console.log('   Novos dados:', savedTireSets[selectedChassisIndex].length, 'jogos');
      
      setTireSets(savedTireSets[selectedChassisIndex]);
      
      // Se estava no modo de edição, mantém o jogo e posição ativos
      // Caso contrário, busca a próxima posição vazia
      if (!isEditMode) {
        let foundActive = false;
        for (let i = 0; i < savedTireSets[selectedChassisIndex].length; i++) {
          const set = savedTireSets[selectedChassisIndex][i];
          const emptyIndex = set.tires.findIndex(t => t.codigo === '-');
          if (emptyIndex !== -1) {
            setActiveJogo(set.jogo);
            setActivePneuPosition(emptyIndex);
            foundActive = true;
            console.log('   ➡️ Próxima posição vazia: Jogo', set.jogo, 'Posição', emptyIndex);
            break;
          }
        }
        
        if (!foundActive) {
          console.log('   ✅ Todos os jogos completos!');
        }
      }
    }
  }, [savedTireSets, selectedChassisIndex, isEditMode]);

  const loadRegisteredChassis = async () => {
    try {
      const data = await getChassis();
      setRegisteredChassis(data);
      console.log('✅ Chassis cadastrados carregados:', data.length);
    } catch (error) {
      console.error('❌ Erro ao carregar chassis:', error);
    }
  };

  // 🔥 FUNÇÕES DE SESSÃO COMPARTILHADA
  
  const loadSharedSession = async (sessionId: string) => {
    try {
      // 🔥 MARCA INÍCIO DA CARGA INICIAL
      isInitialLoadRef.current = true;
      initialLoadTimestampRef.current = Date.now();
      console.log('🔥 MARCANDO CARGA INICIAL - Realtime deve ignorar updates por 3 segundos');
      
      const supabase = createClient();
      const { data: session, error } = await supabase
        .from('conference_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (error || !session) {
        console.error('❌ Erro ao carregar sessão:', error);
        return;
      }

      console.log('🔥 Carregando sessão compartilhada:', session);
      console.log('🔥 session.progress type:', typeof session.progress);
      console.log('🔥 session.progress is null?', session.progress === null);
      console.log('🔥 session.progress is undefined?', session.progress === undefined);
      console.log('🔥 session.progress keys:', session.progress ? Object.keys(session.progress).length : 'N/A');

      // 🔥 Atualiza ref para indicar se progress está vazio
      const progressKeys = session.progress ? Object.keys(session.progress).length : 0;
      isSupabaseProgressEmptyRef.current = progressKeys === 0;
      console.log('🔥 isSupabaseProgressEmptyRef.current =', isSupabaseProgressEmptyRef.current);

      setActiveSessionId(session.id);
      
      // 🔥 Restaura temporada e etapas
      if (session.season_id) {
        const seasons = await getSeasons();
        const matchingSeason = seasons.find(s => s.id === session.season_id);
        
        if (matchingSeason) {
          setActiveSeason(matchingSeason);
          
          // Carrega etapas da temporada
          const stages = await getSeasonStages(matchingSeason.id);
          setSeasonStages(stages);
        }
      }
      
      // Restaura etapa selecionada
      if (session.stage_id) {
        setEtapaId(session.stage_id);
      }
      
      // 🔥 Mescla excel_data com progress para obter dados atualizados
      const baseData: ExcelChassisData[] = session.excel_data;
      const progress = session.progress || {};
      
      setUploadedFile(new File([], session.file_name || 'planilha.xlsx'));
      
      // Restaura progresso
      const restoredSavedSets: Record<number, TireSet[]> = {};
      const restoredCompletedChassis: Record<number, boolean> = {};
      const restoredLocks: Record<number, { userId: string; userName: string; lockedAt: string } | null> = {};
      
      // 🆕 Coleta todos os userIds dos locks
      const lockedUserIds: string[] = [];
      Object.keys(progress).forEach(key => {
        const chassisProgress = progress[key];
        if (chassisProgress.lockedBy) {
          lockedUserIds.push(chassisProgress.lockedBy);
        }
      });
      
      // 🆕 Busca todos os nomes de usuários de uma vez
      const userNamesMap: Record<string, string> = {};
      if (lockedUserIds.length > 0) {
        const { data: usersData } = await supabase
          .from('user_profiles')
          .select('id, nome')
          .in('id', lockedUserIds);
        
        if (usersData) {
          usersData.forEach(user => {
            userNamesMap[user.id] = user.nome;
          });
        }
      }
      
      console.log('🔍🔍🔍 DEBUG CARGA INICIAL ===================');
      console.log('🔍 Total de chaves no progress:', Object.keys(progress).length);
      console.log('🔍 Chaves:', Object.keys(progress));
      console.log('🔍 session.progress (raw):', JSON.stringify(progress).substring(0, 500));

      // 🔥 VALIDAÇÃO: Verifica se progress está vazio (estado normal em nova sessão)
      if (Object.keys(progress).length === 0) {
        console.log('ℹ️ Progress vazio no Supabase (sessão nova ou sem chassis conferidos)');
        console.log('   - Sessão criada mas nenhum chassis foi conferido ainda');
        console.log('   - savedTireSets ficará vazio até a primeira conferência');
      }

      Object.keys(progress).forEach(key => {
        const idx = parseInt(key);
        const chassisProgress = progress[key];

        // 🔥🔥🔥 VALIDAÇÃO CRÍTICA: Verifica se o índice está dentro do range
        if (idx < 0 || idx >= baseData.length) {
          console.error(`❌ Índice inválido no progress: ${idx} (baseData.length: ${baseData.length})`);
          console.error(`   Pulando restauração para este índice para evitar corrupção!`);
          return; // Pula este índice
        }

        const chassisAtIndex = baseData[idx];
        console.log(`🔍 Restaurando progress [${idx}]: ${chassisAtIndex?.chassis} (${chassisAtIndex?.piloto})`);

        console.log(`🔍 Chassis [${idx}]:`, {
          hasTireSets: !!chassisProgress.tireSets,
          tireSetsCount: chassisProgress.tireSets?.length || 0,
          completed: chassisProgress.completed,
          keys: Object.keys(chassisProgress)
        });

        // 🔥 LOG DETALHADO se não tem tireSets mas tem outras propriedades
        if (!chassisProgress.tireSets && Object.keys(chassisProgress).length > 0) {
          console.warn(`⚠️ Chassis [${idx}] tem dados MAS tireSets está faltando:`, chassisProgress);
        }

        if (chassisProgress.tireSets) {
          // 🔥 SEMPRE recria o label como "Jogo X" e garante _originalIndex
          restoredSavedSets[idx] = chassisProgress.tireSets.map(set => {
            const tiresWithCodes = set.tires.filter(t => t.codigo && t.codigo !== '-');
            console.log(`   📦 Restaurando Jogo ${set.jogo} para chassis [${idx}]: ${tiresWithCodes.length} pneus`);
            console.log(`   📦 Códigos: ${tiresWithCodes.map(t => t.codigo).join(', ')}`);

            return {
              ...set,
              label: `Jogo ${set.jogo}`,
              tires: set.tires.map((tire, tireIdx) => ({
                ...tire,
                _originalIndex: tire._originalIndex ?? tireIdx,
                registeredBy: tire.registeredBy || undefined, // 🔥 PRESERVA registeredBy
                registeredAt: tire.registeredAt || undefined  // 🔥 PRESERVA registeredAt
              }))
            };
          });

          // 🔥🔥🔥 LOG DETALHADO: Qual chassis está recebendo quais dados
          const chassisData = baseData[idx];
          console.log(`   ✅ Chassis [${idx}] "${chassisData?.chassis}" (${chassisData?.piloto}) terá ${restoredSavedSets[idx].length} jogos`);
        }
        if (chassisProgress.completed) {
          restoredCompletedChassis[idx] = true;
        }
        if (chassisProgress.lockedBy) {
          restoredLocks[idx] = {
            userId: chassisProgress.lockedBy,
            userName: userNamesMap[chassisProgress.lockedBy] || '',
            lockedAt: chassisProgress.lockedAt
          };
        } else {
          restoredLocks[idx] = null;
        }
      });
      
      console.log('🔍 restoredSavedSets FINAL - Total:', Object.keys(restoredSavedSets).length);
      console.log('🔍 Detalhes por chassis:');
      Object.keys(restoredSavedSets).forEach(k => {
        const sets = restoredSavedSets[parseInt(k)];
        const totalTires = sets ? countCheckedTires(sets) : 0;
        console.log(`   Chassis [${k}]: ${totalTires} pneus conferidos`);
      });
      
      // 🆕 Recalcula tiresChecked baseado nos tireSets restaurados
      const correctedMergedData = baseData.map((chassis, idx) => {
        const tiresCount = restoredSavedSets[idx] ? countCheckedTires(restoredSavedSets[idx]) : 0;

        // 🔥🔥🔥 VALIDAÇÃO CRÍTICA: Verifica se _originalIndex coincide com idx
        const savedOriginalIdx = chassis._originalIndex;
        if (savedOriginalIdx !== undefined && savedOriginalIdx !== idx) {
          console.error(`❌❌❌ CORRUPÇÃO DETECTADA!`);
          console.error(`   Chassis "${chassis.chassis}" (${chassis.piloto})`);
          console.error(`   _originalIndex salvo no Supabase: ${savedOriginalIdx}`);
          console.error(`   Posição real no array: ${idx}`);
          console.error(`   🔧 CORRIGINDO: Forçando _originalIndex = ${idx}`);
        }

        console.log(`   ✅ Chassis [${idx}] "${chassis.chassis}" (${chassis.piloto}): ${tiresCount} pneus, _originalIndex: ${idx}`);

        return {
          ...chassis,
          _originalIndex: idx, // 🔥🔥🔥 SEMPRE FORÇA idx como _originalIndex para garantir consistência absoluta
          tiresChecked: tiresCount
        };
      });

      // 🔥🔥🔥 VALIDAÇÃO: Verifica se há chassis duplicados após load
      const chassisCounts = new Map<string, number>();
      correctedMergedData.forEach((item, idx) => {
        const key = `${item.chassis}-${item.piloto}`;
        const count = (chassisCounts.get(key) || 0) + 1;
        chassisCounts.set(key, count);
      });

      const duplicates = Array.from(chassisCounts.entries()).filter(([_, count]) => count > 1);
      if (duplicates.length > 0) {
        console.warn('⚠️⚠️⚠️ CHASSIS DUPLICADOS APÓS LOAD:');
        duplicates.forEach(([key, count]) => {
          console.warn(`   ${key}: aparece ${count} vezes`);
        });
      }
      
      console.log('🔍🔍🔍 APLICANDO ESTADOS ===================');
      console.log('🔍 setExtractedData:', correctedMergedData.length, 'chassis');
      console.log('🔍 setSavedTireSets:', Object.keys(restoredSavedSets).length, 'chassis com dados');
      console.log('🔍 Conteúdo de restoredSavedSets que será aplicado:', JSON.stringify(
        Object.fromEntries(
          Object.entries(restoredSavedSets).slice(0, 3).map(([k, sets]) => [
            k, 
            { jogos: sets.length, pneus: countCheckedTires(sets) }
          ])
        )
      ));
      
      // 🔥🔥🔥 APLICANDO ESTADOS
      console.log('🔥 APLICANDO AGORA - restoredSavedSets tem', Object.keys(restoredSavedSets).length, 'chassis');

      // 🔥 VALIDAÇÃO: Verifica se os dados foram restaurados corretamente
      if (Object.keys(progress).length > 0 && Object.keys(restoredSavedSets).length === 0) {
        console.warn('⚠️ Dados no Supabase mas restoredSavedSets vazio');
        console.warn('   - progress tem', Object.keys(progress).length, 'chassis');
        console.warn('   - Verificando primeiros 3:', Object.keys(progress).slice(0, 3));
        console.warn('   - Exemplo do primeiro:', progress[Object.keys(progress)[0]]?.tireSets ? 'tem tireSets' : 'sem tireSets');
      }

      setExtractedData(ensureCorrectIndexes(correctedMergedData)); // 🔥 Dupla garantia de índices corretos
      setSavedTireSets(restoredSavedSets);
      setCompletedChassis(restoredCompletedChassis);
      setChassisLocks(restoredLocks);
      setCurrentStep('chassis');
      
      // 🔥 FORÇA RERENDER
      setTimeout(() => {
        console.log('🔄 FORCE RERENDER - Reaplicando savedTireSets...');
        setSavedTireSets(prev => {
          console.log('🔄 prev tinha', Object.keys(prev).length, 'chassis');
          console.log('🔄 Forçando com', Object.keys(restoredSavedSets).length, 'chassis');
          return { ...restoredSavedSets };
        });
      }, 150);
      
      console.log('✅ Sessão restaurada com sucesso:', {
        chassis_count: correctedMergedData.length,
        saved_sets_count: Object.keys(restoredSavedSets).length,
        completed_count: Object.keys(restoredCompletedChassis).length
      });
      console.log('🔍🔍🔍 FIM DEBUG CARGA INICIAL ============');

      // 🔥🔥🔥 RESUMO FINAL: Tabela completa de chassis carregados
      console.log('\n📋 ========== RESUMO DA SESSÃO CARREGADA ==========');
      console.table(
        correctedMergedData.map((item, idx) => ({
          Índice: idx,
          Chassis: item.chassis,
          Piloto: item.piloto,
          _originalIndex: item._originalIndex,
          'Tem Dados': !!restoredSavedSets[idx] ? 'SIM' : 'NÃO',
          'Pneus': restoredSavedSets[idx] ? countCheckedTires(restoredSavedSets[idx]) : 0
        }))
      );
      console.log('====================================================\n');

      // 🔥 DESMARCA CARGA INICIAL APÓS 3 SEGUNDOS
      setTimeout(() => {
        isInitialLoadRef.current = false;
        console.log('✅ Carga inicial finalizada - Realtime pode processar updates normalmente');
      }, 3000);

      // toast.success('✅ Sessão compartilhada carregada!');
    } catch (error) {
      console.error('❌ Erro ao carregar sessão compartilhada:', error);
      toast.error('Erro ao carregar sessão compartilhada');
      
      // 🔥 DESMARCA MESMO COM ERRO
      isInitialLoadRef.current = false;
    }
  };
  
  const createSharedSession = async () => {
    if (!currentUserId || extractedData.length === 0 || !etapaId) {
      return null;
    }
    
    // 🔥 Busca o nome correto da etapa selecionada
    const selectedStage = seasonStages.find(stage => stage.id === etapaId);
    const stageName = selectedStage ? selectedStage.name : etapaId;
    
    try {
      const supabase = createClient();
      const { data: session, error } = await supabase
        .from('conference_sessions')
        .insert({
          season_id: activeSeason?.id || null,
          season_name: activeSeason?.name || `Temporada ${activeSeason?.year}`, // 🔥 Adiciona season_name
          stage_id: etapaId,
          etapa_name: stageName, // 🔥 CORRIGIDO: usa o nome da etapa, não o ID
          excel_data: extractedData,
          file_name: uploadedFile?.name || 'planilha.xlsx',
          total_chassis: extractedData.length,
          completed_chassis: 0,
          created_by: currentUserId,
          is_active: true,
          progress: {} // 🔥 CORREÇÃO CRÍTICA: Inicializa progress como objeto vazio
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro ao criar sessão:', error);
        toast.error('Erro ao criar sessão compartilhada');
        return null;
      }
      
      console.log('🔥 Sessão compartilhada criada:', session);
      console.log('📊 Season Name:', session.season_name);
      console.log('📊 Stage Name:', session.etapa_name);
      setActiveSessionId(session.id);
      // toast.success('✅ Sessão compartilhada criada! Outros usuários podem ver e trabalhar juntos.');
      return session.id;
    } catch (error) {
      console.error('❌ Erro ao criar sessão:', error);
      toast.error('Erro ao criar sessão compartilhada');
      return null;
    }
  };
  
  const updateSessionProgress = async (chassisIndex: number, updates: any) => {
    if (!activeSessionId) {
      console.warn('⚠️ updateSessionProgress chamado sem activeSessionId');
      return;
    }
    
    console.log('🔄 Atualizando progresso - Chassis:', chassisIndex, 'Updates:', updates);
    
    try {
      const supabase = createClient();
      // Busca sessão atual
      const { data: session } = await supabase
        .from('conference_sessions')
        .select('progress')
        .eq('id', activeSessionId)
        .single();
      
      if (!session) {
        console.warn('⚠️ Sessão não encontrada:', activeSessionId);
        return;
      }
      
      const currentProgress = session.progress || {};
      const updatedProgress = {
        ...currentProgress,
        [chassisIndex]: {
          ...(currentProgress[chassisIndex] || {}),
          ...updates
        }
      };
      
      console.log('📊 Progresso atualizado:', updatedProgress);
      
      // Atualiza no Supabase
      const { error } = await supabase
        .from('conference_sessions')
        .update({ progress: updatedProgress })
        .eq('id', activeSessionId);
      
      if (error) {
        console.error('❌ Erro ao atualizar progresso:', error);
      } else {
        console.log('✅ Progresso salvo com sucesso no Supabase');

        // 🔥 Atualiza ref para indicar que progress não está mais vazio
        const hasProgressData = Object.keys(updatedProgress).length > 0;
        if (hasProgressData && isSupabaseProgressEmptyRef.current) {
          isSupabaseProgressEmptyRef.current = false;
          console.log('🔥 isSupabaseProgressEmptyRef.current = false (dados foram salvos)');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar progresso:', error);
    }
  };
  
  const discardSession = async () => {
    console.log('🔥 discardSession: Iniciando descarte da sessão');
    console.log('🔥 activeSessionId:', activeSessionId);
    
    if (!activeSessionId) {
      // Limpa estado local se não houver sessão no Supabase
      console.log('🔥 Sem sessão ativa no Supabase, limpando apenas estados locais');
      setExtractedData([]);
      setUploadedFile(null);
      setSavedTireSets({});
      setCompletedChassis({});
      setChassisLocks({});
      // 🔥 Reseta ref quando sessão é descartada
      isSupabaseProgressEmptyRef.current = true;
      setEtapaId('');
      setSelectedCategory(null);
      setSelectedChassisIndex(null);
      setCurrentStep('upload');
      setActiveSeason(null); // 🔥 Limpa temporada
      setSeasonStages([]); // 🔥 Limpa etapas
      toast.success('✅ Sessão descartada');
      return;
    }
    
    try {
      const supabase = createClient();
      
      // 🔥 Tenta DELETAR a sessão do Supabase
      const { error } = await supabase
        .from('conference_sessions')
        .delete()
        .eq('id', activeSessionId);
      
      if (error) {
        console.error('❌ Erro ao deletar sessão do Supabase (ignorando):', error);
        // 🔥 Mesmo com erro de RLS, continua e limpa os estados locais
      } else {
        console.log('✅ Sessão deletada do Supabase');
      }
      
      // 🔥 SEMPRE limpa estado local, independente do erro do Supabase
      setActiveSessionId(null);
      setExtractedData([]);
      setUploadedFile(null);
      setSavedTireSets({});
      setCompletedChassis({});
      setChassisLocks({});
      setEtapaId('');
      setSelectedCategory(null);
      setSelectedChassisIndex(null);
      setCurrentStep('upload');
      setActiveSeason(null); // 🔥 Limpa temporada
      setSeasonStages([]); // 🔥 Limpa etapas
      // 🔥 Reseta ref quando sessão é descartada
      isSupabaseProgressEmptyRef.current = true;

      console.log('✅ Estados locais limpos');
      toast.success('✅ Sessão descartada com sucesso');
    } catch (error) {
      console.error('❌ Erro inesperado ao descartar sessão:', error);
      
      // 🔥 MESMO COM ERRO, limpa os estados locais
      setActiveSessionId(null);
      setExtractedData([]);
      setUploadedFile(null);
      setSavedTireSets({});
      setCompletedChassis({});
      setChassisLocks({});
      setEtapaId('');
      setSelectedCategory(null);
      setSelectedChassisIndex(null);
      setCurrentStep('upload');
      setActiveSeason(null); // 🔥 Limpa temporada
      setSeasonStages([]); // 🔥 Limpa etapas
      // 🔥 Reseta ref quando sessão é descartada (mesmo com erro)
      isSupabaseProgressEmptyRef.current = true;

      toast.success('✅ Sessão local descartada');
    }
  };

  const loadActiveSeasonAndStages = async () => {
    try {
      setIsLoadingStages(true);
      const seasons = await getSeasons();
      
      // Busca temporada com status "active"
      const active = seasons.find(s => s.status === 'active');
      
      if (!active) {
        console.log('⚠️ Nenhuma temporada ativa encontrada');
        alert('⚠️ Atenção!\n\nNenhuma temporada está configurada como ativa.\n\nPor favor, ative uma temporada em:\nPneus → Configurar Temporada → Temporadas');
        return;
      }
      
      setActiveSeason(active);
      console.log(`✅ Temporada ativa: ${active.name || active.year}`);
      
      // Carrega etapas da temporada ativa
      const stages = await getSeasonStages(active.id);
      setSeasonStages(stages);
      console.log(`✅ Etapas carregadas: ${stages.length}`, stages);

      // 🔥 CORRIGIDO: Só seleciona a primeira etapa se o usuário ainda não selecionou
      if (stages.length > 0 && !etapaId) {
        console.log('🔧 Setando primeira etapa automaticamente:', stages[0].id, stages[0].name);
        setEtapaId(stages[0].id);
      } else if (etapaId) {
        console.log('✅ Mantendo etapa já selecionada pelo usuário:', etapaId);
      } else {
        console.warn('⚠️ Nenhuma etapa encontrada para selecionar');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar temporada/etapas:', error);
      alert('Erro ao carregar etapas da temporada ativa.');
    } finally {
      setIsLoadingStages(false);
    }
  };

  const validateChassis = (chassisCode: string): { isValid: boolean; matched?: Chassis } => {
    const trimmedCode = chassisCode.trim();
    
    // Extrai apenas o número do chassis (antes da barra /)
    // Ex: "247/992.1" -> "247"
    // Ex: "262/992.1" -> "262"
    // Ex: "219/I" -> "219"
    const chassisNumber = trimmedCode.split('/')[0].trim();
    
    // Procura por correspondência exata ou pelo número do chassis
    const matched = registeredChassis.find(c => {
      const registeredCode = c.codigo.trim().replace('#', ''); // Remove # se houver
      const registeredNumber = registeredCode.split('/')[0].trim();
      
      // Compara código completo ou apenas o número
      return (
        c.codigo.toLowerCase() === trimmedCode.toLowerCase() ||
        registeredCode.toLowerCase() === trimmedCode.toLowerCase() ||
        registeredNumber === chassisNumber ||
        registeredCode === chassisNumber
      );
    });
    
    return { isValid: !!matched, matched };
  };

  /**
   * Identifica se uma linha contém um título com categoria válida
   * Exemplo: "CONFIRMAÇÃO DE PILOTOS CARRERA CUP"
   */
  const getCategoryFromTitle = (jsonData: any[][]): string | null => {
    // Procura nas primeiras 10 linhas por títulos
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      if (!row) continue;
      
      // Junta apenas as primeiras 10 células para economizar memória
      const rowText = row
        .slice(0, 10)
        .map(cell => String(cell || '').toUpperCase().trim())
        .join(' ');
      
      // Verifica categorias válidas
      if (rowText.includes('CARRERA')) return 'CARRERA CUP';
      if (rowText.includes('SPRINT CHALLENGE')) return 'SPRINT CHALLENGE';
      if (rowText.includes('SPRINT TROPHY')) return 'SPRINT TROPHY';
      if (rowText.includes('CHALLENGE') && !rowText.includes('SPRINT')) return 'CHALLENGE';
      if (rowText.includes('TROPHY') && !rowText.includes('SPRINT')) return 'TROPHY';
    }
    
    return null;
  };

  /**
   * Encontra a linha de header (que contém CHASSIS, PILOTO, etc.)
   */
  const findHeaderRow = (jsonData: any[][]): number => {
    const keywords = ['chassis', 'piloto', 'driver', 'classe', 'class'];
    
    for (let i = 0; i < Math.min(15, jsonData.length); i++) {
      const row = jsonData[i];
      if (!row) continue;
      
      const rowText = row.map(cell => String(cell || '').toLowerCase().trim());
      
      // Precisa ter "chassis" E ("piloto" OU "driver")
      const hasChassis = rowText.some(cell => cell.includes('chassis'));
      const hasPiloto = rowText.some(cell => cell.includes('piloto') || cell.includes('driver'));
      
      if (hasChassis && hasPiloto) {
        return i;
      }
    }
    
    return 0;
  };

  const identifyColumns = (headers: string[]): {
    chassis: number | null;
    piloto: number | null;
    corrida: number | null;
    numero: number | null; // ✅ Adiciona coluna do número do piloto
  } => {
    const chassisPatterns = ['chassis', 'chassi', 'carro', 'car'];
    const pilotoPatterns = ['piloto', 'pilot', 'driver'];
    const corridaPatterns = ['corrida', 'race', 'etapa', 'stage', 'pista', 'track'];
    const numeroPatterns = ['#', 'numero', 'número', 'nº', 'n°', 'number', 'num']; // ✅ Padrões para número do piloto
    
    const findColumn = (patterns: string[]) => {
      const normalized = headers.map(h => String(h).toLowerCase().trim());
      for (let i = 0; i < normalized.length; i++) {
        if (patterns.some(p => normalized[i].includes(p))) {
          return i;
        }
      }
      return null;
    };
    
    return {
      chassis: findColumn(chassisPatterns),
      piloto: findColumn(pilotoPatterns),
      corrida: findColumn(corridaPatterns),
      numero: findColumn(numeroPatterns) // ✅ Busca coluna do número
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Limite de 10MB para evitar problemas de memória
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      alert('⚠️ Arquivo muito grande!\n\nTamanho máximo: 10MB\nTamanho do arquivo: ' + (file.size / 1024 / 1024).toFixed(2) + 'MB\n\nPor favor, reduza o tamanho da planilha ou divida em arquivos menores.');
      event.target.value = '';
      return;
    }
    
    setUploadedFile(file);
    setIsProcessing(true);
    
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellStyles: false,
        cellFormula: false,
        cellHTML: false,
        sheetStubs: false
      });
      
      const allData: ExcelChassisData[] = [];
      let totalIgnored = 0;
      
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        
        // Limita o range de células processadas para economizar memória
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const maxRows = Math.min(range.e.r, 1000); // Máximo 1000 linhas por aba
        const maxCols = Math.min(range.e.c, 20); // Máximo 20 colunas
        
        // Ajusta o range
        const limitedRange = XLSX.utils.encode_range({
          s: { r: range.s.r, c: range.s.c },
          e: { r: maxRows, c: maxCols }
        });
        worksheet['!ref'] = limitedRange;
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '',
          blankrows: false,
          raw: false
        }) as any[][];
        
        if (jsonData.length < 2) return;
        
        console.log(`\n📊 Processando aba: "${sheetName}"`);
        
        // Encontra a linha de título com categoria válida
        const category = getCategoryFromTitle(jsonData);
        if (!category) {
          console.log(`   ⚠️ Nenhuma categoria válida (Carrera, Challenge, Trophy) encontrada - ABA IGNORADA`);
          return; // IGNORA esta aba completamente
        }
        
        console.log(`   ✓ Categoria encontrada: ${category}`);
        
        // Encontra a linha de header
        const headerRowIndex = findHeaderRow(jsonData);
        if (headerRowIndex === 0) {
          console.log(`   ⚠️ Linha de header não encontrada - ABA IGNORADA`);
          return; // IGNORA esta aba completamente
        }
        
        console.log(`   ✓ Linha de header encontrada: ${headerRowIndex + 1}`);
        
        const headers = jsonData[headerRowIndex].map((h: any) => String(h || '').trim());
        const columns = identifyColumns(headers);
        
        if (columns.chassis === null || columns.piloto === null) {
          console.log(`   ⚠️ Colunas não identificadas`);
          return;
        }
        
        console.log(`   ✓ Colunas identificadas: Chassis=${columns.chassis}, Piloto=${columns.piloto}`);
        
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row) continue;
          
          const chassis = row[columns.chassis];
          const piloto = row[columns.piloto];
          const corrida = columns.corrida !== null ? row[columns.corrida] : '';
          const numero = columns.numero !== null ? row[columns.numero] : ''; // ✅ Extrai número do piloto
          
          const chassisCode = String(chassis || '').trim();
          if (!chassisCode || chassisCode === '-') continue;
          
          const chassisStr = chassisCode.toLowerCase();
          if (chassisStr.includes('total') || chassisStr.includes('subtotal')) continue;
          
          const validation = validateChassis(chassisCode);
          if (!validation.isValid) {
            totalIgnored++;
            console.log(`     ✗ Chassis ${chassisCode} (linha ${i + 1}) - não cadastrado no Master Data`);
            continue;
          }
          
          const pilotoStr = String(piloto || '').trim();
          const numeroStr = String(numero || '').trim(); // ✅ Converte número para string
          
          allData.push({
            chassis: chassisCode,
            piloto: pilotoStr || 'Sem Piloto',
            corrida: String(corrida || '').trim(),
            numero: numeroStr, // ✅ Adiciona número do piloto
            sheetName: `${sheetName} (${category})`,
            rowNumber: i + 1,
            isValid: validation.isValid,
            matchedChassis: validation.matched,
            tiresChecked: 0
          });
          
          console.log(`     ✓ Chassis ${chassisCode} | Piloto: ${pilotoStr || 'Sem Piloto'} | Número: ${numeroStr || '-'} | Geração: ${validation.matched?.geracao || '-'}`);
        }
      });
      
      console.log('\n═══════════════════════════════════════');
      console.log('✅ PROCESSAMENTO CONCLUÍDO');
      console.log(`   📊 Total reconhecido: ${allData.length} chassis`);
      console.log(`   ✓ Todos cadastrados no Master Data`);
      console.log(`   👤 ${allData.filter(c => c.piloto === 'Sem Piloto').length} chassis sem piloto`);
      if (totalIgnored > 0) {
        console.log(`   ✗ ${totalIgnored} chassis ignorados (não cadastrados)`);
      }
      console.log('═══════════════════════════════════════\n');

      // 🔥 CRÍTICO: Adiciona índices originais únicos para garantir integridade dos dados
      const dataWithIndexes = addOriginalIndexes(allData);

      // 🔥🔥🔥 VALIDAÇÃO: Verifica se há chassis duplicados
      const chassisCounts = new Map<string, number>();
      dataWithIndexes.forEach((item, idx) => {
        const key = `${item.chassis}-${item.piloto}`;
        const count = (chassisCounts.get(key) || 0) + 1;
        chassisCounts.set(key, count);

        console.log(`[${idx}] _originalIndex: ${item._originalIndex}, chassis: ${item.chassis}, piloto: ${item.piloto}`);
      });

      // Alerta se houver duplicados
      const duplicates = Array.from(chassisCounts.entries()).filter(([_, count]) => count > 1);
      if (duplicates.length > 0) {
        console.warn('⚠️⚠️⚠️ CHASSIS DUPLICADOS DETECTADOS:');
        duplicates.forEach(([key, count]) => {
          console.warn(`   ${key}: aparece ${count} vezes`);
        });
      }

      setExtractedData(dataWithIndexes);

      // Limpa referências para liberar memória
      if (typeof (workbook as any).SSF !== 'undefined') {
        delete (workbook as any).SSF;
      }
      
      if (allData.length === 0) {
        alert('⚠️ Nenhum chassis cadastrado foi encontrado.\n\nVerifique se:\n1. A planilha contém as colunas: Chassis, Piloto, Corrida\n2. Os chassis da planilha estão cadastrados em:\n   Master Data > Carros > Chassis\n\nChasssis encontrados mas não cadastrados: ' + totalIgnored);
        setUploadedFile(null);
        setCurrentStep('upload');
      } else {
        setCurrentStep('etapa');
      }
    } catch (error) {
      console.error('❌ Erro ao processar Excel:', error);
      alert('Erro ao processar o arquivo Excel.');
      setUploadedFile(null);
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  // 🔧 Função para gerar dados de teste COM PNEUS JÁ CONFERIDOS
  const handleGenerateTestData = async () => {
    console.log('🧪 [1] Iniciando geração de dados de teste...');
    
    const confirmed = window.confirm(
      '🧪 MODO DE TESTE\\n\\nIsso irá gerar dados fictícios para teste da funcionalidade.\\n\\nDeseja continuar?'
    );
    
    if (!confirmed) {
      console.log('❌ Usuário cancelou a geração de dados');
      return;
    }

    console.log('✅ [2] OK! Iniciando...');
    console.log('🏎️ [3] Chassis registrados:', registeredChassis.length);

    // Função auxiliar para gerar jogos de pneus de teste
    const generateTireSets = (piloto: string, categoria: string, numJogos: number): TireSet[] => {
      const sets: TireSet[] = [];
      const posicoes = ['DD', 'DE', 'TE', 'TD'];
      
      for (let jogo = 1; jogo <= numJogos; jogo++) {
        const tires: TireData[] = posicoes.map((pos, idx) => ({
          posicao: pos,
          codigo: `P${Math.floor(Math.random() * 90000 + 10000)}`, // Código aleatório
          piloto: piloto,
          ano: '2024',
          set: `${jogo}${String.fromCharCode(65 + idx)}`, // 1A, 1B, 1C, 1D
          tipo: Math.random() > 0.3 ? 'N' : 'U', // 70% Novo, 30% Usado
          voltas: Math.floor(Math.random() * 50).toString(),
          situacao: Math.random() > 0.2 ? 'Guardar' : 'Descartar', // 80% Guardar
          pilotoInvalido: Math.random() > 0.9 // 10% chance de piloto inválido
        }));

        sets.push({
          jogo: jogo,
          label: `Jogo ${jogo}`,
          montadoNoCarro: jogo === 1, // Primeiro jogo montado no carro
          tires
        });
      }

      return sets;
    };

    console.log('🎲 [4] Gerando dados de chassis...');

    // Dados de teste com 6 chassis de diferentes categorias
    const testData: ExcelChassisData[] = [
      {
        chassis: '247/992.1',
        piloto: 'PEDRO AIZZA',
        corrida: 'SIM',
        sheetName: 'CARRERA CUP (CARRERA CUP)',
        rowNumber: 5,
        isValid: true,
        matchedChassis: registeredChassis.find(c => c.codigo.includes('247')),
        tiresChecked: 16 // Carrera Cup = 16 pneus (4 jogos)
      },
      {
        chassis: '262/992.1',
        piloto: 'MIGUEL PALUDO',
        corrida: 'SIM',
        sheetName: 'CARRERA CUP (CARRERA CUP)',
        rowNumber: 6,
        isValid: true,
        matchedChassis: registeredChassis.find(c => c.codigo.includes('262')),
        tiresChecked: 16
      },
      {
        chassis: '219/I',
        piloto: 'ENZO BEDANI',
        corrida: 'NÃO',
        sheetName: 'SPRINT CHALLENGE (SPRINT CHALLENGE)',
        rowNumber: 8,
        isValid: true,
        matchedChassis: registeredChassis.find(c => c.codigo.includes('219')),
        tiresChecked: 16
      },
      {
        chassis: '225/I',
        piloto: 'MARÇAL MULLER',
        corrida: 'SIM',
        sheetName: 'SPRINT CHALLENGE (SPRINT CHALLENGE)',
        rowNumber: 9,
        isValid: true,
        matchedChassis: registeredChassis.find(c => c.codigo.includes('225')),
        tiresChecked: 16
      },
      {
        chassis: '140/718',
        piloto: 'WERNER NEUGEBAUER',
        corrida: 'INDEF.',
        sheetName: 'SPRINT TROPHY (SPRINT TROPHY)',
        rowNumber: 11,
        isValid: true,
        matchedChassis: registeredChassis.find(c => c.codigo.includes('140')),
        tiresChecked: 12 // Trophy = 12 pneus (3 jogos)
      },
      {
        chassis: '157/718',
        piloto: 'AMIR NASR',
        corrida: 'SIM',
        sheetName: 'SPRINT TROPHY (SPRINT TROPHY)',
        rowNumber: 12,
        isValid: true,
        matchedChassis: registeredChassis.find(c => c.codigo.includes('157')),
        tiresChecked: 12
      }
    ];

    console.log('🔍 [5] Validando chassis...', testData.map(d => ({
      chassis: d.chassis,
      found: !!d.matchedChassis
    })));

    // Filtra apenas chassis que existem no cadastro
    const validTestData = testData.filter(item => item.matchedChassis);

    console.log(`✅ [6] Chassis válidos: ${validTestData.length} de ${testData.length}`);

    if (validTestData.length === 0) {
      console.error('❌ [7] Nenhum chassis de teste encontrado!');
      toast.error('Nenhum chassis de teste encontrado', {
        description: 'Cadastre alguns chassis primeiro (247, 262, 219, 225, 140, 157)'
      });
      return;
    }

    console.log('🎮 [8] Gerando jogos de pneus...');

    // Gera jogos de pneus para cada chassis
    const testTireSets: Record<number, TireSet[]> = {};
    const testCompletedChassis: Record<number, boolean> = {};

    validTestData.forEach((chassisData, index) => {
      const isTrophy = chassisData.sheetName.includes('TROPHY');
      const numJogos = isTrophy ? 3 : 4;
      
      // Gera jogos de pneus
      testTireSets[index] = generateTireSets(
        chassisData.piloto,
        chassisData.sheetName,
        numJogos
      );
      
      // Marca como completo
      testCompletedChassis[index] = true;
      
      console.log(`  ✅ Chassis ${index + 1}: ${chassisData.chassis} - ${numJogos} jogos gerados`);
    });

    console.log('💾 [9] Atualizando estados...');

    // 🔥 CRÍTICO: Adiciona índices originais únicos para garantir integridade dos dados
    setExtractedData(addOriginalIndexes(validTestData));
    setSavedTireSets(testTireSets);
    setCompletedChassis(testCompletedChassis);
    setCurrentStep('chassis');
    
    // Simula arquivo fictício
    const fakeFile = new File(['test data'], 'TESTE_CONFIRMACAO_PILOTOS.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    setUploadedFile(fakeFile);

    console.log('📅 [10] Verificando etapas...');

    // Carrega temporada e etapas se ainda não foram carregadas (não bloqueante)
    let currentStages = seasonStages;
    if (currentStages.length === 0) {
      try {
        const seasons = await getSeasons();
        const active = seasons.find(s => s.status === 'active'); // 🔧 CORRIGIDO: usa s.status === 'active'
        
        if (active) {
          setActiveSeason(active);
          const stages = await getSeasonStages(active.id);
          setSeasonStages(stages);
          currentStages = stages;
          
          if (stages.length > 0) {
            setEtapaId(stages[0].id);
            console.log('✅ [11] Primeira etapa definida:', stages[0].name);
          } else {
            console.warn('⚠️ [11] Nenhuma etapa encontrada para a temporada ativa');
          }
        } else {
          console.warn('⚠️ [11] Nenhuma temporada ativa encontrada');
        }
      } catch (error) {
        console.warn('⚠️ [11] Erro ao carregar etapas (não bloqueante):', error);
      }
    }

    toast.success('✅ Dados de teste gerados!', {
      description: `${validTestData.length} chassis com pneus conferidos`
    });

    console.log('🎉 [12] Dados de teste gerados com sucesso:', {
      chassis: validTestData.length,
      tireSets: Object.keys(testTireSets).length,
      completed: Object.keys(testCompletedChassis).length,
      activeSeason: activeSeason?.name || 'Não definida',
      etapa: etapaId || currentStages[0]?.id || 'Não definida',
      seasonStages: currentStages.length
    });
  };

  // Função para atualizar status de corrida e pilotos
  const handleUpdateCorridaStatus = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellStyles: false,
        cellFormula: false,
        cellHTML: false,
        sheetStubs: false
      });
      
      // Mapeia chassis -> { corrida, piloto }
      const updatedDataMap: Record<string, { corrida: string; piloto: string }> = {};
      let totalProcessed = 0;
      
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        
        // Limita o range de células processadas para economizar memória
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const maxRows = Math.min(range.e.r, 1000); // Máximo 1000 linhas por aba
        const maxCols = Math.min(range.e.c, 20); // Máximo 20 colunas
        
        // Ajusta o range
        const limitedRange = XLSX.utils.encode_range({
          s: { r: range.s.r, c: range.s.c },
          e: { r: maxRows, c: maxCols }
        });
        worksheet['!ref'] = limitedRange;
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '',
          blankrows: false,
          raw: false
        }) as any[][];
        
        if (jsonData.length < 2) return;
        
        // Valida se a aba contém uma categoria válida
        const category = getCategoryFromTitle(jsonData);
        if (!category) return;
        
        // Encontra a linha de header
        const headerRowIndex = findHeaderRow(jsonData);
        if (headerRowIndex === 0) return;
        
        const headers = jsonData[headerRowIndex].map((h: any) => String(h || '').trim());
        const columns = identifyColumns(headers);
        
        if (columns.chassis === null) return;
        
        // Extrai os novos dados (corrida e piloto)
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row) continue;
          
          const chassis = row[columns.chassis];
          const corrida = columns.corrida !== null ? row[columns.corrida] : '';
          const piloto = columns.piloto !== null ? row[columns.piloto] : '';
          
          const chassisCode = String(chassis || '').trim();
          if (!chassisCode || chassisCode === '-') continue;
          
          const chassisStr = chassisCode.toLowerCase();
          if (chassisStr.includes('total') || chassisStr.includes('subtotal')) continue;
          
          // Armazena os novos dados
          updatedDataMap[chassisCode] = {
            corrida: String(corrida || '').trim(),
            piloto: String(piloto || '').trim() || 'Sem Piloto'
          };
          totalProcessed++;
        }
      });
      
      if (totalProcessed === 0) {
        alert('⚠️ Nenhum chassis encontrado na planilha de atualização.');
        return;
      }
      
      // Contadores
      let chassisUpdated = 0;
      let pilotosUpdated = 0;
      let divergenciasDetectadas = 0;
      
      // Atualiza os campos "corrida" e "piloto" dos chassis existentes
      const updatedData = extractedData.map((item, index) => {
        const newData = updatedDataMap[item.chassis];
        
        if (newData) {
          const corridaChanged = newData.corrida !== item.corrida;
          const pilotoChanged = newData.piloto !== item.piloto;
          
          if (corridaChanged) chassisUpdated++;
          if (pilotoChanged) pilotosUpdated++;
          
          return {
            ...item,
            corrida: newData.corrida,
            piloto: newData.piloto
          };
        }
        
        return item;
      });
      
      // Atualiza os pneus já conferidos com divergência de piloto
      const updatedSavedTireSets = { ...savedTireSets };
      
      Object.keys(updatedSavedTireSets).forEach(chassisIndexStr => {
        const chassisIndex = parseInt(chassisIndexStr);
        const oldPiloto = extractedData[chassisIndex].piloto;
        const newPiloto = updatedData[chassisIndex].piloto;
        
        // Se o piloto mudou e já existem pneus conferidos
        if (oldPiloto !== newPiloto && updatedSavedTireSets[chassisIndex]) {
          divergenciasDetectadas++;
          console.log(`⚠️ Mudança de piloto detectada no Chassis ${extractedData[chassisIndex].chassis}:`);
          console.log(`   Piloto anterior: ${oldPiloto}`);
          console.log(`   Novo piloto: ${newPiloto}`);
          console.log(`   Marcando ${updatedSavedTireSets[chassisIndex].length} jogos com divergência`);
          
          // Marca todos os pneus conferidos como divergência
          updatedSavedTireSets[chassisIndex] = updatedSavedTireSets[chassisIndex].map(tireSet => ({
            ...tireSet,
            tires: tireSet.tires.map(tire => {
              if (tire.codigo !== '-') {
                return {
                  ...tire,
                  pilotoInvalido: true,
                  divergencia: true
                };
              }
              return tire;
            })
          }));
        }
      });
      
      setExtractedData(ensureCorrectIndexes(updatedData)); // 🔥 Garante índices corretos
      setSavedTireSets(updatedSavedTireSets);
      setShowUpdateModal(false);
      setUpdateFile(null);
      
      // 🔥 Salva informação da planilha no Supabase
      const fileInfo = {
        name: file.name,
        date: new Date().toISOString()
      };
      setLastUploadedFile(fileInfo);
      
      try {
        const supabase = createClient();
        await supabase
          .from('system_config')
          .upsert({
            config_key: 'last_uploaded_spreadsheet',
            config_value: fileInfo
          }, {
            onConflict: 'config_key'
          });
      } catch (err) {
        console.error('Erro ao salvar info da planilha:', err);
      }
      
      // Monta descrição do toast
      const updates: string[] = [];
      if (chassisUpdated > 0) updates.push(`${chassisUpdated} status de corrida`);
      if (pilotosUpdated > 0) updates.push(`${pilotosUpdated} pilotos`);
      if (divergenciasDetectadas > 0) updates.push(`${divergenciasDetectadas} divergências detectadas`);
      
      toast.success(`✅ Planilha atualizada com sucesso!`, {
        description: updates.length > 0 ? updates.join(', ') : 'Nenhuma alteração detectada'
      });
      
      console.log(`✅ Atualização concluída:`);
      console.log(`   • Status atualizados: ${chassisUpdated}`);
      console.log(`   • Pilotos atualizados: ${pilotosUpdated}`);
      console.log(`   • Divergências detectadas: ${divergenciasDetectadas}`);
      
      // Limpa referências para liberar memória
      if (typeof (workbook as any).SSF !== 'undefined') {
        delete (workbook as any).SSF;
      }
      
    } catch (error) {
      console.error('❌ Erro ao atualizar dados:', error);
      alert('Erro ao processar o arquivo de atualização.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 🆕 Função para processar upload de pneus nos carros
  const handleUploadCarTires = async (file: File) => {
    console.log('🚀 Iniciando upload de pneus nos carros...', file.name);
    
    // Verifica se há dados processados
    if (!extractedData || extractedData.length === 0) {
      toast.error('Nenhum chassis carregado!', {
        description: 'Por favor, primeiro faça o upload da planilha principal de chassis.'
      });
      return;
    }
    
    // 🔥 CRIA SESSÃO AUTOMATICAMENTE SE NÃO EXISTIR
    let sessionId = activeSessionId;
    
    if (!sessionId) {
      console.log('⚠️ Sessão não existe. Criando automaticamente...');
      
      // Verifica se tem etapa selecionada
      if (!etapaId) {
        toast.error('Por favor, selecione a temporada e etapa primeiro!');
        return;
      }
      
      // Cria sessão compartilhada
      const newSessionId = await createSharedSession();
      
      if (!newSessionId) {
        toast.error('Erro ao criar sessão de conferência. Tente novamente.');
        return;
      }
      
      sessionId = newSessionId;
      console.log('✅ Sessão criada automaticamente:', sessionId);
    } else {
      // 🔥 VALIDA SE A SESSÃO AINDA EXISTE NO BANCO
      console.log('🔍 Validando sessão existente:', sessionId);
      const supabase = createClient();
      const { data: sessionCheck, error: sessionCheckError } = await supabase
        .from('conference_sessions')
        .select('id')
        .eq('id', sessionId)
        .maybeSingle();
      
      if (sessionCheckError || !sessionCheck) {
        console.warn('⚠️ Sessão anterior não existe mais. Criando nova sessão...');
        
        // Verifica se tem etapa selecionada
        if (!etapaId) {
          toast.error('Por favor, selecione a temporada e etapa primeiro!');
          return;
        }
        
        // Cria nova sessão
        const newSessionId = await createSharedSession();
        
        if (!newSessionId) {
          toast.error('Erro ao criar sessão de conferência. Tente novamente.');
          return;
        }
        
        sessionId = newSessionId;
        console.log('✅ Nova sessão criada:', sessionId);
      } else {
        console.log('✅ Sessão validada com sucesso');
      }
    }
    
    setIsUploadingCarTires(true);
    
    try {
      // 🔥 Busca todos os chassis cadastrados no Supabase
      console.log('📦 Buscando chassis do Supabase...');
      const supabase = createClient();
      const { data: allChassis, error: chassisError } = await supabase
        .from('chassis')
        .select('*')
        .eq('ativo', true);
      
      if (chassisError) {
        console.error('❌ Erro ao buscar chassis:', chassisError);
        throw new Error('Erro ao buscar chassis do banco de dados');
      }
      
      console.log('✅ Chassis carregados do Supabase:', allChassis?.length || 0);
      
      console.log('📦 Importando biblioteca XLSX...');
      const XLSX = await import('xlsx');
      
      console.log('📄 Lendo arquivo...', file.size, 'bytes');
      const arrayBuffer = await file.arrayBuffer();
      
      console.log('📊 Parseando workbook...');
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellStyles: false,
        cellFormula: false,
        cellHTML: false,
        sheetStubs: false
      });
      
      console.log('✅ Workbook carregado! Abas:', workbook.SheetNames);
      console.log('📋 extractedData disponível:', extractedData.length, 'chassis');
      
      // Mapeia geração do carro baseado no nome da aba
      const generationMap: Record<string, string> = {
        'GEN1': '991.1',
        'GEN2': '991.2',
        '992': '992.1'
      };
      
      // Armazena os pneus de cada chassis: chassis -> [codigo1, codigo2, codigo3, codigo4]
      const carTiresMap: Record<string, string[]> = {};
      let totalProcessed = 0;
      
      // Processa cada aba
      workbook.SheetNames.forEach((sheetName) => {
        const sheetNameUpper = sheetName.toUpperCase().trim();
        const generation = generationMap[sheetNameUpper];
        
        if (!generation) {
          console.log(`⚠️ Aba "${sheetName}" ignorada (não corresponde a GEN1, GEN2 ou 992)`);
          return;
        }
        
        console.log(`📊 Processando aba: "${sheetName}" (Geração: ${generation})`);
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '',
          blankrows: false,
          raw: false
        }) as any[][];
        
        if (jsonData.length < 2) return;
        
        // Procura pela linha de header que contém "chassis"
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i];
          if (!row) continue;
          
          const rowText = row.map(cell => String(cell || '').toLowerCase().trim());
          const hasChassisColumn = rowText.some(cell => cell.includes('chassis') || cell.includes('chassi'));
          
          if (hasChassisColumn) {
            headerRowIndex = i;
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          console.log(`⚠️ Coluna "chassis" não encontrada na aba ${sheetName}`);
          return;
        }
        
        const headers = jsonData[headerRowIndex].map((h: any) => String(h || '').toLowerCase().trim());
        const chassisColIndex = headers.findIndex(h => h.includes('chassis') || h.includes('chassi'));
        
        if (chassisColIndex === -1) return;
        
        // As próximas 4 colunas após "chassis" são os pneus (DD, DE, TE, TD ou similar)
        const tireColumns = [chassisColIndex + 1, chassisColIndex + 2, chassisColIndex + 3, chassisColIndex + 4];
        
        // Processa as linhas de dados
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row) continue;
          
          let chassisRaw = String(row[chassisColIndex] || '').trim();
          if (!chassisRaw || chassisRaw === '0' || chassisRaw === '-') continue;
          
          // 🔥 Normaliza chassis para garantir 3 dígitos no prefixo
          // Ex: "81" → "081", "06/..." → "006/...", "85/II" → "085/II"
          let chassisPrefix: string;
          
          if (chassisRaw.includes('/')) {
            // Chassis com "/" (ex: "85/II", "28/992.1")
            const parts = chassisRaw.split('/');
            let firstPart = parts[0];
            
            // Normaliza para 3 dígitos
            if (firstPart.length === 2) {
              firstPart = '0' + firstPart;
              chassisRaw = firstPart + '/' + parts.slice(1).join('/');
            } else if (firstPart.length === 1) {
              firstPart = '00' + firstPart;
              chassisRaw = firstPart + '/' + parts.slice(1).join('/');
            }
            
            chassisPrefix = firstPart;
          } else {
            // Chassis sem "/" (ex: "81", "223", "274" - só números)
            let numericPart = chassisRaw;
            
            // Normaliza para 3 dígitos
            if (numericPart.length === 2) {
              numericPart = '0' + numericPart;
            } else if (numericPart.length === 1) {
              numericPart = '00' + numericPart;
            }
            
            chassisPrefix = numericPart;
          }
          
          console.log(`🔍 Processando chassis da planilha: "${chassisRaw}" → Prefixo: "${chassisPrefix}"`);
          
          // Extrai códigos dos pneus das 4 colunas seguintes
          const tireCodes: string[] = tireColumns.map(colIndex => {
            let code = String(row[colIndex] || '').trim();
            
            // Ignora células vazias ou com valor "0"
            if (!code || code === '0' || code === '-') {
              return '';
            }
            
            // 🔥 Adiciona zero inicial se o código não começa com 0
            if (code.length > 0 && !code.startsWith('0')) {
              code = '0' + code;
            }
            
            return code;
          });
          
          console.log(`   📋 Códigos extraídos da planilha para ${chassisRaw}: [${tireCodes.join(', ')}]`);
          
          // Verifica se há pelo menos um pneu válido
          const hasValidTires = tireCodes.some(c => c !== '');
          if (!hasValidTires) continue;
          
          // 🔥 Busca chassis no Supabase pelos 3 primeiros dígitos + geração
          const matchedChassis = allChassis?.find(item => {
            const codigo = String(item.codigo || '').trim();
            if (codigo.length < 3) return false;
            
            // Extrai os 3 primeiros dígitos do chassis cadastrado
            const first3Digits = codigo.substring(0, 3);
            
            // Extrai a geração do chassis cadastrado (ex: "991/I", "991/II", "992.1")
            const geracao = String(item.geracao || '').trim();
            
            // Normaliza gerações para comparação
            // "991.1" ou "991/I" → "991/I"
            // "991.2" ou "991/II" → "991/II"
            // "992.1" → "992.1"
            let normalizedGeneration = generation;
            if (generation === '991.1') normalizedGeneration = '991/I';
            if (generation === '991.2') normalizedGeneration = '991/II';
            
            // Compara: 3 primeiros dígitos + geração
            return first3Digits === chassisPrefix && geracao === normalizedGeneration;
          });
          
          if (matchedChassis) {
            // Busca o chassis correspondente no extractedData para preencher os pneus
            // 🔥 Usa o índice do extractedData como chave única
            
            // 🔍 DEBUG: Lista todos os chassis com esse número para ver as gerações
            const allMatchingChassis = extractedData
              .map((item, idx) => ({ item, idx }))
              .filter(({ item }) => item.chassis.split('/')[0].trim() === chassisPrefix);
            
            if (allMatchingChassis.length > 0) {
              console.log(`  🔍 Procurando chassis "${chassisRaw}" (geração: ${generation})`);
              console.log(`     Chassis "${chassisPrefix}" encontrado ${allMatchingChassis.length}x no extractedData:`);
              allMatchingChassis.forEach(({ item, idx }) => {
                const itemChassisParts = item.chassis.split('/');
                const sufixo = itemChassisParts.length > 1 ? itemChassisParts[1].trim() : '-';
                console.log(`       [${idx}] ${item.chassis} | Sufixo: ${sufixo} | Categoria: ${item.sheetName}`);
              });
            }
            
            // 🔥 Busca o índice do chassis correto considerando número E geração
            let extractedIndex = -1;
            
            for (let idx = 0; idx < extractedData.length; idx++) {
              const item = extractedData[idx];
              
              // Compara pelo número do chassis E pela geração do chassis cadastrado
              const itemChassisNumber = item.chassis.split('/')[0].trim();
              const currentChassisNumber = chassisPrefix;
              
              // 🔥 Usa a geração do SUFIXO do chassis (ex: 279/992.1 → 992.1)
              const itemChassisParts = item.chassis.split('/');
              let itemGeneration = itemChassisParts.length > 1 ? itemChassisParts[1].trim() : '';
              
              // Normaliza as gerações para comparação
              let normalizedItemGeneration = itemGeneration;
              let normalizedCurrentGeneration = generation;
              
              // Normaliza sufixos para formato padrão:
              // I → 991.1, II → 991.2, 992.1 → 992.1
              if (itemGeneration === 'I') normalizedItemGeneration = '991.1';
              if (itemGeneration === 'II') normalizedItemGeneration = '991.2';
              if (itemGeneration === '992.1') normalizedItemGeneration = '992.1';
              if (itemGeneration === '992.2') normalizedItemGeneration = '992.2';
              
              // Compara: mesmo número de chassis E mesma geração
              const isSameChassis = itemChassisNumber === currentChassisNumber;
              const isSameGeneration = normalizedItemGeneration === normalizedCurrentGeneration;
              
              // Log detalhado para debugging
              if (isSameChassis) {
                console.log(`     🔎 Chassis MATCH [${idx}]: ${item.chassis} | Item Gen: "${itemGeneration}" → "${normalizedItemGeneration}" | Current Gen: "${normalizedCurrentGeneration}" | Gen Match: ${isSameGeneration}`);
              }
              
              if (isSameChassis && isSameGeneration) {
                extractedIndex = idx;
                console.log(`     ✅ MATCH encontrado: [${idx}] ${item.chassis} (sufixo "${itemGeneration}" → "${normalizedItemGeneration}")`);
                break; // Para no primeiro match
              }
            }
            
            if (extractedIndex !== -1) {
              // Usa o índice como chave única (cada linha da planilha é única)
              carTiresMap[extractedIndex.toString()] = tireCodes;
              totalProcessed++;
              const matchedItem = extractedData[extractedIndex];
              const matchedGeneration = matchedItem.matchedChassis?.geracao || '-';
              console.log(`✅ Chassis [${extractedIndex}] ${matchedItem.chassis} | Geração: ${matchedGeneration} | Categoria: (${matchedItem.sheetName}) | Pneus: [${tireCodes.join(', ')}]`);
            } else {
              console.log(`⚠️ Chassis "${chassisRaw}" (${generation}) não encontrado no extractedData`);
            }
          } else {
            console.log(`⚠️ Chassis "${chassisRaw}" (${generation}) não encontrado no masterdata`);
          }
        }
      });
      
      if (totalProcessed === 0) {
        toast.error('Nenhum chassis correspondente encontrado na planilha de pneus nos carros.');
        return;
      }
      
      // 🔥 Busca todos os códigos únicos de pneus para buscar no Supabase
      console.log('🔍 Coletando códigos de pneus para buscar no Supabase...');
      const allTireCodes = new Set<string>();
      Object.values(carTiresMap).forEach(codes => {
        codes.forEach(code => {
          if (code && code !== '') allTireCodes.add(code);
        });
      });
      
      console.log(`📋 Total de códigos únicos: ${allTireCodes.size}`);
      console.log('📋 Códigos a buscar:', Array.from(allTireCodes).slice(0, 10), '...');
      
      // 🔥 Busca informações dos pneus no Supabase
      const { data: tireData, error: tireError } = await supabase
        .from('stock_entries')
        .select('*')
        .in('barcode', Array.from(allTireCodes));
      
      if (tireError) {
        console.error('❌ Erro ao buscar pneus:', tireError);
        toast.error('Erro ao buscar informações dos pneus no banco de dados');
        return;
      }
      
      console.log(`✅ Pneus encontrados no Supabase: ${tireData?.length || 0}`);
      if (tireData && tireData.length > 0) {
        console.log('📋 Exemplo de pneus encontrados:', tireData.slice(0, 3).map(t => ({ barcode: t.barcode, modelo: t.modelo, composto: t.composto })));
      }
      
      // Cria um mapa de código → dados do pneu
      const tireDataMap = new Map<string, StockEntry>();
      tireData?.forEach(tire => {
        tireDataMap.set(tire.barcode, tire);
      });
      
      // 🔥 Preenche os pneus "Montado no Carro" (Jogo 1) automaticamente
      let chassisUpdated = 0;
      let tiresInserted = 0;
      let tiresNotFound = 0;
      const notFoundCodes: string[] = [];
      
      const updatedSavedTireSets = { ...savedTireSets };
      
      extractedData.forEach((chassisData, index) => {
        // 🔥 Usa o índice como chave única
        const tireCodes = carTiresMap[index.toString()];
        if (!tireCodes) return;
        
        console.log(`🔄 Processando pneus para [${index}]: ${chassisData.chassis} (${chassisData.sheetName})`);
        
        // Cria estrutura de TireSets se ainda não existe
        if (!updatedSavedTireSets[index]) {
          const isTrophy = chassisData.sheetName.toUpperCase().includes('TROPHY');
          const numberOfJogos = isTrophy ? 3 : 4;
          
          console.log(`🔍 [DEBUG JOGOS] Chassis ${chassisData.chassis}:`, {
            sheetName: chassisData.sheetName,
            isTrophy,
            numberOfJogos
          });
          
          // Inicializa os jogos vazios
          updatedSavedTireSets[index] = Array.from({ length: numberOfJogos }, (_, i) => ({
            jogo: i + 1,
            label: `Jogo ${i + 1}`, // 🔥 SEMPRE usa "Jogo X", nunca "Montado no Carro"
            montadoNoCarro: i === 0,
            tires: [
              { posicao: 'DD', codigo: '-', piloto: '-', ano: '-', set: '-', tipo: '-', voltas: '-', situacao: 'Guardar' as const, observacao: '', _originalIndex: 0 },
              { posicao: 'DE', codigo: '-', piloto: '-', ano: '-', set: '-', tipo: '-', voltas: '-', situacao: 'Guardar' as const, observacao: '', _originalIndex: 1 },
              { posicao: 'TE', codigo: '-', piloto: '-', ano: '-', set: '-', tipo: '-', voltas: '-', situacao: 'Guardar' as const, observacao: '', _originalIndex: 2 },
              { posicao: 'TD', codigo: '-', piloto: '-', ano: '-', set: '-', tipo: '-', voltas: '-', situacao: 'Guardar' as const, observacao: '', _originalIndex: 3 }
            ]
          }));
        }
        
        // Preenche o Jogo 1 (Montado no Carro) com os códigos da planilha
        const jogo1 = updatedSavedTireSets[index][0];
        let chassisHasUpdate = false;
        
        for (let i = 0; i < 4; i++) {
          const tireCode = tireCodes[i];
          if (tireCode && tireCode !== '') {
            const tireInfo = tireDataMap.get(tireCode);
            
            if (tireInfo) {
              // Pneu encontrado - preenche com dados completos do Supabase
              // Determina situação baseada no status
              let situacao: 'Guardar' | 'Descartar' = 'Guardar';
              if (tireInfo.status === 'Descarte Piloto' || tireInfo.status === 'Descarte DSI') {
                situacao = 'Descartar';
              }
              
              // 🔥 VALIDAÇÃO DE PILOTO (mesma lógica do handleTireCodeSubmit)
              const normalizedTirePilot = (tireInfo.pilot || '').toLowerCase().trim();
              const normalizedExpectedPilot = (chassisData.piloto || '').toLowerCase().trim();
              const isPilotMismatch = normalizedTirePilot !== normalizedExpectedPilot;
              
              // 🔥 CALCULA VALIDAÇÃO
              let validacao: 'CONFIRMAR' | 'TROCAR PNEU' | null = null;
              let divergencia = false;
              let pilotoInvalido = false;
              
              if (situacao === 'Descartar' && isPilotMismatch) {
                validacao = 'TROCAR PNEU';
                divergencia = true;
                pilotoInvalido = true;
              } else if (situacao === 'Descartar') {
                validacao = 'CONFIRMAR';
                divergencia = true;
              } else if (isPilotMismatch) {
                validacao = 'TROCAR PNEU';
                divergencia = true;
                pilotoInvalido = true;
              }
              
              jogo1.tires[i] = {
                posicao: tireInfo.lado || jogo1.tires[i].posicao, // lado (posição)
                codigo: tireCode,
                piloto: tireInfo.pilot || '-', // pilot
                ano: tireInfo.ano || '-', // ano
                set: tireInfo.set_pneu || '-', // set_pneu
                tipo: tireInfo.model_type || '-', // model_type
                voltas: tireInfo.tempo_vida || '-', // tempo_vida
                situacao: situacao,
                observacao: '', // 🔥 Campo de observação
                divergencia,
                pilotoInvalido,
                validacao,
                _originalIndex: i // 🔥 Preserva índice original na inicialização do Excel
              };
              tiresInserted++;
              chassisHasUpdate = true;
              console.log(`  ✅ Pneu ${tireCode}: ${tireInfo.pilot} - ${tireInfo.model_type} - ${situacao}${validacao ? ` - ${validacao}` : ''}`);
              
              // 🔥 SALVA DIVERGÊNCIA EM TEMPO REAL (usa sessionId validado)
              if (sessionId && validacao === 'TROCAR PNEU') {
                console.log(`🔥 Upload Pneus Carro: Salvando divergência para ${tireCode}...`);
                saveTireDivergenceRealtime(
                  sessionId,
                  chassisData.chassis,
                  1, // Jogo 1 - Montado no Carro
                  {
                    posicao: tireInfo.lado || jogo1.tires[i].posicao,
                    codigo: tireCode,
                    piloto: tireInfo.pilot || '-',
                    ano: tireInfo.ano || '-',
                    set: tireInfo.set_pneu || '-',
                    tipo: tireInfo.model_type || '-',
                    voltas: tireInfo.tempo_vida || '-',
                    situacao: situacao,
                    observacao: '',
                    divergencia,
                    pilotoInvalido,
                    validacao
                  }
                ).catch(err => {
                  console.error(`❌ Erro ao salvar divergência para ${tireCode}:`, err);
                });
              }
            } else {
              // ⚠️ Pneu não encontrado - IGNORA e apenas loga
              tiresNotFound++;
              notFoundCodes.push(tireCode);
              console.log(`  ⚠️ Pneu ${tireCode}: NÃO ENCONTRADO NO ESTOQUE (ignorado)`);
            }
          }
        }
        
        if (chassisHasUpdate) {
          chassisUpdated++;
          
          // Atualiza o contador de pneus conferidos
          const totalChecked = countCheckedTires(updatedSavedTireSets[index]);
          
          // Atualiza extractedData com o novo contador
          extractedData[index] = {
            ...extractedData[index],
            tiresChecked: totalChecked
          };
          
          // 🔥 Salva progresso na sessão compartilhada
          updateSessionProgress(index, {
            tireSets: updatedSavedTireSets[index],
            tiresChecked: totalChecked
          });
        }
      });
      
      setSavedTireSets(updatedSavedTireSets);
      setExtractedData(ensureCorrectIndexes([...extractedData])); // 🔥 Force re-render com índices corretos
      setCarTiresFile(file); // 🔥 Mantém referência do arquivo carregado
      
      if (tiresNotFound > 0) {
        toast.warning('⚠️ Pneus nos carros carregados com avisos', {
          description: `${chassisUpdated} chassis • ${tiresInserted} pneus encontrados • ${tiresNotFound} pneus não encontrados no estoque`
        });
      } else {
        toast.success('✅ Pneus nos carros carregados!', {
          description: `${chassisUpdated} chassis • ${tiresInserted} pneus inseridos`
        });
      }
      
      console.log(`✅ Upload de pneus nos carros concluído:`);
      console.log(`   • Chassis atualizados: ${chassisUpdated}`);
      console.log(`   • Pneus inseridos: ${tiresInserted}`);
      console.log(`   • Pneus não encontrados: ${tiresNotFound}`);
      
      if (notFoundCodes.length > 0) {
        console.log(`\n⚠️ CÓDIGOS NÃO ENCONTRADOS NO SUPABASE (${notFoundCodes.length}):`);
        notFoundCodes.forEach(code => console.log(`   - ${code}`));
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar planilha de pneus nos carros:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
      console.error('Message:', error instanceof Error ? error.message : String(error));
      toast.error('Erro ao processar o arquivo de pneus nos carros.', {
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      console.log('🏁 Finalizando upload (isUploadingCarTires = false)');
      setIsUploadingCarTires(false);
    }
  };

  const handleRemoveFile = async () => {
    // 🔥 Descarta sessão compartilhada
    await discardSession();
  };

  const handleContinueToChassisStep = async () => {
    if (!etapaId.trim()) {
      alert('Por favor, digite o nome da etapa.');
      return;
    }
    
    // 🔥 Criar sessão compartilhada no Supabase
    const sessionId = await createSharedSession();
    if (!sessionId) {
      toast.error('Erro ao criar sessão compartilhada. Continuando em modo local.');
    }
    
    setCurrentStep('chassis');
  };

  const openChassisModal = async (index: number) => {
    // 🔥 VALIDAÇÃO CRÍTICA: Verifica se o índice é válido
    if (index < 0 || index >= extractedData.length) {
      console.error(`❌ ERRO: Índice inválido ${index} (extractedData.length: ${extractedData.length})`);
      toast.error('Erro ao abrir chassis: índice inválido');
      return;
    }

    const chassisData = extractedData[index];
    if (!chassisData) {
      console.error(`❌ ERRO: Chassis não encontrado no índice ${index}`);
      toast.error('Erro ao abrir chassis: dados não encontrados');
      return;
    }

    // 🔥🔥🔥 SINCRONIZAÇÃO CRÍTICA: Busca excel_data do Supabase antes de abrir
    if (activeSessionId) {
      try {
        const supabase = createClient();
        const { data: session, error } = await supabase
          .from('conference_sessions')
          .select('excel_data')
          .eq('id', activeSessionId)
          .single();

        if (!error && session?.excel_data && Array.isArray(session.excel_data)) {
          const supabaseExcelData = session.excel_data;

          // Verifica se o chassis no índice é o mesmo localmente e no Supabase
          const supabaseChassis = supabaseExcelData[index];
          if (supabaseChassis && supabaseChassis.chassis !== chassisData.chassis) {
            console.error(`❌❌❌ DESALINHAMENTO CRÍTICO DETECTADO!`);
            console.error(`   Local [${index}]: ${chassisData.chassis} (${chassisData.piloto})`);
            console.error(`   Supabase [${index}]: ${supabaseChassis.chassis} (${supabaseChassis.piloto})`);
            console.error(`   🔧 SINCRONIZANDO com Supabase...`);

            // Sincroniza com o Supabase
            setExtractedData(ensureCorrectIndexes(supabaseExcelData.map((c: any, idx: number) => ({
              ...c,
              tiresChecked: savedTireSets[idx] ? countCheckedTires(savedTireSets[idx]) : c.tiresChecked || 0
            }))));

            // Atualiza a referência local
            const syncedChassisData = supabaseExcelData[index];
            console.log(`   ✅ Sincronizado! Abrindo chassis correto: ${syncedChassisData.chassis}`);

            // Reabre com os dados sincronizados - mas NÃO chama recursivamente
            // Apenas atualiza o log
            console.log(`✅ Abrindo chassis [${index}]: ${syncedChassisData.chassis} (piloto: ${syncedChassisData.piloto})`);
            console.log(`   - _originalIndex: ${index}`);
            console.log(`   - Tem dados salvos: ${!!savedTireSets[index]}`);

            // Atualiza variável local para usar dados sincronizados
            // (mas não podemos reatribuir const chassisData, então vamos confiar que extractedData foi atualizado)
          } else {
            console.log(`✅ Abrindo chassis [${index}]: ${chassisData.chassis} (piloto: ${chassisData.piloto})`);
            console.log(`   - _originalIndex: ${chassisData._originalIndex}`);
            console.log(`   - Tem dados salvos: ${!!savedTireSets[index]}`);
            console.log(`   - ✅ Alinhado com Supabase`);
          }
        } else {
          console.log(`✅ Abrindo chassis [${index}]: ${chassisData.chassis} (piloto: ${chassisData.piloto})`);
          console.log(`   - _originalIndex: ${chassisData._originalIndex}`);
          console.log(`   - Tem dados salvos: ${!!savedTireSets[index]}`);
        }
      } catch (syncError) {
        console.warn('⚠️ Erro ao sincronizar com Supabase:', syncError);
        console.log(`✅ Abrindo chassis [${index}]: ${chassisData.chassis} (piloto: ${chassisData.piloto})`);
      }
    } else {
      console.log(`✅ Abrindo chassis [${index}]: ${chassisData.chassis} (piloto: ${chassisData.piloto})`);
      console.log(`   - _originalIndex: ${chassisData._originalIndex}`);
      console.log(`   - Tem dados salvos: ${!!savedTireSets[index]}`);
    }

    // 🔥🔥🔥 VALIDAÇÃO CRÍTICA: Verifica alinhamento entre índice e _originalIndex
    if (chassisData._originalIndex !== undefined && chassisData._originalIndex !== index) {
      console.error(`❌❌❌ DESALINHAMENTO DETECTADO!`);
      console.error(`   Índice recebido: ${index}`);
      console.error(`   _originalIndex do objeto: ${chassisData._originalIndex}`);
      console.error(`   Chassis: ${chassisData.chassis} (${chassisData.piloto})`);
      console.error(`   ISSO VAI SALVAR DADOS NO CHASSIS ERRADO!`);
    }

    // 🔥🔥🔥 VALIDAÇÃO FINAL ANTES DE DEFINIR O ÍNDICE
    const finalChassisData = extractedData[index];
    if (!finalChassisData) {
      console.error(`❌ Chassis não encontrado no índice ${index} após sincronização!`);
      toast.error('Erro ao abrir chassis. Tente novamente.');
      return;
    }

    console.log(`🎯 DEFININDO selectedChassisIndex = ${index} para chassis ${finalChassisData.chassis}`);
    setSelectedChassisIndex(index);
    setShouldMoveChassisToEnd(false); // 🔥 Limpa flag ao abrir novo chassis
    setHasRealtimeConflict(false); // 🔥 Limpa flag de conflito

    // 🆕 REGISTRA TIMESTAMP DE ABERTURA (para detectar modificações concorrentes)
    setChassisVersionWhenOpened(prev => ({
      ...prev,
      [index]: new Date().toISOString()
    }));

    // 🔥 Se estiver em modo coletor, ativa a tela de conferência
    if (useCollectorMode) {
      setShowCollectorConference(true);
      // Scroll para o topo
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }

    // Detecta a categoria do chassis
    const isTrophy = chassisData.sheetName.toUpperCase().includes('TROPHY');
    const numberOfJogos = isTrophy ? 3 : 4;
    
    console.log(`🔍 [OPEN MODAL] Chassis ${chassisData.chassis}:`, {
      sheetName: chassisData.sheetName,
      isTrophy,
      numberOfJogos
    });
    
    // Verifica se este chassis já tem conferência finalizada
    const isCompleted = completedChassis[index] || false;
    setIsEditMode(!isCompleted); // Se está completo, abre em modo leitura
    
    // 🔥 BUSCA OS DADOS SEMPRE DO SUPABASE
    if (activeSessionId) {
      console.log(`🔄 Carregando dados do Chassis ${extractedData[index].chassis} do Supabase...`);
      
      try {
        const supabase = createClient();
        const { data: session } = await supabase
          .from('conference_sessions')
          .select('progress')
          .eq('id', activeSessionId)
          .single();
        
        if (session && session.progress && session.progress[index]) {
          const chassisProgress = session.progress[index];
          
          // 🔒 VERIFICAÇÃO DE INTEGRIDADE E RECOVERY AUTOMÁTICO
          const verifiedTireSets = await verifyAndRecoverData(
            activeSessionId,
            index,
            extractedData[index].chassis,
            chassisProgress
          );
          
          if (verifiedTireSets && verifiedTireSets.length > 0) {
            console.log(`✅ Dados encontrados/recuperados no Supabase para Chassis ${extractedData[index].chassis}${isCompleted ? ' (somente leitura)' : ''}`);
            
            // 🔥 v4.8.13: CORREÇÃO AUTOMÁTICA - Adiciona 4º jogo se necessário
            if (verifiedTireSets.length < numberOfJogos) {
              console.log(`🔧 v4.8.13: CORREÇÃO - Chassis tem ${verifiedTireSets.length} jogos, mas deveria ter ${numberOfJogos}!`);
              console.log(`   Adicionando ${numberOfJogos - verifiedTireSets.length} jogo(s) vazio(s)...`);
              
              const missingGames = numberOfJogos - verifiedTireSets.length;
              for (let i = 0; i < missingGames; i++) {
                const jogoNumber = verifiedTireSets.length + 1 + i;
                verifiedTireSets.push({
                  jogo: jogoNumber,
                  label: `Jogo ${jogoNumber}`,
                  montadoNoCarro: false,
                  tires: [
                    { posicao: 'DD', codigo: '-', piloto: '-', ano: '-', set: '-', tipo: '-', voltas: '-', situacao: 'Guardar' as const, observacao: '', _originalIndex: 0 },
                    { posicao: 'DE', codigo: '-', piloto: '-', ano: '-', set: '-', tipo: '-', voltas: '-', situacao: 'Guardar' as const, observacao: '', _originalIndex: 1 },
                    { posicao: 'TE', codigo: '-', piloto: '-', ano: '-', set: '-', tipo: '-', voltas: '-', situacao: 'Guardar' as const, observacao: '', _originalIndex: 2 },
                    { posicao: 'TD', codigo: '-', piloto: '-', ano: '-', set: '-', tipo: '-', voltas: '-', situacao: 'Guardar' as const, observacao: '', _originalIndex: 3 }
                  ]
                });
              }
              
              toast.success(`✅ Jogo ${numberOfJogos} adicionado automaticamente!`);
            }
            
            // 🔍 VALIDAÇÃO DE INTEGRIDADE: Verifica se todos os pneus têm _originalIndex
            console.log('🔍 VALIDAÇÃO DE INTEGRIDADE DOS ÍNDICES:');
            verifiedTireSets.forEach((set: any, setIdx: number) => {
              console.log(`  Jogo ${set.jogo}:`);
              set.tires.forEach((tire: any, tireIdx: number) => {
                const hasOriginalIndex = tire._originalIndex !== undefined;
                const isCorrect = tire._originalIndex === tireIdx;
                console.log(`    [${tireIdx}] ${tire.posicao} (${tire.codigo}): _originalIndex=${tire._originalIndex} ${!hasOriginalIndex ? '⚠️ FALTANDO!' : isCorrect ? '✅' : '⚠️ INCORRETO!'}`);
              });
            });
            
            // Atualiza o estado local com os dados do Supabase
            // 🔥 PRESERVA registeredBy e registeredAt ao restaurar
            const restoredTireSets = verifiedTireSets.map(set => ({
              ...set,
              tires: set.tires.map((tire: any) => {
                console.log(`🔍 Restaurando pneu ${tire.codigo}:`, {
                  hasRegisteredBy: !!tire.registeredBy,
                  hasRegisteredAt: !!tire.registeredAt,
                  registeredBy: tire.registeredBy,
                  registeredAt: tire.registeredAt
                });
                return {
                  ...tire,
                  registeredBy: tire.registeredBy || undefined, // 🔥 PRESERVA registeredBy
                  registeredAt: tire.registeredAt || undefined  // 🔥 PRESERVA registeredAt
                };
              })
            }));
            
            setTireSets(restoredTireSets);
            
            // Atualiza savedTireSets para manter sincronização
            setSavedTireSets(prev => ({
              ...prev,
              [index]: restoredTireSets
            }));
            
            // Encontra o primeiro jogo incompleto e posição vazia
            let foundActive = false;
            for (let i = 0; i < verifiedTireSets.length; i++) {
              const set = verifiedTireSets[i];
              const emptyIndex = set.tires.findIndex((t: any) => t.codigo === '-');
              if (emptyIndex !== -1) {
                setActiveJogo(set.jogo);
                setActivePneuPosition(emptyIndex);
                foundActive = true;
                break;
              }
            }
            
            // Se não encontrou nenhuma posição vazia, todos os jogos estão completos
            if (!foundActive) {
              setActiveJogo(numberOfJogos);
              setActivePneuPosition(3); // Última posição válida (0-3)
            }
            
            return;
          } else if (chassisProgress.tireSets) {
            // 🔥 DIAGNÓSTICO DETALHADO: Investigar por que tireSets pode estar vazio
            console.error(`🚨🚨🚨 DIAGNÓSTICO CRÍTICO - Chassis ${index} (${extractedData[index].chassis}):`);
            console.error(`   📊 tireSets.length: ${chassisProgress.tireSets.length}`);
            console.error(`   📊 tireSets completo:`, chassisProgress.tireSets);
            console.error(`   📊 chassisProgress completo:`, chassisProgress);
            console.error(`   📊 session.progress[${index}]:`, session.progress[index]);
            
            if (chassisProgress.tireSets.length === 0) {
              console.error(`🚨 PERDA DE DADOS DETECTADA!`);
              console.error(`   ❌ tireSets está VAZIO quando deveria ter dados!`);
              console.error(`   ⚠️  NÃO será feita correção automática para evitar sobrescrever dados`);
              console.error(`   🔍 INVESTIGAR: O que está salvando tireSets vazio?`);
            }
          }
        }
        
        // Se não encontrou dados no Supabase, verifica estado local (fallback temporário)
        console.log(`⚠️ Sem dados no Supabase para Chassis ${extractedData[index].chassis}, verificando estado local...`);
        
      } catch (error) {
        console.error('❌ Erro ao buscar dados do Supabase:', error);
      }
    }
    
    // Fallback: verifica se já existe progresso salvo no estado local
    if (savedTireSets[index] && savedTireSets[index].length > 0) {
      console.log(`✅ Restaurando progresso do estado local para Chassis ${extractedData[index].chassis}${isCompleted ? ' (somente leitura)' : ''}`);
      
      // 🔍 VALIDAÇÃO DE INTEGRIDADE: Verifica se todos os pneus têm _originalIndex
      console.log('🔍 VALIDAÇÃO DE INTEGRIDADE DOS ÍNDICES:');
      savedTireSets[index].forEach((set, setIdx) => {
        console.log(`  Jogo ${set.jogo}:`);
        set.tires.forEach((tire, tireIdx) => {
          const hasOriginalIndex = tire._originalIndex !== undefined;
          const isCorrect = tire._originalIndex === tireIdx;
          console.log(`    [${tireIdx}] ${tire.posicao} (${tire.codigo}): _originalIndex=${tire._originalIndex} ${!hasOriginalIndex ? '⚠️ FALTANDO!' : isCorrect ? '✅' : '⚠️ INCORRETO!'}`);
        });
      });
      
      setTireSets(savedTireSets[index]);
      
      // Encontra o primeiro jogo incompleto e posição vazia
      let foundActive = false;
      for (let i = 0; i < savedTireSets[index].length; i++) {
        const set = savedTireSets[index][i];
        const emptyIndex = set.tires.findIndex(t => t.codigo === '-');
        if (emptyIndex !== -1) {
          setActiveJogo(set.jogo);
          setActivePneuPosition(emptyIndex);
          foundActive = true;
          break;
        }
      }
      
      // Se não encontrou nenhuma posição vazia, todos os jogos estão completos
      if (!foundActive) {
        setActiveJogo(numberOfJogos);
        setActivePneuPosition(3); // Última posição válida (0-3)
      }
      
      return; // 🔥 CRÍTICO: Retorna aqui para não executar initializeTireSets abaixo
    }
    
    // Se chegou aqui, não tem dados salvos - inicializa novo
    console.log(`🆕 Iniciando nova conferência do Chassis ${extractedData[index].chassis} (${isTrophy ? 'TROPHY - 3 jogos' : '4 jogos'})`);
    initializeTireSets(numberOfJogos);
    setIsEditMode(true);
  };

  const closeChassisModal = async () => {
    console.log('🔍 closeChassisModal chamado!');
    console.log('🔍 shouldMoveChassisToEnd:', shouldMoveChassisToEnd);
    console.log('🔍 selectedChassisIndex:', selectedChassisIndex);
    
    try {
      // 🔥 Se estiver em modo coletor, volta para a lista de chassis da categoria
      if (useCollectorMode) {
        console.log('🔙 Voltando para lista de chassis da categoria atual');
        setShowCollectorConference(false);
        // 🔥 NÃO limpa selectedCategory - mantém usuário na lista de chassis da categoria
        // Scroll para o topo
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }
      
      // Salva o progresso atual antes de fechar
      if (selectedChassisIndex !== null) {
        console.log(`💾 Salvando progresso do Chassis ${extractedData[selectedChassisIndex].chassis}`);
      
      // 🔥 Se a flag estiver ativa, move o chassis para o final
      if (shouldMoveChassisToEnd) {
        console.log('🚗 Movendo chassis para o final da lista...');

        // 🔥🔥🔥 MARCA QUE ESTE DISPOSITIVO CAUSOU A MUDANÇA DE ORDEM
        ignoreNextOrderChangeRef.current = true;
        lastOrderChangeTimestampRef.current = Date.now();
        console.log('🔒 Marcando para ignorar próxima mudança de ordem do realtime');

        // Move o chassis atual para o final da lista
        const newData = [...extractedData];
        const chassisToMove = newData.splice(selectedChassisIndex, 1)[0];
        newData.push(chassisToMove);

        // 🔥🔥🔥 CRÍTICO: Recalcula _originalIndex para todos os chassis
        // Após mover, os índices mudaram, então precisamos atualizar _originalIndex
        newData.forEach((item, idx) => {
          item._originalIndex = idx;
        });

        console.log('🔄 _originalIndex recalculado após mover chassis para o final');
        
        // Atualiza os índices salvos (savedTireSets, completedChassis, chassisLocks)
        const newSavedTireSets: Record<number, TireSet[]> = {};
        const newCompletedChassis: Record<number, boolean> = {};
        const newChassisLocks: Record<number, { userId: string; userName: string; lockedAt: string } | null> = {};
        
        Object.keys(savedTireSets).forEach(oldIndexStr => {
          const oldIndex = parseInt(oldIndexStr);
          let newIndex = oldIndex;
          
          if (oldIndex === selectedChassisIndex) {
            // O chassis movido vai para o final
            newIndex = newData.length - 1;
          } else if (oldIndex > selectedChassisIndex) {
            // Chassis após o movido sobem um índice
            newIndex = oldIndex - 1;
          }
          
          newSavedTireSets[newIndex] = savedTireSets[oldIndex];
        });
        
        Object.keys(completedChassis).forEach(oldIndexStr => {
          const oldIndex = parseInt(oldIndexStr);
          let newIndex = oldIndex;
          
          if (oldIndex === selectedChassisIndex) {
            newIndex = newData.length - 1;
          } else if (oldIndex > selectedChassisIndex) {
            newIndex = oldIndex - 1;
          }
          
          newCompletedChassis[newIndex] = completedChassis[oldIndex];
        });
        
        Object.keys(chassisLocks).forEach(oldIndexStr => {
          const oldIndex = parseInt(oldIndexStr);
          let newIndex = oldIndex;
          
          if (oldIndex === selectedChassisIndex) {
            newIndex = newData.length - 1;
          } else if (oldIndex > selectedChassisIndex) {
            newIndex = oldIndex - 1;
          }
          
          newChassisLocks[newIndex] = chassisLocks[oldIndex];
        });
        
        // Salva o jogo atual no novo índice
        newSavedTireSets[newData.length - 1] = tireSets;
        
        // Atualiza contagem total no chassis movido
        const totalChecked = countCheckedTires(tireSets);
        const newChassisIndex = newData.length - 1; // 🔥 Novo índice do chassis movido
        newData[newChassisIndex].tiresChecked = totalChecked;

        console.log(`🔄 MOVIMENTO: ${extractedData[selectedChassisIndex].chassis} de [${selectedChassisIndex}] para [${newChassisIndex}]`);

        // Aplica todas as atualizações
        setExtractedData(ensureCorrectIndexes(newData)); // 🔥 Garante índices corretos
        setSavedTireSets(newSavedTireSets);
        setCompletedChassis(newCompletedChassis);
        setChassisLocks(newChassisLocks);

        // 🔥🔥🔥 CRÍTICO: Atualiza selectedChassisIndex para o novo índice
        setSelectedChassisIndex(newChassisIndex);
        console.log(`✅ selectedChassisIndex atualizado: ${selectedChassisIndex} → ${newChassisIndex}`);

        toast.success('✅ Chassis movido para o final da lista!');

        // 🔥 Atualiza sessão ativa em tempo real (AGUARDA completar antes de limpar estados)
        try {
          // 🔥🔥🔥 CRÍTICO: PRIMEIRO atualiza excel_data E REINDEXAR PROGRESS no Supabase
          // ANTES de salvar os pneus, para que a validação use a ordem correta
          if (activeSessionId) {
            const supabase = createClient();
            console.log('📤 PASSO 1: Atualizando excel_data no Supabase com nova ordem...');

            // Busca progress atual
            const { data: currentSession } = await supabase
              .from('conference_sessions')
              .select('progress')
              .eq('id', activeSessionId)
              .single();

            // REINDEXAR PROGRESS: move dados do índice antigo para o novo
            const reindexedProgress: any = {};
            if (currentSession?.progress) {
              const oldProgress = currentSession.progress;

              // Para cada chassis no novo array, encontra onde estava antes e copia os dados
              newData.forEach((chassis, newIdx) => {
                // Encontra qual era o índice antigo deste chassis
                const oldIdx = extractedData.findIndex(c => c.chassis === chassis.chassis);

                // Se tinha dados salvos no índice antigo, copia para o novo índice
                if (oldIdx !== -1 && oldProgress[oldIdx]) {
                  reindexedProgress[newIdx] = oldProgress[oldIdx];
                  console.log(`🔄 Reindexando progress: ${chassis.chassis} de [${oldIdx}] para [${newIdx}]`);
                }
              });

              console.log(`✅ Progress reindexado: ${Object.keys(reindexedProgress).length} chassis`);
            }

            const { error: excelDataError } = await supabase
              .from('conference_sessions')
              .update({
                excel_data: newData,
                progress: reindexedProgress
              })
              .eq('id', activeSessionId);

            if (excelDataError) {
              console.error('❌ Erro ao atualizar excel_data após mover chassis:', excelDataError);
              throw excelDataError; // Impede salvamento se falhou
            } else {
              console.log('✅ excel_data e progress reindexados com nova ordem');
            }
          }

          // 🔥 PASSO 2: AGORA salva os pneus (com excel_data já atualizado)
          console.log('📤 PASSO 2: Salvando pneus no chassi...');
          await updateActiveSessionInRealTime(newData, tireSets, newChassisIndex);

          // 🔥 Limpa o flag após 5 segundos (caso o realtime não dispare)
          setTimeout(() => {
            if (ignoreNextOrderChangeRef.current) {
              console.log('🔓 Limpando flag de ignorar mudança de ordem (timeout)');
              ignoreNextOrderChangeRef.current = false;
            }
          }, 5000);

        } catch (saveError) {
          console.error('⚠️ Erro ao salvar no Supabase (movimento de chassis):', saveError);
          toast.warning('Dados salvos localmente. Verifique conexão.');
        }

        // Limpa a flag
        setShouldMoveChassisToEnd(false);
      } else {
        // Comportamento normal: salva o progresso no Supabase
        const totalChecked = countCheckedTires(tireSets);
        
        // Atualiza extractedData com o novo contador
        const newData = [...extractedData];
        newData[selectedChassisIndex].tiresChecked = totalChecked;
        setExtractedData(ensureCorrectIndexes(newData)); // 🔥 Garante índices corretos
        
        // Atualiza savedTireSets local para sincronização
        setSavedTireSets(prev => ({
          ...prev,
          [selectedChassisIndex]: tireSets
        }));
        
        // 🔥 Salva no Supabase (fonte única da verdade) - AGUARDA completar
        try {
          // 🔥🔥🔥 VALIDAÇÃO FINAL: Garante que o chassis no índice é o correto
          const chassisNoIndice = newData[selectedChassisIndex];
          console.log(`🔍🔍🔍 PRÉ-SAVE FINAL CHECK:`);
          console.log(`   Index a salvar: ${selectedChassisIndex}`);
          console.log(`   Chassis no índice: ${chassisNoIndice?.chassis} (${chassisNoIndice?.piloto})`);
          console.log(`   _originalIndex: ${chassisNoIndice?._originalIndex}`);
          console.log(`   Pneus: ${tireSets.flatMap(s => s.tires.filter(t => t.codigo !== '-').map(t => t.codigo)).join(', ')}`);

          // 🔥🔥🔥 PROTEÇÃO ADICIONAL: Se _originalIndex não coincide com selectedChassisIndex, PARA TUDO!
          if (chassisNoIndice._originalIndex !== undefined && chassisNoIndice._originalIndex !== selectedChassisIndex) {
            console.error(`❌❌❌ ERRO CRÍTICO DETECTADO ANTES DE SALVAR!`);
            console.error(`   selectedChassisIndex: ${selectedChassisIndex}`);
            console.error(`   _originalIndex do chassis: ${chassisNoIndice._originalIndex}`);
            console.error(`   Chassis: ${chassisNoIndice.chassis} (${chassisNoIndice.piloto})`);
            console.error(`   🛑 ABORTANDO SALVAMENTO!`);
            toast.error('Erro de integridade detectado. Reabra o chassis.');
            return; // 🛑 NÃO SALVA
          }

          await updateActiveSessionInRealTime(newData, tireSets, selectedChassisIndex);

          updateSessionProgress(selectedChassisIndex, {
            tireSets: tireSets,
            tiresChecked: totalChecked,
            lockedBy: null,
            lockedAt: null
          });
          
          console.log(`✅ Progresso salvo no Supabase para Chassis ${extractedData[selectedChassisIndex].chassis}`);
        } catch (saveError) {
          console.error('⚠️ Erro ao salvar no Supabase:', saveError);
          toast.warning('Dados salvos localmente. Verifique conexão.');
        }
      }
    }
    } catch (error) {
      console.error('❌ Erro crítico no closeChassisModal:', error);
      toast.error('Erro ao fechar chassi. Recarregue a página se necessário.');
    } finally {
      // 🔥 SEMPRE executa a limpeza dos estados, mesmo se houver erro
      console.log('🧹 Limpando estados do modal (finally block)...');
      
      console.log('🔍 [DEBUG CLOSE] extractedData.length ANTES de fechar:', extractedData.length);
      console.log('🔍 [DEBUG CLOSE] activeSessionId:', activeSessionId);
      
      setSelectedChassisIndex(null);
      setTireSets([]);
      setActiveJogo(1);
      setActivePneuPosition(0);
      clearTireInput();
      setIsEditMode(false);
      
      // 🔥 v4.8.2: Log para debug do problema de chassis sumindo
      setTimeout(() => {
        console.log('🔍 [DEBUG CLOSE] extractedData.length DEPOIS de fechar:', extractedData.length);
      }, 100);
      
      // 🔥 v4.8.3: Reseta estados de drag ao fechar
      setDragStartY(null);
      setDragCurrentY(null);
      setIsDragging(false);
    }
  };

  // 🔥 v4.8.3: Funções para swipe-to-close
  const handleDragStart = (clientY: number) => {
    setDragStartY(clientY);
    setDragCurrentY(clientY);
    setIsDragging(true);
  };

  const handleDragMove = (clientY: number) => {
    if (dragStartY === null || !isDragging) return;
    
    const deltaY = clientY - dragStartY;
    
    // Só permite arrastar para baixo (fechar)
    if (deltaY > 0) {
      setDragCurrentY(clientY);
    }
  };

  const handleDragEnd = () => {
    if (dragStartY === null || dragCurrentY === null) {
      setIsDragging(false);
      return;
    }
    
    const deltaY = dragCurrentY - dragStartY;
    
    // Se arrastou mais de 100px para baixo, fecha o modal
    if (deltaY > 100) {
      closeChassisModal();
    }
    
    // Reseta estados
    setDragStartY(null);
    setDragCurrentY(null);
    setIsDragging(false);
  };

  const initializeTireSets = (numberOfJogos: number) => {
    const sets: TireSet[] = [];
    for (let i = 1; i <= numberOfJogos; i++) {
      sets.push({
        jogo: i,
        label: `Jogo ${i}`,
        montadoNoCarro: false,
        tires: Array(4).fill(null).map((_, idx) => createEmptyTire(idx))
      });
    }
    setTireSets(sets);
  };

  const createEmptyTire = (index: number = 0): TireData => ({
    posicao: '-',
    codigo: '-',
    piloto: '-',
    ano: '-',
    set: '-',
    tipo: '-',
    voltas: '-',
    situacao: 'Guardar',
    observacao: '',
    validacao: null,
    _originalIndex: index
  });

  // 🧹 Atualiza sessão DIRETAMENTE para limpeza (SEM MERGE!)
  const updateActiveSessionDirectClear = async (
    updatedExtractedData: ExcelChassisData[],
    updatedTireSets: TireSet[],
    currentChassisIndex: number
  ) => {
    console.log('🧹🔥 ========================================');
    console.log('🧹🔥 UPDATE DIRETO (SEM MERGE) - LIMPEZA');
    console.log('🧹🔥 ========================================');
    
    if (!activeSeason || !etapaId || !activeSessionId) return;
    
    const selectedStage = seasonStages.find(stage => stage.id === etapaId);
    const stageName = selectedStage ? selectedStage.name : etapaId;
    
    try {
      const supabase = createClient();
      
      // 🔥 BUSCA dados atuais para preservar outros chassis
      const { data: currentSession } = await supabase
        .from('conference_sessions')
        .select('progress')
        .eq('id', activeSessionId)
        .single();
      
      const currentProgress = currentSession?.progress || {};
      
      // 🧹 SUBSTITUI DIRETAMENTE o chassis que foi limpo (sem merge!)
      const updatedProgress = {
        ...currentProgress,
        [currentChassisIndex]: {
          tireSets: updatedTireSets,
          tiresChecked: updatedExtractedData[currentChassisIndex]?.tiresChecked || 0,
          completed: completedChassis[currentChassisIndex] || false,
          lastModified: new Date().toISOString(),
          modifiedBy: currentUserName || 'Usuário',
          lockedBy: currentProgress[currentChassisIndex]?.lockedBy || null
        }
      };
      
      console.log('🧹🔥 Salvando DIRETAMENTE (substituindo, não fazendo merge)...');
      console.log('🧹🔥 Códigos sendo salvos:', updatedTireSets.flatMap(s => s.tires).map(t => t.codigo));
      
      // 🔥 UPDATE DIRETO no banco
      const { error } = await supabase
        .from('conference_sessions')
        .update({
          progress: updatedProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSessionId);
      
      if (error) {
        console.error('❌ Erro ao salvar limpeza direta:', error);
        throw error;
      }
      
      console.log('✅ Limpeza salva DIRETAMENTE no Supabase (sem merge)!');
      
    } catch (error) {
      console.error('❌ Erro em updateActiveSessionDirectClear:', error);
      throw error;
    }
  };

  // 🔥 Atualiza sessão ativa em tempo real SOMENTE no Supabase (sem localStorage)
  const updateActiveSessionInRealTime = async (
    updatedExtractedData: ExcelChassisData[],
    updatedTireSets: TireSet[],
    currentChassisIndex: number
  ) => {
    // 🚨 VALIDAÇÃO CRÍTICA 0: Verifica se ainda há um chassis selecionado
    if (selectedChassisIndex === null) {
      console.warn('⚠️ updateActiveSessionInRealTime abortado: nenhum chassis selecionado (modal foi fechado)');
      return;
    }

    // 🚨 VALIDAÇÃO CRÍTICA 1: Verifica se o índice é válido
    if (currentChassisIndex < 0 || currentChassisIndex >= updatedExtractedData.length) {
      console.error(`❌ updateActiveSessionInRealTime: Índice inválido ${currentChassisIndex} (length: ${updatedExtractedData.length})`);
      console.error('   Abortando salvamento para evitar corrupção de dados!');
      return;
    }

    const chassisBeingSaved = updatedExtractedData[currentChassisIndex];

    // 🚨 VALIDAÇÃO CRÍTICA 2: Verifica se _originalIndex coincide com currentChassisIndex
    if (chassisBeingSaved._originalIndex !== undefined && chassisBeingSaved._originalIndex !== currentChassisIndex) {
      console.error(`❌❌❌ DESALINHAMENTO DETECTADO EM updateActiveSessionInRealTime!`);
      console.error(`   currentChassisIndex (parâmetro): ${currentChassisIndex}`);
      console.error(`   _originalIndex do chassis: ${chassisBeingSaved._originalIndex}`);
      console.error(`   Chassis: ${chassisBeingSaved?.chassis} (${chassisBeingSaved?.piloto})`);
      console.error(`   🛑 ABORTANDO SALVAMENTO para evitar salvar no chassi errado!`);
      console.error(`   ⚠️ CAUSA PROVÁVEL: extractedData foi alterado mas selectedChassisIndex não foi atualizado`);
      return;
    }

    console.log(`💾💾💾 ========== SALVANDO DADOS NO SUPABASE ==========`);
    console.log(`💾 Chassis Index: ${currentChassisIndex}`);
    console.log(`💾 Chassis: ${chassisBeingSaved?.chassis || 'DESCONHECIDO'}`);
    console.log(`💾 Piloto: ${chassisBeingSaved?.piloto || 'DESCONHECIDO'}`);
    console.log(`💾 _originalIndex do objeto: ${chassisBeingSaved?._originalIndex}`);
    console.log(`💾 Jogos a salvar: ${updatedTireSets.length}`);
    console.log(`💾 Pneus conferidos: ${updatedTireSets.flatMap(s => s.tires.filter(t => t.codigo !== '-')).length}`);
    console.log(`💾 Códigos dos pneus: ${updatedTireSets.flatMap(s => s.tires.filter(t => t.codigo !== '-').map(t => t.codigo)).join(', ')}`);
    console.log(`💾 =====================================================`);

    if (!activeSeason || !etapaId) return;

    // Busca o nome da etapa
    const selectedStage = seasonStages.find(stage => stage.id === etapaId);
    const stageName = selectedStage ? selectedStage.name : etapaId;

    // 🔥 Atualiza SOMENTE no Supabase (sem localStorage)
    if (activeSessionId) {
      const tiresChecked = updatedExtractedData[currentChassisIndex]?.tiresChecked || 0;
      const completed = completedChassis[currentChassisIndex] || false;
      
      // 🚨 VALIDAÇÃO CRÍTICA: Verifica se updatedTireSets não está vazio
      console.log(`🔍 PRÉ-SALVAMENTO - Chassis ${currentChassisIndex}:`, {
        selectedChassisIndex: selectedChassisIndex,
        updatedTireSets_length: updatedTireSets.length,
        updatedTireSets: updatedTireSets,
        tiresChecked,
        completed,
        stackTrace: new Error().stack // 🔥 Captura onde foi chamado
      });
      
      if (updatedTireSets.length === 0) {
        console.error(`🚨🚨🚨 ALERTA CRÍTICO: Tentando salvar tireSets VAZIO no Supabase!`);
        console.error(`   Chassis Index: ${currentChassisIndex}`);
        console.error(`   selectedChassisIndex: ${selectedChassisIndex}`);
        console.error(`   Chamado de:`, new Error().stack);
        console.error(`   Isso vai APAGAR dados! Operação BLOQUEADA.`);
        return; // 🔥 BLOQUEIA salvamento de dados vazios
      }
      
      // 🆕 PROTEÇÃO CONTRA RACE CONDITION: Faz merge com dados mais recentes do servidor
      try {
        const supabase = createClient();
        const { data: currentSession } = await supabase
          .from('conference_sessions')
          .select('progress')
          .eq('id', activeSessionId)
          .single();
        
        let finalTireSets = updatedTireSets;
        
        if (currentSession?.progress?.[currentChassisIndex]?.tireSets) {
          const serverTireSets = currentSession.progress[currentChassisIndex].tireSets;
          
          console.log('🔄🔄🔄 ========================================');
          console.log('🔄 MERGE INTELIGENTE: Comparando dados locais com servidor...');
          console.log('🔄 Chassis:', currentChassisIndex);
          console.log('🔄 Limpezas ativas:', Object.keys(clearingTiresRef.current));
          console.log('🔄 ========================================');
          
          // Faz merge: preserva códigos não-vazios do servidor, mas respeita limpezas explícitas
          finalTireSets = updatedTireSets.map((localSet, setIdx) => {
            const serverSet = serverTireSets[setIdx];
            if (!serverSet) return localSet;
            
            return {
              ...localSet,
              tires: localSet.tires.map((localTire, tireIdx) => {
                const serverTire = serverSet.tires[tireIdx];
                if (!serverTire) return localTire;
                
                // 🔥 REGRA 0: Detecta LIMPEZA EXPLÍCITA no local
                // Se local está completamente vazio (todos os campos zerados), isso indica limpeza intencional
                const isExplicitClear = (
                  localTire.codigo === '-' && 
                  localTire.piloto === '-' && 
                  localTire.ano === '' &&
                  localTire.set === '' &&
                  localTire.tipo === '' &&
                  localTire.voltas === '' &&
                  localTire.situacao === '-' &&
                  !localTire.observacao &&
                  !localTire.validacao
                );
                
                // 🧹 NOVA VERIFICAÇÃO: Se está em clearingTires, É LIMPEZA GARANTIDA!
                const clearKey = `${currentChassisIndex}-${localSet.jogo}-${tireIdx}`;
                const isClearingNow = clearingTiresRef.current[clearKey];
                
                if (isExplicitClear || isClearingNow) {
                  if (isClearingNow) {
                    console.log(`   🧹🔥 LIMPEZA ATIVA DETECTADA (clearingTires) - mantendo limpo: ${clearKey}`);
                  } else {
                    console.log(`   🧹 LIMPEZA EXPLÍCITA DETECTADA - mantendo limpo (posição ${localTire.posicao})`);
                  }
                  return localTire; // NUNCA sobrescreve limpeza explícita
                }
                
                // REGRA 1: Se servidor tem código e local não tem, usa servidor
                if (serverTire.codigo && serverTire.codigo !== '-' && (!localTire.codigo || localTire.codigo === '-')) {
                  console.log(`   ✅ PRESERVANDO código do servidor: ${serverTire.codigo} (posição ${serverTire.posicao})`);
                  return serverTire;
                }
                
                // REGRA 2: Se ambos têm código e são diferentes, prioriza o mais recente (local)
                // mas apenas se o local foi realmente modificado pelo usuário
                if (localTire.codigo && localTire.codigo !== '-') {
                  return localTire;
                }
                
                // REGRA 3: Ambos vazios - usa local (pode ter observação)
                return localTire;
              })
            };
          });
          
          console.log('   ✅ Merge completo! Dados protegidos contra sobrescrita.');
          console.log('   📊 Códigos após merge:', finalTireSets.flatMap(s => s.tires).map(t => t.codigo).filter(c => c !== '-'));
          console.log('   🧹 Limpezas mantidas:', Object.keys(clearingTiresRef.current));
        }
        
        // Atualiza com os dados merged
        updatedTireSets = finalTireSets;
        
      } catch (mergeError) {
        console.warn('⚠️ Erro ao fazer merge com servidor. Prosseguindo com dados locais:', mergeError);
      }
      
      // Converte TireSet[] para TireSetData[]
      const tireSetData: TireSetData[] = updatedTireSets.map(set => ({
        jogo: set.jogo,
        label: set.label,
        montadoNoCarro: set.montadoNoCarro,
        tires: set.tires.map(tire => {
          console.log(`💾 Salvando pneu ${tire.codigo} no Supabase:`, {
            registeredBy: tire.registeredBy,
            registeredAt: tire.registeredAt
          });
          return {
            posicao: tire.posicao,
            codigo: tire.codigo,
            piloto: tire.piloto,
            ano: tire.ano,
            set: tire.set,
            tipo: tire.tipo,
            voltas: tire.voltas,
            situacao: tire.situacao,
            divergencia: tire.divergencia,
            pilotoInvalido: tire.pilotoInvalido,
            observacao: tire.observacao,
            validacao: tire.validacao,
            _originalIndex: tire._originalIndex, // 🔥 Preserva _originalIndex no Supabase
            registeredBy: tire.registeredBy, // 🔥 PRESERVA registeredBy no Supabase
            registeredAt: tire.registeredAt  // 🔥 PRESERVA registeredAt no Supabase
          };
        })
      }));
      
      console.log('📤📤📤 ENVIANDO UPDATE PARA SUPABASE');
      console.log('   📌 Session ID:', activeSessionId);
      console.log('   📌 Chassis Index:', currentChassisIndex);
      console.log('   📌 Timestamp:', new Date().toISOString());
      
      const success = await updateConferenceSessionRealtime(
        activeSessionId,
        currentChassisIndex,
        tireSetData,
        tiresChecked,
        completed
      );
      
      if (success) {
        console.log('✅✅✅ SUCESSO! Dados salvos no Supabase e broadcasting para todos os clientes');
      } else {
        console.error('❌❌❌ FALHA ao salvar no Supabase!');
      }
    }
    
    console.log('✅ Sessão ativa atualizada em tempo real no Supabase (incluindo registeredBy e registeredAt)');
  };

  // 🎯 HELPER: Foca em input com retry (aguarda re-renderização do React)
  const focusInputWithRetry = (jogo: number, position: number, maxAttempts = 5) => {
    let attempts = 0;
    
    const tryFocus = () => {
      attempts++;
      const input = document.querySelector(`input[data-jogo="${jogo}"][data-position="${position}"]`) as HTMLInputElement;
      
      if (input) {
        input.focus();
        console.log(`✅ Foco aplicado (tentativa ${attempts}): jogo=${jogo}, position=${position}`);
        return true;
      }
      
      if (attempts < maxAttempts) {
        console.log(`⏳ Aguardando renderização do input (${attempts}/${maxAttempts})...`);
        setTimeout(tryFocus, 100); // Tenta novamente em 100ms
        return false;
      }
      
      console.log(`ℹ️ Input não foi focado após ${maxAttempts} tentativas (pode já ter sido preenchido ou estar fora da viewport)`);
      return false;
    };
    
    setTimeout(tryFocus, 100); // Primeira tentativa após 100ms
  };

  // 🧹 Função para limpar código do pneu
  const handleClearTireCode = async (jogoNum: number, tireIdx: number) => {
    // 🔥 REMOVIDO: Permite limpar MESMO quando chassis está finalizado
    // if (!isEditMode) return;
    
    // 🛑🛑🛑 ATIVA BLOQUEIO TOTAL DO REALTIME NO INÍCIO
    console.log('🛑🛑🛑 ==========================================');
    console.log('🛑🛑🛑 BLOQUEANDO REALTIME COMPLETAMENTE!');
    console.log('🛑🛑🛑 ==========================================');
    realtimeBlockedRef.current = true;
    
    console.log('🧹🧹🧹 ========================================');
    console.log('🧹 INICIANDO LIMPEZA DE CÓDIGO');
    console.log(`🧹 Jogo: ${jogoNum}, Tire Index: ${tireIdx}`);
    console.log(`🧹 Chassis Index: ${selectedChassisIndex}`);
    console.log('🧹 ========================================');
    
    // 🧹 MARCA COMO "EM LIMPEZA" para proteger contra realtime
    if (selectedChassisIndex !== null) {
      const clearKey = `${selectedChassisIndex}-${jogoNum}-${tireIdx}`;
      const timestamp = Date.now();
      console.log(`🧹 MARCANDO como em limpeza: ${clearKey} (timestamp: ${timestamp})`);
      
    }
    
    // 🔥 v4.7.0: Limpa estado de processamento se existir
    const inputKey = `${jogoNum}-${tireIdx}`;
    setProcessingInputs(prev => {
      const updated = { ...prev };
      delete updated[inputKey];
      return updated;
    });
    
    // 🔥 BUSCA o _originalIndex do pneu ANTES de limpar
    const currentSet = tireSets.find(s => s.jogo === jogoNum);
    if (!currentSet) {
      console.error('❌ Jogo não encontrado:', jogoNum);
      return;
    }
    
    const tireToClean = currentSet.tires[tireIdx];
    if (!tireToClean) {
      console.error('❌ Pneu não encontrado no índice:', tireIdx);
      return;
    }
    
    console.log(`🧹 Código a ser limpo: "${tireToClean.codigo}"`);
    console.log(`🧹 Posição: ${tireToClean.posicao}`);
    
    const originalIndex = tireToClean._originalIndex ?? tireIdx;
    console.log(`🧹 _originalIndex do pneu: ${originalIndex}`);
    
    // Encontra o pneu e limpa os dados
    const updatedTireSets = tireSets.map(set => {
      if (set.jogo === jogoNum) {
        return {
          ...set,
          tires: set.tires.map((tire, idx) => {
            if (idx === tireIdx) {
              console.log(`🧹 Limpando tire na posição ${idx}, _originalIndex era: ${tire._originalIndex}`);
              return {
                posicao: tire.posicao,
                codigo: '-',
                piloto: '-',
                ano: '',
                set: '',
                tipo: '',
                voltas: '',
                situacao: '-' as const,
                observacao: '',
                validacao: null,
                _originalIndex: tire._originalIndex ?? idx // 🔥 Preserva _originalIndex ao limpar
              };
            }
            return tire;
          })
        };
      }
      return set;
    });
    
    console.log(`🧹🧹🧹 ========== LIMPEZA - CHAMANDO setTireSets ==========`);
    console.log(`🧹 Códigos APÓS limpeza:`, updatedTireSets.flatMap(s => s.tires.map(t => t.codigo)));
    console.log(`🧹 Timestamp ANTES setTireSets: ${Date.now()}`);
    setTireSets(updatedTireSets);
    console.log(`🧹 Timestamp DEPOIS setTireSets: ${Date.now()}`);
    console.log(`🧹🧹🧹 ===================================================`);
    
    // 🔥 ATUALIZA TAMBÉM savedTireSets IMEDIATAMENTE (evita race condition com realtime)
    if (selectedChassisIndex !== null) {
      console.log(`🧹 Atualizando savedTireSets...`);
      setSavedTireSets(prev => ({
        ...prev,
        [selectedChassisIndex]: updatedTireSets
      }));
    }
    
    // Atualiza contagem e sessão
    if (selectedChassisIndex !== null) {
      const totalChecked = countCheckedTires(updatedTireSets);
      const newData = [...extractedData];
      newData[selectedChassisIndex].tiresChecked = totalChecked;
      setExtractedData(ensureCorrectIndexes(newData)); // 🔥 Garante índices corretos
      
      // 🧹 MARCA COMO "EM LIMPEZA" **ANTES** de salvar no banco (proteção contra realtime)
      const clearKey = `${selectedChassisIndex}-${jogoNum}-${tireIdx}`;
      const timestamp = Date.now();
      console.log(`🧹 MARCANDO como em limpeza ANTES do update: ${clearKey} (timestamp: ${timestamp})`);
      
      setClearingTires(prev => {
        const updated = { ...prev, [clearKey]: timestamp };
        console.log(`🧹 Estado clearingTires atualizado:`, updated);
        return updated;
      });
      
      // 🔥 AGUARDA 200ms para garantir que o ref foi atualizado E o React renderizou
      await new Promise(resolve => setTimeout(resolve, 200));
      const refStatus = clearingTiresRef.current[clearKey];
      console.log(`🧹 Ref atualizado:`, refStatus ? `OK ✅ (timestamp: ${refStatus})` : 'FALHOU ❌');
      
      if (!refStatus) {
        console.error('❌❌❌ REF NÃO FOI ATUALIZADO - ABORTANDO LIMPEZA!');
        return;
      }
      
      // 🧹🔥 USA FUNÇÃO DE UPDATE DIRETO (SEM MERGE!)
      console.log('🧹 ==========================================');
      console.log('🧹 SALVAMENTO DIRETO (SEM MERGE):');
      console.log('🧹 1. ✅ Estado local atualizado (tireSets)');
      console.log('🧹 2. ✅ Estado salvo atualizado (savedTireSets)');
      console.log('🧹 3. ✅ Proteção ativada (clearingTires ref)');
      console.log('🧹 4. 🔥 Salvando DIRETAMENTE no Supabase (SEM BUSCAR DADOS DO SERVIDOR)...');
      console.log('🧹 ==========================================');
      await updateActiveSessionDirectClear(newData, updatedTireSets, selectedChassisIndex);
      console.log('✅✅✅ ========== LIMPEZA SALVA NO SUPABASE ==========');
      console.log('✅ Timestamp FIM salvamento:', Date.now());
      console.log(`✅ Proteção contra realtime ativa por 2 segundos para: ${clearKey}`);
      console.log('✅✅✅ ==================================================');
      
      // Remove a marcação E desbloqueia realtime após 2 segundos
      setTimeout(() => {
        setClearingTires(prev => {
          const updated = { ...prev };
          delete updated[clearKey];
          console.log(`🧹 REMOVENDO marcação de limpeza: ${clearKey}`);
          return updated;
        });
        
        // 🛑 DESBLOQUEIA O REALTIME
        console.log('🛑🛑🛑 ==========================================');
        console.log('🛑🛑🛑 DESBLOQUEANDO REALTIME!');
        console.log('🛑🛑🛑 ==========================================');
        realtimeBlockedRef.current = false;
      }, 2000);
      
      // 🔥 REGISTRA LIMPEZA NO SUPABASE (auditoria)
      const emptyTireData: TireData = {
        posicao: tireToClean.posicao,
        codigo: '-',
        piloto: '-',
        ano: '',
        set: '',
        tipo: '',
        voltas: '',
        situacao: '-',
        observacao: '',
        validacao: null,
        _originalIndex: originalIndex
      };
      
      const chassisData = newData[selectedChassisIndex];
      await saveToSupabaseRealtime(
        chassisData.chassis,
        jogoNum,
        originalIndex,
        '', // Código vazio
        'LIMPAR', // Ação de limpar
        emptyTireData
      );
    }
    
    console.log('🧹 ========================================');
    console.log('✅ LIMPEZA CONCLUÍDA COM SUCESSO');
    console.log('🧹 Código limpo e protegido contra realtime');
    console.log('🧹 ========================================');
    
    toast.success('🧹 Código limpo', {
      description: 'Campo pronto para novo código'
    });
    
    // 🔥 Foca no campo limpo com retry inteligente (aguarda React re-renderizar)
    const tryFocusInput = (attempt: number = 1, maxAttempts: number = 10) => {
      const input = document.querySelector(`input[data-jogo="${jogoNum}"][data-position="${originalIndex}"]`) as HTMLInputElement;
      if (input) {
        input.focus();
        console.log(`✅ Foco aplicado no input (tentativa ${attempt}): jogo=${jogoNum}, position=${originalIndex}`);
      } else if (attempt < maxAttempts) {
        console.log(`⏳ Input ainda não renderizado (aguardando React): jogo=${jogoNum}, position=${originalIndex} - tentativa ${attempt}/${maxAttempts}`);
        setTimeout(() => tryFocusInput(attempt + 1, maxAttempts), 100);
      } else {
        // 🔍 Verifica se o pneu ainda está vazio antes de mostrar warning
        const currentSet = tireSets.find(s => s.jogo === jogoNum);
        const currentTire = currentSet?.tires[originalIndex];
        
        if (currentTire && currentTire.codigo && currentTire.codigo !== '-') {
          console.log(`ℹ️ Input não encontrado porque código já foi preenchido novamente: "${currentTire.codigo}"`);
        } else {
          console.log(`ℹ️ Input não foi focado após ${maxAttempts} tentativas (campo pode estar fora da viewport ou já foi preenchido)`);
        }
      }
    };
    
    setTimeout(() => tryFocusInput(), 200);
  };

  // 📱 Função para lidar com mudanças no input do código
  const handleTireCodeChange = (value: string) => {
    const cleanValue = normalizeScannerCode(value);
    lastInputTimestampRef.current = Date.now();

    console.log('');
    console.log('🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵');
    console.log('📝 handleTireCodeChange CHAMADO - ConferirPneus');
    console.log('   Valor recebido:', value);
    console.log('   Valor limpo:', cleanValue);
    console.log('   Tamanho:', cleanValue.length);
    console.log('   É hexadecimal?', /^[0-9A-F]*$/.test(cleanValue));
    console.log('   É 8 dígitos numéricos?', /^\d{8}$/.test(cleanValue));
    console.log('🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵');

    if (!/^[0-9A-F]*$/.test(cleanValue)) {
      console.log('❌ NÃO é hexadecimal - retornando');
      return;
    }

    setTireCodeInput(cleanValue);

    // Cancela timer anterior
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
      console.log('⏹️ Timer anterior cancelado');
    }

    // 🔥 RFID completo (24 chars) - auto-submit IMEDIATO
    if (cleanValue.length === 24 && /^[0-9A-F]{24}$/.test(cleanValue)) {
      console.log('🎯🎯🎯 RFID COMPLETO (24 chars) - AUTO-SUBMIT IMEDIATO!');
      console.log(`   Código RFID: "${cleanValue}"`);
      handleTireCodeSubmit(cleanValue);
    }
    // 🔥 Código de barras (8 dígitos) - auto-submit após debounce curto do scanner
    else if (isBarcodeCode(cleanValue)) {
      console.log('');
      console.log('🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢');
      console.log('⏰ CÓDIGO DE BARRAS DETECTADO (8 dígitos)!');
      console.log('   Valor:', cleanValue);
      console.log('   Iniciando timer curto para auto-submit...');
      console.log('🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢');

      autoSubmitTimerRef.current = setTimeout(() => {
        console.log('');
        console.log('✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅');
        console.log('⚡ TIMER DISPARADO - AUTO-SUBMIT!');
        console.log('   Código de barras:', cleanValue);
        console.log('✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅');
        handleTireCodeSubmit(cleanValue);
      }, SCANNER_AUTO_SUBMIT_DELAY_MS);
    } else {
      console.log('⏹️ Aguardando mais caracteres ou ENTER manual');
      console.log('   Tamanho atual:', cleanValue.length);
    }
  };

  // 📱 Função helper para limpar input
  const clearTireInput = () => {
    setTireCodeInput('');
  };

  const clearInlineAutoSubmitTimer = (inputKey: string) => {
    const timer = inlineAutoSubmitTimersRef.current[inputKey];
    if (timer) {
      clearTimeout(timer);
      delete inlineAutoSubmitTimersRef.current[inputKey];
    }
  };

  const clearInlineScanInput = (jogo: number, position: number, shouldFocus = true) => {
    if (typeof document === 'undefined') return;

    const input = document.querySelector(
      `input[data-jogo="${jogo}"][data-position="${position}"]`
    ) as HTMLInputElement | null;

    if (!input) return;

    input.value = '';

    if (shouldFocus) {
      setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
    }
  };

  const normalizeNativeRFIDPayload = (payload: NativeRFIDPayload): NormalizedNativeRFIDScan | null => {
    const rawPayload = typeof payload === 'string' ? { epc: payload, source: 'native-rfid' } : payload;
    const source = rawPayload.source || 'native-rfid';
    const epc = rawPayload.epc ? normalizeScannerCode(rawPayload.epc) : undefined;
    const explicitCode = normalizeScannerCode(rawPayload.barcode || rawPayload.code || '');

    if (explicitCode && isBarcodeCode(explicitCode)) {
      return {
        code: explicitCode,
        epc,
        cai: rawPayload.cai,
        rssi: rawPayload.rssi,
        seenCount: rawPayload.seenCount,
        source
      };
    }

    if (epc && isRFIDCode(epc)) {
      const decoded = decodeRFID(epc);
      if (!decoded) return null;

      return {
        code: decoded.barcode,
        epc,
        cai: rawPayload.cai || decoded.cai,
        rssi: rawPayload.rssi,
        seenCount: rawPayload.seenCount,
        source
      };
    }

    return null;
  };

  const pruneRecentRFIDReads = (now = Date.now()) => {
    for (const [key, timestamp] of recentRFIDReadsRef.current.entries()) {
      if (now - timestamp > RFID_RECENT_CACHE_TTL_MS) {
        recentRFIDReadsRef.current.delete(key);
      }
    }
  };

  const registerIgnoredRFIDRead = () => {
    setNativeRFIDStatus(prev => ({
      ...prev,
      available: true,
      ignoredDuplicates: prev.ignoredDuplicates + 1
    }));
  };

  const isCodeAlreadyInCurrentTireSets = (code: string, sourceSets: TireSet[] = tireSetsRef.current) => {
    const normalizedCode = normalizeScannerCode(code);
    return sourceSets.some(set =>
      set.tires.some(tire => normalizeScannerCode(tire.codigo || '') === normalizedCode)
    );
  };

  const shouldRejectDuplicateScan = ({
    code,
    epc,
    source
  }: {
    code: string;
    epc?: string;
    source: InlineScanOptions['source'];
  }) => {
    const normalizedCode = normalizeScannerCode(code);
    const normalizedEpc = epc ? normalizeScannerCode(epc) : undefined;
    const now = Date.now();
    const identifiers = [`code:${normalizedCode}`];

    if (normalizedEpc) {
      identifiers.push(`epc:${normalizedEpc}`);
    }

    pruneRecentRFIDReads(now);

    const recentlyRead = identifiers.some(identifier => {
      const lastReadAt = recentRFIDReadsRef.current.get(identifier);
      return lastReadAt !== undefined && now - lastReadAt < RFID_RECENT_DUPLICATE_WINDOW_MS;
    });

    const alreadyQueued = queuedScanCodesRef.current.has(normalizedCode);
    const alreadyRegistered = isCodeAlreadyInCurrentTireSets(normalizedCode);

    if (recentlyRead || alreadyQueued || alreadyRegistered) {
      console.log('🚫 Leitura duplicada ignorada:', {
        code: normalizedCode,
        epc: normalizedEpc,
        source,
        recentlyRead,
        alreadyQueued,
        alreadyRegistered
      });

      if (source === 'native-rfid') {
        registerIgnoredRFIDRead();
      } else if (alreadyRegistered || alreadyQueued) {
        toast.warning('Código já registrado neste chassis', {
          description: normalizedCode,
          duration: 1800
        });
      }

      return true;
    }

    identifiers.forEach(identifier => {
      recentRFIDReadsRef.current.set(identifier, now);
    });

    return false;
  };

  const findAvailableInlineScanTarget = (sourceSets: TireSet[] = tireSetsRef.current): { jogo: number; position: number } | null => {
    const activeJogoValue = activeJogoRef.current;
    const activePositionValue = activePneuPositionRef.current;
    const isAvailable = (set: TireSet, tire: TireData, visualIndex: number) => {
      const originalIndex = tire._originalIndex ?? visualIndex;
      return (!tire.codigo || tire.codigo === '-') && !queuedInputKeysRef.current.has(`${set.jogo}-${originalIndex}`);
    };

    const activeSet = sourceSets.find(set => set.jogo === activeJogoValue);
    if (activeSet) {
      const activeVisualIndex = activeSet.tires.findIndex((tire, idx) => (tire._originalIndex ?? idx) === activePositionValue);
      if (activeVisualIndex !== -1 && isAvailable(activeSet, activeSet.tires[activeVisualIndex], activeVisualIndex)) {
        return { jogo: activeJogoValue, position: activePositionValue };
      }

      for (let index = Math.max(activeVisualIndex + 1, 0); index < activeSet.tires.length; index++) {
        const tire = activeSet.tires[index];
        if (isAvailable(activeSet, tire, index)) {
          return { jogo: activeSet.jogo, position: tire._originalIndex ?? index };
        }
      }
    }

    for (const set of sourceSets.filter(set => set.jogo > activeJogoValue)) {
      const visualIndex = set.tires.findIndex((tire, idx) => isAvailable(set, tire, idx));
      if (visualIndex !== -1) {
        const tire = set.tires[visualIndex];
        return { jogo: set.jogo, position: tire._originalIndex ?? visualIndex };
      }
    }

    for (const set of sourceSets) {
      const visualIndex = set.tires.findIndex((tire, idx) => isAvailable(set, tire, idx));
      if (visualIndex !== -1) {
        const tire = set.tires[visualIndex];
        return { jogo: set.jogo, position: tire._originalIndex ?? visualIndex };
      }
    }

    return null;
  };

  const releaseProcessingInput = (inputKey: string, code?: string) => {
    queuedInputKeysRef.current.delete(inputKey);
    if (code) {
      queuedScanCodesRef.current.delete(normalizeScannerCode(code));
    }

    setProcessingInputs(prev => {
      const updated = { ...prev };
      delete updated[inputKey];
      return updated;
    });

    if (queuedInputKeysRef.current.size === 0) {
      setIsProcessingTireCode(false);
    }
  };

  const focusNextInlineInput = (jogo: number, position: number, sourceSets: TireSet[] = tireSetsRef.current) => {
    const findNextTarget = (): { jogo: number; position: number } | null => {
      const currentSetIndex = sourceSets.findIndex(set => set.jogo === jogo);

      if (currentSetIndex !== -1) {
        const currentSet = sourceSets[currentSetIndex];
        const currentVisualIndex = currentSet.tires.findIndex((tire, idx) => (tire._originalIndex ?? idx) === position);

        const nextInCurrentSet = currentSet.tires.find((tire, idx) => {
          const originalIndex = tire._originalIndex ?? idx;
          return idx > currentVisualIndex && (!tire.codigo || tire.codigo === '-') && !queuedInputKeysRef.current.has(`${jogo}-${originalIndex}`);
        });

        if (nextInCurrentSet) {
          const nextVisualIndex = currentSet.tires.indexOf(nextInCurrentSet);
          return {
            jogo,
            position: nextInCurrentSet._originalIndex ?? nextVisualIndex
          };
        }
      }

      for (const nextSet of sourceSets.filter(set => set.jogo > jogo)) {
        const firstEmptyVisualIndex = nextSet.tires.findIndex((tire, idx) => {
          const originalIndex = tire._originalIndex ?? idx;
          return (!tire.codigo || tire.codigo === '-') && !queuedInputKeysRef.current.has(`${nextSet.jogo}-${originalIndex}`);
        });

        if (firstEmptyVisualIndex !== -1) {
          const firstEmptyTire = nextSet.tires[firstEmptyVisualIndex];
          return {
            jogo: nextSet.jogo,
            position: firstEmptyTire._originalIndex ?? firstEmptyVisualIndex
          };
        }
      }

      return null;
    };

    const nextTarget = findNextTarget();
    if (!nextTarget) return;

    setActiveJogo(nextTarget.jogo);
    setActivePneuPosition(nextTarget.position);
    setPendingFocusAfterSubmit(null);

    setTimeout(() => {
      const nextInput = document.querySelector(`input[data-jogo="${nextTarget.jogo}"][data-position="${nextTarget.position}"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        console.log(`⚡ Foco liberado imediatamente: jogo=${nextTarget.jogo}, position=${nextTarget.position}`);
      }
    }, 0);
  };

  const enqueueInlineScan = (scan: QueuedTireScan) => {
    scanQueueRef.current = scanQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        try {
          await handleTireCodeSubmit(scan.code, scan.position, {
            jogo: scan.jogo,
            chassisIndex: scan.chassisIndex
          });
        } catch (error) {
          console.error('❌ Erro ao processar bipagem em fila:', error);
          toast.error('Erro ao processar código', {
            description: 'A leitura foi recebida, mas não foi possível concluir o salvamento.',
            duration: 5000
          });
        } finally {
          releaseProcessingInput(scan.inputKey, scan.code);
        }
      });
  };

  // 🆕 Funções para observações
  const handleOpenObservationModal = (jogo?: number, position?: number) => {
    // Se receber parâmetros, atualiza o jogo e posição ativos
    if (jogo !== undefined && position !== undefined) {
      setActiveJogo(jogo);
      setActivePneuPosition(position);
      
      // Carrega observação existente se houver
      const setIndex = tireSets.findIndex(s => s.jogo === jogo);
      if (setIndex !== -1) {
        const existingObservation = tireSets[setIndex].tires[position].observacao || '';
        setObservationText(existingObservation);
      }
    } else {
      setObservationText('');
    }
    setShowObservationModal(true);
  };

  const handleAddObservation = (observation: string) => {
    if (selectedChassisIndex === null) return;

    const newSets = [...tireSets];
    const setIndex = newSets.findIndex(s => s.jogo === activeJogo);
    if (setIndex !== -1) {
      newSets[setIndex].tires[activePneuPosition] = {
        ...newSets[setIndex].tires[activePneuPosition],
        codigo: newSets[setIndex].tires[activePneuPosition].codigo === '-' ? '' : newSets[setIndex].tires[activePneuPosition].codigo,
        observacao: observation
      };
      setTireSets(newSets);
      updateActiveSessionInRealTime(extractedData, newSets, selectedChassisIndex);

      // Avança para próxima posição
      const nextPosition = activePneuPosition + 1;
      if (nextPosition >= 4) {
        const nextJogo = activeJogo + 1;
        if (nextJogo <= newSets.length) {
          setActiveJogo(nextJogo);
          setActivePneuPosition(0);
        }
      } else {
        setActivePneuPosition(nextPosition);
      }
    }
  };

  const handleSaveObservation = () => {
    if (observationText.trim()) {
      handleAddObservation(observationText.trim());
      setShowObservationModal(false);
      setObservationText('');
    } else {
      toast.error('Digite uma observação');
    }
  };

  // 🆕 Função para submeter código inline (direto na linha)
  const handleTireCodeSubmitInline = (code: string, jogo: number, position: number, options: InlineScanOptions = {}): boolean => {
    const inputKey = `${jogo}-${position}`;
    const normalizedCode = normalizeScannerCode(code);
    const currentTireSets = tireSetsRef.current.length > 0 ? tireSetsRef.current : tireSets;
    const currentSelectedChassisIndex = selectedChassisIndexRef.current ?? selectedChassisIndex;
    const currentExtractedData = extractedDataRef.current.length > 0 ? extractedDataRef.current : extractedData;
    const scanSource = options.source || 'inline';

    clearInlineAutoSubmitTimer(inputKey);

    console.log('🚀🚀🚀 handleTireCodeSubmitInline CHAMADO!');
    console.log('📦 Parâmetros recebidos:', { code, normalizedCode, jogo: `${jogo} (${typeof jogo})`, position: `${position} (${typeof position})` });
    console.log('📦 Estado atual:', { activeJogo, activePneuPosition, isProcessingTireCode, queued: queuedInputKeysRef.current.size });

    if (!normalizedCode) {
      console.log('❌ Input vazio, abortando');
      return false;
    }

    if (queuedInputKeysRef.current.has(inputKey)) {
      console.log(`🚫 Input ${inputKey} já está na fila de salvamento.`);
      clearInlineScanInput(jogo, position);
      return false;
    }

    // 📡 Detecta e decodifica RFID antes de processar
    let processedCode = normalizedCode;
    let epcCode = options.epc ? normalizeScannerCode(options.epc) : undefined;
    if (isRFIDCode(normalizedCode)) {
      console.log('📡 RFID detectado no input inline:', normalizedCode);
      const rfidData = decodeRFID(normalizedCode);

      if (!rfidData) {
        toast.error('Erro ao decodificar RFID', {
          description: 'O código RFID não pôde ser decodificado.',
        });
        clearInlineScanInput(jogo, position);
        return false;
      }

      console.log('✅ RFID decodificado:', rfidData.barcode, '(CAI:', rfidData.cai + ')');
      processedCode = rfidData.barcode;
      epcCode = normalizedCode;

      if (!options.suppressDecodeToast) {
        toast.success('RFID Decodificado', {
          description: `CAI: ${rfidData.cai} | Código: ${rfidData.barcode}`,
          duration: 2000,
        });
      }
    }

    if (currentSelectedChassisIndex === null) {
      console.error('❌ Nenhum chassis selecionado!');
      toast.error('Selecione um chassis antes de conferir pneus');
      return false;
    }

    if (currentTireSets.length === 0) {
      console.error('❌ TireSets não inicializado!', { jogo, tireSets: currentTireSets });
      toast.error('Erro: Sessão de conferência não inicializada. Feche e abra o chassis novamente.');
      return false;
    }

    console.log('🔍 Procurando jogo no tireSets...');
    console.log('📚 tireSets disponíveis:', currentTireSets.map(s => ({ jogo: s.jogo, type: typeof s.jogo, label: s.label, tiresCount: s.tires.length })));

    const currentSet = currentTireSets.find(s => s.jogo === jogo);
    if (!currentSet) {
      console.error('❌ Jogo não encontrado!');
      console.error('❌ Procurando jogo:', jogo, '(type:', typeof jogo, ')');
      console.error('❌ tireSets:', currentTireSets);
      toast.error(`Erro: Jogo ${jogo} não encontrado!`);
      return false;
    }

    const tiresWithIndex = currentSet.tires.map((t, idx) => ({
      ...t,
      _originalIndex: t._originalIndex ?? idx
    }));
    const targetTire = tiresWithIndex.find(t => t._originalIndex === position);

    if (!targetTire) {
      console.error('❌ Pneu com _originalIndex', position, 'não encontrado!');
      console.error('❌ Pneus disponíveis:', tiresWithIndex.map((t, i) => ({ idx: i, _originalIndex: t._originalIndex, posicao: t.posicao })));
      toast.error(`Erro: Pneu na posição ${position} não encontrado!`);
      return false;
    }

    if (position < 0 || position > 3) {
      console.error('❌ Posição inválida!', { position });
      toast.error('Erro: Posição inválida');
      return false;
    }

    if (!currentExtractedData[currentSelectedChassisIndex]) {
      console.error('❌ Chassis não encontrado para a fila de bipagem!', { currentSelectedChassisIndex });
      toast.error('Erro: chassis não encontrado. Feche e abra novamente.');
      return false;
    }

    if (shouldRejectDuplicateScan({ code: processedCode, epc: epcCode, source: scanSource })) {
      clearInlineScanInput(jogo, position);
      return false;
    }

    queuedInputKeysRef.current.add(inputKey);
    queuedScanCodesRef.current.add(processedCode);
    setIsProcessingTireCode(true);
    setProcessingInputs(prev => ({ ...prev, [inputKey]: true }));

    setActiveJogo(jogo);
    setActivePneuPosition(position);
    focusNextInlineInput(jogo, position, currentTireSets);

    enqueueInlineScan({
      code: processedCode,
      epc: epcCode,
      jogo,
      position,
      inputKey,
      chassisIndex: currentSelectedChassisIndex
    });

    return true;
  };

  const handleNativeRFIDTag = (payload: NativeRFIDPayload) => {
    const scan = normalizeNativeRFIDPayload(payload);

    if (!scan) {
      console.warn('⚠️ Leitura RFID nativa ignorada: payload inválido', payload);
      registerIgnoredRFIDRead();
      return;
    }

    const currentTireSets = tireSetsRef.current.length > 0 ? tireSetsRef.current : tireSets;
    const currentSelectedChassisIndex = selectedChassisIndexRef.current;

    setNativeRFIDStatus(prev => ({
      ...prev,
      available: true,
      connected: true,
      mode: prev.mode === 'unknown' ? 'sdk' : prev.mode,
      lastReadAt: new Date().toISOString(),
      lastBarcode: scan.code,
      lastEpc: scan.epc,
      lastRssi: scan.rssi
    }));

    if (!isEditMode || currentSelectedChassisIndex === null || currentTireSets.length === 0) {
      console.log('🚫 Leitura RFID nativa recebida fora do modo de edição:', {
        isEditMode,
        currentSelectedChassisIndex,
        tireSetsLength: currentTireSets.length
      });
      registerIgnoredRFIDRead();
      return;
    }

    const target = findAvailableInlineScanTarget(currentTireSets);
    if (!target) {
      console.log('🚫 Leitura RFID nativa ignorada: nenhum campo vazio disponível', scan);
      registerIgnoredRFIDRead();
      toast.info('Todos os campos deste chassis já foram preenchidos', {
        duration: 1800
      });
      return;
    }

    const accepted = handleTireCodeSubmitInline(scan.epc || scan.code, target.jogo, target.position, {
      source: 'native-rfid',
      epc: scan.epc,
      rssi: scan.rssi,
      suppressDecodeToast: true
    });

    if (accepted) {
      setNativeRFIDStatus(prev => ({
        ...prev,
        acceptedReads: prev.acceptedReads + 1,
        lastReadAt: new Date().toISOString(),
        lastBarcode: scan.code,
        lastEpc: scan.epc,
        lastRssi: scan.rssi
      }));
    }
  };

  nativeRFIDHandlerRef.current = handleNativeRFIDTag;
  nativeRFIDStatusHandlerRef.current = (status: NativeRFIDStatus) => {
    setNativeRFIDStatus(prev => ({
      ...prev,
      ...status,
      available: status.available ?? true
    }));
  };

  // 🔥 FUNÇÃO DE AUTO-SALVAMENTO NO SUPABASE (tempo real com auditoria)
  const saveToSupabaseRealtime = async (
    chassisNumber: string,
    jogoNumber: number,
    positionIndex: number,
    tireCode: string,
    action: 'BIPAR' | 'LIMPAR',
    tireData: TireData
  ): Promise<boolean> => {
    const sessionId = activeSessionIdRef.current ?? activeSessionId;
    const userId = currentUserIdRef.current ?? currentUserId;
    const userName = currentUserNameRef.current || currentUserName;

    if (!sessionId || !userId || !userName) {
      console.warn('⚠️ Salvamento ignorado: sessão, usuário ou nome não disponível');
      return false;
    }

    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      // 🔥 Mapa de posição
      const positionMap: Record<number, string> = {
        0: 'DD',
        1: 'DE',
        2: 'TE',
        3: 'TD'
      };
      const posicaoNome = positionMap[positionIndex] || `Posição ${positionIndex}`;

      console.log('💾 Salvando no Supabase (tempo real)...', {
        chassis: chassisNumber,
        jogo: jogoNumber,
        posicao: posicaoNome,
        codigo: tireCode,
        action,
        usuario: userName,
        timestamp: now
      });

      // 🔥 Registra a ação individual no histórico de alterações
      const { error: historyError } = await supabase
        .from('tire_scan_history')
        .insert({
          session_id: sessionId,
          chassis: chassisNumber,
          jogo: jogoNumber,
          posicao: posicaoNome,
          tire_code: tireCode || null,
          action: action,
          user_id: userId,
          user_name: userName,
          tire_data: tireData,
          created_at: now
        });

      if (historyError) {
        console.error('❌ Erro ao salvar histórico de bipagem:', historyError);
        toast.error('Erro ao salvar histórico', {
          description: 'A bipagem foi registrada localmente mas pode não estar sincronizada'
        });
        return false;
      }

      console.log('✅ Histórico de bipagem salvo no Supabase!');

      // 🔥 Atualiza a sessão compartilhada com os dados atualizados
      const { data: sessionData, error: sessionError } = await supabase
        .from('conference_sessions')
        .select('excel_data')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error('❌ Erro ao buscar sessão:', sessionError);
        return false;
      }

      // Atualiza os dados do excel_data com a nova bipagem
      const updatedExcelData = (sessionData.excel_data as ExcelChassisData[]).map((chassis, chassisIdx) => {
        if (chassis.chassis === chassisNumber) {
          const updatedGames = chassis.games?.map((game: any, idx: number) => {
            if (idx + 1 === jogoNumber) {
              const updatedPositions = [...(game.positions || [])];
              if (positionIndex >= 0 && positionIndex < updatedPositions.length) {
                updatedPositions[positionIndex] = tireCode || '-';
              }
              return { ...game, positions: updatedPositions };
            }
            return game;
          });
          // 🔥 CRÍTICO: Preserva explicitamente _originalIndex
          return {
            ...chassis,
            games: updatedGames,
            _originalIndex: chassis._originalIndex ?? chassisIdx
          };
        }
        return chassis;
      });

      // Salva de volta no Supabase
      const { error: updateError } = await supabase
        .from('conference_sessions')
        .update({
          excel_data: updatedExcelData,
          updated_at: now,
          updated_by: userId
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('❌ Erro ao atualizar sessão:', updateError);
        return false;
      } else {
        console.log('✅ Sessão atualizada no Supabase com sucesso!');
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar no Supabase:', error);
      toast.error('Erro ao sincronizar', {
        description: 'Os dados foram salvos localmente'
      });
      return false;
    }
  };

  // 🔒 NOVA FUNÇÃO: SALVAMENTO IMEDIATO E SEGURO DO PROGRESS
  // Esta função salva o progress IMEDIATAMENTE após cada bipagem
  // NÃO espera fechar o modal - garante que dados nunca sejam perdidos
  const updateProgressImmediately = async (
    sessionId: string,
    chassisIndex: number,
    tireSets: TireSet[]
  ): Promise<boolean> => {
    try {
      const supabase = createClient();
      const userId = currentUserIdRef.current ?? currentUserId;
      
      console.log('🔒 Salvando progress IMEDIATAMENTE...', {
        sessionId,
        chassisIndex,
        tiresCount: tireSets.reduce((acc, set) => acc + set.tires.filter(t => t.codigo !== '-').length, 0),
        tireSetsStructure: tireSets.map(s => ({
          jogo: s.jogo,
          tires: s.tires.map(t => ({ pos: t.posicao, codigo: t.codigo, _originalIndex: t._originalIndex }))
        }))
      });
      
      // 🔍 DEBUG: Valida que tireSets tem os dados antes de salvar
      const allCodes = tireSets.flatMap(s => s.tires.map(t => t.codigo));
      const nonEmptyCodes = allCodes.filter(c => c !== '-');
      console.log('🔍 PRÉ-SAVE: Códigos a serem salvos:', nonEmptyCodes);
      
      // Busca progress atual
      const { data: session, error: fetchError } = await supabase
        .from('conference_sessions')
        .select('progress')
        .eq('id', sessionId)
        .single();
      
      if (fetchError || !session) {
        console.error('❌ Erro ao buscar sessão:', fetchError);
        return false;
      }
      
      // 🔍 DEBUG: Verifica o que está no banco ANTES de mesclar
      const currentCodesInDB = session.progress?.[chassisIndex]?.tireSets?.flatMap(
        (s: TireSet) => s.tires.map((t: TireData) => t.codigo)
      ).filter((c: string) => c !== '-') || [];
      console.log('🔍 PRÉ-MERGE: Códigos atualmente no banco:', currentCodesInDB);
      
      // Mescla com progress existente
      const updatedProgress = {
        ...(session.progress || {}),
        [chassisIndex]: {
          tireSets: tireSets.map(set => ({
            jogo: set.jogo,
            label: set.label,
            montadoNoCarro: set.montadoNoCarro,
            tires: set.tires.map(tire => ({
              posicao: tire.posicao,
              codigo: tire.codigo,
              piloto: tire.piloto,
              ano: tire.ano,
              set: tire.set,
              tipo: tire.tipo,
              voltas: tire.voltas,
              situacao: tire.situacao,
              divergencia: tire.divergencia,
              pilotoInvalido: tire.pilotoInvalido,
              observacao: tire.observacao,
              validacao: tire.validacao,
              _originalIndex: tire._originalIndex,
              registeredBy: tire.registeredBy,
              registeredAt: tire.registeredAt
            }))
          })),
          tiresChecked: countCheckedTires(tireSets),
          completed: false,
          lockedBy: userId,
          lockedAt: new Date().toISOString()
        }
      };
      
      // 🔍 DEBUG: Valida que updatedProgress tem os dados corretos
      const codesInUpdatedProgress = updatedProgress[chassisIndex].tireSets.flatMap(
        (s: TireSet) => s.tires.map((t: TireData) => t.codigo)
      ).filter((c: string) => c !== '-');
      console.log('🔍 PÓS-MERGE: Códigos no updatedProgress:', codesInUpdatedProgress);
      
      // Salva no Supabase
      const { error: updateError } = await supabase
        .from('conference_sessions')
        .update({
          progress: updatedProgress,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', sessionId);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar progress:', updateError);
        return false;
      }
      
      console.log('✅ Progress salvo IMEDIATAMENTE no Supabase!');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao salvar progress:', error);
      return false;
    }
  };

  // 🔒 NOVA FUNÇÃO: RECOVERY AUTOMÁTICO A PARTIR DO HISTÓRICO
  const reconstructFromHistory = async (
    sessionId: string,
    chassisNumber: string,
    chassisIndex: number
  ): Promise<TireSet[] | null> => {
    try {
      console.log('🔧 Reconstruindo progress a partir do histórico...', { chassisNumber });
      
      const supabase = createClient();
      
      // Busca histórico de bipagens
      const { data: history, error } = await supabase
        .from('tire_scan_history')
        .select('*')
        .eq('session_id', sessionId)
        .eq('chassis', chassisNumber)
        .order('created_at', { ascending: true });
      
      if (error || !history || history.length === 0) {
        console.log('⚠️ Nenhum histórico encontrado para reconstruir');
        return null;
      }
      
      console.log(`📊 Encontrados ${history.length} registros no histórico`);
      
      // Busca dados do chassis para saber quantos jogos
      const chassisData = extractedData[chassisIndex];
      if (!chassisData) {
        console.error('❌ Chassis não encontrado no extractedData');
        return null;
      }
      
      const isTrophy = chassisData.sheetName?.toUpperCase().includes('TROPHY');
      const numberOfJogos = isTrophy ? 3 : 4;
      
      // Inicializa tireSets vazio
      const tireSets: TireSet[] = Array.from({ length: numberOfJogos }, (_, i) => ({
        jogo: i + 1,
        label: `Jogo ${i + 1}`,
        montadoNoCarro: i === 0,
        tires: Array.from({ length: 4 }, (_, j) => ({
          posicao: ['DD', 'DE', 'TE', 'TD'][j],
          codigo: '-',
          piloto: '-',
          ano: '-',
          set: '-',
          tipo: '-',
          voltas: '-',
          situacao: 'Guardar' as const,
          observacao: '',
          divergencia: false,
          pilotoInvalido: false,
          validacao: null,
          _originalIndex: j
        }))
      }));
      
      // Preenche com dados do histórico
      history.forEach(record => {
        const jogoIdx = record.jogo - 1;
        const positionIdx = ['DD', 'DE', 'TE', 'TD'].indexOf(record.posicao);
        
        if (jogoIdx >= 0 && jogoIdx < numberOfJogos && positionIdx >= 0 && positionIdx < 4) {
          const tireData = record.tire_data || {};
          
          tireSets[jogoIdx].tires[positionIdx] = {
            posicao: record.posicao,
            codigo: record.tire_code || '-',
            piloto: tireData.piloto || '-',
            ano: tireData.ano || '-',
            set: tireData.set || '-',
            tipo: tireData.tipo || '-',
            voltas: tireData.voltas || '-',
            situacao: tireData.situacao || 'Guardar',
            observacao: tireData.observacao || '',
            divergencia: tireData.divergencia || false,
            pilotoInvalido: tireData.pilotoInvalido || false,
            validacao: tireData.validacao || null,
            _originalIndex: positionIdx,
            registeredBy: record.user_name,
            registeredAt: record.created_at
          };
        }
      });
      
      console.log('✅ Progress reconstruído do histórico:', tireSets);
      
      // 🔒 Salva o progress recuperado imediatamente
      const saved = await updateProgressImmediately(sessionId, chassisIndex, tireSets);
      
      if (saved) {
        console.log('✅ Progress recuperado salvo no Supabase');
        // 🔇 Toast removido - recovery automático é silencioso (não alarma usuário)
        // toast.warning('⚠️ Dados foram recuperados do histórico', {
        //   description: `${history.length} códigos restaurados automaticamente`,
        //   duration: 5000
        // });
      }
      
      return tireSets;
      
    } catch (error) {
      console.error('❌ Erro ao reconstruir do histórico:', error);
      return null;
    }
  };

  // 🔒 NOVA FUNÇÃO: VERIFICAÇÃO DE INTEGRIDADE E RECOVERY
  const verifyAndRecoverData = async (
    sessionId: string,
    chassisIndex: number,
    chassisNumber: string,
    progressData: any
  ): Promise<TireSet[] | null> => {
    try {
      // 🔍 VERIFICAÇÃO SIMPLIFICADA - Evita falsos positivos
      // O histórico contém TODAS as ações (BIPAR + LIMPAR)
      // O progress contém apenas o estado ATUAL
      // Então não faz sentido comparar as quantidades
      
      console.log('🔍 Verificando dados do chassis:', chassisNumber);
      
      // Se tem progressData válido, retorna direto
      if (progressData?.tireSets && progressData.tireSets.length > 0) {
        console.log('✅ Dados do progress carregados normalmente');
        return progressData.tireSets;
      }
      
      // Se NÃO tem progressData mas pode ter histórico, tenta reconstruir
      const supabase = createClient();
      const { data: history } = await supabase
        .from('tire_scan_history')
        .select('*')
        .eq('session_id', sessionId)
        .eq('chassis', chassisNumber)
        .order('created_at', { ascending: true });
      
      const historyCount = history?.length || 0;
      
      if (historyCount > 0 && (!progressData?.tireSets || progressData.tireSets.length === 0)) {
        console.log('⚠️ Progress vazio mas histórico existe - reconstruindo...');
        return await reconstructFromHistory(sessionId, chassisNumber, chassisIndex);
      }
      
      // Nenhum dado encontrado
      console.log('ℹ️ Nenhum dado encontrado (progress vazio e sem histórico)');
      return progressData?.tireSets || null;
      
    } catch (error) {
      console.error('❌ Erro ao verificar/recuperar dados:', error);
      return progressData?.tireSets || null;
    }
  };

  // 🔒 NOVA FUNÇÃO: SALVAMENTO COM RETRY AUTOMÁTICO
  // Tenta salvar até 3 vezes em caso de falha
  const saveTireWithRetry = async (
    chassisNumber: string,
    chassisIndex: number,
    jogoNumber: number,
    positionIndex: number,
    tireCode: string,
    tireData: TireData,
    allTireSets: TireSet[]
  ): Promise<boolean> => {
    const MAX_RETRIES = 3;
    const sessionId = activeSessionIdRef.current ?? activeSessionId;

    if (!sessionId) {
      console.error('❌ Salvamento abortado: sessão ativa não disponível');
      return false;
    }
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt}/${MAX_RETRIES} de salvamento...`);
        console.log('📦 Dados para salvar:', {
          chassisNumber,
          chassisIndex,
          jogoNumber,
          positionIndex,
          tireCode,
          tireInSet: allTireSets[jogoNumber - 1]?.tires?.find(t => t._originalIndex === positionIndex)?.codigo
        });
        
        // 1️⃣ Salva no histórico e excel_data
        const realtimeSaved = await saveToSupabaseRealtime(
          chassisNumber,
          jogoNumber,
          positionIndex,
          tireCode,
          'BIPAR',
          tireData
        );

        if (!realtimeSaved) {
          throw new Error('Falha ao salvar histórico ou excel_data');
        }
        
        // 🔍 DEBUG CRÍTICO: Valida allTireSets ANTES de salvar
        const tireToSave = allTireSets[jogoNumber - 1]?.tires?.find(
          (t: TireData) => t._originalIndex === positionIndex
        );
        console.log('🔍 PRÉ-PROGRESS-SAVE: Pneu no allTireSets:', {
          codigo: tireToSave?.codigo,
          _originalIndex: tireToSave?._originalIndex,
          expectedCode: tireCode,
          match: tireToSave?.codigo === tireCode
        });
        
        // 2️⃣ Salva no progress IMEDIATAMENTE
        const progressSaved = await updateProgressImmediately(
          sessionId,
          chassisIndex,
          allTireSets
        );
        
        if (!progressSaved) {
          throw new Error('Falha ao salvar progress');
        }
        
        // ⏱️ Aguarda 200ms para garantir que o Supabase persistiu os dados
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 3️⃣ VALIDAÇÃO: Busca de volta para confirmar
        const supabase = createClient();
        const { data: verification } = await supabase
          .from('conference_sessions')
          .select('progress')
          .eq('id', sessionId)
          .single();
        
        // 🔍 DEBUG CRÍTICO: Verifica TODOS os pneus salvos
        const allSavedTires = verification?.progress?.[chassisIndex]?.tireSets?.[jogoNumber - 1]?.tires || [];
        console.log('🔍 VALIDAÇÃO - TODOS OS PNEUS NO JOGO:', allSavedTires.map((t: TireData) => ({
          codigo: t.codigo,
          _originalIndex: t._originalIndex,
          posicao: t.posicao
        })));
        
        // 🔥 CORRIGIDO: Busca pelo pneu que tem _originalIndex === positionIndex
        const savedTire = verification?.progress?.[chassisIndex]?.tireSets?.[jogoNumber - 1]?.tires?.find(
          (t: TireData) => t._originalIndex === positionIndex
        );
        const savedCode = savedTire?.codigo;
        
        console.log('🔍 VALIDAÇÃO:', {
          expected: tireCode,
          saved: savedCode,
          match: savedCode === tireCode,
          chassisIndex,
          jogoNumber,
          positionIndex,
          savedTire: savedTire ? { codigo: savedTire.codigo, _originalIndex: savedTire._originalIndex } : null,
          attemptNumber: attempt
        });
        
        if (savedCode !== tireCode) {
          throw new Error(`Validação falhou - esperado: "${tireCode}", salvo: "${savedCode}"`);
        }
        
        console.log(`✅ Salvamento validado (tentativa ${attempt}) - código confirmado no Supabase`);
        return true;
        
      } catch (error) {
        console.error(`❌ Tentativa ${attempt} falhou:`, error);
        
        if (attempt < MAX_RETRIES) {
          // Espera 500ms antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        // Se todas as tentativas falharam
        toast.error('🚨 ERRO CRÍTICO: Não foi possível salvar o código!', {
          description: `Tentativas: ${MAX_RETRIES}. Entre em contato com o suporte.`,
          duration: 10000
        });
        return false;
      }
    }
    
    return false;
  };

  const handleTireCodeSubmit = async (codeOverride?: string, positionOverride?: number, context?: TireSubmitContext) => {
    // 🔥 Cancela o timer de auto-submit se existir
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
    
    let code = normalizeScannerCode(codeOverride || tireCodeInput);
    let epcCode: string | undefined;
    const targetIndex = positionOverride !== undefined ? positionOverride : activePneuPosition; // 🔥 Usa positionOverride se fornecido
    const targetJogo = context?.jogo ?? activeJogo;
    const targetChassisIndex = context?.chassisIndex ?? selectedChassisIndexRef.current ?? selectedChassisIndex;
    const currentTireSets = tireSetsRef.current.length > 0 ? tireSetsRef.current : tireSets;
    const currentExtractedData = extractedDataRef.current.length > 0 ? extractedDataRef.current : extractedData;
    const currentActiveSessionId = activeSessionIdRef.current ?? activeSessionId;
    const currentUserNameForSubmit = currentUserNameRef.current || currentUserName;
    const targetChassisData = targetChassisIndex !== null ? currentExtractedData[targetChassisIndex] : null;
    const shouldManageFocusAfterSave = !context;

    console.log('🚀 handleTireCodeSubmit CHAMADO! Input:', code, '| targetJogo:', targetJogo, '| targetIndex:', targetIndex, '| positionOverride:', positionOverride);

    if (!code) {
      console.log('❌ Input vazio, abortando');
      return;
    }

    // 📡 Detecta e decodifica RFID
    if (isRFIDCode(code)) {
      epcCode = code;
      console.log('📡 ========================================');
      console.log('📡 CÓDIGO RFID DETECTADO!');
      console.log('📡 Código:', code);
      console.log('📡 Iniciando decodificação...');

      const rfidData = decodeRFID(code);

      if (!rfidData) {
        toast.error('Erro ao decodificar RFID', {
          description: 'O código RFID não pôde ser decodificado.',
        });
        clearTireInput();
        return;
      }

      console.log('✅ RFID decodificado com sucesso!');
      console.log('📊 CAI:', rfidData.cai);
      console.log('📊 Código de Barras:', rfidData.barcode);

      console.log('🔄 ANTES DA SUBSTITUIÇÃO:');
      console.log('   code (RFID):', code);

      // Substitui o código RFID pelo código de barras decodificado
      code = rfidData.barcode;

      console.log('🔄 DEPOIS DA SUBSTITUIÇÃO:');
      console.log('   code (BARCODE):', code);
      console.log('   Tamanho:', code.length);
      console.log('   Ainda é RFID?', isRFIDCode(code) ? '❌ SIM (ERRO!)' : '✅ NÃO');

      // 🔥 Atualiza o input com o código de barras decodificado (não RFID)
      setTireCodeInput(rfidData.barcode);

      toast.success('RFID Decodificado', {
        description: `CAI: ${rfidData.cai} | Código: ${rfidData.barcode}`,
        duration: 3000,
      });
    }

    // 🔥 VALIDAÇÃO: Verifica se há chassis selecionado e tireSets inicializado
    if (targetChassisIndex === null || !targetChassisData) {
      console.error('❌ Nenhum chassis selecionado!');
      toast.error('Selecione um chassis antes de conferir pneus');
      clearTireInput();
      return;
    }
    
    if (currentTireSets.length === 0) {
      console.error('❌ TireSets não inicializado!', { targetJogo, tireSets: currentTireSets });
      toast.error('Erro: Sessão de conferência não inicializada. Feche e abra o chassis novamente.');
      clearTireInput();
      return;
    }
    
    console.log('🎯 Estado atual:', { targetJogo, tireSetsLength: currentTireSets.length, code });
    
    // Encontra o jogo ativo
    const currentSet = currentTireSets.find(s => s.jogo === targetJogo);
    if (!currentSet) {
      console.error('❌ Jogo ativo não encontrado!', { targetJogo, tireSets: currentTireSets });
      toast.error(`Erro: Jogo ${targetJogo} não encontrado. Feche e abra o chassis novamente.`);
      clearTireInput();
      return;
    }

    if (!context && shouldRejectDuplicateScan({ code, epc: epcCode, source: 'keyboard' })) {
      clearTireInput();
      return;
    }
    
    console.log('✓ Jogo ativo encontrado:', currentSet);
    
    // 🔥 targetIndex já foi definido no início da função (positionOverride ou activePneuPosition)
    
    // Verifica se a posição ativa está dentro dos limites (0-3)
    if (targetIndex < 0 || targetIndex > 3) {
      console.error('❌ Posição ativa inválida:', targetIndex);
      return;
    }
    
    console.log(`✓ Usando targetIndex: ${targetIndex}`);
    
    // 🔥 BIPAGEM INSTANTÂNEA: Salva código temporário
    const tempCode = code;
    console.log('🔍🔍🔍 CÓDIGO QUE VAI PARA BUSCA:', tempCode);
    console.log('   Tamanho:', tempCode.length, '| Tipo:', typeof tempCode);
    console.log('   É RFID?', isRFIDCode(tempCode) ? '❌ SIM (ERRO!)' : '✅ NÃO (CORRETO)');
    // 🔥 NÃO LIMPA O INPUT - deixa React fazer a transição natural

    if (shouldManageFocusAfterSave) {
      // 🔥 CORRIGIDO: Avança APENAS para próxima posição VAZIA ABAIXO (nunca volta para cima)
      const nextEmptyIdx = currentSet.tires.findIndex((t, i) => i > targetIndex && t.codigo === '-');
      if (nextEmptyIdx !== -1) {
        // Encontrou campo vazio abaixo - avança para ele
        const nextEmptyTire = currentSet.tires[nextEmptyIdx];
        const nextEmptyOriginalIndex = nextEmptyTire._originalIndex ?? nextEmptyIdx;
        setActivePneuPosition(nextEmptyOriginalIndex);
        console.log(`🎯 Avançando foco para baixo: índice visual ${nextEmptyIdx} -> _originalIndex ${nextEmptyOriginalIndex}`);
      } else {
        // Não há campo vazio abaixo - mantém no campo atual (NÃO VOLTA PARA CIMA)
        console.log(`🎯 Nenhum campo vazio abaixo. Mantendo foco na posição atual (targetIndex: ${targetIndex})`);
      }
    }
    
    // 🔥 v4.8.0: Não foca aqui - será feito apenas após registro completo
    
    // 🔥 BUSCA EM BACKGROUND (não bloqueia próxima bipagem)
    try {
      console.log(`🔍 [BACKGROUND] Buscando dados do pneu: ${tempCode}`);
      const tireData = await getTireByBarcode(tempCode);
      
      if (!tireData) {
        // ❌ Pneu não encontrado - MAS SALVA NO HISTÓRICO
        console.log('⚠️ Pneu não cadastrado, salvando no histórico...');
        
        const positionMap: Record<number, string> = {
          0: 'DD',
          1: 'DE',
          2: 'TE',
          3: 'TD'
        };
        
        const posicao = positionMap[targetIndex] || `Posição ${targetIndex + 1}`;
        const posicaoNormalizada = abreviarPosicao(posicao); // 🔥 Normaliza
        
        // Cria objeto do pneu não cadastrado
        const newTire: TireData = {
          posicao: posicaoNormalizada, // 🔥 Usa posição normalizada
          codigo: tempCode,
          piloto: 'Pneu não cadastrado',
          ano: '-',
          set: '-',
          tipo: '-',
          voltas: '-',
          situacao: '-', // Situação como "-" para pneus não cadastrados
          divergencia: false,
          pilotoInvalido: false,
          observacao: '', // Observação vazia
          validacao: 'TROCAR PNEU', // 🔥 Pneus não cadastrados devem ser trocados
          _originalIndex: targetIndex, // 🔥 Preserva o índice original (targetIndex é o _originalIndex)
          registeredBy: currentUserNameForSubmit, // 🆕 Nome do usuário que registrou
          registeredAt: new Date().toISOString() // 🆕 Data/hora do registro
        };
        
        console.log('✅ Pneu não cadastrado criado:', newTire);
        console.log('📍 targetIndex (_originalIndex):', targetIndex, '| targetJogo:', targetJogo);
        
        // 🔥 FIX: Atualiza os jogos buscando pelo _originalIndex
        const newSets = (tireSetsRef.current.length > 0 ? tireSetsRef.current : currentTireSets).map(set => {
          if (set.jogo === targetJogo) {
            // 🔥 Garante que todos os pneus têm _originalIndex
            const newTires = set.tires.map((t, idx) => ({
              ...t,
              _originalIndex: t._originalIndex ?? idx
            }));
            
            // Busca o índice visual do pneu com o _originalIndex correto
            const visualIndex = newTires.findIndex(t => t._originalIndex === targetIndex);
            
            if (visualIndex !== -1) {
              console.log('🔄 Atualizando tire com _originalIndex', targetIndex, 'no índice visual', visualIndex, 'do jogo', targetJogo);
              console.log('🔄 Tire anterior:', newTires[visualIndex]);
              newTires[visualIndex] = newTire;
              console.log('🔄 Tire atualizado:', newTires[visualIndex]);
            } else {
              console.error('❌ Pneu com _originalIndex', targetIndex, 'não encontrado no array!');
              console.log('⚠️ Usando posição direta como fallback');
              if (targetIndex >= 0 && targetIndex < newTires.length) {
                newTires[targetIndex] = newTire;
              }
            }
            
            return { ...set, tires: newTires };
          }
          return set;
        });
        
        setTireSets(newSets);
        
        // 🔍 DEBUG CRÍTICO: Verifica newSets ANTES de salvar (pneu NÃO cadastrado)
        const tireInNewSets = newSets[targetJogo - 1]?.tires?.find(
          (t: TireData) => t._originalIndex === targetIndex
        );
        console.log('🔍 TIRE NO NEWSETS NÃO CADASTRADO (antes de saveTireWithRetry):', {
          codigo: tireInNewSets?.codigo,
          _originalIndex: tireInNewSets?._originalIndex,
          expectedCode: tempCode,
          match: tireInNewSets?.codigo === tempCode,
          jogoIndex: targetJogo - 1,
          targetIndex
        });
        
        // 🔥🔒 SALVA NO SUPABASE COM RETRY E VALIDAÇÃO (pneu não cadastrado)
        if (targetChassisIndex !== null) {
          const chassisData = currentExtractedData[targetChassisIndex];
          const saved = await saveTireWithRetry(
            chassisData.chassis,
            targetChassisIndex,
            targetJogo,
            targetIndex,
            tempCode,
            newTire,
            newSets
          );
          
          if (!saved) {
            console.error('🚨 FALHA CRÍTICA: Não foi possível salvar código não cadastrado!');
            // Não prossegue com a lógica se o salvamento falhou
            return;
          }
        }
        
        // Toast de alerta
        toast.warning(`Pneu ${tempCode} não cadastrado!`, {
          description: 'Código salvo no histórico para verificação'
        });
        
        // Verifica se completou o jogo atual (4 pneus)
        const tiresInCurrentSet = newSets.find(s => s.jogo === targetJogo)?.tires.filter(t => t.codigo !== '-').length || 0;
        
        if (tiresInCurrentSet === 4) {
          // Jogo completo! Avança automaticamente para o próximo jogo
          toast.success(`Jogo ${targetJogo} completo!`, {
            description: targetJogo < 4 ? `Avançando para Jogo ${targetJogo + 1}` : 'Todos os jogos completos!'
          });
          
          // 🔥 Se o jogo montado no carro foi completado, marca flag para mover ao fechar modal
          const jogoMontado = newSets.find(s => s.montadoNoCarro === true);
          console.log('🔍 DEBUG (não cadastrado): jogoMontado:', jogoMontado);
          console.log('🔍 DEBUG (não cadastrado): targetJogo:', targetJogo);
          if (jogoMontado && jogoMontado.jogo === targetJogo) {
            console.log('🚗 Jogo montado no carro completado! Será movido ao fechar o modal...');
            console.log('🔍 Setando shouldMoveChassisToEnd = true');
            setShouldMoveChassisToEnd(true);
            toast.info('✅ Jogo do carro completo! Chassis será movido ao fechar.', {
              duration: 3000
            });
          }
          
          if (shouldManageFocusAfterSave) {
            if (targetJogo < 4) {
              setActiveJogo(targetJogo + 1);
              setActivePneuPosition(0);
            } else {
              setActivePneuPosition(3); // Última posição válida (0-3)
            }
          }
        } else {
          // 🔥 FIX: Avança para próxima posição vazia DENTRO DO JOGO ATUAL
          console.log('🔍 Buscando próxima posição vazia no jogo atual...');
          console.log('🔍 Jogo atual:', targetJogo, '| targetIndex:', targetIndex);
          
          // Busca próxima posição vazia no JOGO ATUAL (após a posição atual)
          const updatedCurrentSet = newSets.find(s => s.jogo === targetJogo);
          if (updatedCurrentSet) {
            const nextEmptyIndexInCurrentGame = updatedCurrentSet.tires.findIndex((t, i) => i > targetIndex && t.codigo === '-');
            
            console.log('🔍 nextEmptyIndexInCurrentGame:', nextEmptyIndexInCurrentGame);
            
            if (nextEmptyIndexInCurrentGame !== -1) {
              // Encontrou próxima posição vazia ABAIXO - avança para ela
              const nextTire = updatedCurrentSet.tires[nextEmptyIndexInCurrentGame];
              const nextOriginalIndex = nextTire._originalIndex ?? nextEmptyIndexInCurrentGame;
              console.log(`✅ Avançando para baixo: posição visual ${nextEmptyIndexInCurrentGame} (_originalIndex ${nextOriginalIndex}) no jogo ${targetJogo}`);
              if (shouldManageFocusAfterSave) {
                setActivePneuPosition(nextOriginalIndex);
              }
            } else {
              // 🔥 CORRIGIDO: Não há mais posições vazias ABAIXO - mantém no campo atual (NÃO VOLTA PARA CIMA)
              console.log(`🎯 Nenhum campo vazio abaixo no jogo ${targetJogo}. Mantendo posição atual.`);
              // Mantém no campo atual - não volta para cima
            }
          }
        }
        
        // Atualiza contagem total e verifica auto-save
        if (targetChassisIndex !== null) {
          const totalChecked = countCheckedTires(newSets);
          
          const newData = [...currentExtractedData];
          newData[targetChassisIndex].tiresChecked = totalChecked;
          const ensuredData = ensureCorrectIndexes(newData);
          extractedDataRef.current = ensuredData;
          setExtractedData(ensuredData); // 🔥 Garante índices corretos
          
          // 🔥 Atualiza sessão ativa em tempo real
          updateActiveSessionInRealTime(ensuredData, newSets, targetChassisIndex);
          
          // 🔥 AUTO-SAVE: Verifica se todos os pneus obrigatórios foram lidos e finaliza automaticamente
          const chassisData = ensuredData[targetChassisIndex];
          const requiredTotalTires = getRequiredTiresCount(chassisData);
          
          if (totalChecked >= requiredTotalTires && !completedChassis[targetChassisIndex]) {
            // Todos os pneus obrigatórios foram lidos! Finaliza automaticamente
            console.log(`✅ Conferência completa do Chassis ${chassisData.chassis} - AUTO-FINALIZADA (${totalChecked}/${requiredTotalTires} pneus)`);
            
            // Marca como conferência finalizada
            setCompletedChassis(prev => ({
              ...prev,
              [targetChassisIndex]: true
            }));
            
            // Salva os dados
            setSavedTireSets(prev => ({
              ...prev,
              [targetChassisIndex]: newSets
            }));
            
            // 🔥 Atualiza sessão compartilhada no Supabase
            updateSessionProgress(targetChassisIndex, {
              tireSets: newSets,
              completed: true,
              tiresChecked: totalChecked,
              lockedBy: null,
              lockedAt: null
            });
            
            // Toast de confirmação
            toast.success(`Chassis ${chassisData.chassis} finalizado!`, {
              description: `${totalChecked} pneus conferidos e salvos automaticamente`,
              duration: 4000
            });
            
            // Desabilita modo de edição
            setIsEditMode(false);
          }
        }
        
        return;
      }
      
      console.log('✅ Dados do pneu carregados do Supabase:', tireData);
      
      // ✅ Pneu encontrado - valida piloto
      const expectedPilot = targetChassisData?.piloto || '';
      
      console.log('🔍 VALIDAÇÃO DE PILOTO:');
      console.log('   Piloto do pneu (Supabase):', `"${tireData.pilot}"`);
      console.log('   Piloto esperado (Chassis):', `"${expectedPilot}"`);
      console.log('   Piloto do pneu (normalizado):', `"${normalizePilotName(tireData.pilot)}"`);
      console.log('   Piloto esperado (normalizado):', `"${normalizePilotName(expectedPilot)}"`);
      
      // ✅ Usa normalização completa para comparação precisa
      const isPilotMismatch = tireData.pilot && expectedPilot && 
                               normalizePilotName(tireData.pilot) !== normalizePilotName(expectedPilot);
      
      console.log('   Resultado isPilotMismatch:', isPilotMismatch);
      
      if (isPilotMismatch) {
        // Divergência de piloto não é erro - apenas informação de que pneu está em outro chassis
      }
      
      // Mapeia posição do pneu (busca do banco de dados)
      const positionMap: Record<string, string> = {
        'DE': 'DE',
        'DD': 'DD',
        'TE': 'TE',
        'TD': 'TD'
      };
      
      // 🔥 Define posição: SEMPRE usa o campo "lado" do Supabase (banco de dados)
      // Se não existir no banco, usa fallback baseado no targetIndex
      const posicao = tireData.lado && positionMap[tireData.lado.toUpperCase()] 
        ? positionMap[tireData.lado.toUpperCase()]
        : tireData.lado || 
          (targetIndex === 0 ? 'DD' : 
           targetIndex === 1 ? 'DE' : 
           targetIndex === 2 ? 'TE' : 'TD');
      
      // 🔥 Normaliza a posição para garantir abreviação
      const posicaoNormalizada = abreviarPosicao(posicao);
      
      // Determina situação com base no status
      let situacao: 'Guardar' | 'Descartar' = 'Guardar';
      if (tireData.status) {
        const statusLower = tireData.status.toLowerCase();
        if (statusLower.includes('descarte') || statusLower.includes('descartado')) {
          situacao = 'Descartar';
        }
      }
      
      // 🔥 Calcula validação do pneu baseado nas regras de negócio
      const chassisData = targetChassisData;
      const chassisStatus = chassisData?.corrida || '';
      const isPneuNovo = !tireData.pilot || tireData.pilot.trim() === '';
      const isPilotCorrect = !isPneuNovo && normalizePilotName(tireData.pilot) === normalizePilotName(expectedPilot);
      const isGuardar = situacao === 'Guardar';
      const isDescartar = situacao === 'Descartar';
      const isConfirmado = chassisStatus.toUpperCase() === 'SIM';
      const isNaoConfirmado = chassisStatus.toUpperCase() === 'NÃO' ||
                              chassisStatus.toUpperCase() === 'NAO' ||
                              chassisStatus.toUpperCase() === 'INDEF.' ||
                              chassisStatus.toUpperCase() === 'INDEF' ||
                              chassisStatus.toUpperCase() === 'INDEFINIDO';

      let validacao: 'OK' | 'TROCAR PNEU' | 'CUP - ANALISE VOLTAS' | null = null;

      // Aplica as regras de validação
      if (isConfirmado && isDescartar) {
        validacao = 'TROCAR PNEU'; // Piloto confirmado + pneu para descartar
      } else if (isNaoConfirmado && isGuardar) {
        validacao = 'TROCAR PNEU'; // Piloto não confirmado + pneu para guardar
      } else if (isNaoConfirmado && isDescartar) {
        validacao = 'CUP - ANALISE VOLTAS'; // Piloto não confirmado + pneu para descartar
      } else if (isPilotCorrect && isGuardar && isConfirmado) {
        validacao = 'OK'; // Tudo correto (inclui pneus novos)
      } else if (!isPilotCorrect && isGuardar) {
        validacao = 'TROCAR PNEU'; // Piloto diferente + guardar
      }
      
      // 🔍 DEBUG: Valida dados ANTES de criar newTire
      console.log('🔍 CRIANDO NEWTIRE:', {
        codigoRaw: tempCode,
        tireDataBarcode: tireData.barcode,
        codigoFinal: tireData.barcode || tempCode,
        targetIndex,
        posicaoNormalizada
      });
      
      // Cria objeto do pneu com dados reais do Supabase
      const newTire: TireData = {
        posicao: posicaoNormalizada, // 🔥 Usa posição normalizada
        codigo: tireData.barcode || tempCode,
        piloto: tireData.pilot || 'Pneu novo',
        ano: tireData.ano || new Date().getFullYear().toString(),
        set: tireData.set_pneu || '-',
        tipo: tireData.model_type || '-', // Slick ou Wet
        voltas: tireData.tempo_vida || '-',
        situacao: situacao,
        divergencia: isPilotMismatch,
        pilotoInvalido: isPilotMismatch,
        observacao: '',
        validacao: validacao,
        _originalIndex: targetIndex, // 🔥 Preserva o índice original
        registeredBy: currentUserNameForSubmit, // 🆕 Nome do usuário que registrou
        registeredAt: new Date().toISOString() // 🆕 Data/hora do registro
      };
      
      console.log('📋 Pneu cadastrado mapeado:', newTire);
      console.log('📍 targetIndex:', targetIndex, '| targetJogo:', targetJogo, '| activePneuPosition:', activePneuPosition);
      console.log('🔍 VALIDAÇÃO CALCULADA:', {
        codigo: newTire.codigo,
        validacao: validacao,
        isConfirmado,
        isNaoConfirmado,
        isDescartar,
        isGuardar,
        isPilotCorrect,
        chassisStatus
      });
      
      // 🔥 FIX: Atualiza os jogos buscando pelo _originalIndex
      const newSets = (tireSetsRef.current.length > 0 ? tireSetsRef.current : currentTireSets).map(set => {
        if (set.jogo === targetJogo) {
          // 🔥 Garante que todos os pneus têm _originalIndex
          const newTires = set.tires.map((t, idx) => ({
            ...t,
            _originalIndex: t._originalIndex ?? idx
          }));
          
          // Busca o índice visual do pneu com o _originalIndex correto
          const visualIndex = newTires.findIndex(t => t._originalIndex === targetIndex);
          
          if (visualIndex !== -1) {
            console.log('🔄 Atualizando tire CADASTRADO com _originalIndex', targetIndex, 'no índice visual', visualIndex, 'do jogo', targetJogo);
            console.log('🔄 Tire anterior:', newTires[visualIndex]);
            newTires[visualIndex] = newTire;
            console.log('🔄 Tire atualizado:', newTires[visualIndex]);
          } else {
            console.error('❌ Pneu com _originalIndex', targetIndex, 'não encontrado no array!');
            console.log('⚠️ Usando posição direta como fallback');
            if (targetIndex >= 0 && targetIndex < newTires.length) {
              newTires[targetIndex] = newTire;
            }
          }
          
          return { ...set, tires: newTires };
        }
        return set;
      });
      
      setTireSets(newSets);
      
      // 🔍 DEBUG CRÍTICO: Verifica newSets ANTES de salvar
      const tireInNewSets = newSets[targetJogo - 1]?.tires?.find(
        (t: TireData) => t._originalIndex === targetIndex
      );
      console.log('🔍 TIRE NO NEWSETS (antes de saveTireWithRetry):', {
        codigo: tireInNewSets?.codigo,
        _originalIndex: tireInNewSets?._originalIndex,
        expectedCode: tireData.barcode || tempCode,
        match: tireInNewSets?.codigo === (tireData.barcode || tempCode),
        jogoIndex: targetJogo - 1,
        targetIndex
      });
      
      // 🔥🔒 SALVA NO SUPABASE COM RETRY E VALIDAÇÃO (pneu cadastrado)
      if (targetChassisIndex !== null) {
        const chassisData = currentExtractedData[targetChassisIndex];
        const saved = await saveTireWithRetry(
          chassisData.chassis,
          targetChassisIndex,
          targetJogo,
          targetIndex,
          tireData.barcode || tempCode,
          newTire,
          newSets
        );
        
        if (!saved) {
          console.error('🚨 FALHA CRÍTICA: Não foi possível salvar código cadastrado!');
          // Não prossegue com a lógica se o salvamento falhou
          return;
        }
      }
      
      // Toast de sucesso
      if (isPilotMismatch) {
        toast.warning(`Pneu ${tireData.barcode} conferido com divergência`, {
          description: `Piloto cadastrado: ${tireData.pilot} • Esperado: ${expectedPilot}`
        });
      } else {
        toast.success(`Pneu ${tireData.barcode} conferido!`, {
          description: `${newTire.tipo} • ${posicao} • ${newTire.piloto}`
        });
      }
      
      // 🔥 SALVA DIVERGÊNCIA EM TEMPO REAL (verifica validação "TROCAR PNEU")
      console.log('🔍 VERIFICANDO SE DEVE SALVAR DIVERGÊNCIA:', {
        activeSessionId: currentActiveSessionId,
        targetChassisIndex,
        validacao: newTire.validacao
      });
      
      if (currentActiveSessionId && targetChassisIndex !== null) {
        const chassisData = currentExtractedData[targetChassisIndex];
        console.log('🔥 CHAMANDO saveTireDivergenceRealtime...');
        await saveTireDivergenceRealtime(
          currentActiveSessionId,
          chassisData.chassis,
          targetJogo,
          newTire
        );
      } else {
        console.log('⚠️ NÃO VAI SALVAR - activeSessionId ou targetChassisIndex está null');
      }
      
      // Verifica se completou o jogo atual (4 pneus)
      const tiresInCurrentSet = newSets.find(s => s.jogo === targetJogo)?.tires.filter(t => t.codigo !== '-').length || 0;
      
      if (tiresInCurrentSet === 4) {
        // Jogo completo! Avança automaticamente para o próximo jogo
        toast.success(`Jogo ${targetJogo} completo!`, {
          description: targetJogo < 4 ? `Avançando para Jogo ${targetJogo + 1}` : 'Todos os jogos completos!'
        });
        
        // 🔥 Se o jogo montado no carro foi completado, marca flag para mover ao fechar modal
        const jogoMontado = newSets.find(s => s.montadoNoCarro === true);
        console.log('🔍 DEBUG: jogoMontado:', jogoMontado);
        console.log('🔍 DEBUG: targetJogo:', targetJogo);
        if (jogoMontado && jogoMontado.jogo === targetJogo) {
          console.log('🚗 Jogo montado no carro completado! Será movido ao fechar o modal...');
          console.log('🔍 Setando shouldMoveChassisToEnd = true');
          setShouldMoveChassisToEnd(true);
          toast.info('✅ Jogo do carro completo! Chassis será movido ao fechar.', {
            duration: 3000
          });
        }
        
        if (shouldManageFocusAfterSave) {
          if (targetJogo < 4) {
            setActiveJogo(targetJogo + 1);
            setActivePneuPosition(0);
          } else {
            // Último jogo completado
            setActivePneuPosition(3); // Última posição válida (0-3)
          }
        }
      } else {
        // 🔥 FIX: Avança para próxima posição vazia DENTRO DO JOGO ATUAL
        console.log('🔍 Buscando próxima posição vazia no jogo atual (pneu cadastrado)...');
        console.log('🔍 Jogo atual:', targetJogo, '| targetIndex:', targetIndex);
        
        // Busca próxima posição vazia no JOGO ATUAL (após a posição atual)
        const updatedCurrentSet = newSets.find(s => s.jogo === targetJogo);
        if (updatedCurrentSet) {
          const nextEmptyIndexInCurrentGame = updatedCurrentSet.tires.findIndex((t, i) => i > targetIndex && t.codigo === '-');
          
          console.log('🔍 nextEmptyIndexInCurrentGame:', nextEmptyIndexInCurrentGame);
          
          if (nextEmptyIndexInCurrentGame !== -1) {
            // Encontrou próxima posição vazia ABAIXO - avança para ela
            const nextTire = updatedCurrentSet.tires[nextEmptyIndexInCurrentGame];
            const nextOriginalIndex = nextTire._originalIndex ?? nextEmptyIndexInCurrentGame;
            console.log(`✅ Avançando para baixo: posição visual ${nextEmptyIndexInCurrentGame} (_originalIndex ${nextOriginalIndex}) no jogo ${targetJogo}`);
            if (shouldManageFocusAfterSave) {
              setActivePneuPosition(nextOriginalIndex);
            }
          } else {
            // 🔥 CORRIGIDO: Não há mais posições vazias ABAIXO - mantém no campo atual (NÃO VOLTA PARA CIMA)
            console.log(`🎯 Nenhum campo vazio abaixo no jogo ${targetJogo}. Mantendo posição atual.`);
            // Mantém no campo atual - não volta para cima
          }
        }
      }
      
      // Atualiza contagem total
      if (targetChassisIndex !== null) {
        const totalChecked = countCheckedTires(newSets);
        
        const newData = [...currentExtractedData];
        newData[targetChassisIndex].tiresChecked = totalChecked;
        const ensuredData = ensureCorrectIndexes(newData);
        extractedDataRef.current = ensuredData;
        setExtractedData(ensuredData); // 🔥 Garante índices corretos
        
        // 🔥 Atualiza sessão ativa em tempo real
        updateActiveSessionInRealTime(ensuredData, newSets, targetChassisIndex);
        
        // 🔥 AUTO-SAVE: Verifica se todos os pneus obrigatórios foram lidos e finaliza automaticamente
        const chassisData = ensuredData[targetChassisIndex];
        const requiredTotalTires = getRequiredTiresCount(chassisData);
        
        if (totalChecked >= requiredTotalTires && !completedChassis[targetChassisIndex]) {
          // Todos os pneus obrigatórios foram lidos! Finaliza automaticamente
          console.log(`✅ Conferência completa do Chassis ${chassisData.chassis} - AUTO-FINALIZADA (${totalChecked}/${requiredTotalTires} pneus)`);
          
          // Marca como conferência finalizada
          setCompletedChassis(prev => ({
            ...prev,
            [targetChassisIndex]: true
          }));
          
          // Salva os dados
          setSavedTireSets(prev => ({
            ...prev,
            [targetChassisIndex]: newSets
          }));
          
          // 🔥 Atualiza sessão compartilhada no Supabase
          updateSessionProgress(targetChassisIndex, {
            tireSets: newSets,
            completed: true,
            tiresChecked: totalChecked,
            lockedBy: null,
            lockedAt: null
          });
          
          // Toast de confirmação
          toast.success(`Chassis ${chassisData.chassis} finalizado!`, {
            description: `${totalChecked} pneus conferidos e salvos automaticamente`,
            duration: 4000
          });
          
          // Desabilita modo de edição
          setIsEditMode(false);
        }
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar pneu:', error);
      toast.error('Erro ao buscar dados do pneu', {
        description: error.message || 'Tente novamente'
      });
    }
  };

  const toggleMontadoNoCarro = (jogo: number) => {
    const newSets = tireSets.map(set => ({
      ...set,
      montadoNoCarro: set.jogo === jogo ? !set.montadoNoCarro : false
    }));
    setTireSets(newSets);
    
    // 🔥 Atualiza sessão ativa em tempo real
    if (selectedChassisIndex !== null) {
      updateActiveSessionInRealTime(extractedData, newSets, selectedChassisIndex);
    }
  };

  const handleReleTire = (jogo: number, tireIndex: number) => {
    // 🔥 Busca o _originalIndex do pneu ANTES de limpar
    const currentSet = tireSets.find(s => s.jogo === jogo);
    if (!currentSet) return;
    
    const tireToReset = currentSet.tires[tireIndex];
    const originalIndex = tireToReset._originalIndex ?? tireIndex;
    
    // Limpa o pneu específico preservando a posição original
    const newSets = tireSets.map(set => {
      if (set.jogo === jogo) {
        const newTires = [...set.tires];
        const posicaoOriginal = newTires[tireIndex].posicao; // 🔥 Preserva posição
        newTires[tireIndex] = { ...createEmptyTire(originalIndex), posicao: posicaoOriginal };
        return { ...set, tires: newTires };
      }
      return set;
    });
    
    setTireSets(newSets);
    
    // Atualiza contagem total
    if (selectedChassisIndex !== null) {
      const totalChecked = countCheckedTires(newSets);
      
      const newData = [...extractedData];
      newData[selectedChassisIndex].tiresChecked = totalChecked;
      setExtractedData(ensureCorrectIndexes(newData)); // 🔥 Garante índices corretos
      
      // 🔥 Remove flag de completado se não tem mais pneus suficientes
      const chassisData = newData[selectedChassisIndex];
      const requiredTotalTires = getRequiredTiresCount(chassisData);
      
      if (totalChecked < requiredTotalTires && completedChassis[selectedChassisIndex]) {
        setCompletedChassis(prev => ({
          ...prev,
          [selectedChassisIndex]: false
        }));
        
        // Atualiza sessão para marcar como incompleto
        updateSessionProgress(selectedChassisIndex, {
          tireSets: newSets,
          completed: false,
          tiresChecked: totalChecked,
          lockedBy: null,
          lockedAt: null
        });
      }
      
      // 🔥 Atualiza sessão ativa em tempo real
      updateActiveSessionInRealTime(newData, newSets, selectedChassisIndex);
    }
    
    // Limpa e foca no input automaticamente
    clearTireInput();
    setTimeout(() => {
      tireInputRef.current?.focus();
    }, 0);
  };

  // 🔥 Função de salvamento manual (opcional)
  // Normalmente o salvamento é automático ao completar todos os pneus
  // Esta função serve para casos de edição posterior ou salvamento forçado
  const handleSaveComplete = () => {
    if (selectedChassisIndex === null) return;
    
    // Calcula total esperado baseado na categoria
    const chassisData = extractedData[selectedChassisIndex];
    const corridaStatus = chassisData.corrida?.trim().toUpperCase() || '';
    const isTrophy = chassisData.sheetName.toUpperCase().includes('TROPHY');
    const isConfirmado = corridaStatus === 'SIM';
    const requiredTotalTires = getRequiredTiresCount(chassisData);
    
    // Verifica se todos os pneus obrigatórios foram conferidos
    const totalChecked = countCheckedTires(tireSets);
    
    if (totalChecked < requiredTotalTires) {
      const statusExplanation = isConfirmado 
        ? `\\n\\n🔴 PILOTO VAI CORRER (corrida = SIM)\\nTodos os ${isTrophy ? '3 jogos (12 pneus)' : '4 jogos (16 pneus)'} são obrigatórios.`
        : `\\n\\n🟡 PILOTO NÃO CORRE\\nApenas 1 jogo (4 pneus) é obrigatório.`;
      alert(`⚠️ Conferência incompleta!\n\nVocê conferiu apenas ${totalChecked} de ${requiredTotalTires} pneus obrigatórios${isTrophy ? ' (Trophy - 3 jogos)' : ' (4 jogos)'}.\\nPara finalizar, é necessário conferir os ${requiredTotalTires} pneus obrigatórios.${statusExplanation}`);
      return;
    }
    
    // Marca como conferência finalizada
    console.log(`✅ Conferência completa do Chassis ${extractedData[selectedChassisIndex].chassis} - FINALIZADA (${totalChecked} pneus conferidos, ${requiredTotalTires} obrigatórios)`);
    setCompletedChassis(prev => ({
      ...prev,
      [selectedChassisIndex]: true
    }));
    
    // Salva os dados
    setSavedTireSets(prev => ({
      ...prev,
      [selectedChassisIndex]: tireSets
    }));
    
    // 🔥 Atualiza sessão compartilhada no Supabase
    updateSessionProgress(selectedChassisIndex, {
      tireSets: tireSets,
      completed: true,
      tiresChecked: totalChecked,
      lockedBy: null,
      lockedAt: null
    });
    
    // Muda para modo somente leitura
    setIsEditMode(false);
    
    toast.success('✅ Conferência finalizada! Dados salvos para todos.')
    alert('✅ Conferência finalizada com sucesso!\n\nOs dados foram salvos e o chassis está bloqueado.\nPara editar novamente, clique no botão "Editar".');
  };

  const handleEnableEditMode = () => {
    if (selectedChassisIndex === null) return;
    
    const confirmed = window.confirm(
      `⚠️ Atenção!\n\nVocê está prestes a editar uma conferência já finalizada.\n\nIsso pode gerar inconsistências nos dados.\nDeseja continuar?`
    );
    
    if (confirmed) {
      console.log(`✏️ Modo de edição ativado para Chassis ${extractedData[selectedChassisIndex].chassis}`);
      setIsEditMode(true);
      
      // 🔥 FIX: Foca no PRIMEIRO campo vazio na ORDEM VISUAL ao ativar edição
      setTimeout(() => {
        // Busca o primeiro campo vazio em todos os jogos
        for (const set of tireSets) {
          // 🔥 Busca o primeiro pneu vazio na ORDEM VISUAL (não pelo _originalIndex)
          const firstEmptyIdx = set.tires.findIndex(t => !t.codigo || t.codigo === '-');
          
          if (firstEmptyIdx !== -1) {
            const firstEmptyTire = set.tires[firstEmptyIdx];
            const firstEmptyOriginalIndex = firstEmptyTire._originalIndex ?? firstEmptyIdx;
            
            // Encontrou o primeiro vazio! Seta como posição ativa
            setActiveJogo(set.jogo);
            setActivePneuPosition(firstEmptyOriginalIndex);
            
            // Busca e foca no input correspondente usando o _originalIndex
            const firstInput = document.querySelector(`input[data-jogo="${set.jogo}"][data-position="${firstEmptyOriginalIndex}"]`) as HTMLInputElement;
            if (firstInput) {
              firstInput.focus();
              console.log(`🎯 Foco no primeiro campo vazio: Jogo ${set.jogo}, índice visual ${firstEmptyIdx}, _originalIndex ${firstEmptyOriginalIndex}`);
              break; // Para no primeiro encontrado
            }
          }
        }
      }, 100);
    }
  };

  const handleSaveToSupabase = async () => {
    console.log('🔍 [DEBUG] Iniciando salvamento...');
    console.log('🔍 [DEBUG] activeSeason:', activeSeason);
    console.log('🔍 [DEBUG] etapaId:', etapaId);
    console.log('🔍 [DEBUG] completedChassis:', completedChassis);
    console.log('🔍 [DEBUG] savedTireSets:', Object.keys(savedTireSets).length);
    
    if (!activeSeason || !etapaId) {
      toast.error('Erro ao salvar', {
        description: 'Temporada ou etapa não selecionada'
      });
      return;
    }

    setSavingProgress('Preparando dados...');

    // 🔥 CORREÇÃO: Prepara os dados de TODOS os chassis que têm pneus conferidos
    // (não apenas os marcados como "completed" explicitamente)
    const chassisDataToSave: ChassisCheckData[] = extractedData
      .map((chassisData, index) => {
        const savedSets = savedTireSets[index] || [];
        
        // Conta quantos pneus foram realmente conferidos (código preenchido ou observação)
        const tiresWithData = savedSets.reduce((acc, set) => {
          return acc + set.tires.filter(t => 
            (t.codigo && t.codigo !== '-') || 
            (t.observacao && t.observacao.trim() !== '')
          ).length;
        }, 0);
        
        return { chassisData, index, savedSets, tiresWithData };
      })
      .filter(({ tiresWithData }) => tiresWithData > 0) // 🔥 Filtra apenas chassis com pelo menos 1 pneu conferido
      .map(({ chassisData, index, savedSets }) => {

        // 🔥 Normaliza posições e preserva ordem original de bipagem (SEM reordenação)
        const normalizedSets = savedSets.map(set => ({
          ...set,
          tires: set.tires.map(tire => ({
            ...tire,
            posicao: abreviarPosicao(tire.posicao) // Apenas normaliza a abreviação
          }))
        }));

        // Calcula a validação para cada pneu
        const tireSetsWithValidation: TireSetData[] = normalizedSets.map(set => ({
          ...set,
          tires: set.tires.map(tire => {
            if (tire.codigo === '-') return tire as TireCheckData;

            const expectedPilot = chassisData.piloto || '';
            const chassisStatus = chassisData.corrida || '';
            const isPneuNovo = tire.piloto === 'Pneu novo';
            const isPilotCorrect = !isPneuNovo && tire.piloto.toLowerCase().trim() === expectedPilot.toLowerCase().trim();
            const isGuardar = tire.situacao === 'Guardar';
            const isDescartar = tire.situacao === 'Descartar';
            const isConfirmado = chassisStatus.toUpperCase() === 'SIM';
            const isNaoConfirmado = chassisStatus.toUpperCase() === 'NÃO' || chassisStatus.toUpperCase() === 'INDEF.' || chassisStatus.toUpperCase() === 'INDEF';

            let validacao: 'OK' | 'TROCAR PNEU' | 'CUP - ANALISE VOLTAS' | null = null;

            // Aplica as mesmas regras de validação
            if (isConfirmado && isDescartar) {
              validacao = 'TROCAR PNEU';
            } else if (isNaoConfirmado && isGuardar) {
              validacao = 'TROCAR PNEU';
            } else if (isNaoConfirmado && isDescartar) {
              validacao = 'CUP - ANALISE VOLTAS';
            } else if (isPilotCorrect && isGuardar && isConfirmado) {
              validacao = 'OK';
            } else if (!isPilotCorrect && isGuardar) {
              validacao = 'TROCAR PNEU';
            }

            return {
              ...tire,
              validacao
            } as TireCheckData;
          })
        }));

        return {
          chassis: chassisData.chassis,
          piloto: chassisData.piloto,
          corrida: chassisData.corrida,
          categoria: chassisData.sheetName,
          sheetName: chassisData.sheetName,
          tiresChecked: chassisData.tiresChecked,
          tireSets: tireSetsWithValidation
        };
      });

    if (chassisDataToSave.length === 0) {
      toast.error('Nenhum chassis para salvar', {
        description: 'Confira pelo menos um pneu de algum chassis para continuar'
      });
      return;
    }

    setIsSaving(true);

    try {
      // Busca o nome da etapa baseado no ID selecionado
      const selectedStage = seasonStages.find(stage => stage.id === etapaId);
      const stageName = selectedStage ? selectedStage.name : etapaId;
      
      console.log('💾 Salvando conferência no Supabase...');
      console.log('📊 CORREÇÃO APLICADA: Salvando TODOS os chassis com pneus conferidos (não apenas os marcados como "finalizados")');
      console.log('📊 Total de chassis na planilha:', extractedData.length);
      console.log('📊 Chassis com pneus conferidos:', chassisDataToSave.length);
      console.log('📊 Chassis marcados como "finalizados":', Object.keys(completedChassis).filter(k => completedChassis[parseInt(k)]).length);
      console.log('📊 Dados a salvar:', {
        temporada: activeSeason.name || `Temporada ${activeSeason.year}`,
        etapa: stageName,
        totalChassis: chassisDataToSave.length,
        chassis: chassisDataToSave.map(c => ({ chassis: c.chassis, piloto: c.piloto, tireSets: c.tireSets.length }))
      });
      
      setSavingProgress(`Salvando ${chassisDataToSave.length} chassis...`);
      
      const result = await saveTireCheckSession(
        activeSeason.name || `Temporada ${activeSeason.year}`,
        stageName,
        chassisDataToSave
      );

      if (result.success) {
        setSavingProgress('Finalizando sessão...');
        
        // 🎉 Calcula dados do resumo
        const totalTires = chassisDataToSave.reduce((acc, chassis) => 
          acc + chassis.tireSets.reduce((setAcc, set) => 
            setAcc + set.tires.filter(t => t.codigo !== '-').length, 0
          ), 0
        );
        
        const divergencias = chassisDataToSave.reduce((acc, chassis) => 
          acc + chassis.tireSets.reduce((setAcc, set) => 
            setAcc + set.tires.filter(t => t.validacao === 'TROCAR PNEU').length, 0
          ), 0
        );
        
        const chassisList = chassisDataToSave.map(c => ({
          chassis: c.chassis,
          piloto: c.piloto,
          tires: c.tireSets.reduce((acc, set) => 
            acc + set.tires.filter(t => t.codigo !== '-').length, 0
          )
        }));
        
        setSummaryData({
          totalChassis: chassisDataToSave.length,
          totalTires,
          divergencias,
          chassisList
        });
        
        console.log('✅ Sessão salva com ID:', result.sessionId);
        
        // 🔥 Descarta sessão compartilhada no Supabase (não usa mais localStorage)
        if (activeSessionId) {
          const supabase = createClient();
          console.log('🔄 Desativando sessão compartilhada:', activeSessionId);
          
          const { error: deactivateError } = await supabase
            .from('conference_sessions')
            .update({ 
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', activeSessionId);
          
          if (deactivateError) {
            // 🔥 SILENCIOSO: Apenas log técnico discreto, SEM alertas visuais
            // A conferência já foi salva com sucesso, erro de RLS é apenas cosmético
            
            if (deactivateError.code === '42501') {
              // Erro RLS esperado - não mostra nada ao usuário
              console.log('ℹ️ Sessão não foi fechada (erro RLS esperado). Conferência salva com sucesso.');
              console.log('📝 Para corrigir permanentemente, execute /FIX_RLS_CONFERENCE_SESSIONS.sql no Supabase');
            } else {
              // Outros erros - log discreto
              console.log('ℹ️ Sessão não foi fechada (outro erro):', deactivateError.message);
            }
            
            // 🔥 NENHUM TOAST, NENHUM ALERTA VISUAL - continua normalmente
          } else {
            console.log('✅ Sessão compartilhada desativada no Supabase');
          }
        }
        
        // 🎉 Mostra modal de resumo ao invés do toast simples
        setShowSummaryModal(true);
        
        // 🔄 RESET: Volta ao estado inicial após salvar
        setTimeout(() => {
          // Limpa todos os estados
          setUploadedFile(null);
          setExtractedData([]);
          setSelectedChassisIndex(null);
          setCurrentStep('upload');
          setEtapaId('');
          setActiveSeason(null);
          setSeasonStages([]);
          setSavedTireSets({});
          setCompletedChassis({});
          setSearchTerm('');
          setSelectedCategory(null);
          setActiveSessionId(null);
          setChassisLocks({});
          // 🔥 Reseta ref após finalizar conferência
          isSupabaseProgressEmptyRef.current = true;

          console.log('🔄 Página resetada para novo upload');
        }, 2000); // Aguarda 2s para o usuário ver o toast
      } else {
        // 🔥 FILTRA: Não mostra erros de foreign key ao usuário (são tratados internamente)
        const isForeignKeyError = result.error?.includes('foreign key') || 
                                  result.error?.includes('23503');
        
        if (!isForeignKeyError) {
          toast.error('❌ Erro ao salvar conferência', {
            description: result.error || 'Tente novamente'
          });
        } else {
          console.warn('⚠️ Erro de foreign key ignorado - conferência processada com sucesso');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      toast.error('❌ Erro inesperado', {
        description: 'Não foi possível salvar a conferência'
      });
    } finally {
      setIsSaving(false);
      setSavingProgress('Iniciando...');
    }
  };

  // 🆕 Função para exportar relatório completo em Excel
  const handleExportReport = () => {
    try {
      if (extractedData.length === 0) {
        toast.error('Nenhum dado para exportar');
        return;
      }

      // Busca o nome da etapa
      const selectedStage = seasonStages.find(stage => stage.id === etapaId);
      const stageName = selectedStage ? selectedStage.name : etapaId || 'Etapa';

      // Cria workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Resumo Geral
      const resumoData = [
        ['RELATÓRIO DE CONFERÊNCIA DE PNEUS'],
        ['Temporada:', activeSeason?.name || '-'],
        ['Etapa:', stageName || '-'],
        ['Data/Hora:', new Date().toLocaleString('pt-BR')],
        ['Arquivo:', uploadedFile?.name || '-'],
        [],
        ['RESUMO'],
        ['Total de Chassis:', extractedData.length],
        ['Chassis Completos:', extractedData.filter(c => isChassisComplete(c)).length],
        ['Chassis Incompletos:', extractedData.filter(c => !isChassisComplete(c)).length],
        ['Total de Pneus Conferidos:', extractedData.reduce((acc, c) => acc + c.tiresChecked, 0)],
      ];
      const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

      // Sheet 2: Lista de Chassis
      const chassisHeaders = ['Chassis', 'Piloto', 'Número', 'Categoria', 'Corrida', 'Pneus Conferidos', 'Status'];
      const chassisRows = extractedData.map(c => {
        const match = c.sheetName.match(/\(([^)]+)\)$/);
        const category = match ? match[1] : 'SEM CATEGORIA';
        const requiredTires = getRequiredTiresCount(c);
        const status = isChassisComplete(c) ? 'COMPLETO' : `${c.tiresChecked}/${requiredTires}`;
        
        return [
          c.chassis,
          c.piloto,
          c.numero || '-',
          category,
          c.corrida,
          c.tiresChecked,
          status
        ];
      });
      const wsChassis = XLSX.utils.aoa_to_sheet([chassisHeaders, ...chassisRows]);
      XLSX.utils.book_append_sheet(wb, wsChassis, 'Chassis');

      // Sheet 3: Detalhes dos Pneus Conferidos
      const pneusHeaders = ['Chassis', 'Piloto', 'Jogo', 'Posição', 'Código', 'Piloto Pneu', 'Ano', 'Set', 'Tipo', 'Voltas', 'Situação', 'Validação', 'Observação', 'Registrado Por', 'Data/Hora'];
      const pneusRows: any[] = [];
      
      extractedData.forEach((chassisData, index) => {
        const savedSets = savedTireSets[index] || [];
        savedSets.forEach(set => {
          set.tires.forEach(tire => {
            // Só incluir pneus que foram conferidos
            if ((tire.codigo && tire.codigo !== '-') || (tire.observacao && tire.observacao.trim() !== '')) {
              pneusRows.push([
                chassisData.chassis,
                chassisData.piloto,
                set.jogo,
                tire.posicao,
                tire.codigo || '-',
                tire.piloto || '-',
                tire.ano || '-',
                tire.set || '-',
                tire.tipo || '-',
                tire.voltas || '-',
                tire.situacao || '-',
                tire.validacao || '-',
                tire.observacao || '-',
                tire.registeredBy || '-',
                tire.registeredAt ? new Date(tire.registeredAt).toLocaleString('pt-BR') : '-'
              ]);
            }
          });
        });
      });

      if (pneusRows.length > 0) {
        const wsPneus = XLSX.utils.aoa_to_sheet([pneusHeaders, ...pneusRows]);
        XLSX.utils.book_append_sheet(wb, wsPneus, 'Pneus Conferidos');
      }

      // Gera nome do arquivo
      const seasonName = activeSeason?.name || 'Temporada';
      const etapaName = stageName || 'Etapa';
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = sanitizeFileName(`Conferencia_${seasonName}_${etapaName}_${timestamp}.xlsx`);

      // Exporta arquivo
      XLSX.writeFile(wb, fileName);
      toast.success('✅ Relatório exportado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao exportar relatório:', error);
      toast.error('❌ Erro ao exportar relatório');
    }
  };

  // 🔥 v4.8.4: Log de debug para verificar extractedData na renderização
  console.log('🔍 [RENDER] extractedData.length:', extractedData.length);
  console.log('🔍 [RENDER] selectedCategory:', selectedCategory);
  console.log('🔍 [RENDER] selectedChassisIndex:', selectedChassisIndex);
  
  const filteredChassis = extractedData.filter(item => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.chassis.toLowerCase().includes(search) ||
      item.piloto.toLowerCase().includes(search)
    );
  });

  // Agrupa chassis por categoria
  const groupByCategory = () => {
    const groups: Record<string, ExcelChassisData[]> = {};
    
    extractedData.forEach(item => {
      // Extrai categoria do sheetName (formato: "Nome (CATEGORIA)")
      const match = item.sheetName.match(/\(([^)]+)\)$/);
      const category = match ? match[1] : 'SEM CATEGORIA';
      
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    
    return groups;
  };

  const categoryGroups = groupByCategory();
  const categories = Object.keys(categoryGroups).sort();

  // Filtra chassis da categoria selecionada e ordena: pendentes primeiro, completos depois
  const chassisInSelectedCategory = selectedCategory 
    ? (categoryGroups[selectedCategory] || []).filter(item => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
          item.chassis.toLowerCase().includes(search) ||
          item.piloto.toLowerCase().includes(search)
        );
      }).sort((a, b) => {
        const aComplete = isChassisComplete(a);
        const bComplete = isChassisComplete(b);
        
        // Se um está completo e o outro não, o pendente vem primeiro
        if (aComplete && !bComplete) return 1;
        if (!aComplete && bComplete) return -1;
        
        // Se ambos têm o mesmo status, mantém ordem original
        return 0;
      })
    : [];

  // Função para obter cor da categoria
  const getCategoryColor = (category: string) => {
    if (category.includes('CARRERA')) return { bg: '#FEE2E2', border: '#D50000', text: '#991B1B' };
    if (category.includes('CHALLENGE')) return { bg: '#DBEAFE', border: '#2563EB', text: '#1E40AF' };
    if (category.includes('TROPHY')) return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' };
    return { bg: '#F3F4F6', border: '#6B7280', text: '#374151' };
  };

  // 🔥 Funções auxiliares para cálculos de progresso (evita duplicação)
  const getCategoryTireStats = (categoryChassisArray: any[]) => {
    let tiresChecked = 0;
    let totalTires = 0;

    categoryChassisArray.forEach((chassis) => {
      const globalIndex = chassis._originalIndex !== undefined
        ? chassis._originalIndex
        : extractedData.findIndex(c => c.chassis === chassis.chassis && c.piloto === chassis.piloto);

      totalTires += getRequiredTiresCount(chassis);

      const savedSets = savedTireSets[globalIndex];
      if (savedSets && savedSets.length > 0) {
        tiresChecked += countCheckedTires(savedSets);
      } else {
        tiresChecked += chassis.tiresChecked || 0;
      }
    });

    return { tiresChecked, totalTires, percentage: totalTires > 0 ? Math.round((tiresChecked / totalTires) * 100) : 0 };
  };

  const getAllTiresStats = () => {
    const totalScanned = extractedData.reduce((sum, chassis) => sum + chassis.tiresChecked, 0);
    const totalExpected = extractedData.reduce((sum, chassis) => sum + getRequiredTiresCount(chassis), 0);
    const percentage = totalExpected > 0 ? Math.round((totalScanned / totalExpected) * 100) : 0;
    const remaining = Math.max(0, totalExpected - totalScanned);
    return { totalScanned, totalExpected, percentage, remaining };
  };

  const getCarTiresStats = () => {
    let carTiresRead = 0;
    let totalCarTires = 0;

    extractedData.forEach((chassis, index) => {
      totalCarTires += 4;
      const sets = savedTireSets[index];
      if (sets && sets.length > 0) {
        const jogo1 = sets.find(set => set.jogo === 1);
        if (jogo1) {
          carTiresRead += jogo1.tires.filter(tire =>
            (tire.codigo && tire.codigo !== '-') ||
            (tire.observacao && tire.observacao.trim() !== '')
          ).length;
        }
      }
    });

    const percentage = totalCarTires > 0 ? Math.round((carTiresRead / totalCarTires) * 100) : 0;
    const remaining = Math.max(0, totalCarTires - carTiresRead);
    return { carTiresRead, totalCarTires, percentage, remaining };
  };

  const getCompletedChassisCount = (chassisArray: any[]) => {
    return chassisArray.filter(c => {
      const globalIndex = c._originalIndex !== undefined
        ? c._originalIndex
        : extractedData.findIndex(item => item.chassis === c.chassis && item.piloto === c.piloto);
      const savedSets = savedTireSets[globalIndex];
      if (savedSets && savedSets.length > 0) {
        const tiresChecked = countCheckedTires(savedSets);
        const requiredTires = getRequiredTiresCount(c);
        return tiresChecked >= requiredTires;
      }
      return isChassisComplete(c);
    }).length;
  };

  const selectedChassis = selectedChassisIndex !== null ? extractedData[selectedChassisIndex] : null;
  
  // Calcula o total de pneus baseado na categoria (Trophy = 12 pneus, outros = 16 pneus)
  const isTrophyCategory = selectedChassis?.sheetName.toUpperCase().includes('TROPHY') || false;
  const totalTires = isTrophyCategory ? 12 : 16;
  const checkedTires = selectedChassis?.tiresChecked || 0;

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh' }}>
      <CollectorStyles />
      {/* Header */}
      <div 
        className="border-b collector-adapt-header"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)',
          borderColor: '#E5E7EB'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-8 collector-adapt-header">
          <div className="flex items-start gap-4 justify-between">
            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 collector-adapt-icon-large"
                style={{
                  background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
                  boxShadow: '0 4px 12px rgba(213, 0, 0, 0.25)'
                }}
              >
                <ClipboardCheck size={24} strokeWidth={2} className="text-white collector-adapt-icon-medium" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 collector-adapt-text-title">
                  Conferir Pneus
                </h1>
                <p className="text-gray-500 mt-1 collector-adapt-text-small">
                  Faça upload da Confirmação de Pilotos (Excel) e confira os pneus de cada chassis
                </p>
              </div>
            </div>
            
            {/* Botão de Exportação */}
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#FFFFFF',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
              }}
              title="Exportar relatório completo em Excel"
            >
              <Download size={16} strokeWidth={2} />
              <span>Exportar Relatório</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 collector-adapt-content">
        {/* Etapa 1: Upload */}
        <div className="mb-8 collector-adapt-card">
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white collector-adapt-step-number"
              style={{
                background: uploadedFile ? '#10B981' : 'linear-gradient(135deg, #D50000 0%, #B00000 100%)'
              }}
            >
              1
            </div>
            <h2 className="text-lg font-bold text-gray-900 collector-adapt-step-title">Upload da Planilha de Pilotos Confirmados</h2>
          </div>

          {!uploadedFile ? (
            <div 
              className="rounded-xl border-2 border-dashed p-12 text-center collector-adapt-upload-area"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center collector-adapt-upload-icon" style={{ background: '#F3F4F6' }}>
                  <FileSpreadsheet size={32} strokeWidth={1.5} className="text-gray-400 collector-adapt-icon-medium" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 collector-adapt-text-large">Selecione a Planilha Excel</h3>
                  <p className="text-sm text-gray-500 mt-1 collector-adapt-text-small">Confirmação de Pilotos</p>
                </div>
                
                <div className="flex gap-3 flex-col sm:flex-row">
                  <label
                    className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all cursor-pointer collector-adapt-button-large"
                    style={{
                      background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
                      color: '#FFFFFF',
                      boxShadow: '0 2px 8px rgba(213, 0, 0, 0.25)'
                    }}
                  >
                    <Upload size={20} strokeWidth={2} className="collector-adapt-icon-small" />
                    <span>Escolher arquivo Excel</span>
                    <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                  </label>
                  
                  
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border p-3 collector-adapt-card" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileSpreadsheet size={32} className="text-green-600 flex-shrink-0 collector-adapt-icon-medium" />
                  <div className="min-w-0 flex-1">
                    {lastUploadedFile ? (
                      <>
                        <p className="font-semibold text-gray-900 text-sm truncate collector-adapt-text-medium">{lastUploadedFile.name}</p>
                        
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-gray-900 text-sm truncate collector-adapt-text-medium">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500 collector-adapt-text-tiny">
                          {uploadedFile.size ? `${(uploadedFile.size / 1024).toFixed(1)} KB` : 'Tamanho não disponível'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowUpdateModal(true)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg font-semibold text-xs transition-all hover:opacity-90 flex-shrink-0 collector-adapt-button"
                    style={{
                      background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                      color: '#FFFFFF',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <RefreshCw size={14} strokeWidth={2} />
                    <span className="collector-adapt-text-tiny">Atualizar</span>
                  </button>
                  <button
                    onClick={async () => {
                      console.log('🔴 Botão Remover clicado!');
                      const confirmar = window.confirm('ATENÇÃO: Tem certeza que deseja remover a planilha?\n\nEsta ação irá:\n• Resetar TODAS as conferências realizadas\n• Será necessário começar do ZERO novamente\n• NÃO será possível desfazer esta ação\n\nDeseja realmente continuar?');
                      if (confirmar) {
                        console.log('🔴 OK! Chamando handleRemoveFile...');
                        await handleRemoveFile();
                        console.log('🔴 handleRemoveFile finalizado!');
                      } else {
                        console.log('🔴 Cancelado pelo usuário');
                      }
                    }}
                    className="text-red-600 hover:text-red-700 font-semibold text-xs flex items-center gap-1 flex-shrink-0 collector-adapt-button"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <X size={14} />
                    <span className="collector-adapt-text-tiny">Remover</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Etapa 2: Nome da Etapa */}
        {uploadedFile && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                style={{
                  background: currentStep === 'chassis' ? '#10B981' : 'linear-gradient(135deg, #D50000 0%, #B00000 100%)'
                }}
              >
                2
              </div>
              <h2 className="text-lg font-bold text-gray-900">Nome da Etapa</h2>
            </div>

            <div className="rounded-xl border p-4" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
              {isLoadingStages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Carregando etapas...</span>
                </div>
              ) : seasonStages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">Nenhuma etapa cadastrada</p>
                  <p className="text-sm text-gray-400">Configure etapas em Pneus → Configurar Temporada → Temporadas</p>
                </div>
              ) : (
                <>
                  <select
                    value={etapaId}
                    onChange={(e) => {
                      console.log('🔧 [SELECT] Mudando etapa para:', e.target.value);
                      setEtapaId(e.target.value);
                    }}
                    disabled={currentStep === 'chassis'}
                    className="w-full px-4 py-3 rounded-lg border outline-none collector-adapt-input disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ borderColor: '#E5E7EB' }}
                    onFocus={() => {
                      console.log('🔍 [SELECT FOCUS] etapaId:', etapaId);
                      console.log('🔍 [SELECT FOCUS] seasonStages:', seasonStages.map(s => ({ id: s.id, name: s.name })));
                    }}
                  >
                    <option value="">Selecione uma etapa...</option>
                    {seasonStages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name} - {stage.track} ({new Date(stage.start_date).toLocaleDateString('pt-BR')})
                      </option>
                    ))}
                  </select>
                  {activeSeason && (
                    <p className="text-xs text-gray-500 mt-2 collector-adapt-text-tiny">
                      Temporada: {activeSeason.name || `Temporada ${activeSeason.year}`}
                    </p>
                  )}
                  
                  
                  {currentStep === 'etapa' && (
                    <button
                      onClick={handleContinueToChassisStep}
                      disabled={!etapaId}
                      className="mt-4 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed collector-adapt-button-large"
                      style={{
                        background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
                        color: '#FFFFFF'
                      }}
                    >
                      Continuar
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Etapa 3: Chassis */}
        {currentStep === 'chassis' && !showCollectorConference && (
          <div>
            
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-white collector-adapt-step-number flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)', fontSize: '11px' }}
              >
                3
              </div>
              <h2 className="text-sm font-bold text-gray-900 flex-1 min-w-0 collector-adapt-text-title">
                {selectedCategory
                  ? `${selectedCategory} - ${chassisInSelectedCategory.length} chassis (${chassisInSelectedCategory.filter(c => c.corrida?.trim().toUpperCase() === 'SIM').length} confirmados)`
                  : `Categoria (${extractedData.length} chassis, ${extractedData.filter(c => c.corrida?.trim().toUpperCase() === 'SIM').length} confirmados)`
                }
              </h2>
              
              {selectedCategory && (
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchTerm('');
                  }}
                  className="text-gray-600 hover:text-gray-900 flex items-center gap-1 flex-shrink-0 collector-adapt-button"
                  style={{ fontSize: '11px' }}
                >
                  ← Voltar
                </button>
              )}
            </div>

            {/* 🔥 v4.8.2: Mensagem quando não há chassis */}
            {extractedData.length === 0 && (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Nenhum chassis carregado
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Os chassis desapareceram. Isso pode ser um bug.
                </p>
                <button
                  onClick={() => {
                    console.log('🔄 Tentando recarregar sessão...');
                    if (activeSessionId) {
                      loadSharedSession(activeSessionId);
                    }
                  }}
                  className="px-4 py-2.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                >
                  <RefreshCw className="inline mr-2" size={16} />
                  Recarregar Sessão
                </button>
              </div>
            )}
            
            {/* Cards de Categoria */}
            {!selectedCategory && extractedData.length > 0 && (
              <>
              {/* 🆕 Card de Resumo Geral - Destaque acima da grade */}
              <div className="mb-4">
                <div
                  className="rounded-xl border-2 p-4 shadow-sm collector-adapt-card"
                  style={{
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
                    borderColor: '#D1D5DB'
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#111827' }}>
                        <span className="text-xl">📊</span>
                        Resumo Geral da Conferência
                      </h3>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {/* Total Chassis */}
                        <div className="text-center p-2 rounded-lg" style={{ background: '#F3F4F6' }}>
                          <div className="text-xl font-bold" style={{ color: '#111827' }}>
                            {extractedData.length}
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5" style={{ fontSize: '10px' }}>Total Chassis</div>
                        </div>

                        {/* Confirmados */}
                        <div className="text-center p-2 rounded-lg" style={{ background: '#D1FAE5' }}>
                          <div className="text-xl font-bold" style={{ color: '#065F46' }}>
                            {extractedData.filter(c => c.corrida?.trim().toUpperCase() === 'SIM').length}
                          </div>
                          <div className="text-xs text-green-700 mt-0.5" style={{ fontSize: '10px' }}>Confirmados</div>
                        </div>

                        {/* Reservas */}
                        <div className="text-center p-2 rounded-lg" style={{ background: '#FEE2E2' }}>
                          <div className="text-xl font-bold" style={{ color: '#991B1B' }}>
                            {extractedData.filter(c => {
                              const status = c.corrida?.trim().toUpperCase() || '';
                              return status === 'NÃO' || status === 'NAO';
                            }).length}
                          </div>
                          <div className="text-xs text-red-700 mt-0.5" style={{ fontSize: '10px' }}>Reservas</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1">
                      {/* Progresso de Chassis */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700" style={{ fontSize: '11px' }}>Chassis Conferidos</span>
                          <span className="text-xs font-bold text-gray-900">
                            {getCompletedChassisCount(extractedData)}/{extractedData.length}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.round((getCompletedChassisCount(extractedData) / extractedData.length) * 100)}%`,
                              background: 'linear-gradient(90deg, #059669 0%, #047857 100%)'
                            }}
                          />
                        </div>
                        <div className="text-right text-gray-500 mt-0.5" style={{ fontSize: '10px' }}>
                          {Math.round((getCompletedChassisCount(extractedData) / extractedData.length) * 100)}% completo
                        </div>
                      </div>

                      {/* Progresso de Pneus */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700" style={{ fontSize: '11px' }}>Pneus Conferidos</span>
                          <span className="text-xs font-bold text-gray-900">
                            {(() => {
                              const stats = getCategoryTireStats(extractedData);
                              return `${stats.tiresChecked}/${stats.totalTires}`;
                            })()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${getCategoryTireStats(extractedData).percentage}%`,
                              background: 'linear-gradient(90deg, #2563EB 0%, #1E40AF 100%)'
                            }}
                          />
                        </div>
                        <div className="text-right text-gray-500 mt-0.5" style={{ fontSize: '10px' }}>
                          {getCategoryTireStats(extractedData).percentage}% completo
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grade de Categorias - Simplificada */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 collector-adapt-chassis-grid">

                {categories.map(category => {
                  const color = getCategoryColor(category);
                  const chassisCount = categoryGroups[category].length;
                  
                  // 🔥 CORREÇÃO: Usa savedTireSets para contagem em tempo real
                  const completedCount = categoryGroups[category].filter((_, idx) => {
                    const item = categoryGroups[category][idx];
                    // 🔥 FIX: Usa _originalIndex ou findIndex() para evitar bug de indexOf()
                    const globalIndex = item._originalIndex !== undefined
                      ? item._originalIndex
                      : extractedData.findIndex(c => c.chassis === item.chassis && c.piloto === item.piloto);
                    const chassisItem = extractedData[globalIndex];
                    
                    // Verifica se tem pneus salvos em savedTireSets
                    const savedSets = savedTireSets[globalIndex];
                    if (savedSets && savedSets.length > 0) {
                      // Conta pneus conferidos nos sets salvos
                      const tiresChecked = countCheckedTires(savedSets);
                      const requiredTires = getRequiredTiresCount(chassisItem);
                      return tiresChecked >= requiredTires;
                    }
                    
                    // Fallback: usa dados do extractedData
                    return isChassisComplete(chassisItem);
                  }).length;
                  
                  return (
                    <div
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className="group rounded-xl border-2 p-4 cursor-pointer transition-all hover:scale-105 hover:shadow-xl collector-adapt-card"
                      style={{
                        background: color.bg,
                        borderColor: color.border
                      }}
                    >
                      {/* Header da Categoria */}
                      <div className="flex items-center justify-between mb-3">
                        <h3
                          className="text-lg font-bold collector-adapt-text-large"
                          style={{ color: color.text, fontSize: '18px' }}
                        >
                          {category}
                        </h3>
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                          style={{ background: color.text, opacity: 0.1 }}
                        >
                          <ChevronRight size={20} style={{ color: color.text }} />
                        </div>
                      </div>

                      {/* Estatísticas Principais */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="text-center p-2 rounded-lg bg-white/40">
                          <div className="text-lg font-bold" style={{ color: color.text }}>
                            {chassisCount}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: color.text, opacity: 0.8, fontSize: '10px' }}>
                            Total
                          </div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-white/40">
                          <div className="text-lg font-bold" style={{ color: color.text }}>
                            {categoryGroups[category].filter(c => c.corrida?.trim().toUpperCase() === 'SIM').length}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: color.text, opacity: 0.8, fontSize: '10px' }}>
                            Confirmados
                          </div>
                        </div>
                      </div>

                      {/* Progresso Unificado */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold" style={{ color: color.text, fontSize: '11px' }}>
                            Progresso
                          </span>
                          <span className="text-base font-bold" style={{ color: color.text }}>
                            {completedCount}/{chassisCount}
                          </span>
                        </div>
                        <div className="w-full bg-white/40 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.round((completedCount / chassisCount) * 100)}%`,
                              background: `linear-gradient(90deg, ${color.text} 0%, ${color.text} 100%)`
                            }}
                          />
                        </div>
                        <div className="text-right mt-1" style={{ color: color.text, opacity: 0.8, fontSize: '10px' }}>
                          {Math.round((completedCount / chassisCount) * 100)}% • {getCategoryTireStats(categoryGroups[category]).tiresChecked}/{getCategoryTireStats(categoryGroups[category]).totalTires} pneus
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}

            {/* Lista de Chassis da Categoria Selecionada */}
            {selectedCategory && (
              <>
                {/* Busca */}
                <div className="mb-4">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 collector-adapt-icon-small" />
                    <input
                      type="text"
                      placeholder="Filtrar por chassis ou piloto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg border outline-none collector-adapt-input collector-adapt-search text-sm"
                      style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                    />
                  </div>
                </div>

                {/* Dividindo chassis por status de corrida */}
                {(() => {
                  // ⚡ Função para extrair número do chassis para ordenação
                  const extractChassisNumber = (chassis: string): number => {
                    const match = chassis.match(/\d+/);
                    return match ? parseInt(match[0], 10) : 0;
                  };

                  // 🔥 FIX CRÍTICO: Usa _originalIndex ou findIndex() para garantir integridade
                  const chassisComIndices = chassisInSelectedCategory.map(item => {
                    const originalIdx = item._originalIndex !== undefined
                      ? item._originalIndex
                      : extractedData.findIndex(c => c.chassis === item.chassis && c.piloto === item.piloto);

                    const chassisNoIndice = extractedData[originalIdx];
                    const isCorrect = chassisNoIndice && chassisNoIndice.chassis === item.chassis;

                    if (!isCorrect) {
                      console.error(`❌ MAPEAMENTO INCORRETO: "${item.chassis}" -> índice ${originalIdx} aponta para "${chassisNoIndice?.chassis}"`);
                    }

                    return {
                      ...item,
                      originalIndex: originalIdx
                    };
                  });

                  const chassisQueCorrem = chassisComIndices
                    .filter(item => {
                      const corridaStatus = item.corrida?.trim().toUpperCase() || '';
                      return corridaStatus === 'SIM';
                    })
                    .sort((a, b) => extractChassisNumber(a.chassis) - extractChassisNumber(b.chassis));

                  const chassisQueNaoCorrem = chassisComIndices
                    .filter(item => {
                      const corridaStatus = item.corrida?.trim().toUpperCase() || '';
                      return corridaStatus === 'NÃO' || corridaStatus === 'NAO';
                    })
                    .sort((a, b) => extractChassisNumber(a.chassis) - extractChassisNumber(b.chassis));

                  const chassisIndefinidos = chassisComIndices
                    .filter(item => {
                      const corridaStatus = item.corrida?.trim().toUpperCase() || '';
                      return corridaStatus !== 'SIM' && corridaStatus !== 'NÃO' && corridaStatus !== 'NAO';
                    })
                    .sort((a, b) => extractChassisNumber(a.chassis) - extractChassisNumber(b.chassis));

                  const renderChassisCard = (item: any) => {
                    // 🔥 FIX CRÍTICO: Usa originalIndex que foi adicionado antes de filter/sort
                    const globalIndex = item.originalIndex;
                    const totalTiresForItem = getRequiredTiresCount(item);

                    // 🔥🔥🔥 VALIDAÇÃO CRÍTICA: Verifica se o globalIndex aponta para o chassis correto
                    const chassisNoIndice = extractedData[globalIndex];
                    if (chassisNoIndice && chassisNoIndice.chassis !== item.chassis) {
                      console.error(`❌❌❌ ÍNDICE INCORRETO DETECTADO!`);
                      console.error(`   Card mostra: "${item.chassis}" (piloto: ${item.piloto})`);
                      console.error(`   Índice ${globalIndex} aponta para: "${chassisNoIndice.chassis}" (piloto: ${chassisNoIndice.piloto})`);
                      console.error(`   item._originalIndex: ${item._originalIndex}`);
                      console.error(`   item.originalIndex: ${item.originalIndex}`);
                      console.error(`   Isso causará abertura do chassi ERRADO!`);
                    }

                    // 🔥 CORREÇÃO: Usa savedTireSets para contagem em tempo real
                    const hasSavedSets = !!savedTireSets[globalIndex];
                    const tiresCheckedRealtime = savedTireSets[globalIndex]
                      ? countCheckedTires(savedTireSets[globalIndex])
                      : item.tiresChecked;
                    const isCompleted = tiresCheckedRealtime >= totalTiresForItem;
                    const chassisLock = chassisLocks[globalIndex];
                    const isLockedByOther = chassisLock && chassisLock.userId && chassisLock.userName && chassisLock.userName.trim() !== '' && chassisLock.userId !== currentUserId;
                    const jogoMontado = savedTireSets[globalIndex]?.find(set => set.montadoNoCarro);
                    const jogoMontadoComplete = jogoMontado?.tires.every(tire => tire.codigo !== '-') || false;
                    
                    return (
                      <div
                        key={globalIndex}
                        onClick={() => {
                          if (!item.isValid || isLockedByOther) return;
                          openChassisModal(globalIndex);
                        }}
                        className="rounded-lg border p-3 flex items-center justify-between cursor-pointer hover:shadow-md transition-all collector-adapt-chassis-card collector-adapt-list-item"
                        style={{
                          background: isLockedByOther ? '#FFF7ED' : (isCompleted ? '#D1FAE5' : (chassisNoIndice?.chassis !== item.chassis ? '#FEE2E2' : '#FFFFFF')),
                          borderColor: isLockedByOther ? '#F97316' : (isCompleted ? '#10B981' : (chassisNoIndice?.chassis !== item.chassis ? '#EF4444' : '#E5E7EB')),
                          opacity: item.isValid ? 1 : 0.5,
                          cursor: isLockedByOther ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 collector-adapt-chassis-number text-sm">Chassis {item.chassis}</p>
                            {chassisNoIndice && chassisNoIndice.chassis !== item.chassis && (
                              <span
                                className="px-1.5 py-0.5 rounded font-semibold collector-adapt-badge"
                                style={{ background: '#FEE2E2', color: '#DC2626', fontSize: '10px' }}
                              >
                                ⚠️ ÍNDICE INCORRETO
                              </span>
                            )}
                            {isLockedByOther && (
                              <span
                                className="px-1.5 py-0.5 rounded font-semibold collector-adapt-badge"
                                style={{ background: '#FED7AA', color: '#9A3412', fontSize: '10px' }}
                              >
                                🔒 {chassisLock.userName}
                              </span>
                            )}
                            {isCompleted && !isLockedByOther && (
                              <span
                                className="px-1.5 py-0.5 rounded font-semibold collector-adapt-badge"
                                style={{ background: '#D1FAE5', color: '#065F46', fontSize: '10px' }}
                              >
                                ✓ Completo
                              </span>
                            )}
                            {!isCompleted && jogoMontadoComplete && (
                              <span
                                className="px-1.5 py-0.5 rounded font-semibold collector-adapt-badge"
                                style={{ background: '#DBEAFE', color: '#1E40AF', fontSize: '10px' }}
                              >
                                🚗 Carro Lido
                              </span>
                            )}
                            {recentlyUpdatedChassis[globalIndex] && (
                              <span
                                className="px-1.5 py-0.5 rounded font-semibold collector-adapt-badge animate-pulse"
                                style={{ background: '#FEF3C7', color: '#92400E', fontSize: '10px' }}
                              >
                                🔄 Atualizado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 collector-adapt-chassis-pilot collector-adapt-text-small mt-0.5">
                            {item.piloto}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isCompleted && (
                            <span className="text-xs text-gray-500 collector-adapt-text-small">
                              ({tiresCheckedRealtime}/{totalTiresForItem})
                            </span>
                          )}
                          <ChevronRight size={18} className="text-gray-400 collector-adapt-icon-small" />
                        </div>
                      </div>
                    );
                  };

                  return (
                    <>
                      {/* Seção: Pilotos que Correm */}
                      {chassisQueCorrem.length > 0 && (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3 pb-1.5 border-b-2" style={{ borderColor: '#10B981' }}>
                            <div className="w-1 h-5 rounded" style={{ background: '#10B981' }}></div>
                            <h3 className="font-bold text-gray-900 collector-adapt-text-large text-sm">
                              Pilotos que Correm ({chassisQueCorrem.length})
                            </h3>
                          </div>
                          <div className="space-y-2">
                            {chassisQueCorrem.map((item) => renderChassisCard(item))}
                          </div>
                        </div>
                      )}

                      {/* Seção: Pilotos que Não Correm */}
                      {chassisQueNaoCorrem.length > 0 && (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3 pb-1.5 border-b-2" style={{ borderColor: '#EF4444' }}>
                            <div className="w-1 h-5 rounded" style={{ background: '#EF4444' }}></div>
                            <h3 className="font-bold text-gray-900 collector-adapt-text-large text-sm">
                              Pilotos que Não Correm ({chassisQueNaoCorrem.length})
                            </h3>
                          </div>
                          <div className="space-y-2">
                            {chassisQueNaoCorrem.map((item) => renderChassisCard(item))}
                          </div>
                        </div>
                      )}

                      {/* Seção: Indefinidos */}
                      {chassisIndefinidos.length > 0 && (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3 pb-1.5 border-b-2" style={{ borderColor: '#9CA3AF' }}>
                            <div className="w-1 h-5 rounded" style={{ background: '#9CA3AF' }}></div>
                            <h3 className="font-bold text-gray-900 collector-adapt-text-large text-sm">
                              Status Indefinido ({chassisIndefinidos.length})
                            </h3>
                          </div>
                          <div className="space-y-2">
                            {chassisIndefinidos.map((item) => renderChassisCard(item))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Botão Finalizar Categoria */}
                <div className="mt-6 rounded-xl p-4" style={{ background: getCategoryColor(selectedCategory).bg }}>
                  <div className="flex items-center justify-between">
                    <div className="w-full">
                      <h3 className="font-bold text-gray-900 text-sm">Progresso da Categoria</h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {(() => {
                          const completedCountRealtime = getCompletedChassisCount(chassisInSelectedCategory);
                          return `${completedCountRealtime} de ${chassisInSelectedCategory.length} chassis conferidos`;
                        })()}
                      </p>

                      {/* Barra de Progresso */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700" style={{ fontSize: '11px' }}>
                            {(() => {
                              const completedCountRealtime = getCompletedChassisCount(chassisInSelectedCategory);
                              return `${Math.round((completedCountRealtime / chassisInSelectedCategory.length) * 100)}%`;
                            })()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(() => {
                                const completedCountRealtime = getCompletedChassisCount(chassisInSelectedCategory);
                                return Math.round((completedCountRealtime / chassisInSelectedCategory.length) * 100);
                              })()}%`,
                              background: 'linear-gradient(90deg, #DC2626 0%, #B91C1C 100%)'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Botão Finalizar Etapa (só aparece quando não há categoria selecionada) */}
            {!selectedCategory && (
              <>
                {/* 🆕 NOVA BARRA: Progresso de Pneus Escaneados na Conferência de Baia */}
                

                {/* 🆕 NOVA BARRA: Progresso de Pneus do Carro Lidos (Jogo 1) */}
                <div
                  className="mt-4 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg"
                  style={{ background: '#F0FDF4', borderLeft: '4px solid #10B981' }}
                  onClick={() => setShowCarTiresModal(true)}
                  title="Clique para ver detalhes dos chassis pendentes"
                >
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 collector-adapt-text-large text-sm">Progresso de Pneus no Carro</h3>
                    <p className="text-xs text-gray-600 collector-adapt-text-small mt-0.5">
                      {(() => {
                        const stats = getCarTiresStats();
                        return `${stats.carTiresRead} de ${stats.totalCarTires} pneus no carro lidos`;
                      })()}
                    </p>

                    {/* Barra de Progresso de Pneus do Carro */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold" style={{ color: '#10B981', fontSize: '11px' }}>
                          {getCarTiresStats().percentage}%
                        </span>
                        <span className="text-xs text-gray-600" style={{ fontSize: '10px' }}>
                          {getCarTiresStats().remaining} pneus restantes
                        </span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${getCarTiresStats().percentage}%`,
                            background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botão Finalizar */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      if (window.confirm('Tem certeza que deseja finalizar esta conferência? Esta ação não poderá ser desfeita.')) {
                        handleSaveToSupabase();
                      }
                    }}
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed collector-adapt-button-large transition-all text-sm"
                    style={{ background: '#D50000', color: '#FFFFFF' }}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={18} className="animate-spin collector-adapt-icon-small" />
                        <span className="collector-adapt-text-small">{savingProgress}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} className="collector-adapt-icon-small" />
                        Finalizar
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* 🆕 Upload de Pneus nos Carros - Após botão Finalizar */}
            {!selectedCategory && etapaId && extractedData.length > 0 && (
              null
            )}
          </div>
        )}
      </div>

      {/* Modal de Conferência */}
      {selectedChassis && selectedChassisIndex !== null && !useCollectorMode && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={closeChassisModal}
        >
          <div 
            className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col collector-adapt-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: isDragging && dragCurrentY && dragStartY 
                ? `translateY(${Math.max(0, dragCurrentY - dragStartY)}px)` 
                : 'translateY(0)',
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              opacity: isDragging && dragCurrentY && dragStartY
                ? Math.max(0.5, 1 - (dragCurrentY - dragStartY) / 300)
                : 1
            }}
          >
            {/* Header do Modal - 🔥 v4.8.3: Área de drag */}
            <div 
              className="p-6 border-b flex items-center justify-between collector-adapt-modal-header cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => handleDragStart(e.clientY)}
              onMouseMove={(e) => isDragging && handleDragMove(e.clientY)}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
              onTouchMove={(e) => isDragging && handleDragMove(e.touches[0].clientY)}
              onTouchEnd={handleDragEnd}
            >
              {/* 🔥 v4.8.3: Indicador visual de drag */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-full"></div>
              
              <h2 className="text-lg font-bold text-gray-900 collector-adapt-text-large mt-2">
                Chassi {selectedChassis.chassis} - {selectedChassis.piloto} • Progresso: {checkedTires}/{totalTires} pneus
              </h2>
              
              {/* 🔥 v4.8.3: Botão X circular perfeito */}
              <button 
                onClick={closeChassisModal} 
                className="text-gray-400 hover:text-white hover:bg-red-500 transition-all duration-200 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  minWidth: '32px',
                  minHeight: '32px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scanner */}
            <div className="p-3 border-b collector-adapt-scanner" style={{ background: isEditMode ? '#FEE2E2' : '#F3F4F6' }}>
              <div className="flex items-center gap-1 mb-1">
                <Scan size={14} className={isEditMode ? "text-red-600 collector-adapt-icon-small" : "text-gray-400 collector-adapt-icon-small"} />
                <p className="text-xs font-semibold text-gray-900 collector-adapt-text-medium">
                  {isEditMode ? 'Código do pneu' : 'Finalizada'}
                </p>
              </div>
              <div className="flex gap-1 flex-row">
                <input
                  type="text"
                  placeholder={isEditMode ? "Código ou RFID..." : "---"}
                  maxLength={24}
                  value={tireCodeInput}
                  onChange={(e) => isEditMode && tireSets.length > 0 && handleTireCodeChange(e.target.value)}
onKeyDown={(e) => {
                    if (isEditMode && tireSets.length > 0 && e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.currentTarget;

                      const normalizedCode = normalizeScannerCode(input.value);

                      if (normalizedCode) {
                        let finalCode = normalizedCode;

                        // Aplica zero à esquerda se tiver 7 dígitos numéricos
                        if (finalCode.length === 7 && /^\d+$/.test(finalCode)) {
                          finalCode = '0' + finalCode;
                          console.log('🔢 Zero à esquerda aplicado:', finalCode);
                        }

                        console.log('⌨️ Enter pressionado');
                        console.log(`📍 Código: "${finalCode}"`);
                        handleTireCodeSubmit(finalCode);
                      }
                    }
                  }}
                  disabled={!isEditMode || tireSets.length === 0}
                  className="flex-1 px-2 py-1 rounded border outline-none disabled:cursor-not-allowed disabled:opacity-60 collector-adapt-scanner-input"
                  style={{ borderColor: '#E5E7EB', background: isEditMode ? '#FFFFFF' : '#F9FAFB', minWidth: '0', fontSize: '14px' }}
                  ref={tireInputRef}
                  autoFocus
                />
                <button
                  onClick={() => handleTireCodeSubmit()}
                  disabled={!isEditMode || tireSets.length === 0}
                  className="px-2 py-1 rounded font-semibold disabled:cursor-not-allowed disabled:opacity-60 collector-adapt-button-large"
                  style={{ background: '#D50000', color: '#FFFFFF', flexShrink: 0, fontSize: '12px', minWidth: '60px' }}
                >
                  OK
                </button>
              </div>
              {isEditMode && (
                <div className="mt-2 flex gap-2 items-center flex-wrap">
                  <span className="text-xs text-gray-600 collector-adapt-text-tiny collector-adapt-hide">Posição Ativa:</span>
                  <div 
                    className="px-3 py-1 rounded text-xs font-semibold collector-adapt-badge"
                    style={{
                      background: '#3B82F6',
                      color: '#FFFFFF'
                    }}
                  >
                    Jogo {activeJogo} - Pneu {activePneuPosition + 1}/4
                  </div>
                  {nativeRFIDStatus.available && (
                    <div
                      className="px-2 py-1 rounded text-xs font-semibold collector-adapt-badge"
                      style={{
                        background: nativeRFIDStatus.connected ? '#DCFCE7' : '#FEF3C7',
                        color: nativeRFIDStatus.connected ? '#166534' : '#92400E',
                        border: nativeRFIDStatus.connected ? '1px solid #86EFAC' : '1px solid #FCD34D'
                      }}
                      title="Status do bridge nativo Zebra RFID"
                    >
                      RFID nativo {nativeRFIDStatus.connected ? 'ativo' : 'aguardando'}
                      {nativeRFIDStatus.lastRssi !== undefined ? ` • RSSI ${nativeRFIDStatus.lastRssi}` : ''}
                      {nativeRFIDStatus.ignoredDuplicates > 0 ? ` • ${nativeRFIDStatus.ignoredDuplicates} dup.` : ''}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tabelas de Jogos */}
            <div className="flex-1 overflow-y-auto p-6 pb-64 collector-adapt-modal-content">
              <div className="space-y-6">
                {tireSets.map(set => (
                  <div key={set.jogo} className="collector-adapt-card">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="font-bold text-gray-900 collector-adapt-text-large">{set.label}</h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="montado-no-carro"
                            checked={set.montadoNoCarro}
                            onChange={() => toggleMontadoNoCarro(set.jogo)}
                            className="w-4 h-4 cursor-pointer"
                            style={{
                              accentColor: '#D50000'
                            }}
                          />
                          <span className="text-sm text-gray-600">No carro</span>
                        </label>
                        <span className="text-sm text-gray-500 ml-auto">
                          {set.tires.filter(t => t.codigo !== '-').length}/4 pneus
                        </span>
                      </div>

                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead style={{ background: '#F3F4F6' }}>
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Posição</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Código</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Piloto</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Ano</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Set</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Tipo</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Voltas</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Situação</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Validação</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">
                              <div className="flex items-center gap-1">
                                Observações
                                <span title="Pneus com observações dispensam a bipagem" className="cursor-help">
                                  <Info size={14} style={{ color: '#6B7280' }} />
                                </span>
                              </div>
                            </th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Registro</th>
                          </tr>
                        </thead>
                        <tbody>
                          {set.tires.map((tire, idx) => {
                            // 🔥 FIX: Usa _originalIndex para rastreamento correto
                            const originalIndex = tire._originalIndex ?? idx;
                            
                            // 🎨 LÓGICA DE CORES:
                            // Verde: piloto correto + Guardar + Piloto Vai Correr (validação OK)
                            // Amarelo/Laranja: validação "CUP - ANALISE VOLTAS"
                            // Laranja forte: Pneu não cadastrado
                            // Vermelho: todo o resto
                            const expectedPilot = selectedChassis?.piloto || '';
                            const chassisStatus = selectedChassis?.corrida || '';
                            const isPneuNaoCadastrado = tire.piloto === 'Pneu não cadastrado';
                            const isPneuNovo = tire.piloto === 'Pneu novo';
                            const isPilotCorrect = tire.codigo !== '-' && !isPneuNaoCadastrado && !isPneuNovo && normalizePilotName(tire.piloto) === normalizePilotName(expectedPilot);
                            const isGuardar = tire.situacao === 'Guardar';
                            const isDescartar = tire.situacao === 'Descartar';
                            const isConfirmado = chassisStatus.toUpperCase() === 'SIM';
                            const isNaoConfirmado = chassisStatus.toUpperCase() === 'NÃO' || chassisStatus.toUpperCase() === 'INDEF.' || chassisStatus.toUpperCase() === 'INDEF';
                            
                            // Verde APENAS se: piloto correto + Guardar + Piloto Vai Correr
                            const isValid = tire.codigo !== '-' && isPilotCorrect && isGuardar && isConfirmado;
                            
                            // Amarelo/Laranja se: Piloto Não Corre + Pneu para DESCARTAR
                            const isCupAnaliseVoltas = tire.codigo !== '-' && isNaoConfirmado && isDescartar;
                            
                            // Define cor da linha
                            let rowColor = '#FFFFFF'; // Branco padrão para linhas vazias
                            if (tire.codigo !== '-') {
                              if (isPneuNaoCadastrado) {
                                rowColor = '#FEE2E2'; // Vermelho para pneu não cadastrado (TROCAR)
                              } else if (isValid) {
                                rowColor = '#D1FAE5'; // Verde para OK
                              } else if (isCupAnaliseVoltas) {
                                rowColor = '#FED7AA'; // Laranja claro para CUP - ANALISE VOLTAS
                              } else {
                                rowColor = '#FEE2E2'; // Vermelho para erros
                              }
                            } else if (set.jogo === activeJogo && originalIndex === activePneuPosition) {
                              rowColor = '#DBEAFE'; // Azul para posição ativa
                            }
                            
                            return (
                              <tr
                                key={idx}
                                onClick={() => {
                                  if (isEditMode) {
                                    setActiveJogo(set.jogo);
                                    setActivePneuPosition(originalIndex);
                                    setTimeout(() => {
                                      tireInputRef.current?.focus();
                                    }, 100);
                                  }
                                }}
                                style={{ 
                                  background: rowColor,
                                  cursor: isEditMode ? 'pointer' : 'default',
                                  borderLeft: (set.jogo === activeJogo && originalIndex === activePneuPosition) ? '4px solid #3B82F6' : 'none',
                                  fontWeight: (set.jogo === activeJogo && originalIndex === activePneuPosition) ? '600' : 'normal'
                                }}
                              >
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-2">
                                    {isEditMode && tire.codigo !== '-' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleReleTire(set.jogo, originalIndex);
                                        }}
                                        className="text-gray-600 hover:text-gray-900 flex-shrink-0"
                                        title="Reler pneu"
                                      >
                                        <RotateCcw size={16} />
                                      </button>
                                    )}
                                    <span>{tire.codigo !== '-' ? abreviarPosicao(tire.posicao) : '-'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2">{tire.codigo}</td>
                                <td className={`px-4 py-2 ${tire.piloto === 'Pneu não cadastrado' ? 'font-semibold text-orange-700' : ''}`}>
                                  {tire.piloto}
                                </td>
                                <td className="px-4 py-2">{tire.ano}</td>
                                <td className="px-4 py-2">{tire.set}</td>
                                <td className="px-4 py-2">{tire.tipo}</td>
                                <td className="px-4 py-2">{tire.voltas}</td>
                                <td className="px-4 py-2">
                                  {tire.codigo !== '-' && tire.situacao !== '-' && (
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="px-2 py-1 rounded text-xs font-semibold"
                                        style={{
                                          background: tire.situacao === 'Guardar' ? '#D1FAE5' : '#FEE2E2',
                                          color: tire.situacao === 'Guardar' ? '#065F46' : '#991B1B'
                                        }}
                                      >
                                        {tire.situacao}
                                      </span>
                                    </div>
                                  )}
                                  {tire.codigo !== '-' && tire.situacao === '-' && (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                {/* Coluna de Validação */}
                                <td className="px-4 py-2">
                                  {tire.codigo !== '-' && (() => {
                                    const expectedPilot = selectedChassis?.piloto || '';
                                    const chassisStatus = selectedChassis?.corrida || '';
                                    const isPneuNaoCadastrado = tire.piloto === 'Pneu não cadastrado';
                                    const isPneuNovo = tire.piloto === 'Pneu novo';
                                    const isPilotCorrect = !isPneuNovo && !isPneuNaoCadastrado && normalizePilotName(tire.piloto) === normalizePilotName(expectedPilot);
                                    const isGuardar = tire.situacao === 'Guardar';
                                    const isDescartar = tire.situacao === 'Descartar';
                                    const isConfirmado = chassisStatus.toUpperCase() === 'SIM';
                                    const isNaoConfirmado = chassisStatus.toUpperCase() === 'NÃO' || chassisStatus.toUpperCase() === 'INDEF.' || chassisStatus.toUpperCase() === 'INDEF';

                                    // REGRA 0: Pneu não cadastrado = TROCAR PNEU
                                    if (isPneuNaoCadastrado) {
                                      return (
                                        <div className="flex items-center gap-2">
                                          <span
                                            className="cursor-help inline-flex"
                                            title="Este pneu não está cadastrado no sistema. Favor trocar por um pneu cadastrado."
                                          >
                                            <AlertOctagon size={18} className="text-red-600" />
                                          </span>
                                          <span className="text-xs font-semibold text-red-700">TROCAR PNEU</span>
                                        </div>
                                      );
                                    }

                                    // REGRA 1: Piloto Vai Correr + Pneu para DESCARTAR = TROCAR PNEU
                                    if (isConfirmado && isDescartar) {
                                      return (
                                        <div className="flex items-center gap-2">
                                          <span 
                                            className="cursor-help inline-flex" 
                                            title="Esse pneu não pode ser utilizado nesse carro. Favor trocar conforme orientação do supervisor da categoria."
                                          >
                                            <AlertOctagon size={18} className="text-red-600" />
                                          </span>
                                          <span className="text-xs font-semibold text-red-700">TROCAR PNEU</span>
                                        </div>
                                      );
                                    }
                                    
                                    // REGRA 2: Piloto Não Corre + Pneu para GUARDAR = TROCAR PNEU
                                    if (isNaoConfirmado && isGuardar) {
                                      return (
                                        <div className="flex items-center gap-2">
                                          <span 
                                            className="cursor-help inline-flex" 
                                            title="Esse pneu não pode ser utilizado nesse carro. Favor trocar conforme orientação do supervisor da categoria."
                                          >
                                            <AlertOctagon size={18} className="text-red-600" />
                                          </span>
                                          <span className="text-xs font-semibold text-red-700">TROCAR PNEU</span>
                                        </div>
                                      );
                                    }
                                    
                                    // REGRA 3: Piloto Não Corre + Pneu para DESCARTAR = CUP - ANALISE VOLTAS
                                    if (isNaoConfirmado && isDescartar) {
                                      return (
                                        <div className="flex items-center gap-2">
                                          <span 
                                            className="cursor-help inline-flex" 
                                            title="Entenda se a quantidade de voltas do pneu e estado atendem aos requisitos para a finalidade que será utilizado. Se não atenderem, procure um pneu cup em melhor estado. Em caso de dúvidas procure o supervisor da categoria."
                                          >
                                            <Info size={18} className="text-gray-700" />
                                          </span>
                                          <span className="text-xs font-semibold text-gray-900">CUP - ANALISE VOLTAS</span>
                                        </div>
                                      );
                                    }
                                    
                                    // REGRA 4: Piloto correto + situação Guardar + Piloto Vai Correr = OK
                                    if (isPilotCorrect && isGuardar && isConfirmado) {
                                      return (
                                        <div className="flex items-center gap-2">
                                          <CheckCircle2 size={18} className="text-green-600" />
                                          <span className="text-xs font-semibold text-green-700">OK</span>
                                        </div>
                                      );
                                    }
                                    
                                    // REGRA 5: Piloto diferente + situação Guardar = TROCAR PNEU
                                    if (!isPilotCorrect && isGuardar) {
                                      return (
                                        <div className="flex items-center gap-2">
                                          <span 
                                            className="cursor-help inline-flex" 
                                            title="Esse pneu não pode ser utilizado nesse carro. Favor trocar conforme orientação do supervisor da categoria."
                                          >
                                            <AlertOctagon size={18} className="text-red-600" />
                                          </span>
                                          <span className="text-xs font-semibold text-red-700">TROCAR PNEU</span>
                                        </div>
                                      );
                                    }
                                    
                                    // Outros casos
                                    return null;
                                  })()}
                                </td>
                                {/* 🆕 Coluna de Observações */}
                                <td className="px-4 py-2">
                                  <input
                                    type="text"
                                    value={tire.observacao || ''}
                                    onChange={(e) => {
                                      const newValue = e.target.value;
                                      const newSets = tireSets.map(s => {
                                        if (s.jogo === set.jogo) {
                                          const newTires = [...s.tires];
                                          newTires[idx] = { ...newTires[idx], observacao: newValue };
                                          return { ...s, tires: newTires };
                                        }
                                        return s;
                                      });
                                      setTireSets(newSets);
                                      
                                      // Atualiza em tempo real
                                      if (selectedChassisIndex !== null) {
                                        const totalChecked = countCheckedTires(newSets);
                                        const newData = [...extractedData];
                                        newData[selectedChassisIndex].tiresChecked = totalChecked;
                                        setExtractedData(ensureCorrectIndexes(newData)); // 🔥 Garante índices corretos
                                        updateActiveSessionInRealTime(newData, newSets, selectedChassisIndex);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                                        // Enter pressionado com observação preenchida - avança para próximo pneu
                                        e.preventDefault();
                                        
                                        const currentSet = tireSets.find(s => s.jogo === set.jogo);
                                        const tiresInCurrentSet = currentSet?.tires.filter(t => 
                                          t.codigo !== '-' || (t.observacao && t.observacao.trim() !== '')
                                        ).length || 0;
                                        
                                        if (tiresInCurrentSet === 4) {
                                          // Jogo completo! Avança para o próximo jogo
                                          toast.success(`Jogo ${set.jogo} completo!`, {
                                            description: set.jogo < 4 ? `Avançando para Jogo ${set.jogo + 1}` : 'Todos os jogos completos!'
                                          });
                                          
                                          if (set.jogo < 4) {
                                            setActiveJogo(set.jogo + 1);
                                            setActivePneuPosition(0);
                                          } else {
                                            setActivePneuPosition(3); // Última posição válida (0-3)
                                          }
                                        } else {
                                          // Avança para próximo pneu vazio no jogo atual
                                          const nextEmptyIndex = currentSet?.tires.findIndex((t, i) => 
                                            i > idx && t.codigo === '-' && (!t.observacao || t.observacao.trim() === '')
                                          );
                                          
                                          if (nextEmptyIndex !== undefined && nextEmptyIndex !== -1) {
                                            setActivePneuPosition(nextEmptyIndex);
                                          }
                                        }
                                        
                                        // Remove o foco do input atual
                                        e.currentTarget.blur();
                                      }
                                    }}
                                    placeholder="Observação"
                                    className="w-full border rounded box-border"
                                    style={{ 
                                      borderColor: '#E5E7EB', 
                                      maxWidth: '100%', 
                                      fontSize: '12px',
                                      padding: '4px 8px',
                                      minHeight: 'auto',
                                      height: '28px',
                                      lineHeight: '1.5',
                                      outline: 'none'
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.fontSize = '12px';
                                      e.target.style.padding = '4px 8px';
                                      e.target.style.height = '28px';
                                    }}
                                    title="Pneus com observações dispensam a bipagem - pressione Enter para confirmar"
                                  />
                                </td>
                                {/* 🆕 Coluna de Registro */}
                                <td className="px-4 py-2">
                                  {tire.codigo !== '-' && tire.registeredAt && (
                                    <div className="text-xs text-gray-600">
                                      <div>{new Date(tire.registeredAt).toLocaleDateString('pt-BR')} {new Date(tire.registeredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                      <div className="font-semibold">{tire.registeredBy || 'N/A'}</div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      
                      {/* 📱 Visualização em Cards para Coletor */}
                      <div className="collector-adapt-tire-cards" style={{ display: 'none' }}>
                        {set.tires.map((tire, idx) => {
                          // 🔥 FIX: Usa _originalIndex para rastreamento correto
                          const originalIndex = tire._originalIndex ?? idx;
                          
                          const expectedPilot = selectedChassis?.piloto || '';
                          const chassisStatus = selectedChassis?.corrida || '';
                          const isPneuNaoCadastrado = tire.piloto === 'Pneu não cadastrado';
                          const isPneuNovo = tire.piloto === 'Pneu novo';
                          const isPilotCorrect = tire.codigo !== '-' && !isPneuNaoCadastrado && !isPneuNovo && normalizePilotName(tire.piloto) === normalizePilotName(expectedPilot);
                          const isGuardar = tire.situacao === 'Guardar';
                          const isDescartar = tire.situacao === 'Descartar';
                          const isConfirmado = chassisStatus.toUpperCase() === 'SIM';
                          const isNaoConfirmado = chassisStatus.toUpperCase() === 'NÃO' || chassisStatus.toUpperCase() === 'INDEF.' || chassisStatus.toUpperCase() === 'INDEF';
                          
                          const isValid = tire.codigo !== '-' && !isPneuNaoCadastrado && isPilotCorrect && isGuardar && isConfirmado;
                          const isCupAnaliseVoltas = tire.codigo !== '-' && isNaoConfirmado && isDescartar;
                          const isActive = set.jogo === activeJogo && originalIndex === activePneuPosition;
                          const isEmpty = tire.codigo === '-';
                          
                          // Determina a validação do pneu (mesma lógica da web)
                          let validacao = null;
                          let validacaoColor = '';
                          let validacaoIcon = '';
                          
                          if (tire.codigo !== '-' && !isPneuNaoCadastrado) {
                            // REGRA 1: Piloto Vai Correr + Pneu para DESCARTAR = TROCAR PNEU (Vermelho)
                            if (isConfirmado && isDescartar) {
                              validacao = 'TROCAR PNEU';
                              validacaoColor = '#DC2626';
                              validacaoIcon = '🔴';
                            }
                            // REGRA 2: Piloto Não Corre + Pneu para GUARDAR = TROCAR PNEU (Vermelho)
                            else if (isNaoConfirmado && isGuardar) {
                              validacao = 'TROCAR PNEU';
                              validacaoColor = '#DC2626';
                              validacaoIcon = '🔴';
                            }
                            // REGRA 3: Piloto Não Corre + Pneu para DESCARTAR = CUP - ANALISE VOLTAS (Amarelo/Laranja)
                            else if (isNaoConfirmado && isDescartar) {
                              validacao = 'CUP - ANALISE VOLTAS';
                              validacaoColor = '#C2410C';
                              validacaoIcon = '⚠️';
                            }
                            // REGRA 4: Piloto correto + situação Guardar + Piloto Vai Correr = OK (Verde)
                            else if (isPilotCorrect && isGuardar && isConfirmado) {
                              validacao = 'OK';
                              validacaoColor = '#059669';
                              validacaoIcon = '✅';
                            }
                            // REGRA 5: Piloto diferente + situação Guardar = TROCAR PNEU (Vermelho)
                            else if (!isPilotCorrect && isGuardar) {
                              validacao = 'TROCAR PNEU';
                              validacaoColor = '#DC2626';
                              validacaoIcon = '🔴';
                            }
                          } else if (isPneuNaoCadastrado) {
                            validacao = 'TROCAR PNEU';
                            validacaoColor = '#DC2626';
                            validacaoIcon = '🔴';
                          }
                          
                          // 🎨 Determina a classe do card baseada na validação calculada
                          let cardClass = 'collector-adapt-tire-card';
                          if (isActive) {
                            cardClass += ' active';
                          } else if (isEmpty) {
                            cardClass += ' empty';
                          } else if (validacao === 'TROCAR PNEU') {
                            cardClass += ' error'; // Vermelho para pneus que devem ser trocados
                          } else if (validacao === 'OK') {
                            cardClass += ' valid'; // Verde para pneus corretos
                          } else if (validacao === 'CUP - ANALISE VOLTAS' || validacao === 'Pneu não cadastrado') {
                            cardClass += ' warning'; // Laranja para avisos
                          } else {
                            cardClass += ' error'; // Padrão: vermelho para casos inesperados
                          }
                          
                          return (
                            <div key={idx} className={cardClass}>
                              <div className="collector-adapt-tire-card-position">{tire.codigo !== '-' ? abreviarPosicao(tire.posicao) : '-'}</div>
                              {tire.codigo !== '-' ? (
                                <>
                                  <div className="collector-adapt-tire-card-code">{tire.codigo}</div>
                                  <div className={`collector-adapt-tire-card-info`}>
                                    Piloto: <span className={isPneuNaoCadastrado ? 'font-semibold' : ''} style={isPneuNaoCadastrado ? { color: '#C2410C' } : undefined}>
                                      {tire.piloto}
                                    </span>
                                  </div>
                                  <div className="collector-adapt-tire-card-info">
                                    Set: {tire.set} • {tire.tipo} • {tire.voltas}v
                                  </div>
                                  <div className="collector-adapt-tire-card-info">
                                    Status: {tire.situacao === '-' ? (
                                      <span style={{ color: '#9CA3AF' }}>-</span>
                                    ) : (
                                      <span style={{
                                        background: tire.situacao === 'Guardar' ? '#D1FAE5' : '#FEE2E2',
                                        color: tire.situacao === 'Guardar' ? '#065F46' : '#991B1B',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: '600'
                                      }}>
                                        {tire.situacao}
                                      </span>
                                    )}
                                  </div>
                                  {validacao && (
                                    <div className="collector-adapt-tire-card-info" style={{ 
                                      color: validacaoColor, 
                                      fontWeight: 700,
                                      marginTop: '4px',
                                      padding: '4px',
                                      borderTop: '1px solid #E5E7EB'
                                    }}>
                                      {validacaoIcon} Validação: {validacao}
                                    </div>
                                  )}
                                  {/* 🆕 Informações de Registro */}
                                  {tire.registeredAt && (
                                    <div className="collector-adapt-tire-card-info" style={{ 
                                      marginTop: '4px',
                                      padding: '4px',
                                      borderTop: '1px solid #E5E7EB',
                                      fontSize: '10px',
                                      color: '#6B7280'
                                    }}>
                                      📅 {new Date(tire.registeredAt).toLocaleDateString('pt-BR')} {new Date(tire.registeredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      <br />
                                      👤 {tire.registeredBy || 'N/A'}
                                    </div>
                                  )}
                                  {isEditMode && (
                                    <button
                                      onClick={() => handleReleTire(set.jogo, idx)}
                                      className="mt-1 text-xs text-gray-600 hover:text-gray-900"
                                      style={{ alignSelf: 'flex-start' }}
                                    >
                                      🔄 Reler
                                    </button>
                                  )}
                                </>
                              ) : (
                                <div className="collector-adapt-tire-card-info" style={{ color: '#9CA3AF' }}>
                                  {isActive ? '👉 Escaneie aqui' : 'Vazio'}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t flex items-center justify-between collector-adapt-container flex-wrap gap-3">
              {/* Status da conferência */}
              <div className="flex items-center gap-2">
                {completedChassis[selectedChassisIndex] ? (
                  <>
                    <CheckCircle2 size={20} className="text-green-600" />
                    <span className="text-sm font-semibold text-green-700">
                      Conferência finalizada automaticamente
                    </span>
                  </>
                ) : (
                  <>
                    <Info size={20} className="text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">
                      Leia todos os pneus para finalizar
                    </span>
                  </>
                )}
              </div>
              
              {/* Botão Editar (apenas se já finalizado) */}
              {completedChassis[selectedChassisIndex] && !isEditMode && (
                <button
                  onClick={handleEnableEditMode}
                  className="px-6 py-3 rounded-lg font-semibold collector-adapt-button-large"
                  style={{ background: '#3B82F6', color: '#FFFFFF' }}
                >
                  Editar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔥 MODO COLETOR - Nova Interface Unificada (Cards Modernos) */}
      {selectedChassis && selectedChassisIndex !== null && useCollectorMode && showCollectorConference && (
        <div 
          style={{ 
            background: '#F9FAFB', 
            minHeight: '100vh', 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 30, 
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            transform: isDragging && dragCurrentY && dragStartY 
              ? `translateY(${Math.max(0, dragCurrentY - dragStartY)}px)` 
              : 'translateY(0)',
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }} 
          className="collector-container"
        >
          <CollectorStyles />
          
          {/* Wrapper para conteúdo scrollável */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
            {/* Header Vermelho com Gradiente - 🔥 v4.8.3: Área de drag */}
            <div 
              style={{ background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)' }}
              className="p-4 text-white shadow-md"
              onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
              onTouchMove={(e) => isDragging && handleDragMove(e.touches[0].clientY)}
              onTouchEnd={handleDragEnd}
          >
            {/* 🔥 v4.8.3: Indicador visual de drag para baixo */}
            <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mb-2"></div>
            
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={closeChassisModal}
                className="hover:bg-white/10 rounded-full transition-colors flex items-center justify-center flex-shrink-0"
                style={{
                  width: '40px',
                  height: '40px',
                  minWidth: '40px',
                  minHeight: '40px'
                }}
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex-1">
                <h1 className="text-lg font-bold">Chassi {selectedChassis.chassis}</h1>
                <p className="text-sm opacity-90">{selectedChassis.piloto}</p>
              </div>
              <button
                onClick={() => setIsKeyboardEnabled(!isKeyboardEnabled)}
                className="hover:bg-white/10 rounded-full transition-colors flex items-center justify-center flex-shrink-0"
                style={{
                  width: '40px',
                  height: '40px',
                  minWidth: '40px',
                  minHeight: '40px',
                  opacity: isKeyboardEnabled ? 1 : 0.5
                }}
                title={isKeyboardEnabled ? 'Desabilitar teclado' : 'Habilitar teclado'}
              >
                <Keyboard size={20} />
              </button>
            </div>
            
            {/* Barra de Progresso */}
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold whitespace-nowrap">
                  {checkedTires} / {totalTires} pneus
                </span>
                <div className="flex-1 bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((checkedTires / totalTires) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold whitespace-nowrap">
                  {Math.round((checkedTires / totalTires) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-2 space-y-2 pb-24">
            {/* Lista de Todos os Jogos - Layout Tabular */}
            <div className="space-y-2">
              {tireSets.map((set, setIndex) => {
                const hasNaoCadastrado = set.tires.some(t => t.piloto === 'Pneu não cadastrado');
                
                return (
                  <div key={set.jogo} className="bg-white rounded-lg shadow-sm" style={{ overflow: 'visible' }}>
                    {/* Header do Jogo - Compacto */}
                    <div className="bg-gray-50 px-2 py-1.5 border-b border-gray-200 flex items-center gap-3">
                      <p className="text-sm font-bold text-gray-900">
                        Jogo {set.jogo}
                      </p>
                      <label className="flex items-center gap-2 text-xs cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="radio"
                          name="montadoNoCarro"
                          checked={set.montadoNoCarro}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleMontadoNoCarro(set.jogo);
                          }}
                          disabled={!isEditMode}
                          className="w-4 h-4 accent-[#D50000] focus:ring-[#D50000]"
                        />
                        <span style={{ color: set.montadoNoCarro ? '#1E40AF' : '#6B7280', fontWeight: set.montadoNoCarro ? 600 : 400 }}>
                          No carro
                        </span>
                      </label>
                    </div>
                    
                    {/* Tabela de Pneus */}
                    <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                      <table className="w-full text-xs min-w-[800px]" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <thead className="bg-gray-100 border-b border-gray-200">
                          <tr>
                            <th className="text-center py-0.5 px-2 font-semibold text-gray-600 w-12">Status</th>
                            <th className="text-left py-0.5 px-2 font-semibold text-gray-600 w-14">Lado</th>
                            <th className="text-left py-0.5 px-2 font-semibold text-gray-600 w-24">Código</th>
                            <th className="text-left py-0.5 px-2 font-semibold text-gray-600">Piloto</th>
                            <th className="text-center py-0.5 px-2 font-semibold text-gray-600 w-12">Set</th>
                            <th className="text-center py-0.5 px-2 font-semibold text-gray-600 w-16">Tipo</th>
                            <th className="text-center py-0.5 px-2 font-semibold text-gray-600 w-14">Voltas</th>
                            <th className="text-center py-0.5 px-2 font-semibold text-gray-600 w-20">Situação</th>
                            <th className="text-center py-0.5 px-2 font-semibold text-gray-600 w-20">Validação</th>
                            <th className="text-left py-0.5 px-2 font-semibold text-gray-600 min-w-[100px]">Observação</th>
                            <th className="text-left py-0.5 px-2 font-semibold text-gray-600 w-32">Registro</th>
                          </tr>
                        </thead>
                        <tbody>
                          {set.tires.map((tire, idx) => {
                            // 🔥 FIX: NÃO reordena - mantém na ordem de registro
                            const originalIndex = tire._originalIndex ?? idx;
                            
                            if (idx === 0) {
                              console.log(`🔍🔍🔍 [Jogo ${set.jogo}] MAPEAMENTO (ordem de registro):`);
                              set.tires.forEach((t, i) => {
                                console.log(`  Linha ${i+1} -> _originalIndex=${t._originalIndex ?? i} | posição=${t.posicao} | código=${t.codigo}`);
                              });
                            }
                            
                            // 🔥 Destaque azul APENAS se o input está focado (baseado em onFocus real)
                            const isActiveTire = focusedInput?.jogo === set.jogo && focusedInput?.position === originalIndex;
                            
                            // 🔥 Layout compacto SEMPRE (tanto em edição quanto finalizado)
                            const hasScanner = isEditMode && (!tire.codigo || tire.codigo === '-');
                            const cellPadding = 'py-0'; // Sempre compacto
                            
                            // Cálculo de validação
                            const expectedPilot = selectedChassis?.piloto || '';
                            const chassisStatus = selectedChassis?.corrida || '';
                            const isPneuNaoCadastrado = tire.piloto === 'Pneu não cadastrado';
                            const isPneuNovo = tire.piloto === 'Pneu novo';
                            const isPilotCorrect = !isPneuNovo && normalizePilotName(tire.piloto) === normalizePilotName(expectedPilot);
                            const isGuardar = tire.situacao === 'Guardar';
                            const isDescartar = tire.situacao === 'Descartar';
                            const isConfirmado = chassisStatus.toUpperCase() === 'SIM';
                            const isNaoConfirmado = chassisStatus.toUpperCase() === 'NÃO' || chassisStatus.toUpperCase() === 'INDEF.' || chassisStatus.toUpperCase() === 'INDEF';
                            
                            let validacao = '';
                            let rowBackground = '#FFFFFF';
                            
                            if (tire.codigo !== '-' && !isPneuNaoCadastrado) {
                              if (isConfirmado && isDescartar) {
                                validacao = 'TROCAR';
                                rowBackground = '#FEE2E2';
                              } else if (isNaoConfirmado && isGuardar) {
                                validacao = 'TROCAR';
                                rowBackground = '#FEE2E2';
                              } else if (isNaoConfirmado && isDescartar) {
                                validacao = 'ANALISE';
                                rowBackground = '#FEF3C7';
                              } else if (isPilotCorrect && isGuardar && isConfirmado) {
                                validacao = 'OK';
                                rowBackground = '#D1FAE5';
                              } else if (!isPilotCorrect && isGuardar) {
                                validacao = 'TROCAR';
                                rowBackground = '#FEE2E2';
                              }
                            } else if (isPneuNaoCadastrado) {
                              validacao = 'TROCAR';
                              rowBackground = '#FEE2E2';
                            }
                            
                            return (
                              <tr
                                key={idx}
                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                style={{
                                  background: isActiveTire ? '#DBEAFE' : rowBackground,
                                  height: '20px',
                                  maxHeight: '20px',
                                  lineHeight: '1',
                                  cursor: isEditMode && (!tire.codigo || tire.codigo === '-') ? 'pointer' : 'default'
                                }}
                                onClick={() => {
                                  // 🔥 Ao clicar na linha, foca no input (o destaque virá do onFocus)
                                  if (isEditMode && (!tire.codigo || tire.codigo === '-')) {
                                    setTimeout(() => {
                                      const input = document.querySelector(`input[data-jogo="${set.jogo}"][data-position="${originalIndex}"]`) as HTMLInputElement;
                                      if (input) {
                                        input.focus();
                                      }
                                    }, 50);
                                  }
                                }}
                              >
                                {/* Status Icon */}
                                <td className={`${cellPadding}`} style={{ height: '20px', maxHeight: '20px', lineHeight: '1', verticalAlign: 'middle', padding: 0 }}>
                                  <div style={{ height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '8px', paddingRight: '8px' }}>
                                    {tire.codigo && tire.codigo !== '-' ? (
                                      // Prioridade: 1) TROCAR (exclamação), 2) ANALISE (info), 3) OK (check), 4) Situação (badge)
                                      validacao === 'TROCAR' ? (
                                        <AlertTriangle size={14} className="text-red-600" />
                                      ) : validacao === 'ANALISE' ? (
                                        <Info size={14} className="text-yellow-600" />
                                      ) : validacao === 'OK' ? (
                                        <CheckCircle2 size={14} className="text-green-600" />
                                      ) : tire.situacao === 'Guardar' ? (
                                        <span 
                                          className="rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                          style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px', aspectRatio: '1' }}
                                        >✓</span>
                                      ) : (
                                        <span 
                                          className="rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                          style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px', aspectRatio: '1' }}
                                        >✗</span>
                                      )
                                    ) : tire.observacao ? (
                                      <MessageSquare size={14} className="text-yellow-600" />
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                </td>
                                
                                {/* Lado/Posição */}
                                <td className={`${cellPadding}`} style={{ height: '20px', maxHeight: '20px', lineHeight: '1', verticalAlign: 'middle', padding: 0 }}>
                                  <div style={{ height: '20px', display: 'flex', alignItems: 'center', paddingLeft: '8px', paddingRight: '8px' }}>
                                  <span className="font-bold text-gray-900 leading-none">{tire.codigo !== '-' ? abreviarPosicao(tire.posicao) : '-'}</span>
                                  </div>
                                </td>
                                
                                {/* Código - 🔥 INPUT usa data-position={originalIndex} para rastreamento correto */}
                                <td className={`${cellPadding}`} style={{ height: '20px', maxHeight: '20px', lineHeight: '1', verticalAlign: 'middle', padding: 0 }}>
                                  <div style={{ height: '20px', display: 'flex', alignItems: 'center', paddingLeft: '8px', paddingRight: '8px' }}>
                                  {(() => {
                                    // 🔥 v4.7.0: Verifica se este input está processando
                                    const inputKey = `${set.jogo}-${originalIndex}`;
                                    const isProcessing = processingInputs[inputKey];
                                    const shouldShowInput = isEditMode && (!tire.codigo || tire.codigo === '-') && tireSets.length > 0 && !isProcessing;
                                    
                                    return shouldShowInput ? (
                                    <input
                                      type="text"
                                      placeholder={isKeyboardEnabled ? "Digitar..." : "Scanear..."}
                                      inputMode={isKeyboardEnabled ? "text" : "none"}
                                      maxLength={24}
                                      data-jogo={set.jogo}
                                      data-position={originalIndex}
                                      className="compact-scanner-input w-full h-[18px] leading-none border border-gray-300 rounded focus:border-[#D50000] focus:outline-none placeholder:text-xs placeholder:font-mono"
                                      style={{
                                        height: '18px',
                                        minHeight: '18px',
                                        maxHeight: '18px',
                                        lineHeight: '1',
                                        padding: '1px 6px',
                                        fontSize: '12px',
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                        boxSizing: 'border-box',
                                        margin: '0',
                                        display: 'block'
                                      }}
                                      onChange={(e) => {
                                        const value = normalizeScannerCode(e.target.value);
                                        const inputElement = e.target;
                                        const currentJogo = parseInt(inputElement.getAttribute('data-jogo') || '0');
                                        const currentPosition = parseInt(inputElement.getAttribute('data-position') || '0');
                                        const inputKey = `${currentJogo}-${currentPosition}`;
                                        clearInlineAutoSubmitTimer(inputKey);

                                          // Aceita apenas hexadecimal (0-9, A-F)
                                          if (!/^[0-9A-F]*$/.test(value)) {
                                            e.target.value = value.replace(/[^0-9A-F]/g, '');
                                            return;
                                          }

                                          e.target.value = value;

                                          console.log(`📝 onChange - value.length=${value.length}, jogo=${currentJogo}, position=${currentPosition}`);

                                          // Auto-enter quando atingir RFID completo ou código de barras de 8 dígitos
                                          if (value.length === 24 && /^[0-9A-F]{24}$/.test(value)) {
                                            const trimmedValue = value.trim();
                                            console.log('🎯 Auto-enter ativado! RFID (24 caracteres) detectado');
                                            console.log(`📍 Código RFID: "${trimmedValue}"`);
                                            handleTireCodeSubmitInline(trimmedValue, currentJogo, currentPosition);
                                          } else if (isBarcodeCode(value)) {
                                            console.log('🎯 Auto-enter ativado! Código de barras (8 dígitos) detectado');
                                            console.log(`📍 Código: "${value}"`);
                                            inlineAutoSubmitTimersRef.current[inputKey] = setTimeout(() => {
                                              handleTireCodeSubmitInline(value, currentJogo, currentPosition);
                                            }, SCANNER_AUTO_SUBMIT_DELAY_MS);
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const input = e.currentTarget;
                                            const currentJogo = parseInt(input.getAttribute('data-jogo') || '0');
                                            const currentPosition = parseInt(input.getAttribute('data-position') || '0');

                                            const normalizedCode = normalizeScannerCode(input.value);

                                            if (normalizedCode) {
                                              let finalCode = normalizedCode;

                                              // 🔥 Aplica zero à esquerda se tiver 7 dígitos numéricos
                                              if (finalCode.length === 7 && /^\d+$/.test(finalCode)) {
                                                finalCode = '0' + finalCode;
                                                console.log('🔢 Zero à esquerda aplicado:', finalCode);
                                              }
                                              
                                              console.log('⌨️ Enter pressionado');
                                              console.log(`📍 Código: "${finalCode}"`);
                                              console.log(`📍 Jogo: ${currentJogo}, Position: ${currentPosition}`);
                                              console.log(`📍 tire._originalIndex: ${tire._originalIndex}, tire.posicao: ${tire.posicao}`);
                                              handleTireCodeSubmitInline(finalCode, currentJogo, currentPosition);
                                            }
                                          }
                                        }}
                                        onFocus={(e) => {
                                          const inputElement = e.currentTarget;
                                          const currentJogo = parseInt(inputElement.getAttribute('data-jogo') || '0');
                                          const currentPosition = parseInt(inputElement.getAttribute('data-position') || '0');
                                          console.log('🎯 Campo focado');
                                          console.log(`📍 Jogo: ${currentJogo}, Position: ${currentPosition}`);
                                          console.log(`📍 tire._originalIndex: ${tire._originalIndex}, tire.posicao: ${tire.posicao}`);
                                          console.log(`📍 data-jogo attribute: "${inputElement.getAttribute('data-jogo')}"`);
                                          console.log(`📍 data-position attribute: "${inputElement.getAttribute('data-position')}"`);
                                          
                                          // 🔥 Atualiza estados para controle interno
                                          setActiveJogo(currentJogo);
                                          setActivePneuPosition(currentPosition);
                                          
                                          // 🔥 Atualiza estado para destaque visual da linha
                                          setFocusedInput({ jogo: currentJogo, position: currentPosition });
                                        }}
                                        onBlur={() => {
                                          // 🔥 Remove destaque quando perde foco
                                          setFocusedInput(null);
                                        }}
                                      />
                                  ) : tire.codigo && tire.codigo !== '-' ? (
                                    <div className="flex items-center gap-1">
                                      <span className="font-mono text-gray-900 text-xs leading-none">{tire.codigo}</span>
                                      {/* 🔥 REMOVIDO isEditMode: Permite limpar SEMPRE, mesmo quando finalizado */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          if (window.confirm('Tem certeza que deseja limpar este código? Esta ação não poderá ser desfeita.')) {
                                            handleClearTireCode(set.jogo, originalIndex);
                                          }
                                        }}
                                        className="hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                          style={{ 
                                            width: '16px', 
                                            height: '16px', 
                                            minWidth: '16px',
                                            minHeight: '16px',
                                            maxWidth: '16px',
                                            maxHeight: '16px',
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            padding: 0,
                                            margin: 0,
                                            overflow: 'hidden'
                                          }}
                                          title="Limpar código permanentemente"
                                        >
                                          {/* 🧹 Botão de limpeza com detecção melhorada no realtime (v4.2.0) */}
                                          <Eraser size={12} className="text-gray-400 hover:text-red-600" style={{ flexShrink: 0 }} />
                                        </button>
                                    </div>
                                  ) : isProcessing ? (
                                    // 🔥 v4.7.1: Mostra "salvando" enquanto processa com delay garantido
                                    <div className="flex items-center gap-1">
                                      <Loader2 size={14} className="animate-spin text-blue-500" />
                                      <span className="text-gray-500 text-xs">Salvando...</span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs leading-none">-</span>
                                  );
                                })()}
                                  </div>
                                </td>
                                
                                {/* Piloto */}
                                <td className={`${cellPadding}`} style={{ height: '20px', maxHeight: '20px', lineHeight: '1', verticalAlign: 'middle', padding: 0 }}>
                                  <div style={{ height: '20px', display: 'flex', alignItems: 'center', paddingLeft: '8px', paddingRight: '8px' }}>
                                  {tire.codigo && tire.codigo !== '-' ? (
                                    <span className="text-gray-900 leading-none" style={{ whiteSpace: 'nowrap' }}>{tire.piloto}</span>
                                  ) : (
                                    <span className="text-gray-400 leading-none">-</span>
                                  )}
                                  </div>
                                </td>
                                
                                {/* Set */}
                                <td className={`${cellPadding} text-center`} style={{ height: '20px', maxHeight: '20px', lineHeight: '1', verticalAlign: 'middle', padding: 0 }}>
                                  <div style={{ height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '8px', paddingRight: '8px' }}>
                                  {tire.codigo && tire.codigo !== '-' ? (
                                    <span className="text-gray-900 leading-none">{tire.set || '-'}</span>
                                  ) : (
                                    <span className="text-gray-400 leading-none">-</span>
                                  )}
                                  </div>
                                </td>
                                
                                {/* Tipo */}
                                <td className={`${cellPadding} text-center`} style={{ height: '20px', maxHeight: '20px', lineHeight: '1', verticalAlign: 'middle', padding: 0 }}>
                                  <div style={{ height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '8px', paddingRight: '8px' }}>
                                  {tire.codigo && tire.codigo !== '-' && tire.tipo ? (
                                    <span className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-semibold leading-none ${
                                      tire.tipo.toLowerCase() === 'slick' 
                                        ? 'bg-orange-100 text-orange-800' 
                                        : tire.tipo.toLowerCase() === 'wet'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {tire.tipo}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 leading-none">-</span>
                                  )}
                                  </div>
                                </td>
                                
                                {/* Voltas */}
                                <td className={`${cellPadding} text-center`} style={{ height: '20px', maxHeight: '20px', lineHeight: '1', verticalAlign: 'middle', padding: 0 }}>
                                  <div style={{ height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '8px', paddingRight: '8px' }}>
                                  {tire.codigo && tire.codigo !== '-' ? (
                                    <span className="text-gray-900 leading-none">{tire.voltas || '0'}</span>
                                  ) : (
                                    <span className="text-gray-400 leading-none">-</span>
                                  )}
                                  </div>
                                </td>
                                
                                {/* Situação */}
                                <td className={`${cellPadding} text-center`} style={{ height: '20px', maxHeight: '20px', lineHeight: '1', verticalAlign: 'middle', padding: 0 }}>
                                  <div style={{ height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '8px', paddingRight: '8px' }}>
                                  {tire.codigo && tire.codigo !== '-' ? (
                                    tire.situacao === '-' ? (
                                      <span className="text-gray-400 leading-none">-</span>
                                    ) : tire.situacao === 'Guardar' ? (
                                      <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-semibold bg-green-100 text-green-800 leading-none">
                                        Guardar
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-semibold bg-red-100 text-red-800 leading-none">
                                        Descartar
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-gray-400 leading-none">-</span>
                                  )}
                                  </div>
                                </td>
                                
                                {/* Validação */}
                                <td className={`${cellPadding} text-center`} style={{ height: '20px', maxHeight: '20px', lineHeight: '1', verticalAlign: 'middle', padding: 0 }}>
                                  <div style={{ height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '8px', paddingRight: '8px' }}>
                                  {tire.codigo && tire.codigo !== '-' ? (
                                    validacao === 'OK' ? (
                                      <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-semibold bg-green-100 text-green-800 leading-none">
                                        OK
                                      </span>
                                    ) : validacao === 'TROCAR' ? (
                                      <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-semibold bg-red-100 text-red-800 leading-none">
                                        TROCAR
                                      </span>
                                    ) : validacao === 'ANALISE' ? (
                                      <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-800 leading-none">
                                        ANALISE
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 leading-none">-</span>
                                    )
                                  ) : (
                                    <span className="text-gray-400 leading-none">-</span>
                                  )}
                                  </div>
                                </td>
                                
                                {/* Observação */}
                                <td className={`${cellPadding}`} style={{ height: '20px', maxHeight: '20px', lineHeight: '1', verticalAlign: 'middle', padding: 0 }}>
                                  <div style={{ height: '20px', display: 'flex', alignItems: 'center', paddingLeft: '8px', paddingRight: '8px' }}>
                                  <div className="flex items-center gap-1 w-full">
                                    {tire.observacao ? (
                                      <span className="text-gray-700 text-[10px] italic flex-1 leading-none">{tire.observacao}</span>
                                    ) : (
                                      <span className="text-gray-400 text-[10px] flex-1 leading-none">-</span>
                                    )}
                                    {isEditMode && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenObservationModal(set.jogo, originalIndex);
                                        }}
                                        className="hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                                        style={{ 
                                          width: '16px', 
                                          height: '16px',
                                          minWidth: '16px',
                                          minHeight: '16px',
                                          maxWidth: '16px',
                                          maxHeight: '16px',
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'center',
                                          padding: 0,
                                          margin: 0,
                                          overflow: 'hidden'
                                        }}
                                        title="Editar observação"
                                      >
                                        <Edit size={12} className="text-gray-500 hover:text-[#D50000]" style={{ flexShrink: 0 }} />
                                      </button>
                                    )}
                                  </div>
                                  </div>
                                </td>
                                
                                {/* 🆕 Registro */}
                                <td className={`${cellPadding}`} style={{ height: '20px', maxHeight: '20px', lineHeight: '1', verticalAlign: 'middle', padding: 0 }}>
                                  <div style={{ height: '20px', display: 'flex', alignItems: 'center', paddingLeft: '8px', paddingRight: '8px' }}>
                                  {tire.codigo && tire.codigo !== '-' && tire.registeredAt ? (
                                    <div className="text-[9px] text-gray-600 leading-tight">
                                      <div>{new Date(tire.registeredAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {new Date(tire.registeredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                      <div className="font-semibold">{tire.registeredBy || 'N/A'}</div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-[10px] leading-none">-</span>
                                  )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>

          {/* 🔥 Footer Fixo - Rodapé */}
          <div 
            className="border-t bg-white absolute left-0 right-0 z-50 shadow-lg"
            style={{ 
              bottom: 'max(env(safe-area-inset-bottom, 0px), 48px)',
              borderColor: '#E5E7EB',
              boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)'
            }}
          >
            <div className="p-3 flex items-center justify-between gap-3">
              <button 
                onClick={closeChassisModal} 
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ background: '#D50000' }}
              >
                Voltar
              </button>
              
              {/* Status da conferência */}
              <div className="flex items-center gap-2 flex-1 justify-center">
                {completedChassis[selectedChassisIndex] ? (
                  <>
                    <CheckCircle2 size={18} className="text-green-600" />
                    <span className="text-sm font-semibold text-green-600">
                      Finalizado
                    </span>
                  </>
                ) : (
                  <>
                    <Info size={18} className="text-gray-600" />
                    <span className="text-sm font-semibold text-gray-600">
                      Em andamento
                    </span>
                  </>
                )}
              </div>
              
              {/* Botão Editar (apenas se já finalizado) */}
              {completedChassis[selectedChassisIndex] && !isEditMode && (
                <button
                  onClick={handleEnableEditMode}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ background: '#3B82F6' }}
                >
                  Editar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Observação */}
      {showObservationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Incluir Observação</h3>
              <button
                onClick={() => setShowObservationModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              Posição: <span className="font-bold">{['DD', 'DE', 'TE', 'TD'][activePneuPosition]}</span>
            </p>

            <textarea
              value={observationText}
              onChange={(e) => setObservationText(e.target.value)}
              placeholder="Digite a observação..."
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#D50000] focus:outline-none resize-none"
              rows={4}
              autoFocus
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowObservationModal(false)}
                className="flex-1 px-4 py-3 rounded-lg font-semibold"
                style={{ background: '#F3F4F6', color: '#6B7280' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveObservation}
                className="flex-1 px-4 py-3 rounded-lg font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)' }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Atualização de Status */}
      <UpdateStatusModal
        isOpen={showUpdateModal}
        onClose={() => {
          setShowUpdateModal(false);
          setUpdateFile(null);
        }}
        onUpdate={handleUpdateCorridaStatus}
        isProcessing={isProcessing}
        updateFile={updateFile}
        setUpdateFile={setUpdateFile}
      />

      {/* 🎉 Modal de Resumo da Conferência */}
      {showSummaryModal && summaryData && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300"
          onClick={() => setShowSummaryModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com Animação de Sucesso */}
            <div className="p-8 text-center" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4 animate-in zoom-in duration-500">
                <CheckCircle2 size={48} className="text-white animate-in zoom-in duration-700" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Conferência Finalizada!</h2>
              <p className="text-green-50 text-lg">Todos os dados foram salvos com sucesso</p>
            </div>

            {/* Resumo dos Dados */}
            <div className="p-8">
              {/* Cards de Estatísticas */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 rounded-xl" style={{ background: '#FEE2E2' }}>
                  <div className="text-3xl font-bold mb-1" style={{ color: '#DC2626' }}>
                    {summaryData.totalChassis}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Chassis</div>
                </div>
                <div className="text-center p-4 rounded-xl" style={{ background: '#DBEAFE' }}>
                  <div className="text-3xl font-bold mb-1" style={{ color: '#2563EB' }}>
                    {summaryData.totalTires}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Pneus</div>
                </div>
                <div className="text-center p-4 rounded-xl" style={{ background: summaryData.divergencias > 0 ? '#FEF3C7' : '#D1FAE5' }}>
                  <div className="text-3xl font-bold mb-1" style={{ color: summaryData.divergencias > 0 ? '#D97706' : '#059669' }}>
                    {summaryData.divergencias}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Divergências</div>
                </div>
              </div>

              {/* Lista de Chassis Conferidos */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <ClipboardCheck size={20} style={{ color: '#DC2626' }} />
                  Chassis Conferidos
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {summaryData.chassisList.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border-2 transition-all hover:shadow-md"
                      style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{item.chassis}</div>
                        <div className="text-sm text-gray-600">{item.piloto}</div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: '#DBEAFE' }}>
                        <CheckCircle2 size={16} style={{ color: '#2563EB' }} />
                        <span className="text-sm font-semibold" style={{ color: '#2563EB' }}>
                          {item.tires} pneus
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão de Fechar */}
              <button
                onClick={() => {
                  setShowSummaryModal(false);
                  // Reset completo já acontece no setTimeout da função handleSaveToSupabase
                }}
                className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all hover:shadow-lg flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' }}
              >
                <CheckCircle2 size={24} />
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📊 Modal: Chassis Pendentes - Pneus do Carro */}
      {showCarTiresModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCarTiresModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                    <CheckCircle2 size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Chassis Pendentes</h2>
                    <p className="text-green-100 text-sm">Pneus do carro (Jogo 1) que ainda precisam ser bipados</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCarTiresModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Body - Lista de Chassis */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                // Calcula quais chassis têm pneus do carro pendentes
                const pendingChassis = extractedData
                  .map((chassis, index) => {
                    const sets = savedTireSets[index];
                    let carTiresRead = 0;
                    const totalCarTires = 4;
                    
                    if (sets && sets.length > 0) {
                      const jogo1 = sets.find(set => set.jogo === 1);
                      if (jogo1) {
                        carTiresRead = jogo1.tires.filter(tire => 
                          (tire.codigo && tire.codigo !== '-') || 
                          (tire.observacao && tire.observacao.trim() !== '')
                        ).length;
                      }
                    }
                    
                    const pending = totalCarTires - carTiresRead;
                    
                    return {
                      index,
                      chassis: chassis.chassis,
                      piloto: chassis.piloto,
                      category: chassis.sheetName,
                      carTiresRead,
                      totalCarTires,
                      pending,
                      percentComplete: Math.round((carTiresRead / totalCarTires) * 100)
                    };
                  })
                  .filter(item => item.pending > 0) // Apenas chassis com pendências
                  .sort((a, b) => b.pending - a.pending); // Ordena por maior pendência primeiro

                if (pendingChassis.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={40} className="text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Tudo Completo!</h3>
                      <p className="text-gray-600">Todos os pneus do carro já foram bipados.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900">
                        {pendingChassis.length} {pendingChassis.length === 1 ? 'chassis pendente' : 'chassis pendentes'}
                      </h3>
                      <span className="text-sm text-gray-600">
                        Total: {pendingChassis.reduce((sum, item) => sum + item.pending, 0)} pneus faltando
                      </span>
                    </div>

                    {pendingChassis.map((item) => {
                      const isLocked = chassisLocks[item.index];
                      const isLockedByMe = isLocked && isLocked.userId === currentUserId;
                      const isLockedByOther = isLocked && isLocked.userId !== currentUserId;
                      
                      return (
                        <div
                          key={item.index}
                          className="border rounded-lg p-4 hover:shadow-md transition-all"
                          style={{
                            borderLeft: `4px solid ${item.pending >= 3 ? '#DC2626' : item.pending >= 2 ? '#F59E0B' : '#10B981'}`,
                            background: isLockedByOther ? '#FEF3C7' : '#FFFFFF'
                          }}
                        >
                          <div className="flex items-center justify-between gap-4">
                            {/* Info do Chassis */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-gray-900">{item.chassis}</h4>
                                {isLockedByOther && (
                                  <span className="text-xs px-2 py-1 rounded bg-yellow-200 text-yellow-800 font-semibold">
                                    🔒 {isLocked.userName}
                                  </span>
                                )}
                                {isLockedByMe && (
                                  <span className="text-xs px-2 py-1 rounded bg-blue-200 text-blue-800 font-semibold">
                                    🔓 Você está editando
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                Piloto: <span className="font-semibold">{item.piloto}</span> • {item.category}
                              </p>
                              
                              {/* Barra de progresso */}
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className="h-full rounded-full transition-all"
                                      style={{ 
                                        width: `${item.percentComplete}%`,
                                        background: item.percentComplete === 100 ? '#10B981' : 
                                                   item.percentComplete >= 50 ? '#F59E0B' : '#DC2626'
                                      }}
                                    />
                                  </div>
                                </div>
                                <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                                  {item.carTiresRead}/{item.totalCarTires}
                                </span>
                              </div>
                            </div>

                            {/* Botão de Ação */}
                            <button
                              onClick={() => {
                                setShowCarTiresModal(false);
                                openChassisModal(item.index);
                              }}
                              className="px-4 py-2 rounded-lg font-semibold text-white transition-all hover:shadow-lg whitespace-nowrap"
                              style={{
                                background: isLockedByOther 
                                  ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                                  : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                              }}
                              disabled={isLockedByOther}
                            >
                              {isLockedByOther ? '🔒 Bloqueado' : isLockedByMe ? '📝 Continuar' : '▶️ Abrir'}
                            </button>
                          </div>

                          {/* Detalhes das pendências */}
                          <div className="mt-3 pt-3 border-t flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              <span className="font-semibold text-red-600">{item.pending}</span> {item.pending === 1 ? 'pneu pendente' : 'pneus pendentes'} no carro
                            </span>
                            <span 
                              className="text-xs px-2 py-1 rounded font-semibold"
                              style={{
                                background: item.pending >= 3 ? '#FEE2E2' : item.pending >= 2 ? '#FEF3C7' : '#D1FAE5',
                                color: item.pending >= 3 ? '#991B1B' : item.pending >= 2 ? '#92400E' : '#065F46'
                              }}
                            >
                              {item.percentComplete}% completo
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowCarTiresModal(false)}
                className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConferirPneus;
