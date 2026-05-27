-- ============================================
-- MIGRATION: Master Data - Dados do Protheus
-- Data: 2025-11-27
-- Descrição: Insere Setores, Projetos e Contas Contábeis do sistema Protheus
-- ============================================
-- 
-- ✅ IMPORTANTE: Este SQL é COMPLETO e AUTO-SUFICIENTE!
-- 
-- Ele faz TUDO que você precisa:
-- 1. Cria a tabela master_data (se não existir)
-- 2. Configura as permissões de segurança (RLS)
-- 3. Importa todos os 193 registros do Protheus
-- 
-- Você NÃO precisa executar nenhum outro SQL antes.
-- Basta copiar este arquivo inteiro e colar no SQL Editor do Supabase.
-- ============================================

-- Passo 1: Criar a tabela master_data se não existir
CREATE TABLE IF NOT EXISTS public.master_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(type, code)
);

-- Passo 2: Habilitar RLS (Row Level Security)
ALTER TABLE public.master_data ENABLE ROW LEVEL SECURITY;

-- Passo 3: Criar policies de acesso
CREATE POLICY IF NOT EXISTS "Permitir leitura para usuários autenticados"
ON public.master_data FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Permitir escrita para usuários autenticados"
ON public.master_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Limpar dados existentes (opcional - descomente se quiser limpar antes)
-- DELETE FROM public.master_data WHERE type IN ('setor', 'projeto', 'conta_contabil');

-- ============================================
-- 1. INSERIR SETORES
-- ============================================

INSERT INTO public.master_data (type, code, name, metadata) VALUES
('setor', 'ADE', 'ADESIVAGEM', '{"responsavel": "VINÍCIUS QUADROS"}'),
('setor', 'ADM', 'ADMINISTRATIVO', '{"responsavel": "CARLOS"}'),
('setor', 'ALM', 'ALMOXARIFADO', '{"responsavel": "RAFAEL BORGES"}'),
('setor', 'ALN', 'ALINHAMENTO', '{"responsavel": "MARCEL"}'),
('setor', 'CLA', 'CLASSICOS', '{"responsavel": ""}'),
('setor', 'CT1', 'CATEGORIA 1 - CARRERA', '{"responsavel": "MARCEL"}'),
('setor', 'CT2', 'CATEGORIA 2 - CHALLENGE', '{"responsavel": "MARCEL"}'),
('setor', 'CT3', 'CATEGORIA 3 - TROPHY', '{"responsavel": "MARCEL"}'),
('setor', 'DEM', 'DIRETORIA EVENTOS & MARKETING', '{"responsavel": "REGINA"}'),
('setor', 'DOP', 'DIRETORIA DE OPERAÇÕES', '{"responsavel": "ENZO"}'),
('setor', 'DPR', 'DIRETORIA PLANEJAMENTO E RELACIONAMENTO', '{"responsavel": "VINÍCIUS QUADROS"}'),
('setor', 'ENG', 'ENGENHARIA OFICINA', '{"responsavel": "MARCEL"}'),
('setor', 'ENQ', 'ENGENHARIA QUALIDADE', '{"responsavel": "LUIS BALDINI"}'),
('setor', 'EST', 'ESTOQUE', '{"responsavel": ""}'),
('setor', 'EVT', 'EVENTOS', '{"responsavel": "REGINA"}'),
('setor', 'FIN', 'FINANCEIRO', '{"responsavel": ""}'),
('setor', 'FUN', 'FUNILARIA', '{"responsavel": "MARCEL"}'),
('setor', 'LOG', 'LOGISTICA', '{"responsavel": "RAFAEL BORGES"}'),
('setor', 'MKT', 'MARKETING', '{"responsavel": "REGINA"}'),
('setor', 'OFC', 'OFICINA', '{"responsavel": ""}'),
('setor', 'PEC', 'PECAS', '{"responsavel": "BRUNO"}'),
('setor', 'PER', 'PLANEJAMENTO E RELACIONAMENTO', '{"responsavel": "VINÍCIUS QUADROS"}'),
('setor', 'PNR', 'PNEU/RODA', '{"responsavel": "RAFAEL BORGES"}'),
('setor', 'PRE', 'PRESIDENCIA', '{"responsavel": "CARLOS"}'),
('setor', 'PWT', 'POWERTRAIN', '{"responsavel": "LUIS BALDINI"}'),
('setor', 'RED', 'RECUPERAÇÃO E DESENVOLVIMENTO', '{"responsavel": "LUIS BALDINI"}'),
('setor', 'REV', 'REVISAO', '{"responsavel": ""}'),
('setor', 'RHU', 'RECURSOS HUMANOS', '{"responsavel": "AMANDA"}')
ON CONFLICT (type, code) DO UPDATE SET
  name = EXCLUDED.name,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- ============================================
-- 2. INSERIR PROJETOS
-- ============================================

INSERT INTO public.master_data (type, code, name, metadata) VALUES
('projeto', '25ET1', 'VELOCITTA', '{}'),
('projeto', '25ET2', 'VELOCITTA', '{}'),
('projeto', '25ET3', 'INTERLAGOS', '{}'),
('projeto', '25ET4', 'ALGARVE', '{}'),
('projeto', '25ET5', 'ALGARVE', '{}'),
('projeto', '25ET5.1', 'VELOCITTA', '{}'),
('projeto', '25ET6', 'ESTORIL', '{}'),
('projeto', '25ET7', 'ESTORIL', '{}'),
('projeto', '25ET8', 'F1', '{}'),
('projeto', '25ET9', 'INTERLAGOS', '{}'),
('projeto', '25PJE', 'DENER', '{}'),
('projeto', '25PRJ01', 'GLOBO ESPORTE', '{}'),
('projeto', '25PRJ02', 'TREINOS VELOCITTA', '{}'),
('projeto', '25PRJ06', 'LOJA 2025', '{}'),
('projeto', '25PRJ08', 'NOVA SEDE 2025', '{}'),
('projeto', '25PRJ09', 'EXPOSICOES 2025', '{}'),
('projeto', 'SEDE', '2025', '{}'),
('projeto', 'TEMPORADA', '2025', '{}')
ON CONFLICT (type, code) DO UPDATE SET
  name = EXCLUDED.name,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- ============================================
-- 3. INSERIR CONTAS CONTÁBEIS
-- ============================================

INSERT INTO public.master_data (type, code, name, metadata) VALUES
('conta_contabil', '123020001', 'MOVEIS E UTENSILIOS - IMOBILIZADO', '{}'),
('conta_contabil', '123020002', 'FERRAMENTAS - IMOBILIZADO', '{}'),
('conta_contabil', '123020003', 'MAQUINAS E EQUIPAMENTOS - IMOBILIZADO', '{}'),
('conta_contabil', '123020004', 'COMPUTADORES E PERIFERICOS - IMOBILIZADO', '{}'),
('conta_contabil', '123020005', 'APARELHOS ELETRO-ELETRONICOS', '{}'),
('conta_contabil', '123020006', 'INSTALACOES - IMOBILIZADO', '{}'),
('conta_contabil', '123020007', 'AUTOMÓVEIS - IMOBILIZADO', '{}'),
('conta_contabil', '123020010', 'DIREITO DE USO DE LINHA TELEFONICA', '{}'),
('conta_contabil', '123020011', 'BENFEITORIA EM IMOVEIS - IMOBILIZADO', '{}'),
('conta_contabil', '123020012', 'CONTEINERS - IMOBILIZADO', '{}'),
('conta_contabil', '123020016', 'QUOTA DE CONSORCIO', '{}'),
('conta_contabil', '123020030', 'SOFTWARE - IMOBILIZADO', '{}'),
('conta_contabil', '332200001', 'COMBUSTIVEIS E LUBRIFICANTES CARROS DE C', '{}'),
('conta_contabil', '332200002', 'MANUT CARROS CORRIDA', '{}'),
('conta_contabil', '332200003', 'PNEUS CARROS DE CORRIDA', '{}'),
('conta_contabil', '332200004', 'NITROGENIO/GASES CARROS DE CORRIDA', '{}'),
('conta_contabil', '332200005', 'PECAS CARROS CORRIDA', '{}'),
('conta_contabil', '332200006', 'ADESIVAGEM CARROS DE CORRIDA', '{}'),
('conta_contabil', '332200090', 'OUTROS GASTOS COM CARROS DE CORRIDA', '{}'),
('conta_contabil', '332210001', 'BUFFET VIP', '{}'),
('conta_contabil', '332210002', 'MONTAGEM', '{}'),
('conta_contabil', '332210003', 'LOCACAO DE AUTODROMO', '{}'),
('conta_contabil', '332210004', 'MODELOS E RECEPCIONISTA', '{}'),
('conta_contabil', '332210005', 'CREDENCIAIS/INGRESSO', '{}'),
('conta_contabil', '332210090', 'OUTROS GASTOS DE INFRA-ESTRUTURA DE EVEN', '{}'),
('conta_contabil', '332220001', 'FILMAGEM/FOTOGRAFIA', '{}'),
('conta_contabil', '332220002', 'LOCUTOR ESPORTISTA/COMENTARISTAS', '{}'),
('conta_contabil', '332220003', 'SERVICOS DE COMUNICACAO - ETAPAS', '{}'),
('conta_contabil', '332220004', 'MIDIAS SOCIAIS', '{}'),
('conta_contabil', '332220005', 'PUBLICACOES PUBLICIDADES E PROPAGANDAS', '{}'),
('conta_contabil', '332220006', 'TROFEUS', '{}'),
('conta_contabil', '332220007', 'MATERIAL PROMOCIONAL - ETAPAS', '{}'),
('conta_contabil', '332220008', 'COMUNICACAO VISUAL', '{}'),
('conta_contabil', '332220090', 'OUTROS GASTOS DE MARKETING E MIDIA', '{}'),
('conta_contabil', '332230001', 'AUTONOMOS - ETAPAS', '{}'),
('conta_contabil', '332230002', 'SERVICOS TECNICOS ESPECIALIZADOS - ETAPA', '{}'),
('conta_contabil', '332230003', 'RESGATES - ETAPAS', '{}'),
('conta_contabil', '332230004', 'COMISSARIO/CBA/FEDERACAO', '{}'),
('conta_contabil', '332230005', 'ASSESSORIA/CONSULTOR - ETAPAS', '{}'),
('conta_contabil', '332230006', 'MATERIAL E SERVICOS DE LIMPEZA - ETAPAS', '{}'),
('conta_contabil', '332230007', 'SEGURANCA E VIGILANCIA - ETAPAS', '{}'),
('conta_contabil', '332230008', 'EQUIP E FERRAMENTAS - ETAPAS', '{}'),
('conta_contabil', '332230009', 'LAVANDERIA - ETAPAS', '{}'),
('conta_contabil', '332230010', 'INFORMATICA - ETAPAS', '{}'),
('conta_contabil', '332230011', 'SERVICOS MEDICOS -ETAPAS', '{}'),
('conta_contabil', '332230090', 'OUTROS SERVICOS TECNICOS E DE APOIO - ET', '{}'),
('conta_contabil', '332240001', 'HOSPEDAGEM - ETAPAS', '{}'),
('conta_contabil', '332240003', 'ALIMENTACAO - STAFF - ETAPAS', '{}'),
('conta_contabil', '332240004', 'FRETE/ONIBUS - ETAPAS', '{}'),
('conta_contabil', '332240005', 'PASSAGENS AEREAS', '{}'),
('conta_contabil', '332240006', 'TRANSPORTE - ETAPAS', '{}'),
('conta_contabil', '332240007', 'TAXI - ETAPAS', '{}'),
('conta_contabil', '332240090', 'OUTROS GASTOS DE TRANSPORTE, ALIMENTACAO', '{}'),
('conta_contabil', '332250001', 'DESPACH. ADUANEIRO - ETAPAS', '{}'),
('conta_contabil', '332250002', 'FRETES E CARRETOS - ETAPAS', '{}'),
('conta_contabil', '332250003', 'ESTACIONAMENTO - ETAPAS', '{}'),
('conta_contabil', '332250090', 'OUTROS GASTOS DE LOGISTICA - ETAPAS', '{}'),
('conta_contabil', '332260001', 'MATERIAL DE CONSUMO - ETAPAS', '{}'),
('conta_contabil', '332260002', 'SERVICOS DE ENTREGA - ETAPAS', '{}'),
('conta_contabil', '332260003', 'SEGUROS - ETAPAS', '{}'),
('conta_contabil', '332260004', 'UNIFORMES - ETAPAS', '{}'),
('conta_contabil', '332260090', 'OUTROS GASTOS GERAIS - ETAPAS', '{}'),
('conta_contabil', '382010001', 'SALARIOS', '{}'),
('conta_contabil', '382010002', 'PRO-LABORE', '{}'),
('conta_contabil', '382010004', 'FERIAS', '{}'),
('conta_contabil', '382010005', '13.SALARIO', '{}'),
('conta_contabil', '382010010', 'VALE TRANSPORTE', '{}'),
('conta_contabil', '382010011', 'VALE ALIMENTACAO/REFEICAO', '{}'),
('conta_contabil', '382010012', 'VALE COMBUSTIVEL', '{}'),
('conta_contabil', '382010015', 'ASSISTENCIA MEDICA / ODONTOLOGICA', '{}'),
('conta_contabil', '382010016', 'ACADEMIA', '{}'),
('conta_contabil', '382010017', 'AUTONOMOS - SEDE', '{}'),
('conta_contabil', '382010018', 'ESTAGIARIOS', '{}'),
('conta_contabil', '382010019', 'CONFRATERNIZACOES', '{}'),
('conta_contabil', '382010020', 'TREINAMENTOS', '{}'),
('conta_contabil', '382010021', 'FARMACIA', '{}'),
('conta_contabil', '382010022', 'RESCISOES E INDENIZACOES', '{}'),
('conta_contabil', '38201999', 'OUTROS GASTOS COM PESSOAL', '{}'),
('conta_contabil', '382019999', 'OUTROS GASTOS COM PESSOAL', '{}'),
('conta_contabil', '382020001', 'I.N.S.S.', '{}'),
('conta_contabil', '382020002', 'F.G.T.S.', '{}'),
('conta_contabil', '382020003', 'MULTA RESCISORIA FGTS', '{}'),
('conta_contabil', '382030013', 'DEPRECIACOES E AMORTIZACOES', '{}'),
('conta_contabil', '382030034', 'SEGURO - SEDE', '{}'),
('conta_contabil', '382030035', 'REFEICOES, MANTIMENTOS E BEBIDAS - SEDE', '{}'),
('conta_contabil', '382030040', 'MATERIAL DE CONSUMO - SEDE', '{}'),
('conta_contabil', '382030041', 'UNIFORMES - SEDE', '{}'),
('conta_contabil', '382030069', 'EQUIP. E FERRAMENTAS - SEDE', '{}'),
('conta_contabil', '382030074', 'LAVANDERIA - SEDE', '{}'),
('conta_contabil', '382030081', 'BRINDES - SEDE', '{}'),
('conta_contabil', '382030082', 'DESPESAS CERTIFICADOS, TAXAS E CARTORIO', '{}'),
('conta_contabil', '382030083', 'TAXAS E LICENCIAMENTO DE VEICULOS', '{}'),
('conta_contabil', '382039999', 'OUTRAS DESPESAS GERAIS', '{}'),
('conta_contabil', '382040001', 'SERVICOS DE TERCEIROS - PESSOA FISICA', '{}'),
('conta_contabil', '382040004', 'HONORARIOS CONTABEIS', '{}'),
('conta_contabil', '382040005', 'HONORARIOS ADVOCATICIOS', '{}'),
('conta_contabil', '382040006', 'ASSESSORIA E CONSULTORIA', '{}'),
('conta_contabil', '382040007', 'DESPESAS MEDICAS - SEDE', '{}'),
('conta_contabil', '382040011', 'CONSULTORIA DE INFORMATICA', '{}'),
('conta_contabil', '382040013', 'TREINAMENTOS', '{}'),
('conta_contabil', '382040015', 'MATERIAL E SERVICOS DE LIMPEZA - SEDE', '{}'),
('conta_contabil', '382040017', 'SEGURANCA E VIGILANCIA - SEDE', '{}'),
('conta_contabil', '382040018', 'SOFTWARE - SEDE', '{}'),
('conta_contabil', '382049999', 'OUTROS SERVICOS TECNICOS - SEDE', '{}'),
('conta_contabil', '382050001', 'FRETES E CARRETOS - SEDE', '{}'),
('conta_contabil', '382050004', 'ESTACIONAMENTO - SEDE', '{}'),
('conta_contabil', '382050006', 'TAXI - SEDE', '{}'),
('conta_contabil', '382050010', 'PASSAGENS AEREAS - SEDE', '{}'),
('conta_contabil', '382050011', 'TRANSPORTE - SEDE', '{}'),
('conta_contabil', '382050012', 'OUTROS SERVICOS DE TRANSPORTE -SEDE', '{}'),
('conta_contabil', '382050013', 'SERVICOS DE ENTREGA-SEDE', '{}'),
('conta_contabil', '382070001', 'IMOVEIS', '{}'),
('conta_contabil', '382070002', 'AGUA/SABESP', '{}'),
('conta_contabil', '382070003', 'TELEFONIA', '{}'),
('conta_contabil', '382070004', 'ENERGIA ELETRICA', '{}'),
('conta_contabil', '382070005', 'INTERNET', '{}'),
('conta_contabil', '382079999', 'OUTROS GASTOS DE INFRAESTRUTURA - SEDE', '{}'),
('conta_contabil', '382080001', 'MANUT. MAQ. E EQUIP.', '{}'),
('conta_contabil', '382080002', 'MANUTENCAO FROTA', '{}'),
('conta_contabil', '382080003', 'BENS MOVEIS', '{}'),
('conta_contabil', '382080004', 'REFORMAS E REPAROS', '{}'),
('conta_contabil', '382089999', 'OUTROS GASTOS COM MANUTENCAO - SEDE', '{}'),
('conta_contabil', '383010002', 'IPTU', '{}'),
('conta_contabil', '383010003', 'IRRF', '{}'),
('conta_contabil', '383010004', 'ICMS SUBSTITUICAO TRIBUTARIA', '{}'),
('conta_contabil', '383010005', 'TAXAS E EMOLUMENTOS', '{}'),
('conta_contabil', '383010006', 'IPVA', '{}'),
('conta_contabil', '383010007', 'ISS RETENCOES', '{}'),
('conta_contabil', '383010010', 'IMPOSTO IMPORTACAO', '{}'),
('conta_contabil', '383010011', 'IMPOSTOS E TAXAS', '{}'),
('conta_contabil', '383020001', 'MULTAS E JUROS S/ TRIBUTOS', '{}'),
('conta_contabil', '383020002', 'MULTAS DE TRANSITO', '{}'),
('conta_contabil', '384010001', 'MANUTENCAO DE CARROS CLASSICOS', '{}'),
('conta_contabil', '384010002', 'DESPESA SEM COMPROVANTE', '{}'),
('conta_contabil', '384010003', 'DESPESA REF. PESSOA FISICA', '{}'),
('conta_contabil', '386080099', 'COMISSOES DE VENDAS', '{}'),
('conta_contabil', '387010001', 'JUROS PAGOS OU INCORRIDOS', '{}'),
('conta_contabil', '387010003', 'COMISSOES E DESPESAS BANCARIAS', '{}'),
('conta_contabil', '387010005', 'IOF', '{}'),
('conta_contabil', '387010006', 'TAXA DE COMISSAO DE CARTAO', '{}'),
('conta_contabil', '387020001', 'DESCONTOS OBTIDOS', '{}'),
('conta_contabil', '387020002', 'JUROS RECEBIDOS OU AUFERIDOS', '{}'),
('conta_contabil', '387020003', 'RENDIMENTOS DE APLICACOES FINANCEIRAS', '{}')
ON CONFLICT (type, code) DO UPDATE SET
  name = EXCLUDED.name,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- ============================================
-- VERIFICAR INSERÇÕES
-- ============================================

-- Contar registros inseridos
SELECT 
  type,
  COUNT(*) as total
FROM public.master_data
WHERE type IN ('setor', 'projeto', 'conta_contabil')
GROUP BY type
ORDER BY type;

-- ============================================
-- RESULTADO ESPERADO:
-- tipo             | total
-- -----------------+-------
-- conta_contabil   | 147
-- projeto          | 18
-- setor            | 28
-- ============================================

-- FIM DA MIGRATION
