-- ConectaCup - Sourcing Logistica e Compras
-- MVP interno autenticado para eventos RFP/RFQ, fornecedores, propostas,
-- comparativo comercial, aprovacoes, anexos e historico.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.sourcing_suppliers (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text,
  documento text,
  categorias text[] not null default '{}',
  pais text,
  cidade text,
  contato_nome text,
  contato_email text,
  contato_telefone text,
  condicao_pagamento_padrao text,
  prazo_medio_atendimento integer,
  avaliacao_interna numeric(3, 1),
  ativo boolean not null default true,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.sourcing_events (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  titulo text not null,
  tipo_evento text not null default 'RFP',
  categoria text not null default 'Outros',
  season_id uuid references public.seasons(id) on delete set null,
  stage_id uuid references public.season_stages(id) on delete set null,
  projeto_id uuid references public.projeto(id) on delete set null,
  projeto_codigo text,
  projeto_descricao text,
  responsavel_id uuid references auth.users(id) on delete set null,
  responsavel_nome text,
  prioridade text not null default 'Media',
  status text not null default 'Rascunho',
  moeda text not null default 'BRL',
  data_abertura date,
  prazo_resposta timestamptz,
  descricao text,
  condicoes_gerais text,
  condicao_pagamento_desejada text,
  validade_minima_proposta integer,
  observacoes_internas text,
  saving_estimado numeric(14, 2) not null default 0,
  fornecedor_recomendado_id uuid references public.sourcing_suppliers(id) on delete set null,
  justificativa_recomendacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.sourcing_event_items (
  id uuid primary key default gen_random_uuid(),
  sourcing_event_id uuid not null references public.sourcing_events(id) on delete cascade,
  item_numero integer not null default 1,
  descricao text not null,
  quantidade numeric(14, 3) not null default 1,
  unidade_medida text not null default 'un',
  local_entrega text,
  data_necessaria date,
  especificacao_tecnica text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sourcing_event_suppliers (
  id uuid primary key default gen_random_uuid(),
  sourcing_event_id uuid not null references public.sourcing_events(id) on delete cascade,
  supplier_id uuid not null references public.sourcing_suppliers(id) on delete cascade,
  status_convite text not null default 'Convite nao enviado',
  enviado_em timestamptz,
  visualizado_em timestamptz,
  respondeu_em timestamptz,
  pretende_participar boolean,
  motivo_recusa text,
  token_acesso text not null default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sourcing_event_id, supplier_id),
  unique (token_acesso)
);

create table if not exists public.sourcing_proposals (
  id uuid primary key default gen_random_uuid(),
  sourcing_event_id uuid not null references public.sourcing_events(id) on delete cascade,
  supplier_id uuid not null references public.sourcing_suppliers(id) on delete cascade,
  status text not null default 'Recebida',
  moeda text not null default 'BRL',
  valor_total numeric(14, 2) not null default 0,
  frete_incluso boolean not null default false,
  impostos_inclusos boolean not null default false,
  condicao_pagamento text,
  prazo_atendimento text,
  validade_proposta date,
  observacoes text,
  pontuacao_comercial numeric(5, 2),
  pontuacao_tecnica numeric(5, 2),
  score_final numeric(5, 2),
  recebida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.sourcing_proposal_items (
  id uuid primary key default gen_random_uuid(),
  sourcing_proposal_id uuid not null references public.sourcing_proposals(id) on delete cascade,
  sourcing_event_item_id uuid not null references public.sourcing_event_items(id) on delete cascade,
  preco_unitario numeric(14, 2) not null default 0,
  preco_total numeric(14, 2) not null default 0,
  prazo_atendimento text,
  observacao text,
  alternativa_tecnica text,
  status text not null default 'Recebido',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sourcing_proposal_id, sourcing_event_item_id)
);

create table if not exists public.sourcing_approvals (
  id uuid primary key default gen_random_uuid(),
  sourcing_event_id uuid not null references public.sourcing_events(id) on delete cascade,
  supplier_id uuid references public.sourcing_suppliers(id) on delete set null,
  valor_recomendado numeric(14, 2) not null default 0,
  saving_estimado numeric(14, 2) not null default 0,
  justificativa text not null default '',
  solicitante_id uuid references auth.users(id) on delete set null,
  aprovador_id uuid references auth.users(id) on delete set null,
  status text not null default 'Aguardando aprovacao',
  comentario_aprovador text,
  aprovado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sourcing_history (
  id uuid primary key default gen_random_uuid(),
  sourcing_event_id uuid references public.sourcing_events(id) on delete cascade,
  acao text not null,
  descricao text not null,
  usuario_id uuid references auth.users(id) on delete set null,
  usuario_nome text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sourcing_attachments (
  id uuid primary key default gen_random_uuid(),
  sourcing_event_id uuid references public.sourcing_events(id) on delete cascade,
  proposal_id uuid references public.sourcing_proposals(id) on delete cascade,
  supplier_id uuid references public.sourcing_suppliers(id) on delete set null,
  nome_arquivo text not null,
  url_arquivo text not null,
  tipo text not null default 'evento',
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sourcing_events_status on public.sourcing_events(status);
create index if not exists idx_sourcing_events_categoria on public.sourcing_events(categoria);
create index if not exists idx_sourcing_events_stage_id on public.sourcing_events(stage_id);
create index if not exists idx_sourcing_events_prazo on public.sourcing_events(prazo_resposta);
create index if not exists idx_sourcing_suppliers_ativo on public.sourcing_suppliers(ativo);
create index if not exists idx_sourcing_suppliers_categorias on public.sourcing_suppliers using gin(categorias);
create index if not exists idx_sourcing_event_items_event on public.sourcing_event_items(sourcing_event_id);
create index if not exists idx_sourcing_event_suppliers_event on public.sourcing_event_suppliers(sourcing_event_id);
create index if not exists idx_sourcing_event_suppliers_supplier on public.sourcing_event_suppliers(supplier_id);
create index if not exists idx_sourcing_proposals_event on public.sourcing_proposals(sourcing_event_id);
create index if not exists idx_sourcing_proposals_supplier on public.sourcing_proposals(supplier_id);
create index if not exists idx_sourcing_proposal_items_proposal on public.sourcing_proposal_items(sourcing_proposal_id);
create index if not exists idx_sourcing_approvals_event on public.sourcing_approvals(sourcing_event_id);
create index if not exists idx_sourcing_history_event on public.sourcing_history(sourcing_event_id);

create or replace function public.sourcing_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_sourcing_suppliers on public.sourcing_suppliers;
create trigger set_updated_at_sourcing_suppliers
before update on public.sourcing_suppliers
for each row execute function public.sourcing_set_updated_at();

drop trigger if exists set_updated_at_sourcing_events on public.sourcing_events;
create trigger set_updated_at_sourcing_events
before update on public.sourcing_events
for each row execute function public.sourcing_set_updated_at();

drop trigger if exists set_updated_at_sourcing_event_items on public.sourcing_event_items;
create trigger set_updated_at_sourcing_event_items
before update on public.sourcing_event_items
for each row execute function public.sourcing_set_updated_at();

drop trigger if exists set_updated_at_sourcing_event_suppliers on public.sourcing_event_suppliers;
create trigger set_updated_at_sourcing_event_suppliers
before update on public.sourcing_event_suppliers
for each row execute function public.sourcing_set_updated_at();

drop trigger if exists set_updated_at_sourcing_proposals on public.sourcing_proposals;
create trigger set_updated_at_sourcing_proposals
before update on public.sourcing_proposals
for each row execute function public.sourcing_set_updated_at();

drop trigger if exists set_updated_at_sourcing_proposal_items on public.sourcing_proposal_items;
create trigger set_updated_at_sourcing_proposal_items
before update on public.sourcing_proposal_items
for each row execute function public.sourcing_set_updated_at();

drop trigger if exists set_updated_at_sourcing_approvals on public.sourcing_approvals;
create trigger set_updated_at_sourcing_approvals
before update on public.sourcing_approvals
for each row execute function public.sourcing_set_updated_at();

alter table public.sourcing_suppliers enable row level security;
alter table public.sourcing_events enable row level security;
alter table public.sourcing_event_items enable row level security;
alter table public.sourcing_event_suppliers enable row level security;
alter table public.sourcing_proposals enable row level security;
alter table public.sourcing_proposal_items enable row level security;
alter table public.sourcing_approvals enable row level security;
alter table public.sourcing_history enable row level security;
alter table public.sourcing_attachments enable row level security;

grant select, insert, update, delete on table
  public.sourcing_suppliers,
  public.sourcing_events,
  public.sourcing_event_items,
  public.sourcing_event_suppliers,
  public.sourcing_proposals,
  public.sourcing_proposal_items,
  public.sourcing_approvals,
  public.sourcing_history,
  public.sourcing_attachments
to authenticated;

grant select, insert, update, delete on table
  public.sourcing_suppliers,
  public.sourcing_events,
  public.sourcing_event_items,
  public.sourcing_event_suppliers,
  public.sourcing_proposals,
  public.sourcing_proposal_items,
  public.sourcing_approvals,
  public.sourcing_history,
  public.sourcing_attachments
to service_role;

drop policy if exists "sourcing_suppliers_authenticated_read" on public.sourcing_suppliers;
create policy "sourcing_suppliers_authenticated_read"
on public.sourcing_suppliers for select to authenticated using (true);

drop policy if exists "sourcing_suppliers_authenticated_write" on public.sourcing_suppliers;
create policy "sourcing_suppliers_authenticated_write"
on public.sourcing_suppliers for all to authenticated using (true) with check (true);

drop policy if exists "sourcing_events_authenticated_read" on public.sourcing_events;
create policy "sourcing_events_authenticated_read"
on public.sourcing_events for select to authenticated using (true);

drop policy if exists "sourcing_events_authenticated_write" on public.sourcing_events;
create policy "sourcing_events_authenticated_write"
on public.sourcing_events for all to authenticated using (true) with check (true);

drop policy if exists "sourcing_event_items_authenticated_read" on public.sourcing_event_items;
create policy "sourcing_event_items_authenticated_read"
on public.sourcing_event_items for select to authenticated using (true);

drop policy if exists "sourcing_event_items_authenticated_write" on public.sourcing_event_items;
create policy "sourcing_event_items_authenticated_write"
on public.sourcing_event_items for all to authenticated using (true) with check (true);

drop policy if exists "sourcing_event_suppliers_authenticated_read" on public.sourcing_event_suppliers;
create policy "sourcing_event_suppliers_authenticated_read"
on public.sourcing_event_suppliers for select to authenticated using (true);

drop policy if exists "sourcing_event_suppliers_authenticated_write" on public.sourcing_event_suppliers;
create policy "sourcing_event_suppliers_authenticated_write"
on public.sourcing_event_suppliers for all to authenticated using (true) with check (true);

drop policy if exists "sourcing_proposals_authenticated_read" on public.sourcing_proposals;
create policy "sourcing_proposals_authenticated_read"
on public.sourcing_proposals for select to authenticated using (true);

drop policy if exists "sourcing_proposals_authenticated_write" on public.sourcing_proposals;
create policy "sourcing_proposals_authenticated_write"
on public.sourcing_proposals for all to authenticated using (true) with check (true);

drop policy if exists "sourcing_proposal_items_authenticated_read" on public.sourcing_proposal_items;
create policy "sourcing_proposal_items_authenticated_read"
on public.sourcing_proposal_items for select to authenticated using (true);

drop policy if exists "sourcing_proposal_items_authenticated_write" on public.sourcing_proposal_items;
create policy "sourcing_proposal_items_authenticated_write"
on public.sourcing_proposal_items for all to authenticated using (true) with check (true);

drop policy if exists "sourcing_approvals_authenticated_read" on public.sourcing_approvals;
create policy "sourcing_approvals_authenticated_read"
on public.sourcing_approvals for select to authenticated using (true);

drop policy if exists "sourcing_approvals_authenticated_write" on public.sourcing_approvals;
create policy "sourcing_approvals_authenticated_write"
on public.sourcing_approvals for all to authenticated using (true) with check (true);

drop policy if exists "sourcing_history_authenticated_read" on public.sourcing_history;
create policy "sourcing_history_authenticated_read"
on public.sourcing_history for select to authenticated using (true);

drop policy if exists "sourcing_history_authenticated_write" on public.sourcing_history;
create policy "sourcing_history_authenticated_write"
on public.sourcing_history for insert to authenticated with check (true);

drop policy if exists "sourcing_attachments_authenticated_read" on public.sourcing_attachments;
create policy "sourcing_attachments_authenticated_read"
on public.sourcing_attachments for select to authenticated using (true);

drop policy if exists "sourcing_attachments_authenticated_write" on public.sourcing_attachments;
create policy "sourcing_attachments_authenticated_write"
on public.sourcing_attachments for all to authenticated using (true) with check (true);

comment on table public.sourcing_events is 'Eventos de sourcing/RFP do modulo Sourcing Logistica e Compras';
comment on table public.sourcing_suppliers is 'Fornecedores usados em eventos de sourcing';
comment on table public.sourcing_history is 'Historico/auditoria das principais acoes do evento de sourcing';
