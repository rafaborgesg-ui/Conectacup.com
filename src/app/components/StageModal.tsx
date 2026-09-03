import { X, Save, Flag, Trophy, Layers, Users } from 'lucide-react';
import { useState, useEffect } from 'react';

interface StageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: StageFormData) => void;
  pistas: string[];
  availableChampionships: Array<{
    id: string;
    name: string;
    active: boolean;
  }>;
  availableCategories: string[]; // Categorias disponíveis (Carrera, Challenge, Trophy)
  hasTrophy: boolean;
  editingStage?: StageFormData | null;
}

export interface CategoryWithCarCount {
  name: string;
  car_count: number;
}

export interface StageFormData {
  id: string;
  name: string;
  track: string;
  startDate: string;
  endDate: string;
  mainChampionship: string;
  enduranceType?: 'endurance_300' | 'endurance_500'; // Tipo de endurance (300km ou 500km)
  includeTrophy: boolean;
  categories?: CategoryWithCarCount[]; // Categorias com quantidade de carros
}

export function StageModal({ isOpen, onClose, onSave, pistas, availableChampionships, availableCategories, hasTrophy, editingStage }: StageModalProps) {
  const [formData, setFormData] = useState<StageFormData>({
    id: '',
    name: '',
    track: '',
    startDate: '',
    endDate: '',
    mainChampionship: '',
    includeTrophy: false,
    categories: [],
  });

  useEffect(() => {
    if (isOpen && editingStage) {
      // Modo edição - carrega dados da etapa
      setFormData(editingStage);
    } else if (!isOpen) {
      // Reset quando fecha
      setFormData({
        id: '',
        name: '',
        track: '',
        startDate: '',
        endDate: '',
        mainChampionship: '',
        includeTrophy: false,
        categories: [],
      });
    }
  }, [isOpen, editingStage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Gera um ID único se não existir
    if (!formData.id) {
      formData.id = `stage_${Date.now()}`;
    }
    
    onSave(formData);
    onClose();
  };

  // Helper functions para gerenciar categorias
  const isCategorySelected = (categoryName: string) => {
    return formData.categories?.some(cat => cat.name === categoryName) || false;
  };

  const getCategoryCarCount = (categoryName: string) => {
    const category = formData.categories?.find(cat => cat.name === categoryName);
    return category?.car_count || 0;
  };

  const toggleCategory = (categoryName: string) => {
    const currentCategories = formData.categories || [];
    
    if (isCategorySelected(categoryName)) {
      // Remove categoria
      setFormData({
        ...formData,
        categories: currentCategories.filter(cat => cat.name !== categoryName)
      });
    } else {
      // Adiciona categoria com car_count padrão
      setFormData({
        ...formData,
        categories: [...currentCategories, { name: categoryName, car_count: 0 }]
      });
    }
  };

  const updateCarCount = (categoryName: string, carCount: number) => {
    const currentCategories = formData.categories || [];
    setFormData({
      ...formData,
      categories: currentCategories.map(cat =>
        cat.name === categoryName ? { ...cat, car_count: carCount } : cat
      )
    });
  };

  if (!isOpen) return null;

  const activeChampionships = availableChampionships.filter(c => c.active && c.id !== 'trophy');

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-2xl flex flex-col rounded-2xl shadow-2xl"
        style={{ 
          background: '#FFFFFF',
          maxHeight: '90vh'
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div 
          className="px-6 py-5 border-b flex items-center justify-between rounded-t-2xl flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
            borderColor: '#A00000'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
              }}
            >
              <Flag size={20} strokeWidth={2} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {editingStage ? 'Editar Etapa' : 'Nova Etapa'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(255, 255, 255, 0.15)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }}
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Grid de 2 colunas - Nome e Pista */}
            <div className="grid grid-cols-2 gap-4">
              {/* Nome da Etapa */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Número/Nome da Etapa
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Etapa 1"
                  className="w-full px-4 py-2.5 rounded-lg border transition-all outline-none"
                  style={{
                    borderColor: '#E5E7EB',
                    background: '#F9FAFB'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#D50000';
                    e.currentTarget.style.background = '#FFFFFF';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.background = '#F9FAFB';
                  }}
                />
              </div>

              {/* Pista */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Pista
                </label>
                <select
                  required
                  value={formData.track}
                  onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border transition-all outline-none"
                  style={{
                    borderColor: '#E5E7EB',
                    background: '#F9FAFB'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#D50000';
                    e.currentTarget.style.background = '#FFFFFF';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.background = '#F9FAFB';
                  }}
                >
                  <option value="">Selecione...</option>
                  {pistas.length === 0 && (
                    <option disabled>Nenhuma pista cadastrada</option>
                  )}
                  {pistas.map((pista) => (
                    <option key={pista} value={pista}>
                      {pista}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid de 2 colunas - Datas */}
            <div className="grid grid-cols-2 gap-4">
              {/* Data de Início */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Data de Início <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border transition-all outline-none"
                  style={{
                    borderColor: '#E5E7EB',
                    background: '#F9FAFB'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#D50000';
                    e.currentTarget.style.background = '#FFFFFF';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.background = '#F9FAFB';
                  }}
                />
              </div>

              {/* Data de Fim */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Data de Fim <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate}
                  className="w-full px-4 py-2.5 rounded-lg border transition-all outline-none"
                  style={{
                    borderColor: '#E5E7EB',
                    background: '#F9FAFB'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#D50000';
                    e.currentTarget.style.background = '#FFFFFF';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.background = '#F9FAFB';
                  }}
                />
              </div>
            </div>

            {/* Campeonato Principal */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Campeonato Principal
              </label>
              <select
                required
                value={formData.mainChampionship}
                onChange={(e) => {
                  const newChampionship = e.target.value;
                  setFormData({ 
                    ...formData, 
                    mainChampionship: newChampionship,
                    // Limpa o tipo de endurance se mudar para outro campeonato
                    enduranceType: newChampionship === 'endurance' ? formData.enduranceType : undefined
                  });
                }}
                className="w-full px-4 py-2.5 rounded-lg border transition-all outline-none"
                style={{
                  borderColor: '#E5E7EB',
                  background: '#F9FAFB'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#D50000';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.background = '#F9FAFB';
                }}
              >
                <option value="">Selecione...</option>
                {activeChampionships.length === 0 && (
                  <option disabled>Nenhum campeonato ativo</option>
                )}
                {activeChampionships.map((championship) => (
                  <option key={championship.id} value={championship.id}>
                    {championship.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de Endurance - Aparece apenas se Endurance for selecionado */}
            {formData.mainChampionship === 'endurance' && (
              <div 
                className="rounded-lg border p-4"
                style={{
                  background: '#FFF7ED',
                  borderColor: '#FB923C',
                }}
              >
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Tipo de Corrida Endurance <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Endurance 300km */}
                  <label 
                    className="flex items-center gap-3 cursor-pointer p-4 rounded-lg transition-all border-2"
                    style={{
                      background: formData.enduranceType === 'endurance_300' ? '#FFEDD5' : '#FFFFFF',
                      borderColor: formData.enduranceType === 'endurance_300' ? '#FB923C' : '#E5E7EB',
                    }}
                    onMouseEnter={(e) => {
                      if (formData.enduranceType !== 'endurance_300') {
                        e.currentTarget.style.background = '#F9FAFB';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.enduranceType !== 'endurance_300') {
                        e.currentTarget.style.background = '#FFFFFF';
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name="enduranceType"
                      value="endurance_300"
                      checked={formData.enduranceType === 'endurance_300'}
                      onChange={(e) => setFormData({ ...formData, enduranceType: e.target.value as 'endurance_300' })}
                      className="w-5 h-5 cursor-pointer"
                      style={{ accentColor: '#FB923C' }}
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">Endurance 300km</div>
                      <div className="text-xs text-gray-600 mt-0.5">Corrida de resistência 300km</div>
                    </div>
                  </label>

                  {/* Endurance 500km */}
                  <label 
                    className="flex items-center gap-3 cursor-pointer p-4 rounded-lg transition-all border-2"
                    style={{
                      background: formData.enduranceType === 'endurance_500' ? '#FFEDD5' : '#FFFFFF',
                      borderColor: formData.enduranceType === 'endurance_500' ? '#FB923C' : '#E5E7EB',
                    }}
                    onMouseEnter={(e) => {
                      if (formData.enduranceType !== 'endurance_500') {
                        e.currentTarget.style.background = '#F9FAFB';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.enduranceType !== 'endurance_500') {
                        e.currentTarget.style.background = '#FFFFFF';
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name="enduranceType"
                      value="endurance_500"
                      checked={formData.enduranceType === 'endurance_500'}
                      onChange={(e) => setFormData({ ...formData, enduranceType: e.target.value as 'endurance_500' })}
                      className="w-5 h-5 cursor-pointer"
                      style={{ accentColor: '#FB923C' }}
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">Endurance 500km</div>
                      <div className="text-xs text-gray-600 mt-0.5">Corrida de resistência 500km</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Seleção de Categorias com Quantidade de Carros */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                <div className="flex items-center gap-2">
                  <Layers size={16} />
                  Categorias e Quantidade de Carros por Categoria
                </div>
              </label>
              <div 
                className="rounded-lg border p-4"
                style={{
                  background: '#F9FAFB',
                  borderColor: '#E5E7EB',
                }}
              >
                {availableCategories.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhuma categoria disponível</p>
                ) : (
                  <div className="space-y-3">
                    {availableCategories.map((category) => {
                      const isSelected = isCategorySelected(category);
                      const carCount = getCategoryCarCount(category);
                      
                      return (
                        <div
                          key={category}
                          className="rounded-lg transition-all border-2"
                          style={{
                            background: isSelected ? '#FEE2E2' : '#FFFFFF',
                            borderColor: isSelected ? '#DC2626' : '#E5E7EB',
                          }}
                        >
                          {/* Checkbox da categoria */}
                          <label 
                            className="flex items-center gap-3 cursor-pointer p-3"
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.parentElement!.style.background = '#F3F4F6';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.parentElement!.style.background = '#FFFFFF';
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCategory(category)}
                              className="w-5 h-5 rounded cursor-pointer"
                              style={{ accentColor: '#DC2626' }}
                            />
                            <span className="font-semibold text-gray-900 flex-1">{category}</span>
                            {isSelected && (
                              <Users size={16} style={{ color: '#DC2626' }} />
                            )}
                          </label>

                          {/* Input de quantidade de carros - aparece apenas se categoria selecionada */}
                          {isSelected && (
                            <div className="px-3 pb-3 pt-0">
                              <div 
                                className="flex items-center gap-3 p-3 rounded-lg border"
                                style={{
                                  background: '#FFFFFF',
                                  borderColor: '#DC2626',
                                }}
                              >
                                <Users size={18} style={{ color: '#DC2626' }} />
                                <div className="flex-1">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Quantidade de carros
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={carCount || ''}
                                    onChange={(e) => updateCarCount(category, parseInt(e.target.value) || 0)}
                                    placeholder="Ex: 32"
                                    className="w-full px-3 py-2 rounded-lg border transition-all outline-none"
                                    style={{
                                      borderColor: '#E5E7EB',
                                      background: '#F9FAFB',
                                    }}
                                    onFocus={(e) => {
                                      e.currentTarget.style.borderColor = '#DC2626';
                                      e.currentTarget.style.background = '#FFFFFF';
                                    }}
                                    onBlur={(e) => {
                                      e.currentTarget.style.borderColor = '#E5E7EB';
                                      e.currentTarget.style.background = '#F9FAFB';
                                    }}
                                  />
                                </div>
                                {carCount > 0 && (
                                  <div 
                                    className="px-3 py-1.5 rounded-lg text-sm font-bold"
                                    style={{
                                      background: '#DCFCE7',
                                      color: '#166534',
                                    }}
                                  >
                                    {carCount}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Selecione as categorias e defina quantos carros participarão desta etapa
              </p>
            </div>

            {/* Incluir Trophy */}
            {hasTrophy && (
              <div 
                className="rounded-lg border p-4"
                style={{
                  background: formData.includeTrophy ? '#FAF5FF' : '#F9FAFB',
                  borderColor: formData.includeTrophy ? '#E9D5FF' : '#E5E7EB',
                }}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.includeTrophy}
                    onChange={(e) => setFormData({ ...formData, includeTrophy: e.target.checked })}
                    className="w-5 h-5 rounded cursor-pointer mt-0.5"
                    style={{ accentColor: '#A855F7' }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy size={16} style={{ color: '#A855F7' }} />
                      <span className="font-semibold text-gray-900">Incluir Trophy nesta etapa</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      O campeonato Trophy será realizado junto com esta etapa
                    </p>
                  </div>
                </label>
              </div>
            )}

            {!hasTrophy && (
              <div 
                className="flex items-start gap-3 px-4 py-3 rounded-lg"
                style={{
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A'
                }}
              >
                <span className="text-lg">ℹ️</span>
                <div className="flex-1 text-sm">
                  <p style={{ color: '#92400E' }}>
                    O campeonato Trophy não está ativo nesta temporada. Ative-o na Etapa 1 para incluí-lo nas etapas.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Fixed */}
          <div 
            className="px-6 py-4 border-t flex items-center justify-end gap-3 rounded-b-2xl flex-shrink-0"
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
              disabled={
                !formData.name || 
                !formData.track || 
                !formData.startDate || 
                !formData.endDate || 
                !formData.mainChampionship ||
                (formData.mainChampionship === 'endurance' && !formData.enduranceType) // Valida tipo de endurance
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(213, 0, 0, 0.25)'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(213, 0, 0, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(213, 0, 0, 0.25)';
              }}
            >
              <Save size={18} strokeWidth={2} />
              Salvar Etapa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}