import { X, Save, Calendar, Zap, Trophy, Flag, Star, ChevronRight, Plus, Edit2, Trash2, MapPin, CalendarIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { StageModal, type StageFormData } from './StageModal';
import { getPistas } from '../utils/pistaStorage';
import { getMasterData } from '../utils/storage';

// Helper para formatar datas sem problema de timezone
const formatDateLocal = (dateString: string) => {
  const [year, month, day] = dateString.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('pt-BR');
};

const formatDateShort = (dateString: string) => {
  const [year, month, day] = dateString.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

interface SeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SeasonFormData, seasonId?: string) => void;
  categories: Array<{ 
    id: string; 
    categoryName: string;
    categoryType: 'geral' | 'trophy';
  }>;
  editingSeasonId?: string | null;
  initialData?: SeasonFormData | null;
}

export interface ChampionshipConfig {
  active: boolean;
  wildcardsPerPilot: number;
  slicksPerStage?: number;
  wetsPerStage?: number;
  endurance300?: {
    slicksPerStage: number;
    wetsPerStage: number;
  };
  endurance500?: {
    slicksPerStage: number;
    wetsPerStage: number;
  };
}

export interface SeasonFormData {
  year: number;
  championships: {
    preseason: ChampionshipConfig;
    sprint: ChampionshipConfig;
    endurance: ChampionshipConfig;
    trophy: ChampionshipConfig;
  };
  // DEPRECATED: categoryConfigs não é mais usado. 
  // A quantidade de carros agora é configurada por etapa em stages[].categories[]
  categoryConfigs?: Array<{
    category_id: string;
    car_count: number;
  }>;
  stages: StageFormData[];
}

export function SeasonModal({ isOpen, onClose, onSave, categories, editingSeasonId, initialData }: SeasonModalProps) {
  const currentYear = new Date().getFullYear();
  const [currentStep, setCurrentStep] = useState(1);
  const [pistas, setPistas] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<SeasonFormData>({
    year: currentYear,
    championships: {
      preseason: {
        active: true,
        wildcardsPerPilot: 0,
        slicksPerStage: 0,
        wetsPerStage: 0,
      },
      sprint: {
        active: true,
        wildcardsPerPilot: 0,
        slicksPerStage: 0,
        wetsPerStage: 0,
      },
      endurance: {
        active: true,
        wildcardsPerPilot: 0,
        endurance300: {
          slicksPerStage: 0,
          wetsPerStage: 0,
        },
        endurance500: {
          slicksPerStage: 0,
          wetsPerStage: 0,
        },
      },
      trophy: {
        active: true,
        wildcardsPerPilot: 0,
        slicksPerStage: 0,
        wetsPerStage: 0,
      },
    },
    stages: [],
  });

  // Verifica se há categorias Trophy
  const hasTrophyCategories = categories.some(cat => cat.categoryType === 'trophy');

  // Carrega pistas e categorias quando modal abre
  useEffect(() => {
    if (isOpen) {
      loadPistas();
      loadCategories();
    }
  }, [isOpen]);

  const loadPistas = async () => {
    try {
      const pistasData = await getPistas();
      const pistaNames = pistasData.map(p => p.nome);
      console.log('🏁 Pistas carregadas:', pistaNames);
      setPistas(pistaNames);
    } catch (error) {
      console.error('Erro ao carregar pistas:', error);
      setPistas([]);
    }
  };

  const loadCategories = async () => {
    try {
      const masterData = await getMasterData();
      const categoriaData = masterData['categoria'] || [];
      const categoriaNomes = categoriaData.map((item: any) => item.name);
      console.log('🏁 Categorias carregadas:', categoriaNomes);
      setAvailableCategories(categoriaNomes);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setAvailableCategories([]);
    }
  };

  // Carrega dados iniciais para edição ou reseta para criação
  useEffect(() => {
    if (isOpen && initialData) {
      // Modo edição - carrega dados existentes
      setFormData(initialData);
      setCurrentStep(1);
    } else if (!isOpen) {
      // Reset quando fecha
      setCurrentStep(1);
      setFormData({
        year: currentYear,
        championships: {
          preseason: {
            active: true,
            wildcardsPerPilot: 0,
            slicksPerStage: 0,
            wetsPerStage: 0,
          },
          sprint: {
            active: true,
            wildcardsPerPilot: 0,
            slicksPerStage: 0,
            wetsPerStage: 0,
          },
          endurance: {
            active: true,
            wildcardsPerPilot: 0,
            endurance300: {
              slicksPerStage: 0,
              wetsPerStage: 0,
            },
            endurance500: {
              slicksPerStage: 0,
              wetsPerStage: 0,
            },
          },
          trophy: {
            active: true,
            wildcardsPerPilot: 0,
            slicksPerStage: 0,
            wetsPerStage: 0,
          },
        },
        stages: [],
      });
    }
  }, [isOpen, initialData, currentYear]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      onSave(formData, editingSeasonId || undefined);
      onClose();
    }
  };

  const updateChampionship = (
    championship: 'preseason' | 'sprint' | 'endurance' | 'trophy',
    updates: Partial<ChampionshipConfig>
  ) => {
    setFormData({
      ...formData,
      championships: {
        ...formData.championships,
        [championship]: {
          ...formData.championships[championship],
          ...updates,
        },
      },
    });
  };

  const handleSaveStage = (stageData: StageFormData) => {
    if (editingStageIndex !== null) {
      // Editando etapa existente
      const updatedStages = [...formData.stages];
      updatedStages[editingStageIndex] = stageData;
      setFormData({ ...formData, stages: updatedStages });
      setEditingStageIndex(null);
    } else {
      // Adicionando nova etapa
      setFormData({ ...formData, stages: [...formData.stages, stageData] });
    }
    setIsStageModalOpen(false);
  };

  const handleEditStage = (index: number) => {
    setEditingStageIndex(index);
    setIsStageModalOpen(true);
  };

  const handleDeleteStage = (index: number) => {
    const updatedStages = formData.stages.filter((_, i) => i !== index);
    setFormData({ ...formData, stages: updatedStages });
  };

  const getActiveChampionships = () => {
    const championships = [];
    if (formData.championships.preseason.active) {
      championships.push({ id: 'preseason', name: 'Pré-Temporada', active: true });
    }
    if (formData.championships.sprint.active) {
      championships.push({ id: 'sprint', name: 'Sprint', active: true });
    }
    if (formData.championships.endurance.active) {
      championships.push({ id: 'endurance', name: 'Endurance', active: true });
    }
    if (formData.championships.trophy.active) {
      championships.push({ id: 'trophy', name: 'Trophy', active: true });
    }
    return championships;
  };

  const getChampionshipName = (id: string) => {
    const names: Record<string, string> = {
      'preseason': 'Pré-Temporada',
      'sprint': 'Sprint',
      'endurance': 'Endurance',
      'trophy': 'Trophy',
    };
    return names[id] || id;
  };

  const getChampionshipColor = (id: string) => {
    const colors: Record<string, string> = {
      'preseason': '#F59E0B',
      'sprint': '#3B82F6',
      'endurance': '#10B981',
      'trophy': '#A855F7',
    };
    return colors[id] || '#6B7280';
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-4xl flex flex-col rounded-2xl shadow-2xl"
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
              <Calendar size={20} strokeWidth={2} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {editingSeasonId ? 'Editar Temporada' : 'Nova Temporada'}
              </h2>
              <p className="text-sm text-gray-100">Configure campeonatos e etapas</p>
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

        {/* Steps Navigation - Fixed */}
        <div className="px-6 py-4 border-b flex-shrink-0" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 flex-1"
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={{
                  background: currentStep === 1 ? '#D50000' : currentStep > 1 ? '#10B981' : '#E5E7EB',
                  color: currentStep >= 1 ? '#FFFFFF' : '#9CA3AF',
                }}
              >
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span 
                className="text-sm font-semibold hidden sm:block"
                style={{ color: currentStep === 1 ? '#D50000' : currentStep > 1 ? '#10B981' : '#6B7280' }}
              >
                Configurar Campeonatos
              </span>
            </button>

            <ChevronRight size={16} className="text-gray-400 mx-2" />

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => currentStep >= 2 && setCurrentStep(2)}
              className="flex items-center gap-2 flex-1"
              disabled={currentStep < 2}
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={{
                  background: currentStep === 2 ? '#D50000' : currentStep > 2 ? '#10B981' : '#E5E7EB',
                  color: currentStep >= 2 ? '#FFFFFF' : '#9CA3AF',
                }}
              >
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span 
                className="text-sm font-semibold hidden sm:block"
                style={{ color: currentStep === 2 ? '#D50000' : currentStep > 2 ? '#10B981' : '#6B7280' }}
              >
                Cadastrar Etapas
              </span>
            </button>

            <ChevronRight size={16} className="text-gray-400 mx-2" />

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => currentStep >= 3 && setCurrentStep(3)}
              className="flex items-center gap-2 flex-1"
              disabled={currentStep < 3}
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={{
                  background: currentStep === 3 ? '#D50000' : '#E5E7EB',
                  color: currentStep === 3 ? '#FFFFFF' : '#9CA3AF',
                }}
              >
                3
              </div>
              <span 
                className="text-sm font-semibold hidden sm:block"
                style={{ color: currentStep === 3 ? '#D50000' : '#6B7280' }}
              >
                Revisar
              </span>
            </button>
          </div>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* STEP 1: Configurar Campeonatos */}
            {currentStep === 1 && (
              <>
                {/* Ano da Temporada */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Ano da Temporada *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    min="2020"
                    max="2035"
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

                {/* Alerta se não há categorias */}
                {categories.length === 0 && (
                  <div 
                    className="flex items-start gap-3 px-4 py-3 rounded-lg"
                    style={{
                      background: '#FEF3C7',
                      border: '1px solid #FDE68A'
                    }}
                  >
                    <span className="text-lg">⚠️</span>
                    <div className="flex-1 text-sm">
                      <p className="font-semibold" style={{ color: '#92400E' }}>
                        Nenhuma categoria cadastrada.
                      </p>
                      <p style={{ color: '#92400E' }}>
                        Cadastre categorias primeiro na seção acima para configurar os campeonatos.
                      </p>
                    </div>
                  </div>
                )}

                {/* Pré-Temporada */}
                <div 
                  className="rounded-lg border p-5"
                  style={{
                    background: formData.championships.preseason.active ? '#FFFBEB' : '#F9FAFB',
                    borderColor: formData.championships.preseason.active ? '#FDE68A' : '#E5E7EB',
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: '#F59E0B' }}
                      >
                        <Zap size={20} strokeWidth={2} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Pré-Temporada</h3>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.championships.preseason.active}
                        onChange={(e) => updateChampionship('preseason', { active: e.target.checked })}
                        className="w-5 h-5 rounded cursor-pointer"
                        style={{ accentColor: '#D50000' }}
                      />
                      <span className="text-sm font-semibold text-gray-700">Ativo</span>
                    </label>
                  </div>

                  {formData.championships.preseason.active && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Pneus Coringas por Piloto
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.championships.preseason.wildcardsPerPilot}
                          onChange={(e) => updateChampionship('preseason', { wildcardsPerPilot: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-lg border outline-none"
                          style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Jogos SLICK por Etapa
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.championships.preseason.slicksPerStage}
                            onChange={(e) => updateChampionship('preseason', { slicksPerStage: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 rounded-lg border outline-none"
                            style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Jogos WET por Etapa
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.championships.preseason.wetsPerStage}
                            onChange={(e) => updateChampionship('preseason', { wetsPerStage: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 rounded-lg border outline-none"
                            style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Campeonato Sprint */}
                <div 
                  className="rounded-lg border p-5"
                  style={{
                    background: formData.championships.sprint.active ? '#EFF6FF' : '#F9FAFB',
                    borderColor: formData.championships.sprint.active ? '#BFDBFE' : '#E5E7EB',
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: '#3B82F6' }}
                      >
                        <Flag size={20} strokeWidth={2} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Campeonato Sprint</h3>
                        <p className="text-xs text-gray-600">Pneus coringas por piloto (campeonato inteiro)</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.championships.sprint.active}
                        onChange={(e) => updateChampionship('sprint', { active: e.target.checked })}
                        className="w-5 h-5 rounded cursor-pointer"
                        style={{ accentColor: '#D50000' }}
                      />
                      <span className="text-sm font-semibold text-gray-700">Ativo</span>
                    </label>
                  </div>

                  {formData.championships.sprint.active && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Pneus Coringas por Piloto
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.championships.sprint.wildcardsPerPilot}
                          onChange={(e) => updateChampionship('sprint', { wildcardsPerPilot: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-lg border outline-none"
                          style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Jogos SLICK por Etapa
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.championships.sprint.slicksPerStage}
                            onChange={(e) => updateChampionship('sprint', { slicksPerStage: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 rounded-lg border outline-none"
                            style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Jogos WET por Etapa
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.championships.sprint.wetsPerStage}
                            onChange={(e) => updateChampionship('sprint', { wetsPerStage: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 rounded-lg border outline-none"
                            style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Campeonato Endurance */}
                <div 
                  className="rounded-lg border p-5"
                  style={{
                    background: formData.championships.endurance.active ? '#F0FDF4' : '#F9FAFB',
                    borderColor: formData.championships.endurance.active ? '#BBF7D0' : '#E5E7EB',
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: '#10B981' }}
                      >
                        <Star size={20} strokeWidth={2} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Campeonato Endurance</h3>
                        <p className="text-xs text-gray-600">Pneus coringas por piloto (campeonato inteiro)</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.championships.endurance.active}
                        onChange={(e) => updateChampionship('endurance', { active: e.target.checked })}
                        className="w-5 h-5 rounded cursor-pointer"
                        style={{ accentColor: '#D50000' }}
                      />
                      <span className="text-sm font-semibold text-gray-700">Ativo</span>
                    </label>
                  </div>

                  {formData.championships.endurance.active && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Pneus Coringas por Piloto (compartilhado entre 300km e 500km)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.championships.endurance.wildcardsPerPilot}
                          onChange={(e) => updateChampionship('endurance', { wildcardsPerPilot: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-lg border outline-none"
                          style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                        />
                      </div>

                      {/* Endurance 300km */}
                      <div 
                        className="rounded-lg border p-4"
                        style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}
                      >
                        <h4 className="text-sm font-bold text-gray-900 mb-3">Endurance 300km</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Jogos SLICK por Etapa
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={formData.championships.endurance.endurance300?.slicksPerStage || 0}
                              onChange={(e) => updateChampionship('endurance', {
                                endurance300: {
                                  ...formData.championships.endurance.endurance300!,
                                  slicksPerStage: parseInt(e.target.value) || 0
                                }
                              })}
                              className="w-full px-3 py-2 rounded-lg border outline-none"
                              style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Jogos WET por Etapa
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={formData.championships.endurance.endurance300?.wetsPerStage || 0}
                              onChange={(e) => updateChampionship('endurance', {
                                endurance300: {
                                  ...formData.championships.endurance.endurance300!,
                                  wetsPerStage: parseInt(e.target.value) || 0
                                }
                              })}
                              className="w-full px-3 py-2 rounded-lg border outline-none"
                              style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Endurance 500km */}
                      <div 
                        className="rounded-lg border p-4"
                        style={{ background: '#D1FAE5', borderColor: '#A7F3D0' }}
                      >
                        <h4 className="text-sm font-bold text-gray-900 mb-3">Endurance 500km</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Jogos SLICK por Etapa
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={formData.championships.endurance.endurance500?.slicksPerStage || 0}
                              onChange={(e) => updateChampionship('endurance', {
                                endurance500: {
                                  ...formData.championships.endurance.endurance500!,
                                  slicksPerStage: parseInt(e.target.value) || 0
                                }
                              })}
                              className="w-full px-3 py-2 rounded-lg border outline-none"
                              style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Jogos WET por Etapa
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={formData.championships.endurance.endurance500?.wetsPerStage || 0}
                              onChange={(e) => updateChampionship('endurance', {
                                endurance500: {
                                  ...formData.championships.endurance.endurance500!,
                                  wetsPerStage: parseInt(e.target.value) || 0
                                }
                              })}
                              className="w-full px-3 py-2 rounded-lg border outline-none"
                              style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Campeonato Trophy */}
                <div 
                  className="rounded-lg border p-5"
                  style={{
                    background: formData.championships.trophy.active ? '#FAF5FF' : '#F9FAFB',
                    borderColor: formData.championships.trophy.active ? '#E9D5FF' : '#E5E7EB',
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: '#A855F7' }}
                      >
                        <Trophy size={20} strokeWidth={2} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Campeonato Trophy</h3>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.championships.trophy.active}
                        onChange={(e) => {
                          if (hasTrophyCategories || !e.target.checked) {
                            updateChampionship('trophy', { active: e.target.checked });
                          }
                        }}
                        disabled={!hasTrophyCategories}
                        className="w-5 h-5 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ accentColor: '#D50000' }}
                      />
                      <span className="text-sm font-semibold text-gray-700">Ativo</span>
                    </label>
                  </div>

                  {!hasTrophyCategories && (
                    <div 
                      className="flex items-start gap-3 px-4 py-3 rounded-lg"
                      style={{
                        background: '#FEF3C7',
                        border: '1px solid #FDE68A'
                      }}
                    >
                      <span className="text-lg">⚠️</span>
                      <div className="flex-1 text-sm">
                        <p style={{ color: '#92400E' }}>
                          Nenhuma categoria do tipo "Exclusiva Trophy" cadastrada. Cadastre uma categoria com tipo "Trophy" para configurar o campeonato Trophy.
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.championships.trophy.active && hasTrophyCategories && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Pneus Coringas por Piloto
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.championships.trophy.wildcardsPerPilot}
                          onChange={(e) => updateChampionship('trophy', { wildcardsPerPilot: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-lg border outline-none"
                          style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Jogos SLICK por Etapa
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.championships.trophy.slicksPerStage}
                            onChange={(e) => updateChampionship('trophy', { slicksPerStage: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 rounded-lg border outline-none"
                            style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Jogos WET por Etapa
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.championships.trophy.wetsPerStage}
                            onChange={(e) => updateChampionship('trophy', { wetsPerStage: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 rounded-lg border outline-none"
                            style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* STEP 2: Cadastrar Etapas */}
            {currentStep === 2 && (
              <>
                {/* Header com botão de adicionar */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Etapas da Temporada</h3>
                    <p className="text-sm text-gray-600">Cadastre as etapas que acontecerão durante a temporada</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStageIndex(null);
                      setIsStageModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
                      color: '#FFFFFF',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Plus size={18} strokeWidth={2} />
                    Adicionar Etapa
                  </button>
                </div>

                {/* Lista de etapas */}
                {formData.stages.length === 0 ? (
                  <div 
                    className="flex flex-col items-center justify-center py-16 px-4 rounded-lg border-2 border-dashed"
                    style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}
                  >
                    <Flag size={48} strokeWidth={1.5} className="text-gray-300 mb-4" />
                    <p className="text-gray-500 font-semibold mb-1">Nenhuma etapa cadastrada</p>
                    <p className="text-sm text-gray-400">Clique em "Adicionar Etapa" para começar</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.stages.map((stage, index) => (
                      <div
                        key={stage.id}
                        className="rounded-lg border p-4 transition-all"
                        style={{
                          background: '#FFFFFF',
                          borderColor: '#E5E7EB',
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white"
                                style={{ background: getChampionshipColor(stage.mainChampionship) }}
                              >
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900">{stage.name}</h4>
                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                  <MapPin size={14} />
                                  {stage.track}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">Período</p>
                                <p className="text-sm text-gray-900 flex items-center gap-1">
                                  <CalendarIcon size={14} />
                                  {formatDateLocal(stage.startDate)} - {formatDateLocal(stage.endDate)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">Campeonato Principal</p>
                                <span
                                  className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded"
                                  style={{
                                    background: getChampionshipColor(stage.mainChampionship) + '20',
                                    color: getChampionshipColor(stage.mainChampionship),
                                  }}
                                >
                                  {getChampionshipName(stage.mainChampionship)}
                                </span>
                              </div>
                            </div>

                            {stage.includeTrophy && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#FAF5FF' }}>
                                <Trophy size={14} style={{ color: '#A855F7' }} />
                                <span className="text-xs font-semibold" style={{ color: '#A855F7' }}>
                                  Inclui Trophy
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <button
                              type="button"
                              onClick={() => handleEditStage(index)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                              style={{ background: '#F3F4F6' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#E5E7EB';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#F3F4F6';
                              }}
                            >
                              <Edit2 size={14} className="text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStage(index)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                              style={{ background: '#FEE2E2' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#FECACA';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#FEE2E2';
                              }}
                            >
                              <Trash2 size={14} className="text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* STEP 3: Revisar */}
            {currentStep === 3 && (
              <>
                {/* Header da Revisão */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    Revisão Final - Temporada {formData.year}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Confira todas as configurações antes de salvar
                  </p>
                </div>

                {/* Cards dos Campeonatos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {/* Pré-Temporada */}
                  {formData.championships.preseason.active && (
                    <div
                      className="rounded-lg border p-4"
                      style={{
                        background: '#FFFBEB',
                        borderColor: '#FDE68A',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Zap size={18} strokeWidth={2} style={{ color: '#F59E0B' }} />
                        <h4 className="font-bold text-gray-900">Pré-Temporada</h4>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <p className="text-gray-600">
                          Coringas: <span className="font-semibold text-gray-900">{formData.championships.preseason.wildcardsPerPilot}</span>
                        </p>
                        <p className="text-gray-600">
                          SLICK/etapa: <span className="font-semibold text-gray-900">{formData.championships.preseason.slicksPerStage}</span>
                        </p>
                        <p className="text-gray-600">
                          WET/etapa: <span className="font-semibold text-gray-900">{formData.championships.preseason.wetsPerStage}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Sprint */}
                  {formData.championships.sprint.active && (
                    <div
                      className="rounded-lg border p-4"
                      style={{
                        background: '#EFF6FF',
                        borderColor: '#BFDBFE',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Flag size={18} strokeWidth={2} style={{ color: '#3B82F6' }} />
                        <h4 className="font-bold text-gray-900">Sprint</h4>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <p className="text-gray-600">
                          Coringas: <span className="font-semibold text-gray-900">{formData.championships.sprint.wildcardsPerPilot}</span>
                        </p>
                        <p className="text-gray-600">
                          SLICK/etapa: <span className="font-semibold text-gray-900">{formData.championships.sprint.slicksPerStage}</span>
                        </p>
                        <p className="text-gray-600">
                          WET/etapa: <span className="font-semibold text-gray-900">{formData.championships.sprint.wetsPerStage}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Endurance */}
                  {formData.championships.endurance.active && (
                    <div
                      className="rounded-lg border p-4"
                      style={{
                        background: '#F0FDF4',
                        borderColor: '#BBF7D0',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Star size={18} strokeWidth={2} style={{ color: '#10B981' }} />
                        <h4 className="font-bold text-gray-900">Endurance</h4>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <p className="text-gray-600">
                          Coringas: <span className="font-semibold text-gray-900">{formData.championships.endurance.wildcardsPerPilot}</span>
                        </p>
                        <div className="pt-1 space-y-1">
                          <p className="text-xs font-semibold text-gray-700">300km</p>
                          <p className="text-gray-600 text-xs">
                            SLICK: {formData.championships.endurance.endurance300?.slicksPerStage || 0} / etapa | 
                            WET: {formData.championships.endurance.endurance300?.wetsPerStage || 0} / etapa
                          </p>
                        </div>
                        <div className="pt-1 space-y-1">
                          <p className="text-xs font-semibold text-gray-700">500km</p>
                          <p className="text-gray-600 text-xs">
                            SLICK: {formData.championships.endurance.endurance500?.slicksPerStage || 0} / etapa | 
                            WET: {formData.championships.endurance.endurance500?.wetsPerStage || 0} / etapa
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trophy */}
                  {formData.championships.trophy.active && (
                    <div
                      className="rounded-lg border p-4"
                      style={{
                        background: '#FAF5FF',
                        borderColor: '#E9D5FF',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy size={18} strokeWidth={2} style={{ color: '#A855F7' }} />
                        <h4 className="font-bold text-gray-900">Trophy</h4>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <p className="text-gray-600">
                          Coringas: <span className="font-semibold text-gray-900">{formData.championships.trophy.wildcardsPerPilot}</span>
                        </p>
                        <p className="text-gray-600">
                          SLICK/etapa: <span className="font-semibold text-gray-900">{formData.championships.trophy.slicksPerStage}</span>
                        </p>
                        <p className="text-gray-600">
                          WET/etapa: <span className="font-semibold text-gray-900">{formData.championships.trophy.wetsPerStage}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Seção de Etapas */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    Etapas ({formData.stages.length})
                  </h3>
                  
                  {formData.stages.length === 0 ? (
                    <div
                      className="rounded-lg border p-6 text-center"
                      style={{
                        background: '#F9FAFB',
                        borderColor: '#E5E7EB',
                      }}
                    >
                      <p className="text-gray-500 text-sm">Nenhuma etapa cadastrada</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.stages.map((stage, index) => (
                        <div
                          key={stage.id}
                          className="rounded-lg border p-4"
                          style={{
                            background: '#FFFFFF',
                            borderColor: '#E5E7EB',
                          }}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white flex-shrink-0"
                              style={{ background: getChampionshipColor(stage.mainChampionship) }}
                            >
                              {index + 1}
                            </div>
                            
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <h4 className="font-bold text-gray-900 mb-1">{stage.name}</h4>
                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                  <MapPin size={14} />
                                  {stage.track}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">Período</p>
                                <p className="text-sm text-gray-900 flex items-center gap-1">
                                  <CalendarIcon size={14} />
                                  {formatDateShort(stage.startDate)} - {formatDateShort(stage.endDate)}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">Campeonatos</p>
                                <div className="flex flex-wrap gap-1">
                                  <span
                                    className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded"
                                    style={{
                                      background: getChampionshipColor(stage.mainChampionship) + '20',
                                      color: getChampionshipColor(stage.mainChampionship),
                                    }}
                                  >
                                    {getChampionshipName(stage.mainChampionship)}
                                  </span>
                                  {stage.includeTrophy && (
                                    <span
                                      className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded"
                                      style={{
                                        background: '#A855F720',
                                        color: '#A855F7',
                                      }}
                                    >
                                      <Trophy size={12} />
                                      Trophy
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer - Fixed */}
          <div 
            className="px-6 py-4 border-t flex items-center justify-between rounded-b-2xl flex-shrink-0"
            style={{
              background: '#F9FAFB',
              borderColor: '#E5E7EB'
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (currentStep > 1) {
                  setCurrentStep(currentStep - 1);
                } else {
                  onClose();
                }
              }}
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
              {currentStep > 1 ? 'Voltar' : 'Cancelar'}
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all"
              style={{
                background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(213, 0, 0, 0.25)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(213, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(213, 0, 0, 0.25)';
              }}
            >
              {currentStep < 3 ? (
                <>
                  Próximo: {currentStep === 1 ? 'Etapas' : 'Revisar'}
                  <ChevronRight size={18} strokeWidth={2} />
                </>
              ) : (
                <>
                  <Save size={18} strokeWidth={2} />
                  Salvar Temporada
                </>
              )}
            </button>
          </div>
        </form>

        {/* Modal de Etapa */}
        <StageModal
          isOpen={isStageModalOpen}
          onClose={() => {
            setIsStageModalOpen(false);
            setEditingStageIndex(null);
          }}
          onSave={handleSaveStage}
          pistas={pistas}
          availableChampionships={getActiveChampionships()}
          availableCategories={availableCategories}
          hasTrophy={formData.championships.trophy.active}
          editingStage={editingStageIndex !== null ? formData.stages[editingStageIndex] : null}
        />
      </div>
    </div>
  );
}