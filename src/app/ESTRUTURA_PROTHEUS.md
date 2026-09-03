# 🏗️ Estrutura das Tabelas - Dados do Protheus

## 📊 Visão Geral

Os dados do sistema Protheus são organizados em **3 tabelas separadas** para melhor organização e performance.

```
┌─────────────────────────────────────────┐
│  DADOS DO PROTHEUS (193 registros)     │
└─────────────────────────────────────────┘
           │
           ├─────────────────┬─────────────────┬─────────────────┐
           │                 │                 │                 │
      ┌────▼─────┐     ┌────▼─────┐     ┌────▼──────────┐
      │  setor   │     │ projeto  │     │conta_contabil │
      │          │     │          │     │               │
      │ 28 regs  │     │ 18 regs  │     │   147 regs    │
      └──────────┘     └──────────┘     └───────────────┘
```

---

## 📋 Tabela 1: `setor`

### Estrutura
```sql
CREATE TABLE setor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Campos
| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `id` | UUID | Identificador único | `a1b2c3d4-...` |
| `code` | TEXT | Código do setor (único) | `ADE`, `ADM` |
| `name` | TEXT | Nome do setor | `ADESIVAGEM` |
| `responsavel` | TEXT | Responsável pelo setor | `VINÍCIUS QUADROS` |
| `created_at` | TIMESTAMPTZ | Data de criação | `2025-11-27 10:00:00` |
| `updated_at` | TIMESTAMPTZ | Data de atualização | `2025-11-27 10:00:00` |

### Exemplos de Registros
```
code │ name                              │ responsavel
─────┼───────────────────────────────────┼──────────────────
ADE  │ ADESIVAGEM                        │ VINÍCIUS QUADROS
ADM  │ ADMINISTRATIVO                    │ CARLOS
ALM  │ ALMOXARIFADO                      │ RAFAEL BORGES
ATP  │ ATENDIMENTO PISTA                 │ GESSE ALVES
CAR  │ CARRERAS                          │ LUIS BALDINI
...  │ ... (28 setores no total)         │ ...
```

### Usos na Aplicação
- ✅ Filtros de relatórios por setor
- ✅ Alocação de custos por setor
- ✅ Controle de responsabilidades
- ✅ Dashboards gerenciais

---

## 📋 Tabela 2: `projeto`

### Estrutura
```sql
CREATE TABLE projeto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  temporada INTEGER NOT NULL,
  categoria TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Campos
| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `id` | UUID | Identificador único | `a1b2c3d4-...` |
| `code` | TEXT | Código do projeto (único) | `25ET1`, `25CHAL1` |
| `name` | TEXT | Nome do projeto | `Etapa 1` |
| `temporada` | INTEGER | Ano da temporada | `2025` |
| `categoria` | TEXT | Categoria/Tipo | `Carrera Cup`, `Challenge` |
| `created_at` | TIMESTAMPTZ | Data de criação | `2025-11-27 10:00:00` |
| `updated_at` | TIMESTAMPTZ | Data de atualização | `2025-11-27 10:00:00` |

### Exemplos de Registros
```
code      │ name                │ temporada │ categoria
──────────┼─────────────────────┼───────────┼─────────────
25ET1     │ Etapa 1             │ 2025      │ Carrera Cup
25ET2     │ Etapa 2             │ 2025      │ Carrera Cup
25ET3     │ Etapa 3             │ 2025      │ Carrera Cup
25CHAL1   │ Challenge Etapa 1   │ 2025      │ Challenge
25TROPHY1 │ Trophy Etapa 1      │ 2025      │ Trophy
...       │ ... (18 projetos)   │ ...       │ ...
```

### Usos na Aplicação
- ✅ Planejamento de etapas
- ✅ Controle de custos por projeto
- ✅ Relatórios por temporada
- ✅ Alocação de recursos

---

## 📋 Tabela 3: `conta_contabil`

### Estrutura
```sql
CREATE TABLE conta_contabil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tipo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Campos
| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `id` | UUID | Identificador único | `a1b2c3d4-...` |
| `code` | TEXT | Código da conta (único) | `311010001` |
| `name` | TEXT | Descrição da conta | `RECEITA REVENDA DE MERCADORIAS` |
| `tipo` | TEXT | Tipo/Categoria | `Receita`, `Despesa`, `Custo` |
| `created_at` | TIMESTAMPTZ | Data de criação | `2025-11-27 10:00:00` |
| `updated_at` | TIMESTAMPTZ | Data de atualização | `2025-11-27 10:00:00` |

### Exemplos de Registros
```
code      │ name                                    │ tipo
──────────┼─────────────────────────────────────────┼───────────────────
311010001 │ RECEITA REVENDA DE MERCADORIAS          │ Receita
311010003 │ RECEITA DE PRESTACAO DE SERVICOS        │ Receita
322010001 │ SALARIOS                                │ Custo Pessoal
382040001 │ SERVICOS DE TERCEIROS - PESSOA FISICA   │ Despesa Serviços
387010001 │ JUROS PAGOS OU INCORRIDOS               │ Despesas Financeiras
...       │ ... (147 contas contábeis no total)     │ ...
```

### Categorias de Contas
| Tipo | Quantidade | Exemplos |
|------|------------|----------|
| Receita | ~20 | Revenda, Prestação de Serviços, Locação |
| Deduções | ~5 | Descontos, Cancelamentos, Devoluções |
| CMV | ~3 | Custo das Mercadorias, Serviços |
| Custo Pessoal | ~20 | Salários, 13º, Férias, INSS, FGTS |
| Custo Operacional | ~10 | Combustível, Aluguel, Seguros |
| Custo Serviços | ~10 | Honorários, Prestação de Serviços |
| Despesas Administrativas | ~40 | Salários Sede, Material Escritório |
| Tributos | ~10 | IPTU, IPVA, ISS, IRRF |
| Despesas Financeiras | ~5 | Juros, IOF, Comissões Bancárias |
| Receitas Financeiras | ~3 | Juros Recebidos, Aplicações |

### Usos na Aplicação
- ✅ Classificação contábil de despesas
- ✅ Relatórios financeiros (DRE, Balancete)
- ✅ Análise de custos por tipo
- ✅ Integração com Protheus

---

## 🔒 Segurança (RLS)

Todas as 3 tabelas possuem **Row Level Security (RLS)** habilitado:

### Políticas de Acesso

```sql
-- Leitura: Todos os usuários autenticados
CREATE POLICY "Permitir leitura para usuários autenticados"
ON public.[tabela] FOR SELECT TO authenticated 
USING (true);

-- Escrita: Todos os usuários autenticados
CREATE POLICY "Permitir escrita para usuários autenticados"
ON public.[tabela] FOR ALL TO authenticated 
USING (true) WITH CHECK (true);
```

**Isso significa:**
- ✅ Usuários logados podem LER todos os registros
- ✅ Usuários logados podem INSERIR/ATUALIZAR/DELETAR
- ❌ Usuários não logados (anonymous) NÃO têm acesso

---

## 🚀 Performance

### Índices Criados

```sql
-- Índices para busca rápida por código
CREATE INDEX idx_setor_code ON public.setor(code);
CREATE INDEX idx_projeto_code ON public.projeto(code);
CREATE INDEX idx_conta_contabil_code ON public.conta_contabil(code);

-- Índice adicional para busca por temporada
CREATE INDEX idx_projeto_temporada ON public.projeto(temporada);
```

**Benefícios:**
- ⚡ Busca por código: ~10x mais rápida
- ⚡ Filtros por temporada: otimizados
- ⚡ Joins: melhor performance

---

## 📈 Comparação: Antes vs Depois

### ❌ Estrutura Antiga (master_data)

```
master_data (1 tabela genérica)
├── id
├── type ('setor', 'projeto', 'conta_contabil')
├── code
├── name
└── metadata (JSONB) ← dados específicos aqui
```

**Problemas:**
- ❌ Estrutura genérica demais
- ❌ Dados específicos em JSONB (difícil de consultar)
- ❌ Um campo `type` para diferenciar registros
- ❌ Difícil de adicionar constraints específicos
- ❌ Queries complexas com WHERE type = '...'

### ✅ Estrutura Nova (3 tabelas)

```
setor (tabela específica)
├── id
├── code
├── name
└── responsavel ← campo dedicado!

projeto (tabela específica)
├── id
├── code
├── name
├── temporada ← campo dedicado!
└── categoria ← campo dedicado!

conta_contabil (tabela específica)
├── id
├── code
├── name
└── tipo ← campo dedicado!
```

**Vantagens:**
- ✅ Estrutura específica para cada tipo
- ✅ Campos dedicados (não JSONB)
- ✅ Queries mais simples e rápidas
- ✅ Constraints específicos por tabela
- ✅ Mais fácil de entender e manter
- ✅ Melhor performance em joins

---

## 🔄 Queries Comuns

### Buscar Setor por Código
```sql
SELECT * FROM setor WHERE code = 'ADE';
```

### Buscar Projetos de uma Temporada
```sql
SELECT * FROM projeto 
WHERE temporada = 2025 
ORDER BY code;
```

### Buscar Contas por Tipo
```sql
SELECT * FROM conta_contabil 
WHERE tipo = 'Receita' 
ORDER BY code;
```

### Listar Setores com Responsáveis
```sql
SELECT code, name, responsavel 
FROM setor 
WHERE responsavel IS NOT NULL 
ORDER BY name;
```

### Contar Registros
```sql
SELECT 
  'SETOR' as tabela, COUNT(*) as total FROM setor
UNION ALL
SELECT 
  'PROJETO' as tabela, COUNT(*) as total FROM projeto
UNION ALL
SELECT 
  'CONTA_CONTABIL' as tabela, COUNT(*) as total FROM conta_contabil;
```

---

## 📁 Arquivos Relacionados

### SQL Migrations
- **`/supabase/migrations/protheus_tables.sql`** - SQL completo (cria + importa)
- **`/supabase/migrations/LIMPAR_PROTHEUS.sql`** - Limpa tudo

### Guias
- **`/IMPORTAR_PROTHEUS_RAPIDO.md`** - Guia rápido (2 min)
- **`/COMO_IMPORTAR_MASTER_DATA.md`** - Guia completo
- **`/supabase/migrations/README.md`** - README técnico

---

## ✅ Checklist de Verificação

Após importar, verifique:

- [ ] 28 registros na tabela `setor`
- [ ] 18 registros na tabela `projeto`
- [ ] 147 registros na tabela `conta_contabil`
- [ ] Total de 193 registros
- [ ] Índices criados
- [ ] RLS habilitado
- [ ] Políticas de acesso configuradas
- [ ] Dados visíveis na aplicação

---

**Conecta Cup** | Sistema de Gestão SaaS  
Estrutura de dados profissional e otimizada 🚀
