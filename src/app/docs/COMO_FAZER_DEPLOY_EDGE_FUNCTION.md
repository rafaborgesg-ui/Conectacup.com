# 🚀 Como Fazer Deploy da Edge Function - Guia Simplificado

## 🤔 Você Precisa Fazer Deploy?

### ✅ NÃO precisa se:
- O sistema já está funcionando em produção (Vercel/outra plataforma)
- Você já consegue usar outras funcionalidades do sistema
- As outras páginas (Pneus, Master Data, etc) estão funcionando

**Neste caso**: Os arquivos já estão no servidor e serão usados automaticamente! ✨

### ⚠️ SIM precisa se:
- Você está desenvolvendo localmente
- O sistema mostra erro "endpoint não encontrado"
- Você configurou o Supabase pela primeira vez

---

## 📋 Opção 1: Através do Supabase Dashboard (MAIS FÁCIL)

Esta é a forma **mais simples** e não precisa de terminal:

### Passo a Passo:

1. **Acesse o Supabase Dashboard**
   - Vá em: https://supabase.com/dashboard
   - Faça login na sua conta
   - Selecione seu projeto

2. **Vá para Edge Functions**
   - No menu lateral, clique em **"Edge Functions"**
   - Você verá uma lista das funções deployadas

3. **Verifique se existe a função "server"**
   - Se você ver uma função chamada **"server"**, ela já está deployada! ✅
   - Não precisa fazer mais nada!

4. **Se NÃO existe a função "server":**
   - Clique em **"Deploy new function"**
   - **IMPORTANTE**: Como os arquivos já foram modificados no código, você precisa fazer o deploy via terminal (Opção 2)

---

## 📋 Opção 2: Via Terminal (Se necessário)

### Pré-requisitos:

Você precisa ter instalado:
- Supabase CLI

### Como Instalar o Supabase CLI:

**Windows:**
```bash
# Usando Scoop (se você tem):
scoop install supabase

# OU usando npm:
npm install -g supabase
```

**Mac:**
```bash
brew install supabase/tap/supabase
```

**Linux:**
```bash
brew install supabase/tap/supabase
```

### Fazer Login no Supabase:

```bash
# 1. Faça login
supabase login

# Isso vai abrir o navegador para você fazer login
```

### Link do Projeto:

```bash
# 2. Na raiz do seu projeto, vincule ao Supabase
supabase link --project-ref SEU_PROJECT_ID

# Onde encontrar SEU_PROJECT_ID:
# - No Supabase Dashboard
# - Em "Settings" > "General"
# - Copie o "Reference ID"
```

### Deploy da Função:

```bash
# 3. Agora sim, faça o deploy
supabase functions deploy server
```

Se der certo, você verá:
```
Deploying server (project ref: xxxxx)
Deployment complete!
```

---

## 📋 Opção 3: O Sistema Já Funciona! (MAIS PROVÁVEL)

### Como Verificar:

Se você conseguir fazer **qualquer uma dessas ações** no sistema, a Edge Function já está funcionando:

- ✅ Login/Logout
- ✅ Cadastrar pneu
- ✅ Ver relatórios
- ✅ Usar Master Data
- ✅ Gerenciar usuários

**Neste caso**: 
- Os arquivos que modifiquei (`/supabase/functions/server/index.tsx`) já estão no código
- Quando você fizer o próximo deploy do projeto (Vercel, etc), eles serão atualizados automaticamente
- Você **NÃO precisa** fazer deploy manual da Edge Function

---

## 🎯 Então, O Que Fazer?

### Cenário A: Sistema em Produção (Vercel/outra plataforma)

```bash
# Simplesmente faça commit e push do código:
git add .
git commit -m "feat: adiciona programação de gases"
git push origin main

# A plataforma (Vercel) vai fazer o deploy automaticamente!
```

### Cenário B: Desenvolvimento Local

**Opção Simples**: Apenas execute a migration SQL e use!
- A Edge Function é usada apenas para API
- Se você não precisar testar a API localmente, não precisa fazer deploy
- O código já está lá, só precisa da tabela no banco

**Opção Completa**: Siga a Opção 2 acima para testar localmente

---

## 🔍 Como Testar se Funcionou

### Teste 1: Verifique a Tabela
```sql
-- No Supabase SQL Editor, execute:
SELECT * FROM gas_programming LIMIT 1;

-- Se não der erro, a tabela existe! ✅
```

### Teste 2: Acesse a Página
1. Abra o sistema
2. Vá em: **Almoxarifado** → **Programação de Gases**
3. Se não mostrar erro de "tabela não encontrada", está funcionando! ✅

### Teste 3: Tente Cadastrar
1. Selecione Pista, Etapa, Temporada
2. Clique em "Nova Programação"
3. Preencha o formulário
4. Clique em "Salvar"
5. Se salvar com sucesso, tudo está funcionando! ✅

---

## ❌ Troubleshooting

### Erro: "supabase: command not found"
**Solução**: Instale o Supabase CLI (veja instruções acima)

### Erro: "Project not linked"
**Solução**: Execute `supabase link --project-ref SEU_PROJECT_ID`

### Erro: "Permission denied"
**Solução**: Faça login com `supabase login`

### Erro: "Table gas_programming does not exist"
**Solução**: Execute a migration SQL primeiro!
```sql
-- Copie e execute no Supabase SQL Editor:
/docs/migrations/sql/CREATE_GAS_PROGRAMMING_TABLE.sql
```

### Erro: "Endpoint not found"
**Solução 1**: Aguarde 1-2 minutos após o deploy  
**Solução 2**: Limpe o cache do navegador (Ctrl+Shift+Del)  
**Solução 3**: Faça o deploy novamente

---

## 📝 Resumo Rápido

### Para Maioria dos Casos:

1. ✅ Execute a migration SQL no Supabase
2. ✅ Recarregue a página (F5)
3. ✅ Use o sistema!

A Edge Function provavelmente já está deployada e funcionando.

### Se Realmente Precisar Fazer Deploy:

1. Instale Supabase CLI
2. Faça login: `supabase login`
3. Vincule projeto: `supabase link --project-ref SEU_ID`
4. Deploy: `supabase functions deploy server`

---

## 🆘 Ainda com Dúvida?

**Opção Mais Simples**: 
1. Execute a migration SQL
2. Tente usar o sistema
3. Se funcionar, pronto! Se não funcionar, aí sim precisamos fazer o deploy

**Teste Agora**:
1. Abra o Supabase Dashboard
2. Vá em SQL Editor
3. Cole e execute o conteúdo de: `/docs/migrations/sql/CREATE_GAS_PROGRAMMING_TABLE.sql`
4. Recarregue o sistema
5. Tente usar a Programação de Gases

---

**TL;DR**: Na maioria dos casos, você só precisa executar a migration SQL. A Edge Function já está no código e será usada automaticamente! 🎉
