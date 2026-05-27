import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Database, RefreshCw, Check, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { getTireModels, saveTireModel, updateTireModel, deleteTireModel, type TireModel } from '../utils/storage';
import { FormSkeleton, CardGridSkeleton } from './LoadingSkeleton';
import { LoadingSpinner, ButtonLoading } from './LoadingSpinner';
import { PageHeader } from './PageHeader';
import { Card } from './ui/card';
import { AnimatedTransition } from './AnimatedTransition';
import { HelpTooltip, FieldWithHelp } from './HelpTooltip';

const tireTypes = [
  'Slick',
  'Wet',
];

export function TireModelRegistration() {
  const [models, setModels] = useState<TireModel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega modelos do Supabase na montagem
  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      const m = await getTireModels();
      setModels(m);
      
      if (m.length === 0) {
        toast.info('Nenhum modelo cadastrado', {
          description: 'Execute SETUP_DATABASE.sql para criar os modelos padrão'
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar modelos:', error);
      toast.error('Erro ao carregar modelos', {
        description: error.message || 'Verifique sua conexão'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset página quando modelos mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [models.length, itemsPerPage]);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: '',
    protheus_code: '',
    cai: '', // Código CAI para RFID
    price_by_year: {} as Record<string, number>,
    sale_price_by_year: {} as Record<string, number>, // Novo campo para preços de venda
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Estados para gerenciar preços por ano
  const [yearInput, setYearInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [salePriceInput, setSalePriceInput] = useState(''); // Novo campo para preço de venda

  // Estados para edição de preços existentes
  const [editingYear, setEditingYear] = useState<string | null>(null);
  const [editPriceInput, setEditPriceInput] = useState('');
  const [editSalePriceInput, setEditSalePriceInput] = useState('');

  // Adicionar preço para um ano
  const handleAddYearPrice = () => {
    if (!yearInput || !priceInput) {
      toast.error('Preencha ano e preço de compra', {
        description: 'Informe o ano e o valor em euros'
      });
      return;
    }

    const year = yearInput.trim();
    const price = parseFloat(priceInput);
    const salePrice = salePriceInput ? parseFloat(salePriceInput) : undefined;

    if (isNaN(price) || price <= 0) {
      toast.error('Preço de compra inválido', {
        description: 'O preço deve ser um número positivo'
      });
      return;
    }

    if (salePrice !== undefined && (isNaN(salePrice) || salePrice <= 0)) {
      toast.error('Preço de venda inválido', {
        description: 'O preço de venda deve ser um número positivo'
      });
      return;
    }

    const newFormData = {
      ...formData,
      price_by_year: {
        ...formData.price_by_year,
        [year]: price
      }
    };

    // Adiciona preço de venda apenas se foi informado
    if (salePrice !== undefined) {
      newFormData.sale_price_by_year = {
        ...formData.sale_price_by_year,
        [year]: salePrice
      };
    }

    setFormData(newFormData);

    setYearInput('');
    setPriceInput('');
    setSalePriceInput('');
    
    toast.success('Preços adicionados!', {
      description: `Compra: €${price.toFixed(2)} ${salePrice ? `| Venda: R$${salePrice.toFixed(2)}` : ''} (${year})`
    });
  };

  // Remover preço de um ano
  const handleRemoveYearPrice = (year: string) => {
    const newPrices = { ...formData.price_by_year };
    const newSalePrices = { ...formData.sale_price_by_year };
    delete newPrices[year];
    delete newSalePrices[year];
    setFormData({
      ...formData,
      price_by_year: newPrices,
      sale_price_by_year: newSalePrices
    });
    
    toast.success('Preços removidos!', {
      description: `Ano ${year} removido`
    });
  };

  // Iniciar edição de um preço existente
  const handleStartEditPrice = (year: string) => {
    setEditingYear(year);
    setEditPriceInput(formData.price_by_year[year]?.toString() || '');
    setEditSalePriceInput(formData.sale_price_by_year[year]?.toString() || '');
  };

  // Cancelar edição de preço
  const handleCancelEditPrice = () => {
    setEditingYear(null);
    setEditPriceInput('');
    setEditSalePriceInput('');
  };

  // Salvar edição de preço
  const handleSaveEditPrice = () => {
    if (!editingYear || !editPriceInput) {
      toast.error('Preço de compra obrigatório', {
        description: 'Informe o valor em euros'
      });
      return;
    }

    const price = parseFloat(editPriceInput);
    const salePrice = editSalePriceInput ? parseFloat(editSalePriceInput) : undefined;

    if (isNaN(price) || price <= 0) {
      toast.error('Preço de compra inválido', {
        description: 'O preço deve ser um número positivo'
      });
      return;
    }

    if (salePrice !== undefined && (isNaN(salePrice) || salePrice <= 0)) {
      toast.error('Preço de venda inválido', {
        description: 'O preço de venda deve ser um número positivo'
      });
      return;
    }

    const newFormData = {
      ...formData,
      price_by_year: {
        ...formData.price_by_year,
        [editingYear]: price
      }
    };

    // Atualiza ou remove preço de venda
    if (salePrice !== undefined) {
      newFormData.sale_price_by_year = {
        ...formData.sale_price_by_year,
        [editingYear]: salePrice
      };
    } else {
      // Se o campo estiver vazio, remove o preço de venda deste ano
      const newSalePrices = { ...formData.sale_price_by_year };
      delete newSalePrices[editingYear];
      newFormData.sale_price_by_year = newSalePrices;
    }

    setFormData(newFormData);
    setEditingYear(null);
    setEditPriceInput('');
    setEditSalePriceInput('');
    
    toast.success('Preços atualizados!', {
      description: `Compra: €${price.toFixed(2)} ${salePrice ? `| Venda: R$${salePrice.toFixed(2)}` : ''} (${editingYear})`
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type) {
      toast.error('Campos obrigatórios', {
        description: 'Preencha nome e tipo do modelo'
      });
      return;
    }

    try {
      const modelData: any = {
        name: formData.name,
        code: formData.code,
        type: formData.type,
        protheus_code: formData.protheus_code,
        cai: formData.cai, // Código CAI para RFID
        price_by_year: formData.price_by_year,
        sale_price_by_year: formData.sale_price_by_year, // Inclui o novo campo
      };

      if (editingId) {
        await updateTireModel(editingId, modelData);
        toast.success('Modelo atualizado!', {
          description: `${formData.name} foi atualizado com sucesso`
        });
        setEditingId(null);
      } else {
        await saveTireModel(modelData);
        toast.success('Modelo cadastrado!', {
          description: `${formData.name} foi adicionado ao sistema`
        });
      }

      // Recarregar models
      await loadModels();
      setFormData({ name: '', code: '', type: '', protheus_code: '', cai: '', price_by_year: {} as Record<string, number>, sale_price_by_year: {} as Record<string, number> });
    } catch (error: any) {
      console.error('Erro ao salvar modelo:', error);
      toast.error('Erro ao salvar modelo', {
        description: error.message || 'Tente novamente'
      });
    }
  };

  const handleEdit = (model: TireModel) => {
    setFormData({
      name: model.name,
      code: model.code || '',
      type: model.type,
      protheus_code: model.protheus_code || '',
      cai: model.cai || '',
      price_by_year: model.price_by_year || {},
      sale_price_by_year: model.sale_price_by_year || {}, // Inclui o novo campo
    });
    setEditingId(model.id);
  };

  const handleDelete = async (id: string) => {
    const model = models.find(m => m.id === id);
    
    if (!confirm(`Deseja realmente excluir o modelo "${model?.name}"?`)) {
      return;
    }

    try {
      await deleteTireModel(id);
      toast.success('Modelo excluído!', {
        description: `${model?.name} foi removido do sistema`
      });
      
      // Recarregar models
      await loadModels();
    } catch (error: any) {
      console.error('Erro ao deletar modelo:', error);
      toast.error('Erro ao excluir modelo', {
        description: error.message || 'Este modelo pode estar em uso'
      });
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', code: '', type: '', protheus_code: '', cai: '', price_by_year: {} as Record<string, number>, sale_price_by_year: {} as Record<string, number> });
    setEditingId(null);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <PageHeader icon={Database} title="Cadastro de Modelos de Pneus" />
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 p-6">
              <FormSkeleton fields={3} />
            </Card>
            <Card className="lg:col-span-2 p-6">
              <CardGridSkeleton count={6} />
            </Card>
          </div>
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Carregando modelos..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatedTransition variant="fade">
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-gray-900 mb-2">Cadastro de Modelos de Pneus</h1>
              <p className="text-gray-500 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Integrado com Supabase (tabela: tire_models)
              </p>
            </div>
          
            <Button
              variant="outline"
              size="sm"
              onClick={loadModels}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-4">
                <h2 className="text-gray-900 mb-6">
                  {editingId ? 'Editar Modelo' : 'Novo Modelo'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <FieldWithHelp
                    label="Nome do Modelo"
                    help="Nome descritivo do modelo de pneu, ex: '30/65-18 N3' ou 'Slick Seco P1'"
                    required
                    type="info"
                  >
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Slick Seco P1"
                      className="mt-1.5"
                      required
                    />
                  </FieldWithHelp>

                  <FieldWithHelp
                    label="Código Interno"
                    help="Código curto para identificação rápida, será usado na importação de planilhas"
                    type="tip"
                  >
                    <Input
                      id="code"
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="Ex: SLP1"
                      className="mt-1.5"
                    />
                  </FieldWithHelp>

                  <FieldWithHelp
                    label="Tipo de Pneu"
                    help="Slick para pista seca ou Wet para pista molhada"
                    required
                    type="info"
                  >
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tireTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldWithHelp>

                  <FieldWithHelp
                    label="Código do Protheus"
                    help="Código de integração com o sistema Protheus"
                    type="tip"
                  >
                    <Input
                      id="protheus_code"
                      type="text"
                      value={formData.protheus_code}
                      onChange={(e) => setFormData({ ...formData, protheus_code: e.target.value })}
                      placeholder="Ex: 0001-001"
                      className="mt-1.5"
                    />
                  </FieldWithHelp>

                  <FieldWithHelp
                    label="Código CAI (RFID)"
                    help="Código CAI para identificação via RFID. Exemplo: 530030 para 30/65-18 N3"
                    type="tip"
                  >
                    <Input
                      id="cai"
                      type="text"
                      value={formData.cai}
                      onChange={(e) => setFormData({ ...formData, cai: e.target.value })}
                      placeholder="Ex: 530030"
                      className="mt-1.5"
                      maxLength={6}
                    />
                  </FieldWithHelp>

                  {/* Seção de Preços por Ano */}
                  <div className="border-t border-gray-200 pt-4 mt-6">
                    <FieldWithHelp
                      label="Preços por Ano"
                      help="Adicione os preços para cada ano. Preço de Compra em euros (€) e Preço de Venda em reais (R$)."
                      type="info"
                    >
                      <div className="space-y-3 mt-2">
                        {/* Lista de preços cadastrados */}
                        {Object.keys(formData.price_by_year).length > 0 && (
                          <div className="space-y-2 mb-3">
                            {Object.entries(formData.price_by_year)
                              .sort(([yearA], [yearB]) => yearB.localeCompare(yearA))
                              .map(([year, price]) => {
                                const salePrice = formData.sale_price_by_year[year];
                                const isEditing = editingYear === year;
                                
                                return (
                                  <div key={year} className="bg-gray-50 p-2 rounded-lg">
                                    {isEditing ? (
                                      /* Modo de Edição */
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between mb-1">
                                          <Badge variant="outline" className="font-mono">
                                            {year}
                                          </Badge>
                                          <div className="flex gap-1">
                                            <button
                                              type="button"
                                              onClick={handleSaveEditPrice}
                                              className="text-green-600 hover:text-green-700 p-1 text-xs font-medium"
                                              title="Salvar"
                                            >
                                              Salvar
                                            </button>
                                            <button
                                              type="button"
                                              onClick={handleCancelEditPrice}
                                              className="text-gray-500 hover:text-gray-700 p-1 text-xs"
                                              title="Cancelar"
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="Compra (€)"
                                            value={editPriceInput}
                                            onChange={(e) => setEditPriceInput(e.target.value)}
                                            className="text-sm h-8"
                                            autoFocus
                                          />
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="Venda (R$)"
                                            value={editSalePriceInput}
                                            onChange={(e) => setEditSalePriceInput(e.target.value)}
                                            className="text-sm h-8"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      /* Modo de Visualização */
                                      <>
                                        <div className="flex items-center justify-between mb-1">
                                          <Badge variant="outline" className="font-mono">
                                            {year}
                                          </Badge>
                                          <div className="flex gap-1">
                                            <button
                                              type="button"
                                              onClick={() => handleStartEditPrice(year)}
                                              className="text-blue-500 hover:text-blue-700 p-1"
                                              aria-label={`Editar preços de ${year}`}
                                              title="Editar preços"
                                            >
                                              <Edit2 size={14} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveYearPrice(year)}
                                              className="text-red-500 hover:text-red-700 p-1"
                                              aria-label={`Remover preços de ${year}`}
                                              title="Remover"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs pl-2">
                                          <div className="flex items-center gap-1">
                                            <span className="text-gray-600">Compra:</span>
                                            <span className="font-medium text-green-700">
                                              €{price.toFixed(2)}
                                            </span>
                                          </div>
                                          {salePrice && (
                                            <div className="flex items-center gap-1">
                                              <span className="text-gray-600">Venda:</span>
                                              <span className="font-medium text-blue-700">
                                                R${salePrice.toFixed(2)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}

                        {/* Formulário para adicionar novo preço */}
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              placeholder="Ano"
                              value={yearInput}
                              onChange={(e) => setYearInput(e.target.value)}
                              className="w-20"
                            />
                            <div className="flex-1 space-y-1">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Compra (€)"
                                value={priceInput}
                                onChange={(e) => setPriceInput(e.target.value)}
                              />
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Venda (R$)"
                                value={salePriceInput}
                                onChange={(e) => setSalePriceInput(e.target.value)}
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={handleAddYearPrice}
                              variant="outline"
                              size="sm"
                              className="px-3 self-start"
                            >
                              <Plus size={16} />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 pl-1">
                            💶 Compra em euros | 💵 Venda em reais
                          </p>
                        </div>
                      </div>
                    </FieldWithHelp>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      className="flex-1 bg-[#D50000] hover:bg-[#B00000] text-white"
                    >
                      {editingId ? (
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
                      <h3 className="text-gray-900">Modelos Cadastrados</h3>
                      <p className="text-gray-500 text-sm">{models.length} modelos no sistema</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Registros por página:</span>
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

                <div className="divide-y divide-gray-200">
                  {isLoading ? (
                    <div className="p-12 text-center text-gray-400">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#D50000]" />
                      <p>Carregando modelos...</p>
                    </div>
                  ) : models.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                      <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="mb-2">Nenhum modelo cadastrado</p>
                      <p className="text-xs">Execute SETUP_DATABASE.sql para criar os modelos padrão</p>
                    </div>
                  ) : (
                    models.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((model) => (
                      <div key={model.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-gray-900">{model.name}</h4>
                              {model.code && (
                                <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  {model.code}
                                </code>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                                {model.type}
                              </Badge>
                              {model.protheus_code && (
                                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                                  Protheus: {model.protheus_code}
                                </Badge>
                              )}
                              {model.cai && (
                                <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">
                                  📡 CAI: {model.cai}
                                </Badge>
                              )}
                              {model.price_by_year && Object.keys(model.price_by_year).length > 0 && (() => {
                                // Pega apenas o ano mais recente
                                const mostRecentYear = Object.keys(model.price_by_year).sort((a, b) => b.localeCompare(a))[0];
                                const price = model.price_by_year[mostRecentYear];
                                return (
                                  <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
                                    {mostRecentYear}: €{price.toFixed(2)}
                                  </Badge>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(model)}
                              className="p-2 text-gray-400 hover:text-[#D50000] transition-colors rounded-lg hover:bg-gray-100"
                              aria-label={`Editar modelo ${model.name}`}
                            >
                              <Edit2 size={18} aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => handleDelete(model.id)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
                              aria-label={`Excluir modelo ${model.name}`}
                            >
                              <Trash2 size={18} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {models.length > 0 && (
                  <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, models.length)} de {models.length} registros
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
                        Página {currentPage} de {Math.ceil(models.length / itemsPerPage)}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(models.length / itemsPerPage), prev + 1))}
                        disabled={currentPage === Math.ceil(models.length / itemsPerPage)}
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
        </div>
      </div>
    </AnimatedTransition>
  );
}