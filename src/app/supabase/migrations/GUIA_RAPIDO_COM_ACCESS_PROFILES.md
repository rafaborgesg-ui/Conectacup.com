# ⚡ GUIA RÁPIDO - Você já tem access_profiles

## ✅ Situação Atual
- ✅ Você **JÁ TEM** a tabela `access_profiles`
- ❌ Você **NÃO TEM** a tabela `user_profiles`
- ❌ Por isso dá erro: `relation "public.user_profiles" does not exist`

---

## 🎯 Solução em 2 Passos

### **PASSO 1: Criar user_profiles**

Execute este arquivo:
```
📁 /supabase/migrations/CREATE_USER_PROFILES_ONLY.sql
```

**O que faz:**
1. ✅ Cria tabela `user_profiles`
2. ✅ Liga com `access_profiles` (que já existe)
3. ✅ Atribui perfil admin ao primeiro usuário
4. ✅ Mostra relatório com perfis e usuários

**Como executar:**
1. Abra **Supabase SQL Editor**
2. Copie todo o conteúdo de `CREATE_USER_PROFILES_ONLY.sql`
3. Cole e clique em **Run** ▶️

**Resultado esperado:**

```
┌──────────────────────┬──────────────────────┬──────────┬─────────────┐
│ info                 │ id                   │ name     │ is_admin    │
├──────────────────────┼──────────────────────┼──────────┼─────────────┤
│ PERFIS DISPONÍVEIS   │ admin-uuid           │ Admin    │ true        │
│ PERFIS DISPONÍVEIS   │ operador-uuid        │ Operador │ false       │
└──────────────────────┴──────────────────────┴──────────┴─────────────┘

┌──────────────────────┬──────────────────┬────────────┬──────────┐
│ info                 │ email            │ perfil     │ is_admin │
├──────────────────────┼──────────────────┼────────────┼──────────┤
│ USUÁRIOS E PERFIS    │ seu@email.com    │ Admin      │ true     │
└──────────────────────┴──────────────────┴────────────┴──────────┘

┌──────────────────────┬────────────────────────────┐
│ info                 │ total_usuarios_com_perfil  │
├──────────────────────┼────────────────────────────┤
│ TABELA CRIADA        │ 1                          │
└──────────────────────┴────────────────────────────┘
```

✅ Se você vê seu email com `is_admin = true`, perfeito!

---

### **PASSO 2: Aplicar Policies Corretas**

Execute este arquivo:
```
📁 /supabase/migrations/QUICK_FIX_SIMPLE.sql
```

**O que faz:**
1. ✅ Remove policies antigas de `geracao` e `chassis`
2. ✅ Cria policies que verificam `user_profiles`
3. ✅ **Apenas admins** podem criar/editar/deletar
4. ✅ Todos podem visualizar

**Como executar:**
1. Abra **Supabase SQL Editor**
2. Copie todo o conteúdo de `QUICK_FIX_SIMPLE.sql`
3. Cole e clique em **Run** ▶️

**Resultado esperado:**
```
Success. No rows returned
```

✅ Isso é bom! As policies foram aplicadas.

---

### **PASSO 3: Testar**

1. **Recarregue a aplicação** (F5)
2. Vá para **Master Data > Carros > Geração do Carro**
3. Clique em **✏️ Editar** em uma geração
4. Altere o código ou descrição
5. Clique em **Atualizar**
6. ✅ **Deve funcionar sem erros!**

---

## 📋 Resumo da Execução

```sql
-- Passo 1: Criar user_profiles
Execute: CREATE_USER_PROFILES_ONLY.sql
Verifique: Você aparece como admin? ✅

-- Passo 2: Aplicar policies
Execute: QUICK_FIX_SIMPLE.sql
Resultado: Success ✅

-- Passo 3: Testar
Recarregue aplicação (F5)
Teste editar geração → ✅ Funciona!
```

---

## 🆘 Se Não Funcionar

### **Erro: "permission denied for table user_profiles"**
Execute esta query:
```sql
-- Permitir acesso à tabela
GRANT SELECT ON public.user_profiles TO authenticated;
```

### **Erro: "Você não é admin"**
Execute esta query para se atribuir perfil admin:
```sql
-- Ver perfis disponíveis
SELECT id, name, is_admin FROM public.access_profiles;

-- Atribuir perfil admin (substitua 'ID_DO_PERFIL_ADMIN' pelo id correto)
INSERT INTO public.user_profiles (user_id, profile_id)
VALUES (
  auth.uid(),
  'ID_DO_PERFIL_ADMIN'
)
ON CONFLICT (user_id) 
DO UPDATE SET profile_id = 'ID_DO_PERFIL_ADMIN';
```

### **Ainda não funciona?**
Use a solução temporária:
```sql
-- Execute: QUICK_FIX_TEMP.sql
-- (Permite todos editarem - temporário)
```

---

## 🎯 Estrutura Final

Depois de executar tudo, você terá:

```
access_profiles (já existia)
├── id
├── name
├── is_admin ← Determina quem pode editar
└── accessible_pages

user_profiles (criada agora)
├── user_id → auth.users
└── profile_id → access_profiles

RLS Policies em geracao e chassis
├── SELECT: Todos autenticados ✅
├── INSERT: Apenas is_admin = true ✅
├── UPDATE: Apenas is_admin = true ✅
└── DELETE: Apenas is_admin = true ✅
```

---

## ✅ Checklist

- [ ] Executar `CREATE_USER_PROFILES_ONLY.sql`
- [ ] Verificar que sou admin no output
- [ ] Executar `QUICK_FIX_SIMPLE.sql`
- [ ] Recarregar aplicação (F5)
- [ ] Testar editar geração
- [ ] ✅ **Funciona!**

---

**Problema resolvido!** 🚀
