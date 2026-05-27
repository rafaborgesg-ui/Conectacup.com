# 🔐 CONFIGURAÇÃO GOOGLE OAUTH - CONECTA CUP

**Data:** 24/01/2025  
**Objetivo:** Alterar nome da aplicação no Google OAuth de "visual code" para "Conecta Cup"

---

## 🎯 PROBLEMA

Ao fazer login com Google, aparece:

```
❌ "Escolha uma conta
    Prosseguir para visual code"
```

**Queremos:**

```
✅ "Escolha uma conta
    Prosseguir para Conecta Cup"
```

---

## 📝 SOLUÇÃO

O texto mostrado no Google OAuth vem da configuração no **Google Cloud Console**, não do código da aplicação. É necessário atualizar as configurações do projeto OAuth.

---

## ✅ PARTE 1: CÓDIGO ATUALIZADO (JÁ FEITO)

### **1. manifest.json** ✅
```json
{
  "name": "Conecta Cup - Gestão de Pneus",
  "short_name": "Conecta Cup",
  "description": "Sistema de gestão e controle de estoque de pneus Conecta Cup"
}
```

### **2. index.html** ✅
```html
<title>Conecta Cup - Gestão de Pneus</title>
<meta name="apple-mobile-web-app-title" content="Conecta Cup" />
<meta name="description" content="Sistema de Gestão de Pneus - Conecta Cup" />
<meta name="author" content="Conecta Cup" />
```

---

## 🔧 PARTE 2: GOOGLE CLOUD CONSOLE (VOCÊ DEVE FAZER)

### **Passo 1: Acessar Google Cloud Console**

1. Acesse: https://console.cloud.google.com/
2. Faça login com sua conta Google
3. Selecione o projeto usado para autenticação (ou o projeto padrão)

---

### **Passo 2: Ir para Tela de Consentimento OAuth**

1. No menu lateral, vá em: **APIs e Serviços** → **Tela de consentimento OAuth**
   
   Ou acesse direto:
   ```
   https://console.cloud.google.com/apis/credentials/consent
   ```

2. Você verá a configuração atual da tela de consentimento

---

### **Passo 3: Editar Nome da Aplicação**

1. Clique em **EDITAR APLICATIVO**

2. Na seção **Informações do app**, você verá o campo **Nome do aplicativo**

3. **Altere de:**
   ```
   visual code
   ```
   
   **Para:**
   ```
   Conecta Cup
   ```

4. **Campos adicionais que você pode preencher (opcional mas recomendado):**

   - **Logo do aplicativo:** Upload de um logo da Conecta Cup
   - **URL da página inicial do aplicativo:** `https://www.conectacup.com/`
   - **Política de privacidade:** URL da política de privacidade
   - **Termos de serviço:** URL dos termos de serviço
   - **Email de suporte:** email@conectacup.com

5. Clique em **SALVAR E CONTINUAR**

---

### **Passo 4: Configurar Domínios Autorizados**

1. Role para baixo até **Domínios autorizados**

2. Adicione os seguintes domínios:
   ```
   conectacup.com
   www.conectacup.com
   nflgqugaabtxzifyhjor.supabase.co (seu projeto Supabase)
   ```

3. Clique em **SALVAR E CONTINUAR**

---

### **Passo 5: Verificar Credenciais OAuth**

1. Vá em: **APIs e Serviços** → **Credenciais**
   
   Ou acesse:
   ```
   https://console.cloud.google.com/apis/credentials
   ```

2. Encontre seu **ID do cliente OAuth 2.0**

3. Clique no nome do cliente OAuth

4. **Verifique:**

   - **Nome:** "Conecta Cup" ou "Web client 1"
   - **Origens JavaScript autorizadas:**
     ```
     https://conectacup.com
     https://www.conectacup.com
     http://localhost:5173 (para desenvolvimento)
     ```
   
   - **URIs de redirecionamento autorizados:**
     ```
     https://nflgqugaabtxzifyhjor.supabase.co/auth/v1/callback
     https://www.conectacup.com/
     http://localhost:5173/ (para desenvolvimento)
     ```

5. Se precisar alterar algo, clique em **EDITAR** e faça as mudanças

6. Clique em **SALVAR**

---

### **Passo 6: Atualizar Supabase**

1. Acesse seu projeto Supabase:
   ```
   https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor
   ```

2. Vá em: **Authentication** → **Providers**

3. Encontre **Google** na lista

4. Clique em **Google** para expandir

5. **Verifique se estão preenchidos:**
   - **Client ID:** (do Google Cloud Console)
   - **Client Secret:** (do Google Cloud Console)
   - **Redirect URL:** Deve ser algo como:
     ```
     https://nflgqugaabtxzifyhjor.supabase.co/auth/v1/callback
     ```

6. Se algo estiver faltando, copie do Google Cloud Console e cole aqui

7. Certifique-se de que **Google provider is enabled** está ATIVO (toggle verde)

8. Clique em **Save**

---

## 🧪 TESTE

### **Após configurar, teste o login:**

1. Limpe o cache do navegador (ou use janela anônima)

2. Acesse: `https://www.conectacup.com/`

3. Clique em **Entrar com Google**

4. Você deve ver:
   ```
   ✅ "Escolha uma conta
       Prosseguir para Conecta Cup"
   ```

---

## 🔍 TROUBLESHOOTING

### **Problema 1: Ainda aparece "visual code"**

**Solução:**
1. Limpe o cache do navegador completamente
2. Aguarde 5-10 minutos (Google pode levar um tempo para propagar as mudanças)
3. Teste em janela anônima
4. Verifique se você editou o projeto correto no Google Cloud Console

### **Problema 2: "Redirect URI mismatch"**

**Solução:**
1. Verifique se o redirect URI no Google Cloud Console é exatamente:
   ```
   https://nflgqugaabtxzifyhjor.supabase.co/auth/v1/callback
   ```
2. Não deve ter barra no final
3. Deve usar HTTPS

### **Problema 3: "App not verified"**

**Solução:**
1. Isso é normal em desenvolvimento
2. Clique em "Avançado" → "Ir para Conecta Cup (não seguro)"
3. Para produção, você precisa submeter o app para verificação do Google

### **Problema 4: Erro 400 ou 401**

**Solução:**
1. Verifique se o Client ID e Client Secret estão corretos no Supabase
2. Copie novamente do Google Cloud Console
3. Cole no Supabase sem espaços extras
4. Salve e teste novamente

---

## 📋 CHECKLIST COMPLETO

- [ ] **Google Cloud Console**
  - [ ] Nome do aplicativo alterado para "Conecta Cup"
  - [ ] Logo adicionado (opcional)
  - [ ] Domínios autorizados configurados
  - [ ] URIs de redirecionamento corretos
  
- [ ] **Supabase**
  - [ ] Client ID configurado
  - [ ] Client Secret configurado
  - [ ] Google provider ativado
  
- [ ] **Código (já feito)**
  - [x] manifest.json atualizado
  - [x] index.html atualizado
  
- [ ] **Teste**
  - [ ] Login com Google testado
  - [ ] Texto correto aparecendo
  - [ ] Redirecionamento funcionando

---

## 🎯 PRÓXIMOS PASSOS

Após configurar o Google OAuth corretamente:

1. ✅ Teste o login com Google
2. ✅ Confirme que aparece "Conecta Cup"
3. 🚀 Continue com Tour Interativo (+2 UX)

---

## 📚 REFERÊNCIAS

**Google Cloud Console:**
- https://console.cloud.google.com/

**Tela de Consentimento OAuth:**
- https://console.cloud.google.com/apis/credentials/consent

**Credenciais OAuth:**
- https://console.cloud.google.com/apis/credentials

**Supabase Auth Providers:**
- https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/auth/providers

**Documentação Google OAuth:**
- https://developers.google.com/identity/protocols/oauth2

**Documentação Supabase Google Auth:**
- https://supabase.com/docs/guides/auth/social-login/auth-google

---

## 💡 DICA IMPORTANTE

O nome que aparece na tela de login do Google ("Prosseguir para...") vem do campo **"Nome do aplicativo"** na **Tela de consentimento OAuth** do Google Cloud Console.

**Não confunda com:**
- ❌ Nome do projeto no Google Cloud
- ❌ Nome das credenciais OAuth
- ❌ Nome no manifest.json (esse é para PWA)

É especificamente o campo "Nome do aplicativo" na tela de consentimento!

---

**Status:** ✅ Código atualizado  
**Próximo:** ⏳ Configurar no Google Cloud Console  
**Depois:** 🚀 Tour Interativo (+2 UX)

```
╔══════════════════════════════════════════════════╗
║                                                   ║
║  ✅ CÓDIGO ATUALIZADO PARA "CONECTA CUP"         ║
║                                                   ║
║  📝 PRÓXIMO PASSO:                               ║
║     Configure no Google Cloud Console            ║
║                                                   ║
║  🔗 Link direto:                                 ║
║     console.cloud.google.com/apis/credentials    ║
║                                                   ║
║  🎯 Campo a alterar:                             ║
║     "Nome do aplicativo" → "Conecta Cup"         ║
║                                                   ║
╚══════════════════════════════════════════════════╝
```
