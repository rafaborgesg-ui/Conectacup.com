# 🚀 Deploy Edge Function - Suporte às Novas Tabelas Protheus

## 📋 O que foi alterado?

Atualizei a Edge Function `/supabase/functions/server/index.tsx` para suportar as **3 novas tabelas** do Protheus:

### Endpoints Atualizados:

1. **GET `/make-server-02726c7c/master-data`**
   - ✅ Busca dados de `setor` (28 registros)
   - ✅ Busca dados de `projeto` (18 registros)
   - ✅ Busca dados de `conta_contabil` (147 registros)
   - ✅ Mantém compatibilidade com `master_data` para outros tipos

2. **POST `/make-server-02726c7c/master-data`**
   - ✅ Salva em `setor` quando `type === 'setor'`
   - ✅ Salva em `projeto` quando `type === 'projeto'`
   - ✅ Salva em `conta_contabil` quando `type === 'conta_contabil'`
   - ✅ Salva em `master_data` para outros tipos

3. **DELETE `/make-server-02726c7c/master-data/:id`**
   - ✅ Tenta deletar de todas as tabelas (setor, projeto, conta_contabil, master_data)

---

## 🚀 Como Fazer o Deploy

### Opção 1: Deploy via Supabase CLI (Recomendado)

```bash
# 1. Instale o Supabase CLI (se ainda não tiver)
npm install -g supabase

# 2. Faça login no Supabase
supabase login

# 3. Link com seu projeto
supabase link --project-ref nflgqugaabtxzifyhjor

# 4. Deploy da função
supabase functions deploy make-server-02726c7c
```

---

### Opção 2: Deploy via Dashboard

1. **Acesse**: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/functions

2. **Encontre** a função `make-server-02726c7c`

3. **Clique** em "Edit Function"

4. **Cole** todo o conteúdo do arquivo `/supabase/functions/server/index.tsx`

5. **Clique** em "Deploy"

6. **Aguarde** a mensagem de sucesso

---

## ✅ Verificação

Após o deploy, verifique se está funcionando:

### 1. Teste o Health Check

```bash
curl https://nflgqugaabtxzifyhjor.supabase.co/functions/v1/make-server-02726c7c/server/health
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-11-27T..."
}
```

### 2. Teste o Master Data

Abra o Console do navegador e execute:

```javascript
// Na aplicação Conecta Cup
// Vá em: Cadastros → Master Data → Protheus → Setor
// Você deve ver: 28 setores carregados
```

---

## 🔍 Logs de Debug

Para ver se os dados estão sendo carregados:

1. Acesse: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/logs/edge-functions

2. Filtre por função: `make-server-02726c7c`

3. Procure por logs:
   ```
   ✅ Setores carregados: 28 registros
   ✅ Projetos carregados: 18 registros
   ✅ Contas contábeis carregadas: 147 registros
   ✅ Master data carregado: X tipos
   ```

---

## 🐛 Troubleshooting

### Erro: "Function not found"

**Solução**: A função ainda não foi deployada. Execute o deploy conforme instruções acima.

---

### Erro: "relation 'setor' does not exist"

**Solução**: As tabelas ainda não foram criadas. Execute:
```bash
# No Supabase SQL Editor
/supabase/migrations/protheus_tables.sql
```

---

### Dados não aparecem no front-end

**Checklist**:
- [ ] Tabelas criadas no Supabase? → `/supabase/migrations/protheus_tables.sql`
- [ ] Edge Function deployada? → Ver instruções acima
- [ ] Logs mostram dados carregados? → Ver seção "Logs de Debug"
- [ ] Console do navegador mostra erros? → F12 → Console

---

## 📊 Compatibilidade

### ✅ Retrocompatibilidade Mantida

A atualização é **100% retrocompatível**:

- ✅ Tipos antigos (categoria, pneu, carros, pista, etc.) continuam funcionando
- ✅ `master_data` ainda é consultada para tipos legados
- ✅ Nenhuma funcionalidade existente foi quebrada

### 🆕 Novos Tipos Suportados

- ✅ `setor` → Tabela `setor`
- ✅ `projeto` → Tabela `projeto`
- ✅ `conta_contabil` → Tabela `conta_contabil`

---

## 📁 Arquivos Modificados

```
/supabase/functions/server/index.tsx
├── GET /make-server-02726c7c/master-data    ← ATUALIZADO
├── POST /make-server-02726c7c/master-data   ← ATUALIZADO
└── DELETE /make-server-02726c7c/master-data ← ATUALIZADO
```

---

## 🎯 Próximos Passos

Após o deploy:

1. ✅ **Recarregue a aplicação** (F5)
2. ✅ **Vá em**: Cadastros → Master Data → Protheus
3. ✅ **Veja as abas**: Setor, Projeto, Conta Contábil
4. ✅ **Confirme**: 28 + 18 + 147 = 193 registros

---

**Conecta Cup** | Edge Function atualizada com sucesso! 🚀
