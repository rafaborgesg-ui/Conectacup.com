import { createClient, getCurrentUser } from './supabase/client';

export const SOURCING_STATUS = [
  'Rascunho',
  'Publicado',
  'Aguardando fornecedores',
  'Em cotacao',
  'Em analise',
  'Aguardando aprovacao',
  'Aprovado',
  'Recusado',
  'Encerrado',
  'Cancelado'
] as const;

export const SOURCING_CATEGORIES = [
  'Frete',
  'Guincho',
  'Combustivel',
  'Pneus',
  'Materiais',
  'Servicos',
  'Equipamentos',
  'Hotelaria',
  'Alimentacao',
  'Outros'
] as const;

export const SOURCING_EVENT_TYPES = ['RFP', 'RFQ', 'RFI', 'Cotacao Simples', 'Concorrencia'] as const;
export const SOURCING_PRIORITIES = ['Baixa', 'Media', 'Alta', 'Urgente'] as const;
export const SOURCING_CURRENCIES = ['BRL', 'EUR', 'USD'] as const;

export type SourcingStatus = typeof SOURCING_STATUS[number];
export type SourcingSupplierInviteStatus =
  | 'Convite nao enviado'
  | 'Convite enviado'
  | 'Visualizado'
  | 'Pretende participar'
  | 'Recusou participacao'
  | 'Proposta enviada'
  | 'Proposta em revisao'
  | 'Desclassificado'
  | 'Vencedor';

export type SourcingProposalStatus =
  | 'Recebida'
  | 'Em analise'
  | 'Revisao solicitada'
  | 'Revisada'
  | 'Desclassificada'
  | 'Vencedora'
  | 'Recusada';

export type SourcingApprovalStatus =
  | 'Aguardando aprovacao'
  | 'Aprovado'
  | 'Recusado'
  | 'Ajuste solicitado';

export interface SourcingSupplier {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  documento?: string;
  categorias: string[];
  pais?: string;
  cidade?: string;
  contatoNome?: string;
  contatoEmail?: string;
  contatoTelefone?: string;
  condicaoPagamentoPadrao?: string;
  prazoMedioAtendimento?: number;
  avaliacaoInterna?: number;
  ativo: boolean;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface SourcingEvent {
  id: string;
  codigo: string;
  titulo: string;
  tipoEvento: string;
  categoria: string;
  seasonId?: string;
  stageId?: string;
  projetoId?: string;
  projetoCodigo?: string;
  projetoDescricao?: string;
  responsavelId?: string;
  responsavelNome?: string;
  prioridade: string;
  status: SourcingStatus;
  moeda: string;
  dataAbertura?: string;
  prazoResposta?: string;
  descricao?: string;
  condicoesGerais?: string;
  condicaoPagamentoDesejada?: string;
  validadeMinimaProposta?: number;
  observacoesInternas?: string;
  savingEstimado: number;
  fornecedorRecomendadoId?: string;
  justificativaRecomendacao?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface SourcingEventItem {
  id: string;
  sourcingEventId: string;
  itemNumero: number;
  descricao: string;
  quantidade: number;
  unidadeMedida: string;
  localEntrega?: string;
  dataNecessaria?: string;
  especificacaoTecnica?: string;
  observacao?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourcingEventSupplier {
  id: string;
  sourcingEventId: string;
  supplierId: string;
  statusConvite: SourcingSupplierInviteStatus;
  enviadoEm?: string;
  visualizadoEm?: string;
  respondeuEm?: string;
  pretendeParticipar?: boolean;
  motivoRecusa?: string;
  tokenAcesso: string;
  ultimoEmailStatus?: string;
  ultimoEmailErro?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourcingProposal {
  id: string;
  sourcingEventId: string;
  supplierId: string;
  status: SourcingProposalStatus;
  moeda: string;
  valorTotal: number;
  freteIncluso: boolean;
  impostosInclusos: boolean;
  condicaoPagamento?: string;
  prazoAtendimento?: string;
  validadeProposta?: string;
  valorMinimoPedido?: number;
  observacoes?: string;
  respondidoPorNome?: string;
  respondidoPorEmail?: string;
  origem?: string;
  pontuacaoComercial?: number;
  pontuacaoTecnica?: number;
  scoreFinal?: number;
  recebidaEm?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface SourcingProposalItem {
  id: string;
  sourcingProposalId: string;
  sourcingEventItemId: string;
  precoUnitario: number;
  precoTotal: number;
  capacidade?: number;
  moeda?: string;
  prazoAtendimento?: string;
  observacao?: string;
  alternativaTecnica?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourcingApproval {
  id: string;
  sourcingEventId: string;
  supplierId?: string;
  valorRecomendado: number;
  savingEstimado: number;
  justificativa: string;
  solicitanteId?: string;
  aprovadorId?: string;
  status: SourcingApprovalStatus;
  comentarioAprovador?: string;
  aprovadoEm?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourcingHistory {
  id: string;
  sourcingEventId?: string;
  acao: string;
  descricao: string;
  usuarioId?: string;
  usuarioNome?: string;
  dadosAnteriores?: unknown;
  dadosNovos?: unknown;
  createdAt: string;
}

export interface SourcingAttachment {
  id: string;
  sourcingEventId?: string;
  proposalId?: string;
  supplierId?: string;
  nomeArquivo: string;
  urlArquivo: string;
  tipo: string;
  uploadedBy?: string;
  createdAt: string;
}

export interface SourcingState {
  events: SourcingEvent[];
  items: SourcingEventItem[];
  suppliers: SourcingSupplier[];
  eventSuppliers: SourcingEventSupplier[];
  proposals: SourcingProposal[];
  proposalItems: SourcingProposalItem[];
  approvals: SourcingApproval[];
  history: SourcingHistory[];
  attachments: SourcingAttachment[];
  source: 'supabase' | 'local';
}

export interface SourcingEventInput {
  titulo: string;
  tipoEvento: string;
  categoria: string;
  seasonId?: string;
  stageId?: string;
  projetoId?: string;
  projetoCodigo?: string;
  projetoDescricao?: string;
  responsavelNome?: string;
  prioridade: string;
  status?: SourcingStatus;
  moeda: string;
  dataAbertura?: string;
  prazoResposta?: string;
  descricao?: string;
  condicoesGerais?: string;
  condicaoPagamentoDesejada?: string;
  validadeMinimaProposta?: number;
  observacoesInternas?: string;
  items: Array<Partial<SourcingEventItem> & { descricao: string; quantidade: number }>;
  supplierIds: string[];
}

export interface SourcingSupplierInput {
  razaoSocial: string;
  nomeFantasia?: string;
  documento?: string;
  categorias?: string[];
  pais?: string;
  cidade?: string;
  contatoNome?: string;
  contatoEmail?: string;
  contatoTelefone?: string;
  condicaoPagamentoPadrao?: string;
  prazoMedioAtendimento?: number;
  avaliacaoInterna?: number;
  ativo?: boolean;
  observacoes?: string;
}

export interface SourcingProposalInput {
  sourcingEventId: string;
  supplierId: string;
  moeda: string;
  freteIncluso: boolean;
  impostosInclusos: boolean;
  condicaoPagamento?: string;
  prazoAtendimento?: string;
  validadeProposta?: string;
  valorMinimoPedido?: number;
  observacoes?: string;
  respondidoPorNome?: string;
  respondidoPorEmail?: string;
  origem?: string;
  pontuacaoComercial?: number;
  pontuacaoTecnica?: number;
  items: Array<{
    sourcingEventItemId: string;
    precoUnitario: number;
    capacidade?: number;
    moeda?: string;
    prazoAtendimento?: string;
    observacao?: string;
    alternativaTecnica?: string;
    status?: string;
  }>;
}

const STORAGE_KEY = 'conectacup-sourcing-state-v1';

function nowIso() {
  return new Date().toISOString();
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function createId(prefix = '') {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return prefix ? `${prefix}-${id}` : id;
}

function createToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map(value => value.toString(16).padStart(2, '0'))
    .join('');
}

function money(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOrUndefined(value?: string | null): string | undefined {
  if (!value) return undefined;
  return String(value);
}

function getEmptyState(source: SourcingState['source'] = 'local'): SourcingState {
  return {
    events: [],
    items: [],
    suppliers: [],
    eventSuppliers: [],
    proposals: [],
    proposalItems: [],
    approvals: [],
    history: [],
    attachments: [],
    source
  };
}

function getSeedState(): SourcingState {
  const createdAt = '2026-07-07T12:00:00.000Z';
  const suppliers: SourcingSupplier[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      razaoSocial: 'Logistica Interlagos Transportes LTDA',
      nomeFantasia: 'Interlagos Cargo',
      documento: '12.345.678/0001-90',
      categorias: ['Frete', 'Equipamentos'],
      pais: 'Brasil',
      cidade: 'Sao Paulo',
      contatoNome: 'Marina Costa',
      contatoEmail: 'marina@interlagoscargo.com',
      contatoTelefone: '+55 11 90000-1001',
      condicaoPagamentoPadrao: '30 dias',
      prazoMedioAtendimento: 5,
      avaliacaoInterna: 4.5,
      ativo: true,
      observacoes: 'Fornecedor recorrente em etapas nacionais.',
      createdAt,
      updatedAt: createdAt
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      razaoSocial: 'Atlantic Motors Services',
      nomeFantasia: 'Atlantic Services',
      documento: 'PT-509999111',
      categorias: ['Servicos', 'Guincho'],
      pais: 'Portugal',
      cidade: 'Lisboa',
      contatoNome: 'Rui Almeida',
      contatoEmail: 'rui@atlanticservices.pt',
      contatoTelefone: '+351 910 000 222',
      condicaoPagamentoPadrao: '50% pedido / 50% entrega',
      prazoMedioAtendimento: 8,
      avaliacaoInterna: 4.2,
      ativo: true,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      razaoSocial: 'Fuel Track Brasil SA',
      nomeFantasia: 'Fuel Track',
      documento: '98.765.432/0001-10',
      categorias: ['Combustivel'],
      pais: 'Brasil',
      cidade: 'Campinas',
      contatoNome: 'Diego Nunes',
      contatoEmail: 'comercial@fueltrack.com.br',
      contatoTelefone: '+55 19 90000-3333',
      condicaoPagamentoPadrao: '21 dias',
      prazoMedioAtendimento: 3,
      avaliacaoInterna: 4.7,
      ativo: true,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      razaoSocial: 'Tech Parts Competition',
      nomeFantasia: 'Tech Parts',
      documento: '44.444.444/0001-44',
      categorias: ['Materiais', 'Equipamentos'],
      pais: 'Brasil',
      cidade: 'Curitiba',
      contatoNome: 'Livia Prado',
      contatoEmail: 'vendas@techparts.com',
      contatoTelefone: '+55 41 90000-4444',
      condicaoPagamentoPadrao: 'A combinar',
      prazoMedioAtendimento: 7,
      avaliacaoInterna: 4.1,
      ativo: true,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      razaoSocial: 'Hotelaria Race Week',
      nomeFantasia: 'Race Week Hotels',
      documento: '55.555.555/0001-55',
      categorias: ['Hotelaria', 'Alimentacao'],
      pais: 'Brasil',
      cidade: 'Sao Paulo',
      contatoNome: 'Camila Torres',
      contatoEmail: 'eventos@raceweekhotels.com',
      contatoTelefone: '+55 11 90000-5555',
      condicaoPagamentoPadrao: '15 dias',
      prazoMedioAtendimento: 4,
      avaliacaoInterna: 4.0,
      ativo: true,
      createdAt,
      updatedAt: createdAt
    }
  ];

  const events: SourcingEvent[] = [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      codigo: 'SRC-2026-0001',
      titulo: 'Transporte de containers para etapa internacional',
      tipoEvento: 'RFP',
      categoria: 'Frete',
      projetoCodigo: '26ET4',
      projetoDescricao: 'Etapa internacional',
      responsavelNome: 'Rafael Borges',
      prioridade: 'Alta',
      status: 'Em analise',
      moeda: 'EUR',
      dataAbertura: todayIsoDate(),
      prazoResposta: '2026-07-12T21:00:00.000Z',
      descricao: 'Cotacao para transporte dedicado de containers de competicao.',
      condicoesGerais: 'Proposta deve incluir seguro, tracking e janela de coleta.',
      condicaoPagamentoDesejada: '30 dias',
      validadeMinimaProposta: 30,
      observacoesInternas: 'Comparar lead time e disponibilidade.',
      savingEstimado: 1800,
      fornecedorRecomendadoId: '22222222-2222-4222-8222-222222222222',
      justificativaRecomendacao: 'Melhor prazo com valor competitivo.',
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      codigo: 'SRC-2026-0002',
      titulo: 'Fornecimento de combustivel para Velocitta',
      tipoEvento: 'RFQ',
      categoria: 'Combustivel',
      projetoCodigo: '26ET2',
      projetoDescricao: 'Velocitta',
      responsavelNome: 'Rafael Borges',
      prioridade: 'Media',
      status: 'Aguardando fornecedores',
      moeda: 'BRL',
      dataAbertura: todayIsoDate(),
      prazoResposta: '2026-07-15T20:00:00.000Z',
      descricao: 'Fornecimento sob demanda durante fim de semana de prova.',
      condicoesGerais: 'Informar disponibilidade de bomba, equipe e nota fiscal.',
      condicaoPagamentoDesejada: '21 dias',
      validadeMinimaProposta: 20,
      savingEstimado: 0,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      codigo: 'SRC-2026-0003',
      titulo: 'Servico de guincho e apoio de pista',
      tipoEvento: 'Cotacao Simples',
      categoria: 'Guincho',
      projetoCodigo: '26ET3',
      projetoDescricao: 'Interlagos',
      responsavelNome: 'Operacao',
      prioridade: 'Urgente',
      status: 'Aguardando aprovacao',
      moeda: 'BRL',
      dataAbertura: todayIsoDate(),
      prazoResposta: '2026-07-10T18:00:00.000Z',
      descricao: 'Guinchos de apoio e plantao durante atividades de pista.',
      condicoesGerais: 'Equipe uniformizada e seguro operacional obrigatorios.',
      condicaoPagamentoDesejada: '15 dias',
      validadeMinimaProposta: 15,
      savingEstimado: 1200,
      fornecedorRecomendadoId: '22222222-2222-4222-8222-222222222222',
      justificativaRecomendacao: 'Atende SLA e menor custo total.',
      createdAt,
      updatedAt: createdAt
    }
  ];

  const items: SourcingEventItem[] = [
    createSeedItem('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, 'Transporte porta a porta de container 40 HC', 2, 'viagem', 'Sao Paulo / Lisboa'),
    createSeedItem('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 2, 'Seguro internacional da carga', 1, 'servico', 'Origem e destino'),
    createSeedItem('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1, 'Combustivel podium para etapa', 4500, 'litro', 'Velocitta'),
    createSeedItem('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 1, 'Guincho de apoio pista - diaria', 3, 'diaria', 'Interlagos')
  ];

  const eventSuppliers: SourcingEventSupplier[] = [
    createSeedEventSupplier('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', suppliers[0].id, 'Proposta enviada'),
    createSeedEventSupplier('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', suppliers[1].id, 'Proposta enviada'),
    createSeedEventSupplier('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', suppliers[2].id, 'Convite enviado'),
    createSeedEventSupplier('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', suppliers[3].id, 'Convite enviado'),
    createSeedEventSupplier('cccccccc-cccc-4ccc-8ccc-cccccccccccc', suppliers[1].id, 'Proposta enviada')
  ];

  const proposals: SourcingProposal[] = [
    createSeedProposal('p-1', events[0].id, suppliers[0].id, 'EUR', 23800, '30 dias', '12 dias', 78),
    createSeedProposal('p-2', events[0].id, suppliers[1].id, 'EUR', 22000, '50/50', '9 dias', 91),
    createSeedProposal('p-3', events[2].id, suppliers[1].id, 'BRL', 16800, '15 dias', 'Imediato', 88)
  ];

  const proposalItems: SourcingProposalItem[] = [
    createSeedProposalItem(proposals[0].id, items[0].id, 10800, 21600, '12 dias'),
    createSeedProposalItem(proposals[0].id, items[1].id, 2200, 2200, 'Incluso no transporte'),
    createSeedProposalItem(proposals[1].id, items[0].id, 10000, 20000, '9 dias'),
    createSeedProposalItem(proposals[1].id, items[1].id, 2000, 2000, '9 dias'),
    createSeedProposalItem(proposals[2].id, items[3].id, 5600, 16800, 'Imediato')
  ];

  const approvals: SourcingApproval[] = [
    {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      sourcingEventId: events[2].id,
      supplierId: suppliers[1].id,
      valorRecomendado: 16800,
      savingEstimado: 1200,
      justificativa: 'Fornecedor com menor custo e atendimento imediato.',
      status: 'Aguardando aprovacao',
      createdAt,
      updatedAt: createdAt
    }
  ];

  const history: SourcingHistory[] = [
    createHistory(events[0].id, 'Evento criado', 'Evento de transporte criado com dados de exemplo.', undefined, undefined, createdAt),
    createHistory(events[0].id, 'Proposta recebida', 'Duas propostas foram registradas para comparativo.', undefined, undefined, createdAt),
    createHistory(events[2].id, 'Enviado para aprovacao', 'Fornecedor recomendado enviado para aprovacao.', undefined, undefined, createdAt)
  ];

  return {
    events,
    items,
    suppliers,
    eventSuppliers,
    proposals,
    proposalItems,
    approvals,
    history,
    attachments: [],
    source: 'local'
  };
}

function createSeedItem(eventId: string, itemNumero: number, descricao: string, quantidade: number, unidadeMedida: string, localEntrega: string): SourcingEventItem {
  const createdAt = '2026-07-07T12:00:00.000Z';
  return {
    id: createId(),
    sourcingEventId: eventId,
    itemNumero,
    descricao,
    quantidade,
    unidadeMedida,
    localEntrega,
    createdAt,
    updatedAt: createdAt
  };
}

function createSeedEventSupplier(sourcingEventId: string, supplierId: string, statusConvite: SourcingSupplierInviteStatus): SourcingEventSupplier {
  const createdAt = '2026-07-07T12:00:00.000Z';
  return {
    id: createId(),
    sourcingEventId,
    supplierId,
    statusConvite,
    enviadoEm: statusConvite === 'Convite enviado' || statusConvite === 'Proposta enviada' ? createdAt : undefined,
    respondeuEm: statusConvite === 'Proposta enviada' ? createdAt : undefined,
    pretendeParticipar: statusConvite === 'Proposta enviada' ? true : undefined,
    tokenAcesso: createToken(),
    createdAt,
    updatedAt: createdAt
  };
}

function createSeedProposal(idSuffix: string, sourcingEventId: string, supplierId: string, moeda: string, valorTotal: number, condicaoPagamento: string, prazoAtendimento: string, scoreFinal: number): SourcingProposal {
  const createdAt = '2026-07-07T12:00:00.000Z';
  return {
    id: createId(idSuffix),
    sourcingEventId,
    supplierId,
    status: 'Recebida',
    moeda,
    valorTotal,
    freteIncluso: true,
    impostosInclusos: true,
    condicaoPagamento,
    prazoAtendimento,
    validadeProposta: '2026-08-07',
    pontuacaoComercial: scoreFinal,
    pontuacaoTecnica: Math.min(100, scoreFinal + 2),
    scoreFinal,
    recebidaEm: createdAt,
    createdAt,
    updatedAt: createdAt
  };
}

function createSeedProposalItem(proposalId: string, itemId: string, precoUnitario: number, precoTotal: number, prazoAtendimento: string): SourcingProposalItem {
  const createdAt = '2026-07-07T12:00:00.000Z';
  return {
    id: createId(),
    sourcingProposalId: proposalId,
    sourcingEventItemId: itemId,
    precoUnitario,
    precoTotal,
    prazoAtendimento,
    status: 'Recebido',
    createdAt,
    updatedAt: createdAt
  };
}

function createHistory(
  sourcingEventId: string | undefined,
  acao: string,
  descricao: string,
  usuarioId?: string,
  usuarioNome?: string,
  createdAt: string = nowIso(),
  dadosAnteriores?: unknown,
  dadosNovos?: unknown
): SourcingHistory {
  return {
    id: createId(),
    sourcingEventId,
    acao,
    descricao,
    usuarioId,
    usuarioNome,
    dadosAnteriores,
    dadosNovos,
    createdAt
  };
}

function readLocalState(): SourcingState {
  if (typeof window === 'undefined') return getSeedState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = getSeedState();
      writeLocalState(seeded);
      return seeded;
    }

    const parsed = JSON.parse(raw) as SourcingState;
    return {
      ...getEmptyState('local'),
      ...parsed,
      source: 'local'
    };
  } catch (error) {
    console.warn('Erro ao ler estado local de Sourcing:', error);
    const seeded = getSeedState();
    writeLocalState(seeded);
    return seeded;
  }
}

function writeLocalState(state: SourcingState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, source: 'local' }));
  window.dispatchEvent(new CustomEvent('sourcing-updated'));
}

async function trySupabaseSelect<T>(table: string, orderColumn = 'created_at', ascending = false): Promise<T[] | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderColumn, { ascending });

    if (error) {
      console.info(`Sourcing: tabela ${table} indisponivel ou sem permissao:`, error.message);
      return null;
    }

    return (data || []) as T[];
  } catch (error) {
    console.info(`Sourcing: leitura de ${table} ignorada no modo local.`, error);
    return null;
  }
}

async function trySupabaseInsert(table: string, payload: Record<string, unknown> | Record<string, unknown>[]) {
  try {
    const supabase = createClient();
    const { error } = await supabase.from(table).insert(payload);
    if (error) console.info(`Sourcing: insert em ${table} ignorado:`, error.message);
  } catch (error) {
    console.info(`Sourcing: insert em ${table} ignorado no modo local.`, error);
  }
}

async function trySupabaseUpsert(table: string, payload: Record<string, unknown> | Record<string, unknown>[], onConflict = 'id') {
  try {
    const supabase = createClient();
    const { error } = await supabase.from(table).upsert(payload, { onConflict });
    if (error) console.info(`Sourcing: upsert em ${table} ignorado:`, error.message);
  } catch (error) {
    console.info(`Sourcing: upsert em ${table} ignorado no modo local.`, error);
  }
}

function mapSupplierRow(row: any): SourcingSupplier {
  return {
    id: row.id,
    razaoSocial: row.razao_social || '',
    nomeFantasia: row.nome_fantasia || undefined,
    documento: row.documento || undefined,
    categorias: Array.isArray(row.categorias) ? row.categorias : [],
    pais: row.pais || undefined,
    cidade: row.cidade || undefined,
    contatoNome: row.contato_nome || undefined,
    contatoEmail: row.contato_email || undefined,
    contatoTelefone: row.contato_telefone || undefined,
    condicaoPagamentoPadrao: row.condicao_pagamento_padrao || undefined,
    prazoMedioAtendimento: row.prazo_medio_atendimento ?? undefined,
    avaliacaoInterna: row.avaliacao_interna ?? undefined,
    ativo: row.ativo !== false,
    observacoes: row.observacoes || undefined,
    createdAt: row.created_at || nowIso(),
    updatedAt: row.updated_at || row.created_at || nowIso(),
    createdBy: row.created_by || undefined,
    updatedBy: row.updated_by || undefined
  };
}

function supplierToRow(supplier: SourcingSupplier) {
  return {
    id: supplier.id,
    razao_social: supplier.razaoSocial,
    nome_fantasia: supplier.nomeFantasia || null,
    documento: supplier.documento || null,
    categorias: supplier.categorias || [],
    pais: supplier.pais || null,
    cidade: supplier.cidade || null,
    contato_nome: supplier.contatoNome || null,
    contato_email: supplier.contatoEmail || null,
    contato_telefone: supplier.contatoTelefone || null,
    condicao_pagamento_padrao: supplier.condicaoPagamentoPadrao || null,
    prazo_medio_atendimento: supplier.prazoMedioAtendimento ?? null,
    avaliacao_interna: supplier.avaliacaoInterna ?? null,
    ativo: supplier.ativo,
    observacoes: supplier.observacoes || null,
    created_at: supplier.createdAt,
    updated_at: supplier.updatedAt,
    created_by: supplier.createdBy || null,
    updated_by: supplier.updatedBy || null
  };
}

function mapEventRow(row: any): SourcingEvent {
  return {
    id: row.id,
    codigo: row.codigo || '',
    titulo: row.titulo || '',
    tipoEvento: row.tipo_evento || 'RFP',
    categoria: row.categoria || 'Outros',
    seasonId: row.season_id || undefined,
    stageId: row.stage_id || undefined,
    projetoId: row.projeto_id || undefined,
    projetoCodigo: row.projeto_codigo || undefined,
    projetoDescricao: row.projeto_descricao || undefined,
    responsavelId: row.responsavel_id || undefined,
    responsavelNome: row.responsavel_nome || undefined,
    prioridade: row.prioridade || 'Media',
    status: (row.status || 'Rascunho') as SourcingStatus,
    moeda: row.moeda || 'BRL',
    dataAbertura: dateOrUndefined(row.data_abertura),
    prazoResposta: dateOrUndefined(row.prazo_resposta),
    descricao: row.descricao || undefined,
    condicoesGerais: row.condicoes_gerais || undefined,
    condicaoPagamentoDesejada: row.condicao_pagamento_desejada || undefined,
    validadeMinimaProposta: row.validade_minima_proposta ?? undefined,
    observacoesInternas: row.observacoes_internas || undefined,
    savingEstimado: money(row.saving_estimado),
    fornecedorRecomendadoId: row.fornecedor_recomendado_id || undefined,
    justificativaRecomendacao: row.justificativa_recomendacao || undefined,
    createdAt: row.created_at || nowIso(),
    updatedAt: row.updated_at || row.created_at || nowIso(),
    createdBy: row.created_by || undefined,
    updatedBy: row.updated_by || undefined
  };
}

function eventToRow(event: SourcingEvent) {
  return {
    id: event.id,
    codigo: event.codigo,
    titulo: event.titulo,
    tipo_evento: event.tipoEvento,
    categoria: event.categoria,
    season_id: event.seasonId || null,
    stage_id: event.stageId || null,
    projeto_id: event.projetoId || null,
    projeto_codigo: event.projetoCodigo || null,
    projeto_descricao: event.projetoDescricao || null,
    responsavel_id: event.responsavelId || null,
    responsavel_nome: event.responsavelNome || null,
    prioridade: event.prioridade,
    status: event.status,
    moeda: event.moeda,
    data_abertura: event.dataAbertura || null,
    prazo_resposta: event.prazoResposta || null,
    descricao: event.descricao || null,
    condicoes_gerais: event.condicoesGerais || null,
    condicao_pagamento_desejada: event.condicaoPagamentoDesejada || null,
    validade_minima_proposta: event.validadeMinimaProposta ?? null,
    observacoes_internas: event.observacoesInternas || null,
    saving_estimado: event.savingEstimado || 0,
    fornecedor_recomendado_id: event.fornecedorRecomendadoId || null,
    justificativa_recomendacao: event.justificativaRecomendacao || null,
    created_at: event.createdAt,
    updated_at: event.updatedAt,
    created_by: event.createdBy || null,
    updated_by: event.updatedBy || null
  };
}

function mapItemRow(row: any): SourcingEventItem {
  return {
    id: row.id,
    sourcingEventId: row.sourcing_event_id,
    itemNumero: row.item_numero || 1,
    descricao: row.descricao || '',
    quantidade: money(row.quantidade),
    unidadeMedida: row.unidade_medida || 'un',
    localEntrega: row.local_entrega || undefined,
    dataNecessaria: dateOrUndefined(row.data_necessaria),
    especificacaoTecnica: row.especificacao_tecnica || undefined,
    observacao: row.observacao || undefined,
    createdAt: row.created_at || nowIso(),
    updatedAt: row.updated_at || row.created_at || nowIso()
  };
}

function itemToRow(item: SourcingEventItem) {
  return {
    id: item.id,
    sourcing_event_id: item.sourcingEventId,
    item_numero: item.itemNumero,
    descricao: item.descricao,
    quantidade: item.quantidade,
    unidade_medida: item.unidadeMedida,
    local_entrega: item.localEntrega || null,
    data_necessaria: item.dataNecessaria || null,
    especificacao_tecnica: item.especificacaoTecnica || null,
    observacao: item.observacao || null,
    created_at: item.createdAt,
    updated_at: item.updatedAt
  };
}

function mapEventSupplierRow(row: any): SourcingEventSupplier {
  return {
    id: row.id,
    sourcingEventId: row.sourcing_event_id,
    supplierId: row.supplier_id,
    statusConvite: (row.status_convite || 'Convite nao enviado') as SourcingSupplierInviteStatus,
    enviadoEm: dateOrUndefined(row.enviado_em),
    visualizadoEm: dateOrUndefined(row.visualizado_em),
    respondeuEm: dateOrUndefined(row.respondeu_em),
    pretendeParticipar: row.pretende_participar ?? undefined,
    motivoRecusa: row.motivo_recusa || undefined,
    tokenAcesso: row.token_acesso || createToken(),
    ultimoEmailStatus: row.ultimo_email_status || undefined,
    ultimoEmailErro: row.ultimo_email_erro || undefined,
    createdAt: row.created_at || nowIso(),
    updatedAt: row.updated_at || row.created_at || nowIso()
  };
}

function eventSupplierToRow(link: SourcingEventSupplier) {
  return {
    id: link.id,
    sourcing_event_id: link.sourcingEventId,
    supplier_id: link.supplierId,
    status_convite: link.statusConvite,
    enviado_em: link.enviadoEm || null,
    visualizado_em: link.visualizadoEm || null,
    respondeu_em: link.respondeuEm || null,
    pretende_participar: link.pretendeParticipar ?? null,
    motivo_recusa: link.motivoRecusa || null,
    token_acesso: link.tokenAcesso,
    ultimo_email_status: link.ultimoEmailStatus || null,
    ultimo_email_erro: link.ultimoEmailErro || null,
    created_at: link.createdAt,
    updated_at: link.updatedAt
  };
}

function mapProposalRow(row: any): SourcingProposal {
  return {
    id: row.id,
    sourcingEventId: row.sourcing_event_id,
    supplierId: row.supplier_id,
    status: (row.status || 'Recebida') as SourcingProposalStatus,
    moeda: row.moeda || 'BRL',
    valorTotal: money(row.valor_total),
    freteIncluso: row.frete_incluso === true,
    impostosInclusos: row.impostos_inclusos === true,
    condicaoPagamento: row.condicao_pagamento || undefined,
    prazoAtendimento: row.prazo_atendimento || undefined,
    validadeProposta: dateOrUndefined(row.validade_proposta),
    valorMinimoPedido: row.valor_minimo_pedido == null ? undefined : money(row.valor_minimo_pedido),
    observacoes: row.observacoes || undefined,
    respondidoPorNome: row.respondido_por_nome || undefined,
    respondidoPorEmail: row.respondido_por_email || undefined,
    origem: row.origem || 'interno',
    pontuacaoComercial: row.pontuacao_comercial ?? undefined,
    pontuacaoTecnica: row.pontuacao_tecnica ?? undefined,
    scoreFinal: row.score_final ?? undefined,
    recebidaEm: dateOrUndefined(row.recebida_em),
    createdAt: row.created_at || nowIso(),
    updatedAt: row.updated_at || row.created_at || nowIso(),
    createdBy: row.created_by || undefined,
    updatedBy: row.updated_by || undefined
  };
}

function proposalToRow(proposal: SourcingProposal) {
  return {
    id: proposal.id,
    sourcing_event_id: proposal.sourcingEventId,
    supplier_id: proposal.supplierId,
    status: proposal.status,
    moeda: proposal.moeda,
    valor_total: proposal.valorTotal,
    frete_incluso: proposal.freteIncluso,
    impostos_inclusos: proposal.impostosInclusos,
    condicao_pagamento: proposal.condicaoPagamento || null,
    prazo_atendimento: proposal.prazoAtendimento || null,
    validade_proposta: proposal.validadeProposta || null,
    valor_minimo_pedido: proposal.valorMinimoPedido ?? null,
    observacoes: proposal.observacoes || null,
    respondido_por_nome: proposal.respondidoPorNome || null,
    respondido_por_email: proposal.respondidoPorEmail || null,
    origem: proposal.origem || 'interno',
    pontuacao_comercial: proposal.pontuacaoComercial ?? null,
    pontuacao_tecnica: proposal.pontuacaoTecnica ?? null,
    score_final: proposal.scoreFinal ?? null,
    recebida_em: proposal.recebidaEm || null,
    created_at: proposal.createdAt,
    updated_at: proposal.updatedAt,
    created_by: proposal.createdBy || null,
    updated_by: proposal.updatedBy || null
  };
}

function mapProposalItemRow(row: any): SourcingProposalItem {
  return {
    id: row.id,
    sourcingProposalId: row.sourcing_proposal_id,
    sourcingEventItemId: row.sourcing_event_item_id,
    precoUnitario: money(row.preco_unitario),
    precoTotal: money(row.preco_total),
    capacidade: row.capacidade == null ? undefined : money(row.capacidade),
    moeda: row.moeda || undefined,
    prazoAtendimento: row.prazo_atendimento || undefined,
    observacao: row.observacao || undefined,
    alternativaTecnica: row.alternativa_tecnica || undefined,
    status: row.status || 'Recebido',
    createdAt: row.created_at || nowIso(),
    updatedAt: row.updated_at || row.created_at || nowIso()
  };
}

function proposalItemToRow(item: SourcingProposalItem) {
  return {
    id: item.id,
    sourcing_proposal_id: item.sourcingProposalId,
    sourcing_event_item_id: item.sourcingEventItemId,
    preco_unitario: item.precoUnitario,
    preco_total: item.precoTotal,
    capacidade: item.capacidade ?? null,
    moeda: item.moeda || null,
    prazo_atendimento: item.prazoAtendimento || null,
    observacao: item.observacao || null,
    alternativa_tecnica: item.alternativaTecnica || null,
    status: item.status,
    created_at: item.createdAt,
    updated_at: item.updatedAt
  };
}

function mapApprovalRow(row: any): SourcingApproval {
  return {
    id: row.id,
    sourcingEventId: row.sourcing_event_id,
    supplierId: row.supplier_id || undefined,
    valorRecomendado: money(row.valor_recomendado),
    savingEstimado: money(row.saving_estimado),
    justificativa: row.justificativa || '',
    solicitanteId: row.solicitante_id || undefined,
    aprovadorId: row.aprovador_id || undefined,
    status: (row.status || 'Aguardando aprovacao') as SourcingApprovalStatus,
    comentarioAprovador: row.comentario_aprovador || undefined,
    aprovadoEm: dateOrUndefined(row.aprovado_em),
    createdAt: row.created_at || nowIso(),
    updatedAt: row.updated_at || row.created_at || nowIso()
  };
}

function approvalToRow(approval: SourcingApproval) {
  return {
    id: approval.id,
    sourcing_event_id: approval.sourcingEventId,
    supplier_id: approval.supplierId || null,
    valor_recomendado: approval.valorRecomendado,
    saving_estimado: approval.savingEstimado,
    justificativa: approval.justificativa,
    solicitante_id: approval.solicitanteId || null,
    aprovador_id: approval.aprovadorId || null,
    status: approval.status,
    comentario_aprovador: approval.comentarioAprovador || null,
    aprovado_em: approval.aprovadoEm || null,
    created_at: approval.createdAt,
    updated_at: approval.updatedAt
  };
}

function mapHistoryRow(row: any): SourcingHistory {
  return {
    id: row.id,
    sourcingEventId: row.sourcing_event_id || undefined,
    acao: row.acao || '',
    descricao: row.descricao || '',
    usuarioId: row.usuario_id || undefined,
    usuarioNome: row.usuario_nome || undefined,
    dadosAnteriores: row.dados_anteriores,
    dadosNovos: row.dados_novos,
    createdAt: row.created_at || nowIso()
  };
}

function historyToRow(history: SourcingHistory) {
  return {
    id: history.id,
    sourcing_event_id: history.sourcingEventId || null,
    acao: history.acao,
    descricao: history.descricao,
    usuario_id: history.usuarioId || null,
    usuario_nome: history.usuarioNome || null,
    dados_anteriores: history.dadosAnteriores || null,
    dados_novos: history.dadosNovos || null,
    created_at: history.createdAt
  };
}

function mapAttachmentRow(row: any): SourcingAttachment {
  return {
    id: row.id,
    sourcingEventId: row.sourcing_event_id || undefined,
    proposalId: row.proposal_id || undefined,
    supplierId: row.supplier_id || undefined,
    nomeArquivo: row.nome_arquivo || '',
    urlArquivo: row.url_arquivo || '',
    tipo: row.tipo || 'evento',
    uploadedBy: row.uploaded_by || undefined,
    createdAt: row.created_at || nowIso()
  };
}

async function fetchRemoteState(): Promise<SourcingState | null> {
  const [
    suppliers,
    events,
    items,
    eventSuppliers,
    proposals,
    proposalItems,
    approvals,
    history,
    attachments
  ] = await Promise.all([
    trySupabaseSelect<any>('sourcing_suppliers', 'updated_at'),
    trySupabaseSelect<any>('sourcing_events', 'updated_at'),
    trySupabaseSelect<any>('sourcing_event_items', 'item_numero', true),
    trySupabaseSelect<any>('sourcing_event_suppliers', 'created_at', true),
    trySupabaseSelect<any>('sourcing_proposals', 'updated_at'),
    trySupabaseSelect<any>('sourcing_proposal_items', 'created_at', true),
    trySupabaseSelect<any>('sourcing_approvals', 'updated_at'),
    trySupabaseSelect<any>('sourcing_history', 'created_at'),
    trySupabaseSelect<any>('sourcing_attachments', 'created_at')
  ]);

  const unavailable = [suppliers, events, items, eventSuppliers, proposals, proposalItems, approvals, history, attachments]
    .some(value => value === null);

  if (unavailable) return null;

  const state: SourcingState = {
    suppliers: (suppliers || []).map(mapSupplierRow),
    events: (events || []).map(mapEventRow),
    items: (items || []).map(mapItemRow),
    eventSuppliers: (eventSuppliers || []).map(mapEventSupplierRow),
    proposals: (proposals || []).map(mapProposalRow),
    proposalItems: (proposalItems || []).map(mapProposalItemRow),
    approvals: (approvals || []).map(mapApprovalRow),
    history: (history || []).map(mapHistoryRow),
    attachments: (attachments || []).map(mapAttachmentRow),
    source: 'supabase'
  };

  const hasRemoteData = state.events.length > 0 || state.suppliers.length > 0 || state.proposals.length > 0;
  if (!hasRemoteData) return null;

  writeLocalState(state);
  return state;
}

export async function loadSourcingState(): Promise<SourcingState> {
  const remote = await fetchRemoteState();
  if (remote) return remote;
  return readLocalState();
}

function nextEventCode(events: SourcingEvent[]): string {
  const year = new Date().getFullYear();
  const prefix = `SRC-${year}-`;
  const max = events.reduce((highest, event) => {
    if (!event.codigo?.startsWith(prefix)) return highest;
    const number = Number(event.codigo.slice(prefix.length));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);

  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

async function getUserInfo() {
  const user = await getCurrentUser();
  return {
    id: user?.id,
    name: user?.name || user?.email || 'Usuario'
  };
}

async function appendHistory(state: SourcingState, history: SourcingHistory) {
  state.history.unshift(history);
  await trySupabaseInsert('sourcing_history', historyToRow(history));
}

export async function createSourcingSupplier(input: SourcingSupplierInput): Promise<{ state: SourcingState; supplier: SourcingSupplier }> {
  const state = await loadSourcingState();
  const user = await getUserInfo();
  const timestamp = nowIso();

  const supplier: SourcingSupplier = {
    id: createId(),
    razaoSocial: input.razaoSocial,
    nomeFantasia: input.nomeFantasia,
    documento: input.documento,
    categorias: input.categorias?.length ? input.categorias : ['Outros'],
    pais: input.pais,
    cidade: input.cidade,
    contatoNome: input.contatoNome,
    contatoEmail: input.contatoEmail,
    contatoTelefone: input.contatoTelefone,
    condicaoPagamentoPadrao: input.condicaoPagamentoPadrao,
    prazoMedioAtendimento: input.prazoMedioAtendimento,
    avaliacaoInterna: input.avaliacaoInterna,
    ativo: input.ativo !== false,
    observacoes: input.observacoes,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: user.id,
    updatedBy: user.id
  };

  state.suppliers.unshift(supplier);
  writeLocalState(state);
  await trySupabaseInsert('sourcing_suppliers', supplierToRow(supplier));
  return { state, supplier };
}

export async function updateSourcingSupplier(id: string, updates: Partial<SourcingSupplier>): Promise<SourcingState> {
  const state = await loadSourcingState();
  const user = await getUserInfo();
  const supplier = state.suppliers.find(item => item.id === id);
  if (!supplier) return state;

  Object.assign(supplier, updates, { updatedAt: nowIso(), updatedBy: user.id });
  writeLocalState(state);
  await trySupabaseUpsert('sourcing_suppliers', supplierToRow(supplier));
  return state;
}

export async function createSourcingEvent(input: SourcingEventInput): Promise<{ state: SourcingState; event: SourcingEvent }> {
  const state = await loadSourcingState();
  const user = await getUserInfo();
  const timestamp = nowIso();

  const event: SourcingEvent = {
    id: createId(),
    codigo: nextEventCode(state.events),
    titulo: input.titulo,
    tipoEvento: input.tipoEvento,
    categoria: input.categoria,
    seasonId: input.seasonId,
    stageId: input.stageId,
    projetoId: input.projetoId,
    projetoCodigo: input.projetoCodigo,
    projetoDescricao: input.projetoDescricao,
    responsavelId: user.id,
    responsavelNome: input.responsavelNome || user.name,
    prioridade: input.prioridade,
    status: input.status || (input.supplierIds.length ? 'Aguardando fornecedores' : 'Rascunho'),
    moeda: input.moeda,
    dataAbertura: input.dataAbertura || todayIsoDate(),
    prazoResposta: input.prazoResposta,
    descricao: input.descricao,
    condicoesGerais: input.condicoesGerais,
    condicaoPagamentoDesejada: input.condicaoPagamentoDesejada,
    validadeMinimaProposta: input.validadeMinimaProposta,
    observacoesInternas: input.observacoesInternas,
    savingEstimado: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: user.id,
    updatedBy: user.id
  };

  const items = input.items
    .filter(item => item.descricao?.trim())
    .map((item, index): SourcingEventItem => ({
      id: createId(),
      sourcingEventId: event.id,
      itemNumero: index + 1,
      descricao: item.descricao.trim(),
      quantidade: money(item.quantidade) || 1,
      unidadeMedida: item.unidadeMedida || 'un',
      localEntrega: item.localEntrega,
      dataNecessaria: item.dataNecessaria,
      especificacaoTecnica: item.especificacaoTecnica,
      observacao: item.observacao,
      createdAt: timestamp,
      updatedAt: timestamp
    }));

  const links = input.supplierIds.map((supplierId): SourcingEventSupplier => ({
    id: createId(),
    sourcingEventId: event.id,
    supplierId,
    statusConvite: 'Convite nao enviado',
    tokenAcesso: createToken(),
    createdAt: timestamp,
    updatedAt: timestamp
  }));

  state.events.unshift(event);
  state.items.push(...items);
  state.eventSuppliers.push(...links);
  await appendHistory(
    state,
    createHistory(event.id, 'Evento criado', `Evento ${event.codigo} criado com ${items.length} item(ns) e ${links.length} fornecedor(es).`, user.id, user.name, timestamp, undefined, event)
  );

  writeLocalState(state);
  await trySupabaseInsert('sourcing_events', eventToRow(event));
  if (items.length) await trySupabaseInsert('sourcing_event_items', items.map(itemToRow));
  if (links.length) await trySupabaseInsert('sourcing_event_suppliers', links.map(eventSupplierToRow));
  return { state, event };
}

export async function updateSourcingEvent(id: string, updates: Partial<SourcingEvent>): Promise<SourcingState> {
  const state = await loadSourcingState();
  const user = await getUserInfo();
  const event = state.events.find(item => item.id === id);
  if (!event) return state;

  const before = { ...event };
  Object.assign(event, updates, { updatedAt: nowIso(), updatedBy: user.id });
  await appendHistory(
    state,
    createHistory(event.id, 'Evento atualizado', `Evento ${event.codigo} atualizado.`, user.id, user.name, nowIso(), before, event)
  );

  writeLocalState(state);
  await trySupabaseUpsert('sourcing_events', eventToRow(event));
  return state;
}

export async function duplicateSourcingEvent(id: string): Promise<{ state: SourcingState; event?: SourcingEvent }> {
  const state = await loadSourcingState();
  const original = state.events.find(event => event.id === id);
  if (!original) return { state };

  const items = state.items
    .filter(item => item.sourcingEventId === id)
    .map(item => ({
      descricao: item.descricao,
      quantidade: item.quantidade,
      unidadeMedida: item.unidadeMedida,
      localEntrega: item.localEntrega,
      dataNecessaria: item.dataNecessaria,
      especificacaoTecnica: item.especificacaoTecnica,
      observacao: item.observacao
    }));

  return createSourcingEvent({
    ...original,
    titulo: `${original.titulo} (copia)`,
    status: 'Rascunho',
    items,
    supplierIds: []
  });
}

export async function updateInviteStatus(
  eventSupplierId: string,
  statusConvite: SourcingSupplierInviteStatus,
  details: { pretendeParticipar?: boolean; motivoRecusa?: string } = {}
): Promise<SourcingState> {
  const state = await loadSourcingState();
  const user = await getUserInfo();
  const link = state.eventSuppliers.find(item => item.id === eventSupplierId);
  if (!link) return state;

  const timestamp = nowIso();
  link.statusConvite = statusConvite;
  link.updatedAt = timestamp;
  link.pretendeParticipar = details.pretendeParticipar ?? link.pretendeParticipar;
  link.motivoRecusa = details.motivoRecusa || link.motivoRecusa;
  if (['Pretende participar', 'Recusou participacao', 'Proposta enviada'].includes(statusConvite)) {
    link.respondeuEm = timestamp;
  }
  if (statusConvite === 'Convite enviado' && !link.enviadoEm) link.enviadoEm = timestamp;

  const event = state.events.find(item => item.id === link.sourcingEventId);
  const supplier = state.suppliers.find(item => item.id === link.supplierId);
  await appendHistory(
    state,
    createHistory(event?.id, 'Status fornecedor', `${supplier?.nomeFantasia || supplier?.razaoSocial || 'Fornecedor'}: ${statusConvite}.`, user.id, user.name)
  );

  writeLocalState(state);
  await trySupabaseUpsert('sourcing_event_suppliers', eventSupplierToRow(link));
  return state;
}

export async function createSourcingProposal(input: SourcingProposalInput): Promise<{ state: SourcingState; proposal: SourcingProposal }> {
  const state = await loadSourcingState();
  const user = await getUserInfo();
  const timestamp = nowIso();
  const eventItems = state.items.filter(item => item.sourcingEventId === input.sourcingEventId);
  const itemsById = new Map(eventItems.map(item => [item.id, item]));

  const proposalItems = input.items
    .filter(item => itemsById.has(item.sourcingEventItemId))
    .map(item => {
      const eventItem = itemsById.get(item.sourcingEventItemId)!;
      const precoUnitario = money(item.precoUnitario);
      return {
        id: createId(),
        sourcingProposalId: '',
        sourcingEventItemId: eventItem.id,
        precoUnitario,
        precoTotal: precoUnitario * eventItem.quantidade,
        capacidade: item.capacidade,
        moeda: item.moeda || input.moeda,
        prazoAtendimento: item.prazoAtendimento,
        observacao: item.observacao,
        alternativaTecnica: item.alternativaTecnica,
        status: item.status || 'Recebido',
        createdAt: timestamp,
        updatedAt: timestamp
      } as SourcingProposalItem;
    });

  const valorTotal = proposalItems.reduce((sum, item) => sum + item.precoTotal, 0);
  const scoreFinal = calculateProposalScore(valorTotal, input.pontuacaoComercial, input.pontuacaoTecnica);
  const proposal: SourcingProposal = {
    id: createId(),
    sourcingEventId: input.sourcingEventId,
    supplierId: input.supplierId,
    status: 'Recebida',
    moeda: input.moeda,
    valorTotal,
    freteIncluso: input.freteIncluso,
    impostosInclusos: input.impostosInclusos,
    condicaoPagamento: input.condicaoPagamento,
    prazoAtendimento: input.prazoAtendimento,
    validadeProposta: input.validadeProposta,
    valorMinimoPedido: input.valorMinimoPedido,
    observacoes: input.observacoes,
    respondidoPorNome: input.respondidoPorNome,
    respondidoPorEmail: input.respondidoPorEmail,
    origem: input.origem || 'interno',
    pontuacaoComercial: input.pontuacaoComercial,
    pontuacaoTecnica: input.pontuacaoTecnica,
    scoreFinal,
    recebidaEm: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: user.id,
    updatedBy: user.id
  };

  proposalItems.forEach(item => {
    item.sourcingProposalId = proposal.id;
  });

  state.proposals.unshift(proposal);
  state.proposalItems.push(...proposalItems);

  const link = state.eventSuppliers.find(item => item.sourcingEventId === input.sourcingEventId && item.supplierId === input.supplierId);
  if (link) {
    link.statusConvite = 'Proposta enviada';
    link.pretendeParticipar = true;
    link.respondeuEm = timestamp;
    link.updatedAt = timestamp;
  }

  const event = state.events.find(item => item.id === input.sourcingEventId);
  if (event && ['Aguardando fornecedores', 'Em cotacao', 'Publicado'].includes(event.status)) {
    event.status = 'Em analise';
    event.updatedAt = timestamp;
    event.updatedBy = user.id;
  }

  const supplier = state.suppliers.find(item => item.id === input.supplierId);
  await appendHistory(
    state,
    createHistory(input.sourcingEventId, 'Proposta recebida', `Proposta de ${supplier?.nomeFantasia || supplier?.razaoSocial || 'fornecedor'} registrada no valor de ${input.moeda} ${valorTotal.toFixed(2)}.`, user.id, user.name, timestamp)
  );

  writeLocalState(state);
  await trySupabaseInsert('sourcing_proposals', proposalToRow(proposal));
  if (proposalItems.length) await trySupabaseInsert('sourcing_proposal_items', proposalItems.map(proposalItemToRow));
  if (link) await trySupabaseUpsert('sourcing_event_suppliers', eventSupplierToRow(link));
  if (event) await trySupabaseUpsert('sourcing_events', eventToRow(event));
  return { state, proposal };
}

function calculateProposalScore(valorTotal: number, comercial?: number, tecnico?: number) {
  const baseCommercial = comercial ?? Math.max(40, 100 - Math.min(50, valorTotal / 10000));
  const baseTechnical = tecnico ?? 80;
  return Math.round((baseCommercial * 0.65 + baseTechnical * 0.35) * 10) / 10;
}

export async function recommendSourcingSupplier(input: {
  sourcingEventId: string;
  supplierId: string;
  justificativa: string;
  savingEstimado: number;
}): Promise<SourcingState> {
  const state = await loadSourcingState();
  const user = await getUserInfo();
  const timestamp = nowIso();
  const event = state.events.find(item => item.id === input.sourcingEventId);
  if (!event) return state;

  const proposal = state.proposals
    .filter(item => item.sourcingEventId === input.sourcingEventId && item.supplierId === input.supplierId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  event.status = 'Aguardando aprovacao';
  event.fornecedorRecomendadoId = input.supplierId;
  event.justificativaRecomendacao = input.justificativa;
  event.savingEstimado = input.savingEstimado;
  event.updatedAt = timestamp;
  event.updatedBy = user.id;

  const existingApproval = state.approvals.find(item => item.sourcingEventId === event.id && item.status === 'Aguardando aprovacao');
  const approval: SourcingApproval = existingApproval || {
    id: createId(),
    sourcingEventId: event.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    valorRecomendado: 0,
    savingEstimado: 0,
    justificativa: '',
    status: 'Aguardando aprovacao'
  };

  approval.supplierId = input.supplierId;
  approval.valorRecomendado = proposal?.valorTotal || 0;
  approval.savingEstimado = input.savingEstimado;
  approval.justificativa = input.justificativa;
  approval.solicitanteId = user.id;
  approval.status = 'Aguardando aprovacao';
  approval.updatedAt = timestamp;

  if (!existingApproval) state.approvals.unshift(approval);

  const supplier = state.suppliers.find(item => item.id === input.supplierId);
  await appendHistory(
    state,
    createHistory(event.id, 'Fornecedor recomendado', `${supplier?.nomeFantasia || supplier?.razaoSocial || 'Fornecedor'} recomendado para aprovacao.`, user.id, user.name, timestamp)
  );

  writeLocalState(state);
  await trySupabaseUpsert('sourcing_events', eventToRow(event));
  await trySupabaseUpsert('sourcing_approvals', approvalToRow(approval));
  return state;
}

export async function resolveSourcingApproval(
  approvalId: string,
  status: SourcingApprovalStatus,
  comentarioAprovador?: string
): Promise<SourcingState> {
  const state = await loadSourcingState();
  const user = await getUserInfo();
  const timestamp = nowIso();
  const approval = state.approvals.find(item => item.id === approvalId);
  if (!approval) return state;

  approval.status = status;
  approval.comentarioAprovador = comentarioAprovador;
  approval.aprovadorId = user.id;
  approval.aprovadoEm = status === 'Aprovado' ? timestamp : approval.aprovadoEm;
  approval.updatedAt = timestamp;

  const event = state.events.find(item => item.id === approval.sourcingEventId);
  if (event) {
    event.status = status === 'Aprovado'
      ? 'Aprovado'
      : status === 'Recusado'
        ? 'Recusado'
        : 'Em analise';
    event.updatedAt = timestamp;
    event.updatedBy = user.id;
  }

  await appendHistory(
    state,
    createHistory(event?.id, 'Aprovacao atualizada', `Aprovacao marcada como ${status}.`, user.id, user.name, timestamp)
  );

  writeLocalState(state);
  await trySupabaseUpsert('sourcing_approvals', approvalToRow(approval));
  if (event) await trySupabaseUpsert('sourcing_events', eventToRow(event));
  return state;
}

export function getEventItems(state: SourcingState, eventId: string) {
  return state.items
    .filter(item => item.sourcingEventId === eventId)
    .sort((a, b) => a.itemNumero - b.itemNumero);
}

export function getEventSuppliers(state: SourcingState, eventId: string) {
  const links = state.eventSuppliers.filter(item => item.sourcingEventId === eventId);
  return links.map(link => ({
    link,
    supplier: state.suppliers.find(supplier => supplier.id === link.supplierId)
  }));
}

export function getEventProposals(state: SourcingState, eventId: string) {
  return state.proposals
    .filter(item => item.sourcingEventId === eventId)
    .map(proposal => ({
      proposal,
      supplier: state.suppliers.find(supplier => supplier.id === proposal.supplierId),
      items: state.proposalItems.filter(item => item.sourcingProposalId === proposal.id)
    }))
    .sort((a, b) => a.proposal.valorTotal - b.proposal.valorTotal);
}

export function getEventHistory(state: SourcingState, eventId: string) {
  return state.history
    .filter(item => item.sourcingEventId === eventId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDashboardMetrics(state: SourcingState) {
  const openStatuses = new Set<SourcingStatus>(['Publicado', 'Aguardando fornecedores', 'Em cotacao', 'Em analise', 'Aguardando aprovacao']);
  return {
    eventosAbertos: state.events.filter(event => openStatuses.has(event.status)).length,
    aguardandoProposta: state.events.filter(event => ['Aguardando fornecedores', 'Em cotacao'].includes(event.status)).length,
    emAnalise: state.events.filter(event => event.status === 'Em analise').length,
    aprovados: state.events.filter(event => event.status === 'Aprovado').length,
    encerrados: state.events.filter(event => event.status === 'Encerrado').length,
    fornecedoresConvidados: state.eventSuppliers.length,
    propostasRecebidas: state.proposals.length,
    economiaEstimada: state.events.reduce((sum, event) => sum + money(event.savingEstimado), 0)
  };
}

export function getBestProposalForEvent(state: SourcingState, eventId: string): SourcingProposal | undefined {
  return state.proposals
    .filter(proposal => proposal.sourcingEventId === eventId && proposal.status !== 'Desclassificada')
    .sort((a, b) => a.valorTotal - b.valorTotal)[0];
}
