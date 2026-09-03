# 🔍 DIAGNÓSTICO: Por que não consigo editar?

## ⚡ SOLUÇÃO RÁPIDA

### **PASSO 1: Executar Diagnóstico**
```
📁 DIAGNOSTICO_COMPLETO.sql
```
**Mostra exatamente qual é o problema**

### **PASSO 2: Aplicar Correção**

**Opção A: Se você usa `raw_user_meta_data.profileId`** ⭐ MAIS PROVÁVEL
```
📁 FIX_POLICIES_PARA_RAW_USER_META_DATA.sql
```

**Opção B: Se você quer migrar para `user_profiles`**
```
📁 EXECUTAR_TUDO_DE_UMA_VEZ.sql
```

**Opção C: Solução temporária (permite todos editarem)**
```
📁 QUICK_FIX_TEMP.sql
```

---

## 🎯 ENTENDENDO O PROBLEMA

### **O que você TEM:**

```json
// Em auth.users.raw_user_meta_data
{
  "name": "Seu Nome",
  "role": "admin",
  "profileId": "a1b2c3d4-5678-90ab-cdef-1234567890ab"  // UUID
}
```

```sql
-- Em access_profiles
id: a1b2c3d4-5678-90ab-cdef-1234567890ab
name: Administrador
is_admin: true
```

### **O que as policies ERRADAS verificam:**

```sql
-- ❌ ERRADO: Compara UUID com string "admin"
WHERE raw_user_meta_data->>'profileId' = 'admin'
-- Seu profileId: "a1b2c3d4-..." 
-- Policy procura: "admin"
-- Resultado: NUNCA VAI PASSAR! ❌
```

### **O que as policies CORRETAS devem verificar:**

```sql
-- ✅ CERTO: Pega o UUID e verifica se é admin
WHERE EXISTS (
  SELECT 1 
  FROM auth.users u
  JOIN access_profiles ap ON ap.id::text = u.raw_user_meta_data->>'profileId'
  WHERE u.id = auth.uid()
  AND ap.is_admin = true
)
```

---

## 📊 CENÁRIOS POSSÍVEIS

### **Cenário 1: Policies verificam UUID errado** ⭐ MAIS COMUM

**Sintomas:**
- Você é admin no sistema
- Consegue ver "Gerenciar Usuários"
- Mas não consegue editar gerações/chassis

**Causa:**
```sql
-- Policy verifica:
profileId = 'admin'  -- String

-- Mas você tem:
profileId = "uuid-real"  -- UUID
```

**Solução:**
```
Execute: FIX_POLICIES_PARA_RAW_USER_META_DATA.sql
```

---

### **Cenário 2: Policies verificam `user_profiles` que não existe**

**Sintomas:**
- Erro: "relation public.user_profiles does not exist"
- Ou: policy bloqueia silenciosamente

**Causa:**
```sql
-- Policy procura:
FROM user_profiles  -- Tabela não existe!
```

**Solução:**
```
Execute: EXECUTAR_TUDO_DE_UMA_VEZ.sql
(Cria user_profiles e atualiza policies)
```

---

### **Cenário 3: Você não tem perfil**

**Sintomas:**
- Consegue logar
- Vê a interface
- Não consegue editar nada

**Causa:**
```json
// Em raw_user_meta_data
{
  "name": "Seu Nome"
  // ❌ Falta "profileId" ou "role"
}
```

**Solução:**
```sql
-- Execute no Supabase SQL Editor:
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || 
  jsonb_build_object(
    'profileId', (SELECT id FROM access_profiles WHERE is_admin = true LIMIT 1)
  )
WHERE id = auth.uid();
```

---

## 🔬 COMO DIAGNOSTICAR

### **Execute o diagnóstico completo:**

```sql
-- No Supabase SQL Editor:
-- Cole e execute: DIAGNOSTICO_COMPLETO.sql
```

**O que ele mostra:**

1. ✅ Seus dados atuais
2. ✅ Qual perfil você tem
3. ✅ Se o perfil é válido
4. ✅ Quais policies estão ativas
5. ✅ Quais testes você passaria
6. ✅ Qual arquivo executar

---

## 🎯 FLUXO DE DECISÃO

```
┌─────────────────────────────────────┐
│ Execute: DIAGNOSTICO_COMPLETO.sql   │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Veja qual TESTE passou:             │
└─────────────┬───────────────────────┘
              │
      ┌───────┴───────┐
      │               │
TESTE 4 passou   TESTE 3 passou
      │               │
      ▼               ▼
  Execute:        Execute:
  FIX_POLICIES... EXECUTAR_TUDO...
      │               │
      └───────┬───────┘
              │
              ▼
      Recarregue (F5)
              │
              ▼
          ✅ FUNCIONA!
```

---

## 📋 COMPARAÇÃO DAS SOLUÇÕES

| Solução | Quando usar | Altera estrutura? | Tempo |
|---------|-------------|-------------------|-------|
| **FIX_POLICIES_PARA_RAW_USER_META_DATA** | Você já usa profileId UUID | ❌ Não (só policies) | 1 min |
| **EXECUTAR_TUDO_DE_UMA_VEZ** | Quer estrutura nova | ✅ Sim (cria user_profiles) | 2 min |
| **QUICK_FIX_TEMP** | Urgente (todos podem editar) | ❌ Não | 30 seg |

---

## ✅ CHECKLIST

### **Antes de executar qualquer script:**

```
[ ] Executei DIAGNOSTICO_COMPLETO.sql
[ ] Vi qual TESTE passou
[ ] Identifiquei o cenário
[ ] Escolhi a solução correta
```

### **Depois de executar a solução:**

```
[ ] Vi mensagem de sucesso
[ ] Recarreguei aplicação (F5)
[ ] Testei editar geração
[ ] ✅ FUNCIONA!
```

---

## 🆘 TROUBLESHOOTING

### **"Ainda não funciona!"**

1. **Execute novamente o diagnóstico:**
   ```
   DIAGNOSTICO_COMPLETO.sql
   ```

2. **Verifique qual teste passou:**
   - TESTE 1: Você tem role = 'admin' ✅
   - TESTE 2: Seu profileId é string ❌ (raro)
   - TESTE 3: user_profiles existe ✅
   - TESTE 4: Verificação correta UUID ✅

3. **Se TESTE 4 passou mas não funciona:**
   - As policies no banco estão erradas
   - Execute `FIX_POLICIES_PARA_RAW_USER_META_DATA.sql` novamente

4. **Se nenhum teste passou:**
   - Você não tem permissão
   - Peça a um admin para atribuir perfil admin

### **"Recebi erro de sintaxe"**

Execute linha por linha no diagnóstico para ver onde falha.

### **"Quero solução temporária"**

```
Execute: QUICK_FIX_TEMP.sql
⚠️ Todos usuários autenticados poderão editar!
```

---

## 📖 RESUMO VISUAL

```
PROBLEMA
   │
   ├─ Policy verifica: profileId = "admin" (string)
   │  Você tem: profileId = "uuid-123..." (UUID)
   │  Resultado: ❌ Nunca passa
   │
   └─ Policy verifica: FROM user_profiles
      Tabela: ❌ Não existe
      Resultado: ❌ Erro

SOLUÇÃO
   │
   ├─ Opção 1: Corrigir policies para verificar UUID
   │  Execute: FIX_POLICIES_PARA_RAW_USER_META_DATA.sql
   │
   └─ Opção 2: Criar user_profiles e migrar
      Execute: EXECUTAR_TUDO_DE_UMA_VEZ.sql
```

---

## 🎯 RECOMENDAÇÃO

**Para resolver AGORA:**
1. Execute `DIAGNOSTICO_COMPLETO.sql`
2. Veja qual teste passou
3. Execute `FIX_POLICIES_PARA_RAW_USER_META_DATA.sql`
4. Recarregue (F5)
5. ✅ Teste!

**Para estrutura correta no futuro:**
1. Execute `EXECUTAR_TUDO_DE_UMA_VEZ.sql`
2. Migre gradualmente para usar `user_profiles`

---

**Comece com o diagnóstico! 🔍**
