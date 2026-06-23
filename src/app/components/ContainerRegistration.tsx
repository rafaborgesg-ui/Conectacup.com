import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, Loader2, Map } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import { FormSkeleton, CardGridSkeleton } from './LoadingSkeleton';
import { LoadingSpinner, ButtonLoading } from './LoadingSpinner';
import { PageHeader } from './PageHeader';
import { Card } from './ui/card';
import { ContainerGridMap } from './ContainerGridMap';
import { AnimatedTransition } from './AnimatedTransition';
import { HelpTooltip, FieldWithHelp } from './HelpTooltip';

interface Container {
  id: string;
  name: string;
  location: string;
  sector?: string;
  capacity: number;
  current_stock: number; // Renomeado de 'current' para 'current_stock' (nome real da coluna no banco)
  created_at?: string;
  updated_at?: string;
}

export function ContainerRegistration() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Carrega contêineres diretamente do Supabase
  const loadContainers = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      console.log('📦 Carregando contêineres da tabela containers...');
      
      const { data, error } = await supabase
        .from('containers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar contêineres:', error);
        throw new Error(error.message);
      }

      console.log(`✅ ${data?.length || 0} contêineres carregados`);
      
      // Log dos dados carregados com ocupação atual
      if (data && data.length > 0) {
        console.log('📊 Ocupação dos contêineres:', data.map(c => ({
          nome: c.name,
          atual: c.current_stock,
          capacidade: c.capacity,
          percentual: c.capacity > 0 ? `${((c.current_stock || 0) / c.capacity * 100).toFixed(1)}%` : 'N/A'
        })));
      }
      
      setContainers(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar contêineres:', error);
      toast.error(error.message || 'Erro ao carregar contêineres');
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega na montagem
  useEffect(() => {
    loadContainers();
  }, []);

  // Reset página quando contêineres mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [containers.length, itemsPerPage]);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    sector: '',
    capacity: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.location) {
      toast.error('Nome e localização são obrigatórios');
      return;
    }

    try {
      setIsSaving(true);
      const supabase = createClient();

      if (editingId) {
        // Atualizar contêiner existente
        console.log(`📝 Atualizando contêiner: ${editingId}`);
        
        const { error } = await supabase
          .from('containers')
          .update({
            name: formData.name,
            location: formData.location,
            sector: formData.sector || null,
            capacity: parseInt(formData.capacity) || 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) {
          console.error('❌ Erro ao atualizar:', error);
          throw new Error(error.message);
        }

        toast.success('Contêiner atualizado com sucesso!');
      } else {
        // Criar novo contêiner
        console.log('📝 Criando novo contêiner...');
        
        const { error } = await supabase
          .from('containers')
          .insert([{
            name: formData.name,
            location: formData.location,
            sector: formData.sector || null,
            capacity: parseInt(formData.capacity) || 0,
            current_stock: 0, // Usa current_stock ao invés de current
          }]);

        if (error) {
          console.error('❌ Erro ao criar:', error);
          throw new Error(error.message);
        }

        toast.success('Contêiner cadastrado com sucesso!');
      }

      // Recarregar lista
      await loadContainers();
      
      // Limpar formulário
      setFormData({ name: '', location: '', sector: '', capacity: '' });
      setEditingId(null);
      
    } catch (error: any) {
      console.error('Erro ao salvar contêiner:', error);
      toast.error(error.message || 'Erro ao salvar contêiner');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (container: Container) => {
    setFormData({
      name: container.name,
      location: container.location,
      sector: container.sector || '',
      capacity: container.capacity.toString(),
    });
    setEditingId(container.id);

    // Scroll para o topo em mobile
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o contêiner "${name}"?`)) {
      return;
    }

    try {
      const supabase = createClient();
      console.log(`🗑️ Deletando contêiner: ${id}`);
      
      const { error } = await supabase
        .from('containers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Erro ao deletar:', error);
        throw new Error(error.message);
      }

      toast.success('Contêiner removido com sucesso!');
      
      // Recarregar lista
      await loadContainers();
    } catch (error: any) {
      console.error('Erro ao deletar contêiner:', error);
      toast.error(error.message || 'Erro ao remover contêiner');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', location: '', sector: '', capacity: '' });
    setEditingId(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <PageHeader icon={Package} title="Cadastro de Contêineres" />
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 p-6">
              <FormSkeleton fields={3} />
            </Card>
            <Card className="lg:col-span-2 p-6">
              <CardGridSkeleton count={6} />
            </Card>
          </div>
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Carregando contêineres..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatedTransition variant="fade">
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-gray-900 mb-2">Cadastro de Contêineres</h1>
            <p className="text-gray-600">Gerencie os contêineres e locais de armazenamento</p>
          </div>

        <Tabs defaultValue="cadastro" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="cadastro" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Cadastro
            </TabsTrigger>
            <TabsTrigger value="mapa" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              Mapa Visual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cadastro" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-4">
              <h2 className="text-gray-900 mb-6">
                {editingId ? 'Editar Contêiner' : 'Novo Contêiner'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <FieldWithHelp
                  label="Nome do Contêiner"
                  help="Identificador único do contêiner, ex: 'GSILVA - WSCU 7032937' ou 'C-001'"
                  required
                  type="info"
                >
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: C-001"
                    className="mt-1.5"
                    disabled={isSaving}
                    required
                  />
                </FieldWithHelp>

                <FieldWithHelp
                  label="Localização"
                  help="Onde o contêiner está fisicamente localizado, ex: 'Galpão A - Setor 1'"
                  required
                  type="info"
                >
                  <Input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Galpão A - Setor 1"
                    className="mt-1.5"
                    disabled={isSaving}
                    required
                  />
                </FieldWithHelp>

                <FieldWithHelp
                  label="Setor"
                  help="Área ou setor onde o contêiner está localizado, ex: 'Setor A', 'Zona 1'"
                  type="info"
                >
                  <Input
                    id="sector"
                    type="text"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    placeholder="Ex: Setor A"
                    className="mt-1.5"
                    disabled={isSaving}
                  />
                </FieldWithHelp>

                <FieldWithHelp
                  label="Capacidade (pneus)"
                  help="Número máximo de pneus que o contêiner pode armazenar. Deixe 0 para ilimitado."
                  type="tip"
                >
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="Ex: 200"
                    className="mt-1.5"
                    disabled={isSaving}
                    min="0"
                  />
                </FieldWithHelp>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-[#D50000] hover:bg-[#B00000] text-white"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : editingId ? (
                      <>
                        <Edit2 size={16} className="mr-2" />
                        Atualizar
                      </>
                    ) : (
                      <>
                        <Plus size={16} className="mr-2" />
                        Adicionar
                      </>
                    )}
                  </Button>
                  {editingId && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-900">Contêineres Cadastrados</h3>
                    <p className="text-gray-600 text-sm">{containers.length} contêineres no sistema</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Registros por página:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                      <SelectTrigger className="w-24">
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

              <div className="grid gap-4 p-6">
                {containers.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <Package size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Nenhum contêiner cadastrado</p>
                  </div>
                ) : (
                  containers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((container) => {
                    const capacity = container.capacity || 0;
                    const current = container.current_stock || 0; // Usa current_stock da coluna real do banco
                    const percentage = capacity > 0 ? (current / capacity) * 100 : 0;

                    return (
                      <div key={container.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-gray-900">{container.name}</h4>
                              <Badge
                                variant="secondary"
                                className={`
                                  ${percentage > 80 ? 'bg-red-100 text-red-700' :
                                    percentage > 50 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'}
                                `}
                              >
                                {current}/{capacity || '∞'}
                              </Badge>
                            </div>
                            <p className="text-gray-600 text-sm">{container.location}</p>
                            {container.sector && (
                              <p className="text-gray-500 text-xs mt-0.5">Setor: {container.sector}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(container)}
                              className="p-2 text-gray-400 hover:text-[#D50000] transition-colors rounded-lg hover:bg-gray-100"
                              title="Editar contêiner"
                              aria-label={`Editar contêiner ${container.name}`}
                            >
                              <Edit2 size={18} aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => handleDelete(container.id, container.name)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
                              title="Excluir contêiner"
                              aria-label={`Excluir contêiner ${container.name}`}
                            >
                              <Trash2 size={18} aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {capacity > 0 && (
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                percentage > 80 ? 'bg-red-500' : 
                                percentage > 50 ? 'bg-yellow-500' : 
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {containers.length > 0 && (
                <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, containers.length)} de {containers.length} registros
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      aria-label="Página anterior"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {currentPage} de {Math.ceil(containers.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(containers.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(containers.length / itemsPerPage)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      aria-label="Próxima página"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="mapa" className="space-y-6">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ContainerGridMap 
                columns={4}
                refreshInterval={30000}
                onContainerClick={(container) => {
                  console.log('Container clicado:', container);
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </AnimatedTransition>
  );
}
