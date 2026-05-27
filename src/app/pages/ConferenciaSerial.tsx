import { useState, useEffect } from 'react';
import { Plus, FolderOpen, Calendar, Edit2, Trash2, ChevronRight, ArrowLeft, Search } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner';
import { ConferenciaSerialDetalhes } from './ConferenciaSerialDetalhes';

interface ConferenciaLista {
  id: string;
  nome: string;
  created_at: string;
  updated_at: string;
  total_conferencias?: number;
}

export function ConferenciaSerial() {
  const [listas, setListas] = useState<ConferenciaLista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newListaName, setNewListaName] = useState('');
  const [editingLista, setEditingLista] = useState<ConferenciaLista | null>(null);
  const [editListaName, setEditListaName] = useState('');
  const [selectedLista, setSelectedLista] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 📥 Carrega listas do Supabase
  useEffect(() => {
    loadListas();
  }, []);

  const loadListas = async () => {
    try {
      setIsLoading(true);
      console.log('📥 Carregando listas de conferência...');

      const supabase = createClient();
      
      // Busca todas as listas
      const { data: listasData, error: listasError } = await supabase
        .from('conferencia_listas')
        .select('*')
        .order('created_at', { ascending: false });

      if (listasError) {
        console.error('❌ Erro ao carregar listas:', listasError);
        toast.error('Erro ao carregar listas de conferência');
        return;
      }

      // Para cada lista, conta quantas conferências existem
      if (listasData) {
        const listasComContagem = await Promise.all(
          listasData.map(async (lista) => {
            const { count } = await supabase
              .from('conferencia_serial')
              .select('*', { count: 'exact', head: true })
              .eq('lista_id', lista.id);

            return {
              ...lista,
              total_conferencias: count || 0
            };
          })
        );

        setListas(listasComContagem);
        console.log(`✅ ${listasComContagem.length} listas carregadas`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar listas:', error);
      toast.error('Erro ao carregar listas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLista = async () => {
    if (!newListaName.trim()) {
      toast.error('Digite um nome para a lista');
      return;
    }

    try {
      console.log('➕ Criando nova lista:', newListaName);

      const { data: user } = await createClient().auth.getUser();
      
      const { data, error } = await createClient()
        .from('conferencia_listas')
        .insert({
          nome: newListaName.trim(),
          user_id: user?.user?.id || null
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar lista:', error);
        toast.error('Erro ao criar lista');
        return;
      }

      console.log('✅ Lista criada:', data);
      toast.success('Lista criada com sucesso!');
      
      setNewListaName('');
      setShowCreateModal(false);
      loadListas();
    } catch (error) {
      console.error('❌ Erro ao criar lista:', error);
      toast.error('Erro ao criar lista');
    }
  };

  const handleEditLista = async () => {
    if (!editingLista || !editListaName.trim()) {
      toast.error('Digite um nome para a lista');
      return;
    }

    try {
      console.log('✏️ Editando lista:', editingLista.id);

      const { error } = await createClient()
        .from('conferencia_listas')
        .update({ nome: editListaName.trim() })
        .eq('id', editingLista.id);

      if (error) {
        console.error('❌ Erro ao editar lista:', error);
        toast.error('Erro ao editar lista');
        return;
      }

      console.log('✅ Lista editada');
      toast.success('Lista editada com sucesso!');
      
      setEditingLista(null);
      setEditListaName('');
      setShowEditModal(false);
      loadListas();
    } catch (error) {
      console.error('❌ Erro ao editar lista:', error);
      toast.error('Erro ao editar lista');
    }
  };

  const handleDeleteLista = async (lista: ConferenciaLista) => {
    if (!window.confirm(`Deseja realmente excluir a lista "${lista.nome}"?\n\nTodas as conferências desta lista também serão excluídas.`)) {
      return;
    }

    try {
      console.log('🗑️ Excluindo lista:', lista.id);

      // Primeiro, exclui todas as conferências da lista
      const { error: deleteConferenciasError } = await createClient()
        .from('conferencia_serial')
        .delete()
        .eq('lista_id', lista.id);

      if (deleteConferenciasError) {
        console.error('❌ Erro ao excluir conferências:', deleteConferenciasError);
        toast.error('Erro ao excluir conferências da lista');
        return;
      }

      // Depois, exclui a lista
      const { error: deleteListaError } = await createClient()
        .from('conferencia_listas')
        .delete()
        .eq('id', lista.id);

      if (deleteListaError) {
        console.error('❌ Erro ao excluir lista:', deleteListaError);
        toast.error('Erro ao excluir lista');
        return;
      }

      console.log('✅ Lista excluída');
      toast.success('Lista excluída com sucesso!');
      loadListas();
    } catch (error) {
      console.error('❌ Erro ao excluir lista:', error);
      toast.error('Erro ao excluir lista');
    }
  };

  const openEditModal = (lista: ConferenciaLista) => {
    setEditingLista(lista);
    setEditListaName(lista.nome);
    setShowEditModal(true);
  };

  const handleOpenCreateModal = () => {
    console.log('🔵 Abrindo modal de criação');
    setShowCreateModal(true);
  };

  // Filtrar listas com base no termo de pesquisa
  const filteredListas = listas.filter(lista =>
    lista.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Se uma lista está selecionada, mostra a página de detalhes
  if (selectedLista) {
    const lista = listas.find(l => l.id === selectedLista);
    return (
      <ConferenciaSerialDetalhes 
        listaId={selectedLista}
        listaNome={lista?.nome || 'Lista'}
        onBack={() => setSelectedLista(null)}
      />
    );
  }

  console.log('🔵 Estado showCreateModal:', showCreateModal);
  console.log('🔵 Estado showEditModal:', showEditModal);

  return (
    <div className="p-8 collector-adapt-content">
      {/* Header */}
      <div className="mb-8 collector-adapt-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2 collector-adapt-text-title">Conferência de Serial</h1>
            <p className="text-gray-600 collector-adapt-hide">
              Gerencie listas de conferência de números de série
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90 collector-adapt-button"
            style={{ background: '#D50000', color: '#FFFFFF' }}
          >
            <Plus size={20} className="collector-adapt-icon-small" />
            <span className="collector-adapt-text-medium">Criar Lista de Conferência</span>
          </button>
        </div>
      </div>

      {/* Campo de Pesquisa */}
      <div className="mb-6 collector-adapt-search">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar lista..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent collector-adapt-text-medium"
          />
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-600 mt-2 collector-adapt-text-small">
            {filteredListas.length} {filteredListas.length === 1 ? 'lista encontrada' : 'listas encontradas'}
          </p>
        )}
      </div>

      {/* Lista de Listas */}
      <div className="bg-white rounded-xl border border-gray-200 collector-adapt-card">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-500 collector-adapt-text-medium">Carregando listas...</p>
          </div>
        ) : filteredListas.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="mx-auto text-gray-300 mb-3 collector-adapt-icon-large" size={48} />
            <p className="text-gray-500 collector-adapt-text-medium mb-2">
              {searchTerm ? 'Nenhuma lista encontrada' : 'Nenhuma lista criada ainda'}
            </p>
            <p className="text-gray-400 text-sm collector-adapt-text-small">
              {searchTerm ? 'Tente ajustar o termo de pesquisa' : 'Clique em "Criar Lista de Conferência" para começar'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredListas.map((lista) => (
              <div
                key={lista.id}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group"
                onClick={() => setSelectedLista(lista.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="text-red-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1 collector-adapt-text-large">
                        {lista.nome}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(lista.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="collector-adapt-text-small">
                          {lista.total_conferencias} {lista.total_conferencias === 1 ? 'conferência' : 'conferências'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(lista);
                      }}
                      className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Editar lista"
                    >
                      <Edit2 size={18} className="text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLista(lista);
                      }}
                      className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                      title="Excluir lista"
                    >
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                    <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar Lista */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 9998 }}
          onClick={() => {
            console.log('🔵 Clicou no overlay do modal');
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔵 Clicou dentro do modal');
            }}
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Criar Nova Lista</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Lista
              </label>
              <input
                type="text"
                value={newListaName}
                onChange={(e) => setNewListaName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateLista();
                  }
                }}
                placeholder="Ex: Conferência Janeiro 2026"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewListaName('');
                }}
                className="flex-1 px-4 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateLista}
                disabled={!newListaName.trim()}
                className="flex-1 px-4 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90"
                style={{ background: '#D50000', color: '#FFFFFF' }}
              >
                Criar Lista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Lista */}
      {showEditModal && editingLista && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 9998 }}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Editar Lista</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Lista
              </label>
              <input
                type="text"
                value={editListaName}
                onChange={(e) => setEditListaName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleEditLista();
                  }
                }}
                placeholder="Ex: Conferência Janeiro 2026"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingLista(null);
                  setEditListaName('');
                }}
                className="flex-1 px-4 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditLista}
                disabled={!editListaName.trim()}
                className="flex-1 px-4 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90"
                style={{ background: '#D50000', color: '#FFFFFF' }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}