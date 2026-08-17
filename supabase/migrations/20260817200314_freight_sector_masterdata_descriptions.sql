with sector_data(code, description, sort_order) as (
  values
    ('ADE', 'ADESIVAGEM', 10),
    ('ADM', 'ADMINISTRATIVO', 20),
    ('ALM', 'ALMOXARIFADO', 30),
    ('ALN', 'ALINHAMENTO', 40),
    ('CLA', 'CLASSICOS', 50),
    ('CT1', 'CATEGORIA 1 - CARRERA', 60),
    ('CT2', 'CATEGORIA 2 - CHALLENGE', 70),
    ('CT3', 'CATEGORIA 3 - TROPHY', 80),
    ('DEM', 'DIRETORIA EVENTOS & MARKETING', 90),
    ('DOP', 'DIRETORIA DE OPERAÇÕES', 100),
    ('DPR', 'DIRETORIA PLANEJAMENTO E RELACIONAMENTO', 110),
    ('ENG', 'ENGENHARIA OFICINA', 120),
    ('ENQ', 'ENGENHARIA QUALIDADE', 130),
    ('EST', 'ESTOQUE', 140),
    ('EVT', 'EVENTOS', 150),
    ('FIN', 'FINANCEIRO', 160),
    ('FUN', 'FUNILARIA', 170),
    ('LOG', 'LOGISTICA', 180),
    ('MKT', 'MARKETING', 190),
    ('OFC', 'OFICINA', 200),
    ('PEC', 'PECAS', 210),
    ('PER', 'PLANEJAMENTO E RELACIONAMENTO', 220),
    ('PNR', 'PNEU/RODA', 230),
    ('PRE', 'PRESIDENCIA', 240),
    ('PWT', 'POWERTRAIN', 250),
    ('RED', 'RECUPERAÇÃO E DESENVOLVIMENTO', 260),
    ('REV', 'REVISAO', 270),
    ('RHU', 'RECURSOS HUMANOS', 280)
)
insert into public.freight_master_options (category, value, label, metadata, sort_order, active)
select
  'setor_frete',
  code,
  code || ' - ' || description,
  jsonb_build_object('descricao', description, 'source_system', 'conectacup_freight_masterdata'),
  sort_order,
  true
from sector_data
on conflict (category, value) do update
set label = excluded.label,
    metadata = excluded.metadata,
    sort_order = excluded.sort_order,
    active = true,
    updated_at = now();

with sector_data(code, description) as (
  values
    ('ADE', 'ADESIVAGEM'),
    ('ADM', 'ADMINISTRATIVO'),
    ('ALM', 'ALMOXARIFADO'),
    ('ALN', 'ALINHAMENTO'),
    ('CLA', 'CLASSICOS'),
    ('CT1', 'CATEGORIA 1 - CARRERA'),
    ('CT2', 'CATEGORIA 2 - CHALLENGE'),
    ('CT3', 'CATEGORIA 3 - TROPHY'),
    ('DEM', 'DIRETORIA EVENTOS & MARKETING'),
    ('DOP', 'DIRETORIA DE OPERAÇÕES'),
    ('DPR', 'DIRETORIA PLANEJAMENTO E RELACIONAMENTO'),
    ('ENG', 'ENGENHARIA OFICINA'),
    ('ENQ', 'ENGENHARIA QUALIDADE'),
    ('EST', 'ESTOQUE'),
    ('EVT', 'EVENTOS'),
    ('FIN', 'FINANCEIRO'),
    ('FUN', 'FUNILARIA'),
    ('LOG', 'LOGISTICA'),
    ('MKT', 'MARKETING'),
    ('OFC', 'OFICINA'),
    ('PEC', 'PECAS'),
    ('PER', 'PLANEJAMENTO E RELACIONAMENTO'),
    ('PNR', 'PNEU/RODA'),
    ('PRE', 'PRESIDENCIA'),
    ('PWT', 'POWERTRAIN'),
    ('RED', 'RECUPERAÇÃO E DESENVOLVIMENTO'),
    ('REV', 'REVISAO'),
    ('RHU', 'RECURSOS HUMANOS')
)
update public.setor target
set descricao = sector_data.description
from sector_data
where upper(trim(target.setor)) = sector_data.code;
