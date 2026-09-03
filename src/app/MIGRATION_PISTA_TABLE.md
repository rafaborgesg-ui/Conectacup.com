# 🏁 Migration: Tabela Pista Separada

## 📋 Resumo
Criação de tabela dedicada `pista` para armazenar dados de pistas separadamente da tabela `master_data`.

---

## ✅ O que foi implementado

### 1. **Nova Tabela SQL: `pista`**
- ✅ Colunas: `id`, `nome`, `endereco`, `coordenadas`, `created_at`, `updated_at`, `created_by`, `updated_by`
- ✅ Políticas RLS configuradas
- ✅ Trigger automático para `updated_at`
- ✅ Migração automática de dados existentes de `master_data`

### 2. **Novo Backend: `/utils/pistaStorage.ts`**
- ✅ `getPistas()` - Busca todas as pistas
- ✅ `getPistaById(id)` - Busca uma pista específica
- ✅ `createPista(pista)` - Cria nova pista
- ✅ `updatePista(id, pista)` - Atualiza pista
- ✅ `deletePista(id)` - Deleta pista
- ✅ `searchPistas(term)` - Pesquisa pistas

### 3. **Componente Atualizado: `MasterData.tsx`**
- ✅ Integração com nova tabela `pista`
- ✅ Lógica de CRUD separada para pistas
- ✅ Mantém compatibilidade com outros tipos de master data

---

## 🚀 Como Executar a Migration

### **Passo 1: Acessar SQL Editor do Supabase**

Abra o SQL Editor do seu projeto:

```
https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql
```

### **Passo 2: Executar Migration SQL**

1. Copie TODO o conteúdo do arquivo:
   ```
   /supabase/migrations/20250128000000_create_pista_table.sql
   ```

2. Cole no SQL Editor

3. Clique em **RUN** (ou pressione `Ctrl+Enter`)

4. Aguarde a confirmação de sucesso

### **Passo 3: Verificar Dados Migrados**

Execute esta query para verificar se os dados foram migrados:

```sql
SELECT * FROM pista;
```

Você deverá ver as pistas que estavam em `master_data` agora na nova tabela.

### **Passo 4: Recarregar a Aplicação**

Pressione `F5` ou `Ctrl+R` para recarregar a página.

---

## 📊 Estrutura da Tabela `pista`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Identificador único (PK) |
| `nome` | TEXT | Nome da pista (NOT NULL) |
| `endereco` | TEXT | Endereço completo |
| `coordenadas` | TEXT | Coordenadas (lat, lng) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |
| `created_by` | UUID | Usuário criador (FK auth.users) |
| `updated_by` | UUID | Usuário que atualizou (FK auth.users) |

---

## 🔐 Políticas RLS Configuradas

- ✅ **SELECT**: Todos usuários autenticados podem ler
- ✅ **INSERT**: Todos usuários autenticados podem criar
- ✅ **UPDATE**: Todos usuários autenticados podem atualizar
- ✅ **DELETE**: Todos usuários autenticados podem deletar

---

## 🧪 Testando a Nova Estrutura

### 1. **Criar Nova Pista**
1. Acesse Master Data → Pista
2. Clique em "Adicionar"
3. Preencha:
   - Nome da Pista: `Interlagos`
   - Endereço: `Av. Senador Teotônio Vilela, 261 - São Paulo, SP`
   - Coordenadas: `-23.70351, -46.697068`
4. Clique em "Salvar"

### 2. **Editar Pista**
1. Clique no ícone de editar (✏️) em uma pista
2. Modifique os campos
3. Clique em "Salvar"

### 3. **Deletar Pista**
1. Clique no ícone de deletar (🗑️)
2. Confirme a exclusão

### 4. **Verificar no Banco**
```sql
-- Ver todas as pistas
SELECT * FROM pista ORDER BY nome;

-- Ver pistas com audit trail
SELECT 
  nome,
  endereco,
  coordenadas,
  created_at,
  updated_at
FROM pista
ORDER BY created_at DESC;
```

---

## 🔧 Arquivos Modificados/Criados

### ✅ Criados:
- `/supabase/migrations/20250128000000_create_pista_table.sql`
- `/utils/pistaStorage.ts`
- `/MIGRATION_PISTA_TABLE.md`

### ✅ Modificados:
- `/components/MasterData.tsx` - Lógica de pista usa nova tabela
- `/utils/storage.ts` - Comentário sobre separação de pista

---

## ❓ FAQ

### **P: Os dados antigos de pista serão perdidos?**
**R:** Não! A migration migra automaticamente todos os dados existentes de `master_data` para a nova tabela `pista`.

### **P: Preciso alterar algum código manualmente?**
**R:** Não! Toda a integração já foi feita automaticamente.

### **P: O que acontece com a coluna 'pista' em outras tabelas?**
**R:** Nada muda. Outras tabelas como `stock_entries` e `gas_programming` continuam usando o campo `pista` normalmente. A mudança afeta apenas a tabela de cadastro de pistas em Master Data.

### **P: Posso reverter a migration?**
**R:** Sim, mas não é recomendado. Se precisar, execute:
```sql
DROP TABLE IF EXISTS pista CASCADE;
```

---

## ✅ Checklist de Validação

Após executar a migration, verifique:

- [ ] Tabela `pista` existe no banco
- [ ] Dados foram migrados de `master_data`
- [ ] Consegue criar nova pista pela interface
- [ ] Consegue editar pista existente
- [ ] Consegue deletar pista
- [ ] Campos `created_by` e `updated_by` são preenchidos automaticamente
- [ ] Campo `updated_at` atualiza automaticamente ao editar

---

## 🎯 Benefícios da Nova Estrutura

✅ **Auditoria Completa**: `created_by` e `updated_by` rastreiam quem fez cada mudança

✅ **Timestamps Automáticos**: `updated_at` atualiza sozinho

✅ **Tipo de Dados Correto**: Colunas específicas ao invés de JSON genérico

✅ **Performance**: Consultas mais rápidas com colunas indexadas

✅ **Escalabilidade**: Mais fácil adicionar campos novos no futuro

✅ **RLS Configurado**: Segurança desde o início

---

**Conecta Cup** | Migration Pista 🏁
