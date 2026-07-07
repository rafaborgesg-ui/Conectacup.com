import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Copy,
  ExternalLink,
  FileDown,
  FileText,
  Filter,
  Gauge,
  Handshake,
  History,
  Mail,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  XCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { createClient } from '../utils/supabase/client';
import { getSeasonStages, getSeasons, type Season, type SeasonStage } from '../utils/seasonStorage';
import {
  SOURCING_CATEGORIES,
  SOURCING_CURRENCIES,
  SOURCING_EVENT_TYPES,
  SOURCING_PRIORITIES,
  SOURCING_STATUS,
  createSourcingEvent,
  createSourcingProposal,
  createSourcingSupplier,
  duplicateSourcingEvent,
  getBestProposalForEvent,
  getDashboardMetrics,
  getEventHistory,
  getEventItems,
  getEventProposals,
  getEventSuppliers,
  loadSourcingState,
  recommendSourcingSupplier,
  resolveSourcingApproval,
  updateSourcingEvent,
  updateSourcingSupplier,
  type SourcingEvent,
  type SourcingEventInput,
  type SourcingProposalInput,
  type SourcingState,
  type SourcingSupplierInput
} from '../utils/sourcingStorage';

type TabKey =
  | 'dashboard'
  | 'eventos'
  | 'novo'
  | 'detalhes'
  | 'fornecedores'
  | 'propostas'
  | 'comparativo'
  | 'aprovacoes'
  | 'relatorios'
  | 'configuracoes';

interface ProjetoOption {
  id: string;
  code: string;
  name: string;
  temporada?: number;
}

const tabs: Array<{ id: TabKey; label: string; icon: any }> = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'eventos', label: 'Eventos/RFPs', icon: FileText },
  { id: 'novo', label: 'Novo evento', icon: Plus },
  { id: 'detalhes', label: 'Detalhes do evento', icon: ClipboardCheck },
  { id: 'fornecedores', label: 'Fornecedores', icon: Users },
  { id: 'propostas', label: 'Propostas recebidas', icon: Mail },
  { id: 'comparativo', label: 'Mapa comparativo', icon: SlidersHorizontal },
  { id: 'aprovacoes', label: 'Aprovações', icon: ShieldCheck },
  { id: 'relatorios', label: 'Relatórios', icon: FileDown },
  { id: 'configuracoes', label: 'Configurações', icon: Settings }
];

const workflowStages: Array<{
  title: string;
  description: string;
  tabs: TabKey[];
  icon: any;
}> = [
  {
    title: 'Planejar',
    description: 'Escopo, itens e fornecedores',
    tabs: ['dashboard', 'eventos', 'novo'],
    icon: FileText
  },
  {
    title: 'Convidar',
    description: 'Portal público e e-mails',
    tabs: ['detalhes', 'fornecedores'],
    icon: Send
  },
  {
    title: 'Cotar',
    description: 'Propostas e respostas',
    tabs: ['propostas'],
    icon: Mail
  },
  {
    title: 'Equalizar',
    description: 'Comparativo comercial',
    tabs: ['comparativo'],
    icon: SlidersHorizontal
  },
  {
    title: 'Aprovar',
    description: 'Recomendação e governança',
    tabs: ['aprovacoes'],
    icon: ShieldCheck
  },
  {
    title: 'Controlar',
    description: 'Relatórios e parâmetros',
    tabs: ['relatorios', 'configuracoes'],
    icon: BarChart3
  }
];

const statusWorkflowOrder: Record<string, number> = {
  Rascunho: 12,
  Publicado: 24,
  'Aguardando fornecedores': 38,
  'Em cotacao': 50,
  'Em analise': 68,
  'Aguardando aprovacao': 82,
  Aprovado: 100,
  Recusado: 100,
  Encerrado: 100,
  Cancelado: 100
};

const initialEventForm: SourcingEventInput = {
  titulo: '',
  tipoEvento: 'RFP',
  categoria: 'Frete',
  prioridade: 'Media',
  status: 'Rascunho',
  moeda: 'BRL',
  dataAbertura: new Date().toISOString().slice(0, 10),
  prazoResposta: '',
  descricao: '',
  condicoesGerais: '',
  condicaoPagamentoDesejada: '',
  validadeMinimaProposta: 30,
  observacoesInternas: '',
  items: [
    {
      descricao: '',
      quantidade: 1,
      unidadeMedida: 'un',
      localEntrega: '',
      dataNecessaria: '',
      especificacaoTecnica: '',
      observacao: ''
    }
  ],
  supplierIds: []
};

const initialSupplierForm: SourcingSupplierInput = {
  razaoSocial: '',
  nomeFantasia: '',
  documento: '',
  categorias: ['Outros'],
  pais: 'Brasil',
  cidade: '',
  contatoNome: '',
  contatoEmail: '',
  contatoTelefone: '',
  condicaoPagamentoPadrao: '',
  prazoMedioAtendimento: undefined,
  avaliacaoInterna: undefined,
  ativo: true,
  observacoes: ''
};

const initialProposalForm = {
  sourcingEventId: '',
  supplierId: '',
  moeda: 'BRL',
  freteIncluso: true,
  impostosInclusos: true,
  condicaoPagamento: '',
  prazoAtendimento: '',
  validadeProposta: '',
  valorMinimoPedido: '',
  observacoes: '',
  pontuacaoComercial: 80,
  pontuacaoTecnica: 80
};

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function formatCurrency(value: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function toDateTimeLocal(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function statusColor(status: string) {
  const colors: Record<string, string> = {
    Rascunho: 'bg-slate-100 text-slate-700',
    Publicado: 'bg-blue-100 text-blue-700',
    'Aguardando fornecedores': 'bg-amber-100 text-amber-800',
    'Em cotacao': 'bg-amber-100 text-amber-800',
    'Em analise': 'bg-indigo-100 text-indigo-700',
    'Aguardando aprovacao': 'bg-purple-100 text-purple-700',
    Aprovado: 'bg-emerald-100 text-emerald-700',
    Recusado: 'bg-red-100 text-red-700',
    Encerrado: 'bg-zinc-100 text-zinc-700',
    Cancelado: 'bg-red-100 text-red-700'
  };

  return colors[status] || 'bg-slate-100 text-slate-700';
}

function inviteColor(status: string) {
  if (status.includes('Proposta')) return 'bg-emerald-100 text-emerald-700';
  if (status.includes('Recusou') || status.includes('Desclassificado')) return 'bg-red-100 text-red-700';
  if (status.includes('Convite')) return 'bg-blue-100 text-blue-700';
  if (status.includes('Visualizado') || status.includes('Pretende')) return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}

function fieldClass() {
  return 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-50';
}

function labelClass() {
  return 'text-xs font-semibold uppercase tracking-wide text-slate-500';
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
      {children}
    </section>
  );
}

function CardHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <FileText className="mb-3 h-10 w-10 text-slate-300" />
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function Sourcing() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [state, setState] = useState<SourcingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventForm, setEventForm] = useState<SourcingEventInput>(initialEventForm);
  const [supplierForm, setSupplierForm] = useState<SourcingSupplierInput>(initialSupplierForm);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [proposalForm, setProposalForm] = useState(initialProposalForm);
  const [proposalPrices, setProposalPrices] = useState<Record<string, number>>({});
  const [recommendationForm, setRecommendationForm] = useState({ supplierId: '', savingEstimado: 0, justificativa: '' });
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [stages, setStages] = useState<SeasonStage[]>([]);
  const [projects, setProjects] = useState<ProjetoOption[]>([]);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
    loadReferenceData();

    const listener = () => refreshData(false);
    window.addEventListener('sourcing-updated', listener);
    return () => window.removeEventListener('sourcing-updated', listener);
  }, []);

  useEffect(() => {
    if (!selectedEventId && state?.events.length) {
      setSelectedEventId(state.events[0].id);
    }
  }, [state?.events.length, selectedEventId]);

  useEffect(() => {
    if (!eventForm.seasonId) {
      setStages([]);
      return;
    }

    getSeasonStages(eventForm.seasonId)
      .then(setStages)
      .catch(error => console.warn('Erro ao carregar etapas para Sourcing:', error));
  }, [eventForm.seasonId]);

  useEffect(() => {
    if (!proposalForm.sourcingEventId && selectedEventId) {
      setProposalForm(current => ({ ...current, sourcingEventId: selectedEventId }));
    }
  }, [selectedEventId, proposalForm.sourcingEventId]);

  useEffect(() => {
    if (!state || !proposalForm.sourcingEventId) {
      setProposalPrices({});
      return;
    }

    const prices: Record<string, number> = {};
    getEventItems(state, proposalForm.sourcingEventId).forEach(item => {
      prices[item.id] = proposalPrices[item.id] ?? 0;
    });
    setProposalPrices(prices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.items.length, proposalForm.sourcingEventId]);

  const selectedEvent = useMemo(
    () => state?.events.find(event => event.id === selectedEventId),
    [state, selectedEventId]
  );

  const metrics = useMemo(() => (state ? getDashboardMetrics(state) : null), [state]);

  const activeStage = useMemo(
    () => workflowStages.find(stage => stage.tabs.includes(activeTab)) || workflowStages[0],
    [activeTab]
  );

  const selectedEventStats = useMemo(() => {
    if (!state || !selectedEvent) return null;
    const suppliers = getEventSuppliers(state, selectedEvent.id);
    const proposals = getEventProposals(state, selectedEvent.id);
    const items = getEventItems(state, selectedEvent.id);
    const pendingInvites = suppliers.filter(({ link }) => ['Convite nao enviado', 'Convite enviado', 'Visualizado'].includes(link.statusConvite)).length;
    const progress = statusWorkflowOrder[selectedEvent.status] || 0;
    const bestProposal = proposals[0]?.proposal;

    return {
      suppliers,
      proposals,
      items,
      pendingInvites,
      progress,
      bestProposal,
      bestSupplier: bestProposal ? state.suppliers.find(supplier => supplier.id === bestProposal.supplierId) : undefined
    };
  }, [state, selectedEvent]);

  const operationalQueue = useMemo(() => {
    if (!state) {
      return {
        overdue: [],
        dueSoon: [],
        pendingInviteLinks: [],
        pendingApprovals: []
      };
    }

    const now = Date.now();
    const soonLimit = now + 72 * 60 * 60 * 1000;
    const openEvents = state.events.filter(event => !['Cancelado', 'Encerrado', 'Aprovado', 'Recusado'].includes(event.status));

    const overdue = openEvents.filter(event => {
      if (!event.prazoResposta) return false;
      const due = new Date(event.prazoResposta).getTime();
      return Number.isFinite(due) && due < now;
    });

    const dueSoon = openEvents.filter(event => {
      if (!event.prazoResposta) return false;
      const due = new Date(event.prazoResposta).getTime();
      return Number.isFinite(due) && due >= now && due <= soonLimit;
    });

    const pendingInviteLinks = state.eventSuppliers
      .filter(link => link.statusConvite === 'Convite nao enviado' || link.ultimoEmailStatus === 'erro')
      .map(link => ({
        link,
        event: state.events.find(event => event.id === link.sourcingEventId),
        supplier: state.suppliers.find(supplier => supplier.id === link.supplierId)
      }));

    return {
      overdue,
      dueSoon,
      pendingInviteLinks,
      pendingApprovals: state.approvals.filter(approval => approval.status === 'Aguardando aprovacao')
    };
  }, [state]);

  const filteredEvents = useMemo(() => {
    if (!state) return [];
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return state.events.filter(event => {
      const bestProposal = getBestProposalForEvent(state, event.id);
      const supplier = bestProposal ? state.suppliers.find(item => item.id === bestProposal.supplierId) : undefined;
      const matchSearch = !normalizedSearch || [
        event.codigo,
        event.titulo,
        event.categoria,
        event.responsavelNome,
        event.projetoCodigo,
        event.projetoDescricao,
        supplier?.razaoSocial,
        supplier?.nomeFantasia
      ].some(value => String(value || '').toLowerCase().includes(normalizedSearch));

      const matchStatus = statusFilter === 'Todos' || event.status === statusFilter;
      const matchCategory = categoryFilter === 'Todas' || event.categoria === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [state, searchTerm, statusFilter, categoryFilter]);

  async function refreshData(showLoader = true) {
    if (showLoader) setLoading(true);
    try {
      const loaded = await loadSourcingState();
      setState(loaded);
    } finally {
      setLoading(false);
    }
  }

  async function loadReferenceData() {
    try {
      const [loadedSeasons, loadedProjects] = await Promise.all([
        getSeasons().catch(() => []),
        loadProjects().catch(() => [])
      ]);
      setSeasons(loadedSeasons);
      setProjects(loadedProjects);
    } catch (error) {
      console.warn('Erro ao carregar referencias de Sourcing:', error);
    }
  }

  async function loadProjects(): Promise<ProjetoOption[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projeto')
      .select('id, code, name, projeto, descricao, temporada')
      .order('temporada', { ascending: false })
      .limit(200);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      code: row.code || row.projeto || '',
      name: row.name || row.descricao || row.projeto || row.code || '',
      temporada: row.temporada
    }));
  }

  function showMessage(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  }

  function getSupplierPortalUrl(token: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/sourcing/fornecedor/${token}`;
  }

  async function readApiPayload(response: Response) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('API de Sourcing indisponivel neste servidor. Use a URL publicada no Vercel ou rode com Vercel Dev.');
    }

    const payload = await response.json();
    if (!response.ok && response.status !== 207) {
      throw new Error(payload?.error || 'Erro ao processar solicitacao.');
    }
    return payload;
  }

  async function copySupplierPortalUrl(token: string) {
    const url = getSupplierPortalUrl(token);
    await navigator.clipboard.writeText(url);
    showMessage('Link publico do fornecedor copiado.');
  }

  async function handleSendSupplierInvite(eventSupplierId: string) {
    setSendingInviteId(eventSupplierId);
    try {
      const response = await fetch('/api/sourcing/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventSupplierId })
      });
      const payload = await readApiPayload(response);
      await refreshData(false);
      const result = payload.results?.[0];
      if (result?.mode === 'mock') {
        showMessage('Convite preparado em modo mock. Configure RESEND_API_KEY para envio real por e-mail.');
      } else if (payload.failed) {
        showMessage(`Convite processado com erro: ${result?.error || 'verifique o log do fornecedor.'}`);
      } else {
        showMessage('Convite enviado por e-mail.');
      }
    } catch (error: any) {
      showMessage(error.message || 'Erro ao enviar convite.');
    } finally {
      setSendingInviteId(null);
    }
  }

  async function handleSendEventInvites(eventId: string) {
    setSendingInviteId(eventId);
    try {
      const response = await fetch('/api/sourcing/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      });
      const payload = await readApiPayload(response);
      await refreshData(false);
      if (payload.failed) {
        showMessage(`${payload.sent || 0} convite(s) processado(s), ${payload.failed} com erro.`);
      } else if (payload.results?.some((result: any) => result.mode === 'mock')) {
        showMessage(`${payload.sent || 0} convite(s) preparados em modo mock. Configure RESEND_API_KEY para envio real.`);
      } else {
        showMessage(`${payload.sent || 0} convite(s) enviado(s) por e-mail.`);
      }
    } catch (error: any) {
      showMessage(error.message || 'Erro ao enviar convites.');
    } finally {
      setSendingInviteId(null);
    }
  }

  async function handleCreateEvent(event: React.FormEvent) {
    event.preventDefault();
    if (!eventForm.titulo.trim()) return showMessage('Informe o titulo do evento.');
    if (!eventForm.items.some(item => item.descricao.trim())) return showMessage('Inclua pelo menos um item na cotacao.');

    const selectedProject = projects.find(project => project.id === eventForm.projetoId);
    const payload: SourcingEventInput = {
      ...eventForm,
      prazoResposta: fromDateTimeLocal(eventForm.prazoResposta),
      projetoCodigo: selectedProject?.code || eventForm.projetoCodigo,
      projetoDescricao: selectedProject?.name || eventForm.projetoDescricao,
      items: eventForm.items.filter(item => item.descricao.trim()),
      supplierIds: eventForm.supplierIds
    };

    const result = await createSourcingEvent(payload);
    setState(result.state);
    setSelectedEventId(result.event.id);
    setEventForm(initialEventForm);
    setActiveTab('detalhes');
    showMessage(`Evento ${result.event.codigo} criado.`);
  }

  async function handleDuplicateEvent(eventId: string) {
    const result = await duplicateSourcingEvent(eventId);
    setState(result.state);
    if (result.event) {
      setSelectedEventId(result.event.id);
      setActiveTab('detalhes');
      showMessage(`Evento ${result.event.codigo} duplicado como rascunho.`);
    }
  }

  async function handleCancelEvent(eventId: string) {
    const updated = await updateSourcingEvent(eventId, { status: 'Cancelado' });
    setState(updated);
    showMessage('Evento cancelado.');
  }

  async function handleSupplierSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!supplierForm.razaoSocial?.trim()) return showMessage('Informe a razao social do fornecedor.');

    if (editingSupplierId) {
      const updated = await updateSourcingSupplier(editingSupplierId, {
        ...supplierForm,
        razaoSocial: supplierForm.razaoSocial
      } as any);
      setState(updated);
      setEditingSupplierId(null);
      showMessage('Fornecedor atualizado.');
    } else {
      const result = await createSourcingSupplier(supplierForm);
      setState(result.state);
      showMessage('Fornecedor cadastrado.');
    }

    setSupplierForm(initialSupplierForm);
  }

  function editSupplier(id: string) {
    const supplier = state?.suppliers.find(item => item.id === id);
    if (!supplier) return;
    setEditingSupplierId(id);
    setSupplierForm({
      razaoSocial: supplier.razaoSocial,
      nomeFantasia: supplier.nomeFantasia || '',
      documento: supplier.documento || '',
      categorias: supplier.categorias.length ? supplier.categorias : ['Outros'],
      pais: supplier.pais || '',
      cidade: supplier.cidade || '',
      contatoNome: supplier.contatoNome || '',
      contatoEmail: supplier.contatoEmail || '',
      contatoTelefone: supplier.contatoTelefone || '',
      condicaoPagamentoPadrao: supplier.condicaoPagamentoPadrao || '',
      prazoMedioAtendimento: supplier.prazoMedioAtendimento,
      avaliacaoInterna: supplier.avaliacaoInterna,
      ativo: supplier.ativo,
      observacoes: supplier.observacoes || ''
    });
  }

  async function handleProposalSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!proposalForm.sourcingEventId || !proposalForm.supplierId) {
      return showMessage('Selecione evento e fornecedor para registrar a proposta.');
    }

    const selectedItems = state ? getEventItems(state, proposalForm.sourcingEventId) : [];
    if (!selectedItems.length) return showMessage('O evento selecionado nao tem itens.');

    const payload: SourcingProposalInput = {
      ...proposalForm,
      valorMinimoPedido: Number(proposalForm.valorMinimoPedido) || undefined,
      origem: 'interno',
      items: selectedItems.map(item => ({
        sourcingEventItemId: item.id,
        precoUnitario: Number(proposalPrices[item.id]) || 0,
        moeda: proposalForm.moeda,
        prazoAtendimento: proposalForm.prazoAtendimento,
        status: 'Recebido'
      }))
    };

    if (!payload.items.some(item => item.precoUnitario > 0)) {
      return showMessage('Informe pelo menos um preco unitario.');
    }

    const result = await createSourcingProposal(payload);
    setState(result.state);
    setSelectedEventId(payload.sourcingEventId);
    setProposalPrices({});
    setProposalForm(current => ({
      ...initialProposalForm,
      sourcingEventId: current.sourcingEventId,
      moeda: current.moeda
    }));
    setActiveTab('comparativo');
    showMessage('Proposta registrada.');
  }

  async function handleRecommendSupplier(eventId: string) {
    if (!recommendationForm.supplierId || !recommendationForm.justificativa.trim()) {
      return showMessage('Selecione fornecedor e informe a justificativa.');
    }

    const updated = await recommendSourcingSupplier({
      sourcingEventId: eventId,
      supplierId: recommendationForm.supplierId,
      justificativa: recommendationForm.justificativa,
      savingEstimado: Number(recommendationForm.savingEstimado) || 0
    });

    setState(updated);
    setActiveTab('aprovacoes');
    showMessage('Fornecedor recomendado e enviado para aprovacao.');
  }

  async function handleApproval(approvalId: string, status: 'Aprovado' | 'Recusado' | 'Ajuste solicitado') {
    const comment = status === 'Aprovado'
      ? 'Aprovado pelo modulo de Sourcing.'
      : status === 'Recusado'
        ? 'Recomendacao recusada.'
        : 'Ajuste solicitado pelo aprovador.';

    const updated = await resolveSourcingApproval(approvalId, status, comment);
    setState(updated);
    showMessage(`Aprovacao atualizada: ${status}.`);
  }

  function exportEvents(events: SourcingEvent[] = filteredEvents) {
    if (!state) return;
    const data = events.map(event => {
      const bestProposal = getBestProposalForEvent(state, event.id);
      const supplier = bestProposal ? state.suppliers.find(item => item.id === bestProposal.supplierId) : undefined;
      const invited = state.eventSuppliers.filter(link => link.sourcingEventId === event.id).length;
      const proposals = state.proposals.filter(proposal => proposal.sourcingEventId === event.id).length;

      return {
        Codigo: event.codigo,
        Titulo: event.titulo,
        Tipo: event.tipoEvento,
        Categoria: event.categoria,
        Responsavel: event.responsavelNome || '-',
        Projeto: event.projetoCodigo || '-',
        Status: event.status,
        Prioridade: event.prioridade,
        Moeda: event.moeda,
        'Data abertura': event.dataAbertura || '-',
        'Prazo resposta': formatDate(event.prazoResposta),
        'Fornecedores convidados': invited,
        'Propostas recebidas': proposals,
        'Melhor fornecedor': supplier?.nomeFantasia || supplier?.razaoSocial || '-',
        'Melhor proposta': bestProposal ? bestProposal.valorTotal : 0,
        'Saving estimado': event.savingEstimado || 0
      };
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 16 },
      { wch: 36 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 14 },
      { wch: 22 },
      { wch: 14 },
      { wch: 8 },
      { wch: 14 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 24 },
      { wch: 16 },
      { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Eventos Sourcing');
    XLSX.writeFile(workbook, `Sourcing_Eventos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (loading && !state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          <p className="text-sm text-slate-600">Carregando Sourcing...</p>
        </div>
      </div>
    );
  }

  if (!state || !metrics) {
    return (
      <div className="p-6">
        <SectionCard>
          <EmptyState title="Nao foi possivel carregar o modulo" description="Atualize a pagina ou verifique a conexao com o Supabase." />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-3 text-slate-900 md:p-5">
      <header className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 border-b border-slate-100 px-4 py-4 2xl:grid-cols-[1fr_auto] 2xl:items-start">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
              <Handshake className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-950 md:text-3xl">Sourcing Logística e Compras</h1>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', state.source === 'supabase' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800')}>
                  {state.source === 'supabase' ? 'Base online' : 'Modo local/mock'}
                </span>
              </div>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
                Central operacional para planejar concorrências, convidar fornecedores, coletar propostas, equalizar preços e conduzir aprovações.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <HeaderMetric label="Abertos" value={String(metrics.eventosAbertos)} tone="blue" />
                <HeaderMetric label="Pendências" value={String(operationalQueue.overdue.length + operationalQueue.pendingInviteLinks.length + operationalQueue.pendingApprovals.length)} tone="amber" />
                <HeaderMetric label="Propostas" value={String(metrics.propostasRecebidas)} tone="slate" />
                <HeaderMetric label="Saving" value={formatCurrency(metrics.economiaEstimada)} tone="emerald" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 2xl:justify-end">
            <button onClick={() => setActiveTab('novo')} className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              <Plus className="h-4 w-4" />
              Novo evento
            </button>
            <button onClick={() => setActiveTab('eventos')} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Search className="h-4 w-4" />
              Localizar processo
            </button>
            <button onClick={() => exportEvents()} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <FileDown className="h-4 w-4" />
              Exportar
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jornada do processo</p>
              <p className="text-sm text-slate-600">Etapa atual: <span className="font-semibold text-slate-900">{activeStage.title}</span></p>
            </div>
            <button onClick={() => setActiveTab(activeStage.tabs[0])} className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-800">
              Abrir etapa
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {workflowStages.map((stage, index) => {
              const Icon = stage.icon;
              const selected = stage.tabs.includes(activeTab);
              return (
                <button
                  key={stage.title}
                  onClick={() => setActiveTab(stage.tabs[0])}
                  className={cn(
                    'group flex min-h-[92px] flex-col items-start rounded-lg border px-3 py-3 text-left transition',
                    selected
                      ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-red-200 hover:bg-white'
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-md', selected ? 'bg-white/15 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className={cn('text-[11px] font-bold', selected ? 'text-white/70' : 'text-slate-400')}>0{index + 1}</span>
                  </div>
                  <span className="mt-3 text-sm font-bold">{stage.title}</span>
                  <span className={cn('mt-1 text-xs leading-4', selected ? 'text-white/70' : 'text-slate-500')}>{stage.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {message ? (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {message}
        </div>
      ) : null}

      {selectedEvent ? renderSelectedEventContext() : null}

      <nav className="mb-4 flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition',
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'eventos' && renderEvents()}
      {activeTab === 'novo' && renderNewEvent()}
      {activeTab === 'detalhes' && renderDetails()}
      {activeTab === 'fornecedores' && renderSuppliers()}
      {activeTab === 'propostas' && renderProposals()}
      {activeTab === 'comparativo' && renderComparison()}
      {activeTab === 'aprovacoes' && renderApprovals()}
      {activeTab === 'relatorios' && renderReports()}
      {activeTab === 'configuracoes' && renderSettings()}
    </div>
  );

  function renderSelectedEventContext() {
    if (!selectedEvent || !selectedEventStats) return null;

    const nextAction = getSelectedEventNextAction();
    return (
      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 2xl:grid-cols-[1fr_360px] 2xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-500">{selectedEvent.codigo}</span>
              <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', statusColor(selectedEvent.status))}>{selectedEvent.status}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{selectedEvent.categoria}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{selectedEvent.tipoEvento}</span>
            </div>
            <div className="mt-2 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-slate-950">{selectedEvent.titulo}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedEvent.projetoCodigo || 'Sem projeto'} · prazo {formatDate(selectedEvent.prazoResposta)} · responsável {selectedEvent.responsavelNome || '-'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center 2xl:min-w-[420px]">
                <MiniStat label="Itens" value={String(selectedEventStats.items.length)} />
                <MiniStat label="Fornecedores" value={String(selectedEventStats.suppliers.length)} />
                <MiniStat label="Propostas" value={String(selectedEventStats.proposals.length)} />
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Progresso do processo</span>
                <span>{selectedEventStats.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-red-600 transition-all" style={{ width: `${selectedEventStats.progress}%` }} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-red-600 ring-1 ring-slate-200">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-950">{nextAction.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{nextAction.description}</p>
                <button onClick={nextAction.action} className="mt-3 inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                  {nextAction.label}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function getSelectedEventNextAction() {
    if (!selectedEvent || !selectedEventStats) {
      return {
        title: 'Selecione um processo',
        description: 'Escolha um evento para visualizar as próximas ações.',
        label: 'Ver eventos',
        action: () => setActiveTab('eventos')
      };
    }

    if (selectedEvent.status === 'Rascunho') {
      return {
        title: 'Finalize o escopo do evento',
        description: 'Revise itens, fornecedores e condições antes de enviar os convites.',
        label: 'Abrir detalhes',
        action: () => setActiveTab('detalhes')
      };
    }

    if (selectedEventStats.pendingInvites > 0) {
      return {
        title: `${selectedEventStats.pendingInvites} convite(s) exigem ação`,
        description: 'Envie e-mails, copie links públicos ou acompanhe falhas de entrega dos fornecedores.',
        label: 'Gerenciar convites',
        action: () => setActiveTab('detalhes')
      };
    }

    if (selectedEventStats.proposals.length === 0) {
      return {
        title: 'Aguardando propostas',
        description: 'Acompanhe respostas do portal público ou registre uma proposta recebida por fora.',
        label: 'Abrir propostas',
        action: () => setActiveTab('propostas')
      };
    }

    if (selectedEvent.status === 'Em analise') {
      return {
        title: 'Equalize e recomende fornecedor',
        description: selectedEventStats.bestProposal
          ? `Melhor proposta atual: ${formatCurrency(selectedEventStats.bestProposal.valorTotal, selectedEventStats.bestProposal.moeda)} de ${selectedEventStats.bestSupplier?.nomeFantasia || selectedEventStats.bestSupplier?.razaoSocial || 'fornecedor'}.`
          : 'Compare propostas e registre a recomendação comercial.',
        label: 'Abrir comparativo',
        action: () => setActiveTab('comparativo')
      };
    }

    if (selectedEvent.status === 'Aguardando aprovacao') {
      return {
        title: 'Recomendação aguardando aprovação',
        description: 'A decisão comercial já foi enviada para aprovação.',
        label: 'Abrir aprovações',
        action: () => setActiveTab('aprovacoes')
      };
    }

    return {
      title: 'Processo em controle',
      description: 'Consulte histórico, relatórios ou reabra o comparativo conforme necessário.',
      label: 'Ver relatórios',
      action: () => setActiveTab('relatorios')
    };
  }

  function renderDashboard() {
    const cardData = [
      { label: 'Eventos em aberto', value: metrics.eventosAbertos, icon: Clock, color: 'bg-blue-50 text-blue-700' },
      { label: 'Aguardando proposta', value: metrics.aguardandoProposta, icon: Mail, color: 'bg-amber-50 text-amber-700' },
      { label: 'Em análise', value: metrics.emAnalise, icon: Search, color: 'bg-indigo-50 text-indigo-700' },
      { label: 'Aprovados', value: metrics.aprovados, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700' },
      { label: 'Encerrados', value: metrics.encerrados, icon: FileText, color: 'bg-slate-100 text-slate-700' },
      { label: 'Fornecedores convidados', value: metrics.fornecedoresConvidados, icon: Users, color: 'bg-cyan-50 text-cyan-700' },
      { label: 'Propostas recebidas', value: metrics.propostasRecebidas, icon: ClipboardCheck, color: 'bg-violet-50 text-violet-700' },
      { label: 'Economia estimada', value: formatCurrency(metrics.economiaEstimada), icon: BarChart3, color: 'bg-green-50 text-green-700' }
    ];

    return (
      <div className="space-y-5">
        {renderOperationalCommandCenter()}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cardData.map(card => {
            const Icon = card.icon;
            return (
              <SectionCard key={card.label} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950">{card.value}</p>
                  </div>
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', card.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>

        <SectionCard>
          <CardHeader
            title="Eventos principais"
            description="Visão consolidada dos processos de sourcing em andamento."
            action={
              <button onClick={() => setActiveTab('eventos')} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Ver todos
              </button>
            }
          />
          {renderEventsTable(state.events.slice(0, 8))}
        </SectionCard>
      </div>
    );
  }

  function renderOperationalCommandCenter() {
    const priorityItems = [
      {
        label: 'Prazos vencidos',
        value: operationalQueue.overdue.length,
        description: 'Eventos abertos com prazo de resposta vencido.',
        icon: AlertTriangle,
        color: 'border-red-200 bg-red-50 text-red-700',
        actionLabel: 'Filtrar eventos',
        action: () => {
          setStatusFilter('Todos');
          setActiveTab('eventos');
        }
      },
      {
        label: 'Vencem em 72h',
        value: operationalQueue.dueSoon.length,
        description: 'Processos que exigem acompanhamento imediato.',
        icon: Clock,
        color: 'border-amber-200 bg-amber-50 text-amber-700',
        actionLabel: 'Revisar carteira',
        action: () => setActiveTab('eventos')
      },
      {
        label: 'Convites pendentes',
        value: operationalQueue.pendingInviteLinks.length,
        description: 'Fornecedores sem e-mail enviado ou com falha de envio.',
        icon: Mail,
        color: 'border-blue-200 bg-blue-50 text-blue-700',
        actionLabel: 'Abrir convites',
        action: () => setActiveTab('detalhes')
      },
      {
        label: 'Aprovações',
        value: operationalQueue.pendingApprovals.length,
        description: 'Recomendações esperando decisão.',
        icon: ShieldCheck,
        color: 'border-violet-200 bg-violet-50 text-violet-700',
        actionLabel: 'Decidir',
        action: () => setActiveTab('aprovacoes')
      }
    ];

    const latestEvents = state.events.slice(0, 5);
    const conversionRate = metrics.fornecedoresConvidados
      ? Math.round((metrics.propostasRecebidas / metrics.fornecedoresConvidados) * 100)
      : 0;

    return (
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <SectionCard>
          <CardHeader
            title="Centro operacional"
            description="Priorize prazos, convites, propostas e aprovações antes de navegar pelas abas."
            action={
              <button onClick={() => refreshData(false)} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Gauge className="h-4 w-4" />
                Atualizar visão
              </button>
            }
          />
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            {priorityItems.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.label} onClick={item.action} className={cn('rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm', item.color)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{item.label}</p>
                      <p className="mt-2 text-3xl font-bold">{item.value}</p>
                    </div>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 min-h-10 text-xs leading-5 opacity-80">{item.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold">
                    {item.actionLabel}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard>
          <CardHeader title="Saúde da carteira" description="Indicadores rápidos para gestão." />
          <div className="space-y-4 p-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-600">Conversão convite → proposta</span>
                <span className="font-bold text-slate-950">{conversionRate}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white">
                <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.min(100, conversionRate)}%` }} />
              </div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-600">Eventos em análise</span>
                <span className="font-bold text-slate-950">{metrics.emAnalise}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white">
                <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${Math.min(100, (metrics.emAnalise / Math.max(1, state.events.length)) * 100)}%` }} />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Últimos processos</p>
              <div className="space-y-2">
                {latestEvents.map(event => (
                  <button key={event.id} onClick={() => { setSelectedEventId(event.id); setActiveTab('detalhes'); }} className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2 text-left hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{event.codigo} · {event.titulo}</span>
                      <span className="text-xs text-slate-500">{event.status}</span>
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  function renderEvents() {
    return (
      <div className="space-y-5">
        <SectionCard className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={cn(fieldClass(), 'pl-9')}
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Buscar por código, título, fornecedor, projeto..."
              />
            </div>
            <select className={fieldClass()} value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option>Todos</option>
              {SOURCING_STATUS.map(status => <option key={status}>{status}</option>)}
            </select>
            <select className={fieldClass()} value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
              <option>Todas</option>
              {SOURCING_CATEGORIES.map(category => <option key={category}>{category}</option>)}
            </select>
            <button onClick={() => exportEvents(filteredEvents)} className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              <FileDown className="h-4 w-4" />
              Exportar
            </button>
          </div>
        </SectionCard>

        <SectionCard>
          <CardHeader title="Eventos/RFPs" description={`${filteredEvents.length} registro(s) encontrados`} />
          {renderEventsTable(filteredEvents)}
        </SectionCard>
      </div>
    );
  }

  function renderEventsTable(events: SourcingEvent[]) {
    if (!events.length) {
      return <EmptyState title="Nenhum evento encontrado" description="Crie um novo evento ou ajuste os filtros aplicados." />;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-[1160px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Código</th>
              <th className="px-4 py-3 font-semibold">Título</th>
              <th className="px-4 py-3 font-semibold">Categoria</th>
              <th className="px-4 py-3 font-semibold">Responsável</th>
              <th className="px-4 py-3 font-semibold">Prazo</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-center font-semibold">Fornec.</th>
              <th className="px-4 py-3 text-center font-semibold">Propostas</th>
              <th className="px-4 py-3 font-semibold">Melhor proposta</th>
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map(event => {
              const bestProposal = getBestProposalForEvent(state!, event.id);
              const supplier = bestProposal ? state!.suppliers.find(item => item.id === bestProposal.supplierId) : undefined;
              const invited = state!.eventSuppliers.filter(link => link.sourcingEventId === event.id).length;
              const proposals = state!.proposals.filter(proposal => proposal.sourcingEventId === event.id).length;

              return (
                <tr key={event.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-950">{event.codigo}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{event.titulo}</div>
                    <div className="text-xs text-slate-500">{event.tipoEvento} · {event.prioridade} · {event.projetoCodigo || 'Sem projeto'}</div>
                  </td>
                  <td className="px-4 py-3">{event.categoria}</td>
                  <td className="px-4 py-3">{event.responsavelNome || '-'}</td>
                  <td className="px-4 py-3">{formatDate(event.prazoResposta)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', statusColor(event.status))}>{event.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{invited}</td>
                  <td className="px-4 py-3 text-center font-semibold">{proposals}</td>
                  <td className="px-4 py-3">
                    {bestProposal ? (
                      <div>
                        <div className="font-semibold text-slate-950">{formatCurrency(bestProposal.valorTotal, bestProposal.moeda)}</div>
                        <div className="text-xs text-slate-500">{supplier?.nomeFantasia || supplier?.razaoSocial || '-'}</div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => { setSelectedEventId(event.id); setActiveTab('detalhes'); }} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                        Visualizar
                      </button>
                      <button onClick={() => handleDuplicateEvent(event.id)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                        <Copy className="inline h-3 w-3" /> Duplicar
                      </button>
                      {!['Cancelado', 'Encerrado', 'Aprovado'].includes(event.status) ? (
                        <button onClick={() => handleCancelEvent(event.id)} className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderNewEvent() {
    return (
      <form onSubmit={handleCreateEvent} className="space-y-5">
        <SectionCard>
          <CardHeader title="Novo evento de sourcing" description="Abra uma RFP/RFQ integrada às etapas, projetos e fornecedores já cadastrados." />
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 xl:col-span-2">
              <span className={labelClass()}>Título do evento</span>
              <input className={fieldClass()} value={eventForm.titulo} onChange={event => setEventForm(current => ({ ...current, titulo: event.target.value }))} placeholder="Ex.: Transporte de containers" />
            </label>
            <label className="space-y-1">
              <span className={labelClass()}>Tipo</span>
              <select className={fieldClass()} value={eventForm.tipoEvento} onChange={event => setEventForm(current => ({ ...current, tipoEvento: event.target.value }))}>
                {SOURCING_EVENT_TYPES.map(type => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelClass()}>Categoria</span>
              <select className={fieldClass()} value={eventForm.categoria} onChange={event => setEventForm(current => ({ ...current, categoria: event.target.value }))}>
                {SOURCING_CATEGORIES.map(category => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelClass()}>Temporada</span>
              <select className={fieldClass()} value={eventForm.seasonId || ''} onChange={event => setEventForm(current => ({ ...current, seasonId: event.target.value || undefined, stageId: undefined }))}>
                <option value="">Sem temporada</option>
                {seasons.map(season => <option key={season.id} value={season.id}>{season.name || season.year}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelClass()}>Etapa</span>
              <select className={fieldClass()} value={eventForm.stageId || ''} onChange={event => setEventForm(current => ({ ...current, stageId: event.target.value || undefined }))} disabled={!eventForm.seasonId}>
                <option value="">Sem etapa</option>
                {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name} · {stage.track}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelClass()}>Projeto Protheus</span>
              <select className={fieldClass()} value={eventForm.projetoId || ''} onChange={event => setEventForm(current => ({ ...current, projetoId: event.target.value || undefined }))}>
                <option value="">Sem projeto</option>
                {projects.map(project => <option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelClass()}>Responsável</span>
              <input className={fieldClass()} value={eventForm.responsavelNome || ''} onChange={event => setEventForm(current => ({ ...current, responsavelNome: event.target.value }))} placeholder="Responsável interno" />
            </label>
            <label className="space-y-1">
              <span className={labelClass()}>Prioridade</span>
              <select className={fieldClass()} value={eventForm.prioridade} onChange={event => setEventForm(current => ({ ...current, prioridade: event.target.value }))}>
                {SOURCING_PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelClass()}>Moeda</span>
              <select className={fieldClass()} value={eventForm.moeda} onChange={event => setEventForm(current => ({ ...current, moeda: event.target.value }))}>
                {SOURCING_CURRENCIES.map(currency => <option key={currency}>{currency}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelClass()}>Data de abertura</span>
              <input type="date" className={fieldClass()} value={eventForm.dataAbertura || ''} onChange={event => setEventForm(current => ({ ...current, dataAbertura: event.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className={labelClass()}>Prazo de resposta</span>
              <input type="datetime-local" className={fieldClass()} value={eventForm.prazoResposta || ''} onChange={event => setEventForm(current => ({ ...current, prazoResposta: event.target.value }))} />
            </label>
            <label className="space-y-1 xl:col-span-2">
              <span className={labelClass()}>Condição de pagamento desejada</span>
              <input className={fieldClass()} value={eventForm.condicaoPagamentoDesejada || ''} onChange={event => setEventForm(current => ({ ...current, condicaoPagamentoDesejada: event.target.value }))} placeholder="Ex.: 30 dias após emissão NF" />
            </label>
            <label className="space-y-1">
              <span className={labelClass()}>Validade mínima da proposta</span>
              <input type="number" className={fieldClass()} value={eventForm.validadeMinimaProposta || ''} onChange={event => setEventForm(current => ({ ...current, validadeMinimaProposta: Number(event.target.value) || undefined }))} />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className={labelClass()}>Descrição do escopo</span>
              <textarea className={cn(fieldClass(), 'min-h-24')} value={eventForm.descricao || ''} onChange={event => setEventForm(current => ({ ...current, descricao: event.target.value }))} />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className={labelClass()}>Condições gerais</span>
              <textarea className={cn(fieldClass(), 'min-h-24')} value={eventForm.condicoesGerais || ''} onChange={event => setEventForm(current => ({ ...current, condicoesGerais: event.target.value }))} />
            </label>
          </div>
        </SectionCard>

        <SectionCard>
          <CardHeader
            title="Itens da cotação"
            description="Cadastre os itens que serão equalizados no mapa comparativo."
            action={
              <button
                type="button"
                onClick={() => setEventForm(current => ({ ...current, items: [...current.items, { descricao: '', quantidade: 1, unidadeMedida: 'un' }] }))}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Adicionar item
              </button>
            }
          />
          <div className="space-y-3 p-4">
            {eventForm.items.map((item, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 lg:grid-cols-[70px_1fr_120px_120px_180px_160px]">
                <div className="text-sm font-bold text-slate-500">#{index + 1}</div>
                <input className={fieldClass()} value={item.descricao} onChange={event => updateEventItem(index, { descricao: event.target.value })} placeholder="Descrição do item" />
                <input type="number" min="0" step="0.01" className={fieldClass()} value={item.quantidade} onChange={event => updateEventItem(index, { quantidade: Number(event.target.value) })} placeholder="Qtd." />
                <input className={fieldClass()} value={item.unidadeMedida || ''} onChange={event => updateEventItem(index, { unidadeMedida: event.target.value })} placeholder="Un." />
                <input className={fieldClass()} value={item.localEntrega || ''} onChange={event => updateEventItem(index, { localEntrega: event.target.value })} placeholder="Local" />
                <input type="date" className={fieldClass()} value={item.dataNecessaria || ''} onChange={event => updateEventItem(index, { dataNecessaria: event.target.value })} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <CardHeader title="Fornecedores convidados" description="Selecione os fornecedores que receberão o convite simulado do evento." />
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {state.suppliers.filter(supplier => supplier.ativo).map(supplier => (
              <label key={supplier.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:border-red-200 hover:bg-red-50">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={eventForm.supplierIds.includes(supplier.id)}
                  onChange={event => {
                    setEventForm(current => ({
                      ...current,
                      supplierIds: event.target.checked
                        ? [...current.supplierIds, supplier.id]
                        : current.supplierIds.filter(id => id !== supplier.id)
                    }));
                  }}
                />
                <span>
                  <span className="block font-semibold text-slate-900">{supplier.nomeFantasia || supplier.razaoSocial}</span>
                  <span className="mt-1 block text-xs text-slate-500">{supplier.categorias.join(', ')} · {supplier.contatoEmail || 'sem e-mail'}</span>
                </span>
              </label>
            ))}
          </div>
        </SectionCard>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEventForm(initialEventForm)} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            Limpar
          </button>
          <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700">
            <Send className="h-4 w-4" />
            Criar evento
          </button>
        </div>
      </form>
    );
  }

  function updateEventItem(index: number, updates: Record<string, any>) {
    setEventForm(current => ({
      ...current,
      items: current.items.map((item, currentIndex) => currentIndex === index ? { ...item, ...updates } : item)
    }));
  }

  function renderDetails() {
    if (!selectedEvent) {
      return <SectionCard><EmptyState title="Selecione um evento" description="Escolha um evento na listagem para visualizar todos os detalhes." /></SectionCard>;
    }

    const eventItems = getEventItems(state, selectedEvent.id);
    const suppliers = getEventSuppliers(state, selectedEvent.id);
    const proposals = getEventProposals(state, selectedEvent.id);
    const history = getEventHistory(state, selectedEvent.id);
    const bestProposal = proposals[0]?.proposal;
    const bestSupplier = bestProposal ? state.suppliers.find(supplier => supplier.id === bestProposal.supplierId) : undefined;

    return (
      <div className="space-y-5">
        <SectionCard>
          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-500">{selectedEvent.codigo}</span>
                <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', statusColor(selectedEvent.status))}>{selectedEvent.status}</span>
              </div>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">{selectedEvent.titulo}</h2>
              <p className="mt-1 text-sm text-slate-600">{selectedEvent.categoria} · {selectedEvent.tipoEvento} · {selectedEvent.projetoCodigo || 'Sem projeto'} · prazo {formatDate(selectedEvent.prazoResposta)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button disabled={sendingInviteId === selectedEvent.id} onClick={() => handleSendEventInvites(selectedEvent.id)} className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                {sendingInviteId === selectedEvent.id ? 'Enviando...' : 'Enviar convites'}
              </button>
              <button onClick={() => setActiveTab('propostas')} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Lançar proposta</button>
              <button onClick={() => setActiveTab('comparativo')} className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Comparar</button>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <SectionCard>
              <CardHeader title="Resumo" />
              <div className="grid gap-4 p-4 md:grid-cols-2">
                <Info label="Responsável" value={selectedEvent.responsavelNome || '-'} />
                <Info label="Prioridade" value={selectedEvent.prioridade} />
                <Info label="Moeda" value={selectedEvent.moeda} />
                <Info label="Condição desejada" value={selectedEvent.condicaoPagamentoDesejada || '-'} />
                <Info label="Descrição" value={selectedEvent.descricao || '-'} className="md:col-span-2" />
                <Info label="Condições gerais" value={selectedEvent.condicoesGerais || '-'} className="md:col-span-2" />
              </div>
            </SectionCard>

            <SectionCard>
              <CardHeader title="Itens" description={`${eventItems.length} item(ns) cadastrados`} />
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3">Qtd.</th>
                      <th className="px-4 py-3">Un.</th>
                      <th className="px-4 py-3">Local</th>
                      <th className="px-4 py-3">Necessidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eventItems.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-semibold">#{item.itemNumero}</td>
                        <td className="px-4 py-3">{item.descricao}</td>
                        <td className="px-4 py-3">{item.quantidade}</td>
                        <td className="px-4 py-3">{item.unidadeMedida}</td>
                        <td className="px-4 py-3">{item.localEntrega || '-'}</td>
                        <td className="px-4 py-3">{item.dataNecessaria || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard>
              <CardHeader title="Fornecedores convidados" />
              <div className="divide-y divide-slate-100">
                {suppliers.length ? suppliers.map(({ link, supplier }) => (
                  <div key={link.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{supplier?.nomeFantasia || supplier?.razaoSocial || 'Fornecedor removido'}</p>
                      <p className="mt-1 text-xs text-slate-500">{supplier?.contatoEmail || '-'} · token {link.tokenAcesso.slice(0, 8)}...</p>
                      {link.ultimoEmailStatus ? <p className="mt-1 text-xs text-slate-400">E-mail: {link.ultimoEmailStatus}{link.ultimoEmailErro ? ` · ${link.ultimoEmailErro}` : ''}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', inviteColor(link.statusConvite))}>{link.statusConvite}</span>
                      <button disabled={sendingInviteId === link.id} onClick={() => handleSendSupplierInvite(link.id)} className="rounded-md border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60">
                        {sendingInviteId === link.id ? 'Enviando...' : 'Enviar e-mail'}
                      </button>
                      <button onClick={() => copySupplierPortalUrl(link.tokenAcesso)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        Copiar link
                      </button>
                      <button onClick={() => window.open(getSupplierPortalUrl(link.tokenAcesso), '_blank', 'noopener,noreferrer')} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        Abrir portal
                      </button>
                    </div>
                  </div>
                )) : <EmptyState title="Sem fornecedores convidados" description="Crie um evento com fornecedores ou duplique para testar." />}
              </div>
            </SectionCard>
          </div>

          <aside className="space-y-5">
            <SectionCard className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Indicadores</p>
              <div className="mt-4 space-y-3">
                <InfoRow label="Fornecedores" value={String(suppliers.length)} />
                <InfoRow label="Propostas" value={String(proposals.length)} />
                <InfoRow label="Melhor proposta" value={bestProposal ? formatCurrency(bestProposal.valorTotal, bestProposal.moeda) : '-'} />
                <InfoRow label="Fornecedor" value={bestSupplier?.nomeFantasia || bestSupplier?.razaoSocial || '-'} />
                <InfoRow label="Saving estimado" value={formatCurrency(selectedEvent.savingEstimado || 0, selectedEvent.moeda)} />
              </div>
            </SectionCard>

            <SectionCard>
              <CardHeader title="Histórico" />
              <div className="max-h-[420px] overflow-auto p-4">
                {history.length ? history.map(item => (
                  <div key={item.id} className="relative border-l border-slate-200 pb-5 pl-4 last:pb-0">
                    <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-red-600" />
                    <p className="text-sm font-semibold text-slate-950">{item.acao}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.descricao}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)} · {item.usuarioNome || 'Sistema'}</p>
                  </div>
                )) : <EmptyState title="Sem histórico" description="As principais ações do evento serão exibidas aqui." />}
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    );
  }

  function renderSuppliers() {
    return (
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <SectionCard>
          <CardHeader title={editingSupplierId ? 'Editar fornecedor' : 'Novo fornecedor'} description="Cadastro simples usado nos eventos de sourcing." />
          <form onSubmit={handleSupplierSubmit} className="space-y-4 p-4">
            <label className="space-y-1">
              <span className={labelClass()}>Razão social</span>
              <input className={fieldClass()} value={supplierForm.razaoSocial} onChange={event => setSupplierForm(current => ({ ...current, razaoSocial: event.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className={labelClass()}>Nome fantasia</span>
              <input className={fieldClass()} value={supplierForm.nomeFantasia || ''} onChange={event => setSupplierForm(current => ({ ...current, nomeFantasia: event.target.value }))} />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className={labelClass()}>Documento</span>
                <input className={fieldClass()} value={supplierForm.documento || ''} onChange={event => setSupplierForm(current => ({ ...current, documento: event.target.value }))} />
              </label>
              <label className="space-y-1">
                <span className={labelClass()}>Categoria</span>
                <select className={fieldClass()} value={supplierForm.categorias?.[0] || 'Outros'} onChange={event => setSupplierForm(current => ({ ...current, categorias: [event.target.value] }))}>
                  {SOURCING_CATEGORIES.map(category => <option key={category}>{category}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className={labelClass()}>País</span>
                <input className={fieldClass()} value={supplierForm.pais || ''} onChange={event => setSupplierForm(current => ({ ...current, pais: event.target.value }))} />
              </label>
              <label className="space-y-1">
                <span className={labelClass()}>Cidade</span>
                <input className={fieldClass()} value={supplierForm.cidade || ''} onChange={event => setSupplierForm(current => ({ ...current, cidade: event.target.value }))} />
              </label>
            </div>
            <label className="space-y-1">
              <span className={labelClass()}>Contato</span>
              <input className={fieldClass()} value={supplierForm.contatoNome || ''} onChange={event => setSupplierForm(current => ({ ...current, contatoNome: event.target.value }))} />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <input className={fieldClass()} value={supplierForm.contatoEmail || ''} onChange={event => setSupplierForm(current => ({ ...current, contatoEmail: event.target.value }))} placeholder="E-mail" />
              <input className={fieldClass()} value={supplierForm.contatoTelefone || ''} onChange={event => setSupplierForm(current => ({ ...current, contatoTelefone: event.target.value }))} placeholder="Telefone" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input className={fieldClass()} value={supplierForm.condicaoPagamentoPadrao || ''} onChange={event => setSupplierForm(current => ({ ...current, condicaoPagamentoPadrao: event.target.value }))} placeholder="Condição padrão" />
              <input type="number" className={fieldClass()} value={supplierForm.avaliacaoInterna || ''} onChange={event => setSupplierForm(current => ({ ...current, avaliacaoInterna: Number(event.target.value) || undefined }))} placeholder="Avaliação 0-5" />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={supplierForm.ativo !== false} onChange={event => setSupplierForm(current => ({ ...current, ativo: event.target.checked }))} />
              Fornecedor ativo
            </label>
            <button type="submit" className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              {editingSupplierId ? 'Salvar fornecedor' : 'Cadastrar fornecedor'}
            </button>
          </form>
        </SectionCard>

        <SectionCard>
          <CardHeader title="Fornecedores" description={`${state.suppliers.length} fornecedor(es) cadastrados`} />
          <div className="divide-y divide-slate-100">
            {state.suppliers.map(supplier => (
              <div key={supplier.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_220px_120px] lg:items-center">
                <div>
                  <p className="font-semibold text-slate-950">{supplier.nomeFantasia || supplier.razaoSocial}</p>
                  <p className="mt-1 text-sm text-slate-500">{supplier.razaoSocial} · {supplier.documento || 'sem documento'}</p>
                  <p className="mt-1 text-xs text-slate-500">{supplier.categorias.join(', ')} · {supplier.cidade || '-'} / {supplier.pais || '-'}</p>
                </div>
                <div className="text-sm text-slate-600">
                  <p>{supplier.contatoNome || '-'}</p>
                  <p className="text-xs">{supplier.contatoEmail || '-'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', supplier.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                    {supplier.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <button onClick={() => editSupplier(supplier.id)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-slate-50">
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    );
  }

  function renderProposals() {
    const eventItems = proposalForm.sourcingEventId ? getEventItems(state, proposalForm.sourcingEventId) : [];
    const linkedSuppliers = proposalForm.sourcingEventId
      ? getEventSuppliers(state, proposalForm.sourcingEventId).map(item => item.supplier).filter(Boolean)
      : state.suppliers;
    const selectedEventForProposal = state.events.find(event => event.id === proposalForm.sourcingEventId);

    return (
      <div className="grid gap-5 xl:grid-cols-[460px_1fr]">
        <SectionCard>
          <CardHeader title="Lançar proposta" description="Registre ou simule uma resposta de fornecedor." />
          <form onSubmit={handleProposalSubmit} className="space-y-4 p-4">
            <label className="space-y-1">
              <span className={labelClass()}>Evento</span>
              <select className={fieldClass()} value={proposalForm.sourcingEventId} onChange={event => setProposalForm(current => ({ ...current, sourcingEventId: event.target.value, supplierId: '' }))}>
                <option value="">Selecione</option>
                {state.events.map(event => <option key={event.id} value={event.id}>{event.codigo} · {event.titulo}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelClass()}>Fornecedor</span>
              <select className={fieldClass()} value={proposalForm.supplierId} onChange={event => setProposalForm(current => ({ ...current, supplierId: event.target.value }))}>
                <option value="">Selecione</option>
                {linkedSuppliers.map((supplier: any) => <option key={supplier.id} value={supplier.id}>{supplier.nomeFantasia || supplier.razaoSocial}</option>)}
              </select>
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <select className={fieldClass()} value={proposalForm.moeda} onChange={event => setProposalForm(current => ({ ...current, moeda: event.target.value }))}>
                {SOURCING_CURRENCIES.map(currency => <option key={currency}>{currency}</option>)}
              </select>
              <input className={fieldClass()} value={proposalForm.condicaoPagamento} onChange={event => setProposalForm(current => ({ ...current, condicaoPagamento: event.target.value }))} placeholder="Condição pagamento" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <input className={fieldClass()} value={proposalForm.prazoAtendimento} onChange={event => setProposalForm(current => ({ ...current, prazoAtendimento: event.target.value }))} placeholder="Prazo atendimento" />
              <input type="date" className={fieldClass()} value={proposalForm.validadeProposta} onChange={event => setProposalForm(current => ({ ...current, validadeProposta: event.target.value }))} />
              <input type="number" min="0" step="0.01" className={fieldClass()} value={proposalForm.valorMinimoPedido} onChange={event => setProposalForm(current => ({ ...current, valorMinimoPedido: event.target.value }))} placeholder="Valor mínimo" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={proposalForm.freteIncluso} onChange={event => setProposalForm(current => ({ ...current, freteIncluso: event.target.checked }))} />
                Frete incluso
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={proposalForm.impostosInclusos} onChange={event => setProposalForm(current => ({ ...current, impostosInclusos: event.target.checked }))} />
                Impostos inclusos
              </label>
            </div>
            <textarea className={cn(fieldClass(), 'min-h-20')} value={proposalForm.observacoes} onChange={event => setProposalForm(current => ({ ...current, observacoes: event.target.value }))} placeholder="Observações comerciais" />
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-900">Preços por item</p>
              {eventItems.length ? eventItems.map(item => (
                <label key={item.id} className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 md:grid-cols-[1fr_140px] md:items-center">
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">#{item.itemNumero} {item.descricao}</span>
                    <span className="text-xs text-slate-500">{item.quantidade} {item.unidadeMedida}</span>
                  </span>
                  <input type="number" min="0" step="0.01" className={fieldClass()} value={proposalPrices[item.id] || ''} onChange={event => setProposalPrices(current => ({ ...current, [item.id]: Number(event.target.value) }))} placeholder="Preço unit." />
                </label>
              )) : <p className="text-sm text-slate-500">Selecione um evento com itens.</p>}
            </div>
            <button type="submit" className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              Registrar proposta
            </button>
          </form>
        </SectionCard>

        <SectionCard>
          <CardHeader title="Propostas recebidas" description={selectedEventForProposal ? selectedEventForProposal.titulo : 'Todas as propostas registradas'} />
          <div className="divide-y divide-slate-100">
            {(proposalForm.sourcingEventId ? getEventProposals(state, proposalForm.sourcingEventId) : getAllProposalRows()).map(({ proposal, supplier, items }) => (
              <div key={proposal.id} className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{supplier?.nomeFantasia || supplier?.razaoSocial || 'Fornecedor'}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(proposal.recebidaEm)} · {proposal.condicaoPagamento || '-'} · {proposal.prazoAtendimento || '-'}</p>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-lg font-bold text-slate-950">{formatCurrency(proposal.valorTotal, proposal.moeda)}</p>
                    <p className="text-xs text-slate-500">Score {proposal.scoreFinal || '-'} · {items.length} item(ns)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    );
  }

  function getAllProposalRows() {
    return state.proposals.map(proposal => ({
      proposal,
      supplier: state.suppliers.find(supplier => supplier.id === proposal.supplierId),
      items: state.proposalItems.filter(item => item.sourcingProposalId === proposal.id)
    }));
  }

  function renderComparison() {
    const event = selectedEvent || state.events[0];
    const eventItems = event ? getEventItems(state, event.id) : [];
    const proposals = event ? getEventProposals(state, event.id) : [];
    const bestProposal = proposals[0]?.proposal;

    return (
      <div className="space-y-5">
        <SectionCard className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="space-y-1">
              <span className={labelClass()}>Evento para comparação</span>
              <select className={fieldClass()} value={event?.id || ''} onChange={event => setSelectedEventId(event.target.value)}>
                {state.events.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.titulo}</option>)}
              </select>
            </label>
            <button onClick={() => setActiveTab('propostas')} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              Lançar nova proposta
            </button>
          </div>
        </SectionCard>

        {event && proposals.length ? (
          <>
            <SectionCard>
              <CardHeader title="Mapa comparativo" description="Equalização comercial por item e fornecedor." />
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Qtd.</th>
                      {proposals.map(({ proposal, supplier }) => (
                        <th key={proposal.id} className="px-4 py-3">{supplier?.nomeFantasia || supplier?.razaoSocial || 'Fornecedor'}</th>
                      ))}
                      <th className="px-4 py-3">Menor preço</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eventItems.map(item => {
                      const prices = proposals.map(({ proposal }) => state.proposalItems.find(proposalItem => proposalItem.sourcingProposalId === proposal.id && proposalItem.sourcingEventItemId === item.id));
                      const minPrice = Math.min(...prices.map(price => price?.precoTotal || Infinity));
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold">#{item.itemNumero} {item.descricao}</p>
                            <p className="text-xs text-slate-500">{item.unidadeMedida}</p>
                          </td>
                          <td className="px-4 py-3">{item.quantidade}</td>
                          {prices.map((price, index) => (
                            <td key={`${item.id}-${index}`} className={cn('px-4 py-3 font-semibold', price?.precoTotal === minPrice ? 'bg-emerald-50 text-emerald-700' : '')}>
                              {price ? formatCurrency(price.precoTotal, event.moeda) : '-'}
                            </td>
                          ))}
                          <td className="px-4 py-3 font-bold text-emerald-700">{Number.isFinite(minPrice) ? formatCurrency(minPrice, event.moeda) : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard>
              <CardHeader title="Comparativo por fornecedor" />
              <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                {proposals.map(({ proposal, supplier }) => (
                  <div key={proposal.id} className={cn('rounded-lg border p-4', proposal.id === bestProposal?.id ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white')}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{supplier?.nomeFantasia || supplier?.razaoSocial || 'Fornecedor'}</p>
                        <p className="mt-1 text-xs text-slate-500">{proposal.condicaoPagamento || '-'} · {proposal.prazoAtendimento || '-'}</p>
                      </div>
                      {proposal.id === bestProposal?.id ? <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">Menor preço</span> : null}
                    </div>
                    <p className="mt-4 text-2xl font-bold text-slate-950">{formatCurrency(proposal.valorTotal, proposal.moeda)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <InfoRow label="Score" value={String(proposal.scoreFinal || '-')} />
                      <InfoRow label="Frete" value={proposal.freteIncluso ? 'Sim' : 'Não'} />
                      <InfoRow label="Impostos" value={proposal.impostosInclusos ? 'Sim' : 'Não'} />
                      <InfoRow label="Validade" value={proposal.validadeProposta || '-'} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard>
              <CardHeader title="Recomendação para aprovação" description="Selecione o fornecedor recomendado e registre a justificativa da escolha." />
              <div className="grid gap-4 p-4 lg:grid-cols-[260px_180px_1fr_auto]">
                <select className={fieldClass()} value={recommendationForm.supplierId} onChange={event => setRecommendationForm(current => ({ ...current, supplierId: event.target.value }))}>
                  <option value="">Fornecedor recomendado</option>
                  {proposals.map(({ proposal, supplier }) => <option key={proposal.id} value={proposal.supplierId}>{supplier?.nomeFantasia || supplier?.razaoSocial}</option>)}
                </select>
                <input type="number" className={fieldClass()} value={recommendationForm.savingEstimado || ''} onChange={event => setRecommendationForm(current => ({ ...current, savingEstimado: Number(event.target.value) }))} placeholder="Saving estimado" />
                <input className={fieldClass()} value={recommendationForm.justificativa} onChange={event => setRecommendationForm(current => ({ ...current, justificativa: event.target.value }))} placeholder="Justificativa da escolha" />
                <button onClick={() => handleRecommendSupplier(event.id)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                  Enviar para aprovação
                </button>
              </div>
            </SectionCard>
          </>
        ) : (
          <SectionCard>
            <EmptyState title="Sem propostas para comparar" description="Registre propostas para este evento antes de abrir o mapa comparativo." />
          </SectionCard>
        )}
      </div>
    );
  }

  function renderApprovals() {
    return (
      <SectionCard>
        <CardHeader title="Aprovações" description="Fluxo simples de aprovação da recomendação comercial." />
        <div className="divide-y divide-slate-100">
          {state.approvals.length ? state.approvals.map(approval => {
            const event = state.events.find(item => item.id === approval.sourcingEventId);
            const supplier = state.suppliers.find(item => item.id === approval.supplierId);
            return (
              <div key={approval.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_220px_220px] lg:items-center">
                <div>
                  <p className="font-semibold text-slate-950">{event?.codigo} · {event?.titulo}</p>
                  <p className="mt-1 text-sm text-slate-600">Fornecedor recomendado: {supplier?.nomeFantasia || supplier?.razaoSocial || '-'}</p>
                  <p className="mt-1 text-xs text-slate-500">{approval.justificativa}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-950">{formatCurrency(approval.valorRecomendado, event?.moeda || 'BRL')}</p>
                  <span className={cn('mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold', statusColor(approval.status))}>{approval.status}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleApproval(approval.id, 'Aprovado')} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">Aprovar</button>
                  <button onClick={() => handleApproval(approval.id, 'Recusado')} className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700">Recusar</button>
                  <button onClick={() => handleApproval(approval.id, 'Ajuste solicitado')} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">Solicitar ajuste</button>
                </div>
              </div>
            );
          }) : <EmptyState title="Sem aprovações pendentes" description="Quando um fornecedor for recomendado, a aprovação aparecerá aqui." />}
        </div>
      </SectionCard>
    );
  }

  function renderReports() {
    const byStatus = SOURCING_STATUS.map(status => ({
      status,
      total: state.events.filter(event => event.status === status).length
    })).filter(item => item.total > 0);

    const winningSuppliers = state.events
      .filter(event => event.fornecedorRecomendadoId)
      .map(event => ({
        event,
        supplier: state.suppliers.find(supplier => supplier.id === event.fornecedorRecomendadoId)
      }));

    return (
      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard>
          <CardHeader title="Eventos por status" action={<button onClick={() => exportEvents(state.events)} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Exportar XLSX</button>} />
          <div className="space-y-3 p-4">
            {byStatus.map(item => (
              <div key={item.status}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{item.status}</span>
                  <span>{item.total}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-red-600" style={{ width: `${Math.max(8, (item.total / Math.max(1, state.events.length)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard>
          <CardHeader title="Fornecedores recomendados" />
          <div className="divide-y divide-slate-100">
            {winningSuppliers.length ? winningSuppliers.map(({ event, supplier }) => (
              <div key={event.id} className="p-4">
                <p className="font-semibold text-slate-950">{supplier?.nomeFantasia || supplier?.razaoSocial || '-'}</p>
                <p className="mt-1 text-sm text-slate-600">{event.codigo} · {event.titulo}</p>
                <p className="mt-1 text-xs text-emerald-700">Saving estimado: {formatCurrency(event.savingEstimado, event.moeda)}</p>
              </div>
            )) : <EmptyState title="Sem vencedores/recomendados" description="Recomendações concluídas aparecerão neste relatório." />}
          </div>
        </SectionCard>
      </div>
    );
  }

  function renderSettings() {
    const template = `Prezado fornecedor,\n\nVocê foi convidado a participar de um evento de sourcing para fornecimento/prestação de serviço conforme escopo descrito neste processo.\n\nOs pedidos serão solicitados conforme demanda, não havendo obrigatoriedade de compra integral.\n\nFavor informar:\n- Preço unitário\n- Prazo de atendimento\n- Condição de pagamento\n- Validade da proposta\n- Valor mínimo de pedido, se houver\n- Observações comerciais relevantes\n\nAs respostas devem ser enviadas até o prazo definido no evento.`;

    return (
      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard>
          <CardHeader title="Configurações básicas" description="Valores usados nos formulários do MVP." />
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <ConfigList title="Categorias" values={[...SOURCING_CATEGORIES]} />
            <ConfigList title="Tipos de evento" values={[...SOURCING_EVENT_TYPES]} />
            <ConfigList title="Status" values={[...SOURCING_STATUS]} />
            <ConfigList title="Moedas" values={[...SOURCING_CURRENCIES]} />
            <ConfigList title="Unidades comuns" values={['un', 'serviço', 'diária', 'viagem', 'litro', 'kg', 'mês']} />
            <ConfigList title="Condições padrão" values={['À vista', '15 dias', '21 dias', '30 dias', '50% pedido / 50% entrega']} />
          </div>
        </SectionCard>
        <SectionCard>
          <CardHeader title="Template de convite" description="Texto base para futura integração de e-mail/portal fornecedor." />
          <div className="p-4">
            <textarea className={cn(fieldClass(), 'min-h-[420px] font-mono text-xs')} value={template} readOnly />
          </div>
        </SectionCard>
      </div>
    );
  }
}

function Info({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-slate-100 bg-slate-50 p-3', className)}>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function HeaderMetric({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'amber' | 'emerald' | 'slate' }) {
  const classes = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200'
  };

  return (
    <span className={cn('inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold ring-1', classes[tone])}>
      <span className="text-slate-500">{label}</span>
      <span>{value}</span>
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function ConfigList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map(value => (
          <span key={value} className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

export default Sourcing;
