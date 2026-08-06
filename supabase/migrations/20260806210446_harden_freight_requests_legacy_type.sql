-- Hardening para bases que ainda possuem a coluna legada freight_requests.type.
-- O modulo atual grava freight_type, mas a tabela de producao herdou type como
-- NOT NULL do prototipo anterior. Mantemos as duas colunas sincronizadas no app
-- e deixamos um default defensivo no banco.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'freight_requests'
      and column_name = 'type'
  ) then
    update public.freight_requests
    set type = coalesce(nullif(type, ''), freight_type, 'nacional')
    where type is null
       or type = '';

    alter table public.freight_requests
      alter column type set default 'nacional';
  end if;
end $$;
