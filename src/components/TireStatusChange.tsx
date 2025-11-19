import { useState, useEffect } from 'react';
import { RefreshCw, Package, CheckCircle2, Search, Filter, X, AlertCircle, ArrowRight, Barcode, Layers, FileUp, Download } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
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
import { toast } from 'sonner@2.0.3';
import { getTireModels, getContainers, type StockEntry, type TireStatus, type TireModel, type Container } from '../utils/storage';
import { useTireStatus } from '../utils/TireStatusContext';
import { StatusSelect } from './StatusSelect';
import { StatusBadge } from './StatusBadge';
import { createClient } from '../utils/supabase/client';

export function TireStatusChange() {
  const { statusList } = useTireStatus();
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  
  // Estados para Mudança Individual
  const [barcode, setBarcode] = useState('');
  const [selectedTire, setSelectedTire] = useState<StockEntry | null>(null);
  const [individualStatus, setIndividualStatus] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<StockEntry[]>([]);
  
  // Estados para Mudança em Massa - NOVO ESTILO TireMovement
  const [bulkSourceContainer, setBulkSourceContainer] = useState('');
  const [bulkFilterModel, setBulkFilterModel] = useState('all');
  const [bulkFilterType, setBulkFilterType] = useState('all');
  const [bulkFilterStatus, setBulkFilterStatus] = useState('all');
  const [bulkBarcodes, setBulkBarcodes] = useState('');
  const [selectedTires, setSelectedTires] = useState<StockEntry[]>([]);
  const [bulkNewStatus, setBulkNewStatus] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    loadData();
    
    // Escuta atualizações
    const handleUpdate = () => loadData();
    
    window.addEventListener('stock-entries-updated', handleUpdate);
    window.addEventListener('tire-status-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('stock-entries-updated', handleUpdate);
      window.removeEventListener('tire-status-updated', handleUpdate);
    };
  }, []);

  const loadData = async () => {
    try {
      const supabase = createClient();
      
      // Busca entradas de estoque (incluindo descartadas) com limite otimizado
      const { data: stockData, error: stockError } = await supabase
        .from('stock_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000); // Limite aumentado para comportar todos os registros

      if (stockError) {
        console.error('❌ Erro ao buscar entradas:', stockError);
      } else {
        // Converte snake_case para o formato esperado
        const allStockEntries: StockEntry[] = (stockData || []).map((entry: any) => ({
          id: entry.id,
          barcode: entry.barcode,
          model_id: entry.model_id,
          model_name: entry.model_name,
          model_type: entry.model_type,
          container_id: entry.container_id || '',
          container_name: entry.container_name || 'Sem Contêiner',
          status: entry.status,
          session_id: entry.session_id,
          pilot: entry.pilot,
          team: entry.team,
          notes: entry.notes,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          created_by: entry.created_by,
        }));

        // 🛡️ VALIDAÇÃO CRÍTICA: Filtra registros com barcode corrompido (UUID ao invés de 8 dígitos)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validEntries = allStockEntries.filter((entry: StockEntry) => {
          // Detecta se barcode é um UUID
          if (uuidRegex.test(entry.barcode)) {
            console.error('❌ [TireStatusChange] REGISTRO CORROMPIDO - barcode é UUID:', entry.barcode);
            console.error('   ID do registro:', entry.id);
            console.error('   Modelo:', entry.model_name);
            return false;
          }
          
          // Valida se barcode tem exatamente 8 dígitos numéricos
          if (!/^\d{8}$/.test(entry.barcode)) {
            console.warn('⚠️ [TireStatusChange] Barcode inválido:', entry.barcode, '| ID:', entry.id);
            return false;
          }
          
          return true;
        });

        const removedCount = allStockEntries.length - validEntries.length;
        if (removedCount > 0) {
          console.warn(`⚠️ [TireStatusChange] ${removedCount} registro(s) corrompido(s) filtrado(s)`);
          console.warn(`   Execute FIX_CORRUPTED_BARCODES.sql para limpar o banco de dados`);
        }

        setEntries(validEntries);
        console.log(`✅ [TireStatusChange] ${validEntries.length} entradas válidas carregadas (${removedCount} corrompidas filtradas)`);
      }
      
      const models = await getTireModels();
      setTireModels(Array.isArray(models) ? models : []);
      
      const containerList = await getContainers();
      setContainers(Array.isArray(containerList) ? containerList : []);
    } catch (error) {
      console.error('Error loading data:', error);
      // Garantir arrays vazios em caso de erro
      setEntries([]);
      setTireModels([]);
      setContainers([]);
    }
  };

  // ============================================
  // FUNÇÕES PARA MUDANÇA INDIVIDUAL
  // ============================================

  const handleBarcodeChange = (value: string) => {
    setBarcode(value);
    
    if (value.length >= 3) {
      const results = entries.filter(e => 
        e.barcode.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      
      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }

    // Auto-busca quando atingir 8 dígitos
    if (value.length === 8) {
      const tire = entries.find(e => e.barcode === value);
      if (tire) {
        setSelectedTire(tire);
        setShowSearchResults(false);
      }
    }
  };

  const selectTire = (tire: StockEntry) => {
    setSelectedTire(tire);
    setBarcode(tire.barcode);
    setShowSearchResults(false);
  };

  const handleIndividualStatusChange = async () => {
    if (!selectedTire || !individualStatus) {
      toast.error('Dados incompletos', {
        description: 'Selecione um pneu e um status.',
      });
      return;
    }

    try {
      const supabase = createClient();
      
      // Se o novo status for "Descartado DSI", remove do container
      const updateData: any = {
        status: individualStatus,
        updated_at: new Date().toISOString(),
      };
      
      if (individualStatus === 'Descartado DSI' || individualStatus === 'Descarte DSI' || individualStatus === 'Descarte') {
        updateData.container_id = null;
        updateData.container_name = null;
      }
      
      const { error } = await supabase
        .from('stock_entries')
        .update(updateData)
        .eq('barcode', selectedTire.barcode);

      if (error) {
        console.error('❌ Erro ao atualizar status:', error);
        toast.error('Erro ao alterar status', {
          description: 'Tente novamente.',
        });
        return;
      }

      toast.success('Status alterado com sucesso!', {
        description: `Pneu ${selectedTire.barcode} agora está como "${individualStatus}".`,
      });
      
      // Reset form
      setBarcode('');
      setSelectedTire(null);
      setIndividualStatus('');
      loadData();
      window.dispatchEvent(new Event('stock-entries-updated'));
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error);
      toast.error('Erro ao alterar status', {
        description: 'Tente novamente.',
      });
    }
  };

  // ============================================
  // FUNÇÕES PARA MUDANÇA EM MASSA
  // ============================================

  const loadBulkTires = () => {
    if (!bulkSourceContainer) {
      toast.error('Selecione um contêiner de origem');
      return;
    }

    let filtered = entries.filter(entry => {
      // Filtro de contêiner
      const matchesContainer = bulkSourceContainer === 'no-container'
        ? !entry.container_id
        : entry.container_id === bulkSourceContainer;

      // Filtro de modelo
      const matchesModel = bulkFilterModel === 'all' || entry.model_id === bulkFilterModel;

      // Filtro de tipo
      const matchesType = bulkFilterType === 'all' || entry.model_type === bulkFilterType;

      // Filtro de status
      const matchesStatus = bulkFilterStatus === 'all' || entry.status === bulkFilterStatus;

      return matchesContainer && matchesModel && matchesType && matchesStatus;
    });

    if (filtered.length === 0) {
      toast.info('Nenhum pneu encontrado', {
        description: 'Tente ajustar os filtros.',
      });
      setSelectedTires([]);
      return;
    }

    setSelectedTires(filtered);
    toast.success(`${filtered.length} ${filtered.length === 1 ? 'pneu carregado' : 'pneus carregados'}`);
  };

  const handleBulkBarcodeLoad = () => {
    if (!bulkBarcodes.trim()) {
      toast.error('Digite os códigos de barras');
      return;
    }

    // Processa códigos linha por linha
    const rawCodes = bulkBarcodes
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    if (rawCodes.length === 0) {
      toast.error('Nenhum código válido encontrado');
      return;
    }

    // Normaliza códigos: aceita 7 ou 8 dígitos
    // Códigos de 7 dígitos recebem zero à esquerda automaticamente (ex: 4969720 -> 04969720)
    const barcodes = rawCodes.map(code => {
      const numericCode = code.replace(/\D/g, '');
      
      // Se tem 7 dígitos, adiciona zero à esquerda
      if (numericCode.length === 7) {
        const normalized = '0' + numericCode;
        console.log(`  📝 Código normalizado: ${numericCode} -> ${normalized}`);
        return normalized;
      }
      
      // Retorna código original se tem 8 dígitos
      return numericCode;
    }).filter(code => code.length === 8); // Filtra apenas códigos válidos (8 dígitos após normalização)

    if (barcodes.length === 0) {
      toast.error('Nenhum código válido encontrado', {
        description: 'Códigos devem ter 7 ou 8 dígitos numéricos.',
      });
      return;
    }

    console.log('🔍 Mudar Status: Buscando códigos de barras...');
    console.log('  - Códigos originais:', rawCodes.length);
    console.log('  - Códigos normalizados:', barcodes.length);

    const found = entries.filter(entry => barcodes.includes(entry.barcode));

    if (found.length === 0) {
      toast.error('Nenhum pneu encontrado', {
        description: 'Verifique os códigos digitados.',
      });
      setSelectedTires([]);
      return;
    }

    setSelectedTires(found);
    
    const notFound = barcodes.length - found.length;
    if (notFound > 0) {
      toast.warning(`${found.length} pneus carregados`, {
        description: `${notFound} códigos não encontrados.`,
      });
    } else {
      toast.success(`${found.length} ${found.length === 1 ? 'pneu carregado' : 'pneus carregados'}`);
    }
  };

  const exportBulkBarcodes = () => {
    if (selectedTires.length === 0) return;

    const text = selectedTires.map(t => t.barcode).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codigos-status-change-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Códigos exportados');
  };

  const handleBulkStatusChange = () => {
    if (selectedTires.length === 0) {
      toast.error('Nenhum pneu selecionado');
      return;
    }

    if (!bulkNewStatus) {
      toast.error('Selecione o novo status');
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmBulkStatusChange = async () => {
    if (!bulkNewStatus) return;

    let successCount = 0;
    let errorCount = 0;

    try {
      const supabase = createClient();
      
      // Atualiza todos os pneus selecionados
      for (const tire of selectedTires) {
        // Se o novo status for "Descartado DSI", remove do container
        const updateData: any = {
          status: bulkNewStatus,
          updated_at: new Date().toISOString(),
        };
        
        if (bulkNewStatus === 'Descartado DSI' || bulkNewStatus === 'Descarte DSI' || bulkNewStatus === 'Descarte') {
          updateData.container_id = null;
          updateData.container_name = null;
        }
        
        const { error } = await supabase
          .from('stock_entries')
          .update(updateData)
          .eq('barcode', tire.barcode);

        if (error) {
          console.error(`❌ Erro ao atualizar ${tire.barcode}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      setShowConfirmDialog(false);
      setSelectedTires([]);
      setBulkNewStatus('');
      setBulkSourceContainer('');
      setBulkBarcodes('');
      loadData();

      if (errorCount === 0) {
        toast.success('Status alterado com sucesso!', {
          description: `${successCount} ${successCount === 1 ? 'pneu atualizado' : 'pneus atualizados'}.`,
        });
      } else {
        toast.warning('Alteração parcial', {
          description: `${successCount} atualizados, ${errorCount} com erro.`,
        });
      }

      window.dispatchEvent(new Event('stock-entries-updated'));
    } catch (error) {
      console.error('❌ Erro na atualização em massa:', error);
      toast.error('Erro ao alterar status em massa', {
        description: 'Tente novamente.',
      });
      setShowConfirmDialog(false);
    }
  };

  const getStatusColor = (statusName: string) => {
    const status = statusList.find(s => s.name === statusName);
    if (status) {
      return {
        backgroundColor: `${status.color}20`,
        borderColor: status.color,
        color: status.color,
      };
    }
    return {
      backgroundColor: '#f3f4f6',
      borderColor: '#d1d5db',
      color: '#6b7280',
    };
  };

  return (
    <div className="flex-1 px-2 py-2 sm:p-4 lg:p-8 w-full max-w-full">
      <div className="max-w-7xl lg:mx-auto w-full">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <RefreshCw className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-gray-900">Mudar Status</h1>
              <p className="text-gray-500 text-sm">Altere o status de pneus individual ou em massa</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="individual" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-2">
            <TabsTrigger value="individual">Individual</TabsTrigger>
            <TabsTrigger value="bulk">Em Massa</TabsTrigger>
          </TabsList>

          {/* ABA: INDIVIDUAL */}
          <TabsContent value="individual" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulário Individual */}
              <Card className="p-6">
                <h2 className="text-gray-900 mb-4 flex items-center gap-2">
                  <Package size={20} className="text-purple-600" />
                  Alterar Status Individual
                </h2>

                <div className="space-y-4">
                  {/* Código de Barras */}
                  <div className="relative">
                    <Label htmlFor="individual-barcode" className="mb-2">Código de Barras do Pneu</Label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                      <Input
                        id="individual-barcode"
                        type="text"
                        maxLength={8}
                        value={barcode}
                        onChange={(e) => handleBarcodeChange(e.target.value)}
                        placeholder="00000000"
                        className="pl-11 font-mono"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Digite ou escaneie o código de 8 dígitos
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
                                <p className="text-sm text-gray-900 mt-1">{tire.model_name}</p>
                                <p className="text-xs text-gray-500">{tire.container_name}</p>
                              </div>
                              <Badge
                                variant="secondary"
                                className="border"
                                style={getStatusColor(tire.status || '')}
                              >
                                {tire.status}
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dados do Pneu Selecionado */}
                  {selectedTire && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
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
                          <span className="text-gray-900">{selectedTire.model_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Contêiner:</span>
                          <span className="text-gray-900">{selectedTire.container_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status Atual:</span>
                          <Badge
                            variant="secondary"
                            className="border"
                            style={getStatusColor(selectedTire.status || '')}
                          >
                            {selectedTire.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Novo Status */}
                  {selectedTire && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="individual-new-status">Novo Status</Label>
                        <Select value={individualStatus} onValueChange={setIndividualStatus}>
                          <SelectTrigger id="individual-new-status">
                            <SelectValue placeholder="Selecione o novo status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusList
                              .filter(s => s.name !== selectedTire.status)
                              .map((status) => (
                                <SelectItem key={status.id} value={status.name}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: status.color }}
                                    />
                                    <span>{status.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        onClick={handleIndividualStatusChange}
                        disabled={!individualStatus}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <RefreshCw size={16} className="mr-2" />
                        Alterar Status
                      </Button>
                    </div>
                  )}
                </div>
              </Card>

              {/* Informações */}
              <div className="space-y-4">
                <Card className="p-6 border-blue-200 bg-blue-50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-blue-600 mt-1" size={20} />
                    <div>
                      <h3 className="text-blue-900 text-sm mb-2">Como Funciona</h3>
                      <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li>Digite ou escaneie o código de barras do pneu</li>
                        <li>Selecione o novo status desejado</li>
                        <li>Confirme a alteração</li>
                        <li>O histórico ficará registrado permanentemente</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-green-200 bg-green-50">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 mt-1" size={20} />
                    <div>
                      <h3 className="text-green-900 text-sm mb-2">Rastreabilidade</h3>
                      <p className="text-xs text-green-700">
                        Todas as alterações de status são registradas com data, hora e usuário responsável, 
                        garantindo controle total sobre o ciclo de vida dos pneus.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ABA: EM MASSA */}
          <TabsContent value="bulk" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Seleção de Pneus */}
              <Card className="p-6 lg:col-span-2">
                <h2 className="text-gray-900 mb-4 flex items-center gap-2">
                  <Layers size={20} className="text-purple-600" />
                  Selecionar Pneus para Alteração
                </h2>

                <Tabs defaultValue="container" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="container">Por Contêiner</TabsTrigger>
                    <TabsTrigger value="barcodes">Por Códigos</TabsTrigger>
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
                          setBulkFilterStatus('all');
                        }}
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
                                <Package size={16} className="text-gray-400" />
                                <span>{container.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {bulkSourceContainer && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="bulk-filter-model">Filtrar por Modelo</Label>
                            <Select value={bulkFilterModel} onValueChange={setBulkFilterModel}>
                              <SelectTrigger id="bulk-filter-model">
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
                            <Label htmlFor="bulk-filter-type">Filtrar por Tipo</Label>
                            <Select value={bulkFilterType} onValueChange={setBulkFilterType}>
                              <SelectTrigger id="bulk-filter-type">
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

                        <div>
                          <Label htmlFor="bulk-filter-status">Filtrar por Status</Label>
                          <Select value={bulkFilterStatus} onValueChange={setBulkFilterStatus}>
                            <SelectTrigger id="bulk-filter-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os Status</SelectItem>
                              {statusList.map((status) => (
                                <SelectItem key={status.id} value={status.name}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: status.color }}
                                    />
                                    <span>{status.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          onClick={loadBulkTires}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Filter size={16} className="mr-2" />
                          Carregar Pneus
                        </Button>
                      </>
                    )}
                  </TabsContent>

                  {/* Por Códigos */}
                  <TabsContent value="barcodes" className="space-y-4">
                    <div>
                      <Label htmlFor="bulk-barcodes">Códigos de Barras</Label>
                      <Textarea
                        id="bulk-barcodes"
                        value={bulkBarcodes}
                        onChange={(e) => setBulkBarcodes(e.target.value)}
                        placeholder="Digite os códigos de 8 dígitos, um por linha&#10;Ex:&#10;12345678&#10;87654321&#10;11223344"
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Cole ou digite um código por linha (8 dígitos cada)
                      </p>
                    </div>

                    <Button
                      onClick={handleBulkBarcodeLoad}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <FileUp size={16} className="mr-2" />
                      Carregar Códigos
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
                            <span className="text-gray-900">{tire.model_name}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className="border"
                            style={getStatusColor(tire.status || '')}
                          >
                            {tire.status}
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
                            {selectedTires.filter(t => t.model_type === 'Slick').length}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-600">Wet:</span>
                          <span className="ml-2 text-blue-700">
                            {selectedTires.filter(t => t.model_type === 'Wet').length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Novo Status e Confirmação */}
              <div className="space-y-4">
                <Card className="p-6">
                  <h2 className="text-gray-900 mb-4 flex items-center gap-2">
                    <RefreshCw size={20} className="text-purple-600" />
                    Novo Status
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bulk-new-status">Selecione o Status</Label>
                      <Select 
                        value={bulkNewStatus} 
                        onValueChange={setBulkNewStatus}
                        disabled={selectedTires.length === 0}
                      >
                        <SelectTrigger id="bulk-new-status">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusList.map((status) => (
                            <SelectItem key={status.id} value={status.name}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: status.color }}
                                />
                                <span>{status.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleBulkStatusChange}
                      disabled={selectedTires.length === 0 || !bulkNewStatus}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                    >
                      <RefreshCw size={16} className="mr-2" />
                      Alterar {selectedTires.length} {selectedTires.length === 1 ? 'Pneu' : 'Pneus'}
                    </Button>
                  </div>
                </Card>

                <Card className="p-6 border-blue-200 bg-blue-50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-blue-600 mt-1" size={20} />
                    <div>
                      <h3 className="text-blue-900 text-sm mb-2">Alteração em Massa</h3>
                      <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li>Selecione todos os pneus de um contêiner</li>
                        <li>Filtre por modelo, tipo ou status</li>
                        <li>Ou carregue uma lista de códigos</li>
                        <li>Todas as alterações são registradas</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="text-purple-600" size={24} />
                Confirmar Alteração de Status
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Você está prestes a alterar o status de{' '}
                  <strong className="text-gray-900">{selectedTires.length}</strong>{' '}
                  {selectedTires.length === 1 ? 'pneu' : 'pneus'} para{' '}
                  <strong className="text-gray-900">"{bulkNewStatus}"</strong>.
                </p>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-900">
                    <strong>Atenção:</strong> Esta ação será registrada no histórico e poderá afetar relatórios e estatísticas.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBulkStatusChange}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Confirmar Alteração
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
