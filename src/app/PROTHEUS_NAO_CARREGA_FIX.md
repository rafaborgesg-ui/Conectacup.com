# 🔧 FIX: Dados do Protheus Não Carregam

## ❌ Problema

Você vê "0 items" ou "Nenhum item cadastrado" nas abas Setor, Projeto ou Conta Contábil, mesmo que os dados existam no Supabase.

---

## ✅ Solução Rápida (3 passos)

### Passo 1: Verificar se as Tabelas Existem

1. Acesse: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/editor
2. Verifique se essas 3 tabelas existem:
   - ✅ `setor` (deve ter 28 registros)
   - ✅ `projeto` (deve ter 18 registros)
   - ✅ `conta_contabil` (deve ter 147 registros)

**Se NÃO existirem:**
```bash
# Execute no SQL Editor:
/supabase/migrations/protheus_tables.sql
```

---

### Passo 2: Deploy da Edge Function

A Edge Function precisa ser atualizada para buscar das novas tabelas.

#### Opção A: Via CLI (Rápido)

```bash
# 1. Instale o Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Link com o projeto
supabase link --project-ref nflgqugaabtxzifyhjor

# 4. Deploy
supabase functions deploy make-server-02726c7c
```

#### Opção B: Via Dashboard

1. Acesse: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/functions
2. Encontre: `make-server-02726c7c`
3. Clique em: **"Edit Function"**
4. Cole: Todo o conteúdo de `/supabase/functions/server/index.tsx`
5. Clique em: **"Deploy"**

---

### Passo 3: Verificar se Funcionou

1. **Recarregue a aplicação** (F5)
2. **Vá em**: Cadastros → Master Data → Protheus
3. **Veja as abas**: Setor (28), Projeto (18), Conta Contábil (147)

---

## 🔍 Diagnóstico Detalhado

### Verificar Tabelas no Supabase

Execute no SQL Editor:

```sql
-- 1. Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('setor', 'projeto', 'conta_contabil')
ORDER BY table_name;

-- Resultado esperado:
-- conta_contabil
-- projeto
-- setor
```

```sql
-- 2. Contar registros
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

### Verificar Edge Function

Execute no Terminal:

```bash
curl https://nflgqugaabtxzifyhjor.supabase.co/functions/v1/make-server-02726c7c/server/health
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Server is running"
}
```

---

### Verificar Logs da Edge Function

1. Acesse: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/logs/edge-functions
2. Filtre: `make-server-02726c7c`
3. Procure por:
   ```
   ✅ Setores carregados: 28 registros
   ✅ Projetos carregados: 18 registros
   ✅ Contas contábeis carregadas: 147 registros
   ```

**Se NÃO aparecer**: A Edge Function não foi deployada. Volte ao Passo 2.

---

### Verificar no Console do Navegador

1. Abra a aplicação
2. Pressione **F12**
3. Vá na aba **Console**
4. Vá em: **Cadastros → Master Data → Protheus → Setor**
5. Procure por:
   ```
   ✅ Master data carregado: X tipos
   ```

**Se aparecer erro**:
- `PGRST205` ou `relation does not exist` → Tabelas não criadas (Passo 1)
- `404 Not Found` → Edge Function não deployada (Passo 2)
- `401 Unauthorized` → Problema de autenticação (faça logout/login)

---

## 🐛 Erros Comuns

### Erro: "relation 'setor' does not exist"

**Causa**: Tabelas não foram criadas no Supabase.

**Solução**:
```bash
# Execute no SQL Editor:
/supabase/migrations/protheus_tables.sql
```

---

### Erro: "Function not found" ou "404"

**Causa**: Edge Function não foi deployada ou está desatualizada.

**Solução**: Execute o Passo 2 (Deploy da Edge Function)

---

### Erro: "permission denied"

**Causa**: Policies de RLS não configuradas corretamente.

**Solução**: Execute novamente:
```bash
# Limpa e recria tudo:
/supabase/migrations/LIMPAR_PROTHEUS.sql
/supabase/migrations/protheus_tables.sql
```

---

### Dados aparecem no Supabase mas não no Front-end

**Causa**: Edge Function não foi atualizada.

**Solução**: 
1. Execute o Passo 2 (Deploy)
2. Recarregue a aplicação (F5)
3. Limpe o cache se necessário (Ctrl+Shift+Delete)

---

## 📋 Checklist Completo

Use este checklist para garantir que tudo está correto:

- [ ] **Tabelas criadas no Supabase?**
  - [ ] `setor` existe com 28 registros?
  - [ ] `projeto` existe com 18 registros?
  - [ ] `conta_contabil` existe com 147 registros?

- [ ] **Edge Function deployada?**
  - [ ] Health check retorna 200 OK?
  - [ ] Logs mostram "Setores carregados: 28"?

- [ ] **Front-end funcionando?**
  - [ ] Recarreguei a página (F5)?
  - [ ] Console mostra "Master data carregado"?
  - [ ] Abas mostram contagem correta?

---

## 🎯 Resumo Executivo

**Para resolver rapidamente:**

```bash
# 1. Criar tabelas
Execute: /supabase/migrations/protheus_tables.sql no SQL Editor

# 2. Fazer deploy da edge function
supabase functions deploy make-server-02726c7c

# 3. Recarregar aplicação
Pressione F5 no navegador
```

**Tempo total**: ~3 minutos

---

## 📚 Documentação Relacionada

- [DOCUMENTACAO_PROTHEUS.md](/DOCUMENTACAO_PROTHEUS.md) - Índice completo
- [IMPORTAR_PROTHEUS_RAPIDO.md](/IMPORTAR_PROTHEUS_RAPIDO.md) - Importar dados
- [DEPLOY_EDGE_FUNCTION_PROTHEUS.md](/DEPLOY_EDGE_FUNCTION_PROTHEUS.md) - Deploy detalhado
- [ESTRUTURA_PROTHEUS.md](/ESTRUTURA_PROTHEUS.md) - Estrutura das tabelas

---

**Conecta Cup** | Troubleshooting Protheus 🔧
