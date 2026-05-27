# 🔧 CORREÇÃO: "Input não encontrado"

## 🐛 PROBLEMA IDENTIFICADO

**Erro reportado:**
```
❌ Input não encontrado: data-jogo="1" data-position="2"
```

**Quando acontece:**
- Ao limpar um código de pneu
- O sistema tenta focar no input que acabou de ser "esvaziado"
- Mas o React ainda não re-renderizou o input (delay de renderização)

---

## 🔍 CAUSA RAIZ

### **Fluxo atual (BUGADO):**

```javascript
1. Usuário clica em "Limpar código"
2. handleClearTireCode() executa:
   a. Limpa tire.codigo → vira "-"
   b. setTireSets(updatedTireSets) → dispara re-renderização
   c. setTimeout(..., 100) → tenta focar no input
3. PROBLEMA: O React ainda não re-renderizou!
4. querySelector() não encontra o input (ainda não existe no DOM)
5. console.error("❌ Input não encontrado...")
```

### **Por que isso acontece:**

```jsx
// O input SÓ é renderizado quando código === '-'
{isEditMode && (!tire.codigo || tire.codigo === '-') && (
  <input
    data-jogo={set.jogo}
    data-position={originalIndex}
    ...
  />
)}

// Mas ao limpar:
tire.codigo = '-';        // ← Atualiza estado
setTireSets(...);         // ← Dispara renderização (ASSÍNCRONO!)
setTimeout(() => {
  querySelector(input);   // ← Pode executar ANTES do React renderizar!
}, 100);                  // ← 100ms pode não ser suficiente
```

---

## ✅ SOLUÇÃO IMPLEMENTADA

### **Função Helper com Retry:**

```typescript
// 🎯 HELPER: Foca em input com retry (aguarda re-renderização do React)
const focusInputWithRetry = (jogo: number, position: number, maxAttempts = 5) => {
  let attempts = 0;
  
  const tryFocus = () => {
    attempts++;
    const input = document.querySelector(
      `input[data-jogo="${jogo}"][data-position="${position}"]`
    ) as HTMLInputElement;
    
    if (input) {
      input.focus();
      console.log(`✅ Foco aplicado (tentativa ${attempts}): jogo=${jogo}, position=${position}`);
      return true;
    }
    
    if (attempts < maxAttempts) {
      console.log(`⏳ Aguardando renderização do input (${attempts}/${maxAttempts})...`);
      setTimeout(tryFocus, 50); // ← Tenta novamente em 50ms
      return false;
    }
    
    console.warn(`⚠️ Input não renderizado após ${maxAttempts} tentativas`);
    return false;
  };
  
  setTimeout(tryFocus, 50); // Primeira tentativa após 50ms
};
```

### **Como funciona:**

```
1. Aguarda 50ms (dá tempo pro React começar a renderizar)
2. Tenta focar no input
3. Se NÃO encontrar:
   a. Aguarda mais 50ms
   b. Tenta novamente
   c. Repete até 5 tentativas (total: 250ms)
4. Se encontrar:
   ✅ Foca e para
5. Se após 5 tentativas não encontrar:
   ⚠️ Apenas avisa (não é erro crítico)
```

---

## 🔧 APLICAÇÃO DA CORREÇÃO

### **ANTES:**

```javascript
// handleClearTireCode()
toast.success('🧹 Código limpo');

setTimeout(() => {
  const input = document.querySelector(
    `input[data-jogo="${jogoNum}"][data-position="${originalIndex}"]`
  ) as HTMLInputElement;
  
  if (input) {
    input.focus();
  } else {
    console.error(`❌ Input não encontrado...`); // ← Falso erro!
  }
}, 100);
```

### **DEPOIS:**

```javascript
// handleClearTireCode()
toast.success('🧹 Código limpo');

// 🔥 Foca com retry (aguarda re-renderização)
focusInputWithRetry(jogoNum, originalIndex);
```

---

## 📊 LOGS ESPERADOS

### **Sucesso na 1ª tentativa:**

```
🧹 Limpando código - Jogo: 1, Tire Index: 2
✅ Foco aplicado (tentativa 1): jogo=1, position=2
```

### **Sucesso após retry:**

```
🧹 Limpando código - Jogo: 1, Tire Index: 2
⏳ Aguardando renderização do input (1/5)...
⏳ Aguardando renderização do input (2/5)...
✅ Foco aplicado (tentativa 3): jogo=1, position=2
```

### **Não encontrou (raro - não é erro):**

```
🧹 Limpando código - Jogo: 1, Tire Index: 2
⏳ Aguardando renderização do input (1/5)...
⏳ Aguardando renderização do input (2/5)...
⏳ Aguardando renderização do input (3/5)...
⏳ Aguardando renderização do input (4/5)...
⏳ Aguardando renderização do input (5/5)...
⚠️ Input não renderizado após 5 tentativas (pode já ter sido preenchido)
```

---

## ✅ BENEFÍCIOS

1. ✅ **Elimina falsos erros** no console
2. ✅ **Aguarda re-renderização** do React
3. ✅ **Retry automático** inteligente
4. ✅ **Não trava** se input não existir
5. ✅ **Logs informativos** ao invés de erros

---

## 🧪 TESTE DE VERIFICAÇÃO

```javascript
1. Bipar código em qualquer posição
2. Clicar no botão "Limpar" (X)
3. Observar logs

✅ ANTES: "❌ Input não encontrado..."
✅ DEPOIS: "✅ Foco aplicado (tentativa 1)..." ou "⏳ Aguardando..."
```

---

## 📝 ARQUIVOS MODIFICADOS

- ✅ `/pages/ConferirPneus.tsx` - Função `focusInputWithRetry()` adicionada
- ✅ `/pages/ConferirPneus.tsx` - `handleClearTireCode()` usando novo helper

---

## 🚀 STATUS

✅ **CORRIGIDO** - O erro "Input não encontrado" foi substituído por retry inteligente com logs informativos.

**O erro não deve mais aparecer!** 🎉
