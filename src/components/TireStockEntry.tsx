import { useState, useEffect, useRef } from 'react';
import { generateUUID } from '../utils/uuid';
import { Search, CheckCircle, X, Package as PackageIcon, AlertCircle, Keyboard, CheckCircle2, Camera, Focus, FileUp, Layers, Plus, Upload, Undo2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner@2.0.3';
import { BarcodeScanner } from './BarcodeScanner';
import { PageHeader } from './PageHeader';
import { EmptyState } from './EmptyState';
import { StockEntrySkeleton } from './LoadingSkeleton';
import { LoadingSpinner, ButtonLoading } from './LoadingSpinner';
import { TouchFeedback, useHaptic } from './TouchFeedback';
import { useKeyboardAdjustment } from '../utils/useKeyboardAdjustment';
import { BarcodeConfirmationAnimation } from './BarcodeConfirmationAnimation';
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

interface TireEntry {
  id: string;
  barcode: string;
  model: string;
  modelId: string;
  container: string;
  containerId: string;
  timestamp: Date;
}

type ShortcutMode = 'numeric' | 'letters';

export function TireStockEntry() {
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [barcode, setBarcode] = useState('');
  const [entries, setEntries] = useState<TireEntry[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showBarcodeAnimation, setShowBarcodeAnimation] = useState(false);
  const [lastRegisteredBarcode, setLastRegisteredBarcode] = useState('');
  const [shortcutMode, setShortcutMode] = useState<ShortcutMode>('letters');
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishProgress, setFinishProgress] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [modelCounts, setModelCounts] = useState<Record<string, number>>({});
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastShortcutTime = useRef<number>(0);
  const allowAutoFocus = useRef<boolean>(true);

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

  // Estados para Entrada Planilha
  const [spreadsheetText, setSpreadsheetText] = useState('');
  const [isSpreadsheetProcessing, setIsSpreadsheetProcessing] = useState(false);
  const [spreadsheetProgress, setSpreadsheetProgress] = useState(0);

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

  // Carrega modelos e contêineres na montagem
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const models = await getTireModels();
        const containersList = await getContainers();
        
        setTireModels(models);
        setContainers(containersList);
        
        // IMPORTANTE: Carrega o cache de estoque para validação de duplicatas
        // Isso garante que checkBarcodeExists tenha dados no cache como fallback
        await getStockEntries();
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
        
        // Define seleção inicial
        if (models.length > 0) {
          setSelectedModel(models[0].id);
        }
        if (containersList.length > 0) {
          setSelectedContainer(containersList[0].id);
        }
      } finally {
        setIsLoading(false);
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
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Escuta mudanças nos modelos de pneus
  useEffect(() => {
    const handleUpdate = async () => {
      const models = await getTireModels();
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
      const containersList = await getContainers();
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
      // Recarrega os containers para atualizar a ocupação calculada dinamicamente
      const containersList = await getContainers();
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
        setTimeout(() => {
          allowAutoFocus.current = true;
        }, 800);

        if (shortcutMode === 'numeric') {
          // Atalhos numéricos (1-7)
          const num = parseInt(e.key);
          const modelIndex = num - 1;
          if (tireModels[modelIndex]) {
            setSelectedModel(tireModels[modelIndex].id);
            toast.success('Modelo selecionado', {
              description: tireModels[modelIndex].name,
              duration: 1500,
            });
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
            toast.success('Modelo selecionado', {
              description: tireModels[modelIndex].name,
              duration: 1500,
            });
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

    const interval = setInterval(() => {
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
        if (!hasModalOpen) {
          inputRef.current.focus();
        }
      }
    }, 100); // Verifica a cada 100ms

    return () => clearInterval(interval);
  }, [autoFocusEnabled]);

  // Auto-submit quando atingir exatamente 8 dígitos numéricos - OTIMIZADO (SEM DELAY)
  useEffect(() => {
    if (barcode.length === 8 && /^\d{8}$/.test(barcode) && selectedModel && selectedContainer) {
      // REMOVIDO: delay de 200ms - registro instantâneo para máxima velocidade
      registerEntry();
    }
  }, [barcode]);

  const toggleShortcutMode = () => {
    const newMode: ShortcutMode = shortcutMode === 'numeric' ? 'letters' : 'numeric';
    setShortcutMode(newMode);
    localStorage.setItem('shortcut-mode', newMode);
    toast.success(`Atalhos alterados para ${newMode === 'numeric' ? 'números (1-7)' : 'letras (A-G)'}`, {
      description: 'Use o teclado para selecionar modelos rapidamente',
    });
  };

  const toggleAutoFocus = () => {
    const newValue = !autoFocusEnabled;
    setAutoFocusEnabled(newValue);
    localStorage.setItem('autofocus-enabled', newValue.toString());
    
    if (newValue) {
      toast.success('Autofoco ativado', {
        description: 'O campo de código de barras será focado automaticamente',
      });
      // Foca imediatamente quando ativado
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      toast.info('Autofoco desativado', {
        description: 'Você precisará clicar no campo para digitar',
      });
    }
  };

  const registerEntry = async () => {
    if (!barcode.trim() || !selectedModel || !selectedContainer) return;

    const barcodeValue = barcode.trim();

    // Valida se o código tem exatamente 8 dígitos numéricos
    if (!/^\d{8}$/.test(barcodeValue)) {
      haptic.error(); // 📱 Vibração de erro
      toastStockEntry.invalidCode();
      setBarcode('');
      inputRef.current?.focus();
      return;
    }

    const model = tireModels.find(m => m.id === selectedModel);
    const container = containers.find(c => c.id === selectedContainer);
    
    if (!model || !container) return;

    // ✅ VALIDAÇÃO: Verifica se o container tem espaço disponível (considerando itens já na lista)
    const entriesInSameContainer = entries.filter(e => e.containerId === container.id).length;
    const totalInContainer = container.current_stock + entriesInSameContainer;
    
    if (totalInContainer >= container.capacity) {
      haptic.error(); // 📱 Vibração de erro
      toastStockEntry.containerFull(container.name, totalInContainer, container.capacity);
      setBarcode('');
      inputRef.current?.focus();
      return;
    }

    // ⚠️ AVISO: Container próximo ao limite (90% ou mais)
    const usagePercentage = (totalInContainer / container.capacity) * 100;
    if (usagePercentage >= 90 && usagePercentage < 100) {
      const remainingSpace = container.capacity - totalInContainer;
      toastStockEntry.containerAlmostFull(container.name, remainingSpace);
    }

    // 🚀 OTIMIZAÇÃO 1: Limpa campo IMEDIATAMENTE
    setBarcode('');
    
    // 🚀 OTIMIZAÇÃO 2: Mostra feedback visual instantâneo
    setShowSuccess(true);
    
    // 🚀 OTIMIZAÇÃO 3: Foca campo IMEDIATAMENTE para próximo scan
    setTimeout(() => inputRef.current?.focus(), 10);

    // Verifica se o código já existe na lista local
    if (entries.some(e => e.barcode === barcodeValue)) {
      setShowSuccess(false);
      haptic.error(); // 📱 Vibração de erro
      toast.error('Código duplicado', {
        description: `O código ${barcodeValue} já foi escaneado nesta sessão`,
      });
      return;
    }

    // Verifica se o código de barras já existe no banco (assíncrono, não bloqueia UI)
    const exists = await checkBarcodeExists(barcodeValue);
    if (exists) {
      setShowSuccess(false);
      haptic.error(); // 📱 Vibração de erro
      toastStockEntry.duplicate(barcodeValue);
      return;
    }

    // ✅ ADICIONA APENAS NA LISTA LOCAL - NÃO SALVA NO BANCO AINDA
    const newEntry: TireEntry = {
      id: generateUUID(),
      barcode: barcodeValue,
      model: model.name,
      modelId: model.id,
      container: container.name,
      containerId: container.id,
      timestamp: new Date(),
    };
    setEntries([newEntry, ...entries]);

    haptic.success(); // 📱 Vibração de sucesso
    
    // 🎉 ANIMAÇÃO DE CONFIRMAÇÃO - Mostra animação fullscreen
    setLastRegisteredBarcode(barcodeValue);
    setShowBarcodeAnimation(true);
    setTimeout(() => setShowBarcodeAnimation(false), 1500);
    
    // Toast discreto e rápido indicando que foi adicionado à lista
    toast.success('Pneu adicionado à lista', {
      description: `${model.name} - ${barcodeValue}`,
      duration: 2000,
    });
    
    // 🚀 OTIMIZAÇÃO: Esconde indicador mais rápido (400ms)
    setTimeout(() => setShowSuccess(false), 400);
  };

  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    registerEntry();
  };

  const handleScan = (scannedCode: string) => {
    console.log('📸 handleScan chamado com código:', scannedCode);
    // Define o código escaneado no input
    setBarcode(scannedCode);
    
    // Se o código tem 8 dígitos, registra automaticamente
    if (/^\d{8}$/.test(scannedCode) && selectedModel && selectedContainer) {
      console.log('✅ Código válido - registrando automaticamente...');
      // Pequeno delay para garantir que o estado foi atualizado
      setTimeout(() => {
        registerEntry();
      }, 300);
    } else if (!/^\d{8}$/.test(scannedCode)) {
      toast.warning('Código não tem 8 dígitos', {
        description: `Código escaneado: ${scannedCode}`,
        duration: 3000,
      });
    }
  };

  const removeEntry = (barcode: string) => {
    console.log(`🗑️ Removendo entrada da lista local: ${barcode}`);
    const entryToRemove = entries.find(e => e.barcode === barcode);
    
    if (!entryToRemove) {
      console.error(`❌ Entrada não encontrada para barcode: ${barcode}`);
      toast.error('Entrada não encontrada', {
        description: `Código: ${barcode}`,
      });
      return;
    }
    
    // ✅ APENAS remove da lista local - NÃO remove do banco ainda (pois não foi salvo ainda)
    setEntries(prevEntries => prevEntries.filter(e => e.barcode !== barcode));
    
    // Toast com ação de desfazer
    toast.info('Entrada removida da lista', {
      description: `Código: ${barcode}`,
      duration: 5000,
      action: {
        label: 'Desfazer',
        onClick: () => {
          // Restaura a entrada na lista local
          setEntries(prev => [entryToRemove, ...prev]);
          toast.success('Entrada restaurada', {
            description: `Código: ${barcode}`,
          });
        }
      }
    });
  };

  const handleFinishEntry = async () => {
    const totalEntries = entries.length;
    
    if (totalEntries === 0) {
      setShowFinishDialog(false);
      toast.info('Nenhum pneu para registrar', {
        description: 'Escaneie códigos de barras antes de finalizar',
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
    
    // Limpa a lista de entradas da sessão atual
    setEntries([]);
    
    // Reseta os contadores de modelos
    setModelCounts({});
    
    // Fecha o diálogo e reseta estados
    setIsFinishing(false);
    setFinishProgress(0);
    setShowFinishDialog(false);
    
    // Mostra mensagem de sucesso/erro
    if (errorCount === 0) {
      haptic.success(); // 📱 Vibração de sucesso
      toast.success('✅ Entrada finalizada com sucesso!', {
        description: `${successCount} ${successCount === 1 ? 'pneu registrado' : 'pneus registrados'} no banco de dados.`,
        duration: 4000,
      });
      
      // Dispara evento para onboarding checklist
      window.dispatchEvent(new Event('tire-added'));
    } else if (successCount === 0) {
      haptic.error(); // 📱 Vibração de erro
      toast.error('❌ Erro ao registrar pneus', {
        description: `Nenhum pneu foi salvo. Tente novamente.`,
        duration: 5000,
      });
    } else {
      haptic.warning(); // 📱 Vibração de aviso
      toast.warning('⚠️ Entrada finalizada com erros', {
        description: `${successCount} pneus salvos, ${errorCount} falharam. Códigos com erro: ${errors.join(', ')}`,
        duration: 6000,
      });
    }
    
    // Retorna o foco para o input
    setTimeout(() => {
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
      toast.error('Digite os códigos de barras');
      return;
    }

    if (!bulkModel || !bulkContainer) {
      toast.error('Selecione modelo e contêiner');
      return;
    }

    // Parse e normalização dos códigos de barras
    const rawCodes = bulkBarcodes
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    if (rawCodes.length === 0) {
      toast.error('Nenhum código válido encontrado');
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
      });
      return;
    }

    // Verifica duplicatas dentro da lista
    const uniqueBarcodes = [...new Set(barcodes)];
    if (uniqueBarcodes.length !== barcodes.length) {
      toast.warning('Códigos duplicados removidos', {
        description: `${barcodes.length - uniqueBarcodes.length} duplicata(s) removida(s)`,
      });
    }

    // Nota: A validação de duplicatas será feita pelo backend durante o saveStockEntry
    // Códigos duplicados retornarão false e serão contabilizados como erros

    // Inicia processamento
    setIsBulkProcessing(true);
    setBulkProgress(0);

    const model = tireModels.find(m => m.id === bulkModel);
    const container = containers.find(c => c.id === bulkContainer);

    if (!model || !container) {
      toast.error('Modelo ou contêiner não encontrado');
      setIsBulkProcessing(false);
      return;
    }

    // ✅ VALIDAÇÃO: Verifica se o container tem espaço suficiente
    const availableSpace = container.capacity - container.current_stock;
    if (availableSpace < uniqueBarcodes.length) {
      toast.error(`Espaço insuficiente no container ${container.name}`, {
        description: `Disponível: ${availableSpace} | Necessário: ${uniqueBarcodes.length}`,
        duration: 6000,
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
      });
    }

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    // ✅ SALVA DIRETAMENTE NO BANCO DE DADOS (processamento em massa otimizado)
    console.log(`🚀 Iniciando cadastro em massa de ${uniqueBarcodes.length} pneus...`);
    
    for (let i = 0; i < uniqueBarcodes.length; i++) {
      const code = uniqueBarcodes[i];
      
      // Verifica duplicata no banco
      const exists = await checkBarcodeExists(code);
      if (exists) {
        duplicateCount++;
        setBulkProgress(((i + 1) / uniqueBarcodes.length) * 100);
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
        // ✅ SALVA DIRETAMENTE NO BANCO
        const success = await saveStockEntry(stockEntry);
        
        if (success) {
          successCount++;
          console.log(`✅ Pneu ${i + 1}/${uniqueBarcodes.length} cadastrado: ${code}`);
        } else {
          errorCount++;
          console.error(`❌ Falha ao cadastrar pneu ${i + 1}/${uniqueBarcodes.length}: ${code}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao cadastrar pneu ${i + 1}/${uniqueBarcodes.length}:`, error);
      }

      // Atualiza progresso
      setBulkProgress(((i + 1) / uniqueBarcodes.length) * 100);
      
      // Pequeno delay para evitar sobrecarga
      if (i < uniqueBarcodes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
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
      });
      
      // Limpa campos
      setBulkBarcodes('');
    } else if (duplicateCount > 0 && successCount === 0) {
      haptic.error();
      toast.error('❌ Nenhum pneu cadastrado', {
        description: `Todos os ${uniqueBarcodes.length} códigos já existem no sistema`,
        duration: 4000,
      });
    } else {
      haptic.error();
      toast.error('❌ Erro no cadastro em massa', {
        description: `Nenhum pneu foi cadastrado. Verifique os dados e tente novamente.`,
        duration: 4000,
      });
    }
  };

  // ============================================
  // FUNÇÕES PARA ENTRADA PLANILHA
  // ============================================

  const handleSpreadsheetEntry = async () => {
    console.log('🔄 [PLANILHA] Iniciando processamento...');
    
    if (!spreadsheetText.trim()) {
      toast.error('Cole os dados da planilha');
      return;
    }

    console.log('📋 [PLANILHA] Texto recebido:', spreadsheetText.substring(0, 200) + '...');

    // Parse das linhas da planilha
    const lines = spreadsheetText.split('\n').filter(l => l.trim());
    console.log(`📊 [PLANILHA] Total de linhas: ${lines.length}`);
    
    if (lines.length < 2) {
      toast.error('Planilha vazia ou inválida', {
        description: 'Certifique-se de incluir o cabeçalho e pelo menos uma linha de dados',
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
      });
    }

    if (parsedData.length === 0) {
      toast.error('Nenhuma linha válida encontrada');
      return;
    }

    // Inicia processamento
    setIsSpreadsheetProcessing(true);
    setSpreadsheetProgress(0);

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
        continue;
      }

      console.log(`   ✅ [PLANILHA] Contêiner encontrado: "${container.name}" (ID: ${container.id})`);

      // ✅ VALIDAÇÃO: Verifica se o container tem espaço disponível
      if (container.current_stock >= container.capacity) {
        console.error(`   ❌ [PLANILHA] Linha ${lineNumber}: Container \"${container.name}\" está cheio (${container.current_stock}/${container.capacity})`);
        errorCount++;
        errors.push(`Linha ${lineNumber}: Container "${container.name}" está cheio`);
        setSpreadsheetProgress(((i + 1) / parsedData.length) * 100);
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
        continue;
      }

      // Verifica duplicata no banco
      const exists = await checkBarcodeExists(barcode);
      if (exists) {
        console.error(`   ❌ [PLANILHA] Linha ${lineNumber}: Código ${barcode} já existe no banco`);
        errorCount++;
        errors.push(`Linha ${lineNumber}: Código ${barcode} já cadastrado`);
        setSpreadsheetProgress(((i + 1) / parsedData.length) * 100);
        continue;
      }

      console.log(`   ✅ [PLANILHA] Adicionando à lista temporária...`);
      
      // ✅ ADICIONA APENAS NA LISTA LOCAL - NÃO SALVA NO BANCO AINDA
      successCount++;
      
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
      console.log(`   📝 [PLANILHA] Entrada adicionada à lista local`)

      // Atualiza progresso
      setSpreadsheetProgress(((i + 1) / parsedData.length) * 100);
      
      // Pequeno delay para UX
      await new Promise(resolve => setTimeout(resolve, 100));
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
      toast.success('✅ Dados da planilha adicionados!', {
        description: `${successCount} pneus prontos para registrar. Clique em "Finalizar Entrada" para salvar.`,
        duration: 4000,
      });
      
      // Limpa campo
      setSpreadsheetText('');
    } else if (successCount > 0 && errorCount > 0) {
      haptic.warning();
      toast.warning('⚠️ Importação parcial concluída', {
        description: `${successCount} adicionados, ${errorCount} com erro. Clique em "Finalizar Entrada" para salvar.`,
        duration: 5000,
      });
      
      // Mostra erros no console e em alert para debug
      if (errors.length > 0) {
        console.error('❌ [PLANILHA] Erros detalhados:', errors);
        
        // Mostra resumo de erros em toast
        setTimeout(() => {
          toast.error('Detalhes dos erros', {
            description: errors.slice(0, 3).join('\n') + (errors.length > 3 ? `\n...e mais ${errors.length - 3}` : ''),
            duration: 6000,
          });
        }, 500);
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

  return (
    <AnimatedTransition variant="fade">
      <div className="flex-1 flex flex-col gap-4 sm:gap-6 px-2 py-2 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
        {/* Page Header with Breadcrumbs */}
        <PageHeader
        icon={PackageIcon}
        title="Entrada de Estoque"
        description="Registro rápido de pneus no sistema"
        breadcrumbs={[
          { label: 'Pneus' },
          { label: 'Entrada de Estoque' }
        ]}
        actions={
          <div className="flex items-center gap-2 flex-shrink-0">
          {/* Toggle Autofoco */}
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
          
          {/* Toggle Atalhos */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleShortcutMode}
            className="flex items-center gap-1.5 sm:gap-2 bg-white px-2.5 sm:px-3"
          >
            <Keyboard size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline text-xs sm:text-sm">Atalhos:</span>
            <span className="font-mono text-xs sm:text-sm font-bold">{shortcutMode === 'numeric' ? '1-7' : 'A-G'}</span>
          </Button>
          </div>
        }
      />

      <Tabs defaultValue="individual" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-3 h-auto p-1 gap-1">
          <TabsTrigger value="individual" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white">
            <span className="hidden sm:inline">Individual</span>
            <span className="sm:hidden">Individual</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white">
            <span className="hidden sm:inline">Lote</span>
            <span className="sm:hidden">Massa</span>
          </TabsTrigger>
          <TabsTrigger value="spreadsheet" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white">
            <span className="hidden sm:inline">Em Massa</span>
            <span className="sm:hidden">Planilha</span>
          </TabsTrigger>
        </TabsList>

        {/* ABA: ENTRADA INDIVIDUAL */}
        <TabsContent value="individual" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 w-full max-w-full">
            {/* Left Column - Container and Model Selection */}
            <div className="lg:w-80 bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm h-fit w-full max-w-full">
            
            {/* Container Selection */}
            <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Label htmlFor="container-select" className="text-gray-900">
              Contêiner de Destino
            </Label>
            <HelpTooltip 
              content="Selecione onde os pneus serão armazenados. A ocupação atual é mostrada em tempo real."
              type="info"
              iconSize={14}
            />
          </div>
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

        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-gray-900 text-base sm:text-lg">Seleção Rápida</h2>
          <HelpTooltip 
            content="Use os atalhos do teclado para selecionar modelos instantaneamente sem precisar clicar nos botões."
            type="tip"
            iconSize={14}
          />
        </div>
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
                  toast.success('Modelo selecionado', {
                    description: model.name,
                    duration: 1500,
                  });
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

        {/* Selected Model Info */}
        {selectedModelData && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Modelo Ativo:</div>
            <div className="text-gray-900 mb-4">{selectedModelData.name}</div>
            
            {/* Resumo da sessão */}
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-gradient-to-r from-[#D50000] to-[#B00000] p-3 rounded-lg text-white">
                <span className="text-sm font-medium">Total Nesta Sessão:</span>
                <Badge variant="secondary" className="bg-white text-[#D50000] hover:bg-white font-bold">
                  {entries.length}
                </Badge>
              </div>
              
              {modelCounts[selectedModelData.id] > 0 && (
                <div className="flex items-center justify-between bg-[#00A86B] p-3 rounded-lg text-white">
                  <span className="text-sm">Deste Modelo:</span>
                  <Badge variant="secondary" className="bg-white text-[#00A86B] hover:bg-white font-bold">
                    {modelCounts[selectedModelData.id]}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Registration Area */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Resumo da Sessão Atual */}
        {entries.length > 0 && (
          <div className="bg-gradient-to-br from-[#D50000] to-[#A80000] rounded-xl p-6 shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold mb-1">Resumo da Sessão Atual</h3>
                <p className="text-sm text-white/80">Pneus escaneados até finalizar</p>
              </div>
              <div className="text-3xl font-bold">{entries.length}</div>
            </div>
            
            {/* Breakdown por modelo */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/20">
              {tireModels.map(model => {
                const count = modelCounts[model.id] || 0;
                if (count === 0) return null;
                
                return (
                  <div key={model.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-xs text-white/70 mb-1">{model.code}</div>
                    <div className="text-lg font-bold">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Barcode Input */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-gray-900">Código de Barras Amarelo</h2>
            <HelpTooltip 
              content="O código de 7-8 dígitos está na etiqueta amarela do pneu. Códigos com 7 dígitos serão automaticamente completados com 0 à esquerda."
              type="help"
              iconSize={14}
            />
          </div>
          <p className="text-gray-500 text-sm mb-6">
            {isMobile ? (
              <>
                <span className="flex items-center gap-2 mb-1">
                  <Camera size={16} className="text-[#D50000]" />
                  Toque no ícone da câmera para escanear
                </span>
                <span className="text-xs">ou digite manualmente o código de 8 dígitos</span>
              </>
            ) : (
              'Escaneie ou digite o código de 8 dígitos do pneu'
            )}
          </p>

          <form onSubmit={handleBarcodeSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                <Input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  value={barcode}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Aceita apenas números e limita a 8 dígitos
                    const numericValue = value.replace(/\D/g, '').slice(0, 8);
                    setBarcode(numericValue);
                    // Valida em tempo real
                    barcodeValidation.validateField('barcode', numericValue);
                  }}
                  onFocus={(e) => {
                    console.log('📸 Campo focado');
                    // Não abre mais a câmera automaticamente
                    // Usuário deve clicar no ícone da câmera para abrir
                  }}
                  placeholder="00000000 (8 dígitos)"
                  className={`!pl-12 ${isMobile ? 'pr-16' : 'pr-20'} py-6 text-lg tracking-wider border-2 rounded-xl font-mono transition-all ${
                    barcode.length === 0
                      ? 'border-gray-300 focus:border-[#D50000]'
                      : barcode.length === 8
                      ? 'border-[#00A86B] focus:border-[#00A86B] bg-green-50'
                      : 'border-[#FFB800] focus:border-[#FFB800] bg-yellow-50'
                  }`}
                  style={{ paddingLeft: '3rem' }}
                  autoFocus={!isMobile && autoFocusEnabled}
                  maxLength={8}
                />
                {showSuccess ? (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00A86B] animate-bounce-scale" size={24} />
                ) : isMobile && barcode.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      console.log('📸 Botão câmera clicado (ícone dentro do input)');
                      setShowScanner(true);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-[#D50000] text-white hover:bg-[#B00000] rounded-lg transition-all shadow-lg animate-pulse-slow"
                    title="Usar câmera"
                    aria-label="Abrir scanner de código de barras"
                  >
                    <Camera size={20} />
                  </button>
                ) : barcode.length === 8 ? (
                  <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00A86B]" size={24} />
                ) : null}
              </div>
              
              {/* Progress bar - Feedback visual do progresso */}
              {barcode.length > 0 && barcode.length < 8 && (
                <div className="mt-2">
                  <Progress 
                    value={(barcode.length / 8) * 100} 
                    className="h-1.5"
                  />
                </div>
              )}
              
              {/* Mensagem de erro de validação */}
              {barcodeValidation?.errors?.barcode && barcode.length === 8 && (
                <div className="mt-2 flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{barcodeValidation.errors.barcode}</span>
                </div>
              )}
              
              {/* Indicador de validação assíncrona */}
              {barcodeValidation?.validating?.barcode && (
                <div className="mt-2 flex items-center gap-2 text-blue-600 text-sm">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando código de barras...</span>
                </div>
              )}
            </div>
            
            {/* Status de validação em tempo real */}
            {barcode.length > 0 && !barcodeValidation?.errors?.barcode && (
              <div className={`flex items-center gap-2 text-sm font-medium transition-all ${
                barcode.length === 8
                  ? 'text-[#00A86B]'
                  : 'text-[#FFB800]'
              }`}>
                {barcode.length === 8 ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Código válido • Pronto para registro automático</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} />
                    <span>Digite mais {8 - barcode.length} {8 - barcode.length === 1 ? 'dígito' : 'dígitos'}</span>
                  </>
                )}
              </div>
            )}
            
            {barcode.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <AlertCircle size={14} />
                <span>Apenas números • Auto-registro ao completar 8 dígitos</span>
              </div>
            )}

            {/* Scanner de Câmera - Aparece em Mobile */}
            {isMobile && (
              <Button
                type="button"
                onClick={() => {
                  console.log('📸 Botão câmera clicado (botão grande)');
                  setShowScanner(true);
                }}
                className="w-full py-6 bg-gradient-to-r from-[#D50000] to-[#A80000] text-white hover:from-[#A80000] hover:to-[#8B0000] rounded-xl flex items-center justify-center gap-3 transition-all shadow-md text-base font-semibold"
              >
                <Camera size={24} />
                <span>📷 Abrir Câmera para Escanear</span>
              </Button>
            )}

            <Button 
              type="submit" 
              className="w-full py-6 bg-[#D50000] hover:bg-[#B00000] text-white rounded-xl"
            >
              Registrar Entrada
            </Button>
          </form>
        </div>

        {/* Entries Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-gray-900">Pneus Escaneados</h3>
            <p className="text-gray-500 text-sm">Últimas entradas registradas</p>
          </div>

          <div className="overflow-x-auto">
            {entries.length === 0 ? (
              <EmptyState
                icon={PackageIcon}
                title="Nenhum pneu escaneado"
                description="Comece escaneando o código de barras amarelo ou digitando manualmente os 8 dígitos"
                actions={[
                  ...(isMobile ? [{
                    label: 'Abrir Câmera',
                    onClick: () => setShowScanner(true),
                    icon: Camera,
                    variant: 'default' as const
                  }] : [])
                ]}
                className="py-8"
              />
            ) : isMobile ? (
              // 📱 MOBILE: Swipeable Cards
              <SwipeableList className="p-4">
                {entries.map((entry) => (
                  <SwipeableCard
                    key={entry.id}
                    onDelete={() => {
                      haptic.light();
                      removeEntry(entry.barcode);
                      toast.success('Entrada removida', {
                        description: `Código ${entry.barcode} removido`,
                        duration: 2000,
                      });
                    }}
                    deleteText="Remover"
                    className="mb-2"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <code className="text-sm bg-yellow-50 text-yellow-900 px-2 py-1 rounded font-mono">
                          {entry.barcode}
                        </code>
                        <span className="text-xs text-gray-500">
                          {entry.timestamp.toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{entry.model}</p>
                      <p className="text-xs text-gray-600">{entry.container}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        ← Deslize para remover
                      </p>
                    </div>
                  </SwipeableCard>
                ))}
              </SwipeableList>
            ) : (
              // 🖥️ DESKTOP: Table
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Código de Barras
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Modelo
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Contêiner
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm bg-yellow-50 text-yellow-900 px-2 py-1 rounded">
                          {entry.barcode}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entry.container}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entry.timestamp.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => removeEntry(entry.barcode)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Remover entrada"
                        >
                          <X size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {entries.length > 0 && (
            <div className="p-6 border-t border-gray-200">
              {/* Resumo por modelo */}
              <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(modelCounts).map(([modelId, count]) => {
                  const model = tireModels.find(m => m.id === modelId);
                  if (!model) return null;
                  
                  return (
                    <div key={modelId} className="bg-gray-50 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-xs text-gray-600">{model.code}</span>
                      <Badge variant="secondary" className="bg-[#00A86B] text-white">
                        {count}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {entries.length} {entries.length === 1 ? 'pneu registrado' : 'pneus registrados'} nesta sessão
                </span>
                <Button 
                  variant="outline" 
                  onClick={() => setShowFinishDialog(true)}
                  className="border-[#D50000] text-[#D50000] hover:bg-[#D50000] hover:text-white"
                >
                  <CheckCircle2 size={16} className="mr-2" />
                  Finalizar Entrada ({entries.length})
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
        </TabsContent>

        {/* ABA: ENTRADA EM MASSA */}
        <TabsContent value="bulk" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário de Entrada em Massa */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-gray-900 mb-4 flex items-center gap-2">
                <Layers size={20} className="text-blue-600" />
                Cadastro em Massa
              </h2>

              <div className="space-y-4">
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
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Processando cadastros...</span>
                      <span>{Math.round(bulkProgress)}%</span>
                    </div>
                    <Progress value={bulkProgress} className="h-2" />
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
        <TabsContent value="spreadsheet" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário de Entrada Planilha */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileUp size={20} className="text-purple-600" />
                <h2 className="text-gray-900">Entrada via Planilha</h2>
                <HelpTooltip 
                  content="Copie e cole dados diretamente do Excel/Google Sheets. O sistema processa múltiplos pneus automaticamente."
                  type="tip"
                  iconSize={14}
                />
              </div>

              <div className="space-y-4">
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
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Processando planilha...</span>
                      <span>{Math.round(spreadsheetProgress)}%</span>
                    </div>
                    <Progress value={spreadsheetProgress} className="h-2" />
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
                <>
                  Você está prestes a finalizar a entrada de {entries.length} {entries.length === 1 ? 'pneu' : 'pneus'}.
                  Os dados já foram salvos no sistema. Deseja limpar a lista e iniciar uma nova sessão de entrada?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!isFinishing && (
            <AlertDialogFooter>
              <AlertDialogCancel>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleFinishEntry}
                className="bg-[#D50000] hover:bg-[#B00000] text-white"
              >
                Finalizar
              </AlertDialogAction>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleScan}
        onClose={() => {
          console.log('🚪 Fechando scanner via onClose');
          setShowScanner(false);
        }}
      />

      {/* 🎉 Animação de Confirmação de Código de Barras */}
      <BarcodeConfirmationAnimation
        show={showBarcodeAnimation}
        barcode={lastRegisteredBarcode}
        modelName={tireModels.find(m => m.id === selectedModel)?.name}
        type="success"
        message="Pneu Registrado!"
      />

      {/* 📱 FAB: Floating Action Button (Mobile Only) */}
      {isMobile && (
        <button
          onClick={() => {
            haptic.medium();
            quickActionsSheet.open();
          }}
          className="fixed bottom-20 right-4 z-30 w-14 h-14 bg-[#D50000] hover:bg-[#B00000] text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all"
          aria-label="Ações Rápidas"
        >
          <Zap size={24} />
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
          {/* Ação: Abrir Câmera */}
          <button
            onClick={() => {
              haptic.light();
              setShowScanner(true);
              quickActionsSheet.close();
            }}
            className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl flex items-center gap-3 active:scale-98 transition-all hover:border-[#D50000]"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Camera size={20} className="text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900">Escanear Código</p>
              <p className="text-xs text-gray-500">Abrir câmera para ler código de barras</p>
            </div>
          </button>

          {/* Ação: Finalizar Sessão */}
          {entries.length > 0 && (
            <button
              onClick={() => {
                haptic.light();
                setShowFinishDialog(true);
                quickActionsSheet.close();
              }}
              className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl flex items-center gap-3 active:scale-98 transition-all hover:border-green-500"
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
              toast.success(`Modo ${shortcutMode === 'letters' ? 'numérico' : 'letras'} ativado`);
            }}
            className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl flex items-center gap-3 active:scale-98 transition-all hover:border-purple-500"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Keyboard size={20} className="text-purple-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900">Alternar Atalhos</p>
              <p className="text-xs text-gray-500">Modo atual: {shortcutMode === 'letters' ? 'A-G' : '1-7'}</p>
            </div>
          </button>

          {/* Ação: Informações */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle size={16} className="text-gray-500 mt-0.5" />
              <p className="text-xs text-gray-600">
                Dicas para entrada rápida:
              </p>
            </div>
            <ul className="text-xs text-gray-500 space-y-1 ml-6 list-disc">
              <li>Use os atalhos A-G para selecionar modelos</li>
              <li>Código de 8 dígitos registra automaticamente</li>
              <li>Deslize cards para a esquerda para remover</li>
            </ul>
          </div>
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
