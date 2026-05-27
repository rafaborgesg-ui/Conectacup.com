# 📚 INDEX - Guia Completo das Migrações

## 🎯 Você está aqui porque...

Você tentou editar uma geração ou chassis e recebeu um erro. Vamos resolver isso!

---

## ⚡ SOLUÇÃO RÁPIDA (1 minuto)

### **Cenário: Você JÁ TEM access_profiles**

Execute **APENAS ESTE ARQUIVO**:

```
📁 EXECUTAR_TUDO_DE_UMA_VEZ.sql
```

✅ Recarregue a aplicação (F5) e teste!

---

## 📖 GUIAS DISPONÍVEIS

### **🚀 Começar Agora**
```
📁 README_COMECE_AQUI.md
```
→ Guia completo com todas as opções

### **🔍 Verificar Primeiro**
```
📁 00_VERIFICACAO_ANTES_DE_EXECUTAR.sql
```
→ Ver o que você precisa fazer

### **📋 Guia Detalhado**
```
📁 GUIA_RAPIDO_COM_ACCESS_PROFILES.md
```
→ Passo a passo com explicações

---

## 📁 ARQUIVOS DE EXECUÇÃO

### **Solução Completa em 1 Arquivo** ⭐
```
📁 EXECUTAR_TUDO_DE_UMA_VEZ.sql
```
- Cria user_profiles
- Atribui perfil admin
- Aplica policies
- Mostra relatório

### **Solução Passo a Passo**
```
1. 📁 CREATE_USER_PROFILES_ONLY.sql
   → Cria tabela user_profiles

2. 📁 QUICK_FIX_SIMPLE.sql
   → Aplica policies de segurança
```

### **Solução Temporária** ⚠️
```
📁 QUICK_FIX_TEMP.sql
```
→ Permite TODOS editarem (use só se precisar urgente)

---

## 🛠️ ARQUIVOS UTILITÁRIOS

### **Comandos Administrativos**
```
📁 COMANDOS_UTEIS.sql
```
→ Consultas para verificar perfis, atribuir admin, etc.

### **Documentação Antiga**
```
📁 SOLUCAO_USER_PROFILES_NAO_EXISTE.md
📁 INSTRUCOES_ERRO_SINTAXE.md
```
→ Documentação de problemas anteriores (pode ignorar)

---

## 🎯 FLUXOGRAMA DE DECISÃO

```
┌─────────────────────────────────────┐
│ Você tem access_profiles?          │
└─────────────┬───────────────────────┘
              │
              ├─ SIM → Você está no lugar certo! ✅
              │        Execute: EXECUTAR_TUDO_DE_UMA_VEZ.sql
              │
              └─ NÃO → Execute primeiro:
                       CHECK_AND_CREATE_USER_PROFILES.sql
```

---

## 📊 ESTRUTURA DO SISTEMA

```
Supabase Database
│
├── auth.users (usuários do sistema)
│   └── id
│
├── access_profiles (perfis de acesso)
│   ├── id
│   ├── name
│   └── is_admin ← Define quem pode editar
│
├── user_profiles (relacionamento)
│   ├── user_id → auth.users
│   └── profile_id → access_profiles
│
├── geracao (dados de gerações)
│   └── RLS Policies:
│       ├── SELECT: todos autenticados ✅
│       └── INSERT/UPDATE/DELETE: apenas admins ✅
│
└── chassis (dados de chassis)
    └── RLS Policies:
        ├── SELECT: todos autenticados ✅
        └── INSERT/UPDATE/DELETE: apenas admins ✅
```

---

## 🚦 ORDEM RECOMENDADA

### **Opção 1: Mais Rápida** ⚡
```bash
1. Execute: EXECUTAR_TUDO_DE_UMA_VEZ.sql
2. Recarregue aplicação (F5)
3. Teste editar geração
4. ✅ Pronto!
```

### **Opção 2: Mais Controlada** 🎯
```bash
1. Execute: 00_VERIFICACAO_ANTES_DE_EXECUTAR.sql
2. Leia o output e veja o que fazer
3. Execute: CREATE_USER_PROFILES_ONLY.sql
4. Execute: QUICK_FIX_SIMPLE.sql
5. Recarregue aplicação (F5)
6. Teste editar geração
7. ✅ Pronto!
```

### **Opção 3: Temporária** ⚠️
```bash
1. Execute: QUICK_FIX_TEMP.sql
2. Recarregue aplicação (F5)
3. ✅ Funciona (mas TODOS podem editar)
4. Depois execute Opção 1 ou 2 para corrigir
```

---

## ❓ PERGUNTAS FREQUENTES

### **Q: Qual arquivo eu executo?**
**A:** Se você já tem `access_profiles`, execute `EXECUTAR_TUDO_DE_UMA_VEZ.sql`

### **Q: Como executo no Supabase?**
**A:**
1. Abra https://supabase.com/dashboard
2. Selecione seu projeto
3. Menu lateral → SQL Editor
4. + New query
5. Cole o conteúdo do arquivo
6. Clique em Run ▶️

### **Q: Como sei se funcionou?**
**A:** Recarregue a aplicação (F5) e tente editar uma geração. Se funcionar sem erro, está OK! ✅

### **Q: Recebi "Success. No rows returned". Está certo?**
**A:** Sim! ✅ Isso significa que executou com sucesso.

### **Q: Recebi erro. O que faço?**
**A:** 
1. Copie o erro completo
2. Execute `00_VERIFICACAO_ANTES_DE_EXECUTAR.sql`
3. Veja o output e identifique o problema
4. Ou use `QUICK_FIX_TEMP.sql` como solução temporária

### **Q: Posso executar o mesmo arquivo duas vezes?**
**A:** Sim! Os scripts usam `IF NOT EXISTS` e `ON CONFLICT`, então são seguros para re-executar.

---

## 🆘 TROUBLESHOOTING

| Erro | Solução |
|------|---------|
| `relation "public.user_profiles" does not exist` | Execute `CREATE_USER_PROFILES_ONLY.sql` |
| `relation "public.access_profiles" does not exist` | Execute `CHECK_AND_CREATE_USER_PROFILES.sql` |
| `permission denied for table` | Execute `GRANT SELECT ON public.user_profiles TO authenticated;` |
| `new row violates row-level security policy` | Use `COMANDOS_UTEIS.sql` seção 2 para se atribuir admin |
| `syntax error at or near "UNION"` | Arquivo corrigido! Re-execute. |

---

## 📞 SUPORTE

Se nada funcionar:

1. Execute `COMANDOS_UTEIS.sql` seção 10 (Troubleshooting)
2. Copie o output completo
3. Mostre o output + erro que você está recebendo

---

## ✅ CHECKLIST FINAL

```
[ ] Li este INDEX.md
[ ] Escolhi qual arquivo executar
[ ] Executei no Supabase SQL Editor
[ ] Recarreguei a aplicação (F5)
[ ] Testei editar geração/chassis
[ ] ✅ FUNCIONA!
```

---

## 🎉 CONCLUSÃO

**Caminho mais rápido:**
1. Execute `EXECUTAR_TUDO_DE_UMA_VEZ.sql`
2. Recarregue aplicação
3. Teste
4. Pronto! 🚀

**Leia `README_COMECE_AQUI.md` para mais detalhes.**

---

**Boa sorte! Você vai conseguir! 💪**
