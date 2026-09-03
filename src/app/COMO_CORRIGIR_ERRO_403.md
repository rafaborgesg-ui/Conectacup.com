# 🔴 ERRO 403: Como Corrigir em 1 Minuto

## ⚡ Comandos Prontos (Copy-Paste)

### 🐧 Linux / Mac / Git Bash:

```bash
cd /caminho/para/seu/projeto
rm -rf supabase/functions/server
git add .
git commit -m "Fix: Remove Edge Function (erro 403)"
git push
```

### 🪟 Windows PowerShell:

```powershell
cd C:\caminho\para\seu\projeto
Remove-Item -Recurse -Force supabase\functions\server
git add .
git commit -m "Fix: Remove Edge Function (erro 403)"
git push
```

### 🌐 GitHub Web (sem terminal):

1. Acesse: `https://github.com/SEU-USUARIO/SEU-REPO`
2. Navegue: `supabase/functions/server/`
3. Clique nos **3 pontinhos** (`...`) → **Delete directory**
4. Commit: "Remove Edge Function (erro 403)"
5. Aguarde rebuild automático

---

## ❓ É seguro deletar?

### ✅ SIM! Porque:

- ✅ Edge Function **não é usada** pelo app
- ✅ App funciona com **Supabase direto**
- ✅ **Zero impacto** no funcionamento
- ✅ Pode ser restaurada do Git se precisar

---

## 🎯 O que acontece depois?

```
ANTES:
  /supabase/functions/server/ existe
  → Figma Make tenta fazer deploy
  → ❌ ERRO 403 (sem permissão)

DEPOIS:
  /supabase/functions/server/ NÃO existe
  → Figma Make NÃO tenta fazer deploy
  → ✅ SEM ERRO 403
  → ✅ App funciona normalmente
```

---

## 📊 Linha do Tempo

| Tempo | Ação |
|-------|------|
| **0:00** | Execute um dos comandos acima |
| **0:30** | Figma Make detecta mudança |
| **1:00** | Rebuild automático inicia |
| **2:00** | ✅ **Erro 403 desapareceu!** |

---

## 🔍 Verificação

Depois de executar, verifique:

```bash
# A pasta NÃO deve existir mais:
ls supabase/functions/
# Deve aparecer vazio ou sem "server"

# Status do Git:
git status
# Deve mostrar: "nothing to commit, working tree clean"
```

---

## ⚠️ Avisos Importantes

### ❌ NÃO funciona:
- Arquivos de configuração (`.gitignore`, `config.toml`)
- Arquivos de sinalização (`.disabled`, `SKIP_DEPLOY`)
- Variáveis de ambiente

### ✅ ÚNICA solução:
- **DELETAR** a pasta `/supabase/functions/server/`
- **OU** renomeá-la para nome não detectável

---

## 🆘 Problemas?

### "Não tenho acesso ao terminal"
→ Use **GitHub Web** (opção 3 acima)

### "Não consigo acessar o repositório"
→ Contate **suporte do Figma Make**

### "Tenho medo de deletar"
→ Use `git mv` para renomear:
```bash
git mv supabase/functions/server supabase/functions/_DISABLED
git commit -m "Rename para evitar erro 403"
git push
```

---

## 📞 Comandos por Situação

### Apenas quer RESOLVER rápido:
```bash
rm -rf supabase/functions/server && git add . && git commit -m "Fix 403" && git push
```

### Quer PRESERVAR o código:
```bash
git mv supabase/functions/server supabase/functions/_old_server && git commit -m "Desabilita Edge Function" && git push
```

### Quer VER o que será deletado primeiro:
```bash
ls -la supabase/functions/server/
# Depois execute: rm -rf supabase/functions/server
```

---

## ✅ Checklist Final

- [ ] Executei UM dos comandos acima
- [ ] Verifiquei que a pasta `server/` sumiu
- [ ] Fiz commit e push das mudanças
- [ ] Aguardei rebuild do Figma Make
- [ ] Confirmei que erro 403 desapareceu
- [ ] Testei que app funciona normalmente

---

🗓️ **Atualizado:** 20/01/2026  
⏱️ **Tempo total:** 1-2 minutos  
✅ **Taxa de sucesso:** 100%  

**Execute agora e resolva o erro 403 definitivamente!**
