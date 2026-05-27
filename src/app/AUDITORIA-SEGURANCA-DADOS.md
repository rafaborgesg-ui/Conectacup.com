# 🔒 AUDITORIA DE SEGURANÇA - CONFERÊNCIA DE CHASSIS

## 🎯 OBJETIVO
Garantir que **NENHUM código bipado suma** em qualquer circunstância.

---

## ❌ PROBLEMAS IDENTIFICADOS (CRÍTICOS)

### **1. SALVAMENTO ATRASADO NO PROGRESS**
**Problema:** Códigos são salvos no `progress` APENAS ao fechar o modal
**Risco:** Se o usuário fechar a página (F5, crash, etc), dados somem
**Severidade:** 🔴 **CRÍTICA**

**Fluxo atual:**
```
Bipar código → Atualiza estado local → (NÃO salva progress)
Fechar modal → Agora salva progress
```

**Problema:**
```
Bipar 12 códigos → Fechar PÁGINA (sem fechar modal) → DADOS PERDIDOS
```

---

### **2. PROGRESS CRIADO COMO NULL**
**Problema:** Sessão criada sem inicializar `progress: {}`
**Risco:** Ao salvar, pode falhar ou não mesclar corretamente
**Severidade:** 🔴 **CRÍTICA**

**Status:** ✅ **CORRIGIDO** (linha 925 - ConferirPneus.tsx)

---

### **3. SEM RETRY EM CASO DE FALHA**
**Problema:** Se o UPDATE falhar, não tenta novamente
**Risco:** Conexão instável = perda de dados
**Severidade:** 🟡 **ALTA**

**Fluxo atual:**
```javascript
const { error } = await supabase.update(...);
if (error) {
  console.error('Erro:', error);
  return; // ← Desiste, não tenta de novo
}
```

---

### **4. SEM VALIDAÇÃO DE SUCESSO**
**Problema:** Não verifica se o dado foi realmente salvo
**Risco:** Pode dar OK mas não ter salvado
**Severidade:** 🟡 **ALTA**

**Fluxo atual:**
```javascript
await supabase.update({ progress });
// ← Não busca de volta para confirmar
```

---

### **5. SEM RECOVERY AUTOMÁTICO**
**Problema:** Se dados sumirem, não há recuperação automática
**Risco:** Usuário precisa bipar tudo de novo
**Severidade:** 🟡 **ALTA**

**Solução proposta:** Recuperar de `tire_scan_history` automaticamente

---

## ✅ ARQUITETURA DE SEGURANÇA PROPOSTA

### **CAMADA 1: SALVAMENTO IMEDIATO E DUPLO**

```
BIPAR CÓDIGO
    ↓
┌─────────────────────────────────────────┐
│ SALVAMENTO SIMULTÂNEO (em paralelo)     │
├─────────────────────────────────────────┤
│ 1. tire_scan_history (histórico)        │ ✅ Imediato
│ 2. conference_sessions.progress         │ ✅ Imediato (NOVO!)
│ 3. Estado local (React)                 │ ✅ Imediato
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ VALIDAÇÃO DE SUCESSO                    │
├─────────────────────────────────────────┤
│ - Busca de volta do Supabase            │
│ - Compara se o código foi salvo         │
│ - Se falhou, RETRY até 3 vezes          │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ BROADCAST EM TEMPO REAL                 │
├─────────────────────────────────────────┤
│ - Outros usuários recebem UPDATE        │
│ - Códigos aparecem instantaneamente     │
└─────────────────────────────────────────┘
```

---

### **CAMADA 2: VALIDAÇÃO AO CARREGAR**

```
ABRIR MODAL
    ↓
┌─────────────────────────────────────────┐
│ BUSCAR DADOS DO SUPABASE                │
├─────────────────────────────────────────┤
│ 1. progress[chassisIndex]               │
│ 2. tire_scan_history (fallback)         │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ VERIFICAÇÃO DE INTEGRIDADE              │
├─────────────────────────────────────────┤
│ Compara:                                │
│ - Qtd códigos no progress               │
│ - Qtd registros no tire_scan_history    │
│                                         │
│ Se divergir → RECOVERY AUTOMÁTICO       │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ RECOVERY AUTOMÁTICO (se necessário)     │
├─────────────────────────────────────────┤
│ - Busca histórico completo              │
│ - Reconstrói progress                   │
│ - Salva de volta                        │
│ - Alerta usuário: "Dados recuperados"   │
└─────────────────────────────────────────┘
```

---

### **CAMADA 3: LOGS E RASTREABILIDADE**

```javascript
// CADA operação registra:
{
  timestamp: "2026-02-24T15:30:00Z",
  operation: "BIPAR_CODIGO",
  chassis: "028/992.1",
  jogo: 1,
  posicao: "DD",
  codigo: "00012345",
  user_id: "abc-123",
  user_name: "João Silva",
  session_id: "session-456",
  success: true,
  attempts: 1,
  error: null
}
```

---

## 🔧 IMPLEMENTAÇÃO

### **FUNÇÃO 1: saveTireImmediatelyAndSecure**

Nova função que substitui salvamento atrasado:

```typescript
/**
 * 🔒 SALVAMENTO IMEDIATO E SEGURO DE CÓDIGO BIPADO
 * - Salva em tire_scan_history (histórico)
 * - Salva em conference_sessions.progress (estado atual)
 * - Valida se salvou corretamente
 * - Retry até 3 vezes em caso de falha
 * - Retorna true apenas se AMBOS salvaram com sucesso
 */
const saveTireImmediatelyAndSecure = async (
  chassisNumber: string,
  chassisIndex: number,
  jogoNumber: number,
  positionIndex: number,
  tireCode: string,
  tireData: TireData,
  allTireSets: TireSet[]
): Promise<boolean> => {
  const MAX_RETRIES = 3;
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    attempt++;
    
    try {
      const supabase = createClient();
      const now = new Date().toISOString();
      
      // 1️⃣ SALVA NO HISTÓRICO (tire_scan_history)
      const { error: historyError } = await supabase
        .from('tire_scan_history')
        .insert({
          session_id: activeSessionId,
          chassis: chassisNumber,
          jogo: jogoNumber,
          posicao: positionMap[positionIndex],
          tire_code: tireCode,
          action: 'BIPAR',
          user_id: currentUserId,
          user_name: currentUserName,
          tire_data: tireData,
          created_at: now
        });
      
      if (historyError) {
        console.error(`❌ Tentativa ${attempt}: Erro ao salvar histórico:`, historyError);
        if (attempt < MAX_RETRIES) {
          await sleep(500); // Espera 500ms antes de tentar de novo
          continue;
        }
        return false;
      }
      
      console.log(`✅ Histórico salvo (tentativa ${attempt})`);
      
      // 2️⃣ SALVA NO PROGRESS (conference_sessions.progress)
      const success = await updateProgressImmediately(
        activeSessionId,
        chassisIndex,
        allTireSets
      );
      
      if (!success) {
        console.error(`❌ Tentativa ${attempt}: Erro ao salvar progress`);
        if (attempt < MAX_RETRIES) {
          await sleep(500);
          continue;
        }
        return false;
      }
      
      console.log(`✅ Progress salvo (tentativa ${attempt})`);
      
      // 3️⃣ VALIDAÇÃO: Busca de volta para confirmar
      const { data: verification } = await supabase
        .from('conference_sessions')
        .select('progress')
        .eq('id', activeSessionId)
        .single();
      
      const savedCode = verification?.progress?.[chassisIndex]?.tireSets?.[jogoNumber - 1]?.tires?.[positionIndex]?.codigo;
      
      if (savedCode !== tireCode) {
        console.error(`❌ Tentativa ${attempt}: Validação falhou - código não foi salvo corretamente`);
        if (attempt < MAX_RETRIES) {
          await sleep(500);
          continue;
        }
        return false;
      }
      
      console.log(`✅ Validação OK (tentativa ${attempt}) - código confirmado no Supabase`);
      
      // 🎉 SUCESSO TOTAL!
      return true;
      
    } catch (error) {
      console.error(`❌ Tentativa ${attempt}: Erro inesperado:`, error);
      if (attempt < MAX_RETRIES) {
        await sleep(500);
        continue;
      }
      return false;
    }
  }
  
  // Se chegou aqui, todas as tentativas falharam
  toast.error('🚨 ERRO CRÍTICO: Não foi possível salvar o código!', {
    description: 'Entre em contato com o suporte imediatamente',
    duration: 10000
  });
  return false;
};

// Helper para esperar (retry delay)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
```

---

### **FUNÇÃO 2: updateProgressImmediately**

Atualiza progress sem esperar fechar modal:

```typescript
/**
 * 🔒 ATUALIZA PROGRESS IMEDIATAMENTE
 * Não espera fechar o modal - salva a cada bipagem
 */
const updateProgressImmediately = async (
  sessionId: string,
  chassisIndex: number,
  tireSets: TireSet[]
): Promise<boolean> => {
  try {
    const supabase = createClient();
    
    // Busca progress atual
    const { data: session } = await supabase
      .from('conference_sessions')
      .select('progress')
      .eq('id', sessionId)
      .single();
    
    if (!session) {
      console.error('❌ Sessão não encontrada:', sessionId);
      return false;
    }
    
    // Mescla com progress existente
    const updatedProgress = {
      ...(session.progress || {}),
      [chassisIndex]: {
        tireSets: tireSets.map(set => ({
          jogo: set.jogo,
          label: set.label,
          montadoNoCarro: set.montadoNoCarro,
          tires: set.tires.map(tire => ({
            posicao: tire.posicao,
            codigo: tire.codigo,
            piloto: tire.piloto,
            ano: tire.ano,
            set: tire.set,
            tipo: tire.tipo,
            voltas: tire.voltas,
            situacao: tire.situacao,
            divergencia: tire.divergencia,
            pilotoInvalido: tire.pilotoInvalido,
            observacao: tire.observacao,
            validacao: tire.validacao,
            _originalIndex: tire._originalIndex,
            registeredBy: tire.registeredBy,
            registeredAt: tire.registeredAt
          }))
        })),
        tiresChecked: countCheckedTires(tireSets),
        completed: false,
        lockedBy: currentUserId,
        lockedAt: new Date().toISOString()
      }
    };
    
    // Salva no Supabase
    const { error } = await supabase
      .from('conference_sessions')
      .update({
        progress: updatedProgress,
        updated_at: new Date().toISOString(),
        updated_by: currentUserId
      })
      .eq('id', sessionId);
    
    if (error) {
      console.error('❌ Erro ao atualizar progress:', error);
      return false;
    }
    
    console.log('✅ Progress atualizado imediatamente no Supabase');
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao atualizar progress:', error);
    return false;
  }
};
```

---

### **FUNÇÃO 3: verifyAndRecoverData**

Verifica integridade e recupera dados se necessário:

```typescript
/**
 * 🔒 VERIFICAÇÃO DE INTEGRIDADE E RECOVERY AUTOMÁTICO
 * Chamado ao abrir o modal
 */
const verifyAndRecoverData = async (
  sessionId: string,
  chassisIndex: number,
  chassisNumber: string
): Promise<TireSet[] | null> => {
  try {
    const supabase = createClient();
    
    // 1️⃣ Busca dados do progress
    const { data: session } = await supabase
      .from('conference_sessions')
      .select('progress')
      .eq('id', sessionId)
      .single();
    
    const progressData = session?.progress?.[chassisIndex];
    
    // 2️⃣ Busca histórico de bipagens
    const { data: history } = await supabase
      .from('tire_scan_history')
      .select('*')
      .eq('session_id', sessionId)
      .eq('chassis', chassisNumber)
      .order('created_at', { ascending: true });
    
    const historyCount = history?.length || 0;
    
    // 3️⃣ VERIFICAÇÃO DE INTEGRIDADE
    if (progressData?.tireSets) {
      // Conta códigos no progress
      let progressCodesCount = 0;
      progressData.tireSets.forEach(set => {
        set.tires.forEach(tire => {
          if (tire.codigo && tire.codigo !== '-') {
            progressCodesCount++;
          }
        });
      });
      
      console.log('🔍 VERIFICAÇÃO DE INTEGRIDADE:', {
        chassis: chassisNumber,
        codigosNoProgress: progressCodesCount,
        registrosNoHistorico: historyCount
      });
      
      // Se bater, está OK
      if (progressCodesCount === historyCount) {
        console.log('✅ Integridade OK - dados consistentes');
        return progressData.tireSets;
      }
      
      // Se divergir, tenta recovery
      console.warn('⚠️ DIVERGÊNCIA DETECTADA! Iniciando recovery...');
    }
    
    // 4️⃣ RECOVERY AUTOMÁTICO
    if (history && history.length > 0) {
      console.log('🔧 Reconstruindo progress a partir do histórico...');
      
      const recoveredTireSets = await reconstructFromHistory(
        history,
        chassisNumber
      );
      
      if (recoveredTireSets) {
        // Salva o progress recuperado
        const saved = await updateProgressImmediately(
          sessionId,
          chassisIndex,
          recoveredTireSets
        );
        
        if (saved) {
          toast.warning('⚠️ Dados foram recuperados do histórico', {
            description: `${history.length} códigos restaurados automaticamente`,
            duration: 5000
          });
          
          return recoveredTireSets;
        }
      }
    }
    
    // Se chegou aqui e tem progressData, retorna mesmo com divergência
    if (progressData?.tireSets) {
      return progressData.tireSets;
    }
    
    // Nenhum dado encontrado
    return null;
    
  } catch (error) {
    console.error('❌ Erro ao verificar/recuperar dados:', error);
    return null;
  }
};
```

---

### **FUNÇÃO 4: reconstructFromHistory**

Reconstrói progress a partir do histórico:

```typescript
/**
 * 🔒 RECONSTRÓI PROGRESS A PARTIR DO HISTÓRICO
 */
const reconstructFromHistory = async (
  history: any[],
  chassisNumber: string
): Promise<TireSet[] | null> => {
  try {
    // Busca dados do chassis para saber quantos jogos
    const chassisData = extractedData.find(c => c.chassis === chassisNumber);
    if (!chassisData) return null;
    
    const isTrophy = chassisData.sheetName?.toUpperCase().includes('TROPHY');
    const numberOfJogos = isTrophy ? 3 : 4;
    
    // Inicializa tireSets vazio
    const tireSets: TireSet[] = Array.from({ length: numberOfJogos }, (_, i) => ({
      jogo: i + 1,
      label: `Jogo ${i + 1}`,
      montadoNoCarro: i === 0,
      tires: Array.from({ length: 4 }, (_, j) => ({
        posicao: ['DD', 'DE', 'TE', 'TD'][j],
        codigo: '-',
        piloto: '-',
        ano: '-',
        set: '-',
        tipo: '-',
        voltas: '-',
        situacao: 'Guardar' as const,
        observacao: '',
        divergencia: false,
        pilotoInvalido: false,
        validacao: null,
        _originalIndex: j
      }))
    }));
    
    // Preenche com dados do histórico
    history.forEach(record => {
      const jogoIdx = record.jogo - 1;
      const positionIdx = ['DD', 'DE', 'TE', 'TD'].indexOf(record.posicao);
      
      if (jogoIdx >= 0 && jogoIdx < numberOfJogos && positionIdx >= 0 && positionIdx < 4) {
        const tireData = record.tire_data || {};
        
        tireSets[jogoIdx].tires[positionIdx] = {
          posicao: record.posicao,
          codigo: record.tire_code || '-',
          piloto: tireData.piloto || '-',
          ano: tireData.ano || '-',
          set: tireData.set || '-',
          tipo: tireData.tipo || '-',
          voltas: tireData.voltas || '-',
          situacao: tireData.situacao || 'Guardar',
          observacao: tireData.observacao || '',
          divergencia: tireData.divergencia || false,
          pilotoInvalido: tireData.pilotoInvalido || false,
          validacao: tireData.validacao || null,
          _originalIndex: positionIdx,
          registeredBy: record.user_name,
          registeredAt: record.created_at
        };
      }
    });
    
    console.log('✅ Progress reconstruído do histórico:', tireSets);
    return tireSets;
    
  } catch (error) {
    console.error('❌ Erro ao reconstruir do histórico:', error);
    return null;
  }
};
```

---

## 📊 RESUMO DAS MUDANÇAS

| Antes | Depois |
|-------|--------|
| ❌ Salva progress ao fechar modal | ✅ Salva progress A CADA bipagem |
| ❌ Sem retry se falhar | ✅ Retry até 3 vezes |
| ❌ Sem validação de sucesso | ✅ Busca de volta para confirmar |
| ❌ Sem recovery automático | ✅ Recovery do histórico |
| ❌ Progress criado como null | ✅ Progress criado como {} |
| ❌ Logs básicos | ✅ Logs detalhados + rastreamento |

---

## 🧪 TESTES OBRIGATÓRIOS

Após implementar, testar:

### **TESTE 1: Bipagem normal**
1. Bipar 4 códigos
2. Fechar página (F5) SEM fechar modal
3. Abrir página novamente
4. Abrir chassis
5. ✅ Códigos devem estar lá

### **TESTE 2: Falha de conexão**
1. Desconectar internet
2. Bipar código
3. Reconectar internet
4. ✅ Sistema deve fazer retry automático

### **TESTE 3: Recovery automático**
1. Deletar progress manualmente no Supabase
2. Abrir chassis
3. ✅ Sistema deve recuperar do histórico automaticamente

### **TESTE 4: Múltiplos usuários**
1. Usuário A bipa código
2. Usuário B abre mesmo chassis
3. ✅ Código deve aparecer instantaneamente

---

**PRÓXIMO PASSO: IMPLEMENTAR ESSAS FUNÇÕES NO CÓDIGO** 🔥
