# ⚠️ Edge Functions - NÃO FAZER DEPLOY

## ❌ Erro de Deploy (403)

Se você está vendo este arquivo, provavelmente está tentando fazer deploy da Edge Function `server/` e está recebendo erro **403 (Forbidden)**.

```
Error while deploying: XHR for "/api/integrations/supabase/.../edge_functions/make-server/deploy" failed with status 403
```

## ✅ SOLUÇÃO: Ignorar esta pasta

**O app NÃO precisa de Edge Functions!**

- ✅ App funciona 100% com **Supabase direto**
- ✅ Autenticação via `@supabase/supabase-js`
- ✅ Queries diretas no banco via RLS
- ✅ Sem servidor intermediário necessário

## 🚫 Por que não fazer deploy?

1. **Figma Make não tem permissão** - Erro 403
2. **Edge Function é legado** - Código antigo não usado
3. **App não precisa** - Tudo funciona sem ela

## 📁 Estrutura Antiga (legado)

```
/supabase/functions/server/
├── index.tsx      ❌ Não usar
└── kv_store.tsx   ❌ Não usar
```

## 🏗️ Estrutura Atual (2026)

```
React App → Supabase Database (direto)
```

## 📖 Mais Informações

Veja: `/EDGE_FUNCTION_DESABILITADA.md`

---

**Data:** 20/01/2026  
**Status:** Edge Functions desabilitadas  
**Impacto:** ✅ Zero - App funciona perfeitamente sem elas
