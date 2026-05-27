# 🔐 Configuração Google OAuth - Conecta Cup

## ✅ CORREÇÃO APLICADA NO CÓDIGO

O redirecionamento do Google OAuth foi atualizado para usar o domínio oficial:

### **Arquivos Alterados:**

1. **`/components/Login.tsx`** (linha 179)
   ```typescript
   redirectTo: 'https://www.conectacup.com/'
   ```

2. **`/supabase/functions/server/index.tsx`** (linha 605)
   ```typescript
   redirectTo: 'https://www.conectacup.com/reset-password'
   ```

---

## 🎯 PRÓXIMO PASSO: Configurar no Supabase Dashboard

Para o Google OAuth funcionar corretamente, você **PRECISA** configurar as URLs permitidas no Supabase Dashboard:

### **1. Acessar Configurações de Auth**

1. Acesse: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/auth/url-configuration
2. Ou: **Project Settings** → **Authentication** → **URL Configuration**

---

### **2. Configurar Redirect URLs**

Adicione estas URLs em **"Redirect URLs"**:

```
https://www.conectacup.com/
https://www.conectacup.com/reset-password
https://www.conectacup.com/**
```

**✅ Importante:** Adicione também o wildcard `/**` para permitir todas as rotas.

---

### **3. Configurar Site URL**

Em **"Site URL"**, configure:

```
https://www.conectacup.com
```

---

### **4. Configurar Google OAuth Provider**

1. Acesse: **Authentication** → **Providers** → **Google**
2. Certifique-se que o Google OAuth está **habilitado**
3. Configure:
   - **Client ID**: (da Google Cloud Console)
   - **Client Secret**: (da Google Cloud Console)

---

### **5. Google Cloud Console - Adicionar Domínio**

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Selecione o projeto da Porsche Cup
3. Clique no **OAuth 2.0 Client ID** configurado
4. Em **"Authorized redirect URIs"**, adicione:

```
https://nflgqugaabtxzifyhjor.supabase.co/auth/v1/callback
```

5. Em **"Authorized JavaScript origins"**, adicione:

```
https://www.conectacup.com
```

---

## 🧪 TESTAR

Após configurar:

1. **Deploy** das alterações de código
2. **Limpar cache** do navegador (Ctrl+Shift+Delete)
3. **Testar login** com Google em https://www.conectacup.com
4. **Verificar** que após login é redirecionado para `https://www.conectacup.com/`

---

## 🔍 VERIFICAR SE FUNCIONOU

### ✅ **Sucesso:**
- Clicar em "Entrar com Google"
- Autenticar na conta Google
- **Ser redirecionado para:** `https://www.conectacup.com/`
- Estar logado no sistema

### ❌ **Erro Comum:**
Se ainda redirecionar para Vercel:
1. Verifique se salvou as configurações no Supabase Dashboard
2. Aguarde 2-3 minutos para propagação
3. Limpe cache do navegador
4. Tente novamente

---

## 📋 CHECKLIST COMPLETO

- [x] ✅ Código atualizado (`Login.tsx`)
- [x] ✅ Código atualizado (`index.tsx` servidor)
- [ ] ⚠️ Configurar Redirect URLs no Supabase
- [ ] ⚠️ Configurar Site URL no Supabase
- [ ] ⚠️ Verificar Google OAuth habilitado
- [ ] ⚠️ Adicionar domínio no Google Cloud Console
- [ ] ⚠️ Testar login com Google
- [ ] ⚠️ Verificar redirecionamento correto

---

## 🆘 SUPORTE

Se encontrar problemas:

1. **Erro "redirect_uri_mismatch"**:
   - Verifique se adicionou a URI no Google Cloud Console
   - A URI deve ser exatamente: `https://nflgqugaabtxzifyhjor.supabase.co/auth/v1/callback`

2. **Ainda redireciona para Vercel**:
   - Limpe cache e cookies
   - Aguarde 5 minutos após configuração
   - Verifique se fez deploy do código novo

3. **Erro 401 após login**:
   - Verifique se o Google OAuth está habilitado no Supabase
   - Verifique se as credenciais do Google estão corretas

---

## 🎉 RESULTADO ESPERADO

**Antes:** `https://porsche-cup-*.vercel.app/`  
**Depois:** `https://www.conectacup.com/` ✨

---

**Data da Correção:** 24/01/2025  
**Desenvolvedor:** Sistema Porsche Cup Brasil  
**Status:** ✅ Código Pronto | ⚠️ Aguardando Configuração Supabase
