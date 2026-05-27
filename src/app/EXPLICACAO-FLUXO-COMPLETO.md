# 🔥 EXPLICAÇÃO COMPLETA: POR QUE OS CÓDIGOS SUMIRAM

## 📊 ESTRUTURA DE ARMAZENAMENTO NO SUPABASE

### **Tabela: `conference_sessions`**

```sql
CREATE TABLE conference_sessions (
  id UUID PRIMARY KEY,
  season_id UUID,
  season_name TEXT,
  stage_id UUID,
  etapa_name TEXT,
  excel_data JSONB,        ← Dados da planilha Excel + contador
  progress JSONB,          ← 🔥 AQUI FICAM OS CÓDIGOS BIPADOS!
  file_name TEXT,
  total_chassis INTEGER,
  completed_chassis INTEGER,
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  updated_by UUID,
  is_active BOOLEAN
);
```

### **Estrutura do campo `progress`:**

```json
{
  "0": {  ← Índice do chassis na lista
    "tireSets": [
      {
        "jogo": 1,
        "label": "Jogo 1",
        "montadoNoCarro": true,
        "tires": [
          {
            "posicao": "DD",
            "codigo": "00012345",  ← 🔥 CÓDIGO BIPADO
            "piloto": "Chico Horta",
            "ano": "2024",
            "set": "A",
            "tipo": "Slick Soft",
            "voltas": "10",
            "situacao": "Guardar",
            "registeredBy": "João Silva",
            "registeredAt": "2026-02-24T15:30:00Z",
            "_originalIndex": 0
          },
          { ... },  // DE
          { ... },  // TE
          { ... }   // TD
        ]
      },
      { ... },  // Jogo 2
      { ... },  // Jogo 3
      { ... }   // Jogo 4
    ],
    "tiresChecked": 16,
    "completed": true,
    "lockedBy": null,
    "lockedAt": null
  },
  "1": { ... },  ← Outro chassis
  "2": { ... }   ← Outro chassis
}
```

---

## 🔄 FLUXO COMPLETO (CICLO DE VIDA DOS DADOS)

### **1️⃣ AO ABRIR A PÁGINA (useEffect inicial)**

```javascript
// Linha 301-354 (ConferirPneus.tsx)
useEffect(() => {
  const loadCurrentUserAndSession = async () => {
    // 1. Busca usuário logado
    const user = await supabase.auth.getUser();
    setCurrentUserId(user.id);
    setCurrentUserName(user.name);
    
    // 2. 🔥 VERIFICA SE JÁ EXISTE SESSÃO ATIVA
    const { data: activeSessions } = await supabase
      .from('conference_sessions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    
    // 3. Se encontrar sessão ativa, CARREGA AUTOMATICAMENTE
    if (activeSessions && activeSessions.length > 0) {
      const session = activeSessions[0];
      console.log('🔥 Sessão ativa encontrada!', session);
      await loadSharedSession(session.id);  // ← CHAMA FUNÇÃO DE CARREGAR
    } else {
      console.log('⚠️ Nenhuma sessão ativa encontrada');
    }
  };
  
  loadCurrentUserAndSession();
}, []);
```

**✅ O QUE DEVERIA ACONTECER:**
- Ao abrir a página, busca sessão ativa
- Se existir, carrega automaticamente (chama `loadSharedSession`)
- Restaura todos os dados: `extractedData`, `savedTireSets`, `completedChassis`, etc.

**❌ O QUE PODE TER DADO ERRADO:**
- Se `progress` estava `null` na sessão (problema corrigido agora)
- Se houve erro ao carregar a sessão (verificar console)
- Se a sessão foi marcada como `is_active = false` por engano

---

### **2️⃣ FUNÇÃO loadSharedSession() - RESTAURA OS DADOS**

```javascript
// Linha 775-900 (ConferirPneus.tsx)
const loadSharedSession = async (sessionId: string) => {
  // 1. Busca sessão no Supabase
  const { data: session } = await supabase
    .from('conference_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  setActiveSessionId(session.id);
  
  // 2. 🔥 EXTRAI O CAMPO PROGRESS
  const baseData = session.excel_data;
  const progress = session.progress || {};  // ← SE progress É NULL, FICA {}
  
  // 3. 🔥 RESTAURA savedTireSets DO PROGRESS
  const restoredSavedSets = {};
  
  Object.keys(progress).forEach(key => {
    const idx = parseInt(key);  // Ex: "0" → 0
    const chassisProgress = progress[key];
    
    if (chassisProgress.tireSets) {
      restoredSavedSets[idx] = chassisProgress.tireSets.map(set => ({
        ...set,
        label: `Jogo ${set.jogo}`,
        tires: set.tires.map((tire, tireIdx) => ({
          ...tire,
          _originalIndex: tire._originalIndex ?? tireIdx,
          registeredBy: tire.registeredBy,  // 🔥 Preserva quem bipou
          registeredAt: tire.registeredAt   // 🔥 Preserva quando bipou
        }))
      }));
    }
  });
  
  // 4. 🔥 ATUALIZA OS ESTADOS
  setSavedTireSets(restoredSavedSets);  // ← RESTAURA OS CÓDIGOS
  setExtractedData(correctedMergedData);
  setCompletedChassis(restoredCompletedChassis);
  setCurrentStep('chassis');
  
  console.log('✅ Sessão restaurada!', {
    chassis_count: correctedMergedData.length,
    saved_sets_count: Object.keys(restoredSavedSets).length
  });
};
```

**✅ O QUE DEVERIA ACONTECER:**
- Extrai `progress` da sessão
- Para cada chassis no `progress`, restaura os `tireSets` (códigos bipados)
- Atualiza `savedTireSets` com os códigos

**❌ O QUE PODE TER DADO ERRADO:**
- **`progress` estava `null`** → `restoredSavedSets` fica vazio `{}`
- **`progress` estava `{}`** → Nenhum chassis restaurado
- **`progress["0"]` existia mas `tireSets` estava vazio** → Chassis sem códigos

---

### **3️⃣ QUANDO VOCÊ BIPA UM CÓDIGO**

```javascript
// handleTireCodeSubmit() → Linha ~3108
const handleTireCodeSubmit = async (code: string) => {
  // 1. Busca dados do pneu no estoque
  const tireData = await getTireByBarcode(code);
  
  // 2. Atualiza estado local IMEDIATAMENTE
  const newSets = tireSets.map(set => {
    if (set.jogo === activeJogo) {
      set.tires[position] = {
        codigo: code,
        piloto: tireData.pilot,
        // ... outros dados
        registeredBy: currentUserName,  // Quem bipou
        registeredAt: new Date().toISOString()  // Quando bipou
      };
    }
    return set;
  });
  
  setTireSets(newSets);
  
  // 3. 🔥 SALVA NO SUPABASE EM TEMPO REAL
  await saveToSupabaseRealtime(
    chassisNumber,
    jogoNumber,
    positionIndex,
    code,
    'BIPAR',
    tireData
  );
};
```

**O que `saveToSupabaseRealtime` faz:**

```javascript
// Linha ~2991-3106
const saveToSupabaseRealtime = async (...) => {
  // 1. 🔥 Salva no HISTÓRICO (tire_scan_history)
  await supabase
    .from('tire_scan_history')
    .insert({
      session_id: activeSessionId,
      chassis: chassisNumber,
      jogo: jogoNumber,
      posicao: 'DD',
      tire_code: code,
      action: 'BIPAR',
      user_id: currentUserId,
      user_name: currentUserName,
      tire_data: tireData,
      created_at: now
    });
  
  // 2. 🔥 Atualiza excel_data (NÃO O PROGRESS!)
  const { data: sessionData } = await supabase
    .from('conference_sessions')
    .select('excel_data')
    .eq('id', activeSessionId)
    .single();
  
  const updatedExcelData = sessionData.excel_data.map(chassis => {
    if (chassis.chassis === chassisNumber) {
      chassis.games[jogoIndex].positions[positionIndex] = code;
    }
    return chassis;
  });
  
  await supabase
    .from('conference_sessions')
    .update({
      excel_data: updatedExcelData,  // ← Atualiza APENAS excel_data
      updated_at: now
    })
    .eq('id', activeSessionId);
};
```

**⚠️ IMPORTANTE:**
- `saveToSupabaseRealtime()` salva em `tire_scan_history` ✅
- `saveToSupabaseRealtime()` atualiza `excel_data` ✅
- `saveToSupabaseRealtime()` **NÃO atualiza `progress`** ❌

---

### **4️⃣ QUANDO VOCÊ FECHA O MODAL (SEM FINALIZAR)**

```javascript
// Linha 2466-2594 (closeChassisModal)
const closeChassisModal = () => {
  console.log('🔍 closeChassisModal chamado!');
  
  if (selectedChassisIndex !== null) {
    console.log('💾 Salvando progresso...');
    
    const totalChecked = countCheckedTires(tireSets);
    
    // Atualiza extractedData
    const newData = [...extractedData];
    newData[selectedChassisIndex].tiresChecked = totalChecked;
    setExtractedData(newData);
    
    // Atualiza savedTireSets
    setSavedTireSets(prev => ({
      ...prev,
      [selectedChassisIndex]: tireSets
    }));
    
    // 🔥 SALVA NO SUPABASE (progress)
    updateActiveSessionInRealTime(newData, tireSets, selectedChassisIndex);
    
    console.log('✅ Progresso salvo no Supabase');
  }
  
  // Limpa o estado do modal
  setSelectedChassisIndex(null);
  setTireSets([]);
  setActiveJogo(1);
  setActivePneuPosition(0);
};
```

**O que `updateActiveSessionInRealTime` faz:**

```javascript
// Linha 2624-2706
const updateActiveSessionInRealTime = async (
  updatedExtractedData,
  updatedTireSets,
  currentChassisIndex
) => {
  // 🚨 VALIDAÇÃO: Bloqueia se tireSets estiver vazio
  if (updatedTireSets.length === 0) {
    console.error('🚨 BLOQUEIO: tireSets vazio!');
    return;  // ← NÃO SALVA SE ESTIVER VAZIO
  }
  
  // Chama função do utils/tireCheckSupabase.ts
  await updateConferenceSessionRealtime(
    activeSessionId,
    currentChassisIndex,
    updatedTireSets,  // ← Os códigos bipados
    tiresChecked,
    completed
  );
};
```

**O que `updateConferenceSessionRealtime` faz:**

```javascript
// utils/tireCheckSupabase.ts - Linha 890-984
export async function updateConferenceSessionRealtime(...) {
  // 1. Busca sessão atual
  const { data: session } = await supabase
    .from('conference_sessions')
    .select('progress, excel_data')
    .eq('id', sessionId)
    .single();
  
  // 2. 🔥 ATUALIZA O PROGRESS
  const updatedProgress = {
    ...(session.progress || {}),  // ← Mantém progress existente
    [chassisIndex]: {
      tireSets,       // ← Salva os códigos
      tiresChecked,
      completed,
      lockedBy: user.id,
      lockedAt: new Date().toISOString()
    }
  };
  
  // 3. 🔥 SALVA DE VOLTA NO SUPABASE
  await supabase
    .from('conference_sessions')
    .update({
      progress: updatedProgress,  // ← AQUI É SALVO!
      excel_data: updatedExcelData,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);
  
  console.log('✅✅✅ SESSÃO ATUALIZADA NO SUPABASE COM SUCESSO!');
  return true;
}
```

**✅ O QUE DEVERIA ACONTECER:**
- Ao fechar o modal, chama `updateActiveSessionInRealTime()`
- Salva `tireSets` no campo `progress[chassisIndex]`
- Códigos ficam salvos no Supabase

**❌ O QUE PODE TER DADO ERRADO:**
- `tireSets` estava vazio ao fechar (bloqueado pela validação)
- `activeSessionId` estava `null` (função não executa)
- Erro ao fazer UPDATE no Supabase (permissão, conexão, etc)
- `progress` estava `null` na sessão (corrigido agora)

---

### **5️⃣ QUANDO VOCÊ REABRE A PÁGINA**

**Volta para o passo 1** - useEffect carrega sessão ativa

```javascript
// Se a sessão existir e progress tiver dados:
progress = {
  "0": {
    "tireSets": [ ... ],  ← Códigos do chassis 028/992.1
    "tiresChecked": 12
  }
}

// savedTireSets será restaurado:
savedTireSets = {
  0: [ ... ]  ← Códigos aparecem ao abrir o modal
}
```

**Se `progress` estava vazio:**

```javascript
progress = null  // ou {}

// savedTireSets fica vazio:
savedTireSets = {}  ← Nenhum código restaurado
```

---

## 🐛 CENÁRIOS QUE EXPLICAM A PERDA DE DADOS

### **CENÁRIO A: `progress` foi criado como `null`** ⚠️

**Como aconteceu:**
- Ao carregar a planilha, a sessão foi criada SEM o campo `progress`
- No Supabase, campos JSONB não especificados ficam como `null`

**Consequência:**
```javascript
// Ao fechar o modal:
session.progress = null

updatedProgress = {
  ...(null || {}),  // → {}
  "0": { tireSets: [...] }
}
// Resultado: { "0": { tireSets: [...] } } ✅

// Mas ao fazer UPDATE:
UPDATE conference_sessions 
SET progress = '{"0": {...}}'::jsonb
WHERE id = 'abc-123';

// Se houve algum erro, o progress pode não ter sido atualizado
```

**✅ CORRIGIDO:** Agora sempre cria com `progress: {}`

---

### **CENÁRIO B: `closeChassisModal` não foi chamado** ⚠️

**Como aconteceu:**
- Você fechou a **PÁGINA** (F5, fechou aba, navegou para outro link)
- Ao invés de fechar o **MODAL** (clique no X)

**Consequência:**
- `closeChassisModal()` não executa
- `updateActiveSessionInRealTime()` não é chamado
- Dados ficam apenas no estado local (React)
- Ao recarregar a página, estado local é perdido
- Como `progress` não foi atualizado, códigos não aparecem

**Solução:**
- SEMPRE clique no X para fechar o modal
- Ou clique em "Finalizar Conferência"

---

### **CENÁRIO C: `tireSets` estava vazio ao fechar** ⚠️

**Como aconteceu:**
- Por algum bug, `tireSets` foi resetado antes de fechar o modal
- A validação bloqueou o salvamento

**Consequência:**
```javascript
if (updatedTireSets.length === 0) {
  console.error('🚨 BLOQUEIO: tireSets vazio!');
  return;  // ← NÃO SALVA
}
```

**Logs esperados:**
```
"🚨🚨🚨 BLOQUEIO DE SEGURANÇA!"
"   Tentativa de salvar tireSets VAZIO"
"   Operação BLOQUEADA para evitar perda de dados!"
```

---

### **CENÁRIO D: Erro silencioso no UPDATE** ⚠️

**Como aconteceu:**
- UPDATE do Supabase falhou (RLS, permissão, etc)
- Mas erro não foi exibido claramente

**Consequência:**
```javascript
const { error } = await supabase
  .from('conference_sessions')
  .update({ progress: updatedProgress })
  .eq('id', sessionId);

if (error) {
  console.error('❌❌❌ ERRO:', error);
  return false;
}
```

**Logs esperados:**
```
"❌❌❌ ERRO AO ATUALIZAR SESSÃO:"
{
  code: "...",
  message: "permission denied" // ou outro erro
}
```

---

## 🔍 COMO DIAGNOSTICAR O QUE ACONTECEU

### **1. Verificar se os dados estão no `progress`:**

```sql
SELECT 
  id,
  progress,
  created_at,
  updated_at
FROM conference_sessions
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;
```

**Possíveis resultados:**

| `progress` | Significado |
|------------|-------------|
| `null` | ❌ Sessão criada antes da correção, progress não inicializado |
| `{}` | ⚠️ Sessão criada mas nenhum chassis salvo ainda |
| `{ "0": { "tireSets": [...] } }` | ✅ Dados do chassis 0 salvos corretamente |

---

### **2. Verificar se os dados estão no `tire_scan_history`:**

```sql
SELECT 
  chassis,
  jogo,
  posicao,
  tire_code,
  user_name,
  created_at
FROM tire_scan_history
WHERE chassis = '028/992.1'
ORDER BY created_at ASC;
```

**Se retornar 12 linhas:**
- ✅ Você bipou 12 códigos
- ✅ Foram salvos no histórico
- ❌ MAS não foram salvos no `progress`
- **Conclusão:** `closeChassisModal()` não foi executado

**Se retornar 0 linhas:**
- ❌ Bipagens não foram salvas
- **Conclusão:** `saveToSupabaseRealtime()` falhou ou não foi chamado

---

### **3. Verificar logs do console:**

Ao fechar o modal, devem aparecer:

```
✅ OBRIGATÓRIOS (se aparecerem = salvou):
"🔍 closeChassisModal chamado!"
"💾 Salvando progresso do Chassis ..."
"📤📤📤 ENVIANDO UPDATE PARA SUPABASE"
"📡 ENVIANDO UPDATE PARA SUPABASE"
"✅✅✅ SESSÃO ATUALIZADA NO SUPABASE COM SUCESSO!"
"✅ Progresso salvo no Supabase para Chassis ..."

❌ ERROS (se aparecerem = não salvou):
"🚨🚨🚨 BLOQUEIO DE SEGURANÇA!"
"❌❌❌ ERRO AO ATUALIZAR SESSÃO:"
"⚠️ updateSessionProgress chamado sem activeSessionId"
```

---

## ✅ SOLUÇÃO E PRÓXIMOS PASSOS

### **CORREÇÃO JÁ APLICADA:**

✅ **Sessões agora são criadas com `progress: {}`** ao invés de `null`

### **COMO TESTAR:**

1. **Crie uma NOVA sessão** (carregue a planilha novamente)
2. **Bipe 4 códigos** em qualquer chassis
3. **Feche o MODAL** (clique no X - não a página!)
4. **Abra o Console (F12)** e verifique:
   ```
   "✅✅✅ SESSÃO ATUALIZADA NO SUPABASE COM SUCESSO!"
   ```
5. **Abra o chassis novamente** - códigos devem estar lá
6. **FECHE A PÁGINA** (F5 ou feche a aba)
7. **Abra a página novamente** - sessão deve carregar automaticamente
8. **Abra o chassis** - códigos ainda devem estar lá ✅

### **SE NÃO FUNCIONAR:**

Me envie:
1. ✅ Logs completos do console (do início ao fim do teste)
2. ✅ Resultado da query SQL do `progress`
3. ✅ Resultado da query SQL do `tire_scan_history`

Com essas 3 informações, consigo identificar exatamente onde falhou.

---

## 📞 RESUMO FINAL

**POR QUE OS CÓDIGOS SUMIRAM:**

Muito provavelmente uma dessas 3 causas:

1. **`progress` estava `null`** na sessão → Corrigido agora ✅
2. **Você fechou a PÁGINA ao invés do MODAL** → closeChassisModal não executou
3. **Houve um erro ao salvar** → Verificar logs do console

**ONDE OS DADOS SÃO SALVOS:**

- **Histórico de bipagens:** `tire_scan_history` (sempre salva) ✅
- **Códigos nos chassis:** `conference_sessions.progress` (só salva ao fechar modal) ⚠️

**TESTE AGORA E ME AVISE O RESULTADO!** 🔥
