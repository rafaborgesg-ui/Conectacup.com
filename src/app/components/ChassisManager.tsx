/**
 * Componente para gerenciar Chassis
 * Cada geração é um card, clique para ver chassis
 */

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Loader2, Car, Search, ChevronLeft, Eye, List } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  getChassis,
  createChassis,
  updateChassis,
  hardDeleteChassis,
  type Chassis,
} from '../utils/chassisStorage';
import { getGeracoes, type Geracao } from '../utils/geracaoStorage';

export function ChassisManager() {
  const [chassis, setChassis] = useState<Chassis[]>([]);
  const [geracoes, setGeracoes] = useState<Geracao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingChassis, setEditingChassis] = useState<Chassis | null>(null);
  const [newCodigo, setNewCodigo] = useState('');
  const [newGeracao, setNewGeracao] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<Chassis | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGeracao, setSelectedGeracao] = useState<string | null>(null);
  const [isBulkImport, setIsBulkImport] = useState(false);
  const [bulkList, setBulkList] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([loadChassis(), loadGeracoes()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChassis = async () => {
    try {
      const data = await getChassis();
      setChassis(data);
    } catch (error) {
      console.error('Erro ao carregar chassis:', error);
      toast.error('Erro ao carregar chassis');
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

  const handleCreate = async () => {
    if (!newCodigo.trim()) {
      toast.error('Código do chassis é obrigatório');
      return;
    }

    if (!newGeracao || newGeracao === 'none') {
      toast.error('Geração é obrigatória');
      return;
    }

    try {
      setIsSaving(true);
      
      const maxOrdem = chassis.reduce((max, c) => Math.max(max, c.ordem || 0), 0);
      
      await createChassis({
        codigo: newCodigo.trim(),
        geracao: newGeracao,
        ativo: true,
        ordem: maxOrdem + 1,
      });

      toast.success('Chassis criado com sucesso');
      setNewCodigo('');
      setNewGeracao('');
      setIsEditing(false);
      await loadChassis();
    } catch (error: any) {
      console.error('Erro ao criar chassis:', error);
      if (error.code === '23505') {
        toast.error('Este código de chassis já existe');
      } else {
        toast.error('Erro ao criar chassis');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingChassis) return;

    if (!newCodigo.trim()) {
      toast.error('Código do chassis é obrigatório');
      return;
    }

    if (!newGeracao || newGeracao === 'none') {
      toast.error('Geração é obrigatória');
      return;
    }

    try {
      setIsSaving(true);
      
      await updateChassis(editingChassis.id, {
        codigo: newCodigo.trim(),
        geracao: newGeracao,
      });

      toast.success('Chassis atualizado com sucesso');
      setEditingChassis(null);
      setNewCodigo('');
      setNewGeracao('');
      setIsEditing(false);
      await loadChassis();
    } catch (error: any) {
      console.error('Erro ao atualizar chassis:', error);
      if (error.code === '23505') {
        toast.error('Este código de chassis já existe');
      } else {
        toast.error('Erro ao atualizar chassis');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (chassisToDelete: Chassis) => {
    try {
      await hardDeleteChassis(chassisToDelete.id);
      toast.success('Chassis removido com sucesso');
      setDeleteConfirm(null);
      await loadChassis();
    } catch (error) {
      console.error('Erro ao deletar chassis:', error);
      toast.error('Erro ao deletar chassis');
    }
  };

  const handleBulkImport = async () => {
    if (!bulkList.trim()) {
      toast.error('Digite a lista de chassis');
      return;
    }

    if (!selectedGeracao) {
      toast.error('Geração não selecionada');
      return;
    }

    try {
      setIsSaving(true);

      // Processar lista: aceita vírgula, ponto-e-vírgula, ou quebra de linha
      const codes = bulkList
        .split(/[,;\n]/)
        .map(code => code.trim())
        .filter(code => code.length > 0);

      if (codes.length === 0) {
        toast.error('Nenhum chassis válido na lista');
        return;
      }

      // Verificar duplicatas na lista
      const uniqueCodes = [...new Set(codes)];
      if (uniqueCodes.length !== codes.length) {
        toast.warning(`${codes.length - uniqueCodes.length} chassis duplicados foram removidos da lista`);
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      const maxOrdem = chassis.reduce((max, c) => Math.max(max, c.ordem || 0), 0);

      // Criar chassis em sequência
      for (let i = 0; i < uniqueCodes.length; i++) {
        const code = uniqueCodes[i];
        try {
          await createChassis({
            codigo: code,
            geracao: selectedGeracao,
            ativo: true,
            ordem: maxOrdem + i + 1,
          });
          successCount++;
        } catch (error: any) {
          errorCount++;
          if (error.code === '23505') {
            errors.push(`${code} (já existe)`);
          } else {
            errors.push(`${code} (erro desconhecido)`);
          }
        }
      }

      // Feedback detalhado
      if (successCount > 0) {
        toast.success(`${successCount} chassis ${successCount === 1 ? 'criado' : 'criados'} com sucesso`);
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} ${errorCount === 1 ? 'erro' : 'erros'}: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
      }

      if (successCount > 0) {
        setBulkList('');
        setIsBulkImport(false);
        await loadChassis();
      }
    } catch (error) {
      console.error('Erro ao importar chassis em massa:', error);
      toast.error('Erro ao importar chassis');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelBulkImport = () => {
    setBulkList('');
    setIsBulkImport(false);
  };

  const startEdit = (c: Chassis) => {
    setEditingChassis(c);
    setNewCodigo(c.codigo);
    setNewGeracao(c.geracao || '');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditingChassis(null);
    setNewCodigo('');
    setNewGeracao('');
    setIsEditing(false);
  };

  const viewChassis = (geracaoCodigo: string) => {
    setSelectedGeracao(geracaoCodigo);
  };

  const backToGeracoes = () => {
    setSelectedGeracao(null);
    setSearchTerm('');
  };

  // Agrupar chassis por geração
  const groupedChassis = chassis.reduce((groups, c) => {
    const key = c.geracao || 'Sem Geração';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(c);
    return groups;
  }, {} as Record<string, Chassis[]>);

  // Ordenar grupos
  const sortedGroupKeys = Object.keys(groupedChassis).sort((a, b) => {
    if (a === 'Sem Geração') return 1;
    if (b === 'Sem Geração') return -1;
    return a.localeCompare(b);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Visualização de chassis de uma geração específica
  if (selectedGeracao) {
    const chassisDaGeracao = groupedChassis[selectedGeracao] || [];
    const filteredChassisDaGeracao = chassisDaGeracao.filter(c => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return c.codigo.toLowerCase().includes(searchLower);
    });

    return (
      <Card className="p-6">
        {/* Header com botão voltar */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={backToGeracoes}
            variant="outline"
            size="sm"
          >
            <ChevronLeft size={16} className="mr-1" />
            Voltar
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏎️</span>
              <div>
                <h2 className="text-gray-900">Chassis - {selectedGeracao}</h2>
                <p className="text-sm text-gray-500">
                  {filteredChassisDaGeracao.length} {filteredChassisDaGeracao.length === 1 ? 'chassis' : 'chassis'} {searchTerm && `(${chassisDaGeracao.length} total)`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsBulkImport(true)}
              variant="outline"
              size="sm"
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              <List size={16} className="mr-2" />
              Adicionar em Massa
            </Button>
            <Button
              onClick={() => {
                setNewGeracao(selectedGeracao);
                setIsEditing(true);
              }}
              className="bg-red-600 hover:bg-red-700"
              size="sm"
            >
              <Plus size={16} className="mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Barra de Filtro */}
        {chassisDaGeracao.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Pesquisar chassis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Form de Edição/Criação */}
        {isEditing && (
          <Card className="p-4 mb-6 bg-gray-50 border-2 border-red-200">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código do Chassis *</Label>
                  <Input
                    id="codigo"
                    value={newCodigo}
                    onChange={(e) => setNewCodigo(e.target.value)}
                    placeholder="Ex: #1, #99, #777"
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="geracao">Geração *</Label>
                  <Select
                    value={newGeracao}
                    onValueChange={setNewGeracao}
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a geração" />
                    </SelectTrigger>
                    <SelectContent>
                      {geracoes.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhuma geração cadastrada
                        </SelectItem>
                      ) : (
                        geracoes.map((g) => (
                          <SelectItem key={g.id} value={g.codigo}>
                            {g.codigo}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={editingChassis ? handleUpdate : handleCreate}
                  disabled={!newCodigo.trim() || !newGeracao || newGeracao === 'none' || isSaving}
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
                      {editingChassis ? 'Atualizar' : 'Criar'}
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

        {/* Form de Importação em Massa */}
        {isBulkImport && (
          <Card className="p-4 mb-6 bg-blue-50 border-2 border-blue-200">
            <div className="space-y-4">
              <div>
                <Label htmlFor="bulkList">Lista de Chassis para {selectedGeracao}</Label>
                <p className="text-xs text-gray-600 mb-2">
                  Cole os códigos dos chassis separados por vírgula, ponto-e-vírgula ou quebra de linha
                </p>
                <textarea
                  id="bulkList"
                  value={bulkList}
                  onChange={(e) => setBulkList(e.target.value)}
                  placeholder="Ex: #1, #2, #3 ou cada um em uma linha"
                  disabled={isSaving}
                  className="w-full px-4 py-3 rounded-lg border resize-none"
                  style={{
                    borderColor: '#E5E7EB',
                    background: '#FFFFFF',
                    minHeight: '120px',
                  }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Dica: Você pode copiar uma coluna do Excel e colar diretamente aqui
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleBulkImport}
                  disabled={!bulkList.trim() || isSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Importar Chassis
                    </>
                  )}
                </Button>
                <Button
                  onClick={cancelBulkImport}
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

        {/* Lista de Chassis */}
        {filteredChassisDaGeracao.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="text-gray-400" size={32} />
            </div>
            <h3 className="text-gray-900 mb-2">
              {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum chassis cadastrado'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm ? 'Tente buscar com outros termos.' : 'Clique em "Adicionar" para cadastrar novos chassis.'}
            </p>
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
                {filteredChassisDaGeracao
                  .sort((a, b) => a.codigo.localeCompare(b.codigo))
                  .map((c, index) => (
                    <tr key={c.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3">
                        <span className="text-gray-900 font-medium">{c.codigo}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            onClick={() => startEdit(c)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 size={14} className="text-blue-600" />
                          </Button>
                          <Button
                            onClick={() => setDeleteConfirm(c)}
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
                Tem certeza que deseja remover o chassis <strong>{deleteConfirm?.codigo}</strong>?
                Esta ação não pode ser desfeita.
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
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
  }

  // Visualização principal: Cards de Gerações
  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-gray-900 mb-1">Chassis por Geração</h2>
          <p className="text-sm text-gray-500">
            {geracoes.length} {geracoes.length === 1 ? 'geração cadastrada' : 'gerações cadastradas'}
          </p>
        </div>
      </div>

      {/* Grid de Cards de Gerações */}
      {geracoes.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="text-gray-400" size={32} />
          </div>
          <h3 className="text-gray-900 mb-2">Nenhuma geração cadastrada</h3>
          <p className="text-sm text-gray-500 mb-4">
            Cadastre gerações em "Geração do Carro" para poder adicionar chassis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {geracoes.map((geracao) => {
            const chassisDaGeracao = chassis.filter(c => c.geracao === geracao.codigo);
            const chassisCount = chassisDaGeracao.length;

            return (
              <Card
                key={geracao.id}
                className="p-6 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-red-200"
              >
                <div className="space-y-4">
                  {/* Header do Card */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
                        <Car className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{geracao.codigo}</h3>
                        <p className="text-xs text-gray-500">Geração</p>
                      </div>
                    </div>
                  </div>

                  {/* Contador */}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {chassisCount}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {chassisCount === 1 ? 'chassis' : 'chassis'}
                    </span>
                  </div>

                  {/* Botão Ver Chassis */}
                  <Button
                    onClick={() => viewChassis(geracao.codigo)}
                    className="w-full bg-red-600 hover:bg-red-700 group-hover:shadow-md transition-all"
                    size="sm"
                  >
                    <Eye size={16} className="mr-2" />
                    Ver Chassis
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}