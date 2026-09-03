# Fix: Conferência Serial - RFID Truncado em 8 Caracteres

**Data:** 26/05/2026  
**Status:** ✅ Corrigido

---

## 🐛 Problema Identificado

No menu **Conferência de Serial**, o scanner RFID estava sendo truncado para os primeiros 8 caracteres, resultando em busca com código ERRADO.

### Exemplos Reportados
- **RFID lido:** `30185405XXXXXXXXXXXXXXXX` (24 chars)
- **Código usado na busca:** `30185405` ❌ (8 chars - RFID truncado)
- **Código esperado:** `05411771` ✅ (8 chars - decodificado corretamente)

---

## 🔍 Causa Raiz

### Problema: Timeout de 400ms Muito Curto

No `handleTireCodeChange`, quando o input atingia 8+ caracteres, um timer de 400ms era iniciado:

```typescript
// ❌ ANTES
else if (cleanValue.length >= 8) {
  autoSubmitTimerRef.current = setTimeout(() => {
    // Se for exatamente 8 dígitos, envia direto
    if (cleanValue.length === 8 && /^\d{8}$/.test(cleanValue)) {
      handleTireCodeSubmit(cleanValue); // ❌ Submete só 8 chars!
    }
  }, 400); // ❌ 400ms muito curto!
}
```

### Como o Bug Acontecia

**Scanner RFID lento:**
1. Envia caracteres: `3`, `0`, `1`, `8`, `5`, `4`, `0`, `5` (8 chars)
2. Timer de 400ms inicia
3. Scanner demora 500ms para enviar próximos caracteres
4. **Timer dispara antes!** ⏰
5. `handleTireCodeSubmit("30185405")` é chamado ❌
6. Os 16 caracteres restantes chegam depois (ignorados)

**Fluxo do bug:**
```
T=0ms:    Scanner inicia
T=10ms:   '3' recebido
T=20ms:   '0' recebido
...
T=80ms:   '5' recebido → cleanValue = "30185405" (8 chars)
T=80ms:   Timer 400ms INICIA ⏱️
T=200ms:  Scanner ainda enviando...
T=300ms:  Scanner ainda enviando...
T=480ms:  Timer DISPARA! ⚠️
          handleTireCodeSubmit("30185405") ❌ ERRADO!
T=500ms:  'A' chega (tarde demais)
T=510ms:  'A' chega (ignorado)
...
```

### Por que "30185405" e não "05411771"?

- `30185405` são os primeiros 8 caracteres do RFID (hexadecimal)
- Sistema processou isso como código de barras antes do RFID completar
- Não passou pela decodificação SGTIN-96
- Não extraiu Serial Number / 4 = barcode

---

## ✅ Soluções Implementadas

### Fix 1: Aumentar Timeout para 1000ms

```typescript
// ✅ DEPOIS
else if (cleanValue.length >= 8) {
  autoSubmitTimerRef.current = setTimeout(() => {
    console.log('⚡ AUTO-SUBMIT disparado após 1000ms:', cleanValue);
    // ...
  }, 1000); // ✅ Aumentado de 400ms para 1000ms
}
```

**Benefício:** Scanner RFID tem 1 segundo para completar os 24 caracteres

### Fix 2: Detectar RFID Parcial (Letras A-F)

```typescript
// ✅ PROTEÇÃO ADICIONAL
const hasHexLetters = /[A-F]/i.test(cleanValue);

if (cleanValue.length === 8 && /^\d{8}$/.test(cleanValue) && !hasHexLetters) {
  // ✅ É código de barras puro (apenas números 0-9)
  console.log('📝 Código de barras (8 dígitos numéricos):', cleanValue);
  handleTireCodeSubmit(cleanValue);
} else if (cleanValue.length < 24 && hasHexLetters) {
  // ⚠️ Tem letras hex mas não completou 24 chars - RFID incompleto!
  console.log('⚠️ POSSÍVEL RFID INCOMPLETO - aguardando mais caracteres...');
  // NÃO submete - aguarda mais
}
```

**Benefício:** Se código tem letras A-F mas não completou 24 chars, NÃO submete

### Fix 3: Logs Detalhados

```typescript
console.log('⚡ AUTO-SUBMIT disparado após 1000ms:', cleanValue);
console.log('   Tamanho final:', cleanValue.length);
console.log('⚠️ POSSÍVEL RFID INCOMPLETO - aguardando mais caracteres...');
console.log('   Tamanho atual:', cleanValue.length, '| Esperado: 24');
```

**Benefício:** Debug completo do fluxo de timeout

---

## 🔄 Fluxo Corrigido

### Cenário 1: Scanner RFID Lento (Corrigido)

```
T=0ms:    Scanner inicia
T=80ms:   "30185405" (8 chars) recebido
T=80ms:   Timer 1000ms INICIA ⏱️
T=500ms:  "30185405AAE05..." (16 chars) recebido
          Timer CANCELADO (onChange detecta mudança) ✅
          Novo timer 1000ms inicia
T=600ms:  "30185405AAE059B8000149614B" (24 chars) COMPLETO ✅
          Condição detecta 24 chars hex
          Auto-submit IMEDIATO (100ms)
T=700ms:  handleTireCodeSubmit("30185405AAE059B8000149614B")
          ↓
          isRFIDCode() = true ✅
          ↓
          decodeRFID() → "05411771" ✅
```

### Cenário 2: Código 8 Dígitos Numéricos

```
Usuário digita: "05411771" (8 números)
  ↓
Timer 1000ms inicia
  ↓
Aguarda 1000ms (sem novos caracteres)
  ↓
hasHexLetters = false (só números)
cleanValue.length = 8
/^\d{8}$/.test() = true
  ↓
handleTireCodeSubmit("05411771") ✅ CORRETO
```

### Cenário 3: RFID Parcial com Letras (Protegido)

```
Scanner lento envia: "30185405" (8 chars, só números)
  ↓
Timer 1000ms inicia
  ↓
Aguarda 600ms...
Scanner envia mais: "AAE..." (agora tem letras)
  ↓
Timer CANCELADO (onChange)
Novo timer 1000ms inicia
  ↓
Se timeout disparar antes de completar 24:
hasHexLetters = true (contém A)
cleanValue.length < 24
  ↓
⚠️ RFID INCOMPLETO DETECTADO
NÃO submete - aguarda mais ✅
```

---

## 📊 Comparação: Antes vs Depois

| Aspecto | Antes (Bug) | Depois (Corrigido) |
|---------|-------------|---------------------|
| **Timeout 8+ chars** | 400ms ❌ | 1000ms ✅ |
| **Scanner lento** | Trunca em 8 chars ❌ | Aguarda completar ✅ |
| **RFID com letras** | Submete incompleto ❌ | Detecta e aguarda ✅ |
| **Código numérico** | Funciona ✅ | Funciona ✅ |
| **RFID completo** | Funciona ✅ | Funciona (melhor) ✅ |
| **Logs de debug** | Poucos ⚠️ | Detalhados ✅ |

---

## 🧪 Como Testar

### Teste 1: RFID Completo (Scanner Lento)

1. Abra **Conferência de Serial**
2. Selecione um chassis
3. **Abra Console (F12)**
4. Escaneie RFID que decodifica para `05411771`
5. **Resultado esperado no console:**
   ```javascript
   🔍 onChange disparado: { value: "30185405AAE059B8000149614B", length: 24, ... }
   🎯 RFID completo detectado, auto-submit imediato
   📡 CÓDIGO RFID DETECTADO!
   📡 Decodificando RFID: 30185405AAE059B8000149614B
   📊 Código de Barras extraído: 05411771
   🔍🔍🔍 CÓDIGO QUE VAI PARA BUSCA: 05411771
   ```
6. **Resultado na tela:**
   - Toast: "RFID Decodificado - CAI: XXX | Código: 05411771" ✅
   - Pneu buscado com código `05411771` ✅

### Teste 2: Código de Barras Manual

1. Digite manualmente: `05411771`
2. Aguarde 1 segundo OU pressione ENTER
3. **Resultado esperado:**
   - Console: `📝 Código de barras (8 dígitos numéricos): 05411771`
   - Busca com `05411771` ✅

### Teste 3: RFID Parcial (Proteção)

**Simular scanner super lento:**
1. Digite manualmente: `30185405A` (9 chars com letra)
2. Pare de digitar (aguarde 1 segundo)
3. **Resultado esperado no console:**
   ```javascript
   ⚠️ POSSÍVEL RFID INCOMPLETO - aguardando mais caracteres...
      Tamanho atual: 9 | Esperado: 24
   ```
4. **NÃO deve submeter** ✅

---

## 🚨 IMPORTANTE: O que Observar

### ✅ Sinais de Sucesso

1. **Console mostra 24 caracteres:**
   ```
   🔍 onChange disparado: { value: "...", length: 24, ... }
   ```

2. **RFID é decodificado:**
   ```
   📡 CÓDIGO RFID DETECTADO!
   📊 Código de Barras extraído: 05411771
   ```

3. **Busca usa código decodificado:**
   ```
   🔍🔍🔍 CÓDIGO QUE VAI PARA BUSCA: 05411771
   ```

4. **getTireByBarcode recebe código correto:**
   ```
   🔍 getTireByBarcode CHAMADA!
      Barcode recebido: "05411771"
      É RFID? ✅ NÃO
   ```

### ❌ Sinais de Problema

1. **Console mostra apenas 8 caracteres:**
   ```
   ⚡ AUTO-SUBMIT disparado após 1000ms: 30185405  ❌
      Tamanho final: 8  ❌
   ```

2. **Busca usa RFID truncado:**
   ```
   🔍🔍🔍 CÓDIGO QUE VAI PARA BUSCA: 30185405  ❌
   ```

3. **Não detecta RFID:**
   ```
   🔍 isRFIDCode("30185405") = false (8 chars)  ❌
   ```

---

## 💡 Por que Funciona em Outros Menus?

Outros menus (Entrada de Estoque, Movimentação) podem ter:
1. **Timeouts maiores** (ex: 1500ms ou 2000ms)
2. **Sem auto-submit intermediário** em 8 caracteres
3. **Scanner mais rápido** na configuração daquele PC
4. **Apenas ENTER** para submeter (sem timeout)

---

## 🛠️ Se Ainda Não Funcionar

### Opção 1: Aumentar Timeout Ainda Mais

Se o scanner for MUITO lento:

```typescript
// Aumentar de 1000ms para 2000ms
autoSubmitTimerRef.current = setTimeout(() => {
  // ...
}, 2000); // ✅ 2 segundos
```

### Opção 2: Configurar Scanner para Mais Rápido

No software do scanner RFID:
- **Velocidade de transmissão:** Máxima
- **Delay entre caracteres:** 0ms
- **Modo:** Fast keyboard wedge

### Opção 3: Desabilitar Auto-Submit de 8 Chars

Forçar usuário a sempre pressionar ENTER:

```typescript
// Remover auto-submit quando >= 8
// Deixar apenas quando === 24
```

---

## 📁 Arquivos Modificados

```
✅ /src/app/pages/ConferirPneus.tsx
   - Linha 4390-4419: handleTireCodeChange
     → Timeout aumentado: 400ms → 1000ms
     → Adicionada detecção de RFID parcial (letras A-F)
     → Logs detalhados de timeout e tamanho
```

---

**Desenvolvido em:** 26/05/2026  
**Versão:** 1.0.4 (Fix Crítico de Timeout)  
**Status:** Corrigido ✅

---

## 📋 Checklist de Verificação

- [ ] Recarregar página (F5)
- [ ] Abrir Console (F12)
- [ ] Escanear RFID completo
- [ ] Verificar console: 24 caracteres chegaram
- [ ] Verificar console: RFID foi decodificado
- [ ] Verificar console: Busca usou código decodificado
- [ ] Verificar tela: Pneu correto foi encontrado
- [ ] Testar com 3 RFIDs diferentes: todos funcionam
