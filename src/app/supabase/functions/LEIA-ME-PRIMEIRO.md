# ⚠️ ATENÇÃO: Esta pasta causa ERRO 403

## 🔴 Problema

A pasta `server/` neste diretório causa erro de deploy:

```
Error 403: XHR for edge_functions/make-server/deploy failed
```

## ✅ SOLUÇÃO

**RENOMEIE** a pasta `server/` para `_server_disabled`:

### Via Terminal:
```bash
mv supabase/functions/server supabase/functions/_server_disabled
```

### Via Interface Gráfica:
1. Clique com botão direito em `server/`
2. Selecione "Renomear"
3. Renomeie para: `_server_disabled`

## ❓ Por quê?

- ❌ Figma Make **não tem permissão** para deploy de Edge Functions
- ✅ Esta Edge Function **não é necessária** para o app funcionar
- ✅ App funciona 100% com **Supabase direto**

## 📖 Mais informações

Veja: `/README_FIX_403.md`

---

🗓️ 20/01/2026
