import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Package,
  Send,
  XCircle
} from 'lucide-react';

interface PublicEventItem {
  id: string;
  itemNumero: number;
  descricao: string;
  quantidade: number;
  unidadeMedida: string;
  localEntrega?: string;
  dataNecessaria?: string;
  especificacaoTecnica?: string;
  observacao?: string;
}

interface PublicPortalData {
  link: {
    statusConvite: string;
    pretendeParticipar?: boolean;
    motivoRecusa?: string;
    respondeuEm?: string;
  };
  event: {
    id: string;
    codigo: string;
    titulo: string;
    tipoEvento: string;
    categoria: string;
    status: string;
    moeda: string;
    prazoResposta?: string;
    descricao?: string;
    condicoesGerais?: string;
    condicaoPagamentoDesejada?: string;
    validadeMinimaProposta?: number;
    projetoCodigo?: string;
    projetoDescricao?: string;
    responsavelNome?: string;
  };
  supplier: {
    id: string;
    razaoSocial: string;
    nomeFantasia?: string;
    contatoNome?: string;
    contatoEmail?: string;
  };
  items: PublicEventItem[];
  proposal?: {
    moeda?: string;
    valorTotal?: number;
    freteIncluso?: boolean;
    impostosInclusos?: boolean;
    condicaoPagamento?: string;
    prazoAtendimento?: string;
    validadeProposta?: string;
    valorMinimoPedido?: number | null;
    observacoes?: string;
    respondidoPorNome?: string;
    respondidoPorEmail?: string;
    items?: Array<{
      sourcingEventItemId: string;
      precoUnitario: number;
      capacidade?: number | null;
      moeda?: string;
      prazoAtendimento?: string;
      observacao?: string;
      alternativaTecnica?: string;
    }>;
  } | null;
  attachments: Array<{
    id: string;
    nomeArquivo: string;
    urlArquivo: string;
    tipo: string;
  }>;
}

type ItemInput = {
  precoUnitario: string;
  capacidade: string;
  moeda: string;
  prazoAtendimento: string;
  observacao: string;
  alternativaTecnica: string;
};

type SectionKey = 'evento' | 'resposta' | 'itens';

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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function toDateInput(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function fieldClass() {
  return 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100';
}

function labelClass() {
  return 'text-xs font-semibold uppercase tracking-wide text-slate-500';
}

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('API de Sourcing indisponível neste servidor. Use a URL publicada no Vercel ou rode com Vercel Dev.');
  }
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'Erro ao processar solicitação.');
  }
  return payload;
}

export function SourcingSupplierPortal() {
  const { token = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<PublicPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>(searchParams.get('intent') === 'recusar' ? 'resposta' : 'evento');
  const [declineReason, setDeclineReason] = useState('');
  const [proposal, setProposal] = useState({
    respondidoPorNome: '',
    respondidoPorEmail: '',
    moeda: 'BRL',
    freteIncluso: true,
    impostosInclusos: true,
    condicaoPagamento: '',
    prazoAtendimento: '',
    validadeProposta: '',
    valorMinimoPedido: '',
    observacoes: ''
  });
  const [itemInputs, setItemInputs] = useState<Record<string, ItemInput>>({});

  useEffect(() => {
    loadPortalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!data) return;

    const proposalItems = new Map((data.proposal?.items || []).map(item => [item.sourcingEventItemId, item]));
    const nextItems: Record<string, ItemInput> = {};

    data.items.forEach(item => {
      const existing = proposalItems.get(item.id);
      nextItems[item.id] = {
        precoUnitario: existing?.precoUnitario ? String(existing.precoUnitario) : '',
        capacidade: existing?.capacidade != null ? String(existing.capacidade) : String(item.quantidade || ''),
        moeda: existing?.moeda || data.proposal?.moeda || data.event.moeda || 'BRL',
        prazoAtendimento: existing?.prazoAtendimento || data.proposal?.prazoAtendimento || '',
        observacao: existing?.observacao || '',
        alternativaTecnica: existing?.alternativaTecnica || ''
      };
    });

    setProposal({
      respondidoPorNome: data.proposal?.respondidoPorNome || data.supplier.contatoNome || '',
      respondidoPorEmail: data.proposal?.respondidoPorEmail || data.supplier.contatoEmail || '',
      moeda: data.proposal?.moeda || data.event.moeda || 'BRL',
      freteIncluso: data.proposal?.freteIncluso ?? true,
      impostosInclusos: data.proposal?.impostosInclusos ?? true,
      condicaoPagamento: data.proposal?.condicaoPagamento || data.event.condicaoPagamentoDesejada || '',
      prazoAtendimento: data.proposal?.prazoAtendimento || '',
      validadeProposta: toDateInput(data.proposal?.validadeProposta),
      valorMinimoPedido: data.proposal?.valorMinimoPedido != null ? String(data.proposal.valorMinimoPedido) : '',
      observacoes: data.proposal?.observacoes || ''
    });
    setItemInputs(nextItems);
  }, [data]);

  const totalProposal = useMemo(() => {
    if (!data) return 0;
    return data.items.reduce((sum, item) => {
      const unitPrice = Number(String(itemInputs[item.id]?.precoUnitario || '').replace(',', '.')) || 0;
      return sum + unitPrice * (Number(item.quantidade) || 0);
    }, 0);
  }, [data, itemInputs]);

  const deadlineLabel = data?.event.prazoResposta ? formatDate(data.event.prazoResposta) : '-';
  const alreadySent = data?.link.statusConvite === 'Proposta enviada';

  async function loadPortalData() {
    if (!token) {
      setError('Token do convite não informado.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/sourcing/public-event?token=${encodeURIComponent(token)}`);
      const payload = await readJsonResponse(response);
      setData(payload);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar convite.');
    } finally {
      setLoading(false);
    }
  }

  async function submitResponse(action: 'participar' | 'recusar') {
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/sourcing/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action,
          motivoRecusa: declineReason
        })
      });
      const payload = await readJsonResponse(response);
      setMessage(action === 'participar' ? 'Participação confirmada.' : 'Participação recusada.');
      setData(current => current ? {
        ...current,
        link: {
          ...current.link,
          statusConvite: String(payload.statusConvite || current.link.statusConvite),
          pretendeParticipar: action === 'participar',
          motivoRecusa: action === 'recusar' ? declineReason : current.link.motivoRecusa
        }
      } : current);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar resposta.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitProposal(event: React.FormEvent) {
    event.preventDefault();
    if (!data) return;

    const missingItems = data.items.filter(item => {
      const value = Number(String(itemInputs[item.id]?.precoUnitario || '').replace(',', '.'));
      return !Number.isFinite(value) || value <= 0;
    });

    if (missingItems.length) {
      setError(`Informe preço unitário para todos os itens. Pendentes: ${missingItems.map(item => `#${item.itemNumero}`).join(', ')}`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/sourcing/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'enviar_proposta',
          proposta: {
            ...proposal,
            valorMinimoPedido: proposal.valorMinimoPedido ? Number(String(proposal.valorMinimoPedido).replace(',', '.')) : null,
            items: data.items.map(item => ({
              sourcingEventItemId: item.id,
              precoUnitario: Number(String(itemInputs[item.id]?.precoUnitario || '').replace(',', '.')) || 0,
              capacidade: itemInputs[item.id]?.capacidade ? Number(String(itemInputs[item.id].capacidade).replace(',', '.')) : item.quantidade,
              moeda: itemInputs[item.id]?.moeda || proposal.moeda,
              prazoAtendimento: itemInputs[item.id]?.prazoAtendimento || proposal.prazoAtendimento,
              observacao: itemInputs[item.id]?.observacao,
              alternativaTecnica: itemInputs[item.id]?.alternativaTecnica
            }))
          }
        })
      });
      const payload = await readJsonResponse(response);
      setMessage(`Proposta enviada com sucesso. Total: ${formatCurrency(Number(payload.valorTotal) || totalProposal, proposal.moeda)}.`);
      setData(current => current ? {
        ...current,
        link: {
          ...current.link,
          statusConvite: 'Proposta enviada',
          pretendeParticipar: true
        },
        proposal: {
          ...(current.proposal || {}),
          ...proposal,
          valorTotal: Number(payload.valorTotal) || totalProposal,
          items: Object.entries(itemInputs).map(([sourcingEventItemId, item]) => ({
            sourcingEventItemId,
            precoUnitario: Number(String(item.precoUnitario || '').replace(',', '.')) || 0,
            capacidade: Number(String(item.capacidade || '').replace(',', '.')) || null,
            moeda: item.moeda,
            prazoAtendimento: item.prazoAtendimento,
            observacao: item.observacao,
            alternativaTecnica: item.alternativaTecnica
          }))
        }
      } : current);
      setActiveSection('resposta');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar proposta.');
    } finally {
      setSubmitting(false);
    }
  }

  function updateItem(itemId: string, updates: Partial<ItemInput>) {
    setItemInputs(current => ({
      ...current,
      [itemId]: {
        ...(current[itemId] || {
          precoUnitario: '',
          capacidade: '',
          moeda: proposal.moeda,
          prazoAtendimento: '',
          observacao: '',
          alternativaTecnica: ''
        }),
        ...updates
      }
    }));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-red-600" />
          <p className="text-sm font-semibold text-slate-600">Carregando convite...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-lg border border-red-100 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-600" />
          <h1 className="text-xl font-bold text-slate-950">Convite indisponível</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button onClick={loadPortalData} className="mt-5 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-600 text-white">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ConectaCup Sourcing</p>
                <h1 className="text-2xl font-bold text-slate-950">{data.event.titulo}</h1>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {data.event.codigo} · {data.event.categoria} · resposta até {deadlineLabel}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-semibold text-slate-950">{data.supplier.nomeFantasia || data.supplier.razaoSocial}</p>
            <p className="text-slate-500">{data.supplier.contatoNome || 'Contato'} · {data.supplier.contatoEmail || '-'}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {(message || error) && (
          <div className={cn('mb-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
            {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{error || message}</span>
          </div>
        )}

        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <SummaryCard label="Status" value={data.link.statusConvite} icon={<CheckCircle2 className="h-5 w-5" />} tone={alreadySent ? 'emerald' : 'slate'} />
          <SummaryCard label="Prazo" value={deadlineLabel} icon={<Clock className="h-5 w-5" />} tone="amber" />
          <SummaryCard label="Itens" value={`${data.items.length}`} icon={<Package className="h-5 w-5" />} tone="blue" />
          <SummaryCard label="Total da proposta" value={formatCurrency(totalProposal, proposal.moeda)} icon={<FileText className="h-5 w-5" />} tone="emerald" />
        </div>

        <nav className="mb-5 flex flex-wrap gap-2">
          {[
            { id: 'evento' as const, label: 'Informações do evento' },
            { id: 'resposta' as const, label: 'Minha resposta' },
            { id: 'itens' as const, label: 'Itens e serviços' }
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-semibold transition',
                activeSection === section.id ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              )}
            >
              {section.label}
            </button>
          ))}
        </nav>

        {activeSection === 'evento' && (
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-950">Informações do evento</h2>
              </div>
              <div className="space-y-5 p-5">
                <InfoBlock title="Descrição" value={data.event.descricao || 'Sem descrição adicional.'} />
                <InfoBlock title="Condições gerais" value={data.event.condicoesGerais || 'Sem condições adicionais.'} />
                <div className="grid gap-4 md:grid-cols-2">
                  <InfoLine label="Tipo" value={data.event.tipoEvento} />
                  <InfoLine label="Moeda" value={data.event.moeda} />
                  <InfoLine label="Projeto" value={data.event.projetoCodigo || data.event.projetoDescricao || '-'} />
                  <InfoLine label="Condição desejada" value={data.event.condicaoPagamentoDesejada || '-'} />
                  <InfoLine label="Validade mínima" value={data.event.validadeMinimaProposta ? `${data.event.validadeMinimaProposta} dias` : '-'} />
                  <InfoLine label="Responsável" value={data.event.responsavelNome || '-'} />
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Ações</h2>
                <div className="mt-4 space-y-3">
                  <button disabled={submitting} onClick={() => submitResponse('participar')} className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                    <CheckCircle2 className="h-4 w-4" />
                    Pretendo participar
                  </button>
                  <button disabled={submitting} onClick={() => setActiveSection('resposta')} className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    <Send className="h-4 w-4" />
                    Preencher proposta
                  </button>
                  <button disabled={submitting} onClick={() => setActiveSection('resposta')} className="flex w-full items-center justify-center gap-2 rounded-md border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                    <XCircle className="h-4 w-4" />
                    Recusar participação
                  </button>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Anexos</h2>
                <div className="mt-4 space-y-2">
                  {data.attachments?.length ? data.attachments.map(attachment => (
                    <a key={attachment.id} href={attachment.urlArquivo} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <Download className="h-4 w-4" />
                      {attachment.nomeArquivo}
                    </a>
                  )) : <p className="text-sm text-slate-500">Nenhum anexo disponível.</p>}
                </div>
              </section>
            </aside>
          </div>
        )}

        {activeSection === 'resposta' && (
          <form onSubmit={submitProposal} className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-950">Resposta à proposta</h2>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className={labelClass()}>Nome do respondente</span>
                    <input className={fieldClass()} value={proposal.respondidoPorNome} onChange={event => setProposal(current => ({ ...current, respondidoPorNome: event.target.value }))} />
                  </label>
                  <label className="space-y-1">
                    <span className={labelClass()}>E-mail do respondente</span>
                    <input type="email" className={fieldClass()} value={proposal.respondidoPorEmail} onChange={event => setProposal(current => ({ ...current, respondidoPorEmail: event.target.value }))} />
                  </label>
                  <label className="space-y-1">
                    <span className={labelClass()}>Condição de pagamento</span>
                    <input className={fieldClass()} value={proposal.condicaoPagamento} onChange={event => setProposal(current => ({ ...current, condicaoPagamento: event.target.value }))} required />
                  </label>
                  <label className="space-y-1">
                    <span className={labelClass()}>Prazo de atendimento</span>
                    <input className={fieldClass()} value={proposal.prazoAtendimento} onChange={event => setProposal(current => ({ ...current, prazoAtendimento: event.target.value }))} required />
                  </label>
                  <label className="space-y-1">
                    <span className={labelClass()}>Validade da proposta</span>
                    <input type="date" className={fieldClass()} value={proposal.validadeProposta} onChange={event => setProposal(current => ({ ...current, validadeProposta: event.target.value }))} required />
                  </label>
                  <label className="space-y-1">
                    <span className={labelClass()}>Valor mínimo de pedido</span>
                    <input type="number" min="0" step="0.01" className={fieldClass()} value={proposal.valorMinimoPedido} onChange={event => setProposal(current => ({ ...current, valorMinimoPedido: event.target.value }))} />
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={proposal.freteIncluso} onChange={event => setProposal(current => ({ ...current, freteIncluso: event.target.checked }))} />
                    Frete incluso
                  </label>
                  <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={proposal.impostosInclusos} onChange={event => setProposal(current => ({ ...current, impostosInclusos: event.target.checked }))} />
                    Impostos inclusos
                  </label>
                </div>
                <label className="space-y-1">
                  <span className={labelClass()}>Observações comerciais</span>
                  <textarea className={cn(fieldClass(), 'min-h-28')} value={proposal.observacoes} onChange={event => setProposal(current => ({ ...current, observacoes: event.target.value }))} />
                </label>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Enviar proposta</h2>
                <p className="mt-2 text-sm text-slate-600">{data.items.length} item(ns) serão enviados para o evento {data.event.codigo}.</p>
                <p className="mt-4 text-2xl font-bold text-emerald-700">{formatCurrency(totalProposal, proposal.moeda)}</p>
                <button disabled={submitting} type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  <Send className="h-4 w-4" />
                  {alreadySent ? 'Reenviar proposta' : 'Enviar proposta'}
                </button>
              </section>

              <section className="rounded-lg border border-red-100 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Recusar participação</h2>
                <textarea className={cn(fieldClass(), 'mt-3 min-h-24')} value={declineReason} onChange={event => setDeclineReason(event.target.value)} placeholder="Motivo da recusa" />
                <button disabled={submitting} type="button" onClick={() => submitResponse('recusar')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                  <XCircle className="h-4 w-4" />
                  Confirmar recusa
                </button>
              </section>
            </aside>
          </form>
        )}

        {activeSection === 'itens' && (
          <form onSubmit={submitProposal} className="space-y-4">
            {data.items.map(item => (
              <section key={item.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Item #{item.itemNumero}</p>
                      <h2 className="text-lg font-bold text-slate-950">{item.descricao}</h2>
                      <p className="mt-1 text-sm text-slate-500">Quantidade esperada: {item.quantidade} {item.unidadeMedida}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{formatCurrency((Number(itemInputs[item.id]?.precoUnitario) || 0) * item.quantidade, itemInputs[item.id]?.moeda || proposal.moeda)}</p>
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  {item.especificacaoTecnica ? <InfoBlock title="Especificação técnica" value={item.especificacaoTecnica} /> : null}
                  <div className="grid gap-4 md:grid-cols-4">
                    <label className="space-y-1">
                      <span className={labelClass()}>Capacidade</span>
                      <input type="number" min="0" step="0.001" className={fieldClass()} value={itemInputs[item.id]?.capacidade || ''} onChange={event => updateItem(item.id, { capacidade: event.target.value })} />
                    </label>
                    <label className="space-y-1">
                      <span className={labelClass()}>Preço por unidade</span>
                      <input type="number" min="0" step="0.01" className={fieldClass()} value={itemInputs[item.id]?.precoUnitario || ''} onChange={event => updateItem(item.id, { precoUnitario: event.target.value })} required />
                    </label>
                    <label className="space-y-1">
                      <span className={labelClass()}>Moeda</span>
                      <select className={fieldClass()} value={itemInputs[item.id]?.moeda || proposal.moeda} onChange={event => updateItem(item.id, { moeda: event.target.value })}>
                        {['BRL', 'USD', 'EUR'].map(currency => <option key={currency}>{currency}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className={labelClass()}>Prazo do item</span>
                      <input className={fieldClass()} value={itemInputs[item.id]?.prazoAtendimento || ''} onChange={event => updateItem(item.id, { prazoAtendimento: event.target.value })} />
                    </label>
                  </div>
                  <label className="space-y-1">
                    <span className={labelClass()}>Observação do item</span>
                    <textarea className={cn(fieldClass(), 'min-h-20')} value={itemInputs[item.id]?.observacao || ''} onChange={event => updateItem(item.id, { observacao: event.target.value })} />
                  </label>
                </div>
              </section>
            ))}
            <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
              <p className="text-lg font-bold text-slate-950">Total: {formatCurrency(totalProposal, proposal.moeda)}</p>
              <button disabled={submitting} type="submit" className="flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                <Send className="h-4 w-4" />
                {alreadySent ? 'Reenviar proposta' : 'Enviar proposta'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: 'emerald' | 'amber' | 'blue' | 'slate' }) {
  const toneClasses = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    slate: 'bg-slate-100 text-slate-700'
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-lg font-bold text-slate-950">{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', toneClasses[tone])}>
          {icon}
        </div>
      </div>
    </section>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className={labelClass()}>{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{value}</p>
    </div>
  );
}
