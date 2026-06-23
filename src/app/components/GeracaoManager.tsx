/**
 * Componente para gerenciar Gerações de Carros
 * Layout de tabela igual à seção Categoria
 */

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Loader2, Settings, Search, Grid3x3, TableIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
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
import {
  getGeracoes,
  createGeracao,
  updateGeracao,
  hardDeleteGeracao,
  type Geracao,
} from '../utils/geracaoStorage';
import {
  getChassis,
  hardDeleteChassis,
  type Chassis,
} from '../utils/chassisStorage';

export function GeracaoManager() {
  const [geracoes, setGeracoes] = useState<Geracao[]>([]);
  const [chassis, setChassis] = useState<Chassis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGeracao, setEditingGeracao] = useState<Geracao | null>(null);
  const [newCodigo, setNewCodigo] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Geracao | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([loadGeracoes(), loadChassis()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGeracoes = async () => {
    try {
      const data = await getGeracoes();
      setGeracoes(data);
    } catch (error) {
      console.error('Erro ao carregar gerações:', error);
      toast.error('Erro ao carregar gerações');
    }
  };

  const loadChassis = async () => {
    try {
      const data = await getChassis();
      setChassis(data);
    } catch (error) {
      console.error('Erro ao carregar chassis:', error);
    }
  };

  const handleCreate = async () => {
    if (!newCodigo.trim()) {
      toast.error('Código da geração é obrigatório');
      return;
    }

    try {
      setIsSaving(true);
      
      const maxOrdem = geracoes.reduce((max, g) => Math.max(max, g.ordem || 0), 0);
      
      await createGeracao({
        codigo: newCodigo.trim(),
        ativo: true,
        ordem: maxOrdem + 1,
      });

      toast.success('Geração criada com sucesso');
      setNewCodigo('');
      setIsEditing(false);
      await loadData();
    } catch (error: any) {
      console.error('Erro ao criar geração:', error);
      if (error.code === '23505') {
        toast.error('Esta geração já existe');
      } else {
        toast.error('Erro ao criar geração');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingGeracao) return;

    if (!newCodigo.trim()) {
      toast.error('Código da geração é obrigatório');
      return;
    }

    try {
      setIsSaving(true);
      
      await updateGeracao(editingGeracao.id, {
        codigo: newCodigo.trim(),
      });

      toast.success('Geração atualizada com sucesso');
      setEditingGeracao(null);
      setNewCodigo('');
      setIsEditing(false);
      await loadData();
    } catch (error: any) {
      console.error('❌ Erro ao atualizar geração:', error);
      
      if (error.code === '23505') {
        toast.error('Esta geração já existe');
      } else if (error.message) {
        toast.error(`Erro: ${error.message}`);
      } else {
        toast.error('Erro ao atualizar geração');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (geracaoToDelete: Geracao) => {
    try {
      // Buscar chassis vinculados a esta geração
      const chassisVinculados = chassis.filter(c => c.geracao === geracaoToDelete.codigo);

      // Deletar todos os chassis vinculados primeiro
      if (chassisVinculados.length > 0) {
        for (const chassisItem of chassisVinculados) {
          await hardDeleteChassis(chassisItem.id);
        }
      }

      // Depois deletar a geração
      await hardDeleteGeracao(geracaoToDelete.id);
      
      if (chassisVinculados.length > 0) {
        toast.success(`Geração e ${chassisVinculados.length} chassis removidos com sucesso`);
      } else {
        toast.success('Geração removida com sucesso');
      }
      
      setDeleteConfirm(null);
      await loadData();
    } catch (error) {
      console.error('Erro ao deletar geração:', error);
      toast.error('Erro ao deletar geração');
    }
  };

  const startEdit = (g: Geracao) => {
    setEditingGeracao(g);
    setNewCodigo(g.codigo);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditingGeracao(null);
    setNewCodigo('');
    setIsEditing(false);
  };

  // Contar chassis por geração
  const getChassisCount = (geracaoCodigo: string): number => {
    return chassis.filter(c => c.geracao === geracaoCodigo).length;
  };

  // Filtrar gerações baseado na pesquisa
  const filteredGeracoes = geracoes.filter(g => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      g.codigo.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-gray-900 mb-1">Geração do Carro</h2>
          <p className="text-sm text-gray-500">
            {filteredGeracoes.length} {filteredGeracoes.length === 1 ? 'item' : 'itens'} {searchTerm && `(${geracoes.length} total)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsEditing(true)}
            className="bg-red-600 hover:bg-red-700"
            size="sm"
          >
            <Plus size={16} className="mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Barra de Filtro e Visualização */}
      {geracoes.length > 0 && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              onClick={() => setViewMode('card')}
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              className={viewMode === 'card' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <Grid3x3 size={16} />
            </Button>
            <Button
              onClick={() => setViewMode('table')}
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className={viewMode === 'table' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <TableIcon size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Form de Edição/Criação */}
      {isEditing && (
        <Card className="p-4 mb-4 bg-gray-50 border-2 border-red-200">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={newCodigo}
                onChange={(e) => setNewCodigo(e.target.value)}
                placeholder="Ex: 991/I, 992"
                disabled={isSaving}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={editingGeracao ? handleUpdate : handleCreate}
                disabled={!newCodigo.trim() || isSaving}
                className="bg-red-600 hover:bg-red-700"
                size="sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    {editingGeracao ? 'Atualizar' : 'Criar'}
                  </>
                )}
              </Button>
              <Button
                onClick={cancelEdit}
                variant="outline"
                disabled={isSaving}
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
      {filteredGeracoes.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="text-gray-400" size={32} />
          </div>
          <h3 className="text-gray-900 mb-2">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum item cadastrado'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchTerm ? 'Tente buscar com outros termos.' : 'Clique em "Adicionar" para cadastrar novos itens.'}
          </p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredGeracoes
            .sort((a, b) => a.codigo.localeCompare(b.codigo))
            .map((g) => (
              <Card
                key={g.id}
                className="p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">🏎️</span>
                      <span className="text-gray-900">{g.codigo}</span>
                    </div>
                    
                    {g.created_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Criado em {new Date(g.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => startEdit(g)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 size={14} className="text-blue-600" />
                    </Button>
                    <Button
                      onClick={() => setDeleteConfirm(g)}
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
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-gray-700">Código</th>
                <th className="px-4 py-3 text-left text-gray-700">Data de Criação</th>
                <th className="px-4 py-3 text-right text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredGeracoes
                .sort((a, b) => a.codigo.localeCompare(b.codigo))
                .map((g, index) => (
                  <tr key={g.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>🏎️</span>
                        <span className="text-gray-900">{g.codigo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {g.created_at ? new Date(g.created_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          onClick={() => startEdit(g)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 size={14} className="text-blue-600" />
                        </Button>
                        <Button
                          onClick={() => setDeleteConfirm(g)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 size={14} className="text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a geração <strong>{deleteConfirm?.codigo}</strong>?
              {deleteConfirm && getChassisCount(deleteConfirm.codigo) > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-amber-900 font-semibold">
                    ⚠️ Atenção: Esta geração possui {getChassisCount(deleteConfirm.codigo)} chassis cadastrado{getChassisCount(deleteConfirm.codigo) > 1 ? 's' : ''}.
                  </p>
                  <p className="text-amber-800 text-sm mt-1">
                    Todos os chassis vinculados serão removidos permanentemente junto com a geração.
                  </p>
                </div>
              )}
              <p className="mt-3 text-gray-600">Esta ação não pode ser desfeita.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              style={{
                background: '#DC2626',
                color: '#FFFFFF',
              }}
            >
              Excluir {deleteConfirm && getChassisCount(deleteConfirm.codigo) > 0 && 'Tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}