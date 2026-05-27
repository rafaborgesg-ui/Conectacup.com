import { X, Save, Layers } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getGeracoes, type Geracao } from '../utils/geracaoStorage';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CategoryFormData) => void;
  categories: string[];
  carModels: string[];
  tireModels: TireModel[];
  editingCategory?: CategoryFormData & { id: string } | null;
}

interface TireModel {
  id: string;
  name: string;
  code: string;
  type: string;
}

export interface CategoryFormData {
  categoryName: string;
  carModel: string;
  categoryType: 'geral' | 'trophy';
  selectedTires: {
    slick: string[];
    wet: string[];
  };
}

export function CategoryModal({ isOpen, onClose, onSave, categories, carModels, tireModels, editingCategory }: CategoryModalProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    categoryName: '',
    carModel: '',
    categoryType: 'geral',
    selectedTires: {
      slick: [],
      wet: [],
    },
  });

  const [geracoes, setGeracoes] = useState<Geracao[]>([]);

  // Carregar gerações quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      loadGeracoes();
    }
  }, [isOpen]);

  const loadGeracoes = async () => {
    try {
      const data = await getGeracoes();
      setGeracoes(data);
    } catch (error) {
      console.error('Erro ao carregar gerações:', error);
    }
  };

  // Atualiza o formulário quando editingCategory mudar
  useEffect(() => {
    if (editingCategory) {
      setFormData({
        categoryName: editingCategory.categoryName,
        carModel: editingCategory.carModel,
        categoryType: editingCategory.categoryType,
        selectedTires: editingCategory.selectedTires,
      });
    } else {
      setFormData({
        categoryName: '',
        carModel: '',
        categoryType: 'geral',
        selectedTires: {
          slick: [],
          wet: [],
        },
      });
    }
  }, [editingCategory]);

  // Effect para atualizar quando o modal abrir com dados de edição
  useEffect(() => {
    if (isOpen && editingCategory) {
      setFormData({
        categoryName: editingCategory.categoryName,
        carModel: editingCategory.carModel,
        categoryType: editingCategory.categoryType,
        selectedTires: editingCategory.selectedTires,
      });
    } else if (isOpen && !editingCategory) {
      setFormData({
        categoryName: '',
        carModel: '',
        categoryType: 'geral',
        selectedTires: {
          slick: [],
          wet: [],
        },
      });
    }
  }, [isOpen, editingCategory]);

  // Separa os pneus por tipo
  const slickTires = tireModels.filter(t => t.type?.toUpperCase() === 'SLICK');
  const wetTires = tireModels.filter(t => t.type?.toUpperCase() === 'WET');

  const handleTireToggle = (tireId: string, tireType: 'slick' | 'wet') => {
    const currentSelection = formData.selectedTires[tireType];
    const isSelected = currentSelection.includes(tireId);
    
    let newSelection: string[];
    
    if (isSelected) {
      // Remove o pneu se já estiver selecionado
      newSelection = currentSelection.filter(id => id !== tireId);
    } else {
      // Adiciona apenas se não tiver atingido o limite de 2
      if (currentSelection.length < 2) {
        newSelection = [...currentSelection, tireId];
      } else {
        return; // Não faz nada se já tiver 2 selecionados
      }
    }
    
    setFormData({
      ...formData,
      selectedTires: {
        ...formData.selectedTires,
        [tireType]: newSelection,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    // Reset form
    setFormData({
      categoryName: '',
      carModel: '',
      categoryType: 'geral',
      selectedTires: {
        slick: [],
        wet: [],
      },
    });
    onClose();
  };

  // Valida se foram selecionados exatamente 2 slick e 2 wet
  const isFormValid = 
    formData.categoryName && 
    formData.carModel && 
    formData.selectedTires.slick.length === 2 && 
    formData.selectedTires.wet.length === 2;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="px-6 py-5 border-b flex items-center justify-between rounded-t-2xl sticky top-0 z-10"
          style={{
            background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
            borderColor: '#333333'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Layers size={20} strokeWidth={2} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <p className="text-sm text-gray-300">Configure uma nova categoria de competição</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Grid de 2 colunas - Categoria e Modelo */}
            <div className="grid grid-cols-2 gap-4">
              {/* Nome da Categoria */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Categoria *
                </label>
                <select
                  required
                  value={formData.categoryName}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border transition-all outline-none"
                  style={{
                    borderColor: '#E5E7EB',
                    background: '#F9FAFB'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#000000';
                    e.currentTarget.style.background = '#FFFFFF';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.background = '#F9FAFB';
                  }}
                >
                  <option value="">Selecione...</option>
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))
                  ) : (
                    <option disabled>Nenhuma categoria cadastrada no Master Data</option>
                  )}
                </select>
              </div>

              {/* Modelo de Carro */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Geração do Carro *
                </label>
                <select
                  required
                  value={formData.carModel}
                  onChange={(e) => setFormData({ ...formData, carModel: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border transition-all outline-none"
                  style={{
                    borderColor: '#E5E7EB',
                    background: '#F9FAFB'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#000000';
                    e.currentTarget.style.background = '#FFFFFF';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.background = '#F9FAFB';
                  }}
                >
                  <option value="">Selecione...</option>
                  {geracoes.length > 0 ? (
                    geracoes.map((geracao) => (
                      <option key={geracao.id} value={geracao.codigo}>{geracao.codigo}</option>
                    ))
                  ) : (
                    <option disabled>Nenhuma geração cadastrada no Master Data</option>
                  )}
                </select>
              </div>
            </div>

            {/* Tipo de Categoria */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Tipo de Categoria *
              </label>
              <select
                required
                value={formData.categoryType}
                onChange={(e) => setFormData({ ...formData, categoryType: e.target.value as 'geral' | 'trophy' })}
                className="w-full px-4 py-2.5 rounded-lg border transition-all outline-none"
                style={{
                  borderColor: '#E5E7EB',
                  background: '#F9FAFB'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#000000';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.background = '#F9FAFB';
                }}
              >
                <option value="geral">Geral - Participa da Pré Temporada, Sprint e Endurance</option>
                <option value="trophy">Trophy - Exclusiva para competições Trophy</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                {formData.categoryType === 'geral' 
                  ? '✓ Esta categoria participará de todas as etapas: Pré Temporada, Sprint e Endurance' 
                  : '✓ Esta categoria é exclusiva para competições Trophy'}
              </p>
            </div>

            {/* Pneus SLICK */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-900">
                  Pneus SLICK (Seco) *
                </label>
                <span 
                  className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{
                    background: formData.selectedTires.slick.length === 2 ? '#D1FAE5' : '#FEF3C7',
                    color: formData.selectedTires.slick.length === 2 ? '#065F46' : '#92400E',
                  }}
                >
                  {formData.selectedTires.slick.length}/2 selecionados
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {slickTires.length > 0 ? (
                  slickTires.map((tire) => {
                    const isSelected = formData.selectedTires.slick.includes(tire.id);
                    const isDisabled = !isSelected && formData.selectedTires.slick.length >= 2;
                    
                    return (
                      <button
                        key={tire.id}
                        type="button"
                        onClick={() => !isDisabled && handleTireToggle(tire.id, 'slick')}
                        disabled={isDisabled}
                        className="px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm text-left"
                        style={{
                          borderColor: isSelected ? '#000000' : '#E5E7EB',
                          background: isSelected ? '#000000' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : '#374151',
                          opacity: isDisabled ? 0.5 : 1,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                            style={{
                              borderColor: isSelected ? '#FFFFFF' : '#D1D5DB',
                              background: isSelected ? '#FFFFFF' : 'transparent',
                            }}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-sm" style={{ background: '#000000' }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{tire.name}</div>
                            {tire.code && (
                              <div className="text-xs opacity-70 truncate">{tire.code}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-3 text-center py-8 text-gray-500">
                    Nenhum pneu SLICK cadastrado em "Cadastro de Modelos"
                  </div>
                )}
              </div>
            </div>

            {/* Pneus WET (Chuva) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-900">
                  Pneus WET (Chuva) *
                </label>
                <span 
                  className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{
                    background: formData.selectedTires.wet.length === 2 ? '#D1FAE5' : '#FEF3C7',
                    color: formData.selectedTires.wet.length === 2 ? '#065F46' : '#92400E',
                  }}
                >
                  {formData.selectedTires.wet.length}/2 selecionados
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {wetTires.length > 0 ? (
                  wetTires.map((tire) => {
                    const isSelected = formData.selectedTires.wet.includes(tire.id);
                    const isDisabled = !isSelected && formData.selectedTires.wet.length >= 2;
                    
                    return (
                      <button
                        key={tire.id}
                        type="button"
                        onClick={() => !isDisabled && handleTireToggle(tire.id, 'wet')}
                        disabled={isDisabled}
                        className="px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm text-left"
                        style={{
                          borderColor: isSelected ? '#000000' : '#E5E7EB',
                          background: isSelected ? '#000000' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : '#374151',
                          opacity: isDisabled ? 0.5 : 1,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                            style={{
                              borderColor: isSelected ? '#FFFFFF' : '#D1D5DB',
                              background: isSelected ? '#FFFFFF' : 'transparent',
                            }}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-sm" style={{ background: '#000000' }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{tire.name}</div>
                            {tire.code && (
                              <div className="text-xs opacity-70 truncate">{tire.code}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-3 text-center py-8 text-gray-500">
                    Nenhum pneu WET cadastrado em "Cadastro de Modelos"
                  </div>
                )}
              </div>
            </div>

            {/* Mensagem de validação */}
            {(!isFormValid && (formData.categoryName || formData.carModel)) && (
              <div 
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
                style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                }}
              >
                <span className="font-medium">⚠️</span>
                <span>Selecione exatamente 2 pneus SLICK e 2 pneus WET para continuar.</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div 
            className="px-6 py-4 border-t flex items-center justify-end gap-3 rounded-b-2xl sticky bottom-0"
            style={{
              background: '#F9FAFB',
              borderColor: '#E5E7EB'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border-2 font-semibold transition-all"
              style={{
                borderColor: '#E5E7EB',
                color: '#374151',
                background: '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFFFF';
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: '#000000',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.background = '#1a1a1a';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#000000';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
              }}
            >
              <Save size={18} strokeWidth={2} />
              Salvar Categoria
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}