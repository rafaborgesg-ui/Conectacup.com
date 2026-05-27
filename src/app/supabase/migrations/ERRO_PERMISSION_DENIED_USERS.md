# 🔴 ERRO: Permission denied for table users

## 🎯 O PROBLEMA

Ao tentar cadastrar/editar em **Master Data > Carros**, você recebe:
```
Erro: permission denied for table users
```

---

## 🔍 POR QUE ACONTECE?

### **O que está errado:**

As **RLS Policies** das tabelas `geracao` e `chassis` estão assim:

```sql
-- ❌ POLICY ERRADA
CREATE POLICY "Apenas admins podem inserir gerações"
  ON public.geracao
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users  -- ❌ PROBLEMA AQUI!
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
```

### **Por que dá erro:**

```
┌─────────────────────────────────────────┐
│ Usuário autenticado tenta INSERT       │
│ em geracao                              │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Policy verifica: SELECT FROM auth.users │ ← ❌ ERRO AQUI!
└─────────────┬───────────────────────────┘
              │
              ▼
  ❌ "permission denied for table users"
  
  Usuários autenticados NÃO têm permissão
  para fazer SELECT em auth.users!
```

---

## ✅ SOLUÇÃO

**Execute o arquivo:**
```
FIX_RLS_SEM_AUTH_USERS.sql
```

### **O que ele faz:**

#### **1️⃣ Cria função auxiliar com SECURITY DEFINER**

```sql
CREATE FUNCTION public.is_user_admin()
RETURNS BOOLEAN
SECURITY DEFINER  -- ← Executa com privilégios elevados
AS $$
  -- Pode acessar auth.users porque tem SECURITY DEFINER
  SELECT 
    CASE
      WHEN raw_user_meta_data->>'role' = 'admin' THEN TRUE
      WHEN EXISTS (
        SELECT 1 FROM access_profiles 
        WHERE id::text = raw_user_meta_data->>'profileId'
        AND is_admin = true
      ) THEN TRUE
      ELSE FALSE
    END
  FROM auth.users
  WHERE id = auth.uid();
$$;
```

**Por que funciona:**
- `SECURITY DEFINER` = função executa com permissões do **dono** (não do usuário)
- Dono tem acesso a `auth.users`
- Usuário só chama a função, não acessa tabela diretamente

#### **2️⃣ Atualiza policies para usar a função**

```sql
-- ✅ POLICY CORRETA
CREATE POLICY "Apenas admins podem inserir gerações"
  ON public.geracao
  FOR INSERT
  WITH CHECK (
    public.is_user_admin() = true  -- ✅ USA FUNÇÃO!
  );
```

---

## 🚀 COMO EXECUTAR

### **Passo 1: Abrir Supabase SQL Editor**
```
Dashboard → Seu Projeto → SQL Editor → New query
```

### **Passo 2: Colar o arquivo**
```sql
-- Cole o conteúdo de:
FIX_RLS_SEM_AUTH_USERS.sql
```

### **Passo 3: Executar**
```
Clique em "Run" ▶️
```

### **Passo 4: Verificar resultado**
Você deve ver:
```
✅ Policies corrigidas!
🔧 Criada função: public.is_user_admin()
🔒 Policies atualizadas
```

### **Passo 5: Testar**
```
1. Recarregue aplicação (F5)
2. Vá em Master Data > Carros
3. Tente cadastrar nova geração
4. ✅ Deve funcionar!
```

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

### **ANTES (❌ Erro)**

```sql
Policy:
  SELECT FROM auth.users  ← Usuário não tem permissão!
  
Resultado:
  ❌ permission denied for table users
```

### **DEPOIS (✅ Funciona)**

```sql
Policy:
  public.is_user_admin()  ← Função tem permissão!
  
Resultado:
  ✅ true (se admin) ou false (se não admin)
```

---

## 🔬 ENTENDENDO SECURITY DEFINER

### **O que é:**

```
SECURITY DEFINER = "Execute com privilégios do dono"
SECURITY INVOKER = "Execute com privilégios do usuário" (padrão)
```

### **Analogia:**

```
Sem SECURITY DEFINER:
┌──────────────┐
│ Usuário João │ tenta acessar arquivo /etc/passwd
└──────────────┘
        │
        ▼
    ❌ Acesso negado (João não é root)

Com SECURITY DEFINER:
┌──────────────┐
│ Usuário João │ chama função is_admin()
└──────────────┘
        │
        ▼
┌──────────────┐
│ Função       │ roda como ROOT
│ is_admin()   │ pode acessar /etc/passwd
└──────────────┘
        │
        ▼
    ✅ Retorna resultado para João
```

### **Por que é seguro:**

- Usuário **não acessa** `auth.users` diretamente
- Usuário só **chama função**
- Função retorna apenas **boolean** (true/false)
- Função **não vaza dados** sensíveis

---

## 🛡️ SEGURANÇA

### **Função é segura?**

✅ **SIM!** Porque:

1. **Não expõe dados:**
   ```sql
   -- ✅ Retorna apenas boolean
   RETURN TRUE/FALSE
   
   -- ❌ NÃO retorna dados do usuário
   -- NÃO retorna email, senha, etc
   ```

2. **Só verifica usuário atual:**
   ```sql
   WHERE id = auth.uid()  -- Apenas o próprio usuário
   ```

3. **Lógica clara:**
   ```sql
   -- Verifica apenas:
   - Se tem role = 'admin'
   - Se tem profileId admin
   ```

### **Posso criar outras funções SECURITY DEFINER?**

✅ **SIM**, mas com cuidado:

**BOM exemplo:**
```sql
-- ✅ Retorna apenas boolean
CREATE FUNCTION is_editor() RETURNS BOOLEAN
```

**MAU exemplo:**
```sql
-- ❌ Expõe dados sensíveis
CREATE FUNCTION get_all_user_emails() RETURNS TABLE(email TEXT)
-- Isso seria inseguro!
```

---

## 📋 CHECKLIST

Antes de executar:
```
[ ] Tenho acesso ao Supabase SQL Editor
[ ] Entendi o problema (policies acessam auth.users)
[ ] Li a solução (função SECURITY DEFINER)
```

Depois de executar:
```
[ ] Vi mensagem de sucesso
[ ] Recarreguei aplicação (F5)
[ ] Testei cadastrar geração
[ ] ✅ Funcionou sem erro!
```

---

## 🆘 TROUBLESHOOTING

### **"Erro: function already exists"**

**Solução:** O script tem `CREATE OR REPLACE`, deve funcionar.
Se não funcionar:
```sql
DROP FUNCTION IF EXISTS public.is_user_admin();
-- E execute o script novamente
```

### **"Ainda dá erro permission denied"**

**Verifique:**
1. Função foi criada?
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'is_user_admin';
   ```

2. Policies foram atualizadas?
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'geracao';
   ```

3. Você deu GRANT?
   ```sql
   GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
   ```

### **"Função retorna NULL"**

**Causa:** Você não tem `role` nem `profileId` no `raw_user_meta_data`.

**Solução:** Atribua um perfil admin:
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || 
  jsonb_build_object(
    'profileId', (SELECT id FROM access_profiles WHERE is_admin = true LIMIT 1)
  )
WHERE id = auth.uid();
```

---

## 🎯 RESUMO VISUAL

```
PROBLEMA:
┌────────────────────────────────────────────┐
│ Policy tenta:                              │
│   SELECT FROM auth.users                   │
│                                            │
│ Usuário autenticado:                       │
│   ❌ Não tem permissão                     │
└────────────────────────────────────────────┘

SOLUÇÃO:
┌────────────────────────────────────────────┐
│ 1. Criar função com SECURITY DEFINER       │
│    - Função pode acessar auth.users        │
│                                            │
│ 2. Policy usa função:                      │
│    public.is_user_admin() = true           │
│                                            │
│ 3. Resultado:                              │
│    ✅ Funciona!                            │
└────────────────────────────────────────────┘
```

---

## 🚀 EXECUTAR AGORA

```
1. Abra: Supabase SQL Editor
2. Cole: FIX_RLS_SEM_AUTH_USERS.sql
3. Clique: Run ▶️
4. Veja: ✅ Sucesso
5. Teste: Master Data > Carros
```

**Tempo estimado:** 2 minutos ⚡

---

**Boa sorte! 🎯**
