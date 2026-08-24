alter table public.freight_requests
  add column if not exists atendimento_at timestamptz;

create index if not exists idx_freight_requests_atendimento_at
on public.freight_requests(atendimento_at);

comment on column public.freight_requests.atendimento_at is
  'Data e hora em que a logística realizou o atendimento/agendamento da solicitação de frete';

insert into public.freight_master_options (
  category,
  label,
  value,
  metadata,
  sort_order,
  active
)
values (
  'sla',
  'Agendamento da solicitação',
  '1 dia',
  '{"dias": 1}'::jsonb,
  1,
  true
)
on conflict (category, value) do update
set
  label = excluded.label,
  metadata = coalesce(public.freight_master_options.metadata, '{}'::jsonb) || excluded.metadata,
  active = true,
  updated_at = now();
