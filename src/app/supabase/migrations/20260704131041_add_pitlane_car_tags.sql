create table if not exists public.pitlane_car_tags (
  id text primary key default gen_random_uuid()::text,
  epc text not null,
  piloto_id text,
  piloto text not null,
  carro_id text,
  carro text,
  numero_carro text not null,
  etapa_id text,
  sessao_id text,
  ativo boolean not null default true,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_pitlane_car_tags_active_epc
on public.pitlane_car_tags(epc)
where ativo;

create index if not exists idx_pitlane_car_tags_piloto on public.pitlane_car_tags(piloto);
create index if not exists idx_pitlane_car_tags_numero on public.pitlane_car_tags(numero_carro);
create index if not exists idx_pitlane_car_tags_etapa_sessao on public.pitlane_car_tags(etapa_id, sessao_id);

alter table public.rfid_read_session_tags
  add column if not exists barcode text,
  add column if not exists cai text,
  add column if not exists car_tag_id text,
  add column if not exists tag_tipo text not null default 'pneu'
    check (tag_tipo in ('pneu', 'carro', 'desconhecida'));

alter table public.pitlane_passages
  add column if not exists car_tag_id text,
  add column if not exists car_tag_epc text,
  add column if not exists piloto text,
  add column if not exists carro text,
  add column if not exists expected_piloto text,
  add column if not exists expected_numero_carro text;

alter table public.pitlane_passage_tires
  add column if not exists barcode text,
  add column if not exists cai text,
  add column if not exists modelo text,
  add column if not exists piloto_pneu text,
  add column if not exists numero_carro_pneu text;

drop trigger if exists set_updated_at_pitlane_car_tags on public.pitlane_car_tags;
create trigger set_updated_at_pitlane_car_tags
before update on public.pitlane_car_tags
for each row execute function public.rfid_pitlane_set_updated_at();

alter table public.pitlane_car_tags enable row level security;

drop policy if exists "Authenticated users can read pitlane car tags" on public.pitlane_car_tags;
create policy "Authenticated users can read pitlane car tags"
on public.pitlane_car_tags for select to authenticated using (true);

drop policy if exists "Authenticated users can manage pitlane car tags" on public.pitlane_car_tags;
create policy "Authenticated users can manage pitlane car tags"
on public.pitlane_car_tags for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.pitlane_car_tags to authenticated;
