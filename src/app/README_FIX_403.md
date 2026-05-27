# 🚨 ERRO 403: Edge Function Deploy - SOLUÇÃO RÁPIDA

```
❌ Error while deploying: XHR for "/api/integrations/supabase/.../edge_functions/make-server/deploy" 
   failed with status 403
```

---

## ⚡ SOLUÇÃO RÁPIDA (2 minutos)

### **Via Terminal/Git Bash:**

```bash
# 1. Clone o projeto (se ainda não tem)
git clone <seu-repositorio>
cd <seu-projeto>

# 2. Renomeia a pasta problemática
mv supabase/functions/server supabase/functions/_server_disabled

# 3. Commit e push
git add .
git commit -m "Fix: Desabilita Edge Function (erro 403)"
git push
```

### **Via Scripts Automáticos:**

**Linux/Mac:**
```bash
chmod +x fix-403-error.sh
./fix-403-error.sh
```

**Windows (PowerShell):**
```powershell
.\fix-403-error.ps1
```

---

## ❓ Por que isso funciona?

O Figma Make detecta automaticamente qualquer pasta em `/supabase/functions/<nome>/` e tenta fazer deploy, mas **não tem permissão** (403).

Renomeando `server` para `_server_disabled`, a pasta não é mais reconhecida como Edge Function válida.

---

## ✅ Verificação

Após aplicar a solução:

1. ✅ Faça **rebuild** no Figma Make
2. ✅ Verifique que o **erro 403 desapareceu**
3. ✅ Confirme que o **app funciona normalmente**

---

## 🛡️ Segurança

**"Posso deletar a pasta?"**

✅ **SIM!** A Edge Function não é usada. O app funciona 100% com Supabase direto.

**"E se eu precisar dela no futuro?"**

✅ Está no histórico Git e pode ser restaurada a qualquer momento.

---

## 📊 Status do App

| Componente | Precisa da Edge Function? | Status |
|------------|---------------------------|--------|
| Autenticação | ❌ Não | ✅ Funciona com Supabase Auth |
| Database CRUD | ❌ Não | ✅ Funciona com RLS |
| Frontend | ❌ Não | ✅ Funciona normalmente |

**Conclusão:** A Edge Function é código legado e pode ser removida sem impacto! 🎉

---

## 📚 Documentação Completa

Para mais detalhes, veja:
- 📖 [`/SOLUCAO_DEFINITIVA_403.md`](./SOLUCAO_DEFINITIVA_403.md) - Solução completa
- 📖 [`/EDGE_FUNCTION_DESABILITADA.md`](./EDGE_FUNCTION_DESABILITADA.md) - Documentação técnica

---

## 🆘 Precisa de Ajuda?

Se você **não tem acesso ao terminal/Git**:

1. Entre em contato com o **suporte do Figma Make**
2. Peça para remover a pasta `/supabase/functions/server/`
3. Explique que causa erro 403 e não é necessária

---

✅ **Aplicando esta solução, o erro 403 será resolvido definitivamente!**

🗓️ **Atualizado:** 20/01/2026
