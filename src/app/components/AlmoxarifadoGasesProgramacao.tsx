import { useState, useEffect } from 'react';
import { Calendar, Plus, Download, Wind, FileSpreadsheet, Building2, Phone, Mail, MapPin, AlertCircle, Save, Edit2, Trash2, BarChart3, TrendingUp, Package, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import { 
  getGasProgramming, 
  saveGasProgramming, 
  deleteGasProgramming,
  getGasProgrammingStats,
  type GasProgramming 
} from '../utils/gasProgrammingSupabase';
import { getMasterData } from '../utils/storage';
import { GasProgrammingMigrationAlert } from './GasProgrammingMigrationAlert';
import exampleImage from 'figma:asset/97ec764900b7d4498837083c2683210594933918.png';

// Tipos de gases disponíveis
const TIPOS_GASES = {
  nitrogenio: [
    { id: 'n2_9m3', label: 'Nitrogênio 9m³/10m³', categoria: 'Cilindro Grande' },
    { id: 'n2_3m3', label: 'Nitrogênio 3m³/3.8m³', categoria: 'Cilindro Médio' },
  ],
  outros: [
    { id: 'argonio_1m3', label: 'Argônio 1m³', categoria: 'Outros' },
    { id: 'argonio_3m3', label: 'Argônio 3m³', categoria: 'Outros' },
    { id: 'argonio_6m3', label: 'Argônio 6m³', categoria: 'Outros' },
    { id: 'acetileno_1m3', label: 'Acetileno 1m³', categoria: 'Outros' },
    { id: 'acetileno_3m3', label: 'Acetileno 3m³', categoria: 'Outros' },
    { id: 'acetileno_6m3', label: 'Acetileno 6m³', categoria: 'Outros' },
    { id: 'oxigenio_1m3', label: 'Oxigênio 1m³', categoria: 'Outros' },
    { id: 'oxigenio_3m3', label: 'Oxigênio 3m³', categoria: 'Outros' },
    { id: 'oxigenio_6m3', label: 'Oxigênio 6m³', categoria: 'Outros' },
    { id: 'empilhadeira_p20', label: 'Gás Empilhadeira P20 (20kg)', categoria: 'Outros' },
  ]
};

// Fornecedores por pista
const FORNECEDORES_POR_PISTA = {
  'Interlagos': [
    {
      nome: 'ACESOLDA Gases',
      contatos: [
        { nome: 'Ricardo Acesolda', telefone: '+55 11 94541-6507' }
      ],
      email: 'acesolda@acesolda.com.br',
      principal: false
    },
    {
      nome: 'GAMA Gases',
      contatos: [
        { nome: 'Mauricio Gama', telefone: '+55 11 99131-1745' },
        { nome: 'Cristiano Gama', telefone: '+55 11 96600-5041' }
      ],
      email: 'cristiano.baptistella@linde.com',
      principal: false
    },
    {
      nome: 'OXITAB - Oxigênio Taboão',
      endereco: 'Rua Dr. Ezequiel de Paula Ramos Júnior 79',
      contatos: [],
      email: 'contato@oxigeniotaboao.com.br',
      principal: false
    },
    {
      nome: 'Liquigás (Empilhadeira)',
      endereco: 'Av. Interlagos, 6421 - Interlagos',
      contatos: [
        { nome: 'Atendimento', telefone: '+55 11 98330-4438' }
      ],
      email: '',
      principal: false,
      especialidade: 'Gás de Empilhadeira P20'
    }
  ],
  'Velocitta': [
    {
      nome: 'Gás Guaçu White Martins',
      codigo: '032365',
      endereco: 'Rodovia SP 342, Km 187, S/n - Nova Louza, Mogi Guaçu - SP, 13840-970',
      contatos: [
        { nome: 'Andre Nitrogênio Mogi', telefone: '+55 19 99341-1104' },
        { nome: 'Sara Nitrogênio Mogi', telefone: '+55 19 98894-9007' }
      ],
      email: 'Andre.Campos@linde.com',
      principal: true
    }
  ],
  'Goiânia': [
    {
      nome: 'EBO - Empresa Brasileira de Oxigênio',
      endereco: 'Rodovia GO 020 - Km 04 s/n Parque Lozandes, Goiânia - GO, 74775-013',
      contatos: [
        { nome: 'Pedro Teles', telefone: '(62) 3291-5151' }
      ],
      email: 'financeiroebo@hotmail.com',
      principal: true,
      observacao: 'Único fornecedor que nos atende!'
    }
  ],
  'Termas de Rio Hondo': [
    {
      nome: 'Farber Elizabeth Nitrogênio Argentina',
      contatos: [
        { nome: 'Elizabeth Farber', telefone: '+54 9 362 451-3172' }
      ],
      email: 'Elizabeth.Farber@linde.com',
      principal: true
    }
  ],
  'Estoril': [
    {
      nome: 'Matinalca Portugal',
      contatos: [
        { nome: 'Atendimento', telefone: '+351 964 000 404' }
      ],
      email: 'matinalca@gmail.com',
      principal: true
    }
  ],
  'Algarve': [
    {
      nome: 'Matinalca Portugal',
      contatos: [
        { nome: 'Atendimento', telefone: '+351 964 000 404' }
      ],
      email: 'matinalca@gmail.com',
      principal: true
    }
  ]
};

export default function AlmoxarifadoGasesProgramacao() {
  const [pista, setPista] = useState<string>('');
  const [etapa, setEtapa] = useState<string>('');
  const [temporada, setTemporada] = useState<string>('2025');
  const [programacoes, setProgramacoes] = useState<GasProgramming[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showFornecedores, setShowFornecedores] = useState(false);
  const [editingProgramacao, setEditingProgramacao] = useState<GasProgramming | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dbError, setDbError] = useState<{ code?: string; message?: string } | null>(null);

  // Stats
  const [stats, setStats] = useState<{
    totalProgramado: number;
    porStatus: Record<string, number>;
    porCategoria: Record<string, number>;
    porGas: Record<string, number>;
    historicoEtapas: Array<{ etapa: string; pista: string; total: number }>;
  } | null>(null);

  // Form states
  const [formCategoria, setFormCategoria] = useState('');
  const [formGasType, setFormGasType] = useState('');
  const [formQuantidade, setFormQuantidade] = useState<number>(0);
  const [formFornecedor, setFormFornecedor] = useState('');
  const [formDataProgramada, setFormDataProgramada] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');

  // Dados do Master Data
  const [pistas, setPistas] = useState<string[]>([]);
  const [etapas, setEtapas] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);

  const fornecedoresDisponiveis = pista ? FORNECEDORES_POR_PISTA[pista as keyof typeof FORNECEDORES_POR_PISTA] || [] : [];

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    if (pista && etapa && temporada) {
      loadProgramacoes();
    }
  }, [pista, etapa, temporada]);

  useEffect(() => {
    if (temporada) {
      loadStats();
    }
  }, [temporada, pista]);

  const loadMasterData = async () => {
    try {
      const data = await getMasterData();
      
      if (data.pista) {
        setPistas(data.pista.map(p => p.name));
      }
      if (data.etapa) {
        setEtapas(data.etapa.map(e => e.name));
      }
      if (data.categoria) {
        setCategorias(data.categoria.map(c => c.name));
      }
    } catch (error) {
      console.error('Erro ao carregar master data:', error);
      toast.error('Erro ao carregar dados');
    }
  };

  const loadProgramacoes = async () => {
    try {
      setIsLoading(true);
      setDbError(null);
      const data = await getGasProgramming({ pista, etapa, temporada });
      setProgramacoes(data);
    } catch (error: any) {
      console.error('Erro ao carregar programações:', error);
      
      // Verifica se é erro de tabela não encontrada
      const isTableError = 
        error?.code === 'PGRST116' || 
        error?.code === '42P01' || 
        error?.message?.includes('gas_programming') ||
        error?.message?.includes('relation') ||
        error?.message?.includes('does not exist');
      
      if (isTableError) {
        setDbError({
          code: error?.code || 'PGRST116',
          message: error?.message || 'Tabela gas_programming não encontrada'
        });
      } else {
        toast.error('Erro ao carregar programações: ' + (error?.message || 'Erro desconhecido'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getGasProgrammingStats({ pista, temporada });
      setStats(data);
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
      // Não mostra toast aqui pois é opcional
      const isTableError = 
        error?.code === 'PGRST116' || 
        error?.code === '42P01' || 
        error?.message?.includes('gas_programming');
      
      if (isTableError) {
        setDbError({
          code: error?.code || 'PGRST116',
          message: error?.message || 'Tabela gas_programming não encontrada'
        });
      }
    }
  };

  const handleNovaProgramacao = () => {
    if (!pista || !etapa) {
      toast.error('Selecione a pista e etapa primeiro');
      return;
    }
    setEditingProgramacao(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormCategoria('');
    setFormGasType('');
    setFormQuantidade(0);
    setFormFornecedor('');
    setFormDataProgramada('');
    setFormObservacoes('');
  };

  const handleSaveProgramacao = async () => {
    if (!formCategoria || !formGasType || formQuantidade <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!pista || !etapa || !temporada) {
      toast.error('Selecione a pista, etapa e temporada');
      return;
    }

    const gasLabel = [...TIPOS_GASES.nitrogenio, ...TIPOS_GASES.outros].find(g => g.id === formGasType)?.label || formGasType;

    try {
      setIsSaving(true);
      
      const programming: any = {
        pista,
        etapa,
        temporada,
        categoria: formCategoria,
        gas_type: gasLabel,
        quantidade: formQuantidade,
        fornecedor: formFornecedor || 'A definir',
        status: (formDataProgramada ? 'solicitado' : 'planejado') as GasProgramming['status'],
      };

      // Adiciona id apenas se estiver editando
      if (editingProgramacao?.id) {
        programming.id = editingProgramacao.id;
      }

      // Adiciona campos opcionais apenas se tiverem valor
      if (formDataProgramada) {
        programming.data_programada = formDataProgramada;
      }

      if (formObservacoes) {
        programming.observacoes = formObservacoes;
      }

      await saveGasProgramming(programming);
      
      toast.success(editingProgramacao ? 'Programação atualizada com sucesso' : 'Programação adicionada com sucesso');
      
      setIsDialogOpen(false);
      resetForm();
      await loadProgramacoes();
      await loadStats();
    } catch (error: any) {
      console.error('Erro ao salvar programação:', error);
      
      const isTableError = 
        error?.code === 'PGRST116' || 
        error?.code === '42P01' || 
        error?.message?.includes('gas_programming');
      
      const isConstraintError = 
        error?.code === '23502' || 
        error?.code === '23503' ||
        error?.message?.includes('violates');
      
      if (isTableError) {
        toast.error('Tabela não encontrada. Execute a migration SQL primeiro.');
        setDbError({
          code: error?.code || 'PGRST116',
          message: error?.message || 'Tabela gas_programming não encontrada'
        });
      } else if (isConstraintError) {
        toast.error('Erro de validação. Verifique se todos os campos estão preenchidos corretamente.');
      } else {
        toast.error('Erro ao salvar: ' + (error?.message || 'Erro desconhecido'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditProgramacao = (prog: GasProgramming) => {
    setEditingProgramacao(prog);
    setFormCategoria(prog.categoria);
    const gasId = [...TIPOS_GASES.nitrogenio, ...TIPOS_GASES.outros].find(g => g.label === prog.gas_type)?.id || '';
    setFormGasType(gasId);
    setFormQuantidade(prog.quantidade);
    setFormFornecedor(prog.fornecedor || '');
    setFormDataProgramada(prog.data_programada || '');
    setFormObservacoes(prog.observacoes || '');
    setIsDialogOpen(true);
  };

  const handleDeleteProgramacao = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta programação?')) {
      return;
    }
    
    try {
      await deleteGasProgramming(id);
      toast.success('Programação removida');
      await loadProgramacoes();
      await loadStats();
    } catch (error: any) {
      console.error('Erro ao deletar programação:', error);
      toast.error('Erro ao remover: ' + (error?.message || 'Erro desconhecido'));
    }
  };

  const programacoesFiltradas = programacoes;

  // Agrupar por categoria
  const programacoesPorCategoria = categorias.reduce((acc, cat) => {
    acc[cat] = programacoesFiltradas.filter(p => p.categoria === cat);
    return acc;
  }, {} as Record<string, GasProgramming[]>);

  const getStatusBadge = (status: GasProgramming['status']) => {
    const config = {
      planejado: { label: 'Planejado', className: 'bg-gray-100 text-gray-800' },
      solicitado: { label: 'Solicitado', className: 'bg-yellow-100 text-yellow-800' },
      confirmado: { label: 'Confirmado', className: 'bg-blue-100 text-blue-800' },
      entregue: { label: 'Entregue', className: 'bg-green-100 text-green-800' },
      cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800' }
    };
    return <Badge className={config[status].className}>{config[status].label}</Badge>;
  };

  const handleExportarPlanilha = () => {
    toast.info('Funcionalidade de exportação em desenvolvimento');
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl lg:mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-gray-900">Programação de Gases</h1>
              <p className="text-gray-500">Planejamento e controle de gases por etapa</p>
            </div>
          </div>
        </div>

        {/* Alerta de Migration */}
        <GasProgrammingMigrationAlert 
          errorCode={dbError?.code}
          errorMessage={dbError?.message}
        />

        {/* Info Card - Exemplo de Planilha */}
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
            <div className="flex-1">
              <h3 className="text-blue-900 text-sm mb-2">📊 Baseado na sua planilha atual</h3>
              <p className="text-xs text-blue-700 mb-3">
                Este sistema digitaliza o processo que você já usa em Excel. Selecione a pista e etapa, 
                depois programe os gases por categoria (Carrera, Challenge, Trophy).
              </p>
              <details className="text-xs">
                <summary className="text-blue-800 cursor-pointer hover:text-blue-900">
                  Ver exemplo da planilha original
                </summary>
                <div className="mt-2 border border-blue-200 rounded-lg overflow-hidden">
                  <img src={exampleImage} alt="Exemplo de planilha" className="w-full" />
                </div>
              </details>
            </div>
          </div>
        </Card>

        {/* Seleção de Pista/Etapa */}
        <Card className="p-6 mb-6">
          <h2 className="text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={20} />
            Selecionar Etapa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="pista">Pista</Label>
              <Select value={pista} onValueChange={setPista}>
                <SelectTrigger id="pista">
                  <SelectValue placeholder="Selecione a pista" />
                </SelectTrigger>
                <SelectContent>
                  {pistas.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="etapa">Etapa</Label>
              <Select value={etapa} onValueChange={setEtapa}>
                <SelectTrigger id="etapa">
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {etapas.map(e => (
                    <SelectItem key={e} value={e}>Etapa {e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="temporada">Temporada</Label>
              <Select value={temporada} onValueChange={setTemporada}>
                <SelectTrigger id="temporada">
                  <SelectValue placeholder="Selecione a temporada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Estatísticas Gerais (Histórico) */}
        {stats && temporada && (
          <Card className="p-6 mb-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="text-purple-600" size={20} />
              <h3 className="text-purple-900">Relatório Histórico - Temporada {temporada}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-xs text-gray-600">Total Programado</p>
                <p className="text-2xl text-purple-600 mt-1">{stats.totalProgramado}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-xs text-gray-600">Entregues</p>
                <p className="text-2xl text-green-600 mt-1">{stats.porStatus.entregue || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-xs text-gray-600">Confirmados</p>
                <p className="text-2xl text-blue-600 mt-1">{stats.porStatus.confirmado || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-xs text-gray-600">Pendentes</p>
                <p className="text-2xl text-yellow-600 mt-1">
                  {(stats.porStatus.planejado || 0) + (stats.porStatus.solicitado || 0)}
                </p>
              </div>
            </div>

            {/* Histórico por Etapa */}
            {stats.historicoEtapas.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm text-purple-900 mb-3">📍 Histórico por Etapa</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {stats.historicoEtapas.map((etapaData, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-600">{etapaData.pista}</p>
                      <p className="text-sm text-gray-900">Etapa {etapaData.etapa}</p>
                      <p className="text-lg text-purple-600">{etapaData.total}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top 5 Gases Mais Utilizados */}
            {Object.keys(stats.porGas).length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm text-purple-900 mb-3">🔝 Top 5 Gases Mais Utilizados</h4>
                <div className="space-y-2">
                  {Object.entries(stats.porGas)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([gas, count], idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{idx + 1}º</Badge>
                          <span className="text-sm text-gray-900">{gas}</span>
                        </div>
                        <span className="text-sm text-purple-600">{count} programações</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Fornecedores Disponíveis */}
        {pista && fornecedoresDisponiveis.length > 0 && (
          <Card className="p-6 mb-6 bg-green-50 border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-green-900 flex items-center gap-2">
                <Building2 size={18} />
                Fornecedores em {pista}
              </h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowFornecedores(!showFornecedores)}
              >
                {showFornecedores ? 'Ocultar' : 'Mostrar'} Detalhes
              </Button>
            </div>
            {showFornecedores && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fornecedoresDisponiveis.map((forn, idx) => (
                  <Card key={idx} className="p-4 bg-white border-green-200">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm text-gray-900">{forn.nome}</h4>
                        {forn.principal && (
                          <Badge className="bg-green-600 text-white text-xs">Principal</Badge>
                        )}
                      </div>
                      {forn.codigo && (
                        <p className="text-xs text-gray-600">Código: {forn.codigo}</p>
                      )}
                      {forn.endereco && (
                        <p className="text-xs text-gray-600 flex items-start gap-1">
                          <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                          {forn.endereco}
                        </p>
                      )}
                      {forn.contatos.map((contato, i) => (
                        <p key={i} className="text-xs text-gray-600 flex items-center gap-1">
                          <Phone size={12} />
                          {contato.nome}: {contato.telefone}
                        </p>
                      ))}
                      {forn.email && (
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <Mail size={12} />
                          {forn.email}
                        </p>
                      )}
                      {forn.especialidade && (
                        <Badge variant="outline" className="text-xs">{forn.especialidade}</Badge>
                      )}
                      {forn.observacao && (
                        <p className="text-xs text-green-800 italic mt-2">⚠️ {forn.observacao}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Ações */}
        {pista && etapa && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              onClick={handleNovaProgramacao}
              className="bg-red-600 hover:bg-red-700"
            >
              <Plus size={16} className="mr-2" />
              Nova Programação
            </Button>
            <Button
              onClick={handleExportarPlanilha}
              variant="outline"
            >
              <Download size={16} className="mr-2" />
              Exportar Excel
            </Button>
          </div>
        )}

        {/* Programações */}
        {pista && etapa ? (
          isLoading ? (
            <Card className="p-12">
              <div className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              </div>
            </Card>
          ) : (
            <Tabs defaultValue="visao-geral" className="space-y-4">
              <TabsList>
                <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
                <TabsTrigger value="por-categoria">Por Categoria</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="visao-geral" className="space-y-4">
                <Card className="p-6">
                  <h2 className="text-gray-900 mb-4">
                    Programação: {pista} - Etapa {etapa} - Temporada {temporada}
                  </h2>
                  {programacoesFiltradas.length === 0 ? (
                    <div className="text-center py-12">
                      <Wind className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-gray-900 mb-2">Nenhuma programação cadastrada</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Clique em "Nova Programação" para começar
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {programacoesFiltradas.map(prog => (
                        <Card key={prog.id} className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{prog.categoria}</Badge>
                                {getStatusBadge(prog.status)}
                              </div>
                              <p className="text-gray-900 mb-1">{prog.gas_type}</p>
                              <p className="text-sm text-gray-600">
                                Quantidade: <strong>{prog.quantidade}</strong> unidades
                              </p>
                              <p className="text-sm text-gray-600">
                                Fornecedor: {prog.fornecedor}
                              </p>
                              {prog.data_programada && (
                                <p className="text-sm text-gray-600">
                                  Data: {new Date(prog.data_programada).toLocaleDateString('pt-BR')}
                                </p>
                              )}
                              {prog.observacoes && (
                                <p className="text-xs text-gray-500 italic mt-2">{prog.observacoes}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditProgramacao(prog)}
                              >
                                <Edit2 size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteProgramacao(prog.id)}
                              >
                                <Trash2 size={14} className="text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="por-categoria" className="space-y-4">
                {categorias.map(cat => (
                  <Card key={cat} className="p-6">
                    <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                      {cat}
                      <Badge>{programacoesPorCategoria[cat]?.length || 0}</Badge>
                    </h3>
                    {programacoesPorCategoria[cat]?.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">
                        Nenhuma programação para {cat}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {programacoesPorCategoria[cat]?.map(prog => (
                          <Card key={prog.id} className="p-3 bg-gray-50">
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-sm text-gray-900">{prog.gas_type}</p>
                              {getStatusBadge(prog.status)}
                            </div>
                            <p className="text-xs text-gray-600">Qtd: {prog.quantidade}</p>
                            <p className="text-xs text-gray-600">{prog.fornecedor}</p>
                          </Card>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card className="p-6">
                  <h2 className="text-gray-900 mb-4">Timeline de Entregas</h2>
                  {programacoesFiltradas.filter(p => p.data_programada).length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-sm text-gray-500">
                        Nenhuma entrega programada ainda
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {programacoesFiltradas
                        .filter(p => p.data_programada)
                        .sort((a, b) => new Date(a.data_programada!).getTime() - new Date(b.data_programada!).getTime())
                        .map(prog => (
                          <div key={prog.id} className="flex items-center gap-4 p-3 border-l-4 border-blue-500 bg-gray-50 rounded">
                            <div className="text-sm text-gray-600 min-w-[100px]">
                              {new Date(prog.data_programada!).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">{prog.gas_type}</p>
                              <p className="text-xs text-gray-600">{prog.categoria} - {prog.fornecedor}</p>
                            </div>
                            {getStatusBadge(prog.status)}
                          </div>
                        ))}
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          )
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-gray-900 mb-2">Selecione a Pista e Etapa</h3>
              <p className="text-sm text-gray-500">
                Escolha a pista e etapa acima para começar a programar os gases
              </p>
            </div>
          </Card>
        )}

        {/* Dialog - Nova/Editar Programação */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProgramacao ? 'Editar' : 'Nova'} Programação de Gás
              </DialogTitle>
              <DialogDescription>
                {pista} - Etapa {etapa} - Temporada {temporada}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="categoria">Categoria *</Label>
                <Select value={formCategoria} onValueChange={setFormCategoria}>
                  <SelectTrigger id="categoria">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="gasType">Tipo de Gás *</Label>
                <Select value={formGasType} onValueChange={setFormGasType}>
                  <SelectTrigger id="gasType">
                    <SelectValue placeholder="Selecione o tipo de gás" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Nitrogênio</div>
                    {TIPOS_GASES.nitrogenio.map(gas => (
                      <SelectItem key={gas.id} value={gas.id}>{gas.label}</SelectItem>
                    ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1 pt-2">Outros Gases</div>
                    {TIPOS_GASES.outros.map(gas => (
                      <SelectItem key={gas.id} value={gas.id}>{gas.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantidade">Quantidade (unidades) *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="0"
                  value={formQuantidade || ''}
                  onChange={(e) => setFormQuantidade(Number(e.target.value))}
                  placeholder="Ex: 10"
                />
              </div>

              <div>
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Select value={formFornecedor} onValueChange={setFormFornecedor}>
                  <SelectTrigger id="fornecedor">
                    <SelectValue placeholder="Selecione o fornecedor (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A definir">A definir</SelectItem>
                    {fornecedoresDisponiveis.map((forn, idx) => (
                      <SelectItem key={idx} value={forn.nome}>{forn.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dataProgramada">Data Programada (opcional)</Label>
                <Input
                  id="dataProgramada"
                  type="date"
                  value={formDataProgramada}
                  onChange={(e) => setFormDataProgramada(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Input
                  id="observacoes"
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  placeholder="Informações adicionais..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveProgramacao} className="bg-red-600 hover:bg-red-700" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
