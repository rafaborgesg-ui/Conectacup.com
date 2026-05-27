# 🎯 SOLUÇÃO DEFINITIVA DO ERRO RLS

## ❌ O PROBLEMA VERDADEIRO

A cláusula `USING (is_active = true)` verifica o estado da linha **APÓS** a atualização ser aplicada.

**Fluxo do que acontecia:**

1. Você tenta atualizar: `UPDATE conference_sessions SET is_active = false WHERE id = 123`
2. PostgreSQL aplica a mudança na memória: `is_active` vira `false`
3. PostgreSQL verifica a política RLS: `USING (is_active = true)`
4. ❌ **ERRO!** A linha agora tem `is_active = false`, não atende ao critério!

## ✅ A SOLUÇÃO CORRETA

Mudar `USING (is_active = true)` para `USING (true)`.

### SQL CORRIGIDO

```sql
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar sessões ativas" ON public.conference_sessions;

CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (true)       -- ✅ Permite atualizar QUALQUER sessão
  WITH CHECK (true); -- ✅ Permite QUALQUER novo valor
```

---

## 🚀 COMO EXECUTAR NO SUPABASE

1. Copie o SQL acima (bloco entre as três crases ```)
2. Acesse: https://supabase.com/dashboard
3. Selecione seu projeto
4. Menu lateral → **SQL Editor**
5. Clique em **+ New query**
6. Cole o SQL
7. Clique em **RUN**
8. Aguarde mensagem **Success**

---

## ✅ PRONTO!

Agora você pode salvar e finalizar conferências normalmente!

O erro "new row violates row-level security policy" não aparecerá mais.

---

**Data:** 16/03/2026  
**Sistema:** Conecta Cup - Conferência de Pneus
