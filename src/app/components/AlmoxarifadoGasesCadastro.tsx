import React, { useState } from 'react';
import { Settings, Plus, Search, Filter, Wind, Building2, Edit, Trash2, X, LayoutGrid, Table } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Label } from './ui/label';

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  contato: string;
  email: string;
  endereco: string;
  ativo: boolean;
}

interface Gas {
  id: string;
  nome: string;
  pureza: string;
  pressao: string;
  descricao: string;
  ativo: boolean;
}

export default function AlmoxarifadoGasesCadastro() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  
  // Estados para Fornecedores
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([
    {
      id: '1',
      nome: 'White Martins',
      cnpj: '00.000.000/0001-00',
      contato: '(11) 98765-4321',
      email: 'contato@whitemartins.com',
      endereco: 'Av. Paulista, 1000 - São Paulo/SP',
      ativo: true
    },
    {
      id: '2',
      nome: 'Air Liquide',
      cnpj: '11.111.111/0001-11',
      contato: '(11) 91234-5678',
      email: 'vendas@airliquide.com',
      endereco: 'Rua dos Gases, 500 - São Paulo/SP',
      ativo: true
    },
    {
      id: '3',
      nome: 'Linde Gases',
      cnpj: '22.222.222/0001-22',
      contato: '(11) 99876-5432',
      email: 'comercial@linde.com',
      endereco: 'Av. Industrial, 2500 - Guarulhos/SP',
      ativo: true
    }
  ]);

  // Estados para Gases
  const [gases, setGases] = useState<Gas[]>([
    {
      id: '1',
      nome: 'Nitrogênio',
      pureza: '99.9%',
      pressao: '200 bar',
      descricao: 'Gás inerte utilizado para calibragem de pneus',
      ativo: true
    },
    {
      id: '2',
      nome: 'Oxigênio',
      pureza: '99.5%',
      pressao: '150 bar',
      descricao: 'Gás utilizado em processos de soldagem',
      ativo: true
    },
    {
      id: '3',
      nome: 'Argônio',
      pureza: '99.9%',
      pressao: '200 bar',
      descricao: 'Gás nobre utilizado em soldagem TIG',
      ativo: true
    },
    {
      id: '4',
      nome: 'CO₂',
      pureza: '99.8%',
      pressao: '50 bar',
      descricao: 'Gás utilizado em soldagem MIG',
      ativo: true
    }
  ]);

  // Estados dos modais
  const [showFornecedorModal, setShowFornecedorModal] = useState(false);
  const [showGasModal, setShowGasModal] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [editingGas, setEditingGas] = useState<Gas | null>(null);

  // Formulário de Fornecedor
  const [fornecedorForm, setFornecedorForm] = useState({
    nome: '',
    cnpj: '',
    contato: '',
    email: '',
    endereco: ''
  });

  // Formulário de Gás
  const [gasForm, setGasForm] = useState({
    nome: '',
    pureza: '',
    pressao: '',
    descricao: ''
  });

  // Funções para Fornecedor
  const handleOpenFornecedorModal = (fornecedor?: Fornecedor) => {
    if (fornecedor) {
      setEditingFornecedor(fornecedor);
      setFornecedorForm({
        nome: fornecedor.nome,
        cnpj: fornecedor.cnpj,
        contato: fornecedor.contato,
        email: fornecedor.email,
        endereco: fornecedor.endereco
      });
    } else {
      setEditingFornecedor(null);
      setFornecedorForm({
        nome: '',
        cnpj: '',
        contato: '',
        email: '',
        endereco: ''
      });
    }
    setShowFornecedorModal(true);
  };

  const handleSaveFornecedor = () => {
    if (editingFornecedor) {
      // Editar
      setFornecedores(fornecedores.map(f => 
        f.id === editingFornecedor.id 
          ? { ...f, ...fornecedorForm }
          : f
      ));
    } else {
      // Adicionar
      const novoFornecedor: Fornecedor = {
        id: Date.now().toString(),
        ...fornecedorForm,
        ativo: true
      };
      setFornecedores([...fornecedores, novoFornecedor]);
    }
    setShowFornecedorModal(false);
  };

  const handleToggleFornecedorStatus = (id: string) => {
    setFornecedores(fornecedores.map(f =>
      f.id === id ? { ...f, ativo: !f.ativo } : f
    ));
  };

  const handleDeleteFornecedor = (id: string) => {
    if (confirm('Deseja realmente excluir este fornecedor?')) {
      setFornecedores(fornecedores.filter(f => f.id !== id));
    }
  };

  // Funções para Gás
  const handleOpenGasModal = (gas?: Gas) => {
    if (gas) {
      setEditingGas(gas);
      setGasForm({
        nome: gas.nome,
        pureza: gas.pureza,
        pressao: gas.pressao,
        descricao: gas.descricao
      });
    } else {
      setEditingGas(null);
      setGasForm({
        nome: '',
        pureza: '',
        pressao: '',
        descricao: ''
      });
    }
    setShowGasModal(true);
  };

  const handleSaveGas = () => {
    if (editingGas) {
      // Editar
      setGases(gases.map(g => 
        g.id === editingGas.id 
          ? { ...g, ...gasForm }
          : g
      ));
    } else {
      // Adicionar
      const novoGas: Gas = {
        id: Date.now().toString(),
        ...gasForm,
        ativo: true
      };
      setGases([...gases, novoGas]);
    }
    setShowGasModal(false);
  };

  const handleToggleGasStatus = (id: string) => {
    setGases(gases.map(g =>
      g.id === id ? { ...g, ativo: !g.ativo } : g
    ));
  };

  const handleDeleteGas = (id: string) => {
    if (confirm('Deseja realmente excluir este gás?')) {
      setGases(gases.filter(g => g.id !== id));
    }
  };

  // Filtros
  const fornecedoresFiltrados = fornecedores.filter(f =>
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.cnpj.includes(searchTerm) ||
    f.contato.includes(searchTerm)
  );

  const gasesFiltrados = gases.filter(g =>
    g.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-[#DC0000]">
            <Settings className="w-6 h-6" />
            Cadastro de Gases
          </h1>
          <p className="text-[#666666] mt-1">
            Cadastro de tipos de gases, fornecedores e configurações
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white border-[#E5E5E5]">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#666666]" />
            <Input
              type="text"
              placeholder="Buscar por tipo de gás, fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-[#E5E5E5]"
            />
          </div>
          <div className="flex gap-2">
            {/* Toggle de Visualização */}
            <div className="flex border border-[#E5E5E5] rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className={`rounded-none ${viewMode === 'card' ? 'bg-[#DC0000] hover:bg-[#B80000] text-white' : 'hover:bg-gray-50'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={`rounded-none border-l border-[#E5E5E5] ${viewMode === 'table' ? 'bg-[#DC0000] hover:bg-[#B80000] text-white' : 'hover:bg-gray-50'}`}
              >
                <Table className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" className="border-[#E5E5E5]">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* SEÇÃO FORNECEDOR */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[#1A1A1A] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#DC0000]" />
            Fornecedor
          </h2>
          <Button 
            className="bg-[#DC0000] hover:bg-[#B80000] text-white"
            onClick={() => handleOpenFornecedorModal()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>

        <Card className="bg-white border-[#E5E5E5]">
          <div className="p-6">
            {fornecedoresFiltrados.length === 0 ? (
              <div className="text-center py-12 text-[#666666]">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhum fornecedor encontrado</p>
              </div>
            ) : viewMode === 'card' ? (
              <div className="space-y-4">
                {fornecedoresFiltrados.map((fornecedor) => (
                  <div 
                    key={fornecedor.id}
                    className="flex items-center justify-between p-4 border border-[#E5E5E5] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Building2 className="w-10 h-10 text-[#DC0000] p-2 bg-red-50 rounded-lg" />
                      <div className="flex-1">
                        <p className="text-[#1A1A1A]">{fornecedor.nome}</p>
                        <p className="text-sm text-[#666666]">
                          CNPJ: {fornecedor.cnpj} • Contato: {fornecedor.contato}
                        </p>
                        <p className="text-sm text-[#666666]">{fornecedor.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`cursor-pointer ${
                          fornecedor.ativo 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                        onClick={() => handleToggleFornecedorStatus(fornecedor.id)}
                      >
                        {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenFornecedorModal(fornecedor)}
                      >
                        <Edit className="w-4 h-4 text-[#666666]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFornecedor(fornecedor.id)}
                      >
                        <Trash2 className="w-4 h-4 text-[#DC0000]" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E5E5E5]">
                      <th className="text-left py-3 px-4 text-sm text-[#666666]">Fornecedor</th>
                      <th className="text-left py-3 px-4 text-sm text-[#666666]">CNPJ</th>
                      <th className="text-left py-3 px-4 text-sm text-[#666666]">Contato</th>
                      <th className="text-left py-3 px-4 text-sm text-[#666666]">E-mail</th>
                      <th className="text-left py-3 px-4 text-sm text-[#666666]">Status</th>
                      <th className="text-center py-3 px-4 text-sm text-[#666666]">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fornecedoresFiltrados.map((fornecedor) => (
                      <tr 
                        key={fornecedor.id}
                        className="border-b border-[#E5E5E5] hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Building2 className="w-8 h-8 text-[#DC0000] p-1.5 bg-red-50 rounded-lg flex-shrink-0" />
                            <span className="text-[#1A1A1A]">{fornecedor.nome}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-[#666666]">{fornecedor.cnpj}</td>
                        <td className="py-3 px-4 text-sm text-[#666666]">{fornecedor.contato}</td>
                        <td className="py-3 px-4 text-sm text-[#666666]">{fornecedor.email}</td>
                        <td className="py-3 px-4">
                          <Badge 
                            className={`cursor-pointer ${
                              fornecedor.ativo 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                            onClick={() => handleToggleFornecedorStatus(fornecedor.id)}
                          >
                            {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenFornecedorModal(fornecedor)}
                            >
                              <Edit className="w-4 h-4 text-[#666666]" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFornecedor(fornecedor.id)}
                            >
                              <Trash2 className="w-4 h-4 text-[#DC0000]" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* SEÇÃO GASES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[#1A1A1A] flex items-center gap-2">
            <Wind className="w-5 h-5 text-[#DC0000]" />
            Gases
          </h2>
          <Button 
            className="bg-[#DC0000] hover:bg-[#B80000] text-white"
            onClick={() => handleOpenGasModal()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Tipo de Gás
          </Button>
        </div>

        <Card className="bg-white border-[#E5E5E5]">
          <div className="p-6">
            {gasesFiltrados.length === 0 ? (
              <div className="text-center py-12 text-[#666666]">
                <Wind className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhum gás encontrado</p>
              </div>
            ) : viewMode === 'card' ? (
              <div className="space-y-4">
                {gasesFiltrados.map((gas) => (
                  <div 
                    key={gas.id}
                    className="flex items-center justify-between p-4 border border-[#E5E5E5] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Wind className="w-10 h-10 text-[#DC0000] p-2 bg-red-50 rounded-lg" />
                      <div className="flex-1">
                        <p className="text-[#1A1A1A]">{gas.nome}</p>
                        <p className="text-sm text-[#666666]">
                          Pureza: {gas.pureza} • Pressão: {gas.pressao}
                        </p>
                        <p className="text-sm text-[#666666]">{gas.descricao}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`cursor-pointer ${
                          gas.ativo 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                        onClick={() => handleToggleGasStatus(gas.id)}
                      >
                        {gas.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenGasModal(gas)}
                      >
                        <Edit className="w-4 h-4 text-[#666666]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGas(gas.id)}
                      >
                        <Trash2 className="w-4 h-4 text-[#DC0000]" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E5E5E5]">
                      <th className="text-left py-3 px-4 text-sm text-[#666666]">Tipo de Gás</th>
                      <th className="text-left py-3 px-4 text-sm text-[#666666]">Pureza</th>
                      <th className="text-left py-3 px-4 text-sm text-[#666666]">Pressão</th>
                      <th className="text-left py-3 px-4 text-sm text-[#666666]">Descrição</th>
                      <th className="text-left py-3 px-4 text-sm text-[#666666]">Status</th>
                      <th className="text-center py-3 px-4 text-sm text-[#666666]">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gasesFiltrados.map((gas) => (
                      <tr 
                        key={gas.id}
                        className="border-b border-[#E5E5E5] hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Wind className="w-8 h-8 text-[#DC0000] p-1.5 bg-red-50 rounded-lg flex-shrink-0" />
                            <span className="text-[#1A1A1A]">{gas.nome}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-[#666666]">{gas.pureza}</td>
                        <td className="py-3 px-4 text-sm text-[#666666]">{gas.pressao}</td>
                        <td className="py-3 px-4 text-sm text-[#666666] max-w-xs truncate">
                          {gas.descricao}
                        </td>
                        <td className="py-3 px-4">
                          <Badge 
                            className={`cursor-pointer ${
                              gas.ativo 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                            onClick={() => handleToggleGasStatus(gas.id)}
                          >
                            {gas.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenGasModal(gas)}
                            >
                              <Edit className="w-4 h-4 text-[#666666]" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGas(gas.id)}
                            >
                              <Trash2 className="w-4 h-4 text-[#DC0000]" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* MODAL FORNECEDOR */}
      {showFornecedorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-[#1A1A1A] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#DC0000]" />
                {editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFornecedorModal(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="nome">Nome do Fornecedor *</Label>
                <Input
                  id="nome"
                  value={fornecedorForm.nome}
                  onChange={(e) => setFornecedorForm({ ...fornecedorForm, nome: e.target.value })}
                  placeholder="Ex: White Martins"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={fornecedorForm.cnpj}
                  onChange={(e) => setFornecedorForm({ ...fornecedorForm, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contato">Contato *</Label>
                <Input
                  id="contato"
                  value={fornecedorForm.contato}
                  onChange={(e) => setFornecedorForm({ ...fornecedorForm, contato: e.target.value })}
                  placeholder="(11) 98765-4321"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={fornecedorForm.email}
                  onChange={(e) => setFornecedorForm({ ...fornecedorForm, email: e.target.value })}
                  placeholder="contato@fornecedor.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={fornecedorForm.endereco}
                  onChange={(e) => setFornecedorForm({ ...fornecedorForm, endereco: e.target.value })}
                  placeholder="Rua, número - Cidade/Estado"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E5E5E5] flex gap-2 justify-end sticky bottom-0 bg-white">
              <Button
                variant="outline"
                onClick={() => setShowFornecedorModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-[#DC0000] hover:bg-[#B80000] text-white"
                onClick={handleSaveFornecedor}
                disabled={!fornecedorForm.nome || !fornecedorForm.cnpj || !fornecedorForm.contato || !fornecedorForm.email}
              >
                {editingFornecedor ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL GÁS */}
      {showGasModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-[#1A1A1A] flex items-center gap-2">
                <Wind className="w-5 h-5 text-[#DC0000]" />
                {editingGas ? 'Editar Gás' : 'Novo Tipo de Gás'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGasModal(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="gas-nome">Nome do Gás *</Label>
                <Input
                  id="gas-nome"
                  value={gasForm.nome}
                  onChange={(e) => setGasForm({ ...gasForm, nome: e.target.value })}
                  placeholder="Ex: Nitrogênio"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pureza">Pureza *</Label>
                  <Input
                    id="pureza"
                    value={gasForm.pureza}
                    onChange={(e) => setGasForm({ ...gasForm, pureza: e.target.value })}
                    placeholder="Ex: 99.9%"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pressao">Pressão *</Label>
                  <Input
                    id="pressao"
                    value={gasForm.pressao}
                    onChange={(e) => setGasForm({ ...gasForm, pressao: e.target.value })}
                    placeholder="Ex: 200 bar"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={gasForm.descricao}
                  onChange={(e) => setGasForm({ ...gasForm, descricao: e.target.value })}
                  placeholder="Descrição do gás e sua utilização"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E5E5E5] flex gap-2 justify-end sticky bottom-0 bg-white">
              <Button
                variant="outline"
                onClick={() => setShowGasModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-[#DC0000] hover:bg-[#B80000] text-white"
                onClick={handleSaveGas}
                disabled={!gasForm.nome || !gasForm.pureza || !gasForm.pressao}
              >
                {editingGas ? 'Salvar Alterações' : 'Cadastrar Gás'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}