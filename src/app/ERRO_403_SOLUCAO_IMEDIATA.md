# 🔴 ERRO 403 - SOLUÇÃO IMEDIATA

## Problema Detectado

```
Error while deploying: XHR for "/api/integrations/supabase/.../edge_functions/make-server/deploy" failed with status 403
```

## ✅ Causa

A pasta `/supabase/functions/server/` está fazendo o Figma Make tentar fazer deploy de uma Edge Function, mas ele **não tem permissão** para isso.

## ✅ SOLUÇÃO RÁPIDA (2 opções)

### Opção 1: Renomear a pasta (RECOMENDADO)

Renomeie a pasta para começar com underscore:

```
/supabase/functions/server  →  /supabase/functions/_server_disabled
```

**Como fazer:**
1. No seu sistema de arquivos local
2. Renomeie a pasta `server` para `_server_disabled`
3. Faça commit e push das mudanças

### Opção 2: Deletar a pasta

A Edge Function **NÃO é necessária** para o app funcionar! Você pode deletá-la com segurança.

```bash
rm -rf supabase/functions/server
```

## 🎯 Por que funciona?

- O Figma Make escaneia `/supabase/functions/` procurando por Edge Functions
- Ao renomear para `_server_disabled`, a pasta é ignorada
- O app funciona 100% sem essa função

## 📝 Nota

A Edge Function `server` era usada para desenvolvimento local, mas o app atual usa **Supabase diretamente** via SDK, então ela não é mais necessária.

---

**Após aplicar a solução, o erro 403 desaparecerá e a aplicação carregará normalmente!** ✅
