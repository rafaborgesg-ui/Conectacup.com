create extension if not exists pgcrypto;

create table if not exists public.rfid_readers (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  modelo text,
  serial text,
  ip inet,
  local text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rfid_antennas (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid references public.rfid_readers(id) on delete cascade,
  porta integer,
  nome text not null,
  posicao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rfid_pitlane_gates (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  etapa_id text,
  local text,
  reader_id text,
  tempo_janela_ms integer not null default 3000 check (tempo_janela_ms between 500 and 15000),
  sessao_id text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rfid_raw_events (
  id uuid primary key default gen_random_uuid(),
  reader_id text not null,
  antenna_id text,
  epc text not null,
  rssi integer,
  seen_count integer not null default 1,
  timestamp timestamptz not null,
  payload_original jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.rfid_read_sessions (
  id uuid primary key default gen_random_uuid(),
  gate_id text,
  etapa_id text,
  sessao_id text,
  started_at timestamptz not null,
  ended_at timestamptz,
  status text not null check (status in ('Validado', 'Incompleto', 'Conflito', 'Tag desconhecida', 'Pendente validação', 'Erro de leitura')),
  confidence_score numeric(8,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rfid_read_session_tags (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.rfid_read_sessions(id) on delete cascade,
  epc text not null,
  pneu_id text,
  antenna_id text,
  rssi_max integer,
  read_count integer not null default 1,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  confidence_score numeric(8,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pitlane_passages (
  id uuid primary key default gen_random_uuid(),
  read_session_id uuid references public.rfid_read_sessions(id) on delete set null,
  etapa_id text,
  sessao_id text,
  piloto_id text,
  carro_id text,
  numero_carro text,
  status text not null check (status in ('Validado', 'Incompleto', 'Conflito', 'Tag desconhecida', 'Pendente validação', 'Erro de leitura')),
  leitura_percentual integer not null default 0 check (leitura_percentual between 0 and 100),
  comentario text,
  validado_por text,
  validado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pitlane_passage_tires (
  id uuid primary key default gen_random_uuid(),
  passage_id uuid references public.pitlane_passages(id) on delete cascade,
  pneu_id text,
  epc text not null,
  posicao_sugerida text,
  status_validacao text not null default 'pendente' check (status_validacao in ('ok', 'desconhecido', 'conflito', 'pendente')),
  created_at timestamptz not null default now()
);

create table if not exists public.pitlane_validation_audit (
  id uuid primary key default gen_random_uuid(),
  passage_id uuid references public.pitlane_passages(id) on delete cascade,
  usuario text,
  valor_anterior jsonb not null default '{}'::jsonb,
  valor_novo jsonb not null default '{}'::jsonb,
  comentario text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rfid_raw_events_timestamp on public.rfid_raw_events(timestamp desc);
create index if not exists idx_rfid_raw_events_epc on public.rfid_raw_events(epc);
create index if not exists idx_rfid_sessions_status on public.rfid_read_sessions(status);
create index if not exists idx_rfid_session_tags_session on public.rfid_read_session_tags(session_id);
create index if not exists idx_pitlane_passages_created_at on public.pitlane_passages(created_at desc);
create index if not exists idx_pitlane_passages_status on public.pitlane_passages(status);
create index if not exists idx_pitlane_passage_tires_passage on public.pitlane_passage_tires(passage_id);

create or replace function public.rfid_pitlane_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_rfid_readers on public.rfid_readers;
create trigger set_updated_at_rfid_readers
before update on public.rfid_readers
for each row execute function public.rfid_pitlane_set_updated_at();

drop trigger if exists set_updated_at_rfid_antennas on public.rfid_antennas;
create trigger set_updated_at_rfid_antennas
before update on public.rfid_antennas
for each row execute function public.rfid_pitlane_set_updated_at();

drop trigger if exists set_updated_at_rfid_pitlane_gates on public.rfid_pitlane_gates;
create trigger set_updated_at_rfid_pitlane_gates
before update on public.rfid_pitlane_gates
for each row execute function public.rfid_pitlane_set_updated_at();

drop trigger if exists set_updated_at_rfid_read_sessions on public.rfid_read_sessions;
create trigger set_updated_at_rfid_read_sessions
before update on public.rfid_read_sessions
for each row execute function public.rfid_pitlane_set_updated_at();

drop trigger if exists set_updated_at_pitlane_passages on public.pitlane_passages;
create trigger set_updated_at_pitlane_passages
before update on public.pitlane_passages
for each row execute function public.rfid_pitlane_set_updated_at();

alter table public.rfid_readers enable row level security;
alter table public.rfid_antennas enable row level security;
alter table public.rfid_pitlane_gates enable row level security;
alter table public.rfid_raw_events enable row level security;
alter table public.rfid_read_sessions enable row level security;
alter table public.rfid_read_session_tags enable row level security;
alter table public.pitlane_passages enable row level security;
alter table public.pitlane_passage_tires enable row level security;
alter table public.pitlane_validation_audit enable row level security;

create policy "Authenticated users can read rfid readers"
on public.rfid_readers for select to authenticated using (true);
create policy "Authenticated users can manage rfid readers"
on public.rfid_readers for all to authenticated using (true) with check (true);

create policy "Authenticated users can read rfid antennas"
on public.rfid_antennas for select to authenticated using (true);
create policy "Authenticated users can manage rfid antennas"
on public.rfid_antennas for all to authenticated using (true) with check (true);

create policy "Authenticated users can read rfid pitlane gates"
on public.rfid_pitlane_gates for select to authenticated using (true);
create policy "Authenticated users can manage rfid pitlane gates"
on public.rfid_pitlane_gates for all to authenticated using (true) with check (true);

create policy "Authenticated users can read rfid raw events"
on public.rfid_raw_events for select to authenticated using (true);
create policy "Authenticated users can insert rfid raw events"
on public.rfid_raw_events for insert to authenticated with check (true);

create policy "Authenticated users can read rfid read sessions"
on public.rfid_read_sessions for select to authenticated using (true);
create policy "Authenticated users can manage rfid read sessions"
on public.rfid_read_sessions for all to authenticated using (true) with check (true);

create policy "Authenticated users can read rfid read session tags"
on public.rfid_read_session_tags for select to authenticated using (true);
create policy "Authenticated users can manage rfid read session tags"
on public.rfid_read_session_tags for all to authenticated using (true) with check (true);

create policy "Authenticated users can read pitlane passages"
on public.pitlane_passages for select to authenticated using (true);
create policy "Authenticated users can manage pitlane passages"
on public.pitlane_passages for all to authenticated using (true) with check (true);

create policy "Authenticated users can read pitlane passage tires"
on public.pitlane_passage_tires for select to authenticated using (true);
create policy "Authenticated users can manage pitlane passage tires"
on public.pitlane_passage_tires for all to authenticated using (true) with check (true);

create policy "Authenticated users can read pitlane validation audit"
on public.pitlane_validation_audit for select to authenticated using (true);
create policy "Authenticated users can insert pitlane validation audit"
on public.pitlane_validation_audit for insert to authenticated with check (true);

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.rfid_readers,
  public.rfid_antennas,
  public.rfid_pitlane_gates,
  public.rfid_raw_events,
  public.rfid_read_sessions,
  public.rfid_read_session_tags,
  public.pitlane_passages,
  public.pitlane_passage_tires,
  public.pitlane_validation_audit
to authenticated;
