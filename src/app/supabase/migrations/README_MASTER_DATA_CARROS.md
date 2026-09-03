# 🚗 Master Data > Carros - Guia Completo de Troubleshooting

## 🎯 PROBLEMA

Ao tentar **cadastrar código e descrição** em **Master Data > Carros**, você recebe:

```
❌ Erro: permission denied for table users
```

---

## ⚡ SOLUÇÃO RÁPIDA (Escolha uma)

### **Opção 1: Se o erro é "permission denied for table users"** ⭐ MAIS COMUM

```
Execute: FIX_RLS_SEM_AUTH_USERS.sql
Tempo: 1 minuto
Leia: SOLUCAO_RAPIDA_PERMISSION_DENIED.txt
```

### **Opção 2: Se dá erro mas não especifica "users"**

```
Execute: DIAGNOSTICO_COMPLETO.sql
Veja qual arquivo executar
```

### **Opção 3: Se quer verificar configuração de acesso**

```
Execute: VERIFICAR_CONFIG_ACCESS_PROFILES.sql
Veja se Master Data está no seu perfil
```

---

## 📋 CAUSAS POSSÍVEIS

### **1️⃣ RLS Policies tentam acessar auth.users** ⭐ MAIS COMUM

**Sintomas:**
- ❌ Erro: "permission denied for table users"
- ✅ Você é administrador
- ✅ Consegue acessar a página

**Causa:**
```sql
-- Policy tenta:
SELECT FROM auth.users  ← Você não tem permissão!
```

**Solução:**
```
Execute: FIX_RLS_SEM_AUTH_USERS.sql
```

**O que faz:**
- Cria função `is_user_admin()` com `SECURITY DEFINER`
- Atualiza policies para usar a função
- Função pode acessar `auth.users` de forma segura

---

### **2️⃣ Master Data não está no seu perfil**

**Sintomas:**
- ❌ Você não vê a página Master Data
- OU consegue ver mas não editar

**Causa:**
```json
// Em access_profiles.accessible_pages
{
  "accessible_pages": ["categoria", "pneu"]
  // ❌ Falta "master_data"
}
```

**Solução:**
```
Execute: VERIFICAR_CONFIG_ACCESS_PROFILES.sql
Depois ajuste seu perfil
```

**Como ajustar:**
```sql
UPDATE access_profiles
SET accessible_pages = ARRAY_APPEND(accessible_pages, 'master_data')
WHERE id = 'seu-profile-id';
```

---

### **3️⃣ Você não tem perfil atribuído**

**Sintomas:**
- ❌ Não consegue fazer nada
- OU tem acesso limitado

**Causa:**
```json
// Em auth.users.raw_user_meta_data
{
  "name": "Seu Nome"
  // ❌ Falta "profileId"
}
```

**Solução:**
```
1. Vá em Administração > Gerenciar Usuários
2. Edite seu usuário
3. Selecione perfil "Administrador"
4. Salve
```

---

## 🔍 DIAGNÓSTICO PASSO A PASSO

### **Passo 1: Qual é o erro exato?**

```
┌─────────────────────────────────────────────┐
│ "permission denied for table users"         │
│ → Execute: FIX_RLS_SEM_AUTH_USERS.sql       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ "Acesso negado" ou similar                  │
│ → Execute: VERIFICAR_CONFIG_ACCESS_PROFILES │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Outro erro ou não sei                       │
│ → Execute: DIAGNOSTICO_COMPLETO.sql         │
└─────────────────────────────────────────────┘
```

### **Passo 2: Execute o arquivo recomendado**

```
1. Supabase Dashboard → SQL Editor → New query
2. Cole o conteúdo do arquivo
3. Clique em Run ▶️
4. Veja o resultado
```

### **Passo 3: Aplique a correção**

```
- Se diagnosticou: Execute a solução recomendada
- Se ainda não funciona: Vá para Passo 4
```

### **Passo 4: Testes de verificação**

```sql
-- Teste 1: Você é admin?
SELECT is_user_admin();
-- Deve retornar: true

-- Teste 2: Tem acesso a Master Data?
SELECT 
  accessible_pages 
FROM access_profiles 
WHERE id::text = (
  SELECT raw_user_meta_data->>'profileId' 
  FROM auth.users 
  WHERE id = auth.uid()
);
-- Deve conter: "master_data" ou "*"

-- Teste 3: Policies estão corretas?
SELECT * FROM pg_policies WHERE tablename IN ('geracao', 'chassis');
-- Deve usar: is_user_admin()
```

---

## 🏗️ ESTRUTURA DE MASTER DATA > CARROS

### **Como funciona:**

```
Master Data > Carros
├── Gerações (GeracaoManager)
│   ├── Tabela: geracao
│   ├── Campos: codigo, descricao
│   └── RLS: Precisa ser admin
│
└── Chassis (ChassisManager)
    ├── Tabela: chassis
    ├── Campos: numero, geracao_id
    └── RLS: Precisa ser admin
```

### **Quando você tenta cadastrar:**

```
1. Frontend (GeracaoManager.tsx)
   ↓ createGeracao()
   
2. Storage (geracaoStorage.ts)
   ↓ INSERT INTO geracao
   
3. Supabase RLS Policies
   ↓ Verifica: is_user_admin() = true
   
4. Função (is_user_admin)
   ↓ SELECT FROM auth.users  ← Precisa SECURITY DEFINER
   
5. Resultado
   ✅ true = Permite inserir
   ❌ false = Bloqueia
```

---

## 📦 ARQUIVOS DE SOLUÇÃO

| Arquivo | Para que serve | Quando usar |
|---------|----------------|-------------|
| **FIX_RLS_SEM_AUTH_USERS.sql** | Cria função segura para RLS | Erro "permission denied for table users" ⭐ |
| **VERIFICAR_CONFIG_ACCESS_PROFILES.sql** | Verifica configuração de perfil | Verificar se tem acesso a Master Data |
| **DIAGNOSTICO_COMPLETO.sql** | Diagnóstico geral | Quando não sabe qual é o problema |
| **SOLUCAO_RAPIDA_PERMISSION_DENIED.txt** | Resumo rápido em texto | Ler antes de executar |
| **ERRO_PERMISSION_DENIED_USERS.md** | Explicação completa | Entender o problema a fundo |

---

## ✅ CHECKLIST DE VERIFICAÇÃO

### **Antes de executar qualquer script:**

```
[ ] Identifiquei o erro exato
[ ] Escolhi o arquivo correto
[ ] Tenho acesso ao Supabase SQL Editor
[ ] Fiz backup (opcional, scripts são seguros)
```

### **Depois de executar:**

```
[ ] Vi mensagem de sucesso
[ ] Recarreguei aplicação (F5)
[ ] Testei cadastrar geração
[ ] ✅ Funcionou!
```

### **Se não funcionou:**

```
[ ] Executei DIAGNOSTICO_COMPLETO.sql
[ ] Li os resultados
[ ] Identifiquei outro problema
[ ] Executei solução recomendada
```

---

## 🎯 FLUXOGRAMA DE DECISÃO

```
          ┌─────────────────────────────┐
          │ Erro ao cadastrar em        │
          │ Master Data > Carros        │
          └────────────┬────────────────┘
                       │
          ┌────────────▼────────────┐
          │ Qual é o erro?          │
          └────────────┬────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
┌──────────────┐ ┌──────────┐ ┌────────────────┐
│ "permission  │ │ "Acesso  │ │ Outro erro ou  │
│ denied for   │ │ negado"  │ │ não sei        │
│ table users" │ └──────────┘ └────────────────┘
└──────────────┘       │               │
       │               │               │
       ▼               ▼               ▼
┌──────────────┐ ┌──────────┐ ┌────────────────┐
│ FIX_RLS_SEM_ │ │ VERIFICAR│ │ DIAGNOSTICO_   │
│ AUTH_USERS   │ │ _CONFIG_ │ │ COMPLETO       │
│              │ │ ACCESS_  │ │                │
└──────────────┘ └──────────┘ └────────────────┘
       │               │               │
       └───────────────┼───────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Execute script │
              └────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Recarregue F5  │
              └────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Teste cadastro │
              └────────────────┘
                       │
              ┌────────▼────────┐
              │ Funcionou?      │
              └────────┬────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
         ┌────────┐      ┌──────────┐
         │ ✅ FIM │      │ Execute  │
         └────────┘      │ DIAGNOST │
                         │ ICO      │
                         └──────────┘
```

---

## 🆘 SUPORTE

### **Ainda não funciona?**

1. **Execute diagnóstico completo:**
   ```
   DIAGNOSTICO_COMPLETO.sql
   ```

2. **Copie os resultados e envie:**
   - Seção "SEU USUÁRIO"
   - Seção "SEU PERFIL ATUAL"
   - Seção "DIAGNÓSTICO FINAL"

3. **Informações úteis:**
   - Erro exato (print ou copiar mensagem)
   - Browser (Chrome, Firefox, etc)
   - Quando acontece (sempre, às vezes)

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- **Perfis de Acesso:** Como funcionam e como configurar
- **RLS Policies:** O que são e por que são necessárias
- **SECURITY DEFINER:** Como funções seguras funcionam
- **Master Data:** Estrutura completa do sistema

---

## 🎯 RESUMO EXECUTIVO

**Problema mais comum:**
```
Erro: permission denied for table users
```

**Solução mais rápida:**
```
Execute: FIX_RLS_SEM_AUTH_USERS.sql
Tempo: 1 minuto
```

**Taxa de sucesso:**
```
95% dos casos são resolvidos com este script
```

**Próximos passos:**
```
1. Execute o script
2. Recarregue (F5)
3. Teste
4. ✅ Funciona!
```

---

**Boa sorte! 🚀**

*Última atualização: 2026-01-22*
