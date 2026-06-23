import {
  getSeasons,
  getSeasonStages,
  createSeason,
  updateSeason,
  updateSeasonStages,
  deleteSeason,
  checkDuplicateSeason,
  toggleSeasonStatus,
  type Season as SeasonDB,
  type SeasonStage
} from '../utils/seasonStorage';
import { useState, useEffect } from 'react';
import { CategoryModal, CategoryFormData } from '../components/CategoryModal';
import { SeasonModal, SeasonFormData } from '../components/SeasonModal';
import { getMasterData, getTireModels, type MasterDataItem } from '../utils/storage';
import { toast } from 'sonner';
import {
  fetchSeasonCategories,
  createSeasonCategory,
  updateSeasonCategory,
  deleteSeasonCategory,
  checkDuplicateCategory,
  type SeasonCategory
} from '../utils/seasonCategories';
import { Plus, Layers, Calendar, Edit2, Trash2, ChevronDown, Power } from 'lucide-react';

interface TireModel {
  id: string;
  name: string;
  code: string;
  type: string;
}

interface Category {
  id: string;
  categoryName: string;
  carModel: string;
  categoryType: 'geral' | 'trophy';
  selectedTires: {
    slick: string[];
    wet: string[];
  };
  createdAt: string;
}

interface Season {
  id: string;
  name: string;
  year: number;
  categoryId: string;
  championship: string;
  startDate: string;
  endDate: string;
  rules: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export function SeasonConfiguration() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<(Category & { id: string }) | null>(null);
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [editingSeasonData, setEditingSeasonData] = useState<SeasonFormData | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null);
  const [seasonDetails, setSeasonDetails] = useState<Record<string, { championships: any; stagesCount: number; stages?: any[] }>>({}); // Armazena detalhes carregados

  // Dados do Master Data
  const [carModels, setCarModels] = useState<string[]>([]);
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);

  useEffect(() => {
    loadMasterData();
    loadCategories(); // Carrega categorias do Supabase
    loadSeasons(); // Carrega temporadas do Supabase
  }, []);

  const loadMasterData = async () => {
    try {
      const masterData = await getMasterData();
      
      // Carrega categorias
      const categoriaData = masterData['categoria'] || [];
      const categoriaNomes = categoriaData.map((item: MasterDataItem) => item.name);
      setCategoryNames(categoriaNomes);
      
      // Carrega gerações de carros (geracao)
      const geracaoData = masterData['geracao'] || [];
      const geracaoNomes = geracaoData.map((item: MasterDataItem) => item.name);
      setCarModels(geracaoNomes);
      
      // Carrega modelos de pneu
      const tireModelsData = await getTireModels();
      setTireModels(tireModelsData);
      
      console.log('Master Data carregado:', {
        categories: categoriaNomes,
        carModels: geracaoNomes,
        tireModels: tireModelsData
      });
    } catch (error) {
      console.error('Erro ao carregar Master Data:', error);
      toast.error('Erro ao carregar Master Data');
    }
  };

  /**
   * Carrega categorias do Supabase
   */
  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const data = await fetchSeasonCategories();
      
      // Converte formato Supabase para formato da interface
      const convertedCategories: Category[] = data.map((item: SeasonCategory) => ({
        id: item.id,
        categoryName: item.category_name,
        carModel: item.car_model,
        categoryType: item.category_type || 'geral', // Default para categorias antigas
        selectedTires: {
          slick: item.slick_tires,
          wet: item.wet_tires,
        },
        createdAt: item.created_at,
      }));
      
      setCategories(convertedCategories);
      console.log('✅ Categorias carregadas do Supabase:', convertedCategories.length);
    } catch (error) {
      console.error('❌ Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Carrega temporadas do Supabase
   */
  const loadSeasons = async () => {
    try {
      setIsLoading(true);
      const data = await getSeasons();
      
      // Converte formato do banco para formato da interface (temporário)
      const convertedSeasons: Season[] = data.map((item: SeasonDB) => ({
        id: item.id,
        name: item.name || `Temporada ${item.year}`,
        year: item.year,
        categoryId: '', // Não usado mais
        championship: '', // Não usado mais
        startDate: '', // Não usado mais
        endDate: '', // Não usado mais
        rules: '', // Não usado mais
        status: (item.status as 'active' | 'inactive') || 'active',
        createdAt: item.created_at || new Date().toISOString(),
      }));
      
      setSeasons(convertedSeasons);
      console.log('✅ Temporadas carregadas do Supabase:', convertedSeasons.length);
    } catch (error) {
      console.error('❌ Erro ao carregar temporadas:', error);
      toast.error('Erro ao carregar temporadas');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Salva categoria (criar ou atualizar)
   */
  const handleSaveCategory = async (data: CategoryFormData) => {
    try {
      setIsLoading(true);

      // Verifica duplicatas
      const isDuplicate = await checkDuplicateCategory(
        data.categoryName,
        data.carModel,
        editingCategory?.id
      );

      if (isDuplicate) {
        toast.error('Já existe uma configuração para esta categoria e modelo de carro');
        return;
      }

      const input = {
        category_name: data.categoryName,
        car_model: data.carModel,
        category_type: data.categoryType,
        slick_tires: data.selectedTires.slick,
        wet_tires: data.selectedTires.wet,
      };

      if (editingCategory) {
        // Atualiza categoria existente
        await updateSeasonCategory(editingCategory.id, input);
        toast.success('Categoria atualizada com sucesso!');
      } else {
        // Cria nova categoria
        await createSeasonCategory(input);
        toast.success('Categoria criada com sucesso!');
      }

      // Recarrega a lista
      await loadCategories();
      setEditingCategory(null);
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar categoria:', error);
      toast.error(error.message || 'Erro ao salvar categoria');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = (id: string) => {
    setDeletingCategoryId(id);
  };

  const confirmDeleteCategory = async () => {
    if (!deletingCategoryId) return;

    try {
      setIsLoading(true);
      await deleteSeasonCategory(deletingCategoryId);
      toast.success('Categoria excluída com sucesso!');
      
      // Recarrega a lista
      await loadCategories();
      setDeletingCategoryId(null);
    } catch (error: any) {
      console.error('❌ Erro ao excluir categoria:', error);
      toast.error(error.message || 'Erro ao excluir categoria');
    } finally {
      setIsLoading(false);
    }
  };

  const getTireInfo = (tireId: string) => {
    return tireModels.find(t => t.id === tireId);
  };

  /**
   * Carrega detalhes de uma temporada (campeonatos e etapas)
   */
  const loadSeasonDetails = async (seasonId: string) => {
    try {
      // Se já carregou, toggle expand/collapse
      if (expandedSeasonId === seasonId) {
        setExpandedSeasonId(null);
        return;
      }

      // Se ainda não carregou os detalhes, carrega do Supabase
      if (!seasonDetails[seasonId]) {
        const seasonDB = await getSeasons();
        const season = seasonDB.find(s => s.id === seasonId);
        
        if (!season) return;

        const stages = await getSeasonStages(seasonId);
        
        setSeasonDetails(prev => ({
          ...prev,
          [seasonId]: {
            championships: season.championships,
            stagesCount: stages.length,
            stages: stages
          }
        }));
      }

      // Expande o card
      setExpandedSeasonId(seasonId);
    } catch (error) {
      console.error('Erro ao carregar detalhes da temporada:', error);
    }
  };

  const handleEditSeason = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Busca dados da temporada
      const seasonDB = await getSeasons();
      const season = seasonDB.find(s => s.id === id);
      
      if (!season) {
        toast.error('Temporada não encontrada');
        return;
      }

      // Busca etapas
      const stages = await getSeasonStages(id);
      
      // Converte para formato do formulário
      const formData: SeasonFormData = {
        year: season.year,
        championships: {
          preseason: {
            active: season.championships.preseason.active,
            wildcardsPerPilot: season.championships.preseason.wildcards,
            slicksPerStage: season.championships.preseason.slicks_per_stage,
            wetsPerStage: season.championships.preseason.wets_per_stage,
          },
          sprint: {
            active: season.championships.sprint.active,
            wildcardsPerPilot: season.championships.sprint.wildcards,
            slicksPerStage: season.championships.sprint.slicks_per_stage,
            wetsPerStage: season.championships.sprint.wets_per_stage,
          },
          endurance: {
            active: season.championships.endurance.active,
            wildcardsPerPilot: season.championships.endurance.wildcards,
            endurance300: {
              slicksPerStage: season.championships.endurance.endurance_300.slicks_per_stage,
              wetsPerStage: season.championships.endurance.endurance_300.wets_per_stage,
            },
            endurance500: {
              slicksPerStage: season.championships.endurance.endurance_500.slicks_per_stage,
              wetsPerStage: season.championships.endurance.endurance_500.wets_per_stage,
            },
          },
          trophy: {
            active: season.championships.trophy.active,
            wildcardsPerPilot: season.championships.trophy.wildcards,
            slicksPerStage: season.championships.trophy.slicks_per_stage,
            wetsPerStage: season.championships.trophy.wets_per_stage,
          },
        },
        stages: stages.map(stage => ({
          id: stage.id,
          name: stage.name,
          track: stage.track,
          startDate: stage.start_date,
          endDate: stage.end_date,
          mainChampionship: stage.main_championship,
          enduranceType: stage.endurance_type,
          includeTrophy: stage.include_trophy,
          categories: stage.categories || [],
        })),
      };

      setEditingSeasonId(id);
      setEditingSeasonData(formData);
      setIsSeasonModalOpen(true);
    } catch (error: any) {
      console.error('❌ Erro ao carregar temporada para edição:', error);
      toast.error(error.message || 'Erro ao carregar temporada');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSeason = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta temporada? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteSeason(id);
      toast.success('Temporada excluída com sucesso!');
      
      // Recarrega a lista
      await loadSeasons();
    } catch (error: any) {
      console.error('❌ Erro ao excluir temporada:', error);
      toast.error(error.message || 'Erro ao excluir temporada');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSeasonStatus = async (seasonId: string, currentStatus: 'active' | 'inactive') => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      setIsLoading(true);
      await toggleSeasonStatus(seasonId, newStatus);
      
      if (newStatus === 'active') {
        toast.success('✅ Temporada ativada com sucesso!');
      } else {
        toast.success('Temporada desativada com sucesso!');
      }
      
      // Recarrega a lista
      await loadSeasons();
    } catch (error: any) {
      console.error('❌ Erro ao alterar status da temporada:', error);
      toast.error(error.message || 'Erro ao alterar status da temporada');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSeason = async (data: SeasonFormData, seasonId?: string) => {
    try {
      setIsLoading(true);

      // Verifica se já existe temporada para o ano (exceto se estiver editando)
      const isDuplicate = await checkDuplicateSeason(data.year, seasonId);
      if (isDuplicate) {
        toast.error(`Já existe uma temporada configurada para o ano ${data.year}`);
        return;
      }

      // Prepara dados da temporada com estrutura JSON
      const seasonData = {
        name: `Temporada ${data.year}`,
        year: data.year,
        season_categories: data.categoryConfigs || [],
        championships: {
          preseason: {
            active: data.championships.preseason.active,
            wildcards: data.championships.preseason.wildcardsPerPilot,
            slicks_per_stage: data.championships.preseason.slicksPerStage || 0,
            wets_per_stage: data.championships.preseason.wetsPerStage || 0,
          },
          sprint: {
            active: data.championships.sprint.active,
            wildcards: data.championships.sprint.wildcardsPerPilot,
            slicks_per_stage: data.championships.sprint.slicksPerStage || 0,
            wets_per_stage: data.championships.sprint.wetsPerStage || 0,
          },
          endurance: {
            active: data.championships.endurance.active,
            wildcards: data.championships.endurance.wildcardsPerPilot,
            endurance_300: {
              slicks_per_stage: data.championships.endurance.endurance300?.slicksPerStage || 0,
              wets_per_stage: data.championships.endurance.endurance300?.wetsPerStage || 0,
            },
            endurance_500: {
              slicks_per_stage: data.championships.endurance.endurance500?.slicksPerStage || 0,
              wets_per_stage: data.championships.endurance.endurance500?.wetsPerStage || 0,
            },
          },
          trophy: {
            active: data.championships.trophy.active,
            wildcards: data.championships.trophy.wildcardsPerPilot,
            slicks_per_stage: data.championships.trophy.slicksPerStage || 0,
            wets_per_stage: data.championships.trophy.wetsPerStage || 0,
          },
        },
      };

      if (seasonId) {
        // Modo edição - atualiza temporada existente
        await updateSeason(seasonId, seasonData);
        
        // Atualizar etapas (deletar antigas e criar novas)
        const stagesData = data.stages.map(stage => ({
          name: stage.name,
          track: stage.track,
          start_date: stage.startDate,
          end_date: stage.endDate,
          main_championship: stage.mainChampionship,
          endurance_type: stage.enduranceType,
          include_trophy: stage.includeTrophy,
          categories: stage.categories || [],
        }));

        await updateSeasonStages(seasonId, stagesData);
        
        toast.success('Temporada atualizada com sucesso!');
        setIsSeasonModalOpen(false);
        setEditingSeasonId(null);
        setEditingSeasonData(null);
        
        // Recarrega lista de temporadas
        await loadSeasons();
        console.log('✅ Temporada atualizada:', { year: data.year });
      } else {
        // Modo criação - cria nova temporada
        const stagesData = data.stages.map(stage => ({
          name: stage.name,
          track: stage.track,
          start_date: stage.startDate,
          end_date: stage.endDate,
          main_championship: stage.mainChampionship,
          endurance_type: stage.enduranceType,
          include_trophy: stage.includeTrophy,
          categories: stage.categories || [],
        }));

        await createSeason(seasonData, stagesData);
        
        toast.success('Temporada criada com sucesso!');
        setIsSeasonModalOpen(false);
        
        // Recarrega lista de temporadas
        await loadSeasons();
        console.log('✅ Temporada salva:', { year: data.year, stages: stagesData.length });
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar temporada:', error);
      toast.error(error.message || 'Erro ao salvar temporada');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: '#F9FAFB' }}>
      {/* Header */}
      <div 
        className="border-b"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)',
          borderColor: '#E5E7EB'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
                  boxShadow: '0 4px 12px rgba(213, 0, 0, 0.25)'
                }}
              >
                <Layers size={24} strokeWidth={2} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Master Data - Configurações
                </h1>
                <p className="text-gray-500 mt-1">
                  Configure categorias, campeonatos e temporadas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Seção: Categorias */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: '#000000',
                }}
              >
                <Layers size={20} strokeWidth={2} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Categorias</h2>
                <p className="text-sm text-gray-500">
                  Configure modelos de carro e pneus por categoria
                </p>
              </div>
            </div>

            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200"
              style={{
                background: '#000000',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1a1a1a';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#000000';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
              }}
              onClick={() => setIsCategoryModalOpen(true)}
            >
              <Plus size={18} strokeWidth={2.5} />
              <span className="font-semibold">Nova Categoria</span>
            </button>
          </div>

          {/* Estado Vazio - Categorias */}
          {categories.length === 0 && (
            <div 
              className="rounded-xl border p-16 text-center"
              style={{
                background: '#FFFFFF',
                borderColor: '#E5E7EB'
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: '#F3F4F6'
                  }}
                >
                  <Layers size={32} strokeWidth={1.5} className="text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Nenhuma categoria configurada
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Clique em "Nova Categoria" para começar
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Categorias */}
          {categories.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => {
                const isExpanded = expandedCategoryId === category.id;
                
                return (
                  <div
                    key={category.id}
                    className="rounded-xl border transition-all duration-200"
                    style={{
                      background: '#FFFFFF',
                      borderColor: '#E5E7EB'
                    }}
                  >
                    {/* Card Header */}
                    <div 
                      className="px-5 py-4 border-b"
                      style={{
                        background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
                        borderColor: '#333333',
                        borderTopLeftRadius: '0.75rem',
                        borderTopRightRadius: '0.75rem'
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white text-lg">
                              {category.categoryName}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-300 mt-1">
                            {category.carModel}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            }}
                            title="Editar"
                          >
                            <Edit2 size={16} className="text-white" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                            style={{ background: 'rgba(213, 0, 0, 0.2)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(213, 0, 0, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(213, 0, 0, 0.2)';
                            }}
                            title="Excluir"
                          >
                            <Trash2 size={16} className="text-red-300" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Body - Minimizado */}
                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          {category.selectedTires.slick.length} pneu(s) SLICK • {category.selectedTires.wet.length} pneu(s) WET
                        </p>
                        <button
                          onClick={() => setExpandedCategoryId(isExpanded ? null : category.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                          style={{
                            background: isExpanded ? '#000000' : '#F3F4F6',
                            color: isExpanded ? '#FFFFFF' : '#374151'
                          }}
                          onMouseEnter={(e) => {
                            if (!isExpanded) {
                              e.currentTarget.style.background = '#E5E7EB';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isExpanded) {
                              e.currentTarget.style.background = '#F3F4F6';
                            }
                          }}
                        >
                          {isExpanded ? 'Ocultar' : 'Ver detalhes'}
                          <ChevronDown 
                            size={16} 
                            className="transition-transform duration-200"
                            style={{
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                            }}
                          />
                        </button>
                      </div>

                      {/* Detalhes Expandidos */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-4" style={{ borderColor: '#E5E7EB' }}>
                          {/* Pneus SLICK */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: '#000000' }} />
                              <span className="text-xs font-bold text-gray-700 uppercase">
                                SLICK (Seco)
                              </span>
                            </div>
                            <div className="space-y-2">
                              {category.selectedTires.slick.map((tireId) => {
                                const tire = getTireInfo(tireId);
                                return tire ? (
                                  <div
                                    key={tireId}
                                    className="px-3 py-2 rounded-lg text-sm"
                                    style={{
                                      background: '#F9FAFB',
                                      borderLeft: '3px solid #000000'
                                    }}
                                  >
                                    <div className="font-semibold text-gray-900">{tire.name}</div>
                                    {tire.code && (
                                      <div className="text-xs text-gray-500">{tire.code}</div>
                                    )}
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>

                          {/* Pneus WET */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} />
                              <span className="text-xs font-bold text-gray-700 uppercase">
                                WET (Chuva)
                              </span>
                            </div>
                            <div className="space-y-2">
                              {category.selectedTires.wet.map((tireId) => {
                                const tire = getTireInfo(tireId);
                                return tire ? (
                                  <div
                                    key={tireId}
                                    className="px-3 py-2 rounded-lg text-sm"
                                    style={{
                                      background: '#EFF6FF',
                                      borderLeft: '3px solid #3B82F6'
                                    }}
                                  >
                                    <div className="font-semibold text-gray-900">{tire.name}</div>
                                    {tire.code && (
                                      <div className="text-xs text-gray-500">{tire.code}</div>
                                    )}
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Seção: Temporadas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
                }}
              >
                <Calendar size={20} strokeWidth={2} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Temporadas</h2>
                <p className="text-sm text-gray-500">
                  Configure campeonatos, regras e etapas
                </p>
              </div>
            </div>

            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200"
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
              onClick={() => setIsSeasonModalOpen(true)}
            >
              <Plus size={18} strokeWidth={2.5} />
              <span className="font-semibold">Nova Temporada</span>
            </button>
          </div>

          {/* Estado Vazio - Temporadas */}
          {seasons.length === 0 && (
            <div 
              className="rounded-xl border p-16 text-center"
              style={{
                background: '#FFFFFF',
                borderColor: '#E5E7EB'
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: '#F3F4F6'
                  }}
                >
                  <Calendar size={32} strokeWidth={1.5} className="text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Nenhuma temporada configurada
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Clique em "Nova Temporada" para começar
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Temporadas */}
          {seasons.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {seasons.map((season) => {
                const isExpanded = expandedSeasonId === season.id;
                
                return (
                  <div
                    key={season.id}
                    className="rounded-xl border overflow-hidden"
                    style={{
                      background: '#FFFFFF',
                      borderColor: '#E5E7EB'
                    }}
                  >
                    {/* Card Header */}
                    <div 
                      className="px-5 py-4 border-b"
                      style={{
                        background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
                        borderColor: '#A00000'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-bold text-lg">
                            {season.name}
                          </h3>
                          <p className="text-white/80 text-sm">
                            Ano: {season.year}
                          </p>
                        </div>
                        <div 
                          className="px-3 py-1 rounded-full text-xs font-bold"
                          style={{
                            background: season.status === 'active' ? '#10B981' : '#6B7280',
                            color: '#FFFFFF'
                          }}
                        >
                          {season.status === 'active' ? 'Ativa' : 'Inativa'}
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          {seasonDetails[season.id] ? 
                            `${seasonDetails[season.id].stagesCount} etapa(s) cadastrada(s)` : 
                            'Temporada configurada'
                          }
                        </p>
                        <button
                          onClick={() => loadSeasonDetails(season.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                          style={{
                            background: isExpanded ? '#D50000' : '#F3F4F6',
                            color: isExpanded ? '#FFFFFF' : '#374151'
                          }}
                          onMouseEnter={(e) => {
                            if (!isExpanded) {
                              e.currentTarget.style.background = '#E5E7EB';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isExpanded) {
                              e.currentTarget.style.background = '#F3F4F6';
                            }
                          }}
                        >
                          {isExpanded ? 'Ocultar' : 'Ver detalhes'}
                          <ChevronDown 
                            size={16} 
                            className="transition-transform duration-200"
                            style={{
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                            }}
                          />
                        </button>
                      </div>

                      {/* Detalhes Expandidos */}
                      {isExpanded && seasonDetails[season.id] && (
                        <div className="mt-4 pt-4 border-t space-y-4" style={{ borderColor: '#E5E7EB' }}>
                          {/* Etapas */}
                          {seasonDetails[season.id].stages && seasonDetails[season.id].stages.length > 0 ? (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full" style={{ background: '#D50000' }} />
                                <span className="text-xs font-bold text-gray-700 uppercase">
                                  Etapas ({seasonDetails[season.id].stagesCount})
                                </span>
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {seasonDetails[season.id].stages.map((stage: any) => (
                                  <div 
                                    key={stage.id} 
                                    className="px-3 py-3 rounded-lg border-l-3" 
                                    style={{ 
                                      background: '#F9FAFB',
                                      borderLeft: '3px solid #D50000'
                                    }}
                                  >
                                    <div className="font-semibold text-gray-900 text-sm mb-1">
                                      {stage.name}
                                    </div>
                                    <div className="text-xs text-gray-600 mb-1">
                                      📍 {stage.track}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap mt-2">
                                      {/* Campeonato Principal */}
                                      <span 
                                        className="px-2 py-0.5 rounded text-xs font-semibold"
                                        style={{
                                          background: stage.main_championship === 'preseason' ? '#D1FAE5' :
                                                     stage.main_championship === 'sprint' ? '#DBEAFE' :
                                                     stage.main_championship === 'endurance' ? '#FED7AA' : '#FEF3C7',
                                          color: stage.main_championship === 'preseason' ? '#065F46' :
                                                 stage.main_championship === 'sprint' ? '#1E40AF' :
                                                 stage.main_championship === 'endurance' ? 
                                                   (stage.endurance_type === 'endurance_300' ? '#9A3412' : 
                                                    stage.endurance_type === 'endurance_500' ? '#9A3412' : '#9A3412') : '#92400E'
                                        }}
                                      >
                                        {stage.main_championship === 'preseason' ? 'Pré-Temporada' :
                                         stage.main_championship === 'sprint' ? 'Sprint' :
                                         stage.main_championship === 'endurance' ? 
                                           (stage.endurance_type === 'endurance_300' ? 'Endurance 300km' : 
                                            stage.endurance_type === 'endurance_500' ? 'Endurance 500km' : 'Endurance') :
                                         'Trophy'}
                                      </span>
                                      
                                      {/* Trophy */}
                                      {stage.include_trophy && (
                                        <span 
                                          className="px-2 py-0.5 rounded text-xs font-semibold"
                                          style={{
                                            background: '#FEF3C7',
                                            color: '#92400E'
                                          }}
                                        >
                                          Trophy
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Categorias */}
                                    {stage.categories && stage.categories.length > 0 && (
                                      <div className="mt-2 flex items-center gap-1 flex-wrap">
                                        <span className="text-xs text-gray-500">Categorias:</span>
                                        {stage.categories.map((category: any, index: number) => {
                                          // Suporta tanto formato antigo (string) quanto novo (objeto)
                                          const categoryName = typeof category === 'string' ? category : category.name;
                                          const carCount = typeof category === 'object' ? category.car_count : null;
                                          
                                          return (
                                            <span 
                                              key={index}
                                              className="px-2 py-0.5 rounded text-xs font-medium"
                                              style={{
                                                background: '#000000',
                                                color: '#FFFFFF'
                                              }}
                                            >
                                              {categoryName}
                                              {carCount !== null && carCount > 0 && (
                                                <span className="ml-1 opacity-70">({carCount} carros)</span>
                                              )}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-gray-500">Nenhuma etapa cadastrada</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div 
                      className="px-5 py-3 border-t flex items-center justify-between gap-2"
                      style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}
                    >
                      <button
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                        style={{ 
                          background: season.status === 'active' ? '#10B981' : '#6B7280',
                          color: '#FFFFFF'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                        title={season.status === 'active' ? 'Desativar temporada' : 'Ativar temporada'}
                        onClick={() => handleToggleSeasonStatus(season.id, season.status)}
                      >
                        <Power size={16} />
                        <span>{season.status === 'active' ? 'Desativar' : 'Ativar'}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 rounded-lg transition-colors hover:bg-gray-200"
                          title="Editar"
                          onClick={() => handleEditSeason(season.id)}
                        >
                          <Edit2 size={16} className="text-gray-600" />
                        </button>
                        <button
                          className="p-2 rounded-lg transition-colors hover:bg-red-100"
                          title="Excluir"
                          onClick={() => handleDeleteSeason(season.id)}
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Categoria */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        categories={categoryNames}
        carModels={carModels}
        tireModels={tireModels}
        editingCategory={editingCategory}
      />

      {/* Modal de Temporada */}
      <SeasonModal
        isOpen={isSeasonModalOpen}
        onClose={() => {
          setIsSeasonModalOpen(false);
          setEditingSeasonId(null);
          setEditingSeasonData(null);
        }}
        onSave={handleSaveSeason}
        categories={categories}
        editingSeasonId={editingSeasonId}
        initialData={editingSeasonData}
      />

      {/* Modal de Confirmação de Exclusão */}
      {deletingCategoryId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.6)' }}
          onClick={() => setDeletingCategoryId(null)}
        >
          <div 
            className="w-full max-w-md rounded-2xl shadow-2xl"
            style={{ background: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="px-6 py-5 border-b rounded-t-2xl"
              style={{
                background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
                borderColor: '#B00000'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <Trash2 size={20} strokeWidth={2} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Excluir Categoria</h2>
                  <p className="text-sm text-red-100">Esta ação não pode ser desfeita</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-700">
                Tem certeza que deseja excluir esta categoria?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Todas as configurações de pneus e associações serão removidas.
              </p>
            </div>

            {/* Footer */}
            <div 
              className="px-6 py-4 border-t flex items-center justify-end gap-3 rounded-b-2xl"
              style={{
                background: '#F9FAFB',
                borderColor: '#E5E7EB'
              }}
            >
              <button
                onClick={() => setDeletingCategoryId(null)}
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
                onClick={confirmDeleteCategory}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all"
                style={{
                  background: '#D50000',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(213, 0, 0, 0.25)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#B00000';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(213, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#D50000';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(213, 0, 0, 0.25)';
                }}
              >
                <Trash2 size={18} strokeWidth={2} />
                Excluir Categoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}