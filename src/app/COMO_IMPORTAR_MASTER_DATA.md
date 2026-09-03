# 📚 Guia Completo - Importação Master Data (Protheus)

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Estrutura das Tabelas](#estrutura-das-tabelas)
3. [Passo a Passo](#passo-a-passo)
4. [Verificação](#verificação)
5. [Troubleshooting](#troubleshooting)

---

## Visão Geral

Este guia explica como importar os **193 registros** do sistema Protheus para o Supabase, organizados em **3 tabelas separadas**:

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `setor` | 28 | Setores da empresa com responsáveis |
| `projeto` | 18 | Projetos/Etapas da temporada 2025 |
| `conta_contabil` | 147 | Plano de contas contábeis |

### ✅ Benefícios da Nova Estrutura

**Antes** (master_data - 1 tabela):
- Todos os dados misturados
- Difícil de consultar
- Estrutura genérica

**Depois** (3 tabelas separadas):
- ✅ Organização profissional
- ✅ Consultas mais rápidas
- ✅ Estrutura específica para cada tipo
- ✅ Mais fácil de manter

---

## Estrutura das Tabelas

### Tabela: `setor`

```sql
CREATE TABLE setor (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,      -- Ex: 'ADE', 'ADM'
  name TEXT NOT NULL,              -- Ex: 'ADESIVAGEM'
  responsavel TEXT,                -- Ex: 'VINÍCIUS QUADROS'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Exemplo de registros:**
| code | name | responsavel |
|------|------|-------------|
| ADE | ADESIVAGEM | VINÍCIUS QUADROS |
| ADM | ADMINISTRATIVO | CARLOS |
| ALM | ALMOXARIFADO | RAFAEL BORGES |

---

### Tabela: `projeto`

```sql
CREATE TABLE projeto (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,      -- Ex: '25ET1'
  name TEXT NOT NULL,              -- Ex: 'Etapa 1'
  temporada INTEGER NOT NULL,      -- Ex: 2025
  categoria TEXT,                  -- Ex: 'Carrera Cup'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Exemplo de registros:**
| code | name | temporada | categoria |
|------|------|-----------|-----------|
| 25ET1 | Etapa 1 | 2025 | Carrera Cup |
| 25ET2 | Etapa 2 | 2025 | Carrera Cup |
| 25CHAL1 | Challenge Etapa 1 | 2025 | Challenge |

---

### Tabela: `conta_contabil`

```sql
CREATE TABLE conta_contabil (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,      -- Ex: '311010001'
  name TEXT NOT NULL,              -- Ex: 'RECEITA REVENDA...'
  tipo TEXT,                       -- Ex: 'Receita', 'Despesa'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Exemplo de registros:**
| code | name | tipo |
|------|------|------|
| 311010001 | RECEITA REVENDA DE MERCADORIAS | Receita |
| 322010001 | SALARIOS | Custo Pessoal |
| 387010001 | JUROS PAGOS OU INCORRIDOS | Despesas Financeiras |

---

## Passo a Passo

### 1️⃣ Acesse o Supabase Dashboard

1. Vá para: https://app.supabase.com
2. Faça login
3. Selecione seu projeto da **Conecta Cup**
4. No menu lateral, clique em **SQL Editor**

---

### 2️⃣ Prepare o SQL

1. Abra o arquivo `/supabase/migrations/protheus_tables.sql`
2. Copie **TODO** o conteúdo (Ctrl + A, Ctrl + C)

**💡 Dica:** Você pode abrir o arquivo diretamente no VS Code ou editor de texto.

---

### 3️⃣ Execute no Supabase

1. No SQL Editor, clique em **New Query**
2. Cole o conteúdo completo do arquivo (Ctrl + V)
3. Clique em **RUN** (ou pressione Ctrl + Enter)
4. Aguarde alguns segundos...

---

### 4️⃣ Verifique o Resultado

Ao final da execução, você verá esta tabela:

```
tabela           | total
-----------------+-------
CONTA_CONTABIL   | 147
PROJETO          | 18
SETOR            | 28
```

✅ **Se você viu esses números, tudo funcionou perfeitamente!**

---

## Verificação

### Verificação Manual

Execute estas queries para conferir:

```sql
-- 1. Verificar se as tabelas existem
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('setor', 'projeto', 'conta_contabil')
ORDER BY table_name;

-- Resultado esperado:
-- table_name
-- ---------------
-- conta_contabil
-- projeto
-- setor


-- 2. Contar registros
SELECT 'SETOR' as tabela, COUNT(*) as total FROM public.setor
UNION ALL
SELECT 'PROJETO' as tabela, COUNT(*) as total FROM public.projeto
UNION ALL
SELECT 'CONTA_CONTABIL' as tabela, COUNT(*) as total FROM public.conta_contabil
ORDER BY tabela;

-- Resultado esperado:
-- tabela           | total
-- -----------------+-------
-- CONTA_CONTABIL   | 147
-- PROJETO          | 18
-- SETOR            | 28


-- 3. Ver alguns exemplos de cada tabela
SELECT code, name, responsavel FROM public.setor LIMIT 5;
SELECT code, name, temporada, categoria FROM public.projeto LIMIT 5;
SELECT code, name, tipo FROM public.conta_contabil LIMIT 5;
```

---

### Verificação na Aplicação

1. Acesse sua aplicação Conecta Cup
2. No menu lateral, vá em: **Cadastros → Master Data**
3. Você verá 3 abas:
   - **Setor** (28 registros)
   - **Projeto** (18 registros)
   - **Conta Contábil** (147 registros)
4. Navegue pelas abas e confira os dados

---

## Troubleshooting

### Erro: "column does not exist" ou "syntax error at or near 'NOT'"

**Causa**: Você tentou executar o SQL mas havia tabelas antigas com estrutura diferente ou policies conflitantes.

**Solução**: 
1. **Apague as tabelas antigas** (se houver dados importantes, faça backup antes):
   
   **Opção A - Arquivo de limpeza (recomendado):**
   ```
   Execute: /supabase/migrations/LIMPAR_PROTHEUS.sql
   ```
   
   **Opção B - Comando manual:**
   ```sql
   DROP TABLE IF EXISTS public.setor CASCADE;
   DROP TABLE IF EXISTS public.projeto CASCADE;
   DROP TABLE IF EXISTS public.conta_contabil CASCADE;
   ```

2. Execute novamente o SQL completo de `protheus_tables.sql` - ele criará as tabelas com a estrutura correta E importará os dados.

**Nota:** O `CASCADE` remove também todas as policies, índices e constraints antigas, evitando conflitos.

---

### Erro: "duplicate key value violates unique constraint"

**Causa**: Alguns registros já existem no banco de dados.

**Solução**: Tudo bem! O SQL usa `ON CONFLICT DO UPDATE`, então ele atualiza automaticamente os registros existentes com os novos valores. Isso é intencional e seguro.

---

### Erro: "permission denied for table"

**Causa**: Você não tem permissões suficientes no projeto Supabase.

**Solução**:
1. Certifique-se de estar logado no Supabase
2. Verifique se você é **Owner** ou **Admin** do projeto
3. Se não for, peça ao administrador para executar o SQL

---

### Erro: "connection timeout" ou "query timeout"

**Causa**: O SQL está demorando muito (raro, mas pode acontecer).

**Solução**:
1. Verifique sua conexão com a internet
2. Tente novamente em alguns minutos
3. Se persistir, execute as inserções em partes menores:
   - Execute só a criação das tabelas primeiro
   - Depois execute as inserções de cada tabela separadamente

---

### Como fazer backup antes de limpar?

Se você tem dados importantes nas tabelas antigas:

```sql
-- 1. Criar backup (se existir master_data antiga)
CREATE TABLE backup_master_data AS 
SELECT * FROM public.master_data;

-- 2. Criar backup das tabelas antigas (se existirem)
CREATE TABLE backup_setor AS SELECT * FROM public.setor;
CREATE TABLE backup_projeto AS SELECT * FROM public.projeto;
CREATE TABLE backup_conta_contabil AS SELECT * FROM public.conta_contabil;

-- 3. Depois execute a limpeza e importação normal
```

Para restaurar o backup (se necessário):
```sql
INSERT INTO public.setor SELECT * FROM backup_setor;
-- Repetir para as outras tabelas
```

---

## Estrutura de Arquivos

```
/supabase/migrations/
├── protheus_tables.sql       # SQL completo (cria tabelas + importa dados)
├── LIMPAR_PROTHEUS.sql        # SQL para limpar tudo
└── README.md                  # Documentação técnica

/
├── IMPORTAR_PROTHEUS_RAPIDO.md    # Este guia rápido (2 min)
└── COMO_IMPORTAR_MASTER_DATA.md   # Guia completo (você está aqui!)
```

---

## Detalhes Técnicos

### Recursos Implementados

✅ **Row Level Security (RLS)**: Todas as tabelas têm RLS habilitado
✅ **Políticas de Acesso**: Usuários autenticados podem ler e escrever
✅ **Índices**: Criados para melhor performance nas buscas por código
✅ **Timestamps**: Criação e atualização automáticas
✅ **UPSERT**: Usa `ON CONFLICT DO UPDATE` para evitar duplicatas
✅ **Validação**: Queries de verificação automáticas

### Políticas de Acesso (RLS)

```sql
-- Todas as tabelas têm estas policies:
CREATE POLICY "Permitir leitura para usuários autenticados"
ON public.[tabela] FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir escrita para usuários autenticados"
ON public.[tabela] FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

Isso significa:
- ✅ Qualquer usuário autenticado pode LER os dados
- ✅ Qualquer usuário autenticado pode INSERIR/ATUALIZAR/DELETAR
- ❌ Usuários não autenticados (anonymous) NÃO têm acesso

---

## Próximos Passos

Após a importação bem-sucedida:

1. ✅ **Teste na aplicação**: Acesse o módulo Master Data
2. ✅ **Integre nos formulários**: Use os dados em outros módulos
3. ✅ **Adicione novos registros**: Via interface ou SQL
4. ✅ **Configure backups**: Proteja seus dados

---

## Suporte

### Documentação Oficial
- [Supabase SQL Editor](https://supabase.com/docs/guides/database/overview)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### Arquivos Úteis
- Guia Rápido: `/IMPORTAR_PROTHEUS_RAPIDO.md`
- SQL Principal: `/supabase/migrations/protheus_tables.sql`
- SQL Limpeza: `/supabase/migrations/LIMPAR_PROTHEUS.sql`
- README Técnico: `/supabase/migrations/README.md`

---

**Conecta Cup** | Sistema de Gestão SaaS  
Desenvolvido com ❤️ para Porsche Cup Brasil
