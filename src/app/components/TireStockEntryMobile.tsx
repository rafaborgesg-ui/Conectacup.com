/**
 * 📱 Entrada de Estoque - Versão Mobile para Coletor TC22
 * 
 * Versão otimizada para coletor Zebra TC22 (800x480px)
 * com TODOS os recursos da versão web:
 * - Entrada Individual com scanner
 * - Entrada em Lote (múltiplos códigos do mesmo modelo)
 * - Entrada via Planilha (Modelo + Código por linha)
 * - Sistema offline integrado
 * - Validações completas
 * - Feedback haptic e visual
 */

import { useState, useEffect, useRef } from 'react';
import { generateUUID } from '../utils/uuid';
import {
  PackageIcon, CheckCircle, Trash2, BarChart3, Wifi, WifiOff,
  Camera, RefreshCw, Layers, FileUp, AlertCircle, X, Zap, Radio
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { BarcodeScanner } from './BarcodeScanner';
import { useHaptic } from './TouchFeedback';
import { BarcodeConfirmationAnimation } from './BarcodeConfirmationAnimation';
import {
  getTireModels,
  getContainers,
  getStockEntries,
  saveStockEntry,
  checkBarcodeExists,
  type TireModel,
  type Container,
  type StockEntry
} from '../utils/storage';
import { RFIDStockPortal } from './RFIDStockPortal';

interface TireEntry {
  id: string;
  barcode: string;
  model: string;
  modelId: string;
  container: string;
  containerId: string;
  timestamp: Date;
}

export function TireStockEntryMobile() {
  // Estados principais
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [entries, setEntries] = useState<TireEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sessionStats, setSessionStats] = useState({ total: 0, success: 0, error: 0 });
  const [showSuccess, setShowSuccess] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  // Estados para Entrada Individual
  const [barcode, setBarcode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Estados para Entrada em Lote
  const [bulkBarcodes, setBulkBarcodes] = useState('');
  const [bulkModel, setBulkModel] = useState('');
  const [bulkContainer, setBulkContainer] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkStatus, setBulkStatus] = useState({ 
    current: 0, 
    total: 0, 
    success: 0, 
    duplicate: 0, 
    error: 0, 
    currentAction: '' 
  });

  // Estados para Entrada Planilha
  const [spreadsheetText, setSpreadsheetText] = useState('');
  const [isSpreadsheetProcessing, setIsSpreadsheetProcessing] = useState(false);
  const [spreadsheetProgress, setSpreadsheetProgress] = useState(0);
  const [spreadsheetStatus, setSpreadsheetStatus] = useState({ 
    current: 0, 
    total: 0, 
    success: 0, 
    error: 0, 
    currentAction: '' 
  });
  
  const haptic = useHaptic();

  // Monitora status da conexão
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Carrega dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [models, containersList] = await Promise.all([
          getTireModels(),
          getContainers(),
          getStockEntries() // Pre-carrega cache
        ]);
        
        setTireModels(models);
        setContainers(containersList);
        
        if (models.length > 0) {
          setSelectedModel(models[0].id);
          setBulkModel(models[0].id);
        }
        if (containersList.length > 0) {
          setSelectedContainer(containersList[0].id);
          setBulkContainer(containersList[0].id);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Auto-foco no input quando montar
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isLoading]);

  // ========================================
  // ENTRADA INDIVIDUAL
  // ========================================
  
  const handleAddEntry = async () => {
    if (!barcode.trim()) {
      toast.error('Digite o código do pneu');
      haptic.error();
      return;
    }

    const cleanBarcode = barcode.trim();
    if (!/^\d{7,8}$/.test(cleanBarcode)) {
      toast.error('Código inválido', {
        description: 'O código deve ter 7 ou 8 dígitos numéricos'
      });
      haptic.error();
      inputRef.current?.select();
      return;
    }

    if (!selectedModel || !selectedContainer) {
      toast.error('Selecione modelo e contêiner');
      haptic.error();
      return;
    }

    if (entries.find(e => e.barcode === cleanBarcode)) {
      toast.error('Código já registrado nesta sessão');
      haptic.error();
      inputRef.current?.select();
      return;
    }

    setIsSaving(true);

    try {
      const exists = await checkBarcodeExists(cleanBarcode);
      if (exists) {
        toast.error('Código já cadastrado no sistema');
        haptic.error();
        setSessionStats(prev => ({ ...prev, error: prev.error + 1 }));
        setBarcode('');
        inputRef.current?.focus();
        return;
      }

      const model = tireModels.find(m => m.id === selectedModel);
      const container = containers.find(c => c.id === selectedContainer);

      if (!model || !container) {
        throw new Error('Modelo ou contêiner não encontrado');
      }

      const newEntry: TireEntry = {
        id: generateUUID(),
        barcode: cleanBarcode,
        model: model.name,
        modelId: model.id,
        container: container.name,
        containerId: container.id,
        timestamp: new Date()
      };

      const stockEntry: StockEntry = {
        id: newEntry.id,
        barcode: newEntry.barcode,
        model_id: newEntry.modelId,
        model_name: newEntry.model,
        model_type: model.type as 'Slick' | 'Wet',
        container_id: newEntry.containerId,
        container_name: newEntry.container,
        created_at: newEntry.timestamp.toISOString(),
        status: 'Novo',
      };

      const success = await saveStockEntry(stockEntry);

      if (success) {
        setEntries(prev => [newEntry, ...prev]);
        setSessionStats(prev => ({ 
          total: prev.total + 1, 
          success: prev.success + 1,
          error: prev.error 
        }));

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1500);
        haptic.success();

        toast.success(`✓ ${cleanBarcode}`, {
          description: `${model.name} → ${container.name}`,
          duration: 2000,
        });

        setBarcode('');
        inputRef.current?.focus();
      } else {
        throw new Error('Falha ao salvar');
      }
    } catch (error) {
      console.error('Erro ao adicionar entrada:', error);
      setSessionStats(prev => ({ ...prev, error: prev.error + 1 }));
      toast.error('Erro ao salvar');
      haptic.error();
    } finally {
      setIsSaving(false);
    }
  };

  const handleScanComplete = (scannedBarcode: string) => {
    setBarcode(scannedBarcode);
    setShowScanner(false);
    haptic.success();
    
    setTimeout(() => {
      if (scannedBarcode.trim()) {
        handleAddEntry();
      }
    }, 100);
  };

  const handleDeleteEntry = (id: string, barcode: string) => {
    haptic.impact();
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Registro removido', {
      description: `Código: ${barcode}`,
      duration: 2000,
    });
  };

  // ========================================
  // ENTRADA EM LOTE
  // ========================================
  
  const handleBulkProcess = async () => {
    if (!bulkBarcodes.trim()) {
      toast.error('Digite os códigos dos pneus');
      haptic.error();
      return;
    }

    if (!bulkModel || !bulkContainer) {
      toast.error('Selecione modelo e contêiner');
      haptic.error();
      return;
    }

    const model = tireModels.find(m => m.id === bulkModel);
    const container = containers.find(c => c.id === bulkContainer);

    if (!model || !container) {
      toast.error('Modelo ou contêiner não encontrado');
      return;
    }

    // Processa códigos (separados por linha, vírgula ou espaço)
    const rawCodes = bulkBarcodes
      .split(/[\n,\s]+/)
      .map(code => code.trim())
      .filter(code => code.length > 0);

    if (rawCodes.length === 0) {
      toast.error('Nenhum código válido encontrado');
      return;
    }

    // Valida formato dos códigos
    const validCodes: string[] = [];
    const invalidCodes: string[] = [];

    rawCodes.forEach(code => {
      if (/^\d{7,8}$/.test(code)) {
        validCodes.push(code);
      } else {
        invalidCodes.push(code);
      }
    });

    if (invalidCodes.length > 0) {
      toast.error('Códigos inválidos encontrados', {
        description: `${invalidCodes.length} código(s) com formato incorreto serão ignorados`
      });
    }

    if (validCodes.length === 0) {
      toast.error('Nenhum código válido para processar');
      return;
    }

    setIsBulkProcessing(true);
    setBulkProgress(0);
    setBulkStatus({
      current: 0,
      total: validCodes.length,
      success: 0,
      duplicate: 0,
      error: 0,
      currentAction: 'Iniciando...'
    });

    haptic.impact();

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    const newEntries: TireEntry[] = [];

    for (let i = 0; i < validCodes.length; i++) {
      const code = validCodes[i];
      
      setBulkStatus(prev => ({
        ...prev,
        current: i + 1,
        currentAction: `Processando ${code}...`
      }));

      try {
        // Verifica se já existe na sessão
        if (entries.find(e => e.barcode === code) || newEntries.find(e => e.barcode === code)) {
          duplicateCount++;
          setBulkStatus(prev => ({ ...prev, duplicate: duplicateCount }));
          continue;
        }

        // Verifica se já existe no banco
        const exists = await checkBarcodeExists(code);
        if (exists) {
          duplicateCount++;
          setBulkStatus(prev => ({ ...prev, duplicate: duplicateCount }));
          continue;
        }

        // Cria entrada
        const newEntry: TireEntry = {
          id: generateUUID(),
          barcode: code,
          model: model.name,
          modelId: model.id,
          container: container.name,
          containerId: container.id,
          timestamp: new Date()
        };

        const stockEntry: StockEntry = {
          id: newEntry.id,
          barcode: newEntry.barcode,
          model_id: newEntry.modelId,
          model_name: newEntry.model,
          model_type: model.type as 'Slick' | 'Wet',
          container_id: newEntry.containerId,
          container_name: newEntry.container,
          created_at: newEntry.timestamp.toISOString(),
          status: 'Novo',
        };

        const success = await saveStockEntry(stockEntry);

        if (success) {
          newEntries.push(newEntry);
          successCount++;
          setBulkStatus(prev => ({ ...prev, success: successCount }));
        } else {
          errorCount++;
          setBulkStatus(prev => ({ ...prev, error: errorCount }));
        }
      } catch (error) {
        console.error(`Erro ao processar ${code}:`, error);
        errorCount++;
        setBulkStatus(prev => ({ ...prev, error: errorCount }));
      }

      setBulkProgress((i + 1) / validCodes.length * 100);
      
      // Pequeno delay para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Adiciona todas as novas entradas
    if (newEntries.length > 0) {
      setEntries(prev => [...newEntries, ...prev]);
      setSessionStats(prev => ({
        total: prev.total + successCount,
        success: prev.success + successCount,
        error: prev.error + errorCount
      }));
    }

    setIsBulkProcessing(false);
    haptic.success();

    // Toast resumo
    toast.success('Processamento concluído!', {
      description: `✓ ${successCount} registrados | ⚠ ${duplicateCount} duplicados | ✗ ${errorCount} erros`,
      duration: 5000,
    });

    // Limpa formulário se tudo deu certo
    if (successCount > 0) {
      setBulkBarcodes('');
    }
  };

  // ========================================
  // ENTRADA VIA PLANILHA
  // ========================================
  
  const handleSpreadsheetProcess = async () => {
    if (!spreadsheetText.trim()) {
      toast.error('Cole os dados da planilha');
      haptic.error();
      return;
    }

    // Processa linhas (formato: Modelo\tCódigo ou Modelo,Código)
    const lines = spreadsheetText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      toast.error('Nenhuma linha válida encontrada');
      return;
    }

    const validEntries: Array<{ modelId: string; modelName: string; code: string }> = [];
    const invalidLines: string[] = [];

    lines.forEach((line, index) => {
      // Tenta separar por TAB ou vírgula
      const parts = line.includes('\t') 
        ? line.split('\t') 
        : line.split(',');

      if (parts.length < 2) {
        invalidLines.push(`Linha ${index + 1}: formato incorreto`);
        return;
      }

      const modelName = parts[0].trim();
      const code = parts[1].trim();

      // Valida código
      if (!/^\d{7,8}$/.test(code)) {
        invalidLines.push(`Linha ${index + 1}: código inválido (${code})`);
        return;
      }

      // Busca modelo
      const model = tireModels.find(m => 
        m.name.toLowerCase() === modelName.toLowerCase() ||
        m.name.toLowerCase().includes(modelName.toLowerCase())
      );

      if (!model) {
        invalidLines.push(`Linha ${index + 1}: modelo não encontrado (${modelName})`);
        return;
      }

      validEntries.push({
        modelId: model.id,
        modelName: model.name,
        code
      });
    });

    if (invalidLines.length > 0) {
      toast.error('Linhas com erros encontradas', {
        description: `${invalidLines.length} linha(s) serão ignoradas`,
        duration: 4000,
      });
    }

    if (validEntries.length === 0) {
      toast.error('Nenhuma entrada válida para processar');
      return;
    }

    // Valida que há pelo menos um contêiner selecionado
    if (!selectedContainer) {
      toast.error('Selecione um contêiner');
      return;
    }

    const container = containers.find(c => c.id === selectedContainer);
    if (!container) {
      toast.error('Contêiner não encontrado');
      return;
    }

    setIsSpreadsheetProcessing(true);
    setSpreadsheetProgress(0);
    setSpreadsheetStatus({
      current: 0,
      total: validEntries.length,
      success: 0,
      error: 0,
      currentAction: 'Iniciando...'
    });

    haptic.impact();

    let successCount = 0;
    let errorCount = 0;
    const newEntries: TireEntry[] = [];

    for (let i = 0; i < validEntries.length; i++) {
      const entry = validEntries[i];
      
      setSpreadsheetStatus(prev => ({
        ...prev,
        current: i + 1,
        currentAction: `Processando ${entry.code}...`
      }));

      try {
        // Verifica duplicata
        const exists = await checkBarcodeExists(entry.code);
        if (exists || entries.find(e => e.barcode === entry.code)) {
          errorCount++;
          setSpreadsheetStatus(prev => ({ ...prev, error: errorCount }));
          continue;
        }

        const model = tireModels.find(m => m.id === entry.modelId);
        if (!model) continue;

        const newEntry: TireEntry = {
          id: generateUUID(),
          barcode: entry.code,
          model: entry.modelName,
          modelId: entry.modelId,
          container: container.name,
          containerId: container.id,
          timestamp: new Date()
        };

        const stockEntry: StockEntry = {
          id: newEntry.id,
          barcode: newEntry.barcode,
          model_id: newEntry.modelId,
          model_name: newEntry.model,
          model_type: model.type as 'Slick' | 'Wet',
          container_id: newEntry.containerId,
          container_name: newEntry.container,
          created_at: newEntry.timestamp.toISOString(),
          status: 'Novo',
        };

        const success = await saveStockEntry(stockEntry);

        if (success) {
          newEntries.push(newEntry);
          successCount++;
          setSpreadsheetStatus(prev => ({ ...prev, success: successCount }));
        } else {
          errorCount++;
          setSpreadsheetStatus(prev => ({ ...prev, error: errorCount }));
        }
      } catch (error) {
        console.error(`Erro ao processar ${entry.code}:`, error);
        errorCount++;
        setSpreadsheetStatus(prev => ({ ...prev, error: errorCount }));
      }

      setSpreadsheetProgress((i + 1) / validEntries.length * 100);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (newEntries.length > 0) {
      setEntries(prev => [...newEntries, ...prev]);
      setSessionStats(prev => ({
        total: prev.total + successCount,
        success: prev.success + successCount,
        error: prev.error + errorCount
      }));
    }

    setIsSpreadsheetProcessing(false);
    haptic.success();

    toast.success('Processamento concluído!', {
      description: `✓ ${successCount} registrados | ✗ ${errorCount} erros`,
      duration: 5000,
    });

    if (successCount > 0) {
      setSpreadsheetText('');
    }
  };

  // ========================================
  // RENDERIZAÇÃO
  // ========================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#D50000] mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  if (tireModels.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center bg-white rounded-xl p-8 shadow-lg max-w-md">
          <PackageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhum Modelo</h2>
          <p className="text-gray-600">Cadastre modelos de pneus primeiro</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#D50000] to-[#B00000] text-white px-4 py-3 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PackageIcon className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-bold">Entrada de Estoque</h1>
              <p className="text-xs text-white/80">TC22 Mobile</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-300" />
            ) : (
              <WifiOff className="h-5 w-5 text-yellow-300 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#D50000]">{sessionStats.success}</div>
            <div className="text-xs text-gray-500">Registrados</div>
          </div>
          {sessionStats.error > 0 && (
            <div className="text-center">
              <div className="text-xl font-bold text-red-500">{sessionStats.error}</div>
              <div className="text-xs text-gray-500">Erros</div>
            </div>
          )}
        </div>
        
        <Badge variant="outline" className="text-sm px-3 py-1">
          <BarChart3 className="h-4 w-4 mr-1" />
          {entries.length} na sessão
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="individual" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-4 mx-4 mt-2 flex-shrink-0">
          <TabsTrigger value="individual" className="text-xs">Individual</TabsTrigger>
          <TabsTrigger value="bulk" className="text-xs">Lote</TabsTrigger>
          <TabsTrigger value="spreadsheet" className="text-xs">Planilha</TabsTrigger>
          <TabsTrigger value="rfid" className="text-xs flex items-center gap-1">
            <Radio className="w-3 h-3" />RFID
          </TabsTrigger>
        </TabsList>

        {/* TAB: INDIVIDUAL */}
        <TabsContent value="individual" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
          {/* Seleção */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4 space-y-4 shadow-sm">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Modelo do Pneu
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-4 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D50000] focus:border-[#D50000] bg-white"
              >
                {tireModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contêiner
              </label>
              <select
                value={selectedContainer}
                onChange={(e) => setSelectedContainer(e.target.value)}
                className="w-full px-4 py-4 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D50000] focus:border-[#D50000] bg-white"
              >
                {containers.map(container => (
                  <option key={container.id} value={container.id}>
                    {container.name}
                    {container.capacity > 0 && ` (${container.current_stock || 0}/${container.capacity})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Código de Barras */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Código do Pneu
            </label>
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEntry();
                    }
                  }}
                  placeholder="7 ou 8 dígitos"
                  disabled={isSaving}
                  className="w-full px-4 py-5 text-2xl font-mono border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D50000] focus:border-[#D50000] disabled:bg-gray-100"
                />
                
                {isSaving && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <RefreshCw className="h-5 w-5 text-[#D50000] animate-spin" />
                  </div>
                )}
              </div>
              
              <Button
                onClick={() => setShowScanner(true)}
                size="lg"
                variant="outline"
                className="px-6 py-5 border-2"
              >
                <Camera className="h-6 w-6" />
              </Button>
            </div>

            <Button
              onClick={handleAddEntry}
              disabled={isSaving || !barcode.trim()}
              className="w-full mt-3 py-6 text-lg font-semibold bg-[#D50000] hover:bg-[#B00000] disabled:bg-gray-300"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Registrar Pneu
                </>
              )}
            </Button>
          </div>

          {/* Lista de Registros */}
          {entries.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                <h3 className="text-sm font-semibold text-gray-700">
                  Registros desta Sessão ({entries.length})
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200 max-h-[300px] overflow-y-auto">
                {entries.map((entry, index) => (
                  <div key={entry.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">#{entries.length - index}</span>
                        <span className="text-base font-bold font-mono text-gray-900">{entry.barcode}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {entry.model} → {entry.container}
                      </div>
                      <div className="text-xs text-gray-400">
                        {entry.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEntry(entry.id, entry.barcode)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB: LOTE */}
        <TabsContent value="bulk" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Layers className="h-5 w-5 text-blue-600" />
              <h2 className="font-bold text-gray-900">Cadastro em Lote</h2>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Modelo do Pneu
              </label>
              <select
                value={bulkModel}
                onChange={(e) => setBulkModel(e.target.value)}
                disabled={isBulkProcessing}
                className="w-full px-4 py-4 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D50000] focus:border-[#D50000] bg-white disabled:bg-gray-100"
              >
                {tireModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contêiner
              </label>
              <select
                value={bulkContainer}
                onChange={(e) => setBulkContainer(e.target.value)}
                disabled={isBulkProcessing}
                className="w-full px-4 py-4 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D50000] focus:border-[#D50000] bg-white disabled:bg-gray-100"
              >
                {containers.map(container => (
                  <option key={container.id} value={container.id}>
                    {container.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Códigos (um por linha)
              </label>
              <Textarea
                value={bulkBarcodes}
                onChange={(e) => setBulkBarcodes(e.target.value)}
                disabled={isBulkProcessing}
                placeholder="1234567&#10;2345678&#10;3456789"
                className="w-full min-h-[200px] text-base font-mono border-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Digite um código por linha (7-8 dígitos)
              </p>
            </div>

            {isBulkProcessing && (
              <div className="space-y-2">
                <Progress value={bulkProgress} className="h-2" />
                <div className="text-sm text-gray-600">
                  <p className="font-semibold">{bulkStatus.currentAction}</p>
                  <p className="text-xs">
                    {bulkStatus.current} de {bulkStatus.total} • 
                    ✓ {bulkStatus.success} • 
                    ⚠ {bulkStatus.duplicate} duplicados • 
                    ✗ {bulkStatus.error} erros
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handleBulkProcess}
              disabled={isBulkProcessing || !bulkBarcodes.trim()}
              className="w-full py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
            >
              {isBulkProcessing ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Processar Lote
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* TAB: PLANILHA */}
        <TabsContent value="spreadsheet" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b">
              <FileUp className="h-5 w-5 text-purple-600" />
              <h2 className="font-bold text-gray-900">Entrada via Planilha</h2>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contêiner Padrão
              </label>
              <select
                value={selectedContainer}
                onChange={(e) => setSelectedContainer(e.target.value)}
                disabled={isSpreadsheetProcessing}
                className="w-full px-4 py-4 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D50000] focus:border-[#D50000] bg-white disabled:bg-gray-100"
              >
                {containers.map(container => (
                  <option key={container.id} value={container.id}>
                    {container.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Dados da Planilha
              </label>
              <Textarea
                value={spreadsheetText}
                onChange={(e) => setSpreadsheetText(e.target.value)}
                disabled={isSpreadsheetProcessing}
                placeholder="Modelo TAB Código&#10;ou&#10;Modelo,Código"
                className="w-full min-h-[250px] text-sm font-mono border-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formato: Modelo [TAB ou ,] Código (um por linha)
              </p>
            </div>

            {isSpreadsheetProcessing && (
              <div className="space-y-2">
                <Progress value={spreadsheetProgress} className="h-2" />
                <div className="text-sm text-gray-600">
                  <p className="font-semibold">{spreadsheetStatus.currentAction}</p>
                  <p className="text-xs">
                    {spreadsheetStatus.current} de {spreadsheetStatus.total} • 
                    ✓ {spreadsheetStatus.success} • 
                    ✗ {spreadsheetStatus.error} erros
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handleSpreadsheetProcess}
              disabled={isSpreadsheetProcessing || !spreadsheetText.trim()}
              className="w-full py-6 text-lg font-semibold bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300"
            >
              {isSpreadsheetProcessing ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <FileUp className="h-5 w-5 mr-2" />
                  Processar Planilha
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* TAB: PORTAL RFID */}
        <TabsContent value="rfid" className="flex-1 overflow-y-auto p-4 mt-0">
          <RFIDStockPortal
            tireModels={tireModels}
            containers={containers}
          />
        </TabsContent>
      </Tabs>

      {/* Animação de Sucesso */}
      {showSuccess && <BarcodeConfirmationAnimation />}

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="w-full h-full">
            <BarcodeScanner
              onScanComplete={handleScanComplete}
              onClose={() => setShowScanner(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
