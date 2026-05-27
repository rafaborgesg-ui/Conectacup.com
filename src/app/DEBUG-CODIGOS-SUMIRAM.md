# 🚨 DEBUG: CÓDIGOS SUMIRAM APÓS BIPAR

## 📋 SITUAÇÃO REPORTADA

**Usuário:** "Acabei de bipar os 16 códigos do chassi 028/992.1 Chico Horta, ao sair e voltar os códigos simplesmente sumiram"

**Gravidade:** 🔴 **CRÍTICA** - Perda de dados após bipagem

---

## 🔍 ONDE OS DADOS SÃO SALVOS

### **1. Tabela Principal: `conference_sessions`**

**Campos importantes:**
```sql
- id (UUID) → ID único da sessão
- progress (JSONB) → 🔥 AQUI FICAM TODOS OS CÓDIGOS BIPADOS
- excel_data (JSONB) → Dados da planilha Excel + contador tiresChecked
- created_at, updated_at, updated_by
```

### **2. Estrutura do campo `progress`:**

```json
{
  "0": {  ← Chassis Index 0
    "tireSets": [
      {
        "jogo": 1,
        "label": "Jogo 1",
        "montadoNoCarro": true,
        "tires": [
          {
            "posicao": "DD",
            "codigo": "00012345",  ← CÓDIGO BIPADO
            "piloto": "Chico Horta",
            "ano": "2024",
            "set": "A",
            "tipo": "Slick Soft",
            "voltas": "10",
            "situacao": "Guardar",
            "registeredBy": "João Silva",  ← QUEM BIPOU
            "registeredAt": "2026-02-24T...",  ← QUANDO BIPOU
            "_originalIndex": 0
          },
          { ... }, // DE
          { ... }, // TE
          { ... }  // TD
        ]
      },
      { ... }, // Jogo 2
      { ... }, // Jogo 3
      { ... }  // Jogo 4
    ],
    "tiresChecked": 16,  ← Total de pneus bipados
    "completed": true,   ← Se finalizou
    "lockedBy": null,
    "lockedAt": null
  },
  "1": { ... }, ← Chassis Index 1
  "2": { ... }  ← Chassis Index 2
}
```

---

## 🔥 FLUXO DE SALVAMENTO (COMO DEVERIA FUNCIONAR)

### **Quando você bipa um código:**

```
1. handleTireCodeSubmitInline() → Função chamada ao bipar
    ↓
2. handleTireCodeSubmit() → Processa o código
    ↓
3. saveToSupabaseRealtime() → Salva em 2 tabelas:
    ↓
    ├─ tire_scan_history (histórico de cada bipagem)
    └─ conference_sessions.excel_data (atualiza apenas excel_data, NÃO progress!)
    ↓
4. setTireSets() → Atualiza estado local
    ↓
5. updateActiveSessionInRealTime() → 🔥 FUNÇÃO QUE SALVA O PROGRESS
    ↓
6. updateConferenceSessionRealtime() → Salva no Supabase
    ↓
    UPDATE conference_sessions
    SET progress = { ... },  ← 🔥 CÓDIGOS SÃO SALVOS AQUI
        excel_data = { ... },
        updated_at = NOW()
    WHERE id = 'session-123'
```

---

## 🐛 POSSÍVEIS CAUSAS DOS CÓDIGOS SUMIREM

### **CAUSA #1: Sessão foi criada SEM `progress` inicial** ⚠️

**Sintoma:** Ao carregar a planilha, cria a sessão mas não inicializa `progress: {}`

**Verificação no Console:**
```javascript
// Ao carregar planilha, procure por:
"🔥 Sessão compartilhada criada:"
{
  id: "...",
  progress: null  ← 🚨 PROBLEMA! Deveria ser {}
}
```

**Consequência:** Quando você fecha o modal sem finalizar, o código chama `updateActiveSessionInRealTime()` mas pode falhar.

---

### **CAUSA #2: `updateActiveSessionInRealTime()` NÃO É CHAMADO ao fechar modal** ⚠️

**Quando você clica no X do modal:**
```javascript
closeChassisModal() {
  // ... código ...
  
  // 🔥 PROCURE POR ESTA LINHA NO CONSOLE:
  "✅ Progresso salvo no Supabase para Chassis 028/992.1"
}
```

**Se NÃO aparecer essa linha** = Os dados não foram salvos no Supabase!

**Verificação:** Abra o console (F12) e procure por:
- ✅ `"📤📤📤 ENVIANDO UPDATE PARA SUPABASE"` (deve aparecer)
- ✅ `"✅✅✅ SESSÃO ATUALIZADA NO SUPABASE COM SUCESSO!"` (deve aparecer)

Se NÃO aparecer = **Função não foi chamada!**

---

### **CAUSA #3: Erro silencioso no UPDATE** ⚠️

**Sintoma:** A função é chamada mas o UPDATE falha

**Verificação no Console:**
```javascript
// Procure por:
"❌❌❌ ERRO AO ATUALIZAR SESSÃO:"
// ou
"❌ Erro inesperado ao atualizar sessão:"
```

**Possíveis erros:**
- `activeSessionId` é `null` ou inválido
- Sessão não existe mais no banco
- Problema de permissão RLS (Row Level Security)
- `tireSets` está vazio (bloqueado por validação)

---

### **CAUSA #4: Ao reabrir, carrega sessão ANTIGA** ⚠️

**Sintoma:** Os dados foram salvos, mas ao reabrir carrega dados antigos

**Verificação:**
```javascript
// Ao fechar e abrir o chassis, procure por:
"📥 Carregando progresso do Supabase..."
"📥 Dados restaurados do Supabase:"
{
  tireSets: [ ... ],  ← Deveria ter 4 jogos com códigos
  tiresChecked: 16   ← Deveria ser 16
}
```

Se `tireSets` está **vazio** ou `tiresChecked` é **0** = Dados não foram salvos!

---

### **CAUSA #5: BLOQUEIO DE SEGURANÇA (tireSets vazio)** ⚠️

**Existe uma validação que BLOQUEIA salvamento de dados vazios:**

```javascript
if (tireSets.length === 0) {
  console.error('🚨🚨🚨 BLOQUEIO DE SEGURANÇA!');
  console.error('   Tentativa de salvar tireSets VAZIO');
  console.error('   Operação BLOQUEADA para evitar perda de dados!');
  return false;
}
```

**Se você vir essa mensagem no console** = Os dados NÃO foram salvos porque `tireSets` estava vazio!

---

## 🧪 COMO DIAGNOSTICAR (PASSO A PASSO)

### **TESTE RÁPIDO:**

1. **Abra o Console (F12)** ANTES de começar a bipar
2. **Limpe o console** (clique no ícone 🚫)
3. **Bipe 4 códigos** em um chassis (qualquer um)
4. **Feche o modal** (clique no X)
5. **COPIE TODOS OS LOGS DO CONSOLE** (Ctrl+A, Ctrl+C)
6. **Abra o chassis novamente**
7. **Verifique se os códigos apareceram**

---

### **LOGS QUE DEVEM APARECER (EXEMPLO CORRETO):**

```
🚀 handleTireCodeSubmitInline CHAMADO!
📦 Parâmetros recebidos: { code: "12345", jogo: 1, position: 0 }

🚀 handleTireCodeSubmit CHAMADO! Input: 12345 | targetIndex: 0

🔍 [BACKGROUND] Buscando dados do pneu: 12345

💾 Salvando no Supabase (tempo real)...
   chassis: 028/992.1
   jogo: 1
   posicao: DD
   codigo: 00012345
   action: BIPAR

✅ Histórico de bipagem salvo no Supabase!
✅ Sessão atualizada no Supabase com sucesso!

--- (ao fechar o modal) ---

🔥 Fechando modal de conferência...
📤📤📤 ENVIANDO UPDATE PARA SUPABASE
   📌 Session ID: abc-123-...
   📌 Chassis Index: 0
   📌 Timestamp: 2026-02-24T...

📡📡📡 ========================================
📡 ENVIANDO UPDATE PARA SUPABASE
📡 Session ID: abc-123-...
📡 Chassis Index: 0
📡 ========================================

✅✅✅ SESSÃO ATUALIZADA NO SUPABASE COM SUCESSO!
   💡 Outros dispositivos devem receber UPDATE em tempo real

✅ Progresso salvo no Supabase para Chassis 028/992.1
```

---

### **SE OS CÓDIGOS SUMIRAM, PROCURE POR:**

#### ❌ **Erro 1: Sessão não encontrada**
```
"⚠️ Sessão não encontrada: abc-123-..."
```
→ `activeSessionId` inválido

#### ❌ **Erro 2: tireSets vazio**
```
"🚨🚨🚨 ALERTA CRÍTICO: Tentando salvar tireSets VAZIO no Supabase!"
```
→ Dados foram perdidos antes de salvar

#### ❌ **Erro 3: UPDATE falhou**
```
"❌❌❌ ERRO AO ATUALIZAR SESSÃO:"
{
  code: "...",
  message: "..."
}
```
→ Problema no Supabase (permissão, conexão, etc)

#### ❌ **Erro 4: Função não foi chamada**
```
(NENHUM LOG de "📤📤📤 ENVIANDO UPDATE")
```
→ `closeChassisModal()` não chamou `updateActiveSessionInRealTime()`

---

## 🔧 VERIFICAÇÃO MANUAL NO SUPABASE

### **Passo 1: Verificar se a sessão existe**

```sql
SELECT 
  id,
  season_name,
  etapa_name,
  created_at,
  updated_at,
  is_active,
  jsonb_object_keys(progress) as chassis_indexes
FROM conference_sessions
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;
```

**O que procurar:**
- `is_active` = `true`
- `chassis_indexes` = lista de índices (0, 1, 2, ...)

---

### **Passo 2: Ver o conteúdo do `progress`**

```sql
SELECT 
  id,
  season_name,
  progress
FROM conference_sessions
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;
```

**Expanda o JSON `progress`:**
```json
{
  "0": {
    "tireSets": [ ... ],  ← Deve ter 4 jogos
    "tiresChecked": 16    ← Deve ser 16
  }
}
```

**Se `progress` está `null` ou `{}`** = Dados não foram salvos!

---

### **Passo 3: Ver histórico de bipagens**

```sql
SELECT 
  chassis,
  jogo,
  posicao,
  tire_code,
  action,
  user_name,
  created_at
FROM tire_scan_history
WHERE session_id = 'abc-123-...'  -- Cole o ID da sessão
  AND chassis = '028/992.1'
ORDER BY created_at DESC;
```

**O que procurar:**
- Deve ter **16 registros** (uma linha para cada pneu bipado)
- Se tem 16 registros no histórico MAS `progress` está vazio = BUG!

---

## 📞 INFORMAÇÕES QUE PRECISO

Para investigar, me envie:

### ✅ **1. LOGS COMPLETOS DO CONSOLE**
- Abra o console (F12)
- Limpe (🚫)
- Bipe 4 códigos
- Feche o modal
- Abra novamente
- **COPIE TODOS OS LOGS** (Ctrl+A, Ctrl+C, Cole aqui)

### ✅ **2. Query no Supabase**
Execute esta query e me envie o resultado:

```sql
SELECT 
  id,
  season_name,
  etapa_name,
  created_at,
  updated_at,
  progress,
  (SELECT COUNT(*) FROM tire_scan_history WHERE session_id = conference_sessions.id) as total_bipagens
FROM conference_sessions
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;
```

### ✅ **3. Histórico de bipagens**
```sql
SELECT 
  chassis,
  jogo,
  posicao,
  tire_code,
  action,
  user_name,
  created_at
FROM tire_scan_history
WHERE chassis = '028/992.1'
ORDER BY created_at DESC
LIMIT 20;
```

### ✅ **4. Responda:**
- ❓ Você clicou em **"Finalizar Conferência"** ou apenas **fechou o modal (X)**?
- ❓ Apareceu algum **toast de erro** (vermelho)?
- ❓ Apareceu a mensagem **"✅ Progresso salvo"**?
- ❓ Quanto tempo demorou entre **bipar** e **fechar o modal**?
- ❓ Você está usando **modo coletor** (800x480) ou **modo normal** (desktop)?

---

## 🚨 WORKAROUND TEMPORÁRIO

Enquanto investigo, faça isso para **NÃO PERDER DADOS**:

1. **SEMPRE clique em "Finalizar Conferência"** ao terminar os 16 pneus
2. **NÃO feche o modal** no meio da bipagem (só feche se clicar em Finalizar)
3. **Espere 2 segundos** após bipar o último código antes de fechar

---

**ME ENVIE OS LOGS E AS QUERIES AGORA!** 🔥
Preciso ver o que aconteceu exatamente para corrigir.
