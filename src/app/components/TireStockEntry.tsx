/**
 * TireStockEntry - Entrada de Estoque de Pneus
 * Versão 2.0.5 - Removed "Pneu sem código de barras" checkbox from main UI (available only via quick actions)
 * @updated 2026-03-17
 */
import { useState, useEffect, useRef } from 'react';
import { generateUUID } from '../utils/uuid';
import { Search, CheckCircle, X, Package as PackageIcon, AlertCircle, Keyboard, CheckCircle2, Camera, Focus, FileUp, Layers, Plus, Upload, Undo2, Zap, ChevronDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { PageHeader } from './PageHeader';
import { EmptyState } from './EmptyState';
import { StockEntrySkeleton } from './LoadingSkeleton';
import { LoadingSpinner, ButtonLoading } from './LoadingSpinner';
import { TouchFeedback, useHaptic } from './TouchFeedback';
import { useKeyboardAdjustment } from '../utils/useKeyboardAdjustment';

import { toastStockEntry } from '../utils/toastHelpers';
import { BottomSheet, useBottomSheet } from './BottomSheet';
import { SwipeableCard, SwipeableList } from './SwipeableCard';
import { AnimatedTransition, AnimatedList, AnimatedListItem } from './AnimatedTransition';
import { ValidatedInput, ValidatedTextarea } from './ValidatedInput';
import { HelpTooltip, FieldWithHelp, SectionHelp, QuickTip } from './HelpTooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { 
  getTireModels, 
  getContainers, 
  getStockEntries,
  saveStockEntry, 
  deleteStockEntry,
  checkBarcodeExists,
  type TireModel, 
  type Container,
  type StockEntry 
} from '../utils/storage';

export interface TireEntry {
  id: string;
  barcode: string;
  model: string;
  modelId: string;
  container: string;
  containerId: string;
  timestamp: Date;
}

type ShortcutMode = 'numeric' | 'letters';

// Props opcionais para uso em modal de conferência
interface TireStockEntryProps {
  onEntriesChange?: (entries: TireEntry[]) => void;
  hideFinishButton?: boolean;
}

export function TireStockEntry({ onEntriesChange, hideFinishButton = false }: TireStockEntryProps = {}) {
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [barcode, setBarcode] = useState('');
  const [entries, setEntries] = useState<TireEntry[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shortcutMode, setShortcutMode] = useState<ShortcutMode>('letters');
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishProgress, setFinishProgress] = useState(0);
  const [showExportOption, setShowExportOption] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveryData, setRecoveryData] = useState<{
    entries: TireEntry[];
    selectedModel: string;
    selectedContainer: string;
    timestamp: string;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [modelCounts, setModelCounts] = useState<Record<string, number>>({});
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk' | 'spreadsheet'>('individual');
  const [isQuickSelectionExpanded, setIsQuickSelectionExpanded] = useState(false);
  const [isContainerSectionExpanded, setIsContainerSectionExpanded] = useState(false);
  const [noBarcode, setNoBarcode] = useState(false); // 🆕 Modo "Sem Código de Barras"
  const [setupStep, setSetupStep] = useState<'container' | 'model' | 'scanning'>('container'); // 🆕 Wizard de configuração inicial
  const inputRef = useRef<HTMLInputElement>(null);
  const lastShortcutTime = useRef<number>(0);
  const allowAutoFocus = useRef<boolean>(true);
  const tableScrollRef = useRef<HTMLDivElement>(null); // 🎯 Ref para scroll automático da tabela
  const isMountedRef = useRef(true); // 🛡️ Rastreia se o componente está montado
  
  // 🛡️ PROTEÇÃO CONTRA MÚLTIPLOS DISPAROS DO GATILHO
  const [isProcessing, setIsProcessing] = useState(false);
  const lastProcessTime = useRef<number>(0);
  const MIN_PROCESS_INTERVAL = 50; // 🚀 Reduzido para 50ms - aceita bipagens ultrarrápidas
  
  // 🎯 FILA DE PROCESSAMENTO - Garante que nenhum registro seja perdido
  interface QueueItem {
    barcode: string;
    modelId?: string; // Para RFID - não altera seleção da interface
    containerId?: string; // Para RFID - não altera seleção da interface
  }
  const processingQueue = useRef<QueueItem[]>([]);
  const isProcessingQueue = useRef(false);
  const [queueSize, setQueueSize] = useState(0);
  
  // 🛡️ PROTEÇÃO ANTI-DUPLICAÇÃO - Set de códigos em processamento
  const processingCodes = useRef<Set<string>>(new Set());

  // 🎨 DESTAQUE VISUAL - Rastreia último código registrado para feedback visual
  const [lastRegisteredBarcode, setLastRegisteredBarcode] = useState<string | null>(null);

  // 📡 RFID - Rastreia tipo de leitura atual
  const [lastScanType, setLastScanType] = useState<'barcode' | 'rfid' | null>(null);

  // 🧹 LIMPEZA DE TIMEOUTS - Rastreia todos os timeouts para cleanup
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // 📱 MOBILE ENHANCEMENTS
  const haptic = useHaptic();
  const quickActionsSheet = useBottomSheet();
  useKeyboardAdjustment({
    autoScroll: true,
    preventZoom: true,
    scrollDelay: 300,
  });

  // Estados para Entrada em Massa
  const [bulkBarcodes, setBulkBarcodes] = useState('');
  const [bulkContainer, setBulkContainer] = useState('');
  const [bulkModel, setBulkModel] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkStatus, setBulkStatus] = useState({ current: 0, total: 0, success: 0, duplicate: 0, error: 0, currentAction: '' });

  // Estados para Entrada Planilha
  const [spreadsheetText, setSpreadsheetText] = useState('');
  const [isSpreadsheetProcessing, setIsSpreadsheetProcessing] = useState(false);
  const [spreadsheetProgress, setSpreadsheetProgress] = useState(0);
  const [spreadsheetStatus, setSpreadsheetStatus] = useState({ current: 0, total: 0, success: 0, error: 0, currentAction: '' });

  // 🔐 VALIDAÇÃO DE FORMULÁRIO
  // Mock simples para compatibilidade temporária
  const barcodeValidation = {
    errors: {},
    validating: {},
    validateField: () => {},
  };

  const bulkBarcodesValidation = {
    errors: {},
    validating: {},
    validateField: () => {},
  };

  // 🛡️ CLEANUP: Marca componente como desmontado para cancelar operações assíncronas
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Limpa fila ao desmontar
      processingQueue.current = [];
      isProcessingQueue.current = false;
      // Limpa Set de códigos em processamento
      processingCodes.current.clear();
      // Limpa todos os timeouts pendentes
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current = [];
      // Fecha todos os toasts ativos
      toast.dismiss();
      console.log('🧹 Componente desmontado - limpeza realizada');
    };
  }, []);

  // Notifica o componente pai sobre mudanças nas entradas
  useEffect(() => {
    if (onEntriesChange) {
      onEntriesChange(entries);
    }
  }, [entries, onEntriesChange]);

  // 🎯 Rola tabela para o topo quando um novo pneu é escaneado
  useEffect(() => {
    if (isMountedRef.current && entries.length > 0 && tableScrollRef.current) {
      tableScrollRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [entries.length]); // Dispara quando o tamanho muda (novo item adicionado)

  // Carrega modelos e contêineres na montagem
  useEffect(() => {
    const loadData = async () => {
      if (!isMountedRef.current) return;
      
      setIsLoading(true);
      try {
        const models = await getTireModels();
        if (!isMountedRef.current) return;
        
        const containersList = await getContainers();
        if (!isMountedRef.current) return;
        
        setTireModels(models);
        setContainers(containersList);
        
        // IMPORTANTE: Carrega o cache de estoque para validação de duplicatas
        // Isso garante que checkBarcodeExists tenha dados no cache como fallback
        await getStockEntries();
        if (!isMountedRef.current) return;
        
        console.log('✅ Cache de estoque pré-carregado para validação de duplicatas');
        
        // Log dos dados carregados com ocupação atual
        if (containersList && containersList.length > 0) {
          console.log('📦 Ocupação dos contêineres (Entrada de Estoque):', containersList.map(c => ({
            nome: c.name,
            atual: c.current_stock,
            capacidade: c.capacity,
            percentual: c.capacity > 0 ? `${((c.current_stock || 0) / c.capacity * 100).toFixed(1)}%` : 'N/A'
          })));
        }

        // 🆕 NÃO define seleção inicial - usuário deve escolher via wizard
        // Iniciar wizard no primeiro passo apenas se não houver seleções
        if (!selectedContainer && !selectedModel) {
          setSetupStep('container');
        } else if (selectedContainer && !selectedModel) {
          setSetupStep('model');
        } else if (selectedContainer && selectedModel) {
          setSetupStep('scanning');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };
    
    loadData();

    // Carrega preferência de modo de atalho
    const savedMode = localStorage.getItem('shortcut-mode') as ShortcutMode;
    if (savedMode) {
      setShortcutMode(savedMode);
    }

    // Carrega preferência de autofoco
    const savedAutoFocus = localStorage.getItem('autofocus-enabled');
    if (savedAutoFocus !== null) {
      setAutoFocusEnabled(savedAutoFocus === 'true');
    }

    // Detecta se é dispositivo móvel
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 1024;
      const isMobileResult = isMobileDevice || (isTouchDevice && isSmallScreen);
      setIsMobile(isMobileResult);
      console.log('📱 Detecção Mobile:', { isMobileDevice, isTouchDevice, isSmallScreen, resultado: isMobileResult });
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // NÃO carrega registros antigos - a lista começa vazia para cada sessão
    
    // 💾 Verifica se há sessão salva para recuperar
    const savedSession = localStorage.getItem('tire-stock-entry-session');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        // Reconstrói as datas dos timestamps
        sessionData.entries = sessionData.entries.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        setRecoveryData(sessionData);
        setShowRecoveryDialog(true);
        console.log('💾 Sessão anterior encontrada:', sessionData);
      } catch (error) {
        console.error('Erro ao recuperar sessão:', error);
        localStorage.removeItem('tire-stock-entry-session');
      }
    }
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Escuta mudanças nos modelos de pneus
  useEffect(() => {
    const handleUpdate = async () => {
      if (!isMountedRef.current) return;
      
      const models = await getTireModels();
      if (!isMountedRef.current) return;
      
      setTireModels(models);
      // Atualiza seleção se o modelo atual não existir mais
      if (selectedModel && !models.find(m => m.id === selectedModel)) {
        setSelectedModel(models.length > 0 ? models[0].id : '');
      }
    };

    window.addEventListener('tire-models-updated', handleUpdate);
    return () => window.removeEventListener('tire-models-updated', handleUpdate);
  }, [selectedModel]);

  // Escuta mudanças nos contêineres
  useEffect(() => {
    const handleUpdate = async () => {
      if (!isMountedRef.current) return;
      
      const containersList = await getContainers();
      if (!isMountedRef.current) return;
      
      setContainers(containersList);
      // Atualiza seleção se o contêiner atual não existir mais
      if (selectedContainer && !containersList.find(c => c.id === selectedContainer)) {
        setSelectedContainer(containersList.length > 0 ? containersList[0].id : '');
      }
    };

    window.addEventListener('containers-updated', handleUpdate);
    return () => window.removeEventListener('containers-updated', handleUpdate);
  }, [selectedContainer]);

  // Escuta mudanças no estoque para atualizar ocupação dos contêineres
  useEffect(() => {
    const handleStockUpdate = async () => {
      if (!isMountedRef.current) return;
      
      // Recarrega os containers para atualizar a ocupação calculada dinamicamente
      const containersList = await getContainers();
      if (!isMountedRef.current) return;
      
      setContainers(containersList);
    };

    window.addEventListener('stock-entries-updated', handleStockUpdate);
    return () => window.removeEventListener('stock-entries-updated', handleStockUpdate);
  }, []);

  // NÃO escuta eventos globais - a lista de escaneados é apenas local da sessão atual

  // Atualiza contadores de modelos em tempo real
  useEffect(() => {
    const counts: Record<string, number> = {};
    entries.forEach(entry => {
      counts[entry.modelId] = (counts[entry.modelId] || 0) + 1;
    });
    setModelCounts(counts);
  }, [entries]);

  // 🆕 Reset setupStep quando mudar de aba
  useEffect(() => {
    if (activeTab !== 'individual') {
      setSetupStep('scanning');
    }
  }, [activeTab]);

  // 💾 AUTO-SALVAMENTO: Salva sessão no localStorage sempre que houver mudanças
  useEffect(() => {
    // Só salva se houver entradas
    if (entries.length > 0) {
      const sessionData = {
        entries,
        selectedModel,
        selectedContainer,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('tire-stock-entry-session', JSON.stringify(sessionData));
      console.log(`💾 Sessão auto-salva: ${entries.length} pneus`);
    } else {
      // Se não há entradas, limpa o localStorage
      localStorage.removeItem('tire-stock-entry-session');
    }
  }, [entries, selectedModel, selectedContainer]);

  // 🛡️ PROTEÇÃO: Previne navegação acidental com teclas do coletor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Previne ESC de sair da página
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        console.log('🛡️ Tecla ESC bloqueada para prevenir saída da página');
        return false;
      }
      
      // Previne Backspace de navegar para trás quando não estiver em um campo de texto
      if (e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        
        if (!isInputField) {
          e.preventDefault();
          e.stopPropagation();
          console.log('🛡️ Backspace bloqueado para prevenir navegação');
          return false;
        }
      }
      
      // Previne Alt+Seta que pode causar navegação no browser
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🛡️ Alt+Seta bloqueado para prevenir navegação');
        return false;
      }
    };

    // Adiciona listener com capture para pegar eventos antes de outros handlers
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Keyboard shortcuts com detecção de scanner de código de barras
  useEffect(() => {
    let lastKeyTime = 0;
    const SCANNER_THRESHOLD = 50; // Tempo em ms para detectar scanner (muito rápido)

    const handleKeyPress = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Se o tempo entre teclas for muito curto, provavelmente é um scanner
      // Ignora atalhos de teclado nesse caso
      if (timeDiff < SCANNER_THRESHOLD && timeDiff > 0) {
        return;
      }

      // Verifica se a tecla é um atalho válido
      let isValidShortcut = false;
      
      if (shortcutMode === 'numeric') {
        const num = parseInt(e.key);
        isValidShortcut = num >= 1 && num <= tireModels.length;
      } else {
        const validKeys = ['a', 'A', 'b', 'B', 'c', 'C', 'd', 'D', 'e', 'E', 'f', 'F', 'g', 'G'];
        isValidShortcut = validKeys.includes(e.key);
      }

      // Se for um atalho válido, processa mesmo que o foco esteja no input
      if (isValidShortcut) {
        // Previne que a tecla seja digitada no input
        e.preventDefault();
        
        // Marca que um atalho foi usado recentemente
        lastShortcutTime.current = currentTime;
        allowAutoFocus.current = false;
        
        // Permite auto-foco novamente após 800ms
        safeSetTimeout(() => {
          allowAutoFocus.current = true;
        }, 800);

        if (shortcutMode === 'numeric') {
          // Atalhos numéricos (1-7)
          const num = parseInt(e.key);
          const modelIndex = num - 1;
          if (tireModels[modelIndex]) {
            setSelectedModel(tireModels[modelIndex].id);
          }
        } else {
          // Atalhos com letras (A-G)
          const keyMap: { [key: string]: number } = {
            'a': 0, 'A': 0,
            'b': 1, 'B': 1,
            'c': 2, 'C': 2,
            'd': 3, 'D': 3,
            'e': 4, 'E': 4,
            'f': 5, 'F': 5,
            'g': 6, 'G': 6,
          };
          
          const modelIndex = keyMap[e.key];
          if (tireModels[modelIndex]) {
            setSelectedModel(tireModels[modelIndex].id);
          }
        }
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [tireModels, shortcutMode]);

  // Mantém o foco sempre no input de código de barras (com controle inteligente)
  useEffect(() => {
    // Se o autofoco estiver desativado, não executa
    if (!autoFocusEnabled) {
      return;
    }

    // 🎯 Apenas no modo Individual
    if (activeTab !== 'individual') {
      return;
    }

    const interval = setInterval(() => {
      // 🛡️ Verifica se componente ainda está montado
      if (!isMountedRef.current) {
        return;
      }
      
      // Não força foco se atalho foi usado recentemente
      if (!allowAutoFocus.current) {
        return;
      }

      // Verifica se o foco não está no input de barcode
      if (inputRef.current && document.activeElement !== inputRef.current) {
        // Verifica se não há modal ou dialog aberto
        const hasModalOpen = document.querySelector('[role="dialog"]') || 
                            document.querySelector('[role="alertdialog"]') ||
                            document.querySelector('.sonner-toast');
        
        // Se não há modal aberto, retorna o foco para o input
        if (!hasModalOpen && isMountedRef.current) {
          inputRef.current.focus();
        }
      }
    }, 100); // Verifica a cada 100ms

    return () => clearInterval(interval);
  }, [autoFocusEnabled, activeTab]);

  // Auto-submit quando atingir código completo (8 dígitos OU 24 hex para RFID) - OTIMIZADO
  useEffect(() => {
    // ✅ Código de barras: 8 caracteres APENAS numéricos (sem A-F)
    const isBarcodeComplete = barcode.length === 8 && /^\d{8}$/.test(barcode);

    // 📡 RFID: 24 caracteres hexadecimais
    const isRFIDComplete = barcode.length === 24 && /^[0-9A-Fa-f]{24}$/.test(barcode);

    if (!selectedModel || !selectedContainer) return;

    // 🚫 Para códigos de 8 dígitos, aguarda 150ms para garantir que não é início de RFID
    // Coletores RFID enviam caracteres muito rápido, então se for RFID chegará aos 24 chars nesse tempo
    if (isBarcodeComplete) {
      const timer = setTimeout(() => {
        // Verifica novamente se ainda tem 8 caracteres (não cresceu para RFID)
        if (barcode.length === 8 && /^\d{8}$/.test(barcode)) {
          console.log('✅ Auto-submit ativado: Código de barras completo (8 dígitos)');
          registerEntry();
        }
      }, 150);

      return () => clearTimeout(timer);
    }

    // 📡 Para RFID, dispara imediatamente quando completo (24 caracteres)
    if (isRFIDComplete) {
      console.log('✅ Auto-submit ativado: RFID completo (24 caracteres)');
      registerEntry();
    }
  }, [barcode, selectedModel, selectedContainer]);

  const toggleShortcutMode = () => {
    const newMode: ShortcutMode = shortcutMode === 'numeric' ? 'letters' : 'numeric';
    setShortcutMode(newMode);
    localStorage.setItem('shortcut-mode', newMode);
    toast.success(`Atalhos alterados para ${newMode === 'numeric' ? 'números (1-7)' : 'letras (A-G)'}`, {
      description: 'Use o teclado para selecionar modelos rapidamente',
      dismissible: true,
    });
  };

  const toggleAutoFocus = () => {
    const newValue = !autoFocusEnabled;
    setAutoFocusEnabled(newValue);
    localStorage.setItem('autofocus-enabled', newValue.toString());
    
    if (newValue) {
      toast.success('Autofoco ativado', {
        description: 'O campo de código de barras será focado automaticamente',
        dismissible: true,
      });
      // Foca imediatamente quando ativado
      safeSetTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      toast.info('Autofoco desativado', {
        description: 'Você precisará clicar no campo para digitar',
        dismissible: true,
      });
    }
  };

  // 🧹 FUNÇÃO HELPER - Cria timeout com rastreamento para limpeza
  const safeSetTimeout = (callback: () => void, delay: number) => {
    if (!isMountedRef.current) return;
    
    const timeout = setTimeout(() => {
      if (isMountedRef.current) {
        callback();
        // Remove da lista após executar
        const index = timeoutsRef.current.indexOf(timeout);
        if (index > -1) {
          timeoutsRef.current.splice(index, 1);
        }
      }
    }, delay);
    
    timeoutsRef.current.push(timeout);
    return timeout;
  };

  // 🎯 PROCESSADOR DE FILA - Processa códigos sequencialmente sem perder nenhum
  const processQueue = async () => {
    if (!isMountedRef.current || isProcessingQueue.current || processingQueue.current.length === 0) {
      return;
    }

    isProcessingQueue.current = true;

    while (processingQueue.current.length > 0 && isMountedRef.current) {
      const queueItem = processingQueue.current.shift()!;

      if (isMountedRef.current) {
        setQueueSize(processingQueue.current.length);
      }

      // Processa com override de modelo/container se fornecido (RFID)
      await registerEntryInternal(queueItem.barcode, queueItem.modelId, queueItem.containerId);

      // Pequeno delay para evitar sobrecarga
      if (isMountedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }

    isProcessingQueue.current = false;
    if (isMountedRef.current) {
      setQueueSize(0);
    }
  };

  // 🚀 ADICIONA CÓDIGO NA FILA - Aceita bipagens ultrarrápidas
  const addToQueue = (barcodeValue: string, overrideModelId?: string, overrideContainerId?: string) => {
    const trimmedValue = barcodeValue.trim();

    console.log(`🔍 addToQueue recebeu: "${trimmedValue}" (${trimmedValue.length} caracteres)`);

    // Validação básica imediata
    if (!trimmedValue || !selectedModel || !selectedContainer) {
      console.log('⚠️ Campos obrigatórios não preenchidos');
      return;
    }

    // 🆕 Valida formato - aceita 7-8 dígitos numéricos OU 24 caracteres hexadecimais (RFID)
    const isBarcodeValid = /^\d{7,8}$/.test(trimmedValue);
    const isRFIDValid = /^[0-9A-Fa-f]{24}$/.test(trimmedValue);
    const isValidCode = isBarcodeValid || isRFIDValid;

    console.log(`📊 Validação: barcode=${isBarcodeValid}, RFID=${isRFIDValid}, válido=${isValidCode}`);

    if (!isValidCode) {
      haptic.error();

      let errorMsg = `${trimmedValue.length} caracteres`;
      if (trimmedValue.length < 7) {
        errorMsg = 'Código muito curto';
      } else if (trimmedValue.length > 8 && trimmedValue.length < 24) {
        errorMsg = 'Código de barras tem 7-8 dígitos. RFID tem 24 caracteres hex';
      } else if (trimmedValue.length > 24) {
        errorMsg = 'Código muito longo';
      }

      toast.error('Código inválido', {
        description: errorMsg,
        duration: 4000,
        dismissible: true,
      });
      setBarcode('');
      inputRef.current?.focus();
      return;
    }
    
    // 🛡️ PROTEÇÃO ANTI-DUPLICAÇÃO - Verifica se já está sendo processado
    if (processingCodes.current.has(trimmedValue)) {
      console.log(`⚠️ DUPLICATA DETECTADA - Código ${trimmedValue} já está em processamento`);
      console.log(`🔍 Set atual:`, Array.from(processingCodes.current));
      console.log(`🔍 Fila atual:`, processingQueue.current);
      haptic.error();
      toast.error('Código duplicado', {
        description: `O código ${trimmedValue} está sendo processado`,
        duration: 1500,
        dismissible: true,
      });
      setBarcode('');
      inputRef.current?.focus();
      return;
    }
    
    // 🛡️ Verifica duplicata em entries (verificação local rápida)
    if (entries.some(e => e.barcode === trimmedValue)) {
      haptic.error();
      toast.error('Código duplicado', {
        description: `O código ${trimmedValue} já foi escaneado nesta sessão`,
        duration: 2000,
        dismissible: true,
      });
      setBarcode('');
      inputRef.current?.focus();
      return;
    }
    
    // 🚀 MARCA CÓDIGO COMO "EM PROCESSAMENTO" IMEDIATAMENTE
    processingCodes.current.add(trimmedValue);
    console.log(`🔒 Código ${trimmedValue} marcado como "em processamento"`);
    console.log(`🔍 Set após adicionar:`, Array.from(processingCodes.current));

    // Adiciona na fila (com modelo/container override se fornecido)
    const queueItem: QueueItem = {
      barcode: trimmedValue,
      modelId: overrideModelId,
      containerId: overrideContainerId
    };
    processingQueue.current.push(queueItem);
    setQueueSize(processingQueue.current.length);

    if (overrideModelId) {
      console.log(`📥 Código RFID ${trimmedValue} adicionado na fila com modelo override (não altera interface)`);
    } else {
      console.log(`📥 Código ${trimmedValue} adicionado na fila (tamanho: ${processingQueue.current.length})`);
    }
    
    // 🚀 Limpa campo IMEDIATAMENTE
    setBarcode('');
    
    // 🚀 Foca campo IMEDIATAMENTE para próximo scan
    safeSetTimeout(() => {
      inputRef.current?.focus();
    }, 5);
    
    // 🚀 Feedback visual imediato
    haptic.light();
    
    // Inicia processamento da fila (se ainda não estiver processando)
    processQueue();
  };

  const registerEntryInternal = async (barcodeValue: string, overrideModelId?: string, overrideContainerId?: string) => {
    try {
      // 🛡️ Verifica se componente ainda está montado
      if (!isMountedRef.current) {
        console.log('⚠️ Componente desmontado, cancelando processamento');
        return;
      }

      const startTime = performance.now();
      const now = Date.now();
      lastProcessTime.current = now;

      console.log(`🔄 Processando código ${barcodeValue}...`);

      // Busca modelo e container (usa override se fornecido, senão usa o selecionado)
      const modelId = overrideModelId || selectedModel;
      const containerId = overrideContainerId || selectedContainer;

      const model = tireModels.find(m => m.id === modelId);
      const container = containers.find(c => c.id === containerId);

      if (!model || !container) {
        console.error('❌ Modelo ou container não encontrado');
        return;
      }

      if (overrideModelId) {
        console.log(`📡 RFID: Usando modelo override "${model.name}" (não altera seleção da interface)`);
      }

    // ✅ VALIDAÇÃO: Verifica se o container tem espaço disponível (considerando itens já na lista)
    const entriesInSameContainer = entries.filter(e => e.containerId === container.id).length;
    const totalInContainer = container.current_stock + entriesInSameContainer;
    
    if (totalInContainer >= container.capacity) {
      haptic.error();
      toastStockEntry.containerFull(container.name, totalInContainer, container.capacity);
      return;
    }

    // ⚠️ AVISO: Container próximo ao limite (90% ou mais)
    const usagePercentage = (totalInContainer / container.capacity) * 100;
    if (usagePercentage >= 90 && usagePercentage < 100) {
      const remainingSpace = container.capacity - totalInContainer;
      toastStockEntry.containerAlmostFull(container.name, remainingSpace);
    }
    
    // 🚀 Mostra feedback visual instantâneo
    if (isMountedRef.current) {
      setShowSuccess(true);
    }

    // 🛡️ Verifica se o código de barras já existe no banco (assíncrono)
    // Nota: duplicata local já foi verificada antes de adicionar na fila
    const exists = await checkBarcodeExists(barcodeValue);
    
    // Verifica se componente ainda está montado após operação assíncrona
    if (!isMountedRef.current) {
      console.log('⚠️ Componente desmontado após checkBarcodeExists');
      return;
    }
    
    if (exists) {
      setShowSuccess(false);
      haptic.error();
      toastStockEntry.duplicate(barcodeValue);
      return;
    }

    // ✅ ADICIONA APENAS NA LISTA LOCAL - NÃO SALVA NO BANCO AINDA
    const isFirstEntry = entries.length === 0;
    const newEntry: TireEntry = {
      id: generateUUID(),
      barcode: barcodeValue,
      model: model.name,
      modelId: model.id,
      container: container.name,
      containerId: container.id,
      timestamp: new Date(),
    };
    
    if (isMountedRef.current) {
      setEntries(prev => [newEntry, ...prev]);
    }

    // 🎨 DESTAQUE VISUAL - Marca como último registrado
    if (isMountedRef.current) {
      setLastRegisteredBarcode(barcodeValue);
      safeSetTimeout(() => {
        setLastRegisteredBarcode(null);
      }, 3000);
    }

    haptic.success(); // 📱 Vibração de sucesso
    
    // 💾 Aviso sobre auto-salvamento (apenas na primeira entrada)
    if (isFirstEntry && isMountedRef.current) {
      safeSetTimeout(() => {
        toast.info('💾 Auto-salvamento ativo', {
          description: 'Seus dados estão sendo salvos automaticamente.',
          duration: 3000,
          dismissible: true,
        });
      }, 1000);
    }
    
    // 🚀 Esconde feedback visual rapidamente
    if (isMountedRef.current) {
      safeSetTimeout(() => {
        setShowSuccess(false);
      }, 300);
    }
    
    // 📊 Log de performance
    const endTime = performance.now();
    const processingTime = (endTime - startTime).toFixed(2);
    console.log(`✅ Código ${barcodeValue} processado em ${processingTime}ms`);
    
    // 🆕 Feedback especial para códigos sem barcode (começam com 9)
    if (/^9\d{7}$/.test(barcodeValue)) {
      if (isMountedRef.current) {
        toast.success('Pneu sem código registrado', {
          description: `Código gerado: ${barcodeValue}`,
          duration: 2500,
          dismissible: true,
        });
      }
    }
    } finally {
      // 🔓 REMOVE CÓDIGO DO SET DE PROCESSAMENTO (garante remoção mesmo em caso de erro)
      const wasDeleted = processingCodes.current.delete(barcodeValue);
      console.log(`🔓 Código ${barcodeValue} removido do set de processamento (sucesso: ${wasDeleted})`);
      console.log(`🔍 Set após remover:`, Array.from(processingCodes.current));
    }
  };

  // 🆕 FUNÇÃO: Gera código automático para pneus sem código de barras
  const generateNoBarcodeCode = async (): Promise<string | null> => {
    try {
      // 🛡️ Verifica se componente ainda está montado antes de operação assíncrona
      if (!isMountedRef.current) {
        console.log('⚠️ Componente desmontado, cancelando geração de código');
        return null;
      }
      
      // Busca todos os códigos existentes no banco que começam com 9
      const allStockEntries = await getStockEntries();
      
      // 🛡️ Verifica novamente após operação assíncrona
      if (!isMountedRef.current) {
        console.log('⚠️ Componente desmontado após busca, cancelando geração de código');
        return null;
      }
      
      // Filtra códigos de 8 dígitos que começam com 9 (90000001, 90000002, etc)
      const noBarcodeEntries = allStockEntries.filter(entry => 
        /^9\d{7}$/.test(entry.barcode)
      );
      
      // Busca também nos códigos da sessão atual
      const sessionNoBarcodes = entries.filter(entry => 
        /^9\d{7}$/.test(entry.barcode)
      );
      
      // Combina todos os códigos existentes
      const allNoBarcodes = [
        ...noBarcodeEntries.map(e => e.barcode),
        ...sessionNoBarcodes.map(e => e.barcode)
      ];
      
      // Encontra o maior número usado
      let maxNumber = 90000000; // Inicia em 90000000
      allNoBarcodes.forEach(code => {
        const num = parseInt(code);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      });
      
      // Gera o próximo código (8 dígitos numéricos sequenciais começando em 90000001)
      const nextNumber = maxNumber + 1;
      const newCode = nextNumber.toString();
      
      console.log(`🆕 Código gerado para pneu sem código de barras: ${newCode}`);
      return newCode;
    } catch (error) {
      console.error('❌ Erro ao gerar código sem código de barras:', error);
      return null;
    }
  };

  // 📡 FUNÇÃO: Detecta se o código é RFID (EPC hexadecimal)
  const isRFIDCode = (code: string): boolean => {
    // RFID EPC tem 24 caracteres hexadecimais (96 bits / 4 = 24)
    const trimmed = code.trim();
    const isRFID = /^[0-9A-Fa-f]{24}$/.test(trimmed);
    console.log(`🔍 isRFIDCode("${trimmed}") = ${isRFID} (${trimmed.length} chars)`);
    return isRFID;
  };

  // 📡 FUNÇÃO: Decodifica SGTIN-96 (EPC) e retorna código CAI e código de barras
  const decodeRFID = (epcHex: string): { cai: string; barcode: string; itemReference: string; serial: string } | null => {
    try {
      console.log(`📡 Decodificando RFID: ${epcHex}`);

      // Converte hex para binário
      const binary = parseInt(epcHex, 16).toString(2).padStart(96, '0');

      // Estrutura SGTIN-96:
      // Header (8 bits) | Filter (3 bits) | Partition (3 bits) | Company Prefix | Item Reference | Serial Number
      // Para simplificar, vamos extrair diretamente os bits do Item Reference
      // Normalmente seria necessário decodificar o Partition para saber o tamanho exato

      // Método alternativo: converter para decimal e extrair campos
      // Exemplo: 301854AAE059B8000149614B → 0.086699.8480480.21586251

      // Converte hex para BigInt
      const epcBigInt = BigInt('0x' + epcHex);

      // Extrai Serial Number (38 bits finais)
      const serialMask = BigInt('0x3FFFFFFFFF'); // 38 bits
      const serial = Number(epcBigInt & serialMask);

      // Remove Serial Number para processar o restante
      const withoutSerial = epcBigInt >> BigInt(38);

      // Extrai Item Reference (assumindo 24 bits - pode variar com partition)
      const itemRefMask = BigInt('0xFFFFFF'); // 24 bits
      const itemReference = Number(withoutSerial & itemRefMask);

      // Remove Item Reference
      const withoutItemRef = withoutSerial >> BigInt(24);

      // Extrai Company Prefix (assumindo 24 bits - pode variar com partition)
      const companyPrefixMask = BigInt('0xFFFFFF'); // 24 bits
      const companyPrefix = Number(withoutItemRef & companyPrefixMask);

      // Remove Company Prefix
      const withoutCompany = withoutItemRef >> BigInt(24);

      // Extrai Partition (3 bits)
      const partitionMask = BigInt('0x7');
      const partition = Number(withoutCompany & partitionMask);

      // Remove Partition
      const withoutPartition = withoutCompany >> BigInt(3);

      // Extrai Filter (3 bits)
      const filterMask = BigInt('0x7');
      const filter = Number(withoutPartition & filterMask);

      console.log(`📊 RFID Decodificado: Filter=${filter}, Partition=${partition}, Company=${companyPrefix}, ItemRef=${itemReference}, Serial=${serial}`);

      // 🔢 Calcula o CAI: ItemReference tem final '1000' (8 em decimal)
      // Para obter o CAI real, divide por 16 (remove os 4 últimos bits)
      const cai = Math.floor(itemReference / 16).toString();

      // 📊 Calcula o Código de Barras: Serial tem final '11' (3 em decimal)
      // Para obter o código de barras real, divide por 4 (remove os 2 últimos bits)
      const barcodeNumber = Math.floor(serial / 4);
      const barcodeFormatted = barcodeNumber.toString().padStart(8, '0'); // Garante 8 dígitos

      console.log(`🔑 Código CAI extraído: ${cai} (ItemReference: ${itemReference})`);
      console.log(`📊 Código de Barras extraído: ${barcodeFormatted} (Serial: ${serial} / 4 = ${barcodeNumber})`);

      return {
        cai,
        barcode: barcodeFormatted,
        itemReference: itemReference.toString(),
        serial: serial.toString()
      };
    } catch (error) {
      console.error('❌ Erro ao decodificar RFID:', error);
      return null;
    }
  };

  // 🎯 FUNÇÃO PRINCIPAL - Aceita código via input ou scanner
  const registerEntry = async () => {
    let barcodeValue = barcode.trim();

    console.log(`🎯 registerEntry chamado com: "${barcodeValue}" (${barcodeValue.length} caracteres)`);

    // 📡 NOVO: Detecta e processa código RFID
    if (isRFIDCode(barcodeValue)) {
      console.log('📡 ========================================');
      console.log('📡 CÓDIGO RFID DETECTADO!');
      console.log('📡 Código:', barcodeValue);
      console.log('📡 Iniciando decodificação...');

      const rfidData = decodeRFID(barcodeValue);

      if (!rfidData) {
        console.error('❌ Falha na decodificação do RFID');
        toast.error('Erro ao decodificar RFID', {
          description: 'Não foi possível processar o código RFID',
          dismissible: true,
        });
        setBarcode('');
        return;
      }

      console.log('✅ RFID decodificado com sucesso!');
      console.log('📊 CAI:', rfidData.cai);
      console.log('📊 Código de Barras:', rfidData.barcode);
      console.log('📊 Serial:', rfidData.serial);
      console.log('📊 Item Reference:', rfidData.itemReference);

      // 🔍 Busca o modelo pelo código CAI cadastrado
      console.log(`🔍 Buscando modelo com CAI: "${rfidData.cai}"`);
      console.log(`📋 Modelos disponíveis no sistema:`, tireModels.map(m => `"${m.name}" (CAI: ${m.cai || 'não cadastrado'})`));

      const modeloEncontrado = tireModels.find(m => m.cai === rfidData.cai);

      console.log(`🔍 Modelo encontrado:`, modeloEncontrado ? `"${modeloEncontrado.name}" (CAI: ${modeloEncontrado.cai})` : 'NENHUM');

      if (!modeloEncontrado) {
        toast.error('Modelo não cadastrado', {
          description: `Nenhum modelo com CAI ${rfidData.cai} está cadastrado. Cadastre o modelo com este CAI primeiro.`,
          duration: 5000,
          dismissible: true,
        });
        setBarcode('');
        return;
      }

      // Verifica se o container foi selecionado
      if (!selectedContainer) {
        toast.warning('Selecione o container', {
          description: `Modelo "${modeloEncontrado.name}" identificado via RFID (código: ${rfidData.barcode}). Selecione o container para continuar.`,
          duration: 5000,
          dismissible: true,
        });
        setBarcode('');
        return;
      }

      // 🎉 Feedback de sucesso
      toast.success('RFID processado!', {
        description: `Modelo: ${modeloEncontrado.name} | Código: ${rfidData.barcode}`,
        duration: 3000,
        dismissible: true,
      });

      // 📡 Marca como leitura RFID
      setLastScanType('rfid');

      // ✅ Registra diretamente com modelo do RFID (NÃO altera seleção da interface)
      console.log(`✅ RFID: Registrando com modelo "${modeloEncontrado.name}" sem alterar interface`);
      addToQueue(rfidData.barcode, modeloEncontrado.id, selectedContainer);
      setBarcode('');
      return; // Retorna aqui para não continuar o fluxo normal
    } else {
      // 📊 Código de barras tradicional
      setLastScanType('barcode');
    }

    // 🆕 Se está no modo "Sem Código", gera um código automático
    if (noBarcode) {
      if (!selectedModel || !selectedContainer) {
        toast.error('Selecione modelo e contêiner', {
          description: 'É necessário selecionar o modelo e contêiner antes de adicionar pneus sem código',
          dismissible: true,
        });
        return;
      }
      
      const generatedCode = await generateNoBarcodeCode();
      
      // 🛡️ Verifica se a geração foi bem-sucedida e se componente ainda está montado
      if (!generatedCode || !isMountedRef.current) {
        console.log('⚠️ Geração de código cancelada ou componente desmontado');
        return;
      }
      
      barcodeValue = generatedCode;
      console.log(`🆕 Registrando pneu SEM código de barras: ${barcodeValue}`);
      
      // Limpa campo e mostra feedback
      setBarcode('');
      haptic.light();
    } else {
      // Modo normal - valida se o código foi preenchido
      if (!barcodeValue) {
        console.log('⚠️ Código vazio, ignorando');
        return;
      }
    }
    
    // Adiciona na fila para processamento sequencial
    addToQueue(barcodeValue);
  };

  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      await registerEntry();
    } catch (error) {
      console.error('❌ Erro ao registrar entrada:', error);
      // Não mostra toast para evitar poluir a UI em caso de desmontagem
    }
  };

  const removeEntry = (barcode: string) => {
    console.log(`🗑️ Removendo entrada da lista local: ${barcode}`);
    const entryToRemove = entries.find(e => e.barcode === barcode);
    
    if (!entryToRemove) {
      console.error(`❌ Entrada não encontrada para barcode: ${barcode}`);
      toast.error('Entrada não encontrada', {
        description: `Código: ${barcode}`,
        dismissible: true,
      });
      return;
    }
    
    // ✅ APENAS remove da lista local - NÃO remove do banco ainda (pois não foi salvo ainda)
    setEntries(prevEntries => prevEntries.filter(e => e.barcode !== barcode));
    
    // Toast com ação de desfazer
    toast.info('Entrada removida da lista', {
      description: `Código: ${barcode}`,
      duration: 5000,
      dismissible: true,
      action: {
        label: 'Desfazer',
        onClick: () => {
          // Restaura a entrada na lista local
          setEntries(prev => [entryToRemove, ...prev]);
          toast.success('Entrada restaurada', {
            description: `Código: ${barcode}`,
            dismissible: true,
          });
        }
      }
    });
  };

  // Função para exportar entrada para Excel
  const exportToExcel = () => {
    try {
      haptic.light();
      
      // Dados gerais da entrada
      const now = new Date();
      const dataHora = now.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Resumo por container (calculado primeiro)
      const containerSummary: Record<string, number> = {};
      entries.forEach(entry => {
        if (!containerSummary[entry.container]) {
          containerSummary[entry.container] = 0;
        }
        containerSummary[entry.container]++;
      });
      
      // Contadores por tipo
      const slickCount = entries.filter(e => {
        const model = tireModels.find(m => m.id === e.modelId);
        return model?.type === 'Slick';
      }).length;
      const wetCount = entries.filter(e => {
        const model = tireModels.find(m => m.id === e.modelId);
        return model?.type === 'Wet';
      }).length;
      
      // Cabeçalho do relatório
      const header = [
        ['CONECTA CUP - ENTRADA DE ESTOQUE'],
        [`Data/Hora: ${dataHora}`],
        [`Total de Pneus: ${entries.length}`],
        [`Pneus Slick: ${slickCount}`],
        [`Pneus Wet: ${wetCount}`],
        [`Containers Utilizados: ${Object.keys(containerSummary).length}`],
        [], // Linha vazia
      ];
      
      // Resumo por modelo
      const modelSummary: Record<string, { name: string; count: number; type: string }> = {};
      entries.forEach(entry => {
        const model = tireModels.find(m => m.id === entry.modelId);
        if (!modelSummary[entry.modelId]) {
          modelSummary[entry.modelId] = {
            name: entry.model,
            count: 0,
            type: model?.type || 'N/A'
          };
        }
        modelSummary[entry.modelId].count++;
      });
      
      const summaryRows = [
        ['RESUMO POR MODELO'],
        ['Modelo', 'Tipo', 'Quantidade'],
      ];
      
      Object.values(modelSummary).forEach(item => {
        summaryRows.push([item.name, item.type, item.count.toString()]);
      });
      
      summaryRows.push([]); // Linha vazia
      
      // Linhas do resumo por container (já calculado acima)
      const containerRows = [
        ['RESUMO POR CONTAINER'],
        ['Container', 'Quantidade'],
      ];
      
      Object.entries(containerSummary).forEach(([container, count]) => {
        containerRows.push([container, count.toString()]);
      });
      
      containerRows.push([]); // Linha vazia
      
      // Detalhamento dos pneus
      const detailRows = [
        ['DETALHAMENTO DOS PNEUS'],
        ['#', 'Código de Barras', 'Modelo', 'Tipo', 'Container', 'Data/Hora'],
      ];
      
      entries.forEach((entry, index) => {
        const model = tireModels.find(m => m.id === entry.modelId);
        const timestamp = new Date(entry.timestamp).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        detailRows.push([
          (index + 1).toString(),
          entry.barcode,
          entry.model,
          model?.type || 'N/A',
          entry.container,
          timestamp
        ]);
      });
      
      // Combinar todas as seções
      const worksheetData = [
        ...header,
        ...summaryRows,
        ...containerRows,
        ...detailRows
      ];
      
      // Criar worksheet
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Estilizar - largura das colunas
      ws['!cols'] = [
        { wch: 5 },  // #
        { wch: 15 }, // Código
        { wch: 30 }, // Modelo
        { wch: 12 }, // Tipo
        { wch: 20 }, // Container
        { wch: 20 }, // Data/Hora
      ];
      
      // Criar workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Entrada de Estoque');
      
      // Nome do arquivo com data
      const fileName = `Entrada_Estoque_${now.toISOString().slice(0,10)}_${now.getHours()}${now.getMinutes()}.xlsx`;
      
      // Exportar
      XLSX.writeFile(wb, fileName);
      
      toast.success('✅ Arquivo Excel exportado!', {
        description: `${entries.length} pneus exportados com sucesso`,
        duration: 3000,
        dismissible: true,
      });
      
      haptic.success();
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('❌ Erro ao exportar arquivo', {
        description: 'Não foi possível gerar o arquivo Excel',
        duration: 4000,
        dismissible: true,
      });
      haptic.error();
    }
  };

  // 💾 Função para recuperar sessão salva
  const handleRecoverSession = () => {
    if (recoveryData) {
      setEntries(recoveryData.entries);
      setSelectedModel(recoveryData.selectedModel);
      setSelectedContainer(recoveryData.selectedContainer);
      setShowRecoveryDialog(false);
      setRecoveryData(null);
      
      haptic.success();
      toast.success('✅ Sessão recuperada com sucesso!', {
        description: `${recoveryData.entries.length} ${recoveryData.entries.length === 1 ? 'pneu recuperado' : 'pneus recuperados'}`,
        duration: 4000,
        dismissible: true,
      });
      
      console.log('✅ Sessão recuperada:', recoveryData.entries.length, 'pneus');
    }
  };

  // 🗑️ Função para descartar sessão salva
  const handleDiscardSession = () => {
    localStorage.removeItem('tire-stock-entry-session');
    setShowRecoveryDialog(false);
    setRecoveryData(null);
    
    haptic.light();
    toast.info('Sessão anterior descartada', {
      description: 'Iniciando nova sessão de entrada',
      duration: 3000,
      dismissible: true,
    });
    
    console.log('🗑️ Sessão anterior descartada');
  };

  const handleFinishEntry = async (shouldExport: boolean = false) => {
    const totalEntries = entries.length;
    
    if (totalEntries === 0) {
      setShowFinishDialog(false);
      toast.info('Nenhum pneu para registrar', {
        description: 'Escaneie códigos de barras antes de finalizar',
        dismissible: true,
      });
      return;
    }
    
    // Inicia o processo de finalização
    setIsFinishing(true);
    setFinishProgress(0);
    
    console.log(`🚀 Iniciando salvamento de ${totalEntries} pneus no banco de dados...`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Salva cada entrada no banco de dados
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const model = tireModels.find(m => m.id === entry.modelId);
      
      if (!model) {
        console.error(`❌ Modelo não encontrado: ${entry.modelId}`);
        errorCount++;
        errors.push(entry.barcode);
        continue;
      }
      
      const stockEntry: StockEntry = {
        id: entry.id,
        barcode: entry.barcode,
        model_id: entry.modelId,
        model_name: entry.model,
        model_type: model.type as 'Slick' | 'Wet',
        container_id: entry.containerId,
        container_name: entry.container,
        created_at: entry.timestamp.toISOString(),
        status: 'Novo',
      };
      
      try {
        const success = await saveStockEntry(stockEntry);
        
        if (success) {
          successCount++;
          console.log(`✅ Pneu ${i + 1}/${totalEntries} salvo: ${entry.barcode}`);
        } else {
          errorCount++;
          errors.push(entry.barcode);
          console.error(`❌ Falha ao salvar pneu ${i + 1}/${totalEntries}: ${entry.barcode}`);
        }
      } catch (error) {
        errorCount++;
        errors.push(entry.barcode);
        console.error(`❌ Erro ao salvar pneu ${i + 1}/${totalEntries}:`, error);
      }
      
      // Atualiza progresso
      setFinishProgress(((i + 1) / totalEntries) * 100);
    }
    
    // Aguarda um pouco para mostrar 100%
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Exporta para Excel se solicitado (antes de limpar os dados)
    if (shouldExport && errorCount === 0) {
      exportToExcel();
    }
    
    // Limpa a lista de entradas da sessão atual
    setEntries([]);
    
    // 🔓 Limpa Set de códigos em processamento
    processingCodes.current.clear();
    console.log('🔓 Set de códigos em processamento limpo');
    
    // 💾 Limpa a sessão salva no localStorage (finalização bem-sucedida)
    localStorage.removeItem('tire-stock-entry-session');
    console.log('💾 Sessão salva removida do localStorage');
    
    // Reseta os contadores de modelos
    setModelCounts({});
    
    // Fecha o diálogo e reseta estados
    setIsFinishing(false);
    setFinishProgress(0);
    setShowFinishDialog(false);
    setShowExportOption(false);
    
    // Mostra mensagem de sucesso/erro
    if (errorCount === 0) {
      haptic.success(); // 📱 Vibração de sucesso
      toast.success('✅ Entrada finalizada com sucesso!', {
        description: `${successCount} ${successCount === 1 ? 'pneu registrado' : 'pneus registrados'} no banco de dados.`,
        duration: 4000,
        dismissible: true,
      });
      
      // Dispara evento para onboarding checklist
      window.dispatchEvent(new Event('tire-added'));
    } else if (successCount === 0) {
      haptic.error(); // 📱 Vibração de erro
      toast.error('❌ Erro ao registrar pneus', {
        description: `Nenhum pneu foi salvo. Tente novamente.`,
        duration: 5000,
        dismissible: true,
      });
    } else {
      haptic.warning(); // 📱 Vibração de aviso
      toast.warning('⚠️ Entrada finalizada com erros', {
        description: `${successCount} pneus salvos, ${errorCount} falharam. Códigos com erro: ${errors.join(', ')}`,
        duration: 6000,
        dismissible: true,
      });
    }
    
    // Retorna o foco para o input
    safeSetTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 300);
  };

  // ============================================
  // FUNÇÕES PARA ENTRADA EM MASSA
  // ============================================

  const handleBulkEntry = async () => {
    if (!bulkBarcodes.trim()) {
      toast.error('Digite os códigos de barras', { dismissible: true });
      return;
    }

    if (!bulkModel || !bulkContainer) {
      toast.error('Selecione modelo e contêiner', { dismissible: true });
      return;
    }

    // Parse e normalização dos códigos de barras
    const rawCodes = bulkBarcodes
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    if (rawCodes.length === 0) {
      toast.error('Nenhum código válido encontrado', { dismissible: true });
      return;
    }

    // Normaliza códigos: 7 dígitos → 8 dígitos (adiciona zero à esquerda)
    const barcodes = rawCodes.map(code => {
      const numericCode = code.replace(/\D/g, '');
      
      // Se tem 7 dígitos, adiciona zero à esquerda
      if (numericCode.length === 7) {
        const normalized = '0' + numericCode;
        console.log(`  📝 Código normalizado (massa): ${numericCode} -> ${normalized}`);
        return normalized;
      }
      
      return numericCode;
    });

    // Valida se todos têm 8 dígitos (após normalização)
    const invalidCodes = barcodes.filter(b => b.length !== 8 || !/^\d{8}$/.test(b));
    if (invalidCodes.length > 0) {
      toast.error('Códigos inválidos encontrados', {
        description: `${invalidCodes.length} código(s) não tem 7 ou 8 dígitos numéricos`,
        duration: 4000,
        dismissible: true,
      });
      return;
    }

    // Verifica duplicatas dentro da lista
    const uniqueBarcodes = [...new Set(barcodes)];
    if (uniqueBarcodes.length !== barcodes.length) {
      toast.warning('Códigos duplicados removidos', {
        description: `${barcodes.length - uniqueBarcodes.length} duplicata(s) removida(s)`,
        dismissible: true,
      });
    }

    // Nota: A validação de duplicatas será feita pelo backend durante o saveStockEntry
    // Códigos duplicados retornarão false e serão contabilizados como erros

    // Inicia processamento
    setIsBulkProcessing(true);
    setBulkProgress(0);
    
    const model = tireModels.find(m => m.id === bulkModel);
    const container = containers.find(c => c.id === bulkContainer);
    
    setBulkStatus({ 
      current: 0, 
      total: uniqueBarcodes.length, 
      success: 0, 
      duplicate: 0, 
      error: 0, 
      currentAction: 'Iniciando cadastro em massa...' 
    });

    if (!model || !container) {
      toast.error('Modelo ou contêiner não encontrado', { dismissible: true });
      setIsBulkProcessing(false);
      return;
    }

    // ✅ VALIDAÇÃO: Verifica se o container tem espaço suficiente
    const availableSpace = container.capacity - container.current_stock;
    if (availableSpace < uniqueBarcodes.length) {
      toast.error(`Espaço insuficiente no container ${container.name}`, {
        description: `Disponível: ${availableSpace} | Necessário: ${uniqueBarcodes.length}`,
        duration: 6000,
        dismissible: true,
      });
      setIsBulkProcessing(false);
      return;
    }

    // ⚠️ AVISO: Container ficará quase cheio
    const finalOccupancy = ((container.current_stock + uniqueBarcodes.length) / container.capacity) * 100;
    if (finalOccupancy >= 90) {
      toast.warning(`Container ${container.name} ficará ${finalOccupancy.toFixed(0)}% cheio`, {
        description: `${container.capacity - (container.current_stock + uniqueBarcodes.length)} espaço(s) restante(s) após importação`,
        duration: 4000,
        dismissible: true,
      });
    }

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    // ✅ SALVA DIRETAMENTE NO BANCO DE DADOS (processamento em massa otimizado)
    console.log(`🚀 Iniciando cadastro em massa de ${uniqueBarcodes.length} pneus...`);
    
    for (let i = 0; i < uniqueBarcodes.length; i++) {
      const code = uniqueBarcodes[i];
      
      // Atualiza status visual
      setBulkStatus({
        current: i + 1,
        total: uniqueBarcodes.length,
        success: successCount,
        duplicate: duplicateCount,
        error: errorCount,
        currentAction: `Validando código ${code}...`
      });
      
      // Verifica duplicata no banco
      setBulkStatus({
        current: i + 1,
        total: uniqueBarcodes.length,
        success: successCount,
        duplicate: duplicateCount,
        error: errorCount,
        currentAction: `Verificando duplicatas no banco...`
      });
      
      const exists = await checkBarcodeExists(code);
      if (exists) {
        duplicateCount++;
        setBulkProgress(((i + 1) / uniqueBarcodes.length) * 100);
        setBulkStatus({
          current: i + 1,
          total: uniqueBarcodes.length,
          success: successCount,
          duplicate: duplicateCount,
          error: errorCount,
          currentAction: `⚠️ Código ${code} já existe (duplicado)`
        });
        console.log(`⚠️ Código duplicado ignorado: ${code}`);
        continue;
      }
      
      // Cria o objeto de entrada para salvar no banco
      const stockEntry: StockEntry = {
        id: generateUUID(),
        barcode: code,
        model_id: bulkModel,
        model_name: model.name,
        model_type: model.type as 'Slick' | 'Wet',
        container_id: bulkContainer,
        container_name: container.name,
        created_at: new Date().toISOString(),
        status: 'Novo',
      };
      
      try {
        // Atualiza status - salvando
        setBulkStatus({
          current: i + 1,
          total: uniqueBarcodes.length,
          success: successCount,
          duplicate: duplicateCount,
          error: errorCount,
          currentAction: `💾 Salvando ${code} no banco...`
        });
        
        // ✅ SALVA DIRETAMENTE NO BANCO
        const success = await saveStockEntry(stockEntry);
        
        if (success) {
          successCount++;
          console.log(`✅ Pneu ${i + 1}/${uniqueBarcodes.length} cadastrado: ${code}`);
          
          // Atualiza status - sucesso
          setBulkStatus({
            current: i + 1,
            total: uniqueBarcodes.length,
            success: successCount,
            duplicate: duplicateCount,
            error: errorCount,
            currentAction: `✅ ${code} salvo com sucesso!`
          });
        } else {
          errorCount++;
          console.error(`❌ Falha ao cadastrar pneu ${i + 1}/${uniqueBarcodes.length}: ${code}`);
          setBulkStatus({
            current: i + 1,
            total: uniqueBarcodes.length,
            success: successCount,
            duplicate: duplicateCount,
            error: errorCount,
            currentAction: `❌ Erro ao salvar ${code}`
          });
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Erro ao cadastrar pneu ${i + 1}/${uniqueBarcodes.length}:`, error);
        setBulkStatus({
          current: i + 1,
          total: uniqueBarcodes.length,
          success: successCount,
          duplicate: duplicateCount,
          error: errorCount,
          currentAction: `❌ Erro: ${error?.message || 'Falha ao salvar'}`
        });
      }

      // Atualiza progresso
      setBulkProgress(((i + 1) / uniqueBarcodes.length) * 100);
      
      // Pequeno delay para UX e evitar sobrecarga do banco
      if (i < uniqueBarcodes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }

    // Aguarda um pouco para mostrar 100%
    await new Promise(resolve => setTimeout(resolve, 500));

    // Finaliza
    setIsBulkProcessing(false);
    setBulkProgress(0);
    
    // Mensagens de resultado baseadas no que aconteceu
    if (successCount > 0 && duplicateCount === 0 && errorCount === 0) {
      haptic.success();
      toast.success('✅ Cadastro em massa concluído!', {
        description: `${successCount} ${successCount === 1 ? 'pneu cadastrado' : 'pneus cadastrados'} no banco de dados com sucesso.`,
        duration: 4000,
        dismissible: true,
      });
      
      // Limpa campos
      setBulkBarcodes('');
      
      // Dispara evento para onboarding checklist
      window.dispatchEvent(new Event('tire-added'));
    } else if (successCount > 0 && (duplicateCount > 0 || errorCount > 0)) {
      haptic.warning();
      const details = [];
      if (successCount > 0) details.push(`${successCount} cadastrados`);
      if (duplicateCount > 0) details.push(`${duplicateCount} duplicados`);
      if (errorCount > 0) details.push(`${errorCount} com erro`);
      
      toast.warning('⚠️ Cadastro concluído com avisos', {
        description: details.join(' • '),
        duration: 5000,
        dismissible: true,
      });
      
      // Limpa campos
      setBulkBarcodes('');
    } else if (duplicateCount > 0 && successCount === 0) {
      haptic.error();
      toast.error('❌ Nenhum pneu cadastrado', {
        description: `Todos os ${uniqueBarcodes.length} códigos já existem no sistema`,
        duration: 4000,
        dismissible: true,
      });
    } else {
      haptic.error();
      toast.error('❌ Erro no cadastro em massa', {
        description: `Nenhum pneu foi cadastrado. Verifique os dados e tente novamente.`,
        duration: 4000,
        dismissible: true,
      });
    }
  };

  // ============================================
  // FUNÇÕES PARA ENTRADA PLANILHA
  // ============================================

  const handleSpreadsheetEntry = async () => {
    console.log('🔄 [PLANILHA] Iniciando processamento...');
    
    if (!spreadsheetText.trim()) {
      toast.error('Cole os dados da planilha', { dismissible: true });
      return;
    }

    console.log('📋 [PLANILHA] Texto recebido:', spreadsheetText.substring(0, 200) + '...');

    // Parse das linhas da planilha
    const lines = spreadsheetText.split('\n').filter(l => l.trim());
    console.log(`📊 [PLANILHA] Total de linhas: ${lines.length}`);
    
    if (lines.length < 2) {
      toast.error('Planilha vazia ou inválida', {
        description: 'Certifique-se de incluir o cabeçalho e pelo menos uma linha de dados',
        dismissible: true,
      });
      return;
    }

    // Remove o cabeçalho
    const dataLines = lines.slice(1);
    console.log(`📝 [PLANILHA] Linhas de dados (sem cabeçalho): ${dataLines.length}`);
    console.log('📝 [PLANILHA] Primeira linha de dados:', dataLines[0]);
    
    // Parse das linhas de dados
    const parsedData: Array<{ barcode: string; modelName: string; containerName: string; lineNumber: number }> = [];
    const invalidLines: number[] = [];

    dataLines.forEach((line, index) => {
      const parts = line.split('\t').map(p => p.trim());
      console.log(`   Linha ${index + 2}: ${parts.length} colunas ->`, parts);
      
      if (parts.length < 3) {
        console.warn(`   ⚠️ Linha ${index + 2} tem apenas ${parts.length} colunas (mínimo 3)`);
        invalidLines.push(index + 2);
        return;
      }

      const [barcode, modelName, containerName] = parts;

      // Valida código (7 ou 8 dígitos)
      const numericCode = barcode.replace(/\D/g, '');
      if (!/^\d{7,8}$/.test(numericCode)) {
        console.warn(`   ⚠️ Linha ${index + 2}: Código "${barcode}" inválido (após limpar: "${numericCode}")`);
        invalidLines.push(index + 2);
        return;
      }

      const normalizedBarcode = numericCode.length === 7 ? '0' + numericCode : numericCode;
      console.log(`   ✅ Linha ${index + 2}: Código ${normalizedBarcode}, Modelo: "${modelName}", Contêiner: "${containerName}"`);

      parsedData.push({
        barcode: normalizedBarcode,
        modelName,
        containerName,
        lineNumber: index + 2,
      });
    });

    console.log(`📊 [PLANILHA] Resumo parsing:`);
    console.log(`   - Total linhas válidas: ${parsedData.length}`);
    console.log(`   - Total linhas inválidas: ${invalidLines.length}`);

    if (invalidLines.length > 0) {
      toast.warning('Linhas inválidas encontradas', {
        description: `Linhas ${invalidLines.join(', ')} serão ignoradas`,
        duration: 4000,
        dismissible: true,
      });
    }

    if (parsedData.length === 0) {
      toast.error('Nenhuma linha válida encontrada', { dismissible: true });
      return;
    }

    // Inicia processamento
    setIsSpreadsheetProcessing(true);
    setSpreadsheetProgress(0);
    setSpreadsheetStatus({ current: 0, total: parsedData.length, success: 0, error: 0, currentAction: 'Iniciando processamento...' });

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    console.log(`\n🚀 [PLANILHA] Iniciando cadastro de ${parsedData.length} pneus...`);
    console.log(`📦 [PLANILHA] Modelos disponíveis (${tireModels.length}):`);
    tireModels.forEach(m => console.log(`   - "${m.name}" (código: "${m.code}")`));
    console.log(`📦 [PLANILHA] Contêineres disponíveis (${containers.length}):`, containers.map(c => c.name));

    // Processa cada linha
    for (let i = 0; i < parsedData.length; i++) {
      const { barcode, modelName, containerName, lineNumber } = parsedData[i];
      
      // Atualiza status visual
      setSpreadsheetStatus({
        current: i + 1,
        total: parsedData.length,
        success: successCount,
        error: errorCount,
        currentAction: `Validando código ${barcode}...`
      });
      
      console.log(`\n🔍 [PLANILHA] Linha ${lineNumber}: Processando código ${barcode}`);
      console.log(`   📝 [PLANILHA] Procurando modelo: "${modelName}"`);
      
      // Normaliza o nome do modelo da planilha:
      // "27/65-18 Porsche Cup N2" → "27/65-18 N2"
      // "30/65-18 P2L" → "30/65-18 P2L"
      const normalizeModelName = (name: string): string => {
        return name
          .replace(/Porsche Cup/gi, '') // Remove "Porsche Cup"
          .replace(/\s+/g, ' ')          // Normaliza espaços
          .trim();                        // Remove espaços extras
      };
      
      const normalizedSearchName = normalizeModelName(modelName);
      console.log(`   🔄 [PLANILHA] Nome normalizado: "${normalizedSearchName}"`);
      
      // Busca o modelo pelo código (mais confiável que nome)
      const model = tireModels.find(m => {
        const modelCode = (m.code || '').toLowerCase();
        const modelNameLower = m.name.toLowerCase();
        const searchLower = normalizedSearchName.toLowerCase();
        
        // Tenta correspondência exata ou parcial no código
        const codeMatch = modelCode.includes(searchLower) || searchLower.includes(modelCode);
        
        // Tenta correspondência parcial no nome (fallback)
        const nameMatch = modelNameLower.includes(searchLower) || searchLower.includes(modelNameLower);
        
        const match = codeMatch || nameMatch;
        
        console.log(`   Comparando código "${m.code}" (nome: "${m.name}") com "${normalizedSearchName}": ${match ? '✅ MATCH' : '❌'}`);
        
        return match;
      });
      
      if (!model) {
        console.error(`   ❌ [PLANILHA] Linha ${lineNumber}: Modelo "${modelName}" não encontrado`);
        console.error(`   💡 [PLANILHA] Sugestão: Verifique se o modelo está cadastrado com código "${normalizedSearchName}"`);
        errorCount++;
        errors.push(`Linha ${lineNumber}: Modelo "${modelName}" não encontrado`);
        setSpreadsheetProgress(((i + 1) / parsedData.length) * 100);
        setSpreadsheetStatus({
          current: i + 1,
          total: parsedData.length,
          success: successCount,
          error: errorCount,
          currentAction: `❌ Modelo não encontrado (linha ${lineNumber})`
        });
        continue;
      }

      console.log(`   ✅ [PLANILHA] Modelo encontrado: "${model.name}" (Código: "${model.code}", ID: ${model.id})`);

      // Normaliza o nome do contêiner removendo duplicações:
      // "GSILVA - GSILVA - MTBU 4003682" → "GSILVA - MTBU 4003682"
      const normalizeContainerName = (name: string): string => {
        // Remove duplicações de prefixos (ex: "GSILVA - GSILVA - " → "GSILVA - ")
        const parts = name.split(' - ');
        const uniqueParts = parts.filter((part, index, arr) => 
          index === 0 || part !== arr[index - 1]
        );
        return uniqueParts.join(' - ').trim();
      };
      
      const normalizedContainerSearch = normalizeContainerName(containerName);
      console.log(`   📦 [PLANILHA] Procurando contêiner: "${containerName}"`);
      if (normalizedContainerSearch !== containerName) {
        console.log(`   🔄 [PLANILHA] Nome normalizado: "${normalizedContainerSearch}"`);
      }
      
      // Busca o contêiner pelo nome (busca parcial case-insensitive)
      const container = containers.find(c => {
        const containerLower = c.name.toLowerCase();
        const searchLower = normalizedContainerSearch.toLowerCase();
        
        // Tenta correspondência parcial bidirecional
        const match = containerLower.includes(searchLower) || searchLower.includes(containerLower);
        
        console.log(`   Comparando "${c.name}" com "${normalizedContainerSearch}": ${match ? '✅ MATCH' : '❌'}`);
        return match;
      });
      
      if (!container) {
        console.error(`   ❌ [PLANILHA] Linha ${lineNumber}: Contêiner "${containerName}" não encontrado`);
        console.error(`   💡 [PLANILHA] Contêineres disponíveis: ${containers.map(c => `"${c.name}"`).join(', ')}`);
        errorCount++;
        errors.push(`Linha ${lineNumber}: Contêiner "${containerName}" não encontrado`);
        setSpreadsheetProgress(((i + 1) / parsedData.length) * 100);
        setSpreadsheetStatus({
          current: i + 1,
          total: parsedData.length,
          success: successCount,
          error: errorCount,
          currentAction: `❌ Contêiner não encontrado (linha ${lineNumber})`
        });
        continue;
      }

      console.log(`   ✅ [PLANILHA] Contêiner encontrado: "${container.name}" (ID: ${container.id})`);

      // ✅ VALIDAÇÃO: Verifica se o container tem espaço disponível
      if (container.current_stock >= container.capacity) {
        console.error(`   ❌ [PLANILHA] Linha ${lineNumber}: Container \"${container.name}\" está cheio (${container.current_stock}/${container.capacity})`);
        errorCount++;
        errors.push(`Linha ${lineNumber}: Container "${container.name}" está cheio`);
        setSpreadsheetProgress(((i + 1) / parsedData.length) * 100);
        setSpreadsheetStatus({
          current: i + 1,
          total: parsedData.length,
          success: successCount,
          error: errorCount,
          currentAction: `❌ Contêiner cheio (linha ${lineNumber})`
        });
        continue;
      }

      // Cria entrada
      const stockEntry: StockEntry = {
        id: generateUUID(),
        barcode: barcode,
        model_id: model.id,
        model_name: model.name,
        model_type: model.type as 'Slick' | 'Wet',
        container_id: container.id,
        container_name: container.name,
        status: 'Novo',
        created_at: new Date().toISOString(),
      };

      // Verifica duplicata na lista local
      if (entries.some(e => e.barcode === barcode)) {
        console.error(`   ❌ [PLANILHA] Linha ${lineNumber}: Código ${barcode} duplicado na lista local`);
        errorCount++;
        errors.push(`Linha ${lineNumber}: Código ${barcode} duplicado na lista`);
        setSpreadsheetProgress(((i + 1) / parsedData.length) * 100);
        setSpreadsheetStatus({
          current: i + 1,
          total: parsedData.length,
          success: successCount,
          error: errorCount,
          currentAction: `❌ Código duplicado (linha ${lineNumber})`
        });
        continue;
      }

      // Verifica duplicata no banco
      setSpreadsheetStatus({
        current: i + 1,
        total: parsedData.length,
        success: successCount,
        error: errorCount,
        currentAction: `Verificando duplicatas no banco...`
      });
      
      const exists = await checkBarcodeExists(barcode);
      if (exists) {
        console.error(`   ❌ [PLANILHA] Linha ${lineNumber}: Código ${barcode} já existe no banco`);
        errorCount++;
        errors.push(`Linha ${lineNumber}: Código ${barcode} já cadastrado`);
        setSpreadsheetProgress(((i + 1) / parsedData.length) * 100);
        setSpreadsheetStatus({
          current: i + 1,
          total: parsedData.length,
          success: successCount,
          error: errorCount,
          currentAction: `❌ Código já existe no banco (linha ${lineNumber})`
        });
        continue;
      }

      console.log(`   ✅ [PLANILHA] Salvando no banco de dados...`);
      
      // Atualiza status - salvando
      setSpreadsheetStatus({
        current: i + 1,
        total: parsedData.length,
        success: successCount,
        error: errorCount,
        currentAction: `💾 Salvando ${barcode} no banco...`
      });
      
      // ✅ SALVA DIRETO NO BANCO DE DADOS
      try {
        const success = await saveStockEntry(stockEntry);
        
        if (success) {
          successCount++;
          console.log(`   📝 [PLANILHA] Pneu ${barcode} salvo com sucesso no banco`);
          
          // Atualiza status - sucesso
          setSpreadsheetStatus({
            current: i + 1,
            total: parsedData.length,
            success: successCount,
            error: errorCount,
            currentAction: `✅ ${barcode} salvo com sucesso!`
          });
          
          // Adiciona também à lista local para visualização imediata
          const entry: TireEntry = {
            id: stockEntry.id,
            barcode: barcode,
            model: model.name,
            modelId: model.id,
            container: container.name,
            containerId: container.id,
            timestamp: new Date(),
          };
          
          setEntries(prev => [entry, ...prev]);
        } else {
          console.error(`   ❌ [PLANILHA] Falha ao salvar pneu ${barcode}`);
          errorCount++;
          errors.push(`Linha ${lineNumber}: Erro ao salvar código ${barcode}`);
          setSpreadsheetStatus({
            current: i + 1,
            total: parsedData.length,
            success: successCount,
            error: errorCount,
            currentAction: `❌ Erro ao salvar (linha ${lineNumber})`
          });
        }
      } catch (error: any) {
        console.error(`   ❌ [PLANILHA] Erro ao salvar pneu ${barcode}:`, error);
        errorCount++;
        errors.push(`Linha ${lineNumber}: ${error?.message || 'Erro ao salvar'}`);
        setSpreadsheetStatus({
          current: i + 1,
          total: parsedData.length,
          success: successCount,
          error: errorCount,
          currentAction: `❌ Erro: ${error?.message || 'Falha ao salvar'}`
        });
      }

      // Atualiza progresso
      setSpreadsheetProgress(((i + 1) / parsedData.length) * 100);
      
      // Pequeno delay para UX e evitar sobrecarga do banco
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    console.log(`\n✅ [PLANILHA] Processamento concluído:`);
    console.log(`   - Sucessos: ${successCount}`);
    console.log(`   - Erros: ${errorCount}`);
    console.log(`   - Total processado: ${parsedData.length}`);

    // Finaliza
    setIsSpreadsheetProcessing(false);
    setSpreadsheetProgress(0);
    
    if (successCount > 0 && errorCount === 0) {
      haptic.success();
      toast.success('✅ Importação concluída!', {
        description: `${successCount} pneus salvos no banco de dados com sucesso.`,
        duration: 4000,
        dismissible: true,
      });
      
      // Limpa campo
      setSpreadsheetText('');
      
      // Dispara evento para atualizar outras telas
      window.dispatchEvent(new Event('stock-entries-updated'));
      window.dispatchEvent(new Event('tire-added'));
    } else if (successCount > 0 && errorCount > 0) {
      haptic.warning();
      toast.warning('⚠️ Importação parcial concluída', {
        description: `${successCount} salvos no banco, ${errorCount} com erro.`,
        duration: 5000,
        dismissible: true,
      });
      
      // Dispara evento para atualizar outras telas
      window.dispatchEvent(new Event('stock-entries-updated'));
      window.dispatchEvent(new Event('tire-added'));
      
      // Mostra erros no console e em alert para debug
      if (errors.length > 0) {
        console.error('❌ [PLANILHA] Erros detalhados:', errors);
        
        // Mostra resumo de erros em toast (após componente estar montado)
        if (isMountedRef.current) {
          safeSetTimeout(() => {
            const errorSummary = errors.slice(0, 3).join('\n');
            const moreErrors = errors.length > 3 ? `\n...e mais ${errors.length - 3}` : '';
            toast.error('Detalhes dos erros', {
              description: errorSummary + moreErrors,
              duration: 6000,
              dismissible: true,
            });
          }, 500);
        }
      }
    }
  };

  const selectedModelData = tireModels.find(m => m.id === selectedModel);
  const selectedContainerData = containers.find(c => c.id === selectedContainer);
  const modelEntries = entries.filter(e => e.model === selectedModelData?.name);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col gap-4 sm:gap-6 px-2 py-2 sm:p-4 lg:p-8 w-full max-w-full">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        {/* Model Selection Skeleton */}
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4">
          <div className="mb-3">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-20 sm:h-24 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Container Selection Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4">
            <Skeleton className="h-5 w-32 mb-3" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4">
            <Skeleton className="h-5 w-32 mb-3" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Barcode Input Skeleton */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg sm:rounded-xl border-2 border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 w-12" />
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>

        {/* Loading centralizado */}
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Carregando entrada de estoque..." />
        </div>
      </div>
    );
  }

  if (tireModels.length === 0) {
    return (
      <div className="flex-1 flex flex-col p-4 lg:p-8">
        <PageHeader
          icon={PackageIcon}
          title="Entrada de Estoque"
          description="Registro rápido de pneus no sistema"
          breadcrumbs={[
            { label: 'Pneus' },
            { label: 'Entrada de Estoque' }
          ]}
        />
        <EmptyState
          icon={PackageIcon}
          title="Nenhum modelo cadastrado"
          description="Para usar este módulo, primeiro cadastre modelos de pneus no menu 'Modelos de Pneus'."
          actions={[]}
        />
      </div>
    );
  }

  // 🆕 Tela de Wizard - Seleção de Container
  if (setupStep === 'container' && activeTab === 'individual') {
    return (
      <AnimatedTransition variant="fade">
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
          <div className="w-full max-w-lg">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Selecione o Contêiner</h2>
              <p className="text-sm text-gray-600">Passo 1 de 2</p>
            </div>

            <div className="space-y-2">
              {containers.map((container) => {
                const percentage = ((container.current_stock / container.capacity) * 100).toFixed(0);
                const isFull = container.current_stock >= container.capacity;
                const isAlmostFull = Number(percentage) >= 90 && !isFull;
                const isSelected = selectedContainer === container.id;

                return (
                  <button
                    key={container.id}
                    onClick={() => {
                      if (!isFull) {
                        setSelectedContainer(container.id);
                        // 🚀 Avança automaticamente para próximo passo
                        setTimeout(() => setSetupStep('model'), 300);
                      }
                    }}
                    disabled={isFull}
                    className={`w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 border-2 rounded-lg transition-all group ${
                      isSelected ? 'border-[#D50000] shadow-md' :
                      isFull ? 'border-gray-200 opacity-50 cursor-not-allowed' :
                      'border-gray-300 hover:border-[#D50000] hover:shadow-md'
                    }`}
                  >
                    <PackageIcon
                      size={20}
                      className={
                        isFull ? 'text-red-500' :
                        isAlmostFull ? 'text-yellow-500' :
                        isSelected ? 'text-[#D50000]' :
                        'text-gray-600 group-hover:text-[#D50000]'
                      }
                    />
                    <div className="flex-1 text-left">
                      <div className={`font-semibold text-sm ${isFull ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {container.name}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {container.current_stock} / {container.capacity} pneus • {percentage}%
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="text-[#D50000] flex-shrink-0" size={20} />}
                    {isFull && <span className="text-xs font-semibold text-red-600">CHEIO</span>}
                  </button>
                );
              })}

              {containers.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <PackageIcon size={32} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhum contêiner cadastrado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </AnimatedTransition>
    );
  }

  // 🆕 Tela de Wizard - Seleção de Modelo
  if (setupStep === 'model' && activeTab === 'individual') {
    return (
      <AnimatedTransition variant="fade">
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
          <div className="w-full max-w-lg">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Selecione o Modelo</h2>
              <p className="text-sm text-gray-600">Passo 2 de 2</p>

              {/* Container selecionado */}
              {selectedContainer && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle size={14} className="text-green-600" />
                  <span className="text-xs font-medium text-green-900">
                    {containers.find(c => c.id === selectedContainer)?.name}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {tireModels.map((model) => {
                const isSelected = selectedModel === model.id;
                const entryCount = modelCounts[model.id] || 0;

                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.id);
                      // 🚀 Avança automaticamente para tela de scanning
                      setTimeout(() => setSetupStep('scanning'), 300);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 border-2 rounded-lg transition-all group ${
                      isSelected ? 'border-[#D50000] shadow-md' : 'border-gray-300 hover:border-[#D50000] hover:shadow-md'
                    }`}
                  >
                    <PackageIcon
                      size={20}
                      className={isSelected ? 'text-[#D50000]' : 'text-gray-600 group-hover:text-[#D50000]'}
                    />
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-sm text-gray-900">
                        {model.name}
                      </div>
                      {entryCount > 0 && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          {entryCount} {entryCount === 1 ? 'pneu' : 'pneus'} nesta sessão
                        </div>
                      )}
                    </div>
                    {isSelected && <CheckCircle className="text-[#D50000] flex-shrink-0" size={20} />}
                  </button>
                );
              })}

              {tireModels.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <PackageIcon size={32} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhum modelo cadastrado</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <Button
                onClick={() => setSetupStep('container')}
                variant="outline"
                size="sm"
                className="w-full"
              >
                ← Voltar ao Contêiner
              </Button>
            </div>
          </div>
        </div>
      </AnimatedTransition>
    );
  }

  return (
    <AnimatedTransition variant="fade">
      <div className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden p-[0px]">
        {/* Page Header with Breadcrumbs */}
        <PageHeader
        icon={PackageIcon}
        title="Entrada de Estoque"
        description={
          entries.length > 0
            ? `Registro rápido de pneus no sistema • 💾 Auto-salvamento ativo (${entries.length} ${entries.length === 1 ? 'pneu' : 'pneus'})`
            : "Registro rápido de pneus no sistema"
        }
        breadcrumbs={[
          { label: 'Pneus' },
          { label: 'Entrada de Estoque' }
        ]}
        actions={
          <div className="flex items-center gap-2 flex-shrink-0">
          {/* Selector de Modo (Individual/Lote/Planilha) */}
          <Select value={activeTab} onValueChange={(value) => setActiveTab(value as 'individual' | 'bulk' | 'spreadsheet')}>
            <SelectTrigger className="w-[140px] sm:w-[160px] h-9 text-xs sm:text-sm bg-white">
              <SelectValue>
                {activeTab === 'individual' && (
                  <span className="flex items-center gap-1.5">
                    <PackageIcon size={14} />
                    Individual
                  </span>
                )}
                {activeTab === 'bulk' && (
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} />
                    Lote
                  </span>
                )}
                {activeTab === 'spreadsheet' && (
                  <span className="flex items-center gap-1.5">
                    <FileUp size={14} />
                    Planilha
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">
                <div className="flex items-center gap-2">
                  <PackageIcon size={16} />
                  <span>Individual</span>
                </div>
              </SelectItem>
              <SelectItem value="bulk">
                <div className="flex items-center gap-2">
                  <Layers size={16} />
                  <span>Entrada em Lote</span>
                </div>
              </SelectItem>
              <SelectItem value="spreadsheet">
                <div className="flex items-center gap-2">
                  <FileUp size={16} />
                  <span>Entrada Planilha</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Toggle Autofoco - apenas no modo Individual */}
          {activeTab === 'individual' && (
            <Button
              variant={autoFocusEnabled ? "default" : "outline"}
              size="sm"
              onClick={toggleAutoFocus}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 ${
                autoFocusEnabled 
                  ? 'bg-[#D50000] hover:bg-[#B00000] text-white' 
                  : 'bg-white text-gray-700'
              }`}
              title={autoFocusEnabled ? 'Autofoco ativado - clique para desativar' : 'Autofoco desativado - clique para ativar'}
            >
              <Focus size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden md:inline text-xs sm:text-sm">Autofoco</span>
            </Button>
          )}
          </div>
        }
      />

      {/* Botão Atalhos - POSIÇÃO FIXA TOPO DIREITO */}
      <div className="fixed top-20 right-4 z-50">
        
      </div>

      {/* Barcode Input - MOVED TO TOP */}
      {/* 🎯 Visível apenas no modo Individual */}
      {activeTab === 'individual' && (
        <div className="-mt-[10px]">
          <form onSubmit={handleBarcodeSubmit} className="space-y-0.5">
          <div>
            {/* Título e Campo na mesma linha - ULTRA COMPACTO */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 flex-shrink-0">
                <h3 className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                  {noBarcode ? 'Código (Auto):' : 'Código:'}
                </h3>
                {!noBarcode && (
                  <HelpTooltip
                    content="Aceita código de barras (8 dígitos) ou RFID (24 caracteres hexadecimais). O sistema detecta automaticamente o tipo."
                    type="help"
                    iconSize={12}
                  />
                )}
                {/* 📡 Badge indicando tipo de leitura */}
                {lastScanType && (
                  <Badge
                    variant={lastScanType === 'rfid' ? 'default' : 'secondary'}
                    className={`ml-1 text-[10px] px-1.5 py-0 h-4 ${
                      lastScanType === 'rfid'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-600 text-white'
                    }`}
                  >
                    {lastScanType === 'rfid' ? '📡 RFID' : '📊 Barcode'}
                  </Badge>
                )}
              </div>
              
              <div className="relative flex-1">
                
                {noBarcode ? (
                  // 🆕 Modo "Sem Código" - Mostra botão para adicionar
                  <Button
                    type="button"
                    onClick={handleBarcodeSubmit}
                    className="w-full h-[26px] text-xs bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2"
                    disabled={!selectedModel || !selectedContainer || queueSize > 0}
                  >
                    <Plus size={14} />
                    <span>Adicionar Pneu SEM Código</span>
                  </Button>
                ) : (
                  // Modo normal - Campo de input
                  <Input
                    ref={inputRef}
                    type="text"
                    inputMode={isMobile ? "none" : "text"}
                    value={barcode}
                    onChange={(e) => {
                      const value = e.target.value.trim().toUpperCase();
                      // Aceita código de barras (8 dígitos) OU RFID (24 caracteres hex)
                      if (/^[0-9A-Fa-f]{0,24}$/.test(value)) {
                        setBarcode(value);
                        barcodeValidation.validateField('barcode', value);
                      }
                    }}
                    onFocus={(e) => {
                      console.log('📸 Campo focado');
                    }}
                    placeholder="Código de barras ou RFID"
                    className={`!p-[3px] text-xs leading-tight tracking-wider border rounded font-mono transition-all !h-[18px] !min-h-[18px] ${
                      queueSize > 0
                        ? 'border-yellow-400 bg-yellow-50 animate-pulse'
                        : barcode.length === 0
                        ? 'border-gray-300 focus:border-[#D50000]'
                        : ((barcode.length === 8 && /^\d{8}$/.test(barcode)) || (barcode.length === 24 && /^[0-9A-Fa-f]{24}$/.test(barcode)))
                        ? 'border-[#00A86B] focus:border-[#00A86B] bg-green-50'
                        : 'border-[#FFB800] focus:border-[#FFB800] bg-yellow-50'
                    }`}
                    autoFocus={!isMobile && autoFocusEnabled && !noBarcode}
                    maxLength={24}
                    disabled={false}
                  />
                )}
                {!noBarcode && showSuccess ? (
                  <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 text-[#00A86B] animate-bounce-scale" size={16} />
                ) : !noBarcode && ((barcode.length === 8 && /^\d{8}$/.test(barcode)) || (barcode.length === 24 && /^[0-9A-Fa-f]{24}$/.test(barcode))) ? (
                  <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 text-[#00A86B]" size={16} />
                ) : null}
              </div>
            </div>
            
            {/* Progress bar - COMPACTO (apenas modo normal) */}
            {!noBarcode && barcode.length > 0 && (() => {
              const isBarcodeComplete = barcode.length === 8 && /^\d{8}$/.test(barcode);
              const isRFIDComplete = barcode.length === 24 && /^[0-9A-Fa-f]{24}$/.test(barcode);
              const isComplete = isBarcodeComplete || isRFIDComplete;

              // Determina o alvo baseado no padrão sendo digitado
              const isHex = /^[0-9A-Fa-f]+$/.test(barcode);
              const targetLength = isHex && barcode.length > 8 ? 24 : 8;

              if (!isComplete && barcode.length < targetLength) {
                return (
                  <div className="mt-0.5">
                    <Progress
                      value={(barcode.length / targetLength) * 100}
                      className="h-1"
                    />
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Mensagem de erro - COMPACTA (apenas modo normal) */}
            {!noBarcode && barcodeValidation?.errors?.barcode && barcode.length === 8 && (
              <div className="mt-0.5 flex items-start gap-1.5 text-red-600 text-xs bg-red-50 p-1.5 rounded border border-red-200">
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                <span>{barcodeValidation.errors.barcode}</span>
              </div>
            )}
            
            {/* Validação assíncrona - COMPACTA (apenas modo normal) */}
            {!noBarcode && barcodeValidation?.validating?.barcode && (
              <div className="mt-0.5 flex items-center gap-1.5 text-blue-600 text-xs">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Verificando...</span>
              </div>
            )}
          </div>
          
          {/* Status de validação - COMPACTO (apenas modo normal) */}
          {!noBarcode && barcode.length > 0 && !barcodeValidation?.errors?.barcode && (() => {
            const isBarcodeComplete = barcode.length === 8 && /^\d{8}$/.test(barcode);
            const isRFIDComplete = barcode.length === 24 && /^[0-9A-Fa-f]{24}$/.test(barcode);
            const isComplete = isBarcodeComplete || isRFIDComplete;

            // Determina o alvo baseado no padrão sendo digitado
            const isHex = /^[0-9A-Fa-f]+$/.test(barcode);
            const targetLength = isHex && barcode.length > 8 ? 24 : 8;
            const codeType = targetLength === 24 ? 'RFID' : 'Barcode';

            return (
              <div className={`flex items-center gap-1.5 text-xs font-medium transition-all ${
                isComplete ? 'text-[#00A86B]' : 'text-[#FFB800]'
              }`}>
                {isComplete ? (
                  <>
                    <CheckCircle2 size={12} />
                    <span>Válido • Registro automático {codeType === 'RFID' ? '(RFID)' : ''}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} />
                    <span>
                      +{targetLength - barcode.length} {targetLength - barcode.length === 1 ? 'caractere' : 'caracteres'}
                      {codeType === 'RFID' ? ' (RFID)' : ''}
                    </span>
                  </>
                )}
              </div>
            );
          })()}
          
          {/* Info adicional para modo "Sem Código" */}
          {noBarcode && (
            <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 p-2 rounded border border-purple-200">
              <AlertCircle size={12} className="flex-shrink-0" />
              <span>Selecione modelo e contêiner, depois clique no botão para adicionar o pneu. O código será gerado automaticamente.</span>
            </div>
          )}
        </form>

        {/* 🆕 Botões de Acesso Rápido - Container e Modelo (DISCRETO) */}
        {setupStep === 'scanning' && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <button
              onClick={() => setSetupStep('container')}
              className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-xs transition-all hover:border-gray-400"
              title="Clique para trocar o contêiner"
            >
              <PackageIcon size={12} className="text-gray-600" />
              <span className="text-gray-700 font-medium">
                {containers.find(c => c.id === selectedContainer)?.name || 'Contêiner'}
              </span>
            </button>
            <button
              onClick={() => setSetupStep('model')}
              className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-xs transition-all hover:border-gray-400"
              title="Clique para trocar o modelo"
            >
              <PackageIcon size={12} className="text-gray-600" />
              <span className="text-gray-700 font-medium">
                {tireModels.find(m => m.id === selectedModel)?.name || 'Modelo'}
              </span>
            </button>
          </div>
        )}
      </div>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'individual' | 'bulk' | 'spreadsheet')} className="space-y-3 sm:space-y-4 mt-[5px]">

        {/* ABA: ENTRADA INDIVIDUAL */}
        <TabsContent value="individual" className="space-y-3 sm:space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 w-full max-w-full">
            {/* Left Column - Container and Model Selection */}
            <div className="hidden lg:block lg:w-80 bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm h-fit w-full max-w-full p-[0px]">
            
            {/* Container Selection */}
            <div className="border-b border-gray-200 p-[0px] m-[0px]">
          {/* Header Recolhível */}
          <button
            onClick={() => setIsContainerSectionExpanded(!isContainerSectionExpanded)}
            className="flex items-center mb-2 w-full hover:opacity-70 transition-opacity p-0"
          >
            <ChevronDown 
              size={20} 
              className={`text-gray-600 transition-transform duration-200 ${
                isContainerSectionExpanded ? 'rotate-180' : ''
              }`}
            />
            <Label htmlFor="container-select" className="text-gray-900">
              Contêiner de Destino:
            </Label>
            {selectedContainerData && !isContainerSectionExpanded && (
              <span className="text-gray-900 text-sm font-medium">{selectedContainerData.name}</span>
            )}
          </button>
          
          {/* Conteúdo Recolhível */}
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isContainerSectionExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
          <Select value={selectedContainer} onValueChange={setSelectedContainer}>
            <SelectTrigger id="container-select" className="w-full">
              <SelectValue placeholder="Selecione o contêiner" />
            </SelectTrigger>
            <SelectContent>
              {containers.map((container) => {
                const percentage = ((container.current_stock / container.capacity) * 100).toFixed(0);
                const isFull = container.current_stock >= container.capacity;
                const isAlmostFull = percentage >= 90 && !isFull;
                
                return (
                  <SelectItem 
                    key={container.id} 
                    value={container.id}
                    disabled={isFull}
                  >
                    <div className="flex items-center gap-2">
                      <PackageIcon 
                        size={14} 
                        className={
                          isFull ? 'text-red-500' : 
                          isAlmostFull ? 'text-yellow-500' : 
                          'text-gray-500'
                        } 
                      />
                      <span className={isFull ? 'line-through text-gray-400' : ''}>
                        {container.name}
                      </span>
                      <span className={`text-xs ${
                        isFull ? 'text-red-600 font-bold' :
                        isAlmostFull ? 'text-yellow-600 font-semibold' :
                        'text-gray-500'
                      }`}>
                        ({percentage}%)
                      </span>
                      {isFull && (
                        <span className="text-xs text-red-600 font-bold ml-auto">CHEIO</span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {selectedContainerData && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                <span>{selectedContainerData.location}</span>
              </div>
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-gray-500">Ocupação:</span>
                <span className="text-gray-700 font-medium">
                  {selectedContainerData.current_stock}/{selectedContainerData.capacity}
                </span>
              </div>
              {/* Barra de progresso visual */}
              {selectedContainerData.capacity > 0 && (
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      ((selectedContainerData.current_stock / selectedContainerData.capacity) * 100) >= 100 ? 'bg-red-600' :
                      ((selectedContainerData.current_stock / selectedContainerData.capacity) * 100) > 80 ? 'bg-red-500' : 
                      ((selectedContainerData.current_stock / selectedContainerData.capacity) * 100) > 50 ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((selectedContainerData.current_stock / selectedContainerData.capacity) * 100, 100)}%` }}
                  />
                </div>
              )}
              
              {/* Alerta: Container Cheio */}
              {selectedContainerData.current_stock >= selectedContainerData.capacity && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-red-900 mb-1">
                        Container Cheio
                      </p>
                      <p className="text-xs text-red-700">
                        Selecione outro container para continuar o cadastro.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Alerta: Container Quase Cheio */}
              {selectedContainerData.current_stock < selectedContainerData.capacity &&
               ((selectedContainerData.current_stock / selectedContainerData.capacity) * 100) >= 90 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-yellow-900 mb-1">
                        Atenção: Quase Cheio
                      </p>
                      <p className="text-xs text-yellow-700">
                        {selectedContainerData.capacity - selectedContainerData.current_stock} {selectedContainerData.capacity - selectedContainerData.current_stock === 1 ? 'espaço restante' : 'espaços restantes'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Header Recolhível */}
        <button
          onClick={() => setIsQuickSelectionExpanded(!isQuickSelectionExpanded)}
          className="flex items-center gap-2 mb-1 w-full hover:opacity-70 transition-opacity p-0"
        >
          <ChevronDown 
            size={20} 
            className={`text-gray-600 transition-transform duration-200 ${
              isQuickSelectionExpanded ? 'rotate-180' : ''
            }`}
          />
          <div className="text-sm text-gray-500">Modelo Ativo:</div>
          {selectedModelData && !isQuickSelectionExpanded && (
            <div className="text-gray-900 text-sm font-medium">{selectedModelData.name}</div>
          )}
        </button>

        {/* Conteúdo Recolhível */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isQuickSelectionExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6 flex items-center gap-2">
            <Keyboard size={14} className="text-[#D50000] flex-shrink-0" />
            <span className="line-clamp-2">
              {shortcutMode === 'numeric' 
                ? `Pressione 1-${tireModels.length}` 
                : `Pressione A-${String.fromCharCode(64 + tireModels.length)}`
              }
            </span>
          </p>

          {/* Model buttons - VERTICAL em mobile, horizontal apenas em desktop */}
          <div className="flex flex-col gap-2 lg:gap-2 w-full">
          {tireModels.map((model, index) => {
            const shortcutKey = shortcutMode === 'numeric' 
              ? (index + 1).toString() 
              : String.fromCharCode(65 + index); // A, B, C...
            const sessionCount = modelCounts[model.id] || 0;
            
            return (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model.id);
                }}
                className={`
                  relative w-full px-3 sm:px-4 py-3 sm:py-3 rounded-lg border-2 transition-all duration-200
                  flex items-center gap-2 sm:gap-3
                  ${selectedModel === model.id
                    ? 'bg-[#D50000] border-[#D50000] text-white shadow-lg shadow-red-200'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 active:scale-[0.98]'
                  }
                `}
              >
                {/* Session count badge - bolinha verde */}
                {sessionCount > 0 && (
                  <div className="absolute -top-2 -right-2 min-w-[24px] sm:min-w-[28px] h-6 sm:h-7 px-1.5 sm:px-2 bg-[#00A86B] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg animate-in zoom-in duration-200">
                    {sessionCount}
                  </div>
                )}
                
                <div className={`
                  w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-mono text-base sm:text-lg font-bold
                  ${selectedModel === model.id ? 'bg-white/20' : 'bg-gray-100'}
                `}>
                  <span className={selectedModel === model.id ? 'text-white' : 'text-gray-900'}>
                    {shortcutKey}
                  </span>
                </div>
              <div className="text-left flex-1 min-w-0">
                <div className={`text-sm sm:text-base font-medium truncate ${selectedModel === model.id ? 'text-white' : 'text-gray-900'}`}>
                  {model.name}
                </div>
                <div className={`text-xs sm:text-sm ${selectedModel === model.id ? 'text-white/80' : 'text-gray-500'}`}>
                  {model.code}
                </div>
                {sessionCount > 0 && (
                  <div className={`text-xs sm:text-sm font-medium mt-0.5 flex items-center gap-1 ${selectedModel === model.id ? 'text-white' : 'text-[#00A86B]'}`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-current"></span>
                    {sessionCount} {sessionCount === 1 ? 'pneu' : 'pneus'} nesta sessão
                  </div>
                )}
              </div>
              </button>
            );
          })}
          </div>
        </div>

        {/* Selected Model Info */}
        {selectedModelData && (
          null
        )}
      </div>

      {/* Right Column - Registration Area */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Entries Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Pneus Escaneados</h3>
          </div>

          <div ref={tableScrollRef} className="overflow-x-auto max-h-[310px] overflow-y-auto">
            {entries.length === 0 ? (
              <EmptyState
                icon={PackageIcon}
                title="Nenhum pneu escaneado"
                description="Comece escaneando o código de barras amarelo ou digitando manualmente os 8 dígitos"
                className="py-6"
              />
            ) : (
              // 📋 TABELA COMPACTA (Mobile e Desktop)
              <table className="w-full text-sm">
                <thead className="hidden">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                      Contêiner
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                      Data/Hora
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((entry) => {
                    const isLastRegistered = entry.barcode === lastRegisteredBarcode;
                    return (
                    <tr 
                      key={entry.id} 
                      className={`hover:bg-gray-50/50 ${
                        isLastRegistered 
                          ? 'animate-highlight-fade' 
                          : ''
                      }`}
                    >
                      <td className="px-3 py-0 leading-none">
                        <div className="flex items-center gap-2 py-1">
                          <code className={`text-[11px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap leading-none ${
                            /^9\d{7}$/.test(entry.barcode)
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-yellow-50 text-yellow-900'
                          }`}>
                            {entry.barcode}
                          </code>
                          {/^9\d{7}$/.test(entry.barcode) && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-purple-50 text-purple-700 border-purple-300">
                              SEM CÓDIGO
                            </Badge>
                          )}
                          <span className="text-[11px] text-gray-700 font-medium leading-none">
                            {entry.model}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-0 text-[11px] text-gray-600 hidden md:table-cell leading-none">
                        {entry.container}
                      </td>
                      <td className="px-3 py-0 text-[11px] text-gray-500 hidden lg:table-cell whitespace-nowrap leading-none">
                        {entry.timestamp.toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-3 py-0 text-right whitespace-nowrap leading-none">
                        <button
                          onClick={() => {
                            haptic.light();
                            removeEntry(entry.barcode);
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Remover"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {entries.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              {/* Resumo e Botão Finalizar na mesma linha */}
              <div className="flex items-center justify-between gap-4">
                {/* Resumo da Sessão - À Esquerda */}
                <div className="bg-gradient-to-br from-[#D50000] to-[#A80000] rounded-lg p-3 shadow-md text-white flex-1">
                  <div className="flex flex-col items-center gap-3">
                    {/* Contador Total - Centralizado */}
                    <div className="flex items-center gap-2">
                      <div className="text-3xl font-bold leading-none">{entries.length}</div>
                      <div className="text-xs text-white/90 leading-tight">
                        {entries.length === 1 ? 'pneu' : 'pneus'}<br />escaneado{entries.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    
                    {/* 🎯 Indicador de Fila - Mostra quando há itens sendo processados */}
                    {queueSize > 0 && (
                      <div className="bg-yellow-500/20 backdrop-blur-sm rounded-md px-3 py-1 flex items-center gap-2 animate-pulse">
                        <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
                        <span className="text-xs text-white font-medium">
                          Processando {queueSize} {queueSize === 1 ? 'código' : 'códigos'}...
                        </span>
                      </div>
                    )}
                    
                    {/* Breakdown por modelo - Embaixo, centralizado */}
                    {Object.keys(modelCounts).length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap justify-center w-full">
                        {tireModels.map(model => {
                          const count = modelCounts[model.id] || 0;
                          if (count === 0) return null;
                          
                          return (
                            <div key={model.id} className="bg-white/20 backdrop-blur-sm rounded-md px-3 py-1.5 flex items-center gap-2 shadow-sm">
                              <span className="text-xs text-white/90 font-medium">{model.code}</span>
                              <span className="text-sm font-bold">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Botão Finalizar - À Direita */}
                {!hideFinishButton && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (queueSize > 0) {
                        toast.warning('Aguarde o processamento', {
                          description: `${queueSize} ${queueSize === 1 ? 'código está' : 'códigos estão'} sendo processado${queueSize === 1 ? '' : 's'}. Por favor, aguarde.`,
                          duration: 3000,
                          dismissible: true,
                        });
                        return;
                      }
                      setShowFinishDialog(true);
                    }}
                    disabled={queueSize > 0}
                    className="border-[#D50000] text-[#D50000] hover:bg-[#D50000] hover:text-white h-8 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 size={14} className="mr-1.5" />
                    Finalizar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
        </TabsContent>

        {/* ABA: ENTRADA EM MASSA */}
        <TabsContent value="bulk" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Formulário de Entrada em Massa */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Layers size={16} className="text-blue-600" />
                Cadastro em Massa
              </h2>

              <div className="space-y-3">
                {/* Seleção de Modelo */}
                <div>
                  <Label htmlFor="bulk-model">Modelo do Pneu</Label>
                  <Select value={bulkModel} onValueChange={setBulkModel}>
                    <SelectTrigger id="bulk-model">
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tireModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={model.type === 'Slick' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}
                            >
                              {model.type}
                            </Badge>
                            <span>{model.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Seleção de Contêiner */}
                <div>
                  <Label htmlFor="bulk-container">Contêiner de Destino</Label>
                  <Select value={bulkContainer} onValueChange={setBulkContainer}>
                    <SelectTrigger id="bulk-container">
                      <SelectValue placeholder="Selecione o contêiner" />
                    </SelectTrigger>
                    <SelectContent>
                      {containers.map((container) => {
                        const percentage = ((container.current_stock / container.capacity) * 100).toFixed(0);
                        return (
                          <SelectItem key={container.id} value={container.id}>
                            <div className="flex items-center gap-2">
                              <PackageIcon size={14} className="text-gray-500" />
                              <span>{container.name}</span>
                              <span className="text-xs text-gray-500">({percentage}%)</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Campo de Códigos de Barras */}
                <ValidatedTextarea
                  id="bulk-barcodes"
                  label="Códigos de Barras"
                  value={bulkBarcodes}
                  onChange={(e) => {
                    setBulkBarcodes(e.target.value);
                  }}
                  placeholder="Digite ou cole os códigos de 8 dígitos, um por linha&#10;&#10;Exemplo:&#10;12345678&#10;87654321&#10;11223344"
                  rows={12}
                  className="font-mono text-sm"
                  disabled={isBulkProcessing}
                  helperText="Cole ou digite um código por linha (8 dígitos cada)"
                  required
                />

                {/* Botão de Processar */}
                {isBulkProcessing ? (
                  <div className="space-y-3 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
                    {/* Contador de progresso */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-900">
                          Processando {bulkStatus.current} de {bulkStatus.total}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">{Math.round(bulkProgress)}%</span>
                    </div>
                    
                    {/* Barra de progresso */}
                    <Progress value={bulkProgress} className="h-3" />
                    
                    {/* Status detalhado */}
                    <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                      <div className="flex items-center gap-4 text-xs flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle size={14} className="text-green-600" />
                          <span className="text-green-700">{bulkStatus.success} salvos</span>
                        </div>
                        {bulkStatus.duplicate > 0 && (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle size={14} className="text-yellow-600" />
                            <span className="text-yellow-700">{bulkStatus.duplicate} duplicados</span>
                          </div>
                        )}
                        {bulkStatus.error > 0 && (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle size={14} className="text-red-600" />
                            <span className="text-red-700">{bulkStatus.error} erros</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Ação atual */}
                    <div className="text-xs text-gray-600 truncate">
                      {bulkStatus.currentAction}
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleBulkEntry}
                    disabled={!bulkModel || !bulkContainer || !bulkBarcodes.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <FileUp size={16} className="mr-2" />
                    Processar Cadastro em Massa
                  </Button>
                )}
              </div>
            </div>

            {/* Informações e Instruções */}
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="text-blue-900 text-sm mb-2">Como Funciona</h3>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                      <li>Selecione o modelo e contêiner de destino</li>
                      <li>Cole ou digite os códigos de barras (8 dígitos)</li>
                      <li>Um código por linha</li>
                      <li>Clique em "Processar" para cadastrar DIRETO no banco</li>
                      <li>O sistema valida e salva cada código automaticamente</li>
                      <li>Códigos duplicados ou já cadastrados serão ignorados</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-green-600 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="text-green-900 text-sm mb-2">Vantagens</h3>
                    <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
                      <li>Cadastre dezenas de pneus de uma só vez</li>
                      <li>Ideal para recebimento de grandes lotes</li>
                      <li>Menos chances de erro por digitação manual</li>
                      <li>Processamento automático e validado</li>
                    </ul>
                  </div>
                </div>
              </div>

              {bulkBarcodes && typeof bulkBarcodes === 'string' && bulkBarcodes.trim() && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <h3 className="text-gray-900 text-sm mb-2">Resumo</h3>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>
                      <span className="font-medium">Códigos digitados:</span>{' '}
                      {bulkBarcodes.split('\n').filter(b => b.trim().length > 0).length}
                    </p>
                    <p>
                      <span className="font-medium">Códigos válidos (8 dígitos):</span>{' '}
                      {bulkBarcodes.split('\n').filter(b => /^\d{8}$/.test(b.trim())).length}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ABA: ENTRADA PLANILHA */}
        <TabsContent value="spreadsheet" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Formulário de Entrada Planilha */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FileUp size={16} className="text-purple-600" />
                <h2 className="text-sm font-semibold text-gray-900">Entrada via Planilha</h2>
                <HelpTooltip 
                  content="Copie e cole dados diretamente do Excel/Google Sheets. O sistema processa múltiplos pneus automaticamente."
                  type="tip"
                  iconSize={14}
                />
              </div>

              <div className="space-y-3">
                {/* Campo de Texto da Planilha */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Label htmlFor="spreadsheet-text">Cole os dados da planilha</Label>
                    <HelpTooltip 
                      content="Copie as colunas CÓDIGO, MODELO e CONTÊINER diretamente do Excel. Mantenha o cabeçalho e o formato separado por TAB."
                      type="info"
                      iconSize={12}
                    />
                  </div>
                  <Textarea
                    id="spreadsheet-text"
                    value={spreadsheetText}
                    onChange={(e) => setSpreadsheetText(e.target.value)}
                    placeholder={"Cole os dados da planilha aqui\n\nFormato esperado (separado por TAB):\nCÓDIGO\tMODELO\tCONTÊINER\n5290731\t30/65-18 Porsche Cup N3\tGSILVA - WSCU 7032937\n5290742\t30/65-18 Porsche Cup N3\tGSILVA - WSCU 7032937"}
                    rows={15}
                    className="font-mono text-sm"
                    disabled={isSpreadsheetProcessing}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cole os dados diretamente do Excel/Google Sheets (com cabeçalho)
                  </p>
                </div>

                {/* Botão de Processar */}
                {isSpreadsheetProcessing ? (
                  <div className="space-y-3 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4">
                    {/* Contador de progresso */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-purple-600 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-900">
                          Processando {spreadsheetStatus.current} de {spreadsheetStatus.total}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">{Math.round(spreadsheetProgress)}%</span>
                    </div>
                    
                    {/* Barra de progresso */}
                    <Progress value={spreadsheetProgress} className="h-3" />
                    
                    {/* Status detalhado */}
                    <div className="flex items-center justify-between pt-2 border-t border-purple-200">
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle size={14} className="text-green-600" />
                          <span className="text-green-700">{spreadsheetStatus.success} salvos</span>
                        </div>
                        {spreadsheetStatus.error > 0 && (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle size={14} className="text-red-600" />
                            <span className="text-red-700">{spreadsheetStatus.error} erros</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Ação atual */}
                    <div className="text-xs text-gray-600 truncate">
                      {spreadsheetStatus.currentAction}
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleSpreadsheetEntry}
                    disabled={!spreadsheetText.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <FileUp size={16} className="mr-2" />
                    Processar Planilha
                  </Button>
                )}
              </div>
            </div>

            {/* Informações e Instruções */}
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-purple-600 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="text-purple-900 text-sm mb-2">Como Funciona</h3>
                    <ul className="text-xs text-purple-700 space-y-1 list-disc list-inside">
                      <li>Copie os dados do Excel/Google Sheets com o cabeçalho</li>
                      <li>Cole no campo acima (mantenha o formato de colunas)</li>
                      <li>Formato: CÓDIGO (TAB) MODELO (TAB) CONTÊINER</li>
                      <li>O sistema identifica automaticamente modelo e contêiner</li>
                      <li>Códigos duplicados ou já cadastrados serão rejeitados</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-green-600 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="text-green-900 text-sm mb-2">Vantagens</h3>
                    <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
                      <li>Cadastre pneus direto do controle de planilha</li>
                      <li>Modelo e contêiner são identificados automaticamente</li>
                      <li>Ideal para importar dados já organizados</li>
                      <li>Processamento rápido e validado</li>
                    </ul>
                  </div>
                </div>
              </div>

              {spreadsheetText.trim() && (() => {
                const lines = spreadsheetText.split('\n').filter(l => l.trim());
                const dataLines = lines.slice(1); // Pula o cabeçalho
                const validLines = dataLines.filter(line => {
                  const parts = line.split('\t');
                  return parts.length >= 3 && /^\d{7,8}$/.test(parts[0]?.trim());
                });
                
                return (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <h3 className="text-gray-900 text-sm mb-2">Resumo</h3>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Total de linhas:</span>{' '}
                        {lines.length}
                      </p>
                      <p>
                        <span className="font-medium">Linhas de dados:</span>{' '}
                        {dataLines.length}
                      </p>
                      <p>
                        <span className="font-medium">Linhas válidas:</span>{' '}
                        {validLines.length}
                      </p>
                      {validLines.length !== dataLines.length && (
                        <p className="text-orange-600 font-medium mt-2">
                          ⚠️ {dataLines.length - validLines.length} linha(s) com formato inválido
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alert Dialog para Finalizar Entrada */}
      <AlertDialog open={showFinishDialog} onOpenChange={(open) => {
        if (!isFinishing) {
          setShowFinishDialog(open);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isFinishing ? 'Finalizando entrada...' : 'Finalizar entrada de estoque?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isFinishing ? (
                <>
                  Processando a finalização de {entries.length} {entries.length === 1 ? 'pneu' : 'pneus'}. Por favor, aguarde.
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Processando {entries.length} {entries.length === 1 ? 'pneu' : 'pneus'}...</span>
                        <span>{Math.round(finishProgress)}%</span>
                      </div>
                      <Progress value={finishProgress} className="h-2" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p>
                    Você está prestes a finalizar a entrada de {entries.length} {entries.length === 1 ? 'pneu' : 'pneus'}.
                    Os dados serão salvos no sistema.
                  </p>
                  
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Download size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900 mb-1">
                          Deseja exportar um relatório em Excel?
                        </p>
                        <p className="text-sm text-blue-700">
                          O arquivo conterá todos os detalhes desta entrada de estoque incluindo códigos, modelos, containers e resumos.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!isFinishing && (
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="m-0">
                Cancelar
              </AlertDialogCancel>
              <Button
                onClick={() => handleFinishEntry(false)}
                variant="outline"
                className="m-0 border-gray-300 hover:bg-gray-50"
              >
                <CheckCircle2 size={16} className="mr-2" />
                Finalizar sem Exportar
              </Button>
              <Button
                onClick={() => handleFinishEntry(true)}
                className="m-0 bg-[#D50000] hover:bg-[#B00000] text-white"
              >
                <Download size={16} className="mr-2" />
                Finalizar e Exportar XLS
              </Button>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* 💾 Dialog de Recuperação de Sessão */}
      <AlertDialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle size={24} className="text-blue-600" />
              Sessão anterior encontrada
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>
                  Foi detectada uma sessão de entrada de estoque não finalizada.
                </p>
                
                {recoveryData && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-blue-900">Total de pneus:</span>
                        <span className="text-blue-700">{recoveryData.entries.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-blue-900">Data/Hora:</span>
                        <span className="text-blue-700">
                          {new Date(recoveryData.timestamp).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-blue-900">Modelo ativo:</span>
                        <span className="text-blue-700">
                          {tireModels.find(m => m.id === recoveryData.selectedModel)?.name || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-blue-900">Container ativo:</span>
                        <span className="text-blue-700">
                          {containers.find(c => c.id === recoveryData.selectedContainer)?.name || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                <p className="text-sm text-gray-600">
                  Deseja recuperar esta sessão e continuar de onde parou?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={handleDiscardSession}
              variant="outline"
              className="m-0 border-gray-300 hover:bg-gray-50"
            >
              <X size={16} className="mr-2" />
              Descartar e Iniciar Nova Sessão
            </Button>
            <Button
              onClick={handleRecoverSession}
              className="m-0 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle size={16} className="mr-2" />
              Recuperar Sessão
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 📱 FAB: Floating Action Button - ALINHADO COM TÍTULO (Mobile Only) */}
      {isMobile && (
        <button
          onClick={() => {
            haptic.medium();
            quickActionsSheet.open();
          }}
          className="fixed top-4 right-4 z-50 w-12 h-12 bg-[#D50000] hover:bg-[#B00000] text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all"
          aria-label="Ações Rápidas"
          title="Atalhos Rápidos"
        >
          <Zap size={20} />
        </button>
      )}

      {/* 📱 Bottom Sheet: Ações Rápidas */}
      <BottomSheet
        isOpen={quickActionsSheet.isOpen}
        onClose={quickActionsSheet.close}
        title="Ações Rápidas"
        height="auto"
      >
        <div className="space-y-3">
          {/* Seção: Modelo Ativo */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h4 className="text-gray-900 font-semibold mb-3 flex items-center gap-2">
              <PackageIcon size={18} className="text-[#D50000]" />
              Modelo Ativo
            </h4>
            <div className="space-y-2">
              {tireModels.map((model, index) => {
                const shortcutKey = shortcutMode === 'numeric' 
                  ? (index + 1).toString() 
                  : String.fromCharCode(65 + index);
                const sessionCount = modelCounts[model.id] || 0;
                const isSelected = selectedModel === model.id;
                
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      haptic.light();
                      setSelectedModel(model.id);
                      quickActionsSheet.close(); // Fecha automaticamente após selecionar
                    }}
                    className={`
                      relative w-full px-3 py-3 rounded-lg border-2 transition-all
                      flex items-center gap-3
                      ${isSelected
                        ? 'bg-[#D50000] border-[#D50000] text-white shadow-md'
                        : 'bg-white border-gray-200 text-gray-700 active:scale-[0.98]'
                      }
                    `}
                  >
                    {sessionCount > 0 && (
                      <div className="absolute -top-2 -right-2 min-w-[24px] h-6 px-1.5 bg-[#00A86B] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                        {sessionCount}
                      </div>
                    )}
                    
                    <div className={`
                      w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-mono text-base font-bold
                      ${isSelected ? 'bg-white/20' : 'bg-gray-100'}
                    `}>
                      <span className={isSelected ? 'text-white' : 'text-gray-900'}>
                        {shortcutKey}
                      </span>
                    </div>
                    
                    <div className="text-left flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {model.name}
                      </div>
                      <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                        {model.code}
                      </div>
                      {sessionCount > 0 && (
                        <div className={`text-xs font-medium mt-0.5 flex items-center gap-1 ${isSelected ? 'text-white' : 'text-[#00A86B]'}`}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current"></span>
                          {sessionCount} {sessionCount === 1 ? 'pneu' : 'pneus'} nesta sessão
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seção: Container Ativo */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h4 className="text-gray-900 font-semibold mb-3 flex items-center gap-2">
              <PackageIcon size={18} className="text-[#D50000]" />
              Container Ativo
            </h4>
            <div className="space-y-2">
              {containers.map((container) => {
                const isSelected = selectedContainer === container.id;
                const usagePercentage = (container.current_stock / container.capacity) * 100;
                
                return (
                  <button
                    key={container.id}
                    onClick={() => {
                      haptic.light();
                      setSelectedContainer(container.id);
                      quickActionsSheet.close(); // Fecha automaticamente após selecionar
                    }}
                    className={`
                      relative w-full px-3 py-3 rounded-lg border-2 transition-all
                      flex items-center gap-3
                      ${isSelected
                        ? 'bg-[#D50000] border-[#D50000] text-white shadow-md'
                        : 'bg-white border-gray-200 text-gray-700 active:scale-[0.98]'
                      }
                    `}
                  >
                    <div className="text-left flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {container.name}
                      </div>
                      <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                        {container.current_stock}/{container.capacity} ({Math.round(usagePercentage)}% ocupado)
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ação: Finalizar Sessão */}
          {entries.length > 0 && (
            <button
              onClick={() => {
                haptic.light();
                setShowFinishDialog(true);
                quickActionsSheet.close();
              }}
              className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl flex items-center gap-3 active:scale-[0.98] transition-all hover:border-green-500"
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-gray-900">Finalizar Sessão</p>
                <p className="text-xs text-gray-500">{entries.length} {entries.length === 1 ? 'pneu registrado' : 'pneus registrados'}</p>
              </div>
            </button>
          )}

          {/* Ação: Alternar Modo de Atalhos */}
          <button
            onClick={() => {
              haptic.light();
              setShortcutMode(shortcutMode === 'letters' ? 'numeric' : 'letters');
              quickActionsSheet.close();
              toast.success(`Modo ${shortcutMode === 'letters' ? 'numérico' : 'letras'} ativado`, { dismissible: true });
            }}
            className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl flex items-center gap-3 active:scale-[0.98] transition-all hover:border-purple-500"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Keyboard size={20} className="text-purple-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900">Alternar Atalhos</p>
              <p className="text-xs text-gray-500">Modo atual: {shortcutMode === 'letters' ? 'A-G' : '1-7'}</p>
            </div>
          </button>

          {/* Ação: Alternar Autofoco */}
          <button
            onClick={() => {
              haptic.light();
              toggleAutoFocus();
              quickActionsSheet.close();
            }}
            className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl flex items-center gap-3 active:scale-[0.98] transition-all hover:border-blue-500"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              autoFocusEnabled ? 'bg-[#D50000]' : 'bg-gray-100'
            }`}>
              <Focus size={20} className={autoFocusEnabled ? 'text-white' : 'text-gray-600'} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900">Autofoco</p>
              <p className="text-xs text-gray-500">
                {autoFocusEnabled ? 'Ativado - campo foca automaticamente' : 'Desativado'}
              </p>
            </div>
          </button>

          {/* Ação: Pneu sem Código de Barras */}
          <button
            onClick={() => {
              haptic.light();
              setNoBarcode(!noBarcode);
              quickActionsSheet.close();
              if (!noBarcode) {
                setBarcode('');
                toast.info('Modo "Sem Código" ativado', {
                  description: 'Clique em "Adicionar Pneu SEM Código" para registrar pneus sem código de barras',
                  duration: 3000,
                  dismissible: true,
                });
              } else {
                toast.success('Modo "Sem Código" desativado', {
                  description: 'Voltou ao modo normal de escaneamento',
                  duration: 2000,
                  dismissible: true,
                });
              }
            }}
            className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl flex items-center gap-3 active:scale-[0.98] transition-all hover:border-purple-500"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              noBarcode ? 'bg-purple-600' : 'bg-gray-100'
            }`}>
              <Plus size={20} className={noBarcode ? 'text-white' : 'text-gray-600'} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900">Pneu sem Código de Barras</p>
              <p className="text-xs text-gray-500">
                {noBarcode ? 'Ativado - códigos automáticos 90000001...' : 'Desativado'}
              </p>
            </div>
          </button>

          {/* Ação: Alternar Modo de Entrada */}
          <button
            onClick={() => {
              haptic.light();
              quickActionsSheet.close();
            }}
            className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                {activeTab === 'individual' && <PackageIcon size={20} className="text-orange-600" />}
                {activeTab === 'bulk' && <Layers size={20} className="text-orange-600" />}
                {activeTab === 'spreadsheet' && <FileUp size={20} className="text-orange-600" />}
              </div>
              <div className="flex-1 text-left">
                <p className="text-gray-900">Modo de Entrada</p>
                <p className="text-xs text-gray-500">Selecione o tipo de cadastro</p>
              </div>
            </div>
            
            {/* Opções de Modo */}
            <div className="flex flex-col gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptic.light();
                  setActiveTab('individual');
                  quickActionsSheet.close();
                  toast.success('Modo Individual ativado', { dismissible: true });
                }}
                className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                  activeTab === 'individual'
                    ? 'bg-[#D50000] border-[#D50000] text-white'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                <PackageIcon size={16} />
                <span className="text-sm font-medium">Individual</span>
                {activeTab === 'individual' && (
                  <CheckCircle2 size={16} className="ml-auto" />
                )}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptic.light();
                  setActiveTab('bulk');
                  quickActionsSheet.close();
                  toast.success('Modo Lote ativado', { dismissible: true });
                }}
                className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                  activeTab === 'bulk'
                    ? 'bg-[#D50000] border-[#D50000] text-white'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                <Layers size={16} />
                <span className="text-sm font-medium">Entrada em Lote</span>
                {activeTab === 'bulk' && (
                  <CheckCircle2 size={16} className="ml-auto" />
                )}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptic.light();
                  setActiveTab('spreadsheet');
                  quickActionsSheet.close();
                  toast.success('Modo Planilha ativado', { dismissible: true });
                }}
                className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                  activeTab === 'spreadsheet'
                    ? 'bg-[#D50000] border-[#D50000] text-white'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                <FileUp size={16} />
                <span className="text-sm font-medium">Entrada Planilha</span>
                {activeTab === 'spreadsheet' && (
                  <CheckCircle2 size={16} className="ml-auto" />
                )}
              </button>
            </div>
          </button>
        </div>
      </BottomSheet>
    </div>
    </AnimatedTransition>
  );
}

function Package({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}

// Default export for lazy loading compatibility
export default TireStockEntry;
