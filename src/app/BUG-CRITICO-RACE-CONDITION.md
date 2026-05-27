# 🚨 BUG CRÍTICO: RACE CONDITION EM EDIÇÃO SIMULTÂNEA

## 🎯 PROBLEMA IDENTIFICADO PELO USUÁRIO

**Cenário:** Dois usuários editando o MESMO chassis simultaneamente.

**Sintoma:** Códigos bipados por um usuário somem quando o outro salva.

**Causa raiz:** LOST UPDATE (Race Condition)

---

## 📊 CENÁRIO DO PROBLEMA

### **Timeline do Bug:**

```
T0 (10:00:00.000):
    Usuário A abre chassis "028/992.1"
    └─ Busca progress do Supabase
       progress = {} (vazio)

T1 (10:00:05.000):
    Usuário B abre o MESMO chassis "028/992.1"
    └─ Busca progress do Supabase
       progress = {} (vazio também!)

T2 (10:00:10.000):
    Usuário A bipa código "00012345" (Jogo 1, DD)
    └─ Salva no Supabase:
       progress = {
         "0": {
           "tireSets": [
             { "jogo": 1, "tires": [
               { "posicao": "DD", "codigo": "00012345" }, // ← Bipado por A
               { "posicao": "DE", "codigo": "-" },
               { "posicao": "TE", "codigo": "-" },
               { "posicao": "TD", "codigo": "-" }
             ]}
           ]
         }
       }

T3 (10:00:15.000):
    Usuário B bipa código "00067890" (Jogo 1, DE)
    └─ MAS ele ainda tem progress = {} na memória!
    └─ Ele NÃO VÊ o código do Usuário A!
    └─ Salva no Supabase:
       progress = {
         "0": {
           "tireSets": [
             { "jogo": 1, "tires": [
               { "posicao": "DD", "codigo": "-" },          // ← PERDEU o código do A!
               { "posicao": "DE", "codigo": "00067890" },  // ← Bipado por B
               { "posicao": "TE", "codigo": "-" },
               { "posicao": "TD", "codigo": "-" }
             ]}
           ]
         }
       }

T4 (10:00:20.000):
    🚨 CÓDIGO "00012345" DO USUÁRIO A FOI PERDIDO!
    ✅ Ficou apenas o código "00067890" do Usuário B
```

---

## 🔍 CÓDIGO ATUAL (COM O BUG)

### **Função: updateProgressImmediately()**

```javascript
const updateProgressImmediately = async (sessionId, chassisIndex, tireSets) => {
  // 1️⃣ BUSCA progress ATUAL do Supabase
  const { data: session } = await supabase
    .from('conference_sessions')
    .select('progress')
    .eq('id', sessionId)
    .single();
  
  // 🚨 PROBLEMA: Se outro usuário salvou entre T0 e agora, 
  //             esse "session.progress" JÁ ESTÁ DESATUALIZADO!
  
  // 2️⃣ MESCLA localmente (mas com dados antigos!)
  const updatedProgress = {
    ...session.progress,  // ← Pode estar desatualizado!
    [chassisIndex]: {
      tireSets: tireSets  // ← Sobrescreve tudo do chassis
    }
  };
  
  // 3️⃣ SALVA de volta (SOBRESCREVE o que outros usuários fizeram!)
  await supabase
    .update({ progress: updatedProgress })
    .eq('id', sessionId);
  
  // ❌ RESULTADO: LOST UPDATE
};
```

---

## 🔧 SOLUÇÃO: OPTIMISTIC LOCKING

### **O que é Optimistic Locking?**

Ao invés de travar o banco (pessimistic), verificamos se os dados mudaram antes de salvar:

```
1. Busca dados + versão atual
2. Usuário edita localmente
3. Ao salvar:
   a. Verifica se a versão AINDA é a mesma
   b. Se SIM → Salva (incrementa versão)
   c. Se NÃO → Refaz o merge com a versão mais recente
```

---

## ✅ IMPLEMENTAÇÃO DA CORREÇÃO

### **Passo 1: Adicionar campo `progress_version`**

```sql
-- Adicionar coluna de versionamento
ALTER TABLE conference_sessions 
ADD COLUMN progress_version INTEGER DEFAULT 0;
```

### **Passo 2: Modificar função de salvamento**

```typescript
const updateProgressImmediately = async (
  sessionId: string,
  chassisIndex: number,
  tireSets: TireSet[]
): Promise<boolean> => {
  const MAX_RETRIES = 5; // Mais tentativas para race conditions
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const supabase = createClient();
      
      // 1️⃣ BUSCA progress ATUAL + VERSÃO
      const { data: session, error: fetchError } = await supabase
        .from('conference_sessions')
        .select('progress, progress_version')
        .eq('id', sessionId)
        .single();
      
      if (fetchError || !session) {
        throw new Error('Erro ao buscar sessão');
      }
      
      const currentVersion = session.progress_version || 0;
      
      console.log(`🔒 Tentativa ${attempt}: Versão atual = ${currentVersion}`);
      
      // 2️⃣ MESCLA com progress MAIS RECENTE
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
      
      // 3️⃣ SALVA APENAS SE A VERSÃO NÃO MUDOU (Optimistic Lock)
      const { data: updated, error: updateError } = await supabase
        .from('conference_sessions')
        .update({
          progress: updatedProgress,
          progress_version: currentVersion + 1,  // Incrementa versão
          updated_at: new Date().toISOString(),
          updated_by: currentUserId
        })
        .eq('id', sessionId)
        .eq('progress_version', currentVersion)  // 🔒 TRAVA: só atualiza se versão não mudou
        .select();
      
      // 4️⃣ VERIFICA SE ATUALIZOU (se versão mudou, updated será vazio)
      if (updateError) {
        throw new Error(`Erro ao atualizar: ${updateError.message}`);
      }
      
      if (!updated || updated.length === 0) {
        // ⚠️ CONFLITO DETECTADO: Outro usuário salvou antes!
        console.warn(`⚠️ Conflito detectado na tentativa ${attempt} - refazendo merge...`);
        
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Espera 200ms
          continue; // Tenta novamente com a versão mais recente
        }
        
        throw new Error('Conflito após múltiplas tentativas');
      }
      
      console.log(`✅ Progress salvo com sucesso (versão ${currentVersion + 1})`);
      return true;
      
    } catch (error) {
      console.error(`❌ Tentativa ${attempt} falhou:`, error);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 200));
        continue;
      }
      
      toast.error('🚨 Conflito ao salvar dados!', {
        description: 'Outro usuário pode estar editando. Tente novamente.',
        duration: 10000
      });
      return false;
    }
  }
  
  return false;
};
```

---

## 🔍 COMO FUNCIONA?

### **Sem Optimistic Locking (BUGADO):**

```
Usuário A              Supabase (versão)        Usuário B
   |                        v=0                     |
   |                        {}                      |
   |                                                |
Busca (v=0, {})                              Busca (v=0, {})
   |                                                |
Edita local                                   Edita local
progress[0] = [A]                            progress[0] = [B]
   |                                                |
UPDATE (sobrescreve)                               |
   | ────────────────► v=0                          |
   |                   progress = [A]               |
   |                                                |
   |                                          UPDATE (sobrescreve)
   |                                                | ────────────►
   |                                                |     v=0
   |                                                |     progress = [B]
   |                                                |
❌ Dados de A PERDIDOS!
```

### **Com Optimistic Locking (CORRIGIDO):**

```
Usuário A              Supabase (versão)        Usuário B
   |                        v=0                     |
   |                        {}                      |
   |                                                |
Busca (v=0, {})                              Busca (v=0, {})
   |                                                |
Edita local                                   Edita local
progress[0] = [A]                            progress[0] = [B]
   |                                                |
UPDATE WHERE v=0                                   |
   | ────────────────► v=1                          |
   |                   progress = [A]               |
   |                                                |
   |                                          UPDATE WHERE v=0 ❌ FALHA!
   |                                                | ────────────►
   |                                                |     (v agora é 1, não 0!)
   |                                                |
   |                                          Busca NOVAMENTE (v=1, [A])
   |                                          Mescla: [A] + [B]
   |                                          UPDATE WHERE v=1
   |                                                | ────────────►
   |                                                |     v=2
   |                                                |     progress = [A, B]
   |                                                |
✅ Dados de A e B PRESERVADOS!
```

---

## 🧪 TESTE DE VERIFICAÇÃO

### **Teste para reproduzir o bug:**

```javascript
// Abra 2 navegadores (ou 2 abas anônimas)

// Navegador A:
1. Abrir chassis "028/992.1"
2. Bipar código "00012345" (DD)
3. NÃO FECHAR o modal

// Navegador B (SIMULTANEAMENTE):
1. Abrir o MESMO chassis "028/992.1"
2. Bipar código "00067890" (DE)
3. Fechar o modal

// Navegador A:
4. Abrir o chassis novamente

// ❌ ANTES DA CORREÇÃO:
//    - Código "00012345" SUMIU
//    - Apenas "00067890" aparece

// ✅ DEPOIS DA CORREÇÃO:
//    - AMBOS os códigos aparecem
//    - "00012345" (DD) + "00067890" (DE)
```

---

## 📊 IMPACTO DO BUG

| Cenário | Probabilidade | Impacto |
|---------|--------------|---------|
| 2 usuários editam chassis DIFERENTE | Comum | ✅ Sem problema |
| 2 usuários editam o MESMO chassis | Raro | 🚨 PERDA DE DADOS |
| 2 usuários editam simultaneamente e um fecha antes | Médio | 🚨 PERDA DE DADOS |

**Gravidade:** 🔴 **CRÍTICA** - Perda de dados silenciosa

---

## ✅ CHECKLIST DE CORREÇÃO

- [ ] Adicionar coluna `progress_version` na tabela
- [ ] Modificar função `updateProgressImmediately()`
- [ ] Adicionar lógica de retry em caso de conflito
- [ ] Testar com 2 usuários simultâneos
- [ ] Verificar logs de conflito
- [ ] Documentar comportamento

---

## 🚀 ALTERNATIVA: ESTRUTURA GRANULAR

**Solução definitiva** (mas requer mais refatoração):

Ao invés de salvar TUDO em `progress` JSONB, criar tabelas separadas:

```sql
CREATE TABLE chassis_tires (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES conference_sessions(id),
  chassis_index INTEGER,
  chassis_number TEXT,
  jogo INTEGER,
  posicao TEXT,
  codigo TEXT,
  piloto TEXT,
  ano TEXT,
  tipo TEXT,
  -- ... outros campos
  registered_by UUID,
  registered_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Índice único para evitar duplicatas
CREATE UNIQUE INDEX idx_chassis_tires_unique 
ON chassis_tires(session_id, chassis_index, jogo, posicao);
```

**Vantagens:**
- ✅ Cada pneu é uma linha separada
- ✅ Sem conflitos de escrita (cada usuário edita linhas diferentes)
- ✅ Queries mais eficientes
- ✅ Mais fácil de fazer relatórios

**Desvantagens:**
- ❌ Requer migração de dados
- ❌ Mais complexo de implementar
- ❌ Mais tabelas para gerenciar

---

## 📝 CONCLUSÃO

**O usuário estava 100% CORRETO!**

Existe um bug de race condition que causa perda de dados quando:
1. Dois usuários abrem o MESMO chassis
2. Cada um bipa códigos diferentes
3. Ambos salvam

**Solução:** Implementar Optimistic Locking com versionamento.

**Próximo passo:** Implementar a correção acima! 🚀
