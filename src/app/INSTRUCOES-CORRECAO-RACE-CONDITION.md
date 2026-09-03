# 🚨 INSTRUÇÕES: CORREÇÃO DE RACE CONDITION

## 🎯 PROBLEMA IDENTIFICADO

**Bug:** Dois usuários editando o MESMO chassis simultaneamente causam perda de dados.

**Causa:** Race Condition (LOST UPDATE) - último a salvar sobrescreve o primeiro.

**Gravidade:** 🔴 **CRÍTICA** - Perda silenciosa de dados

---

## ✅ SOLUÇÃO IMPLEMENTADA

**Optimistic Locking** - Usa versionamento para detectar conflitos e refazer merge automaticamente.

---

## 📋 PASSOS PARA APLICAR A CORREÇÃO

### **PASSO 1: Aplicar Migração no Supabase** 🔧

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `/MIGRACAO-OPTIMISTIC-LOCKING.sql`
4. Execute o SQL
5. Verifique se a coluna foi criada:

```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'conference_sessions' 
  AND column_name = 'progress_version';
```

**Resultado esperado:**
```
column_name
-----------------
progress_version
```

---

### **PASSO 2: Atualizar Código** 💻

O código já foi atualizado com suporte para Optimistic Locking!

**Arquivo modificado:** `/pages/ConferirPneus.tsx`

**Funções atualizadas:**
- ✅ `updateProgressImmediately()` - Agora usa `progress_version`
- ✅ `saveTireWithRetry()` - Detecta conflitos e refaz merge
- ✅ Logs detalhados de conflitos

---

### **PASSO 3: Testar com 2 Usuários** 🧪

**Teste de Race Condition:**

```javascript
// 🖥️ USUÁRIO A (Navegador 1):
1. Abrir chassis "028/992.1"
2. Bipar código "00012345" (DD)
3. Observar logs:
   "📌 Versão atual do progress: 0"
   "✅ Progress salvo com sucesso! Nova versão: 1"

// 🖥️ USUÁRIO B (Navegador 2 - mesmo tempo):
1. Abrir o MESMO chassis "028/992.1"
2. Bipar código "00067890" (DE)
3. Observar logs:
   "📌 Versão atual do progress: 1"  ← Detectou que mudou!
   "✅ Progress salvo com sucesso! Nova versão: 2"

// ✅ RESULTADO ESPERADO:
// Ambos os códigos devem aparecer:
// - DD: "00012345" (Usuário A)
// - DE: "00067890" (Usuário B)
```

**Se houver conflito (normal!):**

```
⚠️ Conflito detectado! Outro usuário atualizou o progress.
   Versão esperada: 0, mas foi modificada por outro usuário.
   Refazendo merge com dados mais recentes...
🔒 [Tentativa 2/5] Salvando progress IMEDIATAMENTE...
   📌 Versão atual do progress: 1
✅ Progress salvo com sucesso! Nova versão: 2
```

---

## 🔍 COMO FUNCIONA O OPTIMISTIC LOCKING?

### **Fluxo Normal (sem conflito):**

```
1. Usuário A bipa código
2. Sistema busca progress (versão = 0)
3. Atualiza localmente
4. Salva no Supabase COM condição:
   UPDATE ... WHERE id = 'abc' AND progress_version = 0
5. Incrementa versão para 1
6. ✅ Sucesso!
```

### **Fluxo com Conflito (2 usuários simultâneos):**

```
USUÁRIO A:                          USUÁRIO B:
1. Busca (v=0)                      1. Busca (v=0)
2. Edita local                      2. Edita local
3. UPDATE WHERE v=0 ✅               (esperando...)
   → v=1                            
                                    3. UPDATE WHERE v=0 ❌ FALHA!
                                       (v agora é 1, não 0!)
                                    4. ⚠️ Conflito detectado!
                                    5. Busca NOVAMENTE (v=1)
                                    6. Mescla dados do A + dados do B
                                    7. UPDATE WHERE v=1 ✅
                                       → v=2
                                    8. ✅ Ambos os dados salvos!
```

---

## 📊 LOGS ESPERADOS

### **Salvamento Normal:**

```
🔒 [Tentativa 1/5] Salvando progress IMEDIATAMENTE...
   📌 Versão atual do progress: 5
   📌 Última atualização: 2026-02-25T10:30:00Z
✅ Progress salvo com sucesso! Nova versão: 6
```

### **Conflito Detectado e Resolvido:**

```
🔒 [Tentativa 1/5] Salvando progress IMEDIATAMENTE...
   📌 Versão atual do progress: 5
⚠️ Conflito detectado! Outro usuário atualizou o progress.
   Versão esperada: 5, mas foi modificada por outro usuário.
   Refazendo merge com dados mais recentes...
🔒 [Tentativa 2/5] Salvando progress IMEDIATAMENTE...
   📌 Versão atual do progress: 6
✅ Progress salvo com sucesso! Nova versão: 7
```

### **Conflito NÃO Resolvido (raro):**

```
🔒 [Tentativa 1/5] Salvando progress IMEDIATAMENTE...
⚠️ Conflito detectado!
🔒 [Tentativa 2/5] Salvando progress IMEDIATAMENTE...
⚠️ Conflito detectado!
🔒 [Tentativa 3/5] Salvando progress IMEDIATAMENTE...
⚠️ Conflito detectado!
🔒 [Tentativa 4/5] Salvando progress IMEDIATAMENTE...
⚠️ Conflito detectado!
🔒 [Tentativa 5/5] Salvando progress IMEDIATAMENTE...
❌ Tentativa 5 falhou
🚨 Toast: "Conflito ao salvar dados! Outro usuário pode estar editando o mesmo chassis."
```

---

## 🧪 TESTES OBRIGATÓRIOS

### **TESTE 1: Salvamento Normal**
```
1 usuário bipa 4 códigos
✅ Deve salvar normalmente
✅ Versão deve incrementar: 0 → 1 → 2 → 3 → 4
```

### **TESTE 2: Edição Simultânea (CRÍTICO)**
```
2 usuários bipam códigos NO MESMO chassis AO MESMO TEMPO
✅ Ambos os códigos devem aparecer
✅ Logs devem mostrar "Conflito detectado" e "Refazendo merge"
✅ Nenhum código deve sumir
```

### **TESTE 3: Edição em Chassis Diferentes**
```
Usuário A edita chassis "028/992.1"
Usuário B edita chassis "029/993.2"
✅ Nenhum conflito deve ocorrer
✅ Ambos salvam normalmente
```

### **TESTE 4: Coluna Não Existe (Fallback)**
```
Se a migração NÃO foi aplicada:
✅ Sistema deve funcionar SEM optimistic locking
⚠️ Toast de aviso: "Sistema sem proteção contra edição simultânea"
```

---

## ⚠️ IMPORTANTE

### **SE NÃO APLICAR A MIGRAÇÃO:**

O sistema continuará funcionando, MAS:
- ❌ Sem proteção contra race conditions
- ⚠️ Dois usuários editando o mesmo chassis podem perder dados
- ⚠️ Toast de aviso será exibido

### **APÓS APLICAR A MIGRAÇÃO:**

- ✅ Proteção completa contra race conditions
- ✅ Conflitos detectados e resolvidos automaticamente
- ✅ Dados de todos os usuários preservados

---

## 📝 CHECKLIST DE VERIFICAÇÃO

Antes de marcar como concluído:

- [ ] SQL da migração foi executado no Supabase
- [ ] Coluna `progress_version` existe na tabela
- [ ] Código foi atualizado (já feito!)
- [ ] Teste 1 passou (salvamento normal)
- [ ] Teste 2 passou (edição simultânea) **← MAIS IMPORTANTE**
- [ ] Teste 3 passou (chassis diferentes)
- [ ] Logs de conflito aparecem corretamente
- [ ] Nenhum código sumiu nos testes

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ **Aplicar migração no Supabase** (OBRIGATÓRIO!)
2. ✅ **Testar com 2 navegadores/usuários**
3. ✅ **Monitorar logs nos primeiros dias**
4. ✅ **Confirmar que nenhum código sumiu**

**Após aplicar, o sistema estará 100% protegido contra race conditions!** 🔒
