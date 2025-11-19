import { useState, useEffect } from 'react';
import { generateUUID } from '../utils/uuid';
import { Database, Plus, Edit2, Trash2, Save, X, Loader2, AlertCircle, Settings, Scale } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  getMasterData, 
  saveMasterDataItem, 
  deleteMasterDataItem,
  type MasterDataItem 
} from '../utils/storage';
import { MasterDataMigrationAlert } from './MasterDataMigrationAlert';

// Tipos para as regras
interface WildcardRule {
  categoria: string;
  campeonato: string;
  quantidade: number;
}

interface TirePurchaseRule {
  categoria: string;
  campeonato: string;
  quantidade: number;
}

interface WetTirePurchaseRule {
  categoria: string;
  campeonato: string;
  quantidade: number;
}

interface BusinessRules {
  wildcardRules: WildcardRule[];
  tirePurchaseRules: TirePurchaseRule[];
  wetTirePurchaseRules: WetTirePurchaseRule[];
}

export function MasterData() {
  const [masterData, setMasterData] = useState<Record<string, MasterDataItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categoria');
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<MasterDataItem | null>(null);
  const [dbError, setDbError] = useState<{ code?: string; message?: string } | null>(null);

  // Estados para as regras de negócio
  const [businessRules, setBusinessRules] = useState<BusinessRules>({
    wildcardRules: [
      { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 8 },
    ],
    tirePurchaseRules: [
      { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 3 },
      { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 3 },
      { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 3 },
      { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 3 },
      { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 1 },
    ],
    wetTirePurchaseRules: [
      { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 4 },
    ],
  });
  const [isEditingRules, setIsEditingRules] = useState(false);

  const dataTypes = [
    { id: 'categoria', label: 'Categoria', icon: '🏁', defaultValues: ['Carrera', 'Challenge', 'Trophy'] },
    { id: 'geracao', label: 'Geração do Carro', icon: '🚗', defaultValues: ['991/I', '991/II', '992'] },
    { id: 'tipo_pneu', label: 'Tipo de Pneu', icon: '🔴', defaultValues: ['SLICK', 'WET'] },
    { id: 'lado_pneu', label: 'Lado do Pneu', icon: '↔️', defaultValues: ['DD', 'DE', 'TD', 'TE'] },
    { id: 'campeonato', label: 'Campeonato', icon: '🏆', defaultValues: ['Endurance', 'Sprint'] },
    { id: 'temporada', label: 'Temporada', icon: '📅', defaultValues: ['2025'] },
    { id: 'etapa', label: 'Etapa', icon: '📍', defaultValues: ['1', '2', '3', '4', '5', '6', '7', '8', '9'] },
    { id: 'pista', label: 'Pista', icon: '🏁', defaultValues: ['Interlagos', 'Velocitta', 'Goiânia', 'Estoril', 'Algarve'] },
    { id: 'regras', label: 'Regras', icon: '⚙️', defaultValues: [] },
  ];

  useEffect(() => {
    loadMasterData();
    loadBusinessRules();
  }, []);

  const loadMasterData = async () => {
    try {
      setIsLoading(true);
      setDbError(null);
      const data = await getMasterData();
      setMasterData(data);
    } catch (error: any) {
      console.error('Erro ao carregar master data:', error);
      
      // Verifica se é erro de tabela não encontrada
      if (error?.code === 'PGRST205' || error?.message?.includes('master_data')) {
        setDbError({
          code: error?.code || 'PGRST205',
          message: error?.message || 'Tabela master_data não encontrada'
        });
        toast.error('Tabela master_data não encontrada. Execute a migration primeiro.', {
          duration: 10000,
          action: {
            label: 'Ver instruções',
            onClick: () => window.open('/PASSO_A_PASSO_MASTER_DATA.md', '_blank')
          }
        });
      } else {
        toast.error('Erro ao carregar dados');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadBusinessRules = async () => {
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/business-rules`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      if (response.ok) {
        const rules = await response.json();
        if (rules) {
          // Garante que wetTirePurchaseRules sempre existe (retrocompatibilidade)
          const completeRules: BusinessRules = {
            wildcardRules: rules.wildcardRules || [],
            tirePurchaseRules: rules.tirePurchaseRules || [],
            wetTirePurchaseRules: rules.wetTirePurchaseRules || [
              { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 4 },
              { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 4 },
              { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 4 },
              { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 4 },
              { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 4 },
            ],
          };
          setBusinessRules(completeRules);
        }
      }
    } catch (error) {
      console.log('Usando regras padrão');
    }
  };

  const saveBusinessRules = async () => {
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/business-rules`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(businessRules),
        }
      );

      if (response.ok) {
        toast.success('Regras salvas com sucesso');
        setIsEditingRules(false);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao salvar regras');
      }
    } catch (error) {
      console.error('Erro ao salvar regras:', error);
      toast.error('Erro ao salvar regras');
    }
  };

  const updateWildcardRule = (index: number, quantidade: number) => {
    const newRules = [...businessRules.wildcardRules];
    newRules[index].quantidade = quantidade;
    setBusinessRules({ ...businessRules, wildcardRules: newRules });
  };

  const updateTirePurchaseRule = (index: number, quantidade: number) => {
    const newRules = [...businessRules.tirePurchaseRules];
    newRules[index].quantidade = quantidade;
    setBusinessRules({ ...businessRules, tirePurchaseRules: newRules });
  };

  const updateWetTirePurchaseRule = (index: number, quantidade: number) => {
    const newRules = [...businessRules.wetTirePurchaseRules];
    newRules[index].quantidade = quantidade;
    setBusinessRules({ ...businessRules, wetTirePurchaseRules: newRules });
  };

  const handleAddNew = () => {
    setIsEditing(true);
    setEditingItem(null);
    setNewItemName('');
  };

  const handleEdit = (item: MasterDataItem) => {
    setIsEditing(true);
    setEditingItem(item);
    setNewItemName(item.name);
  };

  const handleSave = async () => {
    if (!newItemName.trim()) {
      toast.error('Nome não pode estar vazio');
      return;
    }

    try {
      const item: MasterDataItem = editingItem 
        ? { ...editingItem, name: newItemName.trim() }
        : {
            id: generateUUID(),
            type: activeTab,
            name: newItemName.trim(),
            createdAt: new Date().toISOString(),
          };

      await saveMasterDataItem(item);
      await loadMasterData();
      
      setIsEditing(false);
      setEditingItem(null);
      setNewItemName('');
      
      toast.success(editingItem ? 'Item atualizado' : 'Item adicionado');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar item');
    }
  };

  const handleDelete = async (item: MasterDataItem) => {
    try {
      await deleteMasterDataItem(item.id);
      await loadMasterData();
      setDeleteConfirm(null);
      toast.success('Item removido');
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast.error('Erro ao remover item');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingItem(null);
    setNewItemName('');
  };

  const handleInitializeDefaults = async (typeId: string) => {
    const dataType = dataTypes.find(dt => dt.id === typeId);
    if (!dataType) return;

    try {
      const existingItems = masterData[typeId] || [];
      let addedCount = 0;

      for (const defaultValue of dataType.defaultValues) {
        const exists = existingItems.some(item => 
          item.name.toLowerCase() === defaultValue.toLowerCase()
        );

        if (!exists) {
          const item: MasterDataItem = {
            id: `${typeId}-${Date.now()}-${addedCount}`,
            type: typeId,
            name: defaultValue,
            createdAt: new Date().toISOString(),
          };
          await saveMasterDataItem(item);
          addedCount++;
        }
      }

      await loadMasterData();
      
      if (addedCount > 0) {
        toast.success(`${addedCount} ${addedCount === 1 ? 'item adicionado' : 'itens adicionados'}`);
      } else {
        toast.info('Todos os itens padrão já existem');
      }
    } catch (error) {
      console.error('Erro ao inicializar valores padrão:', error);
      toast.error('Erro ao adicionar valores padrão');
    }
  };

  const currentTypeData = masterData[activeTab] || [];
  const currentDataType = dataTypes.find(dt => dt.id === activeTab);

  if (isLoading) {
    return (
      <div className="flex-1 p-3 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
      {/* Alerta de Migration */}
      <MasterDataMigrationAlert 
        errorCode={dbError?.code}
        errorMessage={dbError?.message}
      />
      
      <div className="max-w-7xl lg:mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Database size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-gray-900">Master Data</h1>
              <p className="text-gray-500">Dados base do sistema</p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-0.5" size={20} />
            <div>
              <h3 className="text-blue-900 text-sm mb-1">Sobre Master Data</h3>
              <p className="text-xs text-blue-700">
                Configure aqui os dados mestres que serão utilizados em todo o sistema: categorias, gerações de carros, 
                tipos de pneus, campeonatos, pistas e mais. Esses dados alimentam os formulários e relatórios.
              </p>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto hide-scrollbar">
            <TabsList className="inline-flex min-w-full lg:min-w-0">
              {dataTypes.map((type) => (
                <TabsTrigger key={type.id} value={type.id} className="whitespace-nowrap">
                  <span className="mr-1">{type.icon}</span>
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {dataTypes.filter(type => type.id !== 'regras').map((type) => (
            <TabsContent key={type.id} value={type.id} className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-gray-900 mb-1">{type.label}</h2>
                    <p className="text-sm text-gray-500">
                      {currentTypeData.length} {currentTypeData.length === 1 ? 'item cadastrado' : 'itens cadastrados'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleInitializeDefaults(type.id)}
                      variant="outline"
                      size="sm"
                    >
                      Adicionar Padrões
                    </Button>
                    <Button
                      onClick={handleAddNew}
                      className="bg-red-600 hover:bg-red-700"
                      size="sm"
                    >
                      <Plus size={16} className="mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                {/* Form de Edição/Criação */}
                {isEditing && (
                  <Card className="p-4 mb-4 bg-gray-50 border-2 border-red-200">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="item-name">
                          {editingItem ? 'Editar' : 'Novo'} {type.label}
                        </Label>
                        <Input
                          id="item-name"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder={`Digite o nome do ${type.label.toLowerCase()}`}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') handleCancel();
                          }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSave}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <Save size={16} className="mr-2" />
                          Salvar
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          size="sm"
                        >
                          <X size={16} className="mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Lista de Itens */}
                {currentTypeData.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Database className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-gray-900 mb-2">Nenhum item cadastrado</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Clique em "Adicionar Padrões" para começar com valores pré-definidos<br />
                      ou adicione itens manualmente.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {currentTypeData
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((item) => (
                        <Card
                          key={item.id}
                          className="p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{type.icon}</span>
                                <span className="text-gray-900">{item.name}</span>
                              </div>
                              {item.createdAt && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Criado em {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                onClick={() => handleEdit(item)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 size={14} className="text-blue-600" />
                              </Button>
                              <Button
                                onClick={() => setDeleteConfirm(item)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 size={14} className="text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          ))}

          {/* Aba de Regras */}
          <TabsContent value="regras" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-gray-900 mb-1">Regras de Negócio</h2>
                  <p className="text-sm text-gray-500">
                    Configure limites de compra de pneus e coringas
                  </p>
                </div>
                <div className="flex gap-2">
                  {isEditingRules ? (
                    <>
                      <Button
                        onClick={saveBusinessRules}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <Save size={16} className="mr-2" />
                        Salvar Regras
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditingRules(false);
                          loadBusinessRules();
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <X size={16} className="mr-2" />
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setIsEditingRules(true)}
                      className="bg-red-600 hover:bg-red-700"
                      size="sm"
                    >
                      <Edit2 size={16} className="mr-2" />
                      Editar Regras
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                {/* Regras de Coringas */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-gray-900 mb-1">Coringas por Piloto/Ano</h3>
                    <p className="text-sm text-gray-500">
                      Quantidade de coringas que podem ser comprados por piloto no ano/temporada
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm text-gray-700">Categoria</th>
                          <th className="text-left py-3 px-4 text-sm text-gray-700">Campeonato</th>
                          <th className="text-left py-3 px-4 text-sm text-gray-700">Quantidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {businessRules.wildcardRules.map((rule, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {rule.categoria}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                {rule.campeonato}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              {isEditingRules ? (
                                <Input
                                  type="number"
                                  min="0"
                                  value={rule.quantidade}
                                  onChange={(e) => updateWildcardRule(index, parseInt(e.target.value) || 0)}
                                  className="w-24"
                                />
                              ) : (
                                <span className="text-gray-900">{rule.quantidade} coringas</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Regras de Pneus Slick por Etapa */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-gray-900 mb-1">Pneus SLICK por Piloto/Etapa</h3>
                    <p className="text-sm text-gray-500">
                      Quantidade de pneus slick que podem ser comprados por piloto e etapa
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm text-gray-700">Categoria</th>
                          <th className="text-left py-3 px-4 text-sm text-gray-700">Campeonato</th>
                          <th className="text-left py-3 px-4 text-sm text-gray-700">Quantidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {businessRules.tirePurchaseRules.map((rule, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {rule.categoria}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                {rule.campeonato}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              {isEditingRules ? (
                                <Input
                                  type="number"
                                  min="0"
                                  value={rule.quantidade}
                                  onChange={(e) => updateTirePurchaseRule(index, parseInt(e.target.value) || 0)}
                                  className="w-24"
                                />
                              ) : (
                                <span className="text-gray-900">{rule.quantidade} pneus</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Regras de Pneus WET por Etapa */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-gray-900 mb-1">Pneus WET por Piloto/Etapa</h3>
                    <p className="text-sm text-gray-500">
                      Quantidade de pneus wet que podem ser comprados por piloto e etapa
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm text-gray-700">Categoria</th>
                          <th className="text-left py-3 px-4 text-sm text-gray-700">Campeonato</th>
                          <th className="text-left py-3 px-4 text-sm text-gray-700">Quantidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(businessRules.wetTirePurchaseRules || []).map((rule, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {rule.categoria}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                {rule.campeonato}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              {isEditingRules ? (
                                <Input
                                  type="number"
                                  min="0"
                                  value={rule.quantidade}
                                  onChange={(e) => updateWetTirePurchaseRule(index, parseInt(e.target.value) || 0)}
                                  className="w-24"
                                />
                              ) : (
                                <span className="text-gray-900">{rule.quantidade} pneus</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Info Card */}
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                    <div>
                      <h3 className="text-yellow-900 text-sm mb-1">Importante</h3>
                      <p className="text-xs text-yellow-700">
                        Estas regras definem os limites permitidos no sistema. Alterações afetam todos os registros futuros.
                        Certifique-se de revisar antes de salvar.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteConfirm?.name}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
