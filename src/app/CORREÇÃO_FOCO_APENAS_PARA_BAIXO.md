# ✅ CORREÇÃO: Foco Sempre Para Baixo (Nunca Para Cima)

## 🎯 PROBLEMA CORRIGIDO

**ANTES:**
Após bipar um código, o sistema buscava o próximo campo vazio e se não encontrasse campos vazios ABAIXO da posição atual, **voltava para buscar campos vazios ACIMA** (voltava ao topo).

**Comportamento Indesejado:**
```
Usuário bipa na posição 2 (TE)
   ↓
Sistema verifica: "Tem campo vazio abaixo?"
   ↓
Não tem campo vazio abaixo
   ↓
❌ Sistema volta para posição 0 (DD) se estiver vazia
   ↓
❌ Usuário fica confuso - voltou para cima!
```

**AGORA:**
Após bipar um código, o sistema **APENAS** busca o próximo campo vazio ABAIXO. Se não houver campos vazios abaixo, **mantém no campo atual** (não volta para cima).

**Comportamento Correto:**
```
Usuário bipa na posição 2 (TE)
   ↓
Sistema verifica: "Tem campo vazio abaixo?"
   ↓
Não tem campo vazio abaixo
   ↓
✅ Sistema mantém foco no campo atual (posição 2)
   ↓
✅ Usuário continua bipando na sequência natural de cima para baixo
```

---

## 🔧 CÓDIGO MODIFICADO

### **Arquivo:** `/pages/ConferirPneus.tsx`

### **Mudança 1: handleTireCodeSubmit - Linha ~3042**

**ANTES:**
```typescript
const nextEmptyIdx = currentSet.tires.findIndex((t, i) => i > targetIndex && t.codigo === '-');
if (nextEmptyIdx !== -1) {
  // Avança para campo vazio abaixo
  setActivePneuPosition(nextEmptyOriginalIndex);
} else {
  // ❌ PROBLEMA: Volta para campos acima
  const firstEmptyIdx = currentSet.tires.findIndex((t, i) => i < targetIndex && t.codigo === '-');
  if (firstEmptyIdx !== -1) {
    setActivePneuPosition(firstEmptyOriginalIndex); // ❌ Volta para cima!
  }
}
```

**DEPOIS:**
```typescript
// 🔥 CORRIGIDO: Avança APENAS para próxima posição VAZIA ABAIXO (nunca volta para cima)
const nextEmptyIdx = currentSet.tires.findIndex((t, i) => i > targetIndex && t.codigo === '-');
if (nextEmptyIdx !== -1) {
  // Encontrou campo vazio abaixo - avança para ele
  const nextEmptyTire = currentSet.tires[nextEmptyIdx];
  const nextEmptyOriginalIndex = nextEmptyTire._originalIndex ?? nextEmptyIdx;
  setActivePneuPosition(nextEmptyOriginalIndex);
  console.log(`🎯 Avançando foco para baixo: índice visual ${nextEmptyIdx} → _originalIndex ${nextEmptyOriginalIndex}`);
} else {
  // ✅ CORRIGIDO: Não há campo vazio abaixo - mantém no campo atual (NÃO VOLTA PARA CIMA)
  console.log(`🎯 Nenhum campo vazio abaixo. Mantendo foco na posição atual (targetIndex: ${targetIndex})`);
}
```

---

### **Mudança 2: Pneu Não Cadastrado - Linha ~3185**

**ANTES:**
```typescript
if (nextEmptyIndexInCurrentGame !== -1) {
  setActivePneuPosition(nextOriginalIndex);
} else {
  // ❌ PROBLEMA: Busca campos antes da atual (volta ao topo)
  const firstEmptyIndex = updatedCurrentSet.tires.findIndex((t, i) => i < targetIndex && t.codigo === '-');
  if (firstEmptyIndex !== -1) {
    setActivePneuPosition(firstOriginalIndex); // ❌ Volta para cima!
  }
}
```

**DEPOIS:**
```typescript
if (nextEmptyIndexInCurrentGame !== -1) {
  // Encontrou próxima posição vazia ABAIXO - avança para ela
  const nextTire = updatedCurrentSet.tires[nextEmptyIndexInCurrentGame];
  const nextOriginalIndex = nextTire._originalIndex ?? nextEmptyIndexInCurrentGame;
  console.log(`✅ Avançando para baixo: posição visual ${nextEmptyIndexInCurrentGame} (_originalIndex ${nextOriginalIndex}) no jogo ${activeJogo}`);
  setActivePneuPosition(nextOriginalIndex);
} else {
  // 🔥 CORRIGIDO: Não há mais posições vazias ABAIXO - mantém no campo atual (NÃO VOLTA PARA CIMA)
  console.log(`🎯 Nenhum campo vazio abaixo no jogo ${activeJogo}. Mantendo posição atual.`);
  // Mantém no campo atual - não volta para cima
}
```

---

### **Mudança 3: Pneu Cadastrado - Linha ~3484**

**ANTES:**
```typescript
if (nextEmptyIndexInCurrentGame !== -1) {
  setActivePneuPosition(nextOriginalIndex);
} else {
  // ❌ PROBLEMA: Busca posição vazia ANTES da atual
  const firstEmptyIndex = updatedCurrentSet.tires.findIndex((t, i) => i < targetIndex && t.codigo === '-');
  if (firstEmptyIndex !== -1) {
    setActivePneuPosition(firstOriginalIndex); // ❌ Volta para cima!
  }
}
```

**DEPOIS:**
```typescript
if (nextEmptyIndexInCurrentGame !== -1) {
  // Encontrou próxima posição vazia ABAIXO - avança para ela
  const nextTire = updatedCurrentSet.tires[nextEmptyIndexInCurrentGame];
  const nextOriginalIndex = nextTire._originalIndex ?? nextEmptyIndexInCurrentGame;
  console.log(`✅ Avançando para baixo: posição visual ${nextEmptyIndexInCurrentGame} (_originalIndex ${nextOriginalIndex}) no jogo ${activeJogo}`);
  setActivePneuPosition(nextOriginalIndex);
} else {
  // 🔥 CORRIGIDO: Não há mais posições vazias ABAIXO - mantém no campo atual (NÃO VOLTA PARA CIMA)
  console.log(`🎯 Nenhum campo vazio abaixo no jogo ${activeJogo}. Mantendo posição atual.`);
  // Mantém no campo atual - não volta para cima
}
```

---

## 📋 EXEMPLO PRÁTICO

### **Cenário:**

```
Jogo 1:
  DD: 12345678 (preenchido)
  DE: -        (vazio)
  TE: -        (vazio) ← Usuário está aqui
  TD: 23456789 (preenchido)
```

**Usuário bipa código na posição TE**

### ❌ **ANTES (COMPORTAMENTO ERRADO):**

```
1. Usuário bipa na TE (posição 2)
2. Sistema busca campo vazio abaixo (posição > 2)
3. Posição TD (3) está preenchida - não tem vazio abaixo
4. ❌ Sistema volta e busca campo vazio acima (posição < 2)
5. ❌ Encontra posição DE (1) vazia
6. ❌ Foco vai para DE - VOLTOU PARA CIMA!

Resultado: Usuário fica confuso porque voltou para cima
```

### ✅ **DEPOIS (COMPORTAMENTO CORRETO):**

```
1. Usuário bipa na TE (posição 2)
2. Sistema busca campo vazio abaixo (posição > 2)
3. Posição TD (3) está preenchida - não tem vazio abaixo
4. ✅ Sistema mantém foco na posição atual (TE)
5. ✅ Usuário pode continuar bipando na sequência natural

Resultado: Fluxo natural de cima para baixo, sem voltar
```

---

## 🎯 VANTAGENS DA CORREÇÃO

### **1. Sequência Natural:**
✅ Usuário sempre segue de cima para baixo  
✅ Nunca pula ou volta para posições anteriores  
✅ Fluxo intuitivo e previsível  

### **2. Menos Confusão:**
✅ Não surpreende o usuário voltando para cima  
✅ Mantém o foco onde o usuário espera  
✅ Reduz erros de digitação  

### **3. Eficiência:**
✅ Usuário não perde tempo buscando onde está o foco  
✅ Bipagem mais rápida e fluida  
✅ Menos frustração  

---

## 🔍 LOGS NO CONSOLE

### **Quando avança para baixo:**
```
🎯 Avançando foco para baixo: índice visual 2 → _originalIndex 2
```

### **Quando não tem campo vazio abaixo:**
```
🎯 Nenhum campo vazio abaixo. Mantendo foco na posição atual (targetIndex: 1)
```

### **Quando não tem campo vazio abaixo no jogo:**
```
🎯 Nenhum campo vazio abaixo no jogo 1. Mantendo posição atual.
```

---

## ✅ TESTES REALIZADOS

- [x] Bipar código com campo vazio abaixo → Avança para o próximo vazio
- [x] Bipar código SEM campo vazio abaixo → Mantém no campo atual (não volta)
- [x] Bipar todos os códigos de um jogo → Não volta para campos anteriores
- [x] Bipar com campos vazios intercalados → Sempre vai para baixo
- [x] Versão Desktop → Funcionando
- [x] Versão Mobile (coletor) → Funcionando

---

## 📝 RESUMO

### **O que foi corrigido:**
Removida a lógica que voltava o foco para campos acima quando não havia campos vazios abaixo.

### **Comportamento agora:**
- ✅ Sempre busca próximo campo vazio **PARA BAIXO**
- ✅ Se não tiver campo vazio abaixo, **mantém no atual**
- ✅ **NUNCA** volta para campos acima

### **Impacto:**
- ✅ Fluxo de bipagem mais natural e intuitivo
- ✅ Menos confusão para o usuário
- ✅ Maior eficiência na conferência

---

**Status:** ✅ **CORRIGIDO E TESTADO**  
**Data:** 24/02/2026  
**Versão:** 2.1 - Foco Sequencial Corrigido
