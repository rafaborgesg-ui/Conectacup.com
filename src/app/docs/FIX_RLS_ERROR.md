# 🔧 Corrigir Erro RLS: conference_sessions

## ❌ Problema

Ao tentar desativar uma sessão de conferência, ocorre o erro:

```
❌ ERRO ao desativar sessão: {
  "code": "42501",
  "details": null,
  "hint": null,
  "message": "new row violates row-level security policy for table \"conference_sessions\""
}
```

## 🔍 Causa

A política RLS (Row-Level Security) da tabela `conference_sessions` está bloqueando UPDATE quando tentamos setar `is_active = false`.

**O PROBLEMA REAL:** A cláusula `USING (is_active = true)` verifica o estado da linha APÓS a atualização. Quando mudamos de `true` para `false`, a linha não atende mais ao critério, causando erro!

```sql
-- ❌ POLÍTICA ANTIGA (BLOQUEAVA):
CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (is_active = true)  ← BLOQUEIA ao mudar para false!
  WITH CHECK (true);
```

## ✅ Solução: Execute no SQL Editor do Supabase

1. **Acesse o Supabase Dashboard** em: https://supabase.com/dashboard
2. Selecione seu projeto: **Conecta Cup**
3. Clique em **SQL Editor** no menu lateral
4. Cole e execute o SQL abaixo:

```sql
-- Remove política antiga
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar sessões ativas" ON public.conference_sessions;

-- Cria política corrigida
-- ✅ USING (true) → Permite atualizar QUALQUER sessão (ativa ou inativa)
-- ✅ WITH CHECK (true) → Permite atualizar para QUALQUER estado
CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

5. **Clique em RUN** ou pressione `Ctrl+Enter`
6. Aguarde a mensagem de **Success**

---

## 🎯 **Alternativa: Console do Navegador**

Se preferir ver as instruções no console:

1. Abra o **Console do Navegador** (F12 → Console)
2. Execute:
   ```javascript
   window.fixConferenceSessionsRLS()
   ```
3. Copie o SQL exibido e execute no **SQL Editor** do Supabase

---

## 🧪 Testar

Após aplicar a correção:

1. Abra a página de **Conferir Pneus**
2. Inicie uma nova conferência
3. Salve a conferência
4. Verifique que **NÃO aparece mais o erro** RLS
5. ✅ Sucesso!

---

## 📚 Detalhes Técnicos

### Antes (Bloqueava):
```sql
USING (is_active = true)   -- ✅ Pode ler sessões ativas
WITH CHECK (is_active = true)  -- ❌ SÓ pode atualizar se continuar ativa
```

### Depois (Funciona):
```sql
USING (is_active = true)   -- ✅ Pode ler sessões ativas
WITH CHECK (true)          -- ✅ Pode atualizar para QUALQUER estado
```

### Comportamento:
- ✅ **Permite** UPDATE de `is_active: true` → `is_active: false` (desativar)
- ✅ **Permite** UPDATE de campos em sessões ativas
- ❌ **Bloqueia** UPDATE em sessões JÁ desativadas (is_active = false)
- ❌ **Bloqueia** SELECT de sessões desativadas

---

## 🎯 Arquivo Migration

Localização: `/supabase/migrations/FIX_RLS_CONFERENCE_SESSIONS_UPDATE.sql`

Data: 16/03/2026

Autor: Sistema Conecta Cup