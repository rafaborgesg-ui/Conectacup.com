import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, Save, X as XIcon, Copy, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { ActionButton } from './ActionFeedback';
import { createClient } from '../utils/supabase/client';
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
  AccessProfile,
  DEFAULT_PROFILES,
  PAGES,
  FEATURES,
  PAGE_LABELS,
  FEATURE_LABELS,
  PAGE_CATEGORIES,
  FEATURE_CATEGORIES,
  PageKey,
  FeatureKey,
  getDynamicPageCategories,
  generatePageLabelsFromMenu,
  diagnoseMissingPages,
} from '../utils/permissions';

export function AccessProfileManagement() {
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    pages: PageKey[];
    features: FeatureKey[];
  }>({
    name: '',
    description: '',
    pages: [],
    features: [],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<AccessProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Categorias dinâmicas geradas do menu
  const [dynamicPageCategories, setDynamicPageCategories] = useState<Record<string, PageKey[]>>(PAGE_CATEGORIES);
  const [dynamicPageLabels, setDynamicPageLabels] = useState<Record<PageKey, string>>(PAGE_LABELS);
  
  const [expandedCategories, setExpandedCategories] = useState<{
    pages: Set<string>;
    features: Set<string>;
  }>({
    pages: new Set(Object.keys(PAGE_CATEGORIES)),
    features: new Set(Object.keys(FEATURE_CATEGORIES)),
  });

  // Carrega categorias dinâmicas do menu
  useEffect(() => {
    console.log('📋 Gerando categorias dinâmicas do menu...');
    try {
      // 🔍 DIAGNÓSTICO AUTO-HEALING
      const diagnosis = diagnoseMissingPages();
      
      if (!diagnosis.success) {
        console.error('⚠️ Problemas de sincronização detectados!');
        diagnosis.suggestions.forEach(s => console.error(s));
        
        toast.error('Páginas não sincronizadas detectadas', {
          description: `${diagnosis.missing.length} problema(s) encontrado(s). Verifique o console.`,
          duration: 10000,
        });
      }
      
      const categories = getDynamicPageCategories();
      const labels = generatePageLabelsFromMenu();
      
      setDynamicPageCategories(categories);
      setDynamicPageLabels(labels);
      
      // Atualiza categorias expandidas para incluir as novas
      setExpandedCategories(prev => ({
        ...prev,
        pages: new Set(Object.keys(categories)),
      }));
      
      console.log('✅ Categorias dinâmicas carregadas:', Object.keys(categories));
    } catch (error) {
      console.error('❌ Erro ao gerar categorias dinâmicas:', error);
    }
  }, []);

  // Carrega perfis do Supabase
  useEffect(() => {
    console.log('🔐 AccessProfileManagement - Carregando perfis do Supabase...');
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      setIsLoading(true);
      
      // Usa Supabase client direto ao invés de Edge Function
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('access_profiles')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('❌ Erro ao carregar perfis:', error);
        throw new Error(error.message);
      }
      
      if (!data || data.length === 0) {
        console.warn('⚠️ Nenhum perfil encontrado no Supabase');
        setProfiles([]);
        return;
      }
      
      // Mapeia para o formato AccessProfile
      const profiles: AccessProfile[] = data.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        pages: Array.isArray(row.pages) ? row.pages : [],
        features: Array.isArray(row.features) ? row.features : [],
        isDefault: row.is_default || false,
        isSystem: row.is_system || false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      
      console.log(`✅ ${profiles.length} perfil(is) carregado(s) do Supabase`);
      setProfiles(profiles);
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar perfis:', error);
      toast.error('Erro ao carregar perfis', {
        description: error?.message || 'Não foi possível carregar os perfis de acesso.',
        duration: 5000,
      });
      
      // Fallback para perfis padrão
      const defaultProfiles: AccessProfile[] = DEFAULT_PROFILES.map(p => ({
        ...p,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setProfiles(defaultProfiles);
    } finally {
      setIsLoading(false);
    }
  }

  // 🔄 SINCRONIZA PÁGINAS: Adiciona automaticamente páginas faltantes ao perfil admin
  async function syncAdminPages() {
    try {
      setIsSyncing(true);
      
      // Pega todas as páginas disponíveis no sistema
      const allPages = Object.values(PAGES);
      
      console.log('🔄 Sincronizando páginas com perfil admin...');
      console.log(`📋 Total de páginas no sistema: ${allPages.length}`);
      
      const supabase = createClient();
      
      // Busca perfil admin atual
      const { data: adminProfile, error: fetchError } = await supabase
        .from('access_profiles')
        .select('*')
        .eq('id', 'admin')
        .single();
      
      if (fetchError) {
        console.error('❌ Erro ao buscar perfil admin:', fetchError);
        throw new Error(fetchError.message);
      }
      
      const currentPages = Array.isArray(adminProfile.pages) ? adminProfile.pages : [];
      const missingPages = allPages.filter(p => !currentPages.includes(p));
      
      if (missingPages.length === 0) {
        toast.success('✅ Já sincronizado!', {
          description: `Perfil admin já tem todas as ${allPages.length} páginas.`,
        });
        return;
      }
      
      console.log(`⚠️  Páginas faltantes (${missingPages.length}):`, missingPages);
      
      // Atualiza perfil admin com todas as páginas
      const { error: updateError } = await supabase
        .from('access_profiles')
        .update({
          pages: allPages,
          features: Object.values(FEATURES), // Também atualiza features
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'admin');
      
      if (updateError) {
        console.error('❌ Erro ao atualizar perfil admin:', updateError);
        throw new Error(updateError.message);
      }
      
      toast.success('🔄 Perfil sincronizado!', {
        description: `${missingPages.length} páginas adicionadas ao perfil Administrador.`,
        duration: 5000,
      });
      
      // Recarrega perfis
      await loadProfiles();
      
    } catch (error: any) {
      console.error('❌ Erro ao sincronizar páginas:', error);
      toast.error('Erro ao sincronizar', {
        description: error?.message || 'Não foi possível sincronizar as páginas.',
        duration: 5000,
      });
    } finally {
      setIsSyncing(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome obrigatório', {
        description: 'Digite um nome para o perfil.',
      });
      return;
    }

    if (formData.pages.length === 0) {
      toast.error('Selecione ao menos uma página', {
        description: 'O perfil precisa ter acesso a pelo menos uma página.',
      });
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();
      
      if (editingId) {
        // Busca o perfil original para preservar flags do sistema
        const originalProfile = profiles.find(p => p.id === editingId);
        
        // Atualiza perfil existente
        const { error } = await supabase
          .from('access_profiles')
          .update({
            name: formData.name,
            description: formData.description,
            pages: formData.pages,
            features: formData.features,
            is_default: originalProfile?.isDefault || false,
            is_system: originalProfile?.isSystem || false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
        
        if (error) {
          console.error('❌ Erro ao atualizar perfil:', error);
          throw new Error(error.message);
        }
        
        toast.success('✅ Perfil atualizado', {
          description: `${formData.name} foi atualizado com sucesso.`,
        });
        setEditingId(null);
      } else {
        // Cria novo perfil
        const newId = `profile-${Date.now()}`;
        const now = new Date().toISOString();
        
        const { error } = await supabase
          .from('access_profiles')
          .insert({
            id: newId,
            name: formData.name,
            description: formData.description,
            pages: formData.pages,
            features: formData.features,
            is_default: false,
            is_system: false,
            created_at: now,
            updated_at: now,
          });
        
        if (error) {
          console.error('❌ Erro ao criar perfil:', error);
          throw new Error(error.message);
        }
        
        toast.success('✅ Perfil criado', {
          description: `${formData.name} foi criado com sucesso.`,
        });
      }

      // Recarrega lista de perfis
      await loadProfiles();
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      
      toast.error('Erro ao salvar perfil', {
        description: error?.message || 'Não foi possível salvar o perfil.',
        duration: 8000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (profile: AccessProfile) => {
    // Permissão para editar todos os perfis, incluindo os do sistema
    setFormData({
      name: profile.name,
      description: profile.description,
      pages: [...profile.pages],
      features: [...profile.features],
    });
    setEditingId(profile.id);
  };

  const handleClone = (profile: AccessProfile) => {
    setFormData({
      name: `${profile.name} (Cópia)`,
      description: profile.description,
      pages: [...profile.pages],
      features: [...profile.features],
    });
    setEditingId(null);
    toast.success('Perfil clonado', {
      description: 'Edite e salve para criar um novo perfil.',
    });
  };

  const handleDeleteClick = (profile: AccessProfile) => {
    // REMOVIDO: Bloqueio de exclusão de perfis de sistema
    // Agora permite deletar qualquer perfil, incluindo os de sistema
    // if (profile.isSystem) {
    //   toast.error('Operação não permitida', {
    //     description: 'Perfis do sistema não podem ser excluídos.',
    //   });
    //   return;
    // }

    setProfileToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!profileToDelete) return;

    setIsDeleting(true);

    try {
      const supabase = createClient();
      
      // Deleta perfil
      const { error } = await supabase
        .from('access_profiles')
        .delete()
        .eq('id', profileToDelete.id);
      
      if (error) {
        console.error('❌ Erro ao excluir perfil:', error);
        throw new Error(error.message);
      }
      
      toast.success('🗑️ Perfil excluído', {
        description: `${profileToDelete.name} foi removido.`,
      });
      
      // Recarrega lista de perfis
      await loadProfiles();
    } catch (error: any) {
      console.error('Erro ao excluir perfil:', error);
      toast.error('Erro ao excluir perfil', {
        description: error?.message || 'Não foi possível excluir o perfil.',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setProfileToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      pages: [],
      features: [],
    });
    setEditingId(null);
  };

  const togglePage = (page: PageKey) => {
    setFormData(prev => ({
      ...prev,
      pages: prev.pages.includes(page)
        ? prev.pages.filter(p => p !== page)
        : [...prev.pages, page],
    }));
  };

  const toggleFeature = (feature: FeatureKey) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const toggleCategoryPages = (category: string, pages: PageKey[]) => {
    const allSelected = pages.every(p => formData.pages.includes(p));
    if (allSelected) {
      // Remove todos
      setFormData(prev => ({
        ...prev,
        pages: prev.pages.filter(p => !pages.includes(p)),
      }));
    } else {
      // Adiciona todos
      setFormData(prev => ({
        ...prev,
        pages: [...new Set([...prev.pages, ...pages])],
      }));
    }
  };

  const toggleCategoryFeatures = (category: string, features: FeatureKey[]) => {
    const allSelected = features.every(f => formData.features.includes(f));
    if (allSelected) {
      // Remove todos
      setFormData(prev => ({
        ...prev,
        features: prev.features.filter(f => !features.includes(f)),
      }));
    } else {
      // Adiciona todos
      setFormData(prev => ({
        ...prev,
        features: [...new Set([...prev.features, ...features])],
      }));
    }
  };

  const toggleCategory = (type: 'pages' | 'features', category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev[type]);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return {
        ...prev,
        [type]: newSet,
      };
    });
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl lg:mx-auto w-full">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-gray-900 mb-1 sm:mb-2 text-xl sm:text-2xl lg:text-3xl">Perfis de Acesso</h1>
          <p className="text-gray-500 text-sm sm:text-base">Configure perfis de acesso e permissões do sistema</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Form */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm lg:sticky lg:top-4">
              <h2 className="text-gray-900 mb-4 sm:mb-6 text-base sm:text-lg">
                {editingId ? 'Editar Perfil' : 'Novo Perfil'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="profile-name">Nome do Perfil *</Label>
                  <Input
                    id="profile-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Gerente de Operações"
                    className="mt-1.5"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="profile-description">Descrição</Label>
                  <Input
                    id="profile-description"
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Breve descrição do perfil"
                    className="mt-1.5"
                  />
                </div>

                {/* Páginas */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="block">
                      Páginas Acessíveis ({formData.pages.length})
                      <span className="ml-2 text-xs text-gray-500">
                        (Sincronizado com menu)
                      </span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log('🔄 Recarregando páginas dinâmicas...');
                        const categories = getDynamicPageCategories();
                        const labels = generatePageLabelsFromMenu();
                        setDynamicPageCategories(categories);
                        setDynamicPageLabels(labels);
                        setExpandedCategories(prev => ({
                          ...prev,
                          pages: new Set(Object.keys(categories)),
                        }));
                        toast.success('Páginas atualizadas!');
                      }}
                      title="Recarregar lista de páginas do menu"
                    >
                      <RefreshCw size={14} className="mr-1" />
                      <span className="text-xs">Atualizar</span>
                    </Button>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                    {Object.entries(dynamicPageCategories).map(([category, pages]) => {
                      const isExpanded = expandedCategories.pages.has(category);
                      const allSelected = pages.every(p => formData.pages.includes(p));
                      const someSelected = pages.some(p => formData.pages.includes(p));

                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleCategory('pages', category)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() => toggleCategoryPages(category, pages as PageKey[])}
                              className={someSelected && !allSelected ? 'opacity-50' : ''}
                            />
                            <span className="text-sm font-medium text-gray-700">{category}</span>
                          </div>
                          {isExpanded && (
                            <div className="ml-8 space-y-1.5">
                              {pages.map(page => (
                                <div key={page} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={formData.pages.includes(page)}
                                    onCheckedChange={() => togglePage(page)}
                                  />
                                  <span className="text-sm text-gray-600">{dynamicPageLabels[page] || PAGE_LABELS[page] || page}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Funcionalidades */}
                <div>
                  <Label className="mb-3 block">Funcionalidades ({formData.features.length})</Label>
                  <div className="border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                    {Object.entries(FEATURE_CATEGORIES).map(([category, features]) => {
                      const isExpanded = expandedCategories.features.has(category);
                      const allSelected = features.every(f => formData.features.includes(f));
                      const someSelected = features.some(f => formData.features.includes(f));

                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleCategory('features', category)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() => toggleCategoryFeatures(category, features as FeatureKey[])}
                              className={someSelected && !allSelected ? 'opacity-50' : ''}
                            />
                            <span className="text-sm font-medium text-gray-700">{category}</span>
                          </div>
                          {isExpanded && (
                            <div className="ml-8 space-y-1.5">
                              {features.map(feature => (
                                <div key={feature} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={formData.features.includes(feature)}
                                    onCheckedChange={() => toggleFeature(feature)}
                                  />
                                  <span className="text-sm text-gray-600">{FEATURE_LABELS[feature]}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <ActionButton
                    type="submit"
                    isLoading={isSaving}
                    loadingText={editingId ? 'Atualizando...' : 'Salvando...'}
                    variant="primary"
                    icon={editingId ? <Edit2 size={16} /> : <Plus size={16} />}
                    className="flex-1"
                  >
                    {editingId ? 'Atualizar' : 'Adicionar'}
                  </ActionButton>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3 sm:gap-4">
                  <div>
                    <h3 className="text-gray-900 text-base sm:text-lg">Perfis Cadastrados</h3>
                    <p className="text-gray-500 text-xs sm:text-sm">
                      {profiles.length} {profiles.length === 1 ? 'perfil' : 'perfis'} configurado(s)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <ActionButton
                      variant="outline"
                      size="sm"
                      onClick={syncAdminPages}
                      isLoading={isSyncing}
                      loadingText="Sincronizando..."
                      title="Sincronizar todas as páginas do menu com o perfil Administrador"
                      icon={<RefreshCw size={16} />}
                    >
                      Sincronizar Páginas
                    </ActionButton>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadProfiles}
                      disabled={isLoading}
                      title="Recarregar perfis do Supabase"
                    >
                      <RefreshCw size={16} className={isLoading ? 'animate-spin mr-2' : 'mr-2'} />
                      Atualizar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <p className="text-gray-600 text-sm mt-3">Carregando perfis...</p>
                  </div>
                ) : profiles.length === 0 ? (
                  <div className="p-8 text-center">
                    <Shield className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <h3 className="text-gray-900 mb-1">Nenhum perfil encontrado</h3>
                    <p className="text-gray-600 text-sm">Crie o primeiro perfil de acesso</p>
                  </div>
                ) : profiles.map((profile) => (
                  <div key={profile.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-gray-900 font-medium truncate">{profile.name}</h4>
                          {profile.isSystem && (
                            <Badge variant="secondary" className="text-xs">Sistema</Badge>
                          )}
                          {profile.isDefault && (
                            <Badge variant="outline" className="text-xs">Padrão</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{profile.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {profile.pages.length} páginas
                          </Badge>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {profile.features.length} funcionalidades
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClone(profile)}
                          title="Clonar perfil"
                        >
                          <Copy size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(profile)}
                          title="Editar perfil"
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(profile)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Excluir perfil"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Perfil</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o perfil "{profileToDelete?.name}"? Esta ação não pode ser desfeita.
              {/* TODO: Adicionar verificação se há usuários usando este perfil */}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}