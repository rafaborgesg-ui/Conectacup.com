# 📚 Documentação Completa - Importação de Dados do Protheus

## 🎯 Índice Rápido

Escolha o guia que você precisa:

| Guia | Quando Usar | Tempo |
|------|-------------|-------|
| **[Guia Rápido](#guia-rápido)** | Primeira importação ou reimportação | 2 min |
| **[Guia Completo](#guia-completo)** | Quer entender tudo em detalhes | 10 min |
| **[Estrutura das Tabelas](#estrutura)** | Referência técnica dos dados | - |
| **[Troubleshooting](#problemas)** | Está com erro? | - |

---

## 🚀 Guia Rápido

### O que você vai importar?

**3 tabelas separadas** com dados do sistema Protheus:

```
┌─────────────────────────────────┐
│  193 registros do Protheus      │
└─────────────────────────────────┘
    │
    ├─► setor (28)          - Setores com responsáveis
    ├─► projeto (18)        - Etapas/Temporadas 2025
    └─► conta_contabil (147) - Plano de contas
```

### Passo a Passo (2 minutos)

1. **Acesse**: https://app.supabase.com → Seu Projeto → SQL Editor
2. **Copie**: Todo o arquivo `/supabase/migrations/protheus_tables.sql`
3. **Execute**: Cole no SQL Editor e clique em RUN
4. **Verifique**: Você verá esta tabela:

```
tabela           | total
-----------------+-------
CONTA_CONTABIL   | 147
PROJETO          | 18
SETOR            | 28
```

✅ **Pronto! 193 registros importados!**

### Próximos Passos

- Acesse: **Cadastros → Master Data** na aplicação
- Veja as 3 abas com todos os dados importados
- Use em formulários, relatórios e filtros

📖 **Quer mais detalhes?** Leia o [Guia Completo](#guia-completo)

---

## 📖 Guia Completo

### Arquivo Principal
**`/COMO_IMPORTAR_MASTER_DATA.md`**

Este guia contém:
- ✅ Explicação detalhada da estrutura
- ✅ Passo a passo com prints
- ✅ Queries de verificação
- ✅ Troubleshooting completo
- ✅ Exemplos de backup e restore

### Tópicos Cobertos
1. Visão Geral
2. Estrutura das 3 Tabelas
3. Passo a Passo Detalhado
4. Verificação na Aplicação
5. Troubleshooting
6. Detalhes Técnicos (RLS, Índices)

[📖 Abrir Guia Completo](/COMO_IMPORTAR_MASTER_DATA.md)

---

## 🏗️ Estrutura

### Arquivo de Referência
**`/ESTRUTURA_PROTHEUS.md`**

Documentação técnica completa das 3 tabelas:

### Tabela 1: `setor` (28 registros)
```sql
CREATE TABLE setor (
  code TEXT UNIQUE,      -- 'ADE', 'ADM'
  name TEXT,             -- 'ADESIVAGEM'
  responsavel TEXT       -- 'VINÍCIUS QUADROS'
);
```

### Tabela 2: `projeto` (18 registros)
```sql
CREATE TABLE projeto (
  code TEXT UNIQUE,      -- '25ET1'
  name TEXT,             -- 'Etapa 1'
  temporada INTEGER,     -- 2025
  categoria TEXT         -- 'Carrera Cup'
);
```

### Tabela 3: `conta_contabil` (147 registros)
```sql
CREATE TABLE conta_contabil (
  code TEXT UNIQUE,      -- '311010001'
  name TEXT,             -- 'RECEITA REVENDA...'
  tipo TEXT              -- 'Receita', 'Despesa'
);
```

[📖 Ver Estrutura Completa](/ESTRUTURA_PROTHEUS.md)

---

## 🔧 Problemas Comuns

### ❌ Erro: "syntax error at or near 'NOT'"

**Causa**: Conflito com policies antigas

**Solução**:
```sql
-- 1. Execute primeiro:
DROP TABLE IF EXISTS public.setor CASCADE;
DROP TABLE IF EXISTS public.projeto CASCADE;
DROP TABLE IF EXISTS public.conta_contabil CASCADE;

-- 2. Depois execute: protheus_tables.sql
```

**Ou use o arquivo de limpeza:**
```
/supabase/migrations/LIMPAR_PROTHEUS.sql
```

---

### ❌ Erro: "column does not exist"

**Causa**: Tabela com estrutura antiga

**Solução**: Igual ao erro acima - limpe e reimporte

---

### ❌ Erro: "duplicate key value"

**Causa**: Dados já existem

**Solução**: Tudo bem! O SQL atualiza automaticamente (usa `ON CONFLICT DO UPDATE`)

---

### ❌ Erro: "permission denied"

**Causa**: Sem permissão no Supabase

**Solução**: 
- Verifique se está logado
- Confirme que é Owner/Admin do projeto
- Peça ao administrador para executar

---

## 📁 Arquivos do Sistema

### Migrations SQL

| Arquivo | Descrição | Tamanho |
|---------|-----------|---------|
| **protheus_tables.sql** | SQL completo (cria + importa) | ~25KB |
| **LIMPAR_PROTHEUS.sql** | Remove as 3 tabelas | 0.5KB |

**Localização**: `/supabase/migrations/`

---

### Guias e Documentação

| Arquivo | Tipo | Público |
|---------|------|---------|
| **IMPORTAR_PROTHEUS_RAPIDO.md** | Guia rápido | ⭐ Iniciantes |
| **COMO_IMPORTAR_MASTER_DATA.md** | Guia completo | 📖 Todos |
| **ESTRUTURA_PROTHEUS.md** | Referência técnica | 🔧 Desenvolvedores |
| **DOCUMENTACAO_PROTHEUS.md** | Índice (este arquivo) | 🗂️ Navegação |
| **PROTHEUS_NAO_CARREGA_FIX.md** | 🔧 Troubleshooting | Dados não carregam |
| **DEPLOY_EDGE_FUNCTION_PROTHEUS.md** | 🚀 Deploy | Edge Function |

**Localização**: Raiz do projeto `/`

---

### README Técnico

| Arquivo | Descrição |
|---------|-----------|
| **/supabase/migrations/README.md** | Lista todas as migrations disponíveis |

---

## 🎓 Fluxo de Importação

### Primeira Vez

```
1. Ler: IMPORTAR_PROTHEUS_RAPIDO.md (2 min)
   ↓
2. Executar: protheus_tables.sql no Supabase
   ↓
3. Verificar: Contar registros (28 + 18 + 147 = 193)
   ↓
4. Testar: Abrir aplicação → Master Data
   ↓
✅ SUCESSO!
```

---

### Se Der Erro

```
1. Ler: Seção "Problemas Comuns" acima
   ↓
2. Executar: LIMPAR_PROTHEUS.sql
   ↓
3. Executar novamente: protheus_tables.sql
   ↓
4. Verificar: Contar registros
   ↓
✅ SUCESSO!
```

---

### Reimportação (Atualizar Dados)

```
1. (Opcional) Backup dos dados atuais
   ↓
2. Executar: protheus_tables.sql
   ↓
   (O SQL usa ON CONFLICT DO UPDATE)
   ↓
3. Dados atualizados automaticamente!
   ↓
✅ SUCESSO!
```

---

## 🔍 Verificação Rápida

### Via SQL (Supabase)

```sql
-- Contar registros
SELECT 'SETOR' as tabela, COUNT(*) as total FROM setor
UNION ALL
SELECT 'PROJETO' as tabela, COUNT(*) as total FROM projeto
UNION ALL
SELECT 'CONTA_CONTABIL' as tabela, COUNT(*) as total FROM conta_contabil;

-- Resultado esperado:
-- CONTA_CONTABIL | 147
-- PROJETO        | 18
-- SETOR          | 28
```

---

### Via Aplicação (UI)

1. Acesse a aplicação
2. Menu: **Cadastros → Master Data**
3. Veja as 3 abas:
   - **Setor**: 28 registros
   - **Projeto**: 18 registros
   - **Conta Contábil**: 147 registros

---

## 💡 Dicas Importantes

### ✅ Boas Práticas

- **Sempre use o arquivo completo** (`protheus_tables.sql`)
- **Não execute parcialmente** (pode causar inconsistências)
- **Verifique os números** após importar (28 + 18 + 147)
- **Teste na aplicação** antes de usar em produção

---

### ⚠️ Avisos

- **Backup antes de limpar**: Se tem dados importantes
- **Não edite o SQL**: A menos que saiba o que está fazendo
- **Execute em ambiente de teste**: Antes de produção
- **Supabase = Produção**: Cuidado ao executar comandos DROP

---

### 🚀 Performance

- **Índices criados automaticamente**: Busca por código otimizada
- **RLS habilitado**: Segurança por padrão
- **UPSERT configurado**: Reimportação segura
- **Timestamps automáticos**: created_at, updated_at

---

## 📞 Suporte

### Documentação Oficial

- [Supabase SQL Editor](https://supabase.com/docs/guides/database/overview)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

### Arquivos de Ajuda

- **Dúvidas básicas**: `/IMPORTAR_PROTHEUS_RAPIDO.md`
- **Dúvidas avançadas**: `/COMO_IMPORTAR_MASTER_DATA.md`
- **Referência técnica**: `/ESTRUTURA_PROTHEUS.md`
- **Problemas**: Ver seção "Problemas Comuns" acima

---

## 📊 Resumo Executivo

### O que foi implementado?

✅ **3 tabelas separadas** (ao invés de 1 genérica)  
✅ **193 registros** do Protheus importados  
✅ **Estrutura profissional** com campos dedicados  
✅ **Performance otimizada** com índices  
✅ **Segurança configurada** (RLS + Policies)  
✅ **Documentação completa** (4 guias)  

### Por que 3 tabelas?

**Antes** (1 tabela `master_data`):
- ❌ Estrutura genérica
- ❌ Campos em JSONB (difícil consultar)
- ❌ Queries complexas

**Depois** (3 tabelas):
- ✅ Estrutura específica para cada tipo
- ✅ Campos dedicados (não JSONB)
- ✅ Queries simples e rápidas
- ✅ Melhor organização

### Próximos Passos

1. ✅ Importar os dados (2 minutos)
2. ✅ Verificar na aplicação
3. ✅ Usar nos formulários
4. ✅ Criar relatórios

---

## 🎉 Conclusão

Você agora tem acesso a:

- ✅ **28 Setores** com responsáveis
- ✅ **18 Projetos** da temporada 2025
- ✅ **147 Contas Contábeis** do Protheus

Tudo **organizado**, **otimizado** e **pronto para usar**! 🚀

---

**Conecta Cup** | Sistema de Gestão SaaS  
Dados do Protheus integrados com excelência 🏆
