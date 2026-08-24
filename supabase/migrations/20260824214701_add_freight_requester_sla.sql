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
  '1 dia',
  'SLA do solicitante de fretes nacionais',
  '{"dias": 1, "horas": 24, "tipo": "solicitante_frete_nacional"}'::jsonb,
  2,
  true
)
on conflict (category, value) do update
set
  label = excluded.label,
  metadata = coalesce(public.freight_master_options.metadata, '{}'::jsonb) || excluded.metadata,
  sort_order = excluded.sort_order,
  active = true,
  updated_at = now();
