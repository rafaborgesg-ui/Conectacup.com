-- Corrige protocolos de frete gerados fora da sequência operacional
-- e adiciona a categoria de e-mail da operação de frete na Masterdata.

do $$
declare
  base_protocol bigint;
begin
  select coalesce(max(protocol), 0)
    into base_protocol
  from public.freight_requests
  where protocol is not null
    and protocol < 100000;

  with inflated as (
    select
      id,
      base_protocol + row_number() over (order by created_at, protocol, id) as new_protocol
    from public.freight_requests
    where protocol >= 100000
  )
  update public.freight_requests request
     set protocol = inflated.new_protocol
    from inflated
   where request.id = inflated.id;
end $$;

insert into public.freight_master_options (category, label, value, metadata, sort_order, active)
values (
  'email_operacao_frete',
  'logistica@porschegt3cup.com.br',
  'logistica@porschegt3cup.com.br',
  '{"funcao":"Receber solicitações cadastradas"}'::jsonb,
  0,
  true
)
on conflict (category, value) do update
set label = excluded.label,
    metadata = excluded.metadata,
    active = true,
    updated_at = now();
