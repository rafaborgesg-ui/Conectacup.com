-- ConectaCup - Sourcing supplier portal and e-mail delivery support.
-- Additive migration: keeps the internal sourcing MVP intact and enables
-- public token-based proposal submission through server-side API endpoints.

alter table public.sourcing_event_suppliers
  add column if not exists ultimo_email_status text,
  add column if not exists ultimo_email_erro text;

alter table public.sourcing_proposals
  add column if not exists valor_minimo_pedido numeric(14, 2),
  add column if not exists respondido_por_nome text,
  add column if not exists respondido_por_email text,
  add column if not exists origem text not null default 'interno';

alter table public.sourcing_proposal_items
  add column if not exists capacidade numeric(14, 3),
  add column if not exists moeda text;

create table if not exists public.sourcing_email_logs (
  id uuid primary key default gen_random_uuid(),
  sourcing_event_id uuid references public.sourcing_events(id) on delete cascade,
  event_supplier_id uuid references public.sourcing_event_suppliers(id) on delete set null,
  supplier_id uuid references public.sourcing_suppliers(id) on delete set null,
  destinatario text not null,
  assunto text not null,
  status text not null default 'pendente',
  provider text not null default 'resend',
  provider_id text,
  erro text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sourcing_email_logs_event on public.sourcing_email_logs(sourcing_event_id);
create index if not exists idx_sourcing_email_logs_event_supplier on public.sourcing_email_logs(event_supplier_id);
create index if not exists idx_sourcing_email_logs_created_at on public.sourcing_email_logs(created_at);

alter table public.sourcing_email_logs enable row level security;

grant select, insert, update, delete on table public.sourcing_email_logs to authenticated;
grant select, insert, update, delete on table public.sourcing_email_logs to service_role;

drop policy if exists "sourcing_email_logs_authenticated_read" on public.sourcing_email_logs;
create policy "sourcing_email_logs_authenticated_read"
on public.sourcing_email_logs for select to authenticated using (true);

drop policy if exists "sourcing_email_logs_authenticated_write" on public.sourcing_email_logs;
create policy "sourcing_email_logs_authenticated_write"
on public.sourcing_email_logs for all to authenticated using (true) with check (true);

comment on table public.sourcing_email_logs is 'Auditoria de convites enviados por e-mail para eventos de sourcing';
