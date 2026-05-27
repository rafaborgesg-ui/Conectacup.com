# 🔄 Revisão Completa - Integração Supabase Protheus

## 📋 Estrutura das Tabelas no Supabase

### 1️⃣ SETOR
**Tabela:** `setor`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `setor` | VARCHAR | Nome do setor |
| `descricao` | TEXT | Descrição do setor |
| `responsavel` | VARCHAR | Responsável pelo setor |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

**Campos visíveis no front-end:**
- ✅ Nome do Setor (coluna: `setor`)
- ✅ Descrição (coluna: `descricao`)
- ✅ Responsável (coluna: `responsavel`)

---

### 2️⃣ PROJETO
**Tabela:** `projeto`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `projeto` | VARCHAR | Nome do projeto |
| `descricao` | TEXT | Descrição do projeto |
| `temporada` | INTEGER | Ano/temporada |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

**Campos visíveis no front-end:**
- ✅ Nome do Projeto (coluna: `projeto`)
- ✅ Descrição (coluna: `descricao`)

---

### 3️⃣ CONTA CONTÁBIL
**Tabela:** `conta_contabil`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `Conta Contábil` | VARCHAR | Nome/código da conta (⚠️ com espaço e maiúsculas) |
| `descricao` | TEXT | Descrição da conta |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

**Campos visíveis no front-end:**
- ✅ Conta Contábil (coluna: `Conta Contábil`)
- ✅ Descrição (coluna: `descricao`)

---

## 🔧 Mapeamento Backend → Banco de Dados

### GET `/master-data` - Busca de Dados

#### SETOR
```typescript
masterData.setor = setores.map((item: any) => ({
  id: item.id,
  type: 'setor',
  name: item.setor || item.name,              // ← Coluna "setor"
  description: item.descricao || '',          // ← Coluna "descricao"
  responsavel: item.responsavel || '',        // ← Coluna "responsavel"
  createdAt: item.created_at,
  updatedAt: item.updated_at,
}));
```

#### PROJETO
```typescript
masterData.projeto = projetos.map((item: any) => ({
  id: item.id,
  type: 'projeto',
  name: item.projeto,                         // ← Coluna "projeto"
  description: item.descricao,                // ← Coluna "descricao"
  temporada: item.temporada,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
}));
```

#### CONTA CONTÁBIL
```typescript
masterData.conta_contabil = contas.map((item: any) => ({
  id: item.id,
  type: 'conta_contabil',
  name: item['Conta Contábil'] || item.conta_contabil || item.name, // ← Coluna "Conta Contábil"
  description: item.descricao || '',                                 // ← Coluna "descricao"
  createdAt: item.created_at,
  updatedAt: item.updated_at,
}));
```

---

### POST `/master-data` - Salvamento de Dados

#### SETOR
```typescript
dataToSave = {
  id: item.id,
  setor: item.name,                    // ← Salva em "setor"
  descricao: item.description || null, // ← Salva em "descricao"
  responsavel: item.responsavel || null,
  updated_at: new Date().toISOString(),
};
```

#### PROJETO
```typescript
dataToSave = {
  id: item.id,
  projeto: item.name,                  // ← Salva em "projeto"
  descricao: item.description || null, // ← Salva em "descricao"
  temporada: item.temporada || new Date().getFullYear(),
  updated_at: new Date().toISOString(),
};
```

#### CONTA CONTÁBIL
```typescript
dataToSave = {
  id: item.id,
  'Conta Contábil': item.name,         // ← Salva em "Conta Contábil"
  descricao: item.description || null, // ← Salva em "descricao"
  updated_at: new Date().toISOString(),
};
```

---

## 🚀 Como Aplicar as Alterações

### Passo 1: Adicionar Coluna Descrição no Banco (se necessário)

Execute este SQL no Supabase SQL Editor:

```sql
-- Adiciona coluna descricao em setor e conta_contabil
/supabase/migrations/ADD_DESCRICAO_COLUMNS.sql
```

Este script:
- ✅ Adiciona `descricao` na tabela `setor`
- ✅ Adiciona `descricao` na tabela `conta_contabil`
- ✅ Verifica se `descricao` existe em `projeto`

---

### Passo 2: Deploy da Edge Function ⚠️ **OBRIGATÓRIO**

O backend foi atualizado para mapear corretamente as colunas.

#### Via CLI:
```bash
supabase functions deploy make-server-02726c7c
```

#### Via Dashboard:
1. Acesse: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/functions
2. Encontre: `make-server-02726c7c`
3. Clique em **"Edit Function"**
4. Cole: Todo o conteúdo de `/supabase/functions/server/index.tsx`
5. Clique em **"Deploy"**

---

### Passo 3: Verificar Dados

**No SQL Editor:**
```sql
-- SETOR
SELECT setor, descricao, responsavel 
FROM setor 
LIMIT 3;

-- PROJETO
SELECT projeto, descricao, temporada 
FROM projeto 
LIMIT 3;

-- CONTA CONTÁBIL
SELECT "Conta Contábil", descricao 
FROM conta_contabil 
LIMIT 3;
```

**Na Aplicação:**
1. Recarregue a página (F5)
2. Vá em: Cadastros → Master Data → Protheus
3. Teste as 3 abas:
   - ✅ Setor (deve mostrar: Nome, Descrição, Responsável)
   - ✅ Projeto (deve mostrar: Nome, Descrição)
   - ✅ Conta Contábil (deve mostrar: Nome, Descrição)

---

## 🧪 Testes de Validação

### Teste 1: Criar novo Setor
1. Vá em: Master Data → Protheus → Setor
2. Clique em: **Adicionar**
3. Preencha:
   - Nome: "Teste Setor"
   - Descrição: "Descrição do teste"
   - Responsável: "João Silva"
4. Clique: **Salvar**
5. Verifique no banco:
   ```sql
   SELECT * FROM setor WHERE setor = 'Teste Setor';
   ```

**Resultado esperado:**
```
setor        | descricao           | responsavel
-------------|---------------------|------------
Teste Setor  | Descrição do teste  | João Silva
```

---

### Teste 2: Criar novo Projeto
1. Vá em: Master Data → Protheus → Projeto
2. Clique em: **Adicionar**
3. Preencha:
   - Nome: "Projeto Teste 2025"
   - Descrição: "Projeto de teste para validação"
4. Clique: **Salvar**
5. Verifique no banco:
   ```sql
   SELECT * FROM projeto WHERE projeto = 'Projeto Teste 2025';
   ```

**Resultado esperado:**
```
projeto             | descricao                        | temporada
--------------------|----------------------------------|----------
Projeto Teste 2025  | Projeto de teste para validação  | 2025
```

---

### Teste 3: Criar nova Conta Contábil
1. Vá em: Master Data → Protheus → Conta Contábil
2. Clique em: **Adicionar**
3. Preencha:
   - Conta Contábil: "1.01.001"
   - Descrição: "Conta de teste"
4. Clique: **Salvar**
5. Verifique no banco:
   ```sql
   SELECT * FROM conta_contabil WHERE "Conta Contábil" = '1.01.001';
   ```

**Resultado esperado:**
```
Conta Contábil | descricao
---------------|---------------
1.01.001       | Conta de teste
```

---

## 🐛 Troubleshooting

### Problema: Dados não aparecem após deploy

**Sintomas:**
- Lista vazia nas abas do Protheus
- Console mostra "0 items cadastrados"

**Solução:**
1. Verifique se a Edge Function foi deployada corretamente
2. Verifique os logs:
   ```
   https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/logs/edge-functions
   ```
3. Procure por:
   ```
   ✅ Setores carregados: X registros
   ✅ Projetos carregados: X registros
   ✅ Contas contábeis carregadas: X registros
   ```

---

### Problema: Erro "column does not exist"

**Sintomas:**
- Erro no console: `column "setor" does not exist`
- Ou: `column "projeto" does not exist`
- Ou: `column "Conta Contábil" does not exist`

**Causa:** As colunas ainda não foram renomeadas no banco.

**Solução:**
Execute o SQL de padronização:
```sql
/supabase/migrations/PADRONIZAR_NOMES_COLUNAS.sql
```

---

### Problema: Descrição não aparece

**Sintomas:**
- Campo "Descrição" aparece vazio mesmo após preencher
- Ou: Campo "Descrição" não existe no formulário

**Causa:** Coluna `descricao` não existe no banco.

**Solução:**
Execute:
```sql
/supabase/migrations/ADD_DESCRICAO_COLUMNS.sql
```

---

### Problema: Conta Contábil com erro de sintaxe

**Sintomas:**
- Erro: `syntax error at or near "Conta"`

**Causa:** Nome da coluna tem espaço e precisa de aspas duplas.

**Solução:** Já está corrigido no backend usando:
```typescript
item['Conta Contábil']  // ✅ Correto
// Não: item.Conta Contábil  // ❌ Errado
```

---

## 📊 Resumo das Mudanças

### Backend (`/supabase/functions/server/index.tsx`)

| Tipo | GET (Busca) | POST (Salva) |
|------|-------------|--------------|
| **Setor** | `item.setor` → `name`<br>`item.descricao` → `description`<br>`item.responsavel` → `responsavel` | `item.name` → `setor`<br>`item.description` → `descricao`<br>`item.responsavel` → `responsavel` |
| **Projeto** | `item.projeto` → `name`<br>`item.descricao` → `description` | `item.name` → `projeto`<br>`item.description` → `descricao` |
| **Conta Contábil** | `item['Conta Contábil']` → `name`<br>`item.descricao` → `description` | `item.name` → `'Conta Contábil'`<br>`item.description` → `descricao` |

---

### Front-end (`/components/MasterData.tsx`)

**Configuração dos subtipos:**
```typescript
const protheusSubTypes = [
  { 
    id: 'setor', 
    label: 'Setor', 
    icon: '🏢', 
    hasDescription: true,    // ✅ Mostra campo Descrição
    hasResponsavel: true     // ✅ Mostra campo Responsável
  },
  { 
    id: 'projeto', 
    label: 'Projeto', 
    icon: '📊', 
    hasDescription: true     // ✅ Mostra campo Descrição
  },
  { 
    id: 'conta_contabil', 
    label: 'Conta Contábil', 
    icon: '💰', 
    hasDescription: true     // ✅ Mostra campo Descrição
  },
];
```

**✅ Nenhuma alteração necessária no front-end!**

---

## ✅ Checklist de Verificação

Antes de considerar concluído, verifique:

- [ ] SQL executado para adicionar coluna `descricao`
- [ ] Edge Function deployada com sucesso
- [ ] Logs mostram dados sendo carregados corretamente
- [ ] Setor mostra: Nome, Descrição, Responsável
- [ ] Projeto mostra: Nome, Descrição
- [ ] Conta Contábil mostra: Nome, Descrição
- [ ] Consegue criar novos registros
- [ ] Consegue editar registros existentes
- [ ] Consegue deletar registros
- [ ] Filtro de busca funciona
- [ ] Visualização em Card funciona
- [ ] Visualização em Tabela funciona

---

## 📁 Arquivos Modificados

```
✅ /supabase/functions/server/index.tsx
   ├── GET /make-server-02726c7c/master-data    ← ATUALIZADO
   └── POST /make-server-02726c7c/master-data   ← ATUALIZADO

✅ /supabase/migrations/ADD_DESCRICAO_COLUMNS.sql  ← NOVO

✅ /components/MasterData.tsx                      ← Sem alterações (já estava correto)
```

---

## 🎯 Estrutura Final Esperada

### Tabela SETOR
```
28 registros | Campos: setor, descricao, responsavel
```

### Tabela PROJETO
```
18 registros | Campos: projeto, descricao, temporada
```

### Tabela CONTA_CONTABIL
```
147 registros | Campos: Conta Contábil, descricao
```

---

**Conecta Cup** | Integração Supabase Protheus - Revisada! ✅
