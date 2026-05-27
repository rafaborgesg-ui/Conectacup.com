# 🚨 ERRO 403 - AÇÃO NECESSÁRIA

## ⚠️ SITUAÇÃO ATUAL

```
❌ Error while deploying: XHR for edge_functions/make-server/deploy failed with status 403
```

**Status:** Todas as tentativas de desabilitar via configuração **FALHARAM**.

**Causa:** O Figma Make **IGNORA** arquivos de configuração e força o deploy de qualquer pasta em `/supabase/functions/`.

**Solução:** Você **DEVE** renomear ou deletar a pasta manualmente.

---

## ✅ SOLUÇÃO OBRIGATÓRIA

### 🎯 OPÇÃO 1: Via GitHub Web Interface (SEM TERMINAL)

Se você não quer usar terminal, faça direto no GitHub:

1. **Acesse:** https://github.com/SEU-USUARIO/SEU-REPO/tree/main/supabase/functions
2. **Clique** na pasta `server/`
3. **Clique** nos 3 pontinhos `...` → **Delete directory**
4. **Commit:** "Remove Edge Function não usada (erro 403)"
5. **Aguarde** o Figma Make fazer rebuild

✅ **Pronto!** O erro 403 vai sumir.

---

### 🎯 OPÇÃO 2: Via Terminal (MAIS RÁPIDO)

Abra o terminal e execute **UM** dos comandos abaixo:

#### **Renomear (preserva o código):**
```bash
cd /caminho/para/seu/projeto
mv supabase/functions/server supabase/functions/_DISABLED_server
git add .
git commit -m "Fix: Renomeia Edge Function para evitar erro 403"
git push
```

#### **Deletar (remove completamente):**
```bash
cd /caminho/para/seu/projeto
rm -rf supabase/functions/server
git add .
git commit -m "Fix: Remove Edge Function não usada (erro 403)"
git push
```

---

### 🎯 OPÇÃO 3: Via VS Code / Editor

1. **Abra** o projeto no VS Code (ou seu editor)
2. **Localize** a pasta `supabase/functions/server/`
3. **Clique direito** → **Delete** (ou **Rename** para `_DISABLED_server`)
4. **Abra o terminal integrado** (Ctrl + `)
5. **Execute:**
   ```bash
   git add .
   git commit -m "Fix: Remove Edge Function (erro 403)"
   git push
   ```

---

## ❓ Por que DEVO fazer isso?

### ✅ É SEGURO:
- ✅ A Edge Function **NÃO é usada** pelo app
- ✅ O app funciona 100% com **Supabase direto**
- ✅ Deletar/renomear **NÃO quebra nada**

### ❌ Arquivos de configuração NÃO funcionam:
- ❌ `.gitignore` → Ignorado pelo Figma Make
- ❌ `config.toml` → Ignorado pelo Figma Make
- ❌ `.funcignore` → Ignorado pelo Figma Make
- ❌ `SKIP_DEPLOY` → Ignorado pelo Figma Make

### ✅ Única solução que funciona:
- ✅ **RENOMEAR** a pasta para nome que não seja detectado
- ✅ **DELETAR** a pasta completamente

---

## 🔍 Verificação

Após aplicar a solução:

```bash
# Verifique que a pasta não existe mais:
ls supabase/functions/

# Deve aparecer APENAS:
# (vazio ou outras pastas, MAS NÃO "server")
```

---

## 📊 Comparação

| Método | Funciona? | Por quê? |
|--------|-----------|----------|
| Arquivos de configuração | ❌ | Figma Make ignora |
| `.gitignore` | ❌ | Figma Make ignora |
| `config.toml` | ❌ | Figma Make ignora |
| **Renomear pasta** | ✅ | **Pasta não é mais detectada** |
| **Deletar pasta** | ✅ | **Pasta não existe** |

---

## 🆘 NÃO tenho acesso ao código?

Se você **NÃO consegue** acessar o código via terminal/GitHub/editor:

### Entre em contato com:
1. **Suporte do Figma Make**
2. **Explique:**
   ```
   Meu projeto tem erro 403 ao tentar fazer deploy de Edge Function.
   A pasta /supabase/functions/server/ precisa ser REMOVIDA ou RENOMEADA.
   Esta Edge Function não é usada pelo app.
   ```
3. **Peça para eles removerem** a pasta do repositório

---

## ⏱️ Quanto tempo leva?

- **Via GitHub Web:** 2 minutos
- **Via Terminal:** 1 minuto
- **Via Editor:** 2 minutos
- **Via Suporte:** 1-3 dias úteis

---

## 🎯 AÇÃO IMEDIATA

**ESCOLHA UMA** das opções acima e execute **AGORA**.

**Não há outra solução.** Arquivos de configuração não funcionam com Figma Make.

---

## ✅ Após executar:

1. ✅ **Aguarde** o Figma Make fazer rebuild (automático)
2. ✅ **Verifique** que o erro 403 desapareceu
3. ✅ **Confirme** que o app funciona normalmente

---

## 📞 Precisa de ajuda?

**Comandos prontos para copy-paste:**

### Se preferir DELETAR:
```bash
cd /caminho/para/seu/projeto
rm -rf supabase/functions/server
git add .
git commit -m "Fix: Remove Edge Function (erro 403)"
git push
```

### Se preferir RENOMEAR:
```bash
cd /caminho/para/seu/projeto
mv supabase/functions/server supabase/functions/_DISABLED_server
git add .
git commit -m "Fix: Desabilita Edge Function (erro 403)"
git push
```

### Se preferir usar GitHub Web:
1. Acesse: https://github.com/SEU-USUARIO/SEU-REPO
2. Navegue até: `supabase/functions/server/`
3. Delete a pasta via interface web

---

🗓️ **Data:** 20/01/2026  
🚨 **Status:** **AÇÃO OBRIGATÓRIA**  
⏰ **Tempo:** 1-2 minutos  

✅ **Execute UMA das opções acima para resolver o erro 403 definitivamente!**
