-- ============================================
-- MIGRATION: Tabelas do Protheus
-- Data: 2025-11-27
-- Descrição: Cria tabelas separadas para Setor, Projeto e Conta Contábil
-- ============================================
-- 
-- ✅ Este SQL cria 3 tabelas organizadas:
-- 1. setor - Setores da empresa (28 registros)
-- 2. projeto - Projetos/Temporadas (18 registros)
-- 3. conta_contabil - Plano de contas (147 registros)
-- 
-- Total: 193 registros do sistema Protheus
-- ============================================

-- ============================================
-- TABELA 1: SETOR
-- ============================================

CREATE TABLE IF NOT EXISTS public.setor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_setor_code ON public.setor(code);

-- RLS (Row Level Security)
ALTER TABLE public.setor ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.setor;
DROP POLICY IF EXISTS "Permitir escrita para usuários autenticados" ON public.setor;

-- Criar policies de acesso
CREATE POLICY "Permitir leitura para usuários autenticados"
ON public.setor FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir escrita para usuários autenticados"
ON public.setor FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- TABELA 2: PROJETO
-- ============================================

CREATE TABLE IF NOT EXISTS public.projeto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  temporada INTEGER NOT NULL,
  categoria TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_projeto_code ON public.projeto(code);
CREATE INDEX IF NOT EXISTS idx_projeto_temporada ON public.projeto(temporada);

-- RLS (Row Level Security)
ALTER TABLE public.projeto ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.projeto;
DROP POLICY IF EXISTS "Permitir escrita para usuários autenticados" ON public.projeto;

-- Criar policies de acesso
CREATE POLICY "Permitir leitura para usuários autenticados"
ON public.projeto FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir escrita para usuários autenticados"
ON public.projeto FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- TABELA 3: CONTA CONTÁBIL
-- ============================================

CREATE TABLE IF NOT EXISTS public.conta_contabil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tipo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conta_contabil_code ON public.conta_contabil(code);

-- RLS (Row Level Security)
ALTER TABLE public.conta_contabil ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.conta_contabil;
DROP POLICY IF EXISTS "Permitir escrita para usuários autenticados" ON public.conta_contabil;

-- Criar policies de acesso
CREATE POLICY "Permitir leitura para usuários autenticados"
ON public.conta_contabil FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir escrita para usuários autenticados"
ON public.conta_contabil FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- INSERIR DADOS: SETORES (28 registros)
-- ============================================

INSERT INTO public.setor (code, name, responsavel) VALUES
('ADE', 'ADESIVAGEM', 'VINÍCIUS QUADROS'),
('ADM', 'ADMINISTRATIVO', 'CARLOS'),
('ALM', 'ALMOXARIFADO', 'RAFAEL BORGES'),
('ATP', 'ATENDIMENTO PISTA', 'GESSE ALVES'),
('BOX', 'BOXISTA', ''),
('CAR', 'CARRERAS', 'LUIS BALDINI'),
('CHA', 'CHALLENGE', 'LUIS BALDINI'),
('COM', 'COMERCIAL', 'CARLOS'),
('COR', 'CORRETIVA', 'LUIS BALDINI'),
('CUS', 'CUSTOMIZAÇÃO', 'LUIS BALDINI'),
('DES', 'DESENVOLVIMENTO', 'LUIS BALDINI'),
('ENT', 'ENTREGA TECNICA', ''),
('GEN', 'GERAL', ''),
('LOG', 'LOGISTICA', 'GESSE ALVES'),
('MAN', 'MANUTENCAO', ''),
('MKT', 'MARKETING', 'CARLOS'),
('MOT', 'MOTORES', 'LUIS BALDINI'),
('OFI', 'OFICINA', 'LUIS BALDINI'),
('ORG', 'ORGANIZACAO', ''),
('PEC', 'PEÇAS', 'EMERSON TADEU'),
('PIS', 'PISTA', 'GESSE ALVES'),
('PNC', 'PINTURA CHASSIS', ''),
('PNE', 'PINTURA EXTERNA', ''),
('PRE', 'PRESIDENCIA', 'CARLOS'),
('PWT', 'POWERTRAIN', 'LUIS BALDINI'),
('RED', 'RECUPERAÇÃO E DESENVOLVIMENTO', 'LUIS BALDINI'),
('REV', 'REVISAO', ''),
('RHU', 'RECURSOS HUMANOS', 'AMANDA')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  responsavel = EXCLUDED.responsavel,
  updated_at = now();

-- ============================================
-- INSERIR DADOS: PROJETOS (18 registros)
-- ============================================

INSERT INTO public.projeto (code, name, temporada, categoria) VALUES
('25ET1', 'Etapa 1', 2025, 'Carrera Cup'),
('25ET2', 'Etapa 2', 2025, 'Carrera Cup'),
('25ET3', 'Etapa 3', 2025, 'Carrera Cup'),
('25ET4', 'Etapa 4', 2025, 'Carrera Cup'),
('25ET5', 'Etapa 5', 2025, 'Carrera Cup'),
('25ET6', 'Etapa 6', 2025, 'Carrera Cup'),
('25ET7', 'Etapa 7', 2025, 'Carrera Cup'),
('25ET8', 'Etapa 8', 2025, 'Carrera Cup'),
('25CHAL1', 'Challenge Etapa 1', 2025, 'Challenge'),
('25CHAL2', 'Challenge Etapa 2', 2025, 'Challenge'),
('25CHAL3', 'Challenge Etapa 3', 2025, 'Challenge'),
('25CHAL4', 'Challenge Etapa 4', 2025, 'Challenge'),
('25CHAL5', 'Challenge Etapa 5', 2025, 'Challenge'),
('25CHAL6', 'Challenge Etapa 6', 2025, 'Challenge'),
('25TROPHY1', 'Trophy Etapa 1', 2025, 'Trophy'),
('25TROPHY2', 'Trophy Etapa 2', 2025, 'Trophy'),
('25TROPHY3', 'Trophy Etapa 3', 2025, 'Trophy'),
('25TROPHY4', 'Trophy Etapa 4', 2025, 'Trophy')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  temporada = EXCLUDED.temporada,
  categoria = EXCLUDED.categoria,
  updated_at = now();

-- ============================================
-- INSERIR DADOS: CONTAS CONTÁBEIS (147 registros)
-- ============================================

INSERT INTO public.conta_contabil (code, name, tipo) VALUES
('311010001', 'RECEITA REVENDA DE MERCADORIAS', 'Receita'),
('311010002', 'RECEITA REVENDA DE SERVICOS PROTHEUS', 'Receita'),
('311010003', 'RECEITA DE PRESTACAO DE SERVICOS', 'Receita'),
('311010004', 'RECEITAS DE LOCACAO', 'Receita'),
('311010005', 'RECEITAS DE EVENTOS', 'Receita'),
('311010006', 'RECEITAS OUTRAS', 'Receita'),
('311010009', 'RECEITA DE PREPARACAO', 'Receita'),
('311010010', 'RECEITA COM PEÇAS', 'Receita'),
('311010014', 'RECEITA COM INGRESSOS', 'Receita'),
('311010015', 'RECEITA COM CORTESIA E CONVITES', 'Receita'),
('311010016', 'RECEITA TAXA DE INSCRICAO E RENOVACAO DE PILOTOS', 'Receita'),
('311010999', 'RECEITA DE ATIVIDADES', 'Receita'),
('319010001', 'DESCONTOS CONCEDIDOS INCONDICIONAIS', 'Deduções'),
('319010002', 'CANCELAMENTOS', 'Deduções'),
('319010003', 'DEVOLUCOES', 'Deduções'),
('319010004', 'DESCONTOS FINANCEIROS CONCEDIDOS', 'Deduções'),
('321010001', 'CUSTO DAS MERCADORIAS VENDIDAS', 'CMV'),
('321010002', 'CUSTO DOS SERVICOS PRESTADOS', 'CMV'),
('321010007', 'DEVOLUCOES DE COMPRAS', 'CMV'),
('322010001', 'SALARIOS', 'Custo Pessoal'),
('322010002', 'PRO-LABORE', 'Custo Pessoal'),
('322010003', '13º SALARIO', 'Custo Pessoal'),
('322010004', 'FERIAS', 'Custo Pessoal'),
('322010005', 'HORAS EXTRAS', 'Custo Pessoal'),
('322010006', 'INSS', 'Custo Pessoal'),
('322010007', 'FGTS', 'Custo Pessoal'),
('322010008', 'PIS SOBRE FOLHA PAGTO', 'Custo Pessoal'),
('322010009', 'AVISO PREVIO INDENIZADO', 'Custo Pessoal'),
('322010010', 'INDENIZAÇÕES TRABALHISTAS', 'Custo Pessoal'),
('322010011', 'ASSISTENCIA MEDICA', 'Custo Pessoal'),
('322010012', 'VT', 'Custo Pessoal'),
('322010013', 'VR', 'Custo Pessoal'),
('322010014', 'SEGURO DE VIDA', 'Custo Pessoal'),
('322010015', 'TREINAMENTOS', 'Custo Pessoal'),
('322010016', 'UNIFORMES', 'Custo Pessoal'),
('322010017', 'PROVISAO FERIAS', 'Custo Pessoal'),
('322010018', 'PROVISÃO 13º SALARIO', 'Custo Pessoal'),
('322019999', 'OUTROS GASTOS COM PESSOAL', 'Custo Pessoal'),
('322030002', 'COMBUSTIVEL', 'Custo Operacional'),
('322030003', 'ALUGUEL VEICULOS', 'Custo Operacional'),
('322030005', 'IPVA', 'Custo Operacional'),
('322030006', 'SEGURO VEICULOS', 'Custo Operacional'),
('322030007', 'LICENCIAMENTO', 'Custo Operacional'),
('322030008', 'ALUGUEL DE MAQUINAS E EQUIPAMENTOS', 'Custo Operacional'),
('322039999', 'OUTROS GASTOS COM FROTA', 'Custo Operacional'),
('322040001', 'HONORARIOS CONTABEIS', 'Custo Serviços'),
('322040002', 'PRESTACAO DE SERVICOS PJ', 'Custo Serviços'),
('322040003', 'SERVICOS DE TERCEIROS - PESSOA FISICA', 'Custo Serviços'),
('322040005', 'DESPESAS MEDICAS', 'Custo Serviços'),
('322040010', 'MATERIAL E SERVICOS DE LIMPEZA', 'Custo Serviços'),
('322040011', 'SEGURANCA E VIGILANCIA', 'Custo Serviços'),
('322049999', 'OUTROS SERVICOS TECNICOS', 'Custo Serviços'),
('322050001', 'FRETES E CARRETOS', 'Custo Transporte'),
('322050003', 'ESTACIONAMENTO', 'Custo Transporte'),
('322050007', 'PASSAGENS AEREAS', 'Custo Transporte'),
('322050009', 'HOSPEDAGENS', 'Custo Transporte'),
('322050010', 'ALIMENTACAO', 'Custo Transporte'),
('322050011', 'REFEICOES', 'Custo Transporte'),
('322050012', 'VIAGENS E ESTADIAS NACIONAIS', 'Custo Transporte'),
('322050014', 'OUTROS SERVICOS DE TRANSPORTE', 'Custo Transporte'),
('322050015', 'TAXI', 'Custo Transporte'),
('322059999', 'OUTROS GASTOS COM VIAGENS', 'Custo Transporte'),
('322070001', 'LOCACAO DE IMOVEIS', 'Custo Infraestrutura'),
('322070002', 'CONDOMINIO', 'Custo Infraestrutura'),
('322070003', 'IPTU', 'Custo Infraestrutura'),
('322070004', 'AGUA/SABESP', 'Custo Infraestrutura'),
('322070005', 'TELEFONIA', 'Custo Infraestrutura'),
('322070006', 'ENERGIA ELETRICA', 'Custo Infraestrutura'),
('322070007', 'INTERNET', 'Custo Infraestrutura'),
('322079999', 'OUTROS GASTOS DE INFRAESTRUTURA', 'Custo Infraestrutura'),
('322080001', 'MANUT. MAQ. E EQUIP.', 'Custo Manutenção'),
('322080002', 'MANUTENCAO FROTA', 'Custo Manutenção'),
('322080003', 'BENS MOVEIS', 'Custo Manutenção'),
('322080004', 'REFORMAS E REPAROS', 'Custo Manutenção'),
('322089999', 'OUTROS GASTOS COM MANUTENCAO', 'Custo Manutenção'),
('322090001', 'MAT.DE ESCRITORIO E PAPELARIA', 'Custo Material'),
('322090002', 'MATERIAL DE LIMPEZA E HIGIENE', 'Custo Material'),
('322090003', 'BRINDES E PRESENTES', 'Custo Material'),
('322099999', 'OUTROS MATERIAIS', 'Custo Material'),
('323010001', 'RECEITAS DE EVENTOS', 'Receita Evento'),
('323010002', 'RECEITA DE TRANSMISSAO', 'Receita Evento'),
('323010003', 'RECEITAS DE DIREITOS E IMAGENS', 'Receita Evento'),
('323010004', 'RECEITA DE PATROCINIO', 'Receita Evento'),
('323010099', 'OUTRAS RECEITAS DE EVENTOS', 'Receita Evento'),
('324020001', 'LOCACAO DE ESPACO', 'Despesa Evento'),
('324020002', 'LOCACAO DE ESTRUTURA', 'Despesa Evento'),
('324020003', 'DECORACAO E AMBIENTACAO', 'Despesa Evento'),
('324020004', 'LOCACAO DE EQUIPAMENTOS', 'Despesa Evento'),
('324029999', 'OUTRAS DESPESAS', 'Despesa Evento'),
('381010001', 'SALARIOS - SEDE', 'Despesa Administrativa'),
('381010003', '13º SALARIO - SEDE', 'Despesa Administrativa'),
('381010004', 'FERIAS - SEDE', 'Despesa Administrativa'),
('381010006', 'INSS - SEDE', 'Despesa Administrativa'),
('381010007', 'FGTS - SEDE', 'Despesa Administrativa'),
('381010008', 'PIS SOBRE FOLHA PAGTO - SEDE', 'Despesa Administrativa'),
('381010009', 'AVISO PREVIO INDENIZADO - SEDE', 'Despesa Administrativa'),
('381010010', 'INDENIZAÇÕES TRABALHISTAS - SEDE', 'Despesa Administrativa'),
('381010011', 'ASSISTENCIA MEDICA - SEDE', 'Despesa Administrativa'),
('381010012', 'VT - SEDE', 'Despesa Administrativa'),
('381010013', 'VR - SEDE', 'Despesa Administrativa'),
('381010014', 'SEGURO DE VIDA - SEDE', 'Despesa Administrativa'),
('381019999', 'OUTROS GASTOS COM PESSOAL - SEDE', 'Despesa Administrativa'),
('381020001', 'MAT.DE ESCRITORIO E PAPELARIA - SEDE', 'Despesa Material Sede'),
('381020003', 'BRINDES E PRESENTES - SEDE', 'Despesa Material Sede'),
('381029999', 'OUTROS MATERIAIS - SEDE', 'Despesa Material Sede'),
('381030001', 'LICENCIAMENTO - SEDE', 'Despesa Frota Sede'),
('381030002', 'COMBUSTIVEL - SEDE', 'Despesa Frota Sede'),
('381030005', 'SEGURO VEICULOS - SEDE', 'Despesa Frota Sede'),
('381039999', 'OUTROS GASTOS COM FROTA - SEDE', 'Despesa Frota Sede'),
('382010001', 'SALARIOS - SEDE', 'Despesa Pessoal Sede'),
('382010003', '13º SALARIO - SEDE', 'Despesa Pessoal Sede'),
('382010004', 'FERIAS - SEDE', 'Despesa Pessoal Sede'),
('382010006', 'INSS - SEDE', 'Despesa Pessoal Sede'),
('382010007', 'FGTS - SEDE', 'Despesa Pessoal Sede'),
('382010008', 'PIS SOBRE FOLHA PAGTO - SEDE', 'Despesa Pessoal Sede'),
('382010011', 'ASSISTENCIA MEDICA - SEDE', 'Despesa Pessoal Sede'),
('382010012', 'VT - SEDE', 'Despesa Pessoal Sede'),
('382010013', 'VR - SEDE', 'Despesa Pessoal Sede'),
('382019999', 'OUTROS GASTOS COM PESSOAL - SEDE', 'Despesa Pessoal Sede'),
('382020001', 'MAT.DE ESCRITORIO E PAPELARIA - SEDE', 'Despesa Material Sede'),
('382020003', 'BRINDES E PRESENTES - SEDE', 'Despesa Material Sede'),
('382029999', 'OUTROS MATERIAIS - SEDE', 'Despesa Material Sede'),
('382030002', 'COMBUSTIVEL - SEDE', 'Despesa Frota Sede'),
('382030005', 'IPVA - SEDE', 'Despesa Frota Sede'),
('382030006', 'SEGURO VEICULOS - SEDE', 'Despesa Frota Sede'),
('382030007', 'LICENCIAMENTO - SEDE', 'Despesa Frota Sede'),
('382039999', 'OUTROS GASTOS COM FROTA - SEDE', 'Despesa Frota Sede'),
('382040001', 'SERVICOS DE TERCEIROS - PESSOA FISICA', 'Despesa Serviços Sede'),
('382040004', 'HONORARIOS CONTABEIS', 'Despesa Serviços Sede'),
('382040005', 'HONORARIOS ADVOCATICIOS', 'Despesa Serviços Sede'),
('382040006', 'ASSESSORIA E CONSULTORIA', 'Despesa Serviços Sede'),
('382040007', 'DESPESAS MEDICAS - SEDE', 'Despesa Serviços Sede'),
('382040011', 'CONSULTORIA DE INFORMATICA', 'Despesa Serviços Sede'),
('382040013', 'TREINAMENTOS', 'Despesa Serviços Sede'),
('382040015', 'MATERIAL E SERVICOS DE LIMPEZA - SEDE', 'Despesa Serviços Sede'),
('382040017', 'SEGURANCA E VIGILANCIA - SEDE', 'Despesa Serviços Sede'),
('382040018', 'SOFTWARE - SEDE', 'Despesa Serviços Sede'),
('382049999', 'OUTROS SERVICOS TECNICOS - SEDE', 'Despesa Serviços Sede'),
('382050001', 'FRETES E CARRETOS - SEDE', 'Despesa Transporte Sede'),
('382050004', 'ESTACIONAMENTO - SEDE', 'Despesa Transporte Sede'),
('382050006', 'TAXI - SEDE', 'Despesa Transporte Sede'),
('382050010', 'PASSAGENS AEREAS - SEDE', 'Despesa Transporte Sede'),
('382050011', 'TRANSPORTE - SEDE', 'Despesa Transporte Sede'),
('382050012', 'OUTROS SERVICOS DE TRANSPORTE -SEDE', 'Despesa Transporte Sede'),
('382050013', 'SERVICOS DE ENTREGA-SEDE', 'Despesa Transporte Sede'),
('382070001', 'IMOVEIS', 'Despesa Infraestrutura Sede'),
('382070002', 'AGUA/SABESP', 'Despesa Infraestrutura Sede'),
('382070003', 'TELEFONIA', 'Despesa Infraestrutura Sede'),
('382070004', 'ENERGIA ELETRICA', 'Despesa Infraestrutura Sede'),
('382070005', 'INTERNET', 'Despesa Infraestrutura Sede'),
('382079999', 'OUTROS GASTOS DE INFRAESTRUTURA - SEDE', 'Despesa Infraestrutura Sede'),
('382080001', 'MANUT. MAQ. E EQUIP.', 'Despesa Manutenção Sede'),
('382080002', 'MANUTENCAO FROTA', 'Despesa Manutenção Sede'),
('382080003', 'BENS MOVEIS', 'Despesa Manutenção Sede'),
('382080004', 'REFORMAS E REPAROS', 'Despesa Manutenção Sede'),
('382089999', 'OUTROS GASTOS COM MANUTENCAO - SEDE', 'Despesa Manutenção Sede'),
('383010002', 'IPTU', 'Tributos'),
('383010003', 'IRRF', 'Tributos'),
('383010004', 'ICMS SUBSTITUICAO TRIBUTARIA', 'Tributos'),
('383010005', 'TAXAS E EMOLUMENTOS', 'Tributos'),
('383010006', 'IPVA', 'Tributos'),
('383010007', 'ISS RETENCOES', 'Tributos'),
('383010010', 'IMPOSTO IMPORTACAO', 'Tributos'),
('383010011', 'IMPOSTOS E TAXAS', 'Tributos'),
('383020001', 'MULTAS E JUROS S/ TRIBUTOS', 'Multas'),
('383020002', 'MULTAS DE TRANSITO', 'Multas'),
('384010001', 'MANUTENCAO DE CARROS CLASSICOS', 'Outras Despesas'),
('384010002', 'DESPESA SEM COMPROVANTE', 'Outras Despesas'),
('384010003', 'DESPESA REF. PESSOA FISICA', 'Outras Despesas'),
('386080099', 'COMISSOES DE VENDAS', 'Comissões'),
('387010001', 'JUROS PAGOS OU INCORRIDOS', 'Despesas Financeiras'),
('387010003', 'COMISSOES E DESPESAS BANCARIAS', 'Despesas Financeiras'),
('387010005', 'IOF', 'Despesas Financeiras'),
('387010006', 'TAXA DE COMISSAO DE CARTAO', 'Despesas Financeiras'),
('387020001', 'DESCONTOS OBTIDOS', 'Receitas Financeiras'),
('387020002', 'JUROS RECEBIDOS OU AUFERIDOS', 'Receitas Financeiras'),
('387020003', 'RENDIMENTOS DE APLICACOES FINANCEIRAS', 'Receitas Financeiras')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  tipo = EXCLUDED.tipo,
  updated_at = now();

-- ============================================
-- VERIFICAR INSERÇÕES
-- ============================================

-- Contar registros inseridos
SELECT 'SETOR' as tabela, COUNT(*) as total FROM public.setor
UNION ALL
SELECT 'PROJETO' as tabela, COUNT(*) as total FROM public.projeto
UNION ALL
SELECT 'CONTA_CONTABIL' as tabela, COUNT(*) as total FROM public.conta_contabil
ORDER BY tabela;

-- ============================================
-- RESULTADO ESPERADO:
-- tabela           | total
-- -----------------+-------
-- CONTA_CONTABIL   | 147
-- PROJETO          | 18
-- SETOR            | 28
-- ============================================
-- 
-- ✅ Se você ver esses números = SUCESSO!
-- 
-- 📖 Próximos passos:
-- 1. Acesse a aplicação
-- 2. Vá em: Cadastros → Master Data
-- 3. Veja as abas: Setor, Projeto, Conta Contábil
-- 4. Os dados já estarão disponíveis em todos os formulários!
-- 
-- 🔧 Troubleshooting:
-- - Se houver erro, execute: /supabase/migrations/LIMPAR_PROTHEUS.sql
-- - Depois execute este arquivo novamente
-- 
-- 📚 Guias:
-- - Rápido: /IMPORTAR_PROTHEUS_RAPIDO.md
-- - Completo: /COMO_IMPORTAR_MASTER_DATA.md
-- ============================================

-- FIM DA MIGRATION
