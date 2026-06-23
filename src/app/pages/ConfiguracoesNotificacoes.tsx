import React, { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Bell, CheckCircle2, XCircle, Mail, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PageHeader } from '../components/PageHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface User {
  id: string;
  email: string;
  name: string;
  is_wheel_damage_manager: boolean;
}

export default function ConfiguracoesNotificacoes() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [currentManager, setCurrentManager] = useState<User | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Buscar usuários através de uma query RPC customizada
      const { data, error } = await supabase.rpc('get_all_users_with_manager_flag');

      if (error) {
        console.error('Erro na RPC:', error);
        
        // Se a função não existe, mostrar mensagem específica
        if (error.code === 'PGRST202') {
          toast.error('⚠️ Funções SQL não instaladas', {
            description: 'Execute o SQL install_interface_functions.sql no Supabase primeiro!',
            duration: 8000,
          });
          setUsers([]);
          setCurrentManager(null);
          setLoading(false);
          return;
        }
        
        throw error;
      }

      if (!data || data.length === 0) {
        toast.error('Nenhum usuário encontrado', {
          description: 'Verifique se existem usuários cadastrados no sistema.',
        });
        setUsers([]);
        setCurrentManager(null);
        return;
      }

      setUsers(data);

      // Identificar o gestor atual
      const manager = data.find((u: User) => u.is_wheel_damage_manager);
      setCurrentManager(manager || null);

    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários', {
        description: error.message || 'Verifique se as funções SQL estão instaladas corretamente.',
      });
      setUsers([]);
      setCurrentManager(null);
    } finally {
      setLoading(false);
    }
  };

  const setAsManager = async (userId: string, userName: string) => {
    try {
      setUpdating(userId);

      // Chama a função SQL para definir o gestor
      const { error } = await supabase.rpc('set_wheel_damage_manager', {
        target_user_id: userId,
        is_manager: true
      });

      if (error) throw error;

      toast.success('Gestor de Avarias atualizado!', {
        description: `${userName} agora receberá notificações de novas avarias por e-mail.`,
      });

      await loadUsers();

    } catch (error: any) {
      console.error('Erro ao definir gestor:', error);
      toast.error('Erro ao atualizar gestor', {
        description: error.message,
      });
    } finally {
      setUpdating(null);
    }
  };

  const removeManager = async (userId: string) => {
    try {
      setUpdating(userId);

      // Chama a função SQL para remover o gestor
      const { error } = await supabase.rpc('set_wheel_damage_manager', {
        target_user_id: userId,
        is_manager: false
      });

      if (error) throw error;

      toast.success('Gestor removido', {
        description: 'Nenhum usuário receberá notificações de avarias até que um novo gestor seja definido.',
      });

      await loadUsers();

    } catch (error: any) {
      console.error('Erro ao remover gestor:', error);
      toast.error('Erro ao remover gestor', {
        description: error.message,
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <PageHeader
          title="Notificações de Avarias"
          description="Configure quem receberá e-mails de novas avarias de rodas"
        />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <PageHeader
        title="Notificações de Avarias"
        description="Configure quem receberá e-mails de novas avarias de rodas"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      {/* Card de Erro - Funções não instaladas */}
      {users.length === 0 && !loading && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg text-yellow-900">⚠️ Configuração Necessária</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-yellow-800 font-medium">
              As funções SQL ainda não foram instaladas no Supabase.
            </p>
            
            <div className="bg-white p-4 rounded-lg border border-yellow-200">
              <p className="font-medium text-gray-900 mb-3">📋 Execute este SQL no Supabase:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Acesse seu projeto Supabase</li>
                <li>Vá em <strong>SQL Editor</strong></li>
                <li>Clique em <strong>New query</strong></li>
                <li>Copie e cole o arquivo: <code className="bg-gray-100 px-2 py-1 rounded text-xs">/supabase/migrations/install_interface_functions.sql</code></li>
                <li>Clique em <strong>RUN</strong></li>
                <li>Volte aqui e clique em <strong>Atualizar</strong></li>
              </ol>
            </div>
            
            <div className="flex items-start gap-2 text-sm text-yellow-700">
              <span>💡</span>
              <p>Após executar o SQL, clique no botão "Atualizar" no topo desta página.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card de Informação */}
      {users.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-red-900">
                  Como funciona?
                </p>
                <p className="text-red-700">
                  Quando uma nova avaria de roda for cadastrada no sistema, o gestor selecionado receberá automaticamente um e-mail bonito e detalhado com todas as informações da ocorrência.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gestor Atual */}
      {currentManager && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Gestor Ativo</CardTitle>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                <Bell className="h-3 w-3 mr-1" />
                Notificações ativas
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900">{currentManager.email}</span>
                </div>
                <p className="text-sm text-green-700">
                  Nome: {currentManager.name}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeManager(currentManager.id)}
                disabled={updating === currentManager.id}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                {updating === currentManager.id ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Remover
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Gestor de Avarias</CardTitle>
          <CardDescription>
            Escolha qual usuário receberá notificações por e-mail de novas avarias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    user.is_wheel_damage_manager
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        user.is_wheel_damage_manager
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{user.email}</p>
                        {user.is_wheel_damage_manager && (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                            <Bell className="h-3 w-3 mr-1" />
                            Gestor Ativo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Nome: {user.name}</p>
                    </div>
                  </div>

                  {!user.is_wheel_damage_manager && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAsManager(user.id, user.email)}
                      disabled={updating === user.id}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      {updating === user.id ? (
                        <LoadingSpinner className="h-4 w-4" />
                      ) : (
                        <>
                          <Bell className="h-4 w-4 mr-2" />
                          Definir como Gestor
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card de Teste */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            Como testar?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-800 space-y-2">
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Defina um gestor acima</li>
            <li>Acesse a página <strong>"Avarias de Rodas"</strong></li>
            <li>Clique em <strong>"Nova Avaria"</strong> e preencha o formulário</li>
            <li>Salve a avaria</li>
            <li>Verifique o e-mail do gestor (pode demorar alguns segundos)</li>
          </ol>
          <p className="text-xs text-yellow-700 mt-3 font-medium">
            💡 Dica: Confira também a caixa de SPAM caso não encontre o e-mail!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}