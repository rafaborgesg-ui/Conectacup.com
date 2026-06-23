import { useState, useEffect, useRef } from 'react';
import { ArrowRightLeft, Search, Barcode, Truck, Package, Calendar, User, History, CheckCircle2, AlertCircle, FileUp, Layers, Filter, Loader2, Download, Radio } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner@2.0.3';
import { toastMovement, toastUndoable } from '../utils/toastHelpers';
import { RFIDPortal } from './RFIDPortal';
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
  updateStockEntryContainer,
  type StockEntry
} from '../utils/storage';
import { createClient } from '../utils/supabase/client';
 
// ============================================
// CONEXÃO DIRETA SUPABASE
// Schema: public | Tabela: tire_movements
// ============================================

// Interface de movimentação de pneu
interface TireMovement {
  id: string;
  barcode: string;
  modelName: string;
  modelType: 'Slick' | 'Wet';
  fromContainerId: string;
  fromContainerName: string;
  toContainerId: string;
  toContainerName: string;
  timestamp: string;
  movedBy: string; // UUID do usuário
  movedByName: string; // Nome do usuário
  reason?: string;
}

// Interface de contêiner
interface Container {
  id: string;
  name: string;
  location?: string;
  capacity?: number;
  created_at?: string;
  updated_at?: string;
}
 
export function TireMovement() {
  // Estado para movimentação individual
  const [barcode, setBarcode] = useState('');
  const [selectedTire, setSelectedTire] = useState<StockEntry | null>(null);
  const [targetContainer, setTargetContainer] = useState('');
  const [reason, setReason] = useState('');
  const [containers, setContainers] = useState<Container[]>([]);
  const [movements, setMovements] = useState<TireMovement[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [searchResults, setSearchResults] = useState<StockEntry[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Estado para movimentação em massa
  const [bulkSourceContainer, setBulkSourceContainer] = useState('');
  const [bulkTargetContainer, setBulkTargetContainer] = useState('');
  const [bulkFilterModel, setBulkFilterModel] = useState('all');
  const [bulkFilterType, setBulkFilterType] = useState('all');
  const [bulkBarcodes, setBulkBarcodes] = useState('');
  const [selectedTires, setSelectedTires] = useState<StockEntry[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkReason, setBulkReason] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkProcessingPhase, setBulkProcessingPhase] = useState<'preparing' | 'saving' | 'updating' | 'complete'>('preparing');
  const [bulkProcessedCount, setBulkProcessedCount] = useState(0);
  const [bulkStartTime, setBulkStartTime] = useState<number>(0);
  const [tireModels, setTireModels] = useState<any[]>([]);

  // Paginação para histórico
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado para forçar re-render durante processamento (atualiza tempo em tempo real)
  const [, setProgressTick] = useState(0);

  // Atualiza estatísticas em tempo real durante processamento
  useEffect(() => {
    if (!isBulkProcessing) return;
    
    const interval = setInterval(() => {
      setProgressTick(prev => prev + 1); // Força re-render
    }, 100); // Atualiza 10x por segundo
    
    return () => clearInterval(interval);
  }, [isBulkProcessing]);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadContainers(),
          loadMovements(),
          loadTireModels()
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();

    const handleStockUpdate = () => {
      loadMovements();
    };

    const handleContainersUpdate = () => {
      loadContainers();
    };

    const handleModelsUpdate = () => {
      loadTireModels();
    };

    window.addEventListener('stock-entries-updated', handleStockUpdate);
    window.addEventListener('containers-updated', handleContainersUpdate);
    window.addEventListener('tire-models-updated', handleModelsUpdate);
    
    return () => {
      window.removeEventListener('stock-entries-updated', handleStockUpdate);
      window.removeEventListener('containers-updated', handleContainersUpdate);
      window.removeEventListener('tire-models-updated', handleModelsUpdate);
    };
  }, []);

  // ============================================
  // FUNÇÕES SUPABASE - CONTÊINERES
  // ============================================
  
  const loadContainers = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('containers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar contêineres do Supabase:', error);
        setContainers([]);
        return;
      }

      console.log('✅ Contêineres carregados do Supabase:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('   Exemplos de contêineres:');
        data.slice(0, 3).forEach(c => {
          console.log(`     - ID: "${c.id}", Nome: "${c.name}"`);
        });
      }
      setContainers(data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar contêineres:', error);
      setContainers([]);
    }
  };

  // ============================================
  // FUNÇÕES SUPABASE - MOVIMENTAÇÕES
  // ============================================
  
  const loadMovements = async () => {
    try {
      const supabase = createClient();
      // Limite otimizado para evitar timeout
      const { data, error } = await supabase
        .from('tire_movements')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(3000); // Limite menor pois movimentações são menos frequentes

      if (error) {
        console.error('❌ Erro ao carregar movimentações do Supabase:', error);
        setMovements([]);
        return;
      }

      console.log('✅ Movimentações carregadas do Supabase:', data?.length || 0);
      
      // Transforma dados do Supabase para o formato do componente
      const transformedMovements: TireMovement[] = (data || []).map((row: any) => ({
        id: row.id,
        barcode: row.barcode,
        modelName: row.model_name,
        modelType: row.model_type,
        fromContainerId: row.from_container_id,
        fromContainerName: row.from_container_name,
        toContainerId: row.to_container_id,
        toContainerName: row.to_container_name,
        timestamp: row.created_at, // Schema usa created_at
        movedBy: row.moved_by || '',
        movedByName: row.moved_by_name || 'Usuário',
        reason: row.reason || undefined,
      }));

      setMovements(transformedMovements);
    } catch (error) {
      console.error('❌ Erro ao carregar movimentações:', error);
      setMovements([]);
    }
  };

  const saveTireMovement = async (movement: TireMovement) => {
    try {
      const supabase = createClient();
      
      // Transforma para o formato do banco de dados (snake_case)
      // Não envia ID - deixa o banco gerar (gen_random_uuid())
      const dbMovement = {
        barcode: movement.barcode,
        model_name: movement.modelName,
        model_type: movement.modelType,
        from_container_id: movement.fromContainerId || null,
        from_container_name: movement.fromContainerName || null,
        to_container_id: movement.toContainerId || null, // Converte "" para null
        to_container_name: movement.toContainerName,
        // created_at é gerado automaticamente pelo banco
        moved_by: movement.movedBy || null,
        moved_by_name: movement.movedByName,
        reason: movement.reason || null,
      };

      const { error } = await supabase
        .from('tire_movements')
        .insert([dbMovement]);

      if (error) {
        console.error('❌ Erro ao salvar movimentação no Supabase:', error);
        throw error;
      }

      console.log('✅ Movimentação salva no Supabase:', movement.barcode);
    } catch (error) {
      console.error('❌ Erro ao salvar movimentação:', error);
      throw error;
    }
  };

  const saveBulkMovements = async (movements: TireMovement[]) => {
    try {
      const supabase = createClient();
      
      // Transforma para o formato do banco de dados (snake_case)
      // Não envia ID - deixa o banco gerar (gen_random_uuid())
      const dbMovements = movements.map(movement => ({
        barcode: movement.barcode,
        model_name: movement.modelName,
        model_type: movement.modelType,
        from_container_id: movement.fromContainerId || null,
        from_container_name: movement.fromContainerName || null,
        to_container_id: movement.toContainerId || null, // Converte "" para null
        to_container_name: movement.toContainerName,
        // created_at é gerado automaticamente pelo banco
        moved_by: movement.movedBy || null,
        moved_by_name: movement.movedByName,
        reason: movement.reason || null,
      }));

      // Salva em lotes de 100
      const batchSize = 100;
      for (let i = 0; i < dbMovements.length; i += batchSize) {
        const batch = dbMovements.slice(i, i + batchSize);
        const { error } = await supabase
          .from('tire_movements')
          .insert(batch);

        if (error) {
          console.error('❌ Erro ao salvar lote de movimentações no Supabase:', error);
          throw error;
        }
      }

      console.log('✅ Movimentações em massa salvas no Supabase:', movements.length);
    } catch (error) {
      console.error('❌ Erro ao salvar movimentações em massa:', error);
      throw error;
    }
  };

  // ============================================
  // FUNÇÕES AUXILIARES - MODELOS
  // ============================================

  const loadTireModels = async () => {
    try {
      const models = await getTireModels();
      setTireModels(Array.isArray(models) ? models : []);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      setTireModels([]);
    }
  };

  // ============================================
  // FUNÇÕES RFID - Decodificação SGTIN-96
  // ============================================

  // 📡 FUNÇÃO: Detecta se o código é RFID (EPC hexadecimal)
  const isRFIDCode = (code: string): boolean => {
    // RFID EPC tem 24 caracteres hexadecimais (96 bits / 4 = 24)
    const trimmed = code.trim();
    const isRFID = /^[0-9A-Fa-f]{24}$/.test(trimmed);
    console.log(`🔍 isRFIDCode("${trimmed}") = ${isRFID} (${trimmed.length} chars)`);
    return isRFID;
  };

  // 📡 FUNÇÃO: Decodifica SGTIN-96 (EPC) e retorna código de barras
  const decodeRFID = (epcHex: string): { barcode: string; cai: string } | null => {
    try {
      console.log(`📡 Decodificando RFID: ${epcHex}`);

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

      console.log(`📊 RFID Decodificado: ItemRef=${itemReference}, Serial=${serial}`);

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
      };
    } catch (error) {
      console.error('❌ Erro ao decodificar RFID:', error);
      return null;
    }
  };

  // ============================================
  // FUNÇÕES DE BUSCA E SELEÇÃO
  // ============================================

  const handleBarcodeChange = async (value: string) => {
    // Aceita números E letras para suportar RFID (hexadecimal)
    const cleanValue = value.trim().toUpperCase();

    // Valida: apenas alfanumérico (hexadecimal)
    if (!/^[0-9A-F]*$/.test(cleanValue)) {
      return; // Ignora caracteres inválidos
    }

    setBarcode(cleanValue);

    // Auto-submit quando RFID completo (24 chars) ou código de barras (8 dígitos)
    if (cleanValue.length === 24 && isRFIDCode(cleanValue)) {
      console.log('🎯 RFID completo detectado, auto-submit...');
      // Aguarda um ciclo para garantir que o estado foi atualizado
      setTimeout(() => handleBarcodeSubmit(), 100);
    } else if (cleanValue.length === 8 && /^\d{8}$/.test(cleanValue)) {
      console.log('🎯 Código de barras completo detectado, auto-submit...');
      setTimeout(() => handleBarcodeSubmit(), 100);
    }
  };

  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let searchBarcode = barcode;

    // 📡 Detecta e decodifica RFID
    if (isRFIDCode(barcode)) {
      console.log('📡 ========================================');
      console.log('📡 CÓDIGO RFID DETECTADO!');
      console.log('📡 Código:', barcode);
      console.log('📡 Iniciando decodificação...');

      const rfidData = decodeRFID(barcode);

      if (!rfidData) {
        toast.error('Erro ao decodificar RFID', {
          description: 'O código RFID não pôde ser decodificado.',
        });
        return;
      }

      console.log('✅ RFID decodificado com sucesso!');
      console.log('📊 CAI:', rfidData.cai);
      console.log('📊 Código de Barras:', rfidData.barcode);

      searchBarcode = rfidData.barcode;

      toast.success('RFID Decodificado', {
        description: `CAI: ${rfidData.cai} | Código: ${rfidData.barcode}`,
        duration: 3000,
      });
    } else if (barcode.length !== 8) {
      toast.error('Código inválido', {
        description: 'O código deve ter 8 dígitos ou 24 caracteres (RFID).',
      });
      return;
    }

    try {
      const supabase = createClient();

      // Normaliza código para comparação (remove zeros à esquerda)
      const normalizedSearch = searchBarcode.replace(/^0+/, '') || '0';
      console.log(`🔍 Buscando código de barras: ${searchBarcode} (normalizado: ${normalizedSearch})`);

      const { data, error } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('barcode', searchBarcode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Pneu não encontrado', {
            description: `Código ${searchBarcode} não existe no estoque.`,
          });
          return;
        }
        throw error;
      }

      if (!data) {
        toast.error('Pneu não encontrado', {
          description: `Código ${searchBarcode} não existe no estoque.`,
        });
        return;
      }

      // Converte snake_case para camelCase
      const tire: StockEntry = {
        id: data.id,
        barcode: data.barcode,
        modelId: data.model_id,
        modelName: data.model_name,
        modelType: data.model_type,
        containerId: data.container_id || '',
        containerName: data.container_name || 'Sem Contêiner',
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // 🛡️ VALIDAÇÃO: Verifica se barcode é válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(tire.barcode) || !/^\d{8}$/.test(tire.barcode)) {
        console.error('❌ [TireMovement] Pneu com barcode corrompido detectado:', tire.barcode);
        toast.error('Registro corrompido', {
          description: `O pneu ${searchBarcode} tem barcode inválido no banco de dados. Execute FIX_CORRUPTED_BARCODES.sql`,
          duration: 6000,
        });
        return;
      }

      selectTire(tire);
    } catch (error) {
      console.error('Erro ao buscar pneu:', error);
      toast.error('Erro ao buscar pneu', {
        description: 'Tente novamente.',
      });
    }
  };

  const selectTire = (tire: StockEntry) => {
    setSelectedTire(tire);
    setBarcode(tire.barcode);
    setShowSearchResults(false);
    setTargetContainer('');
    toast.success('Pneu selecionado', {
      description: `${tire.modelName} - ${tire.containerName}`,
    });
  };

  // ============================================
  // MOVIMENTAÇÃO INDIVIDUAL
  // ============================================

  const handleMove = async () => {
    if (!selectedTire || !targetContainer) {
      toast.error('Dados incompletos', {
        description: 'Selecione o pneu e o contêiner de destino.',
      });
      return;
    }

    // Só valida se não estiver saindo de "sem contêiner"
    if (selectedTire.containerId && targetContainer === selectedTire.containerId) {
      toastMovement.sameContainer();
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmMove = async () => {
    if (!selectedTire || !targetContainer) return;

    // Trata "Sem contêiner" (no-container)
    const isNoContainer = targetContainer === 'no-container';
    const targetCont = isNoContainer ? null : containers.find(c => c.id === targetContainer);
    
    if (!isNoContainer && !targetCont) return;

    // Obtém dados do usuário do localStorage
    const userData = JSON.parse(localStorage.getItem('porsche-cup-user') || '{}');
    const userId = userData.id || '';
    const userName = userData.name || 'Usuário';

    const targetContainerId = isNoContainer ? '' : targetContainer;
    const targetContainerName = isNoContainer ? 'Sem Contêiner' : targetCont!.name;

    const movement: TireMovement = {
      id: '', // Será gerado pelo banco
      barcode: selectedTire.barcode,
      modelName: selectedTire.modelName,
      modelType: (selectedTire.modelType || 'Slick') as 'Slick' | 'Wet',
      fromContainerId: selectedTire.containerId || '',
      fromContainerName: selectedTire.containerName || 'Sem Contêiner',
      toContainerId: targetContainerId,
      toContainerName: targetContainerName,
      timestamp: new Date().toISOString(),
      movedBy: userId,
      movedByName: userName,
      reason: reason.trim() || undefined,
    };

    try {
      // 💾 Salva estado original para possibilitar desfazer
      const originalContainerId = selectedTire.containerId || '';
      const originalContainerName = selectedTire.containerName || 'Sem Contêiner';
      
      await saveTireMovement(movement);
      await updateStockEntryContainer(selectedTire.barcode, targetContainerId, targetContainerName);

      // 🔄 Toast com botão "Desfazer"
      toastUndoable.movement({
        title: '🚚 Pneu Movimentado',
        description: `${selectedTire.modelName} • ${originalContainerName} → ${targetContainerName}`,
        duration: 8000, // 8 segundos para movimentações
        onUndo: async () => {
          // Reverte a movimentação
          await updateStockEntryContainer(
            selectedTire.barcode, 
            originalContainerId, 
            originalContainerName
          );
          
          // Salva uma movimentação reversa no histórico
          const reverseMovement: TireMovement = {
            id: '',
            barcode: selectedTire.barcode,
            modelName: selectedTire.modelName,
            modelType: selectedTire.modelType as 'Slick' | 'Wet',
            fromContainerId: targetContainerId,
            fromContainerName: targetContainerName,
            toContainerId: originalContainerId,
            toContainerName: originalContainerName,
            timestamp: new Date().toISOString(),
            movedBy: movement.movedBy,
            movedByName: movement.movedByName,
            reason: 'Movimentação desfeita',
          };
          await saveTireMovement(reverseMovement);
          
          // Atualiza lista
          loadMovements();
          
          console.log('✅ Movimentação desfeita:', selectedTire.barcode);
        }
      });

      // Dispara evento para onboarding checklist
      window.dispatchEvent(new Event('tire-moved'));

      // Limpa o formulário
      setSelectedTire(null);
      setBarcode('');
      setTargetContainer('');
      setReason('');
      setShowConfirmDialog(false);
      loadMovements();
      
      // Retorna foco para o input
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Erro ao movimentar pneu:', error);
      toast.error('Erro ao movimentar pneu', {
        description: 'Tente novamente.',
      });
    }
  };

  const getAvailableContainers = () => {
    if (!selectedTire) return containers;
    // Se não tem contêiner, mostra todos
    if (!selectedTire.containerId) return containers;
    return containers.filter(c => c.id !== selectedTire.containerId);
  };

  // ============================================
  // MOVIMENTAÇÃO EM MASSA
  // ============================================

  const loadBulkTires = async () => {
    console.log('🔍 loadBulkTires chamado');
    console.log('   bulkSourceContainer:', bulkSourceContainer);
    console.log('   bulkFilterModel:', bulkFilterModel);
    console.log('   bulkFilterType:', bulkFilterType);
    
    if (!bulkSourceContainer) {
      toast.error('Selecione um contêiner', {
        description: 'Escolha o contêiner de origem para carregar os pneus.',
      });
      setSelectedTires([]);
      return;
    }

    setIsBulkProcessing(true);

    try {
      // Busca pneus diretamente do Supabase
      const supabase = createClient();
      const { data: entries, error } = await supabase
        .from('stock_entries')
        .select('*');

      if (error) {
        console.error('❌ Erro ao carregar pneus:', error);
        toast.error('Erro ao carregar pneus', {
          description: 'Não foi possível buscar os pneus do banco de dados.',
        });
        setSelectedTires([]);
        return;
      }

      console.log('   Total de entries no estoque:', entries?.length || 0);
      
      // DEBUG: Mostra alguns exemplos de container_id
      if (entries && entries.length > 0) {
        console.log('   Exemplos de container_ids no estoque:');
        entries.slice(0, 5).forEach((entry: any, idx: number) => {
          console.log(`     [${idx}] barcode: ${entry.barcode}, container_id: "${entry.container_id}", container_name: "${entry.container_name}"`);
        });
      }
      
      // Converte snake_case para camelCase para compatibilidade
      const stockEntries: StockEntry[] = (entries || []).map((entry: any) => ({
        id: entry.id,
        barcode: entry.barcode,
        modelId: entry.model_id,
        modelName: entry.model_name,
        modelType: entry.model_type,
        containerId: entry.container_id,
        containerName: entry.container_name,
        status: entry.status,
        sessionId: entry.session_id,
        pilot: entry.pilot,
        team: entry.team,
        notes: entry.notes,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
        createdBy: entry.created_by,
      }));
      
      // Permite selecionar contêiner vazio (sem contêiner)
      let filteredTires = bulkSourceContainer === 'no-container' 
        ? stockEntries.filter(entry => !entry.containerId)
        : stockEntries.filter(entry => entry.containerId === bulkSourceContainer);

      console.log('   Após filtro por contêiner:', filteredTires.length);

      // Filtrar por modelo
      if (bulkFilterModel !== 'all') {
        filteredTires = filteredTires.filter(entry => entry.modelId === bulkFilterModel);
        console.log('   Após filtro por modelo:', filteredTires.length);
      }

      // Filtrar por tipo
      if (bulkFilterType !== 'all') {
        filteredTires = filteredTires.filter(entry => entry.modelType === bulkFilterType);
        console.log('   Após filtro por tipo:', filteredTires.length);
      }

      console.log('✅ Pneus filtrados:', filteredTires.length);
      setSelectedTires(filteredTires);
      
      // Feedback para o usuário
      if (filteredTires.length === 0) {
        const containerName = containers.find(c => c.id === bulkSourceContainer)?.name || 'este contêiner';
        toast.warning('Nenhum pneu encontrado', {
          description: `Não há pneus em ${bulkSourceContainer === 'no-container' ? 'sem contêiner' : containerName} com os filtros selecionados.`,
        });
      } else {
        const containerName = containers.find(c => c.id === bulkSourceContainer)?.name || 'contêiner';
        toast.success(`${filteredTires.length} pneus carregados`, {
          description: `Encontrados em ${bulkSourceContainer === 'no-container' ? 'sem contêiner' : containerName}`,
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar pneus:', error);
      toast.error('Erro', {
        description: 'Não foi possível carregar os pneus.',
      });
      setSelectedTires([]);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkBarcodeLoad = async () => {
    console.log('🔍 Carregando pneus por códigos de barras...');
    console.log('   Texto bruto:', bulkBarcodes);

    // Extrai códigos do texto (aceita 7/8 dígitos OU 24 chars hex RFID)
    const rawCodes = bulkBarcodes
      .split(/[\n,;\s]+/) // Split por quebras de linha, vírgulas, ponto-vírgula ou espaços
      .map(line => line.trim().toUpperCase())
      .filter(line => line.length > 0); // Remove linhas vazias

    console.log('   Códigos brutos extraídos:', rawCodes);

    // Processa cada código: detecta RFID e decodifica, ou normaliza código de barras
    const processedCodes: string[] = [];
    const rfidDecoded: { original: string; decoded: string; cai: string }[] = [];

    for (const code of rawCodes) {
      // 📡 Detecta RFID (24 caracteres hexadecimais)
      if (isRFIDCode(code)) {
        console.log(`📡 RFID detectado: ${code}`);
        const rfidData = decodeRFID(code);

        if (rfidData) {
          console.log(`   ✅ Decodificado: ${rfidData.barcode} (CAI: ${rfidData.cai})`);
          processedCodes.push(rfidData.barcode);
          rfidDecoded.push({
            original: code,
            decoded: rfidData.barcode,
            cai: rfidData.cai
          });
        } else {
          console.warn(`   ❌ Falha ao decodificar RFID: ${code}`);
        }
      } else {
        // Código de barras normal: remove caracteres não numéricos
        const numericCode = code.replace(/\D/g, '');

        // Normaliza códigos de 7 dígitos para 8 (adiciona zero à esquerda)
        if (numericCode.length === 7) {
          const normalized = '0' + numericCode;
          console.log(`   📝 Código normalizado: ${numericCode} -> ${normalized}`);
          processedCodes.push(normalized);
        } else if (numericCode.length === 8) {
          processedCodes.push(numericCode);
        } else {
          console.warn(`   ⚠️ Código inválido ignorado: "${code}" (${numericCode.length} dígitos)`);
        }
      }
    }

    // Remove duplicatas
    const barcodes = processedCodes.filter((code, index, self) => self.indexOf(code) === index);

    console.log('   Códigos válidos encontrados:', barcodes.length);
    console.log('   Códigos processados:', barcodes);
    if (rfidDecoded.length > 0) {
      console.log('   📡 RFIDs decodificados:', rfidDecoded.length);
      rfidDecoded.forEach(r => console.log(`      ${r.original} → ${r.decoded} (CAI: ${r.cai})`));
    }

    if (barcodes.length === 0) {
      toast.error('Nenhum código válido', {
        description: 'Digite códigos de 7/8 dígitos ou RFID (24 caracteres). Aceita quebras de linha, vírgulas ou espaços.',
        duration: 5000,
      });
      return;
    }

    // Toast especial se houver RFIDs decodificados
    if (rfidDecoded.length > 0) {
      toast.success(`${rfidDecoded.length} RFID${rfidDecoded.length > 1 ? 's decodificados' : ' decodificado'}`, {
        description: `${barcodes.length} código${barcodes.length > 1 ? 's' : ''} total para busca`,
        duration: 4000,
      });
    }

    // Toast informativo sobre a busca
    toast.loading(`Buscando ${barcodes.length} ${barcodes.length === 1 ? 'código' : 'códigos'} no estoque...`, {
      id: 'bulk-barcode-search',
    });

    setIsBulkProcessing(true);

    try {
      // Busca pneus diretamente do Supabase
      const supabase = createClient();
      console.log('   Executando query no Supabase...');
      console.log('   Primeiros 5 códigos a buscar:', barcodes.slice(0, 5));
      
      const { data: entries, error } = await supabase
        .from('stock_entries')
        .select('*')
        .in('barcode', barcodes);

      if (error) {
        console.error('❌ Erro ao buscar pneus:', error);
        console.error('   Detalhes do erro:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        toast.dismiss('bulk-barcode-search');
        toast.error('Erro ao buscar pneus', {
          description: `${error.message || 'Não foi possível buscar os pneus do banco de dados.'}`,
          duration: 7000,
        });
        return;
      }

      console.log('   Pneus encontrados no banco:', entries?.length || 0);
      
      if (entries && entries.length > 0) {
        console.log('   Primeiros 3 pneus encontrados:');
        entries.slice(0, 3).forEach((e: any) => {
          console.log(`     - Barcode: "${e.barcode}" (tipo: ${typeof e.barcode}), Modelo: ${e.model_name}, Status: ${e.status}`);
        });
      }

      if (!entries || entries.length === 0) {
        toast.dismiss('bulk-barcode-search');
        toast.error('Nenhum pneu encontrado', {
          description: `Nenhum dos ${barcodes.length} ${barcodes.length === 1 ? 'código digitado foi encontrado' : 'códigos digitados foram encontrados'} no estoque.`,
          duration: 5000,
        });
        return;
      }

      // Converte snake_case para camelCase
      const foundTires: StockEntry[] = entries.map((entry: any) => ({
        id: entry.id,
        barcode: entry.barcode,
        modelId: entry.model_id,
        modelName: entry.model_name,
        modelType: entry.model_type,
        containerId: entry.container_id || '',
        containerName: entry.container_name || 'Sem Contêiner',
        status: entry.status,
        sessionId: entry.session_id,
        pilot: entry.pilot,
        team: entry.team,
        notes: entry.notes,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
        createdBy: entry.created_by,
      }));

      setSelectedTires(foundTires);
      
      const notFound = barcodes.length - foundTires.length;
      console.log('✅ Pneus carregados:', foundTires.length);
      console.log('⚠️  Códigos não encontrados:', notFound);
      
      // Dismiss loading toast
      toast.dismiss('bulk-barcode-search');
      
      // Success toast
      toast.success(`${foundTires.length} ${foundTires.length === 1 ? 'pneu encontrado' : 'pneus encontrados'}`, {
        description: notFound > 0 
          ? `${notFound} ${notFound === 1 ? 'código não encontrado' : 'códigos não encontrados'}.` 
          : 'Todos os códigos foram encontrados!',
        duration: 5000,
      });
    } catch (error) {
      console.error('❌ Erro ao carregar pneus por códigos:', error);
      toast.dismiss('bulk-barcode-search');
      toast.error('Erro ao carregar pneus', {
        description: 'Ocorreu um erro inesperado. Tente novamente.',
        duration: 5000,
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkMove = async () => {
    if (selectedTires.length === 0) {
      toast.error('Nenhum pneu selecionado', {
        description: 'Selecione os pneus para movimentar.',
      });
      return;
    }

    if (!bulkTargetContainer) {
      toast.error('Contêiner não selecionado', {
        description: 'Selecione o contêiner de destino.',
      });
      return;
    }

    setShowBulkConfirm(true);
  };

  const confirmBulkMove = async () => {
    if (selectedTires.length === 0 || !bulkTargetContainer) return;

    setIsBulkProcessing(true);
    setBulkProgress(0);
    setBulkProcessedCount(0);
    setBulkProcessingPhase('preparing');
    setBulkStartTime(Date.now());

    // Trata "Sem contêiner" (no-container)
    const isNoContainer = bulkTargetContainer === 'no-container';
    const targetCont = isNoContainer ? null : containers.find(c => c.id === bulkTargetContainer);
    
    if (!isNoContainer && !targetCont) return;

    const targetContainerId = isNoContainer ? '' : bulkTargetContainer;
    const targetContainerName = isNoContainer ? 'Sem Contêiner' : targetCont!.name;

    const totalTires = selectedTires.length;
    const movements: TireMovement[] = [];
    
    // Obtém dados do usuário do localStorage
    const userData = JSON.parse(localStorage.getItem('porsche-cup-user') || '{}');
    const userId = userData.id || '';
    const userName = userData.name || 'Usuário';

    try {
      // Fase 1: Prepara todos os movimentos (0-30%)
      setBulkProcessingPhase('preparing');
      for (let i = 0; i < selectedTires.length; i++) {
        const tire = selectedTires[i];
        
        movements.push({
          id: '', // Será gerado pelo banco
          barcode: tire.barcode,
          modelName: tire.modelName,
          modelType: (tire.modelType || 'Slick') as 'Slick' | 'Wet',
          fromContainerId: tire.containerId || '',
          fromContainerName: tire.containerName || 'Sem Contêiner',
          toContainerId: targetContainerId,
          toContainerName: targetContainerName,
          timestamp: new Date().toISOString(),
          movedBy: userId,
          movedByName: userName,
          reason: bulkReason.trim() || undefined,
        });

        // Atualiza progresso e contador
        const newProgress = Math.round(((i + 1) / totalTires) * 30); // 0-30%
        setBulkProgress(newProgress);
        setBulkProcessedCount(i + 1);

        // Delay para manter UI responsiva
        if ((i + 1) % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Fase 2: Salva movimentos no banco de dados (30-60%)
      setBulkProcessingPhase('saving');
      setBulkProgress(30);
      await saveBulkMovements(movements);
      setBulkProgress(60);

      // Fase 3: Atualiza contêineres dos pneus (60-100%)
      setBulkProcessingPhase('updating');
      for (let i = 0; i < selectedTires.length; i++) {
        const tire = selectedTires[i];
        await updateStockEntryContainer(tire.barcode, targetContainerId, targetContainerName);
        
        const progress = 60 + Math.round(((i + 1) / totalTires) * 40);
        setBulkProgress(progress);
        setBulkProcessedCount(totalTires); // Mantém contador no total durante atualização

        if ((i + 1) % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }

      // Fase 4: Concluído
      setBulkProcessingPhase('complete');
      setBulkProgress(100);
      await new Promise(resolve => setTimeout(resolve, 800));

      // 💾 Salva backup dos estados originais para possibilitar desfazer
      const backupMovements = movements.map(m => ({
        barcode: m.barcode,
        fromContainerId: m.fromContainerId,
        fromContainerName: m.fromContainerName,
        toContainerId: m.toContainerId,
        toContainerName: m.toContainerName,
        modelName: m.modelName,
        modelType: m.modelType
      }));

      // 🔄 Toast com botão "Desfazer" para movimentação em massa
      toastUndoable.movement({
        title: '🚚 Movimentação em Massa Concluída',
        description: `${totalTires} ${totalTires === 1 ? 'pneu transferido' : 'pneus transferidos'} para ${targetContainerName}`,
        duration: 10000, // 10 segundos para operações em massa
        onUndo: async () => {
          // Reverte TODAS as movimentações
          const reverseMovements: TireMovement[] = backupMovements.map(backup => ({
            id: '',
            barcode: backup.barcode,
            modelName: backup.modelName,
            modelType: backup.modelType,
            fromContainerId: backup.toContainerId,
            fromContainerName: backup.toContainerName,
            toContainerId: backup.fromContainerId,
            toContainerName: backup.fromContainerName,
            timestamp: new Date().toISOString(),
            movedBy: userId,
            movedByName: userName,
            reason: 'Movimentação em massa desfeita',
          }));
          
          // Salva movimentações reversas no histórico
          await saveBulkMovements(reverseMovements);
          
          // Reverte contêineres de todos os pneus
          for (const backup of backupMovements) {
            await updateStockEntryContainer(
              backup.barcode, 
              backup.fromContainerId, 
              backup.fromContainerName
            );
          }
          
          // Atualiza lista
          loadMovements();
          
          console.log('✅ Movimentação em massa desfeita:', backupMovements.length, 'pneus restaurados');
        }
      });

      // Dispara evento para onboarding checklist
      window.dispatchEvent(new Event('tire-moved'));

      // Aguarda antes de limpar
      await new Promise(resolve => setTimeout(resolve, 500));

      // Limpa o formulário
      setSelectedTires([]);
      setBulkSourceContainer('');
      setBulkTargetContainer('');
      setBulkFilterModel('all');
      setBulkFilterType('all');
      setBulkBarcodes('');
      setBulkReason('');
      setShowBulkConfirm(false);
      setIsBulkProcessing(false);
      setBulkProgress(0);
      setBulkProcessedCount(0);
      setBulkProcessingPhase('preparing');
      
      // Recarrega movimentos
      loadMovements();
    } catch (error) {
      console.error('Erro ao processar movimentação em massa:', error);
      toast.error('❌ Erro ao processar movimentação', {
        description: 'Por favor, tente novamente.',
      });
      setIsBulkProcessing(false);
      setBulkProgress(0);
      setBulkProcessedCount(0);
      setBulkProcessingPhase('preparing');
    }
  };

  const exportBulkBarcodes = () => {
    if (selectedTires.length === 0) {
      toast.error('Nenhum pneu selecionado');
      return;
    }

    const barcodes = selectedTires.map(tire => tire.barcode).join('\n');
    const blob = new Blob([barcodes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codigos-pneus-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Arquivo exportado', {
      description: `${selectedTires.length} códigos de barras`,
    });
  };

  const getBulkAvailableTargetContainers = () => {
    if (!bulkSourceContainer) return containers;
    // Se a origem é "sem contêiner", pode mover para qualquer contêiner
    if (bulkSourceContainer === 'no-container') return containers;
    return containers.filter(c => c.id !== bulkSourceContainer);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex-1 px-2 py-2 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
        <div className="max-w-7xl lg:mx-auto w-full">
          {/* Header Skeleton */}
          <div className="mb-4 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl" />
              <div>
                <Skeleton className="h-6 sm:h-8 w-48 sm:w-64 mb-2" />
                <Skeleton className="h-3 sm:h-4 w-60 sm:w-80" />
              </div>
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="mb-4 sm:mb-6">
            <Skeleton className="h-9 sm:h-10 w-full max-w-3xl" />
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Skeleton className="h-80 sm:h-96 rounded-lg sm:rounded-xl" />
            <Skeleton className="h-80 sm:h-96 rounded-lg sm:rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-2 py-2 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl lg:mx-auto w-full">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <ArrowRightLeft size={20} className="sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-gray-900 text-lg sm:text-2xl">Movimentação de Pneus</h1>
              <p className="text-gray-500 text-xs sm:text-sm truncate">Transferir pneus entre contêineres</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="move" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full max-w-4xl grid-cols-4 h-9 sm:h-10">
            <TabsTrigger value="move" className="text-xs sm:text-sm">Individual</TabsTrigger>
            <TabsTrigger value="bulk" className="text-xs sm:text-sm">Em Massa</TabsTrigger>
            <TabsTrigger value="portal" className="text-xs sm:text-sm flex items-center gap-1">
              <Radio className="w-3 h-3" />
              Portal RFID
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">Histórico</TabsTrigger>
          </TabsList>

          {/* Mover Pneu */}
          <TabsContent value="move" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Formulário de Movimentação */}
              <Card className="p-4 sm:p-6">
                <h2 className="text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg">
                  <Package size={18} className="sm:w-5 sm:h-5 text-purple-600" />
                  Dados da Movimentação
                </h2>

                <form onSubmit={handleBarcodeSubmit} className="space-y-4">
                  {/* Código de Barras */}
                  <div className="relative">
                    <Label htmlFor="barcode" className="mb-2">Código de Barras do Pneu</Label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                      <Input
                        ref={barcodeInputRef}
                        id="barcode"
                        type="text"
                        maxLength={24}
                        value={barcode}
                        onChange={(e) => handleBarcodeChange(e.target.value)}
                        placeholder="00000000 ou RFID"
                        className="pl-11 font-mono"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Digite ou escaneie o código de 8 dígitos ou RFID (24 caracteres)
                    </p>

                    {/* Resultados da busca */}
                    {showSearchResults && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                        {searchResults.map((tire) => (
                          <button
                            key={tire.id}
                            type="button"
                            onClick={() => selectTire(tire)}
                            className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                  {tire.barcode}
                                </code>
                                <p className="text-sm text-gray-900 mt-1">{tire.modelName}</p>
                                <p className="text-xs text-gray-500">{tire.containerName}</p>
                              </div>
                              <Badge
                                variant="secondary"
                                className={tire.modelType === 'Slick' 
                                  ? 'bg-orange-100 text-orange-700' 
                                  : 'bg-blue-100 text-blue-700'
                                }
                              >
                                {tire.modelType}
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botão Buscar */}
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                  >
                    <Search size={16} className="mr-2" />
                    Buscar Pneu
                  </Button>
                </form>

                {/* Dados do Pneu Selecionado */}
                {selectedTire && (
                  <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h3 className="text-sm text-purple-900 mb-3">Pneu Selecionado</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Código:</span>
                        <code className="bg-white px-2 py-1 rounded text-purple-900">
                          {selectedTire.barcode}
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Modelo:</span>
                        <span className="text-gray-900">{selectedTire.modelName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo:</span>
                        <Badge
                          variant="secondary"
                          className={selectedTire.modelType === 'Slick' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-blue-100 text-blue-700'
                          }
                        >
                          {selectedTire.modelType}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contêiner Atual:</span>
                        <span className="text-gray-900">{selectedTire.containerName}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contêiner de Destino */}
                {selectedTire && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="target-container">Contêiner de Destino</Label>
                      <Select value={targetContainer} onValueChange={setTargetContainer}>
                        <SelectTrigger id="target-container">
                          <SelectValue placeholder="Selecione o contêiner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-container">
                            <div className="flex items-center gap-2">
                              <Package size={16} className="text-gray-400" />
                              <span>Sem contêiner</span>
                            </div>
                          </SelectItem>
                          {getAvailableContainers().map((container) => (
                            <SelectItem key={container.id} value={container.id}>
                              <div className="flex items-center gap-2">
                                <Truck size={16} className="text-gray-400" />
                                <span>{container.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="reason">Motivo (Opcional)</Label>
                      <Input
                        id="reason"
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ex: Troca após treino, manutenção..."
                        maxLength={100}
                      />
                    </div>

                    <Button
                      onClick={handleMove}
                      disabled={!targetContainer}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <ArrowRightLeft size={16} className="mr-2" />
                      Confirmar Movimentação
                    </Button>
                  </div>
                )}
              </Card>

              {/* Informações */}
              <div className="space-y-3 sm:space-y-4">
                <Card className="p-3 sm:p-6 border-blue-200 bg-blue-50">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <AlertCircle className="text-blue-600 mt-0.5 sm:mt-1 flex-shrink-0" size={18} />
                    <div>
                      <h3 className="text-blue-900 text-xs sm:text-sm mb-1 sm:mb-2 font-medium">Como Funciona</h3>
                      <ul className="text-[10px] sm:text-xs text-blue-700 space-y-0.5 sm:space-y-1 list-disc list-inside">
                        <li>Digite ou escaneie o código de barras do pneu</li>
                        <li>Selecione o contêiner de destino</li>
                        <li>Adicione um motivo se necessário</li>
                        <li>Confirme a movimentação</li>
                        <li>O histórico ficará registrado permanentemente</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                <Card className="p-3 sm:p-6 border-green-200 bg-green-50">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <CheckCircle2 className="text-green-600 mt-0.5 sm:mt-1 flex-shrink-0" size={18} />
                    <div>
                      <h3 className="text-green-900 text-xs sm:text-sm mb-1 sm:mb-2 font-medium">Rastreabilidade</h3>
                      <p className="text-[10px] sm:text-xs text-green-700">
                        Todas as movimentações são registradas com data, hora e usuário responsável, 
                        garantindo controle total sobre a localização dos pneus.
                      </p>
                    </div>
                  </div>
                </Card>

                {containers.length > 0 && !isBulkProcessing && (
                  <Card className="p-3 sm:p-6">
                    <h3 className="text-gray-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <Truck size={16} className="sm:w-[18px] sm:h-[18px] text-gray-600" />
                      Contêineres Disponíveis
                    </h3>
                    <div className="space-y-2">
                      {containers.map((container) => (
                        <div
                          key={container.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <span className="text-sm text-gray-900">{container.name}</span>
                          <span className="text-xs text-gray-500">{container.location || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
                
                {isBulkProcessing && (
                  <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300">
                    <div className="text-center space-y-4">
                      <div className="relative inline-flex items-center justify-center">
                        <div className="absolute inset-0 bg-purple-400 rounded-full opacity-20 animate-ping" />
                        <Loader2 className="w-12 h-12 text-purple-600 animate-spin relative" />
                      </div>
                      <div>
                        <h3 className="text-gray-900 mb-2">Processando Movimentação</h3>
                        <p className="text-sm text-gray-600 mb-1">
                          {selectedTires.length} {selectedTires.length === 1 ? 'pneu' : 'pneus'}
                        </p>
                        <p className="text-xs text-purple-700">
                          {Math.round((bulkProgress / 100) * selectedTires.length)} de {selectedTires.length} processados
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Progress value={bulkProgress} className="h-2" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-purple-900 font-medium">{Math.round(bulkProgress)}%</span>
                          <span className="text-purple-700">{100 - Math.round(bulkProgress)}% restante</span>
                        </div>
                      </div>
                      <div className="p-3 bg-white/60 rounded-lg backdrop-blur-sm">
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                          <span>Aguarde, não saia desta página...</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Movimentação em Massa */}
          <TabsContent value="bulk" className="space-y-6">
            {/* Card de Progresso - Exibido durante processamento */}
            {isBulkProcessing && (
              <Card className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-purple-50 via-white to-blue-50 border-2 border-purple-300 shadow-xl">
                <div className="space-y-4 sm:space-y-6">
                  {/* Header do Progresso */}
                  <div className="text-center space-y-2">
                    <div className="relative inline-flex items-center justify-center mb-2">
                      {bulkProcessingPhase === 'complete' ? (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce-scale">
                          <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
                        </div>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-purple-400 rounded-full opacity-20 animate-ping" />
                          <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-purple-600 animate-spin relative" />
                        </>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl text-gray-900">
                      {bulkProcessingPhase === 'preparing' && 'Preparando Movimentações'}
                      {bulkProcessingPhase === 'saving' && 'Salvando no Banco de Dados'}
                      {bulkProcessingPhase === 'updating' && 'Atualizando Contêineres'}
                      {bulkProcessingPhase === 'complete' && '✅ Concluído!'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {bulkProcessingPhase === 'preparing' && 'Organizando dados dos pneus...'}
                      {bulkProcessingPhase === 'saving' && 'Registrando movimentações no histórico...'}
                      {bulkProcessingPhase === 'updating' && 'Transferindo pneus para o novo contêiner...'}
                      {bulkProcessingPhase === 'complete' && 'Todos os pneus foram movimentados com sucesso!'}
                    </p>
                  </div>

                  {/* Barra de Progresso Principal */}
                  <div className="space-y-3">
                    <Progress 
                      value={bulkProgress} 
                      className="h-4 bg-gray-200"
                    />
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-purple-600 text-white rounded-full">{Math.round(bulkProgress)}%</span>
                        {bulkProcessingPhase !== 'complete' && (
                          <span className="text-gray-600">
                            {bulkProgress < 30 && 'Preparando...'}
                            {bulkProgress >= 30 && bulkProgress < 60 && 'Salvando...'}
                            {bulkProgress >= 60 && 'Atualizando...'}
                          </span>
                        )}
                      </div>
                      {bulkProcessingPhase !== 'complete' && (
                        <span className="text-purple-700">{100 - Math.round(bulkProgress)}% restante</span>
                      )}
                    </div>
                  </div>

                  {/* Estatísticas em Tempo Real */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white p-3 sm:p-4 rounded-xl border border-purple-100 shadow-sm">
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl mb-1">{selectedTires.length}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
                      </div>
                    </div>
                    <div className="bg-white p-3 sm:p-4 rounded-xl border border-blue-100 shadow-sm">
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl text-blue-600 mb-1">{bulkProcessedCount}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Processados</div>
                      </div>
                    </div>
                    <div className="bg-white p-3 sm:p-4 rounded-xl border border-green-100 shadow-sm">
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl text-green-600 mb-1">
                          {bulkStartTime > 0 ? Math.round((Date.now() - bulkStartTime) / 1000) : 0}s
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Tempo</div>
                      </div>
                    </div>
                    <div className="bg-white p-3 sm:p-4 rounded-xl border border-orange-100 shadow-sm">
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl text-orange-600 mb-1">
                          {bulkStartTime > 0 && selectedTires.length > 0
                            ? Math.round((bulkProcessedCount / ((Date.now() - bulkStartTime) / 1000)) * 10) / 10
                            : 0}/s
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Taxa</div>
                      </div>
                    </div>
                  </div>

                  {/* Fases do Processo */}
                  <div className="flex items-center justify-between relative px-4 sm:px-0">
                    {/* Linha de conexão */}
                    <div className="absolute top-4 sm:top-5 left-6 sm:left-0 right-6 sm:right-0 h-0.5 sm:h-1 bg-gray-200 -z-10">
                      <div 
                        className="h-full bg-purple-600 transition-all duration-500"
                        style={{ 
                          width: bulkProcessingPhase === 'preparing' ? '0%' : 
                                 bulkProcessingPhase === 'saving' ? '50%' : 
                                 bulkProcessingPhase === 'updating' ? '100%' : '100%'
                        }}
                      />
                    </div>
                    
                    {/* Fase 1 */}
                    <div className="flex flex-col items-center gap-1 sm:gap-2 relative z-10">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all text-sm sm:text-base ${
                        bulkProcessingPhase === 'preparing' 
                          ? 'bg-purple-600 text-white ring-4 ring-purple-200' 
                          : 'bg-green-600 text-white'
                      }`}>
                        {bulkProcessingPhase === 'preparing' ? '1' : <CheckCircle2 size={18} className="sm:w-5 sm:h-5" />}
                      </div>
                      <span className="text-xs text-gray-600 text-center">Preparar</span>
                    </div>

                    {/* Fase 2 */}
                    <div className="flex flex-col items-center gap-1 sm:gap-2 relative z-10">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all text-sm sm:text-base ${
                        bulkProcessingPhase === 'saving' 
                          ? 'bg-purple-600 text-white ring-4 ring-purple-200' 
                          : bulkProcessingPhase === 'updating' || bulkProcessingPhase === 'complete'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {bulkProcessingPhase === 'updating' || bulkProcessingPhase === 'complete' ? <CheckCircle2 size={18} className="sm:w-5 sm:h-5" /> : '2'}
                      </div>
                      <span className="text-xs text-gray-600 text-center">Salvar</span>
                    </div>

                    {/* Fase 3 */}
                    <div className="flex flex-col items-center gap-1 sm:gap-2 relative z-10">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all text-sm sm:text-base ${
                        bulkProcessingPhase === 'updating' 
                          ? 'bg-purple-600 text-white ring-4 ring-purple-200' 
                          : bulkProcessingPhase === 'complete'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {bulkProcessingPhase === 'complete' ? <CheckCircle2 size={18} className="sm:w-5 sm:h-5" /> : '3'}
                      </div>
                      <span className="text-xs text-gray-600 text-center">Atualizar</span>
                    </div>
                  </div>

                  {/* Aviso de Não Sair */}
                  {bulkProcessingPhase !== 'complete' && (
                    <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <div className="flex items-start sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm text-yellow-900">
                        <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5 sm:mt-0" size={18} />
                        <div>
                          <p className="mb-1"><strong>⚠️ Não feche nem recarregue esta página</strong></p>
                          <p className="text-xs text-yellow-700">
                            O processamento está em andamento. Aguarde a conclusão para garantir que todos os dados sejam salvos corretamente.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Seleção de Pneus */}
              <Card className="p-4 sm:p-6 lg:col-span-2">
                <h2 className="text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg">
                  <Layers size={18} className="sm:w-5 sm:h-5 text-purple-600" />
                  Selecionar Pneus para Movimentação
                </h2>

                <Tabs defaultValue="container" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-3 sm:mb-4 h-9 sm:h-10">
                    <TabsTrigger value="container" className="text-xs sm:text-sm">Por Contêiner</TabsTrigger>
                    <TabsTrigger value="barcodes" className="text-xs sm:text-sm">Por Códigos</TabsTrigger>
                  </TabsList>

                  {/* Por Contêiner */}
                  <TabsContent value="container" className="space-y-4">
                    <div>
                      <Label htmlFor="bulk-source">Contêiner de Origem</Label>
                      <Select 
                        value={bulkSourceContainer} 
                        onValueChange={(value) => {
                          setBulkSourceContainer(value);
                          setBulkFilterModel('all');
                          setBulkFilterType('all');
                        }}
                        disabled={isBulkProcessing}
                      >
                        <SelectTrigger id="bulk-source">
                          <SelectValue placeholder="Selecione o contêiner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-container">
                            <div className="flex items-center gap-2">
                              <Package size={16} className="text-orange-400" />
                              <span className="text-orange-700">Sem Contêiner</span>
                            </div>
                          </SelectItem>
                          {containers.map((container) => (
                            <SelectItem key={container.id} value={container.id}>
                              <div className="flex items-center gap-2">
                                <Truck size={16} className="text-gray-400" />
                                <span>{container.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {bulkSourceContainer && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <Label htmlFor="bulk-filter-model" className="text-sm">Filtrar por Modelo</Label>
                            <Select value={bulkFilterModel} onValueChange={setBulkFilterModel} disabled={isBulkProcessing}>
                              <SelectTrigger id="bulk-filter-model" className="h-10 sm:h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos os Modelos</SelectItem>
                                {tireModels.map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    {model.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="bulk-filter-type" className="text-sm">Filtrar por Tipo</Label>
                            <Select value={bulkFilterType} onValueChange={setBulkFilterType} disabled={isBulkProcessing}>
                              <SelectTrigger id="bulk-filter-type" className="h-10 sm:h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos os Tipos</SelectItem>
                                <SelectItem value="Slick">Slick</SelectItem>
                                <SelectItem value="Wet">Wet</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Button
                          onClick={loadBulkTires}
                          disabled={isBulkProcessing}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 h-10 sm:h-10 text-sm"
                        >
                          <Filter size={16} className="mr-2" />
                          Carregar Pneus
                        </Button>
                      </>
                    )}
                  </TabsContent>

                  {/* Por Códigos */}
                  <TabsContent value="barcodes" className="space-y-3 sm:space-y-4">
                    <div>
                      <Label htmlFor="bulk-barcodes" className="text-sm">Códigos de Barras</Label>
                      <Textarea
                        id="bulk-barcodes"
                        value={bulkBarcodes}
                        onChange={(e) => {
                          const newValue = e.target.value.toUpperCase();
                          const oldValue = bulkBarcodes;

                          // 🎯 Detecta se acabou de completar um código de 8 dígitos OU RFID de 24 chars
                          // e adiciona quebra de linha automática
                          if (newValue.length > oldValue.length) {
                            // Obtém a última linha digitada
                            const lines = newValue.split('\n');
                            const lastLine = lines[lines.length - 1].trim();

                            // RFID: 24 caracteres hexadecimais
                            if (lastLine.length === 24 && /^[0-9A-F]{24}$/.test(lastLine)) {
                              setBulkBarcodes(newValue + '\n');
                              return;
                            }

                            // Código de barras: 8 dígitos
                            const numericOnly = lastLine.replace(/\D/g, '');
                            if (numericOnly.length === 8 && lastLine === numericOnly) {
                              setBulkBarcodes(newValue + '\n');
                              return;
                            }
                          }

                          setBulkBarcodes(newValue);
                        }}
                        placeholder="Cole ou digite códigos de 8 dígitos OU RFID (24 caracteres)&#10;&#10;Exemplo:&#10;12345678&#10;23456789&#10;301854AAE059B8000149614B&#10;&#10;Também aceita vírgulas ou espaços:&#10;12345678, 23456789, 34567890"
                        rows={8}
                        className="font-mono text-xs sm:text-sm min-h-[200px]"
                        disabled={isBulkProcessing}
                      />
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          Cole ou digite códigos de 8 dígitos ou RFID (24 chars hex)
                        </p>
                        {bulkBarcodes.trim() && (
                          <Badge variant="secondary" className="text-xs">
                            {(() => {
                              const lines = bulkBarcodes.split(/[\n,;\s]+/).map(l => l.trim()).filter(l => l.length > 0);
                              const barcodes = lines.filter(l => /^\d{7,8}$/.test(l.replace(/\D/g, ''))).length;
                              const rfids = lines.filter(l => /^[0-9A-F]{24}$/i.test(l)).length;
                              const total = barcodes + rfids;
                              return total > 0 ? `${total} código${total > 1 ? 's' : ''} (${barcodes} barcode${barcodes !== 1 ? 's' : ''}, ${rfids} RFID${rfids !== 1 ? 's' : ''})` : '0 códigos';
                            })()}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={handleBulkBarcodeLoad}
                      disabled={isBulkProcessing || !bulkBarcodes.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 h-10 sm:h-10 text-sm"
                    >
                      {isBulkProcessing ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        <>
                          <FileUp size={16} className="mr-2" />
                          Carregar Códigos
                        </>
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>

                {/* Preview dos pneus selecionados */}
                {selectedTires.length > 0 && (
                  <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm text-purple-900">
                        {selectedTires.length} {selectedTires.length === 1 ? 'Pneu Selecionado' : 'Pneus Selecionados'}
                      </h3>
                      <Button
                        onClick={exportBulkBarcodes}
                        variant="outline"
                        size="sm"
                        disabled={isBulkProcessing}
                      >
                        <Download size={14} className="mr-2" />
                        Exportar Códigos
                      </Button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {selectedTires.slice(0, 50).map((tire) => (
                        <div
                          key={tire.id}
                          className="flex items-center justify-between p-2 bg-white rounded text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {tire.barcode}
                            </code>
                            <span className="text-gray-900">{tire.modelName}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className={tire.modelType === 'Slick' 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-blue-100 text-blue-700'
                            }
                          >
                            {tire.modelType}
                          </Badge>
                        </div>
                      ))}
                      {selectedTires.length > 50 && (
                        <p className="text-xs text-purple-700 text-center py-2">
                          + {selectedTires.length - 50} pneus não exibidos
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-600">Slick:</span>
                          <span className="ml-2 text-orange-700">
                            {selectedTires.filter(t => t.modelType === 'Slick').length}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-600">Wet:</span>
                          <span className="ml-2 text-blue-700">
                            {selectedTires.filter(t => t.modelType === 'Wet').length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Destino e Confirmação */}
              <div className="space-y-3 sm:space-y-4">
                <Card className="p-4 sm:p-6">
                  <h2 className="text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg">
                    <Truck size={18} className="sm:w-5 sm:h-5 text-purple-600" />
                    Destino
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bulk-target">Contêiner de Destino</Label>
                      <Select 
                        value={bulkTargetContainer} 
                        onValueChange={setBulkTargetContainer}
                        disabled={selectedTires.length === 0 || isBulkProcessing}
                      >
                        <SelectTrigger id="bulk-target">
                          <SelectValue placeholder="Selecione o contêiner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-container">
                            <div className="flex items-center gap-2">
                              <Package size={16} className="text-gray-400" />
                              <span>Sem contêiner</span>
                            </div>
                          </SelectItem>
                          {getBulkAvailableTargetContainers().map((container) => (
                            <SelectItem key={container.id} value={container.id}>
                              <div className="flex items-center gap-2">
                                <Truck size={16} className="text-gray-400" />
                                <span>{container.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="bulk-reason">Motivo (Opcional)</Label>
                      <Textarea
                        id="bulk-reason"
                        value={bulkReason}
                        onChange={(e) => setBulkReason(e.target.value)}
                        placeholder="Ex: Troca após corrida, manutenção programada..."
                        rows={3}
                        maxLength={200}
                        disabled={isBulkProcessing}
                      />
                    </div>

                    <Button
                      onClick={handleBulkMove}
                      disabled={selectedTires.length === 0 || !bulkTargetContainer || isBulkProcessing}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 h-10 sm:h-10 text-sm"
                    >
                      {isBulkProcessing ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft size={16} className="mr-2" />
                          Mover {selectedTires.length} {selectedTires.length === 1 ? 'Pneu' : 'Pneus'}
                        </>
                      )}
                    </Button>
                  </div>
                </Card>

                <Card className="p-3 sm:p-6 border-blue-200 bg-blue-50">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <AlertCircle className="text-blue-600 mt-0.5 sm:mt-1 flex-shrink-0" size={18} />
                    <div>
                      <h3 className="text-blue-900 text-xs sm:text-sm mb-1 sm:mb-2 font-medium">Movimentação em Massa</h3>
                      <ul className="text-[10px] sm:text-xs text-blue-700 space-y-0.5 sm:space-y-1 list-disc list-inside">
                        <li>Selecione todos os pneus de um contêiner</li>
                        <li>Filtre por modelo ou tipo</li>
                        <li>Ou carregue uma lista de códigos</li>
                        <li>Todas as movimentações são registradas</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="history">
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 sm:gap-0">
                <div>
                  <h2 className="text-gray-900 flex items-center gap-2 text-base sm:text-lg">
                    <History size={18} className="sm:w-5 sm:h-5 text-purple-600" />
                    Histórico de Movimentações
                  </h2>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <Badge variant="secondary" className="text-xs">
                    {movements.length} {movements.length === 1 ? 'registro' : 'registros'}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-gray-500">Por página:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                      <SelectTrigger className="w-20 sm:w-24 h-8 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {movements.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <History size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Nenhuma movimentação registrada</p>
                </div>
              ) : (
                <>
                  {/* Versão Desktop - Tabela */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                            Data/Hora
                          </th>
                          <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                            Código
                          </th>
                          <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                            Modelo
                          </th>
                          <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                            De
                          </th>
                          <th className="px-4 py-3 text-center text-xs text-gray-500 uppercase tracking-wider">
                            →
                          </th>
                          <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                            Para
                          </th>
                          <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                            Usuário
                          </th>
                          <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                            Motivo
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {movements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((movement) => (
                          <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400" />
                                <div>
                                  <div className="text-sm text-gray-900">
                                    {new Date(movement.timestamp).toLocaleDateString('pt-BR')}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(movement.timestamp).toLocaleTimeString('pt-BR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                {movement.barcode}
                              </code>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div>
                                <div className="text-sm text-gray-900">{movement.modelName}</div>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${movement.modelType === 'Slick' 
                                    ? 'bg-orange-100 text-orange-700' 
                                    : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {movement.modelType}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{movement.fromContainerName}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <ArrowRightLeft size={16} className="text-purple-600 mx-auto" />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{movement.toContainerName}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <User size={14} className="text-gray-400" />
                                <span className="text-sm text-gray-900">{movement.movedByName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-600">
                                {movement.reason || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Versão Mobile - Cards */}
                  <div className="md:hidden space-y-3">
                    {movements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((movement) => (
                      <div key={movement.id} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                        {/* Header do Card */}
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                          <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                            {movement.barcode}
                          </code>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${movement.modelType === 'Slick' 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {movement.modelType}
                          </Badge>
                        </div>

                        {/* Modelo */}
                        <div className="text-sm font-medium text-gray-900">
                          {movement.modelName}
                        </div>

                        {/* Movimentação */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-600 truncate flex-1">{movement.fromContainerName}</span>
                          <ArrowRightLeft size={14} className="text-purple-600 flex-shrink-0" />
                          <span className="text-gray-900 truncate flex-1">{movement.toContainerName}</span>
                        </div>

                        {/* Data e Usuário */}
                        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>
                              {new Date(movement.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {' '}
                              {new Date(movement.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User size={12} />
                            <span className="truncate max-w-[100px]">{movement.movedByName}</span>
                          </div>
                        </div>

                        {/* Motivo */}
                        {movement.reason && (
                          <div className="text-xs text-gray-600 italic pt-1">
                            {movement.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Pagination */}
              {movements.length > 0 && (
                <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                  <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, movements.length)} de {movements.length} registros
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 sm:py-1 border border-gray-300 rounded-md text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                      Pág. {currentPage} de {Math.ceil(movements.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(movements.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(movements.length / itemsPerPage)}
                      className="px-3 py-1.5 sm:py-1 border border-gray-300 rounded-md text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Portal RFID */}
          <TabsContent value="portal" className="mt-0">
            <RFIDPortal />
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog - Individual */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Movimentação de Pneu</AlertDialogTitle>
            <AlertDialogDescription>
              Revise os detalhes da movimentação antes de confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedTire && targetContainer && (
            <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Código:</span>
                        <code className="text-gray-900">{selectedTire.barcode}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Modelo:</span>
                        <span className="text-gray-900">{selectedTire.modelName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-center py-2">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">De:</p>
                      <p className="text-sm text-gray-900">{selectedTire.containerName}</p>
                    </div>
                    <ArrowRightLeft size={20} className="text-purple-600" />
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Para:</p>
                      <p className="text-sm text-gray-900">
                        {containers.find(c => c.id === targetContainer)?.name}
                      </p>
                    </div>
                  </div>

                  {reason && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 mb-1">Motivo:</p>
                      <p className="text-sm text-blue-900">{reason}</p>
                    </div>
                  )}

                <p className="text-sm text-gray-600 mt-4">
                  Deseja confirmar esta movimentação?
                </p>
              </div>
            )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMove}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Confirmar Movimentação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog - Bulk */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Movimentação em Massa</AlertDialogTitle>
            <AlertDialogDescription>
              Revise os detalhes da movimentação em massa antes de confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
                {!isBulkProcessing ? (
                  <>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-purple-900">Total de Pneus:</span>
                        <Badge className="bg-purple-600 text-white">
                          {selectedTires.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-600">Slick:</span>
                          <span className="ml-2 text-orange-700">
                            {selectedTires.filter(t => t.modelType === 'Slick').length}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-600">Wet:</span>
                          <span className="ml-2 text-blue-700">
                            {selectedTires.filter(t => t.modelType === 'Wet').length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-center py-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">De:</p>
                        <p className="text-sm text-gray-900">
                          {bulkSourceContainer === 'no-container' 
                            ? 'Sem Contêiner' 
                            : (selectedTires.length > 0 && selectedTires[0].containerName)}
                        </p>
                      </div>
                      <ArrowRightLeft size={24} className="text-purple-600" />
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Para:</p>
                        <p className="text-sm text-gray-900">
                          {containers.find(c => c.id === bulkTargetContainer)?.name}
                        </p>
                      </div>
                    </div>

                    {bulkReason && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600 mb-1">Motivo:</p>
                        <p className="text-sm text-blue-900">{bulkReason}</p>
                      </div>
                    )}

                    <p className="text-sm text-gray-600 text-center">
                      Deseja confirmar a movimentação de <strong>{selectedTires.length}</strong> {selectedTires.length === 1 ? 'pneu' : 'pneus'}?
                    </p>
                  </>
                ) : (
                  <div className="py-8 px-6">
                    <div className="text-center mb-6">
                      <div className="relative inline-flex items-center justify-center mb-4">
                        <div className="absolute inset-0 bg-purple-400 rounded-full opacity-20 animate-ping" />
                        <Loader2 size={56} className="text-purple-600 animate-spin relative" />
                      </div>
                      <h4 className="text-gray-900 mb-2">Processando Movimentação em Massa</h4>
                      <p className="text-sm text-gray-600">
                        Movendo {selectedTires.length} {selectedTires.length === 1 ? 'pneu' : 'pneus'}...
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        Processado: {Math.round((bulkProgress / 100) * selectedTires.length)} de {selectedTires.length} pneus
                      </p>
                    </div>
                    
                    <div className="space-y-3 bg-purple-50 p-4 rounded-lg">
                      <Progress value={bulkProgress} className="h-3" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-purple-900 font-medium">{Math.round(bulkProgress)}% concluído</span>
                        <span className="text-purple-700">{100 - Math.round(bulkProgress)}% restante</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-gray-700">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                        <span>Aguarde, não feche esta janela...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
          {!isBulkProcessing && (
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBulkMove}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Confirmar Movimentação
              </AlertDialogAction>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
