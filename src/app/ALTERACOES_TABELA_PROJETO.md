# 🔄 Padronização das Tabelas Protheus

## 📋 O Que Mudou?

As 3 tabelas do Protheus (`setor`, `projeto`, `conta_contabil`) foram padronizadas para usar nomes de colunas mais descritivos em português, removendo colunas genéricas como `code` e `name`.

---

## 🗂️ TABELA: SETOR

### Antes:
```sql
- id (UUID)
- code (VARCHAR)
- name (VARCHAR)
- responsavel (VARCHAR)
```

### Depois:
```sql
- id (UUID)
- setor (VARCHAR)        ← Era "name"
- responsavel (VARCHAR)   ← Mantido
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

---

## 📊 TABELA: PROJETO

### Antes:
```sql
- id (UUID)
- code (VARCHAR)
- name (VARCHAR)
- temporada (INTEGER)
- categoria (VARCHAR)
```

### Depois:
```sql
- id (UUID)
- projeto (VARCHAR)      ← Era "name"
- descricao (TEXT)        ← Novo campo
- temporada (INTEGER)     ← Mantido
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

---

## 💰 TABELA: CONTA_CONTABIL

### Antes:
```sql
- id (UUID)
- code (VARCHAR)
- name (VARCHAR)
- tipo (VARCHAR)
```

### Depois:
```sql
- id (UUID)
- conta_contabil (VARCHAR) ← Era "name"
- tipo (VARCHAR)            ← Mantido
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

---

## ✅ Atualizações Realizadas

### 1. Backend (Edge Function)

Arquivo: `/supabase/functions/server/index.tsx`

#### GET `/master-data` - Buscar dados

**SETOR:**
```typescript
// Antes:
name: item.name,
code: item.code,

// Depois:
name: item.setor || item.name, // Suporta transição
```

**PROJETO:**
```typescript
// Antes:
name: item.name,
code: item.code,
temporada: item.temporada,
categoria: item.categoria,

// Depois:
name: item.projeto,
description: item.descricao,
temporada: item.temporada,
```

**CONTA_CONTABIL:**
```typescript
// Antes:
name: item.name,
code: item.code,

// Depois:
name: item.conta_contabil || item.name, // Suporta transição
```

#### POST `/master-data` - Salvar dados

**SETOR:**
```typescript
dataToSave = {
  id: item.id,
  setor: item.name,              // ← Salva em "setor"
  responsavel: item.responsavel,
};
```

**PROJETO:**
```typescript
dataToSave = {
  id: item.id,
  projeto: item.name,            // ← Salva em "projeto"
  descricao: item.description,   // ← Salva em "descricao"
  temporada: item.temporada,
};
```

**CONTA_CONTABIL:**
```typescript
dataToSave = {
  id: item.id,
  conta_contabil: item.name,     // ← Salva em "conta_contabil"
  tipo: item.tipo,
};
```

---

### 2. Front-end

**Status:** ✅ Já estava preparado!

O componente `MasterData.tsx` já estava configurado para:
- ✅ Mostrar campo "Descrição" no formulário
- ✅ Renderizar descrição nos cards
- ✅ Exibir descrição na tabela
- ✅ Filtrar por descrição na busca

**Nenhuma alteração foi necessária no front-end.**

---

## 🚀 Como Aplicar as Mudanças

### Passo 1: Padronizar Nomes das Colunas no Banco

⚠️ **OPCIONAL:** Execute este SQL apenas se quiser padronizar todas as 3 tabelas de uma vez.

**Se você JÁ ajustou manualmente a tabela `projeto`, pode pular este passo.**

```bash
# Execute no SQL Editor:
/supabase/migrations/PADRONIZAR_NOMES_COLUNAS.sql
```

Este SQL:
- Renomeia `name` → `setor` na tabela `setor`
- Renomeia `name` → `projeto` na tabela `projeto` (se ainda não foi feito)
- Renomeia `name` → `conta_contabil` na tabela `conta_contabil`
- Remove colunas desnecessárias (`code`, `categoria`)

---

### Passo 2: Deploy da Edge Function ⚠️ **OBRIGATÓRIO**

O backend precisa ser atualizado para buscar das colunas com os novos nomes.

#### Opção A: Via CLI (Recomendado)

```bash
supabase functions deploy make-server-02726c7c
```

#### Opção B: Via Dashboard

1. Acesse: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/functions
2. Encontre: `make-server-02726c7c`
3. Clique em: **"Edit Function"**
4. Cole: Todo o conteúdo de `/supabase/functions/server/index.tsx`
5. Clique em: **"Deploy"**

---

### Passo 3: Verificar

1. **Recarregue a aplicação** (F5)
2. **Vá em**: Cadastros → Master Data → Protheus
3. **Veja as 3 abas**:
   - ✅ Setor (28 registros)
   - ✅ Projeto (18 registros com descrições)
   - ✅ Conta Contábil (147 registros)

---

## 🧪 Teste de Verificação

### 1. Verificar Estrutura da Tabela

Execute no SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projeto' 
ORDER BY ordinal_position;
```

**Resultado esperado:**
```
column_name   | data_type
--------------|-----------
id            | uuid
projeto       | character varying
descricao     | text
temporada     | integer
created_at    | timestamp with time zone
updated_at    | timestamp with time zone
```

---

### 2. Verificar Dados

```sql
SELECT 
  projeto,
  SUBSTRING(descricao, 1, 50) as descricao_truncada,
  temporada
FROM projeto
LIMIT 3;
```

**Resultado esperado:**
```
projeto            | descricao_truncada                        | temporada
-------------------|-------------------------------------------|----------
Challenge Etapa 1  | desafio Pré-temporada da PCC de 2025      | 2025
Challenge Etapa 2  | desafio Primeira etapa da PCC de 2025     | 2025
Challenge Etapa 3  | desafio Segunda etapa da PCC de 2025      | 2025
```

---

## 🔍 Logs de Debug

Para verificar se está funcionando, veja os logs da Edge Function:

https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/logs/edge-functions

**Procure por:**
```
✅ Projetos carregados: 18 registros
```

---

## 📊 Compatibilidade

### ✅ Retrocompatibilidade

- ✅ Todos os dados existentes são preservados
- ✅ Front-end já estava preparado
- ✅ Apenas o backend precisou de ajustes

### 🆕 Novos Campos

| Campo Antigo | Campo Novo  | Tipo | Observação |
|--------------|-------------|------|------------|
| `name`       | `projeto`   | VARCHAR | Nome do projeto |
| -            | `descricao` | TEXT | Descrição detalhada |
| `code`       | ❌ Removido | - | Não é mais necessário |
| `categoria`  | ❌ Removido | - | Não é mais necessário |

---

## 🐛 Troubleshooting

### Dados não aparecem após deploy

**Solução:**
1. Verifique se a Edge Function foi deployada
2. Limpe o cache do navegador (Ctrl+Shift+Delete)
3. Recarregue a aplicação (F5)

---

### Erro: "column 'name' does not exist"

**Causa:** Edge Function não foi atualizada.

**Solução:** Execute o deploy novamente (Passo 1)

---

### Descrição vem vazia

**Causa:** Coluna `descricao` está NULL no banco.

**Solução:** 
```sql
-- Atualizar descrições se necessário
UPDATE projeto 
SET descricao = 'Descrição do ' || projeto 
WHERE descricao IS NULL;
```

---

## 📁 Arquivos Modificados

```
/supabase/functions/server/index.tsx
├── GET /make-server-02726c7c/master-data    ← ATUALIZADO
└── POST /make-server-02726c7c/master-data   ← ATUALIZADO

/components/MasterData.tsx                     ← Sem alterações
```

---

## 📚 Documentação Relacionada

- [PROTHEUS_NAO_CARREGA_FIX.md](/PROTHEUS_NAO_CARREGA_FIX.md) - Troubleshooting geral
- [DEPLOY_EDGE_FUNCTION_PROTHEUS.md](/DEPLOY_EDGE_FUNCTION_PROTHEUS.md) - Deploy detalhado
- [ESTRUTURA_PROTHEUS.md](/ESTRUTURA_PROTHEUS.md) - Estrutura das tabelas

---

## 🎯 Resumo Executivo

**Mudanças:**
- ✅ Coluna `name` → `projeto`
- ✅ Nova coluna `descricao`
- ✅ Backend atualizado
- ✅ Front-end compatível

**Ação necessária:**
```bash
# Deploy da Edge Function (30 segundos)
supabase functions deploy make-server-02726c7c

# Recarregar aplicação
Pressione F5
```

**Tempo total:** ~1 minuto

---

**Conecta Cup** | Tabela Projeto atualizada! 🚀
