import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { UserPlus, Trash2, RefreshCw, Shield, User as UserIcon, Mail, Eye, EyeOff, Calendar, Edit, Save, X, Users as UsersIcon, Settings, Edit2, Plus, User, Search } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ActionButton } from './ActionFeedback';
import { TableLoadingState } from './UniversalLoadingState';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';
import { getAccessToken, createClient } from '../utils/supabase/client';
import { AccessProfile, DEFAULT_PROFILES, FEATURES } from '../utils/permissions';
import { ProtectedButton, ConditionalFeature } from './ProtectedRoute';
import { usePermissions } from '../utils/usePermissions';
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

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: 'admin' | 'operator';
  profileId?: string; // Novo campo para perfil de acesso
  active: boolean;
  createdAt: string;
}

// ============================================
// FUNÇÕES DE API - Integração Supabase
// ============================================

async function fetchUsers(): Promise<User[]> {
  try {
    const token = await getAccessToken();
    
    if (!token) {
      throw new Error('Token não encontrado. Faça login novamente.');
    }
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/users`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10s timeout
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao buscar usuários:', response.status, errorText);
      
      if (response.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      if (response.status === 403) {
        throw new Error('Acesso negado. Apenas administradores podem visualizar usuários.');
      }
      throw new Error(`Erro ao buscar usuários: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao buscar usuários');
    }
    
    console.log('✅ Usuários carregados:', result.data?.length || 0);
    return result.data || [];
  } catch (error: any) {
    console.error('Error fetching users:', error);
    
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error('Timeout: Servidor não respondeu. Verifique sua conexão.');
    }
    
    throw error;
  }
}

async function createUser(userData: {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'operator';
  username: string;
}): Promise<User> {
  try {
    const token = await getAccessToken();
    
    if (!token) {
      throw new Error('Token não encontrado');
    }
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/users`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao criar usuário');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  try {
    const token = await getAccessToken();
    
    if (!token) {
      throw new Error('Token não encontrado');
    }
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/users/${userId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao atualizar usuário');
    }
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw error;
  }
}

async function deleteUser(userId: string): Promise<void> {
  try {
    const token = await getAccessToken();
    
    if (!token) {
      throw new Error('Token não encontrado');
    }
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/users/${userId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao deletar usuário');
    }
  } catch (error) {
    console.error('Error in deleteUser:', error);
    throw error;
  }
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState(''); // Campo de busca
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false); // Novo: controla modal do formulário no mobile
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    name: '',
    role: 'operator' as 'admin' | 'operator',
    profileId: 'operator', // Novo: perfil padrão
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showProfileManagement, setShowProfileManagement] = useState(false); // Novo: modal de perfis

  // Filtra usuários baseado no termo de busca
  const filteredUsers = users.filter(user => {
    if (!searchTerm.trim()) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.username.toLowerCase().includes(search) ||
      user.role.toLowerCase().includes(search)
    );
  });

  // Carrega perfis disponíveis do Supabase
  useEffect(() => {
    loadProfiles();
  }, []);

  // Carrega usuários do Supabase
  useEffect(() => {
    checkAdminAndLoadUsers();
  }, []);

  async function loadProfiles() {
    try {
      const token = await getAccessToken();
      
      if (!token) {
        console.warn('⚠️ Sem token - usando perfis padrão');
        setProfiles(DEFAULT_PROFILES as AccessProfile[]);
        return;
      }
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/access-profiles`;
      console.log('📡 Carregando perfis de:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Status da resposta:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ Erro ao carregar perfis do Supabase (${response.status}):`, errorText);
        console.warn('📦 Usando perfis padrão como fallback');
        setProfiles(DEFAULT_PROFILES as AccessProfile[]);
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log(`✅ ${result.data.length} perfis carregados do Supabase`);
        setProfiles(result.data);
      } else {
        console.warn('⚠️ Resposta inválida - usando perfis padrão');
        console.warn('📦 Resposta recebida:', result);
        setProfiles(DEFAULT_PROFILES as AccessProfile[]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar perfis:', error);
      console.warn('📦 Usando perfis padrão como fallback');
      // Fallback para perfis padrão
      setProfiles(DEFAULT_PROFILES as AccessProfile[]);
    }
  }

  // Verifica se usuário é admin antes de carregar
  async function checkAdminAndLoadUsers() {
    try {
      setIsLoading(true);
      
      // Primeiro verifica se o usuário é admin
      const token = await getAccessToken();
      
      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      
      console.log('🔍 Verificando permissões de admin...');
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/users/me`;
      console.log('📡 Verificando em:', url);
      
      const meResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Status da resposta /me:', meResponse.status, meResponse.statusText);
      
      if (!meResponse.ok) {
        const errorText = await meResponse.text();
        console.error(`❌ Erro ao verificar permissões (${meResponse.status}):`, errorText);
        throw new Error(`Erro ao verificar permissões (${meResponse.status})`);
      }
      
      const meResult = await meResponse.json();
      
      console.log('📦 Resposta /me:', meResult);
      
      if (!meResult.success) {
        console.error('❌ Resposta /me com success=false:', meResult.error);
        throw new Error(meResult.error || 'Erro ao verificar permissões');
      }
      
      console.log(`👤 Usuário: ${meResult.data.email} | Role: ${meResult.data.role} | Admin: ${meResult.data.isAdmin}`);
      
      if (!meResult.data.isAdmin) {
        throw new Error('Acesso negado. Apenas administradores podem visualizar usuários.');
      }
      
      // Se é admin, carrega usuários
      await loadUsers();
      
    } catch (error: any) {
      console.error('Error checking admin status:', error);
      
      toast.error('Erro ao carregar usuários', {
        description: error?.message || 'Não foi possível verificar suas permissões.',
        duration: 5000
      });
      
      setUsers([]);
      setIsLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const data = await fetchUsers();
      setUsers(data);
      console.log(`✅ ${data.length} usuário(s) carregado(s) do Supabase Auth`);
    } catch (error: any) {
      console.error('Error loading users:', error);
      
      let errorMessage = 'Não foi possível carregar os usuários.';
      
      if (error?.message?.includes('Sessão expirada') || error?.message?.includes('Token não encontrado')) {
        errorMessage = 'Sessão expirada. Faça login novamente.';
      } else if (error?.message?.includes('Acesso negado') || error?.message?.includes('403')) {
        errorMessage = 'Acesso negado. Apenas administradores podem visualizar usuários.';
      } else if (error?.message?.includes('Timeout')) {
        errorMessage = 'Servidor não respondeu. Verifique sua conexão e tente novamente.';
      }
      
      toast.error('Erro ao carregar usuários', {
        description: errorMessage,
        duration: 5000
      });
      
      // Define lista vazia em caso de erro
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Reset página quando usuários mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [users.length, itemsPerPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação: email e nome sempre obrigatórios, senha apenas em novo cadastro
    if (!formData.email.trim() || !formData.name.trim() || (!editingId && !formData.password.trim())) {
      toast.error('Campos obrigatórios', {
        description: 'Preencha todos os campos obrigatórios.',
        duration: 4000,
      });
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Email inválido', {
        description: 'Digite um email válido.',
        duration: 4000,
      });
      return;
    }

    // Verifica se email já existe (exceto se estiver editando o mesmo usuário)
    const emailExists = users.some(
      u => u.email.toLowerCase() === formData.email.toLowerCase() && u.id !== editingId
    );

    if (emailExists && !editingId) {
      toast.error('Email já cadastrado', {
        description: 'Este email já está em uso.',
        duration: 4000,
      });
      return;
    }

    setIsSaving(true);

    try {
      if (editingId) {
        // Atualiza usuário existente
        const updates: any = {
          email: formData.email,
          username: formData.username || formData.email.split('@')[0],
          name: formData.name,
          role: formData.role,
          profileId: formData.profileId, // Novo: perfil de acesso
          active: true
        };
        
        // Só inclui senha se foi fornecida
        if (formData.password.trim()) {
          updates.password = formData.password;
        }
        
        console.log('🔐 Atualizando usuário com profileId:', formData.profileId);
        console.log('📤 Dados enviados:', updates);
        
        await updateUser(editingId, updates);
        
        toast.success('✅ Usuário atualizado', {
          description: `${formData.name} foi atualizado com sucesso.`,
          duration: 3000,
        });
        setEditingId(null);
      } else {
        // Cria novo usuário
        await createUser({
          email: formData.email,
          username: formData.username || formData.email.split('@')[0],
          password: formData.password,
          name: formData.name,
          role: formData.role,
          profileId: formData.profileId, // Novo: perfil de acesso
        } as any);
        
        toast.success('✅ Usuário criado no Supabase', {
          description: `${formData.name} foi criado com sucesso e pode fazer login.`,
          duration: 4000,
        });
      }
      
      // Recarrega lista de usuários
      await loadUsers();
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Erro ao salvar usuário', {
        description: error.message,
        duration: 4000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (user: User) => {
    setFormData({
      email: user.email,
      username: user.username,
      password: '', // Não preenche senha ao editar
      name: user.name,
      role: user.role,
      profileId: user.profileId || user.role, // Usa profileId ou role como fallback
    });
    setEditingId(user.id);
    setShowFormModal(true); // Abre modal no mobile
  };

  const handleDeleteClick = (user: User) => {
    // Não permitir deletar o único admin
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (user.role === 'admin' && adminCount === 1) {
      toast.error('Operação não permitida', {
        description: 'Não é possível excluir o único administrador do sistema.',
      });
      return;
    }

    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);

    try {
      await deleteUser(userToDelete.id);
      
      toast.success('🗑️ Usuário excluído do Supabase', {
        description: `${userToDelete.name} foi removido do sistema.`,
        duration: 3000,
      });
      
      // Recarrega lista
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário', {
        description: error.message,
        duration: 4000,
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setUserToDelete(null);
    }
  };

  const toggleUserStatus = async (user: User) => {
    // Não permitir desativar o único admin ativo
    const activeAdminCount = users.filter(u => u.role === 'admin' && u.active).length;
    if (user.role === 'admin' && user.active && activeAdminCount === 1) {
      toast.error('⛔ Operação não permitida', {
        description: 'Não é possível desativar o único administrador ativo.',
        duration: 4000,
      });
      return;
    }

    try {
      await updateUser(user.id, {
        active: !user.active
      });
      
      toast.success(`${user.active ? '🔴' : '🟢'} Usuário ${user.active ? 'desativado' : 'ativado'}`, {
        description: `${user.name} foi ${user.active ? 'desativado' : 'ativado'}.`,
        duration: 3000,
      });
      
      // Recarrega lista
      await loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Erro ao atualizar status', {
        description: error.message,
        duration: 4000,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      username: '',
      password: '',
      name: '',
      role: 'operator',
      profileId: 'operator', // Novo: reseta para perfil padrão
    });
    setEditingId(null);
    setShowPassword(false);
    setShowFormModal(false); // Fecha modal no mobile
  };

  // Loading State
  if (isLoading) {
    return <TableLoadingState title="Gerenciar Usuários" icon={UsersIcon} text="Carregando usuários..." tableRows={10} tableColumns={6} />;
  }

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden pb-20 lg:pb-8">
      <div className="max-w-7xl lg:mx-auto w-full">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-gray-900 mb-1 sm:mb-2 text-2xl sm:text-3xl font-bold">Gerenciar Usuários</h1>
              <p className="text-gray-600 text-sm sm:text-base">Gerencie os usuários e permissões do sistema</p>
              {users.length === 0 && !isLoading && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ Nenhum usuário encontrado. Verifique o console (F12) para diagnóstico.
                </p>
              )}
            </div>
            {/* Botão adicionar no desktop */}
            <div className="hidden lg:flex flex-col gap-2">
              <Button
                onClick={() => {
                  resetForm();
                  setShowFormModal(true);
                }}
                className="bg-[#D50000] hover:bg-[#B00000]"
              >
                <UserPlus size={18} className="mr-2" />
                Novo Usuário
              </Button>
            </div>
          </div>
          
          {/* Campo de Busca */}
          {users.length > 0 && (
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Buscar usuário..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-10 h-11 text-base"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              {searchTerm && (
                <p className="text-sm text-gray-600 mt-2 font-medium">
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'resultado' : 'resultados'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Layout: Form como modal no mobile, sidebar no desktop */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 mt-4 sm:mt-6">
          {/* Form - Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-4">
              <h2 className="text-gray-900 mb-4 sm:mb-6 text-base sm:text-lg">
                {editingId ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: João Silva"
                    className="mt-1.5"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ex: joao.silva@exemplo.com"
                    className="mt-1.5"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este será o email de login no sistema
                  </p>
                </div>

                <div>
                  <Label htmlFor="username">Nome de Usuário (Opcional)</Label>
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Ex: joao.silva (deixe vazio para usar email)"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingId ? "Digite nova senha (deixe vazio para manter)" : "Digite a senha"}
                      className="pr-10"
                      required={!editingId}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {editingId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Deixe vazio para manter a senha atual
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="profileId">Perfil de Acesso *</Label>
                  <Select
                    value={formData.profileId}
                    onValueChange={(value) => {
                      setFormData({ 
                        ...formData, 
                        profileId: value,
                        role: value === 'admin' ? 'admin' : 'operator' // Mantém compatibilidade
                      });
                    }}
                  >
                    <SelectTrigger id="profileId" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          <div className="flex items-center gap-2">
                            {profile.id === 'admin' ? <Shield size={16} /> : <User size={16} />}
                            <div className="flex flex-col">
                              <span>{profile.name}</span>
                              {profile.description && (
                                <span className="text-xs text-gray-500">{profile.description}</span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      {profiles.find(p => p.id === formData.profileId)?.pages.length || 0} páginas, {' '}
                      {profiles.find(p => p.id === formData.profileId)?.features.length || 0} funcionalidades
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowProfileManagement(true)}
                      className="text-xs h-auto py-1 px-2"
                    >
                      <Settings size={14} className="mr-1" />
                      Gerenciar Perfis
                    </Button>
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
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
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3 sm:gap-4">
                  <div>
                    <h3 className="text-gray-900 text-base sm:text-lg">Usuários Cadastrados</h3>
                    <p className="text-gray-500 text-xs sm:text-sm">
                      {users.length} {users.length === 1 ? 'usuário' : 'usuários'} no sistema
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkAdminAndLoadUsers}
                      disabled={isLoading}
                      title="Recarregar lista de usuários do Supabase Auth"
                      className="flex-1 sm:flex-none"
                    >
                      <RefreshCw size={16} className={isLoading ? 'animate-spin mr-2' : 'mr-2'} />
                      <span className="sm:inline">Atualizar</span>
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">Por página:</span>
                      <span className="text-xs sm:text-sm text-gray-500 sm:hidden">Itens:</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                        <SelectTrigger className="w-16 sm:w-20 h-8 sm:h-9 text-xs sm:text-sm">
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
              </div>

              <div>
                {isLoading ? (
                  <div className="p-8 sm:p-12 text-center">
                    <div className="w-12 h-12 border-4 border-[#D50000] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Carregando usuários...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-6 sm:p-12 text-center max-w-2xl mx-auto">
                    <UsersIcon size={40} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                    <p className="text-gray-600 mb-2 text-sm sm:text-base">Nenhum usuário encontrado</p>
                    
                    <div className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 space-y-2">
                      <p>Os usuários são gerenciados na tabela <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">auth.users</code> do Supabase</p>
                      <p className="text-xs hidden sm:block">Verifique o console do navegador (F12) para diagnóstico detalhado</p>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 text-left">
                      <h4 className="text-xs sm:text-sm text-yellow-900 mb-2">🔍 Possíveis causas:</h4>
                      <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                        <li>Você não é administrador</li>
                        <li>Não há usuários cadastrados</li>
                        <li>Erro de conexão</li>
                        <li className="hidden sm:list-item">Token de autenticação expirado</li>
                      </ul>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 text-left">
                      <h4 className="text-xs sm:text-sm text-green-900 mb-2">💡 Solução Rápida:</h4>
                      <p className="text-xs text-green-800 mb-3">
                        Clique em "Criar Usuários de Teste" para gerar 3 usuários:
                      </p>
                      <ul className="text-xs text-green-800 space-y-1 list-disc list-inside ml-2">
                        <li className="break-all"><strong>admin@porschegt3cup.com.br</strong> (Admin123!)</li>
                        <li className="break-all hidden sm:list-item"><strong>operador1@porschegt3cup.com.br</strong> (Operador123!)</li>
                        <li className="break-all hidden sm:list-item"><strong>operador2@porschegt3cup.com.br</strong> (Operador123!)</li>
                        <li className="sm:hidden">+ 2 operadores</li>
                      </ul>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={checkAdminAndLoadUsers}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                      >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin mr-2' : 'mr-2'} />
                        Recarregar
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={async () => {
                          console.log('');
                          console.log('=== 🔍 DEBUG: Gerenciamento de Usuários ===');
                          console.log('Project ID:', projectId);
                          console.log('API Base URL:', `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c`);
                          
                          const token = await getAccessToken();
                          console.log('Token existe:', !!token);
                          
                          if (token) {
                            console.log('Token (primeiros 20 chars):', token.substring(0, 20) + '...');
                            
                            // Testa endpoint /me
                            try {
                              console.log('\n📡 Testando endpoint /users/me...');
                              const meResponse = await fetch(
                                `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/users/me`,
                                {
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                  }
                                }
                              );
                              
                              console.log('Status:', meResponse.status, meResponse.statusText);
                              const meData = await meResponse.json();
                              console.log('Resposta:', meData);
                              
                              if (meData.success) {
                                console.log('✅ Você está autenticado como:', meData.data.email);
                                console.log('✅ Role:', meData.data.role);
                                console.log('✅ É Admin?', meData.data.isAdmin);
                              } else {
                                console.error('❌ Erro:', meData.error);
                              }
                            } catch (err) {
                              console.error('❌ Erro ao testar endpoint:', err);
                            }
                          } else {
                            console.error('❌ Token não encontrado. Faça login novamente.');
                          }
                          
                          console.log('');
                          console.log('💡 Dica: Verifique os logs do servidor em:');
                          console.log(`   https://supabase.com/dashboard/project/${projectId}/functions`);
                          console.log('=== FIM DEBUG ===');
                          console.log('');
                          
                          toast.info('Debug completo', {
                            description: 'Informações detalhadas enviadas para o console (F12)',
                            duration: 5000
                          });
                        }}
                      >
                        🔍 Diagnóstico Completo
                      </Button>
                      
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-[#D50000] hover:bg-[#B00000] w-full sm:w-auto"
                        onClick={async () => {
                          try {
                            setIsLoading(true);
                            
                            toast.info('Criando usuários de teste...', {
                              description: 'Aguarde alguns segundos'
                            });
                            
                            const token = await getAccessToken();
                            
                            if (!token) {
                              throw new Error('Sessão expirada. Faça login novamente.');
                            }
                            
                            // Cria 3 usuários de teste
                            const testUsers = [
                              {
                                email: 'admin@porschegt3cup.com.br',
                                password: 'Admin123!',
                                name: 'Administrador',
                                role: 'admin',
                                username: 'admin'
                              },
                              {
                                email: 'operador1@porschegt3cup.com.br',
                                password: 'Operador123!',
                                name: 'Operador 1',
                                role: 'operator',
                                username: 'operador1'
                              },
                              {
                                email: 'operador2@porschegt3cup.com.br',
                                password: 'Operador123!',
                                name: 'Operador 2',
                                role: 'operator',
                                username: 'operador2'
                              }
                            ];
                            
                            console.log('🎯 Criando usuários de teste...');
                            
                            for (const user of testUsers) {
                              try {
                                await createUser(user);
                                console.log(`✅ Usuário criado: ${user.email}`);
                              } catch (err: any) {
                                // Se já existe, ignora
                                if (err?.message?.includes('already exists') || err?.message?.includes('já existe')) {
                                  console.log(`⚠️ Usuário já existe: ${user.email}`);
                                } else {
                                  console.error(`❌ Erro ao criar ${user.email}:`, err);
                                }
                              }
                            }
                            
                            // Recarrega usuários
                            await loadUsers();
                            
                            toast.success('Usuários de teste criados!', {
                              description: 'admin@porschegt3cup.com.br (Admin123!)'
                            });
                            
                          } catch (error: any) {
                            console.error('Erro ao criar usuários de teste:', error);
                            toast.error('Erro ao criar usuários', {
                              description: error?.message || 'Não foi possível criar os usuários de teste'
                            });
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading}
                      >
                        <Plus size={16} className="mr-2" />
                        Criar Usuários de Teste
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table - Hidden on mobile */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                              Usuário
                            </th>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                              Tipo
                            </th>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((user) => (
                            <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${!user.active ? 'opacity-60' : ''}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    user.role === 'admin' ? 'bg-red-100' : 'bg-gray-100'
                                  }`}>
                                    {user.role === 'admin' ? (
                                      <Shield size={20} className="text-[#D50000]" />
                                    ) : (
                                      <User size={20} className="text-gray-600" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-sm text-gray-900">{user.name}</div>
                                    <div className="text-xs text-gray-500">
                                      Criado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">{user.email}</div>
                                {user.username && user.username !== user.email.split('@')[0] && (
                                  <div className="text-xs text-gray-500">@{user.username}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <Badge
                                    variant="secondary"
                                    className={user.role === 'admin' 
                                      ? 'bg-red-100 text-[#D50000]' 
                                      : 'bg-gray-100 text-gray-700'
                                    }
                                  >
                                    {profiles.find(p => p.id === (user.profileId || user.role))?.name || (user.role === 'admin' ? 'Administrador' : 'Operador')}
                                  </Badge>
                                  {user.profileId && user.profileId !== user.role && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Perfil personalizado
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => toggleUserStatus(user)}
                                  className="focus:outline-none"
                                >
                                  <Badge
                                    variant="secondary"
                                    className={user.active 
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer' 
                                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer'
                                    }
                                  >
                                    {user.active ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEdit(user)}
                                    className="p-2 text-gray-400 hover:text-[#D50000] transition-colors rounded-lg hover:bg-gray-100"
                                    title="Editar usuário"
                                  >
                                    <Edit2 size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(user)}
                                    className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
                                    title="Excluir usuário"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards - Otimizado para UX móvel */}
                    <div className="lg:hidden">
                      {filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((user) => (
                        <div
                          key={user.id}
                          className={`p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 active:bg-gray-100 transition-colors ${!user.active ? 'opacity-60' : ''}`}
                        >
                          {/* Header do Card */}
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                              user.role === 'admin' ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
                            }`}>
                              {user.role === 'admin' ? (
                                <Shield size={24} className="text-white" />
                              ) : (
                                <User size={24} className="text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 mb-1 text-base truncate">{user.name}</h4>
                              <p className="text-sm text-gray-600 mb-2 truncate">{user.email}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className={user.role === 'admin'
                                    ? 'bg-red-50 text-red-700 border border-red-200 font-medium'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200 font-medium'
                                  }
                                >
                                  {user.role === 'admin' ? 'Administrador' : 'Operador'}
                                </Badge>
                                <button
                                  onClick={() => toggleUserStatus(user)}
                                  className="focus:outline-none touch-manipulation"
                                >
                                  <Badge
                                    variant="secondary"
                                    className={user.active
                                      ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 cursor-pointer font-medium'
                                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 cursor-pointer font-medium'
                                    }
                                  >
                                    {user.active ? '● Ativo' : '○ Inativo'}
                                  </Badge>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Data de criação */}
                          <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                            <Calendar size={12} />
                            Criado em {new Date(user.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>

                          {/* Botões de ação - Maiores e mais acessíveis */}
                          <div className="flex gap-2">
                            <Button
                              size="default"
                              variant="outline"
                              onClick={() => handleEdit(user)}
                              className="flex-1 h-11 font-medium touch-manipulation"
                            >
                              <Edit2 size={16} className="mr-2" />
                              Editar
                            </Button>
                            <Button
                              size="default"
                              variant="outline"
                              onClick={() => handleDeleteClick(user)}
                              className="flex-1 h-11 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 font-medium touch-manipulation"
                            >
                              <Trash2 size={16} className="mr-2" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Pagination - Otimizada para mobile */}
              {filteredUsers.length > 0 && (
                <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-gray-600 text-center sm:text-left font-medium">
                    {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} de {filteredUsers.length}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                    >
                      ← Anterior
                    </button>
                    <span className="text-sm text-gray-700 px-3 font-semibold bg-gray-50 rounded-lg py-2.5 min-w-[60px] text-center">
                      {currentPage}/{Math.ceil(filteredUsers.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredUsers.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(filteredUsers.length / itemsPerPage)}
                      className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                    >
                      Próxima →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <ActionButton
              onClick={confirmDelete}
              isLoading={isDeleting}
              loadingText="Excluindo..."
              variant="destructive"
              icon={<Trash2 size={16} />}
              disabled={isDeleting}
            >
              Excluir
            </ActionButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FAB - Floating Action Button (Mobile Only) */}
      <button
        onClick={() => {
          resetForm();
          setShowFormModal(true);
        }}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-[#D50000] to-[#B00000] text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center z-50 touch-manipulation"
        aria-label="Adicionar novo usuário"
      >
        <UserPlus size={24} />
      </button>

      {/* Mobile Form Modal */}
      <AlertDialog open={showFormModal} onOpenChange={setShowFormModal}>
        <AlertDialogContent className="lg:hidden max-w-[95vw] max-h-[90vh] overflow-y-auto p-0">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-bold text-gray-900">
              {editingId ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            <button
              onClick={() => setShowFormModal(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="mobile-name">Nome Completo *</Label>
                <Input
                  id="mobile-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: João Silva"
                  className="mt-1.5 h-11"
                  required
                />
              </div>

              <div>
                <Label htmlFor="mobile-email">Email *</Label>
                <Input
                  id="mobile-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ex: joao.silva@exemplo.com"
                  className="mt-1.5 h-11"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este será o email de login no sistema
                </p>
              </div>

              <div>
                <Label htmlFor="mobile-username">Nome de Usuário (Opcional)</Label>
                <Input
                  id="mobile-username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Ex: joao.silva"
                  className="mt-1.5 h-11"
                />
              </div>

              <div>
                <Label htmlFor="mobile-password">Senha *</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="mobile-password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingId ? "Nova senha (deixe vazio para manter)" : "Digite a senha"}
                    className="pr-12 h-11"
                    required={!editingId}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 touch-manipulation"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {editingId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Deixe vazio para manter a senha atual
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="mobile-profileId">Perfil de Acesso *</Label>
                <Select
                  value={formData.profileId}
                  onValueChange={(value) => {
                    setFormData({
                      ...formData,
                      profileId: value,
                      role: value === 'admin' ? 'admin' : 'operator'
                    });
                  }}
                >
                  <SelectTrigger id="mobile-profileId" className="mt-1.5 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        <div className="flex items-center gap-2">
                          {profile.id === 'admin' ? <Shield size={16} /> : <User size={16} />}
                          <span>{profile.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFormModal(false)}
                  className="flex-1 h-11 touch-manipulation"
                >
                  Cancelar
                </Button>
                <ActionButton
                  type="submit"
                  isLoading={isSaving}
                  loadingText={editingId ? 'Atualizando...' : 'Salvando...'}
                  variant="primary"
                  icon={editingId ? <Edit2 size={18} /> : <Plus size={18} />}
                  className="flex-1 h-11 bg-[#D50000] hover:bg-[#B00000] touch-manipulation"
                >
                  {editingId ? 'Atualizar' : 'Adicionar'}
                </ActionButton>
              </div>
            </form>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Profile Management Dialog */}
      <AlertDialog open={showProfileManagement} onOpenChange={setShowProfileManagement}>
        <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Gerenciar Perfis de Acesso</AlertDialogTitle>
            <AlertDialogDescription>
              Configure perfis e permissões. Perfis personalizados podem ser criados, editados e excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            {/* Import dinâmico do componente */}
            {showProfileManagement && (
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-4">
                  Use a página "Perfis de Acesso" no menu lateral para gerenciar perfis completos.
                  Aqui você pode visualizar os perfis disponíveis:
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {profiles.map(profile => (
                    <div key={profile.id} className="border rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{profile.name}</h4>
                            {profile.isSystem && (
                              <Badge variant="secondary" className="text-xs">Sistema</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{profile.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {profile.pages.length} páginas
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              {profile.features.length} funcionalidades
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowProfileManagement(false)}>
              Fechar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}