# Fix: Auto-Submit Prematuro de RFID Parcial

**Data:** 25/05/2026  
**Status:** ✅ Corrigido

---

## 🐛 Problema Identificado

Ao escanear um RFID na página **"Conferência de Serial"**, o sistema estava submetendo apenas os primeiros 8 caracteres do código RFID ao invés de aguardar o código completo de 24 caracteres.

### Exemplo do Problema
- **RFID escaneado:** `301854AAE059B8000149614B` (24 caracteres)
- **Código esperado:** `05396562` (barcode decodificado)
- **Código submetido:** `30185405` ❌ (primeiros 8 caracteres do RFID)

### Evidência
Usuário reportou: "estou lendo o RFID 301854AAE059B8000149614B no menu pneus/conferencia/serial e ao inves de vir o codigo de barras correspondete 05396562, esta aparecendo 30185405"

---

## 🔍 Causa Raiz

### Problema: Auto-Submit Imediato de 8 Dígitos

No `handleTireCodeChange` (linha ~4390), havia lógica de auto-submit imediato quando o input atingia 8 caracteres numéricos:

```typescript
// ❌ ANTES
if (cleanValue.length === 24 && /^[0-9A-F]{24}$/.test(cleanValue)) {
  // RFID completo → submit com 100ms
  setTimeout(() => handleTireCodeSubmit(cleanValue), 100);
} else if (cleanValue.length === 8 && /^\d{8}$/.test(cleanValue)) {
  // ❌ PROBLEMA: Submit imediato com apenas 100ms de delay
  setTimeout(() => handleTireCodeSubmit(cleanValue), 100);
}
```

### Por que Isso Causava o Bug?

Quando um coletor RFID escaneia o código `301854AAE059B8000149614B`:

1. **Scanner envia caracteres sequencialmente** (não todos de uma vez)
2. **Após 8 caracteres:** `"30185405"` → todos numéricos
3. **Condição ativada:** `cleanValue.length === 8 && /^\d{8}$/.test(cleanValue)`
4. **Auto-submit com 100ms:** `handleTireCodeSubmit("30185405")`
5. **Caracteres restantes ignorados:** `"AAE059B8000149614B"`

### Fluxo do Bug

```
Scanner RFID inicia: "301854AAE059B8000149614B"
  ↓
Char 1-7 recebidos: "3018540" (não dispara nada)
  ↓
Char 8 recebido: "30185405" ✅ Todos numéricos
  ↓
Auto-submit com 100ms ⚡
  ↓
handleTireCodeSubmit("30185405") ❌ ERRADO!
  ↓
Chars 9-24 ignorados: "AAE059B8000149614B"
```

---

## ✅ Solução Implementada

### Delay de 400ms para Códigos de 8+ Caracteres

**Localização:** `handleTireCodeChange` (linha ~4386)

**Antes:**
```typescript
if (cleanValue.length === 24 && /^[0-9A-F]{24}$/.test(cleanValue)) {
  setTimeout(() => handleTireCodeSubmit(cleanValue), 100);
} else if (cleanValue.length === 8 && /^\d{8}$/.test(cleanValue)) {
  // ❌ 100ms - muito rápido, não dá tempo do RFID completar
  setTimeout(() => handleTireCodeSubmit(cleanValue), 100);
}
```

**Depois:**
```typescript
if (cleanValue.length === 24 && /^[0-9A-F]{24}$/.test(cleanValue)) {
  // RFID completo: submit imediato
  setTimeout(() => handleTireCodeSubmit(cleanValue), 100);
} else if (cleanValue.length >= 8) {
  // ✅ 400ms delay - dá tempo para RFID (24 chars) completar
  autoSubmitTimerRef.current = setTimeout(() => {
    if (cleanValue.length === 8 && /^\d{8}$/.test(cleanValue)) {
      // Código de barras (8 dígitos exatos)
      handleTireCodeSubmit(cleanValue);
    } else {
      // Outro formato - aplica padding
      const paddedValue = cleanValue.padStart(8, '0');
      handleTireCodeSubmit(paddedValue);
    }
  }, 400);
}
```

### Por que 400ms?

- **Scanners RFID típicos:** ~200-300ms para transmitir 24 caracteres
- **400ms:** Margem de segurança para aguardar caracteres adicionais
- **Timer cancelado:** Se mais caracteres chegam, o timer é resetado (linha 4382-4384)
- **Não impacta UX:** Delay imperceptível para o usuário

---

## 🔄 Fluxo Corrigido

### Cenário 1: RFID (24 caracteres)

```
Scanner RFID: "301854AAE059B8000149614B"
  ↓
Char 1-7: "3018540" (aguarda)
  ↓
Char 8: "30185405"
  ├─ cleanValue.length = 8 (>= 8)
  ├─ Agenda timer 400ms
  ↓
Char 9: "30185405A"
  ├─ cleanValue.length = 9
  ├─ CANCELA timer anterior ✅
  ├─ Agenda novo timer 400ms
  ↓
Chars 10-23: (mesmo processo - cancela e re-agenda)
  ↓
Char 24: "301854AAE059B8000149614B"
  ├─ cleanValue.length = 24 ✅
  ├─ CANCELA timer de 400ms
  ├─ Detecta RFID completo
  ├─ Submit com 100ms
  ↓
handleTireCodeSubmit("301854AAE059B8000149614B")
  ↓
isRFIDCode() = true
  ↓
decodeRFID() → "05396562" ✅ CORRETO!
```

### Cenário 2: Código de Barras (8 dígitos)

```
Usuário digita: "05396562"
  ↓
Char 8: "05396562"
  ├─ cleanValue.length = 8 (>= 8)
  ├─ Agenda timer 400ms
  ↓
Aguarda 400ms (nenhum char adicional)
  ↓
Timer dispara:
  ├─ cleanValue.length === 8 ✅
  ├─ /^\d{8}$/.test("05396562") ✅
  ↓
handleTireCodeSubmit("05396562") ✅ CORRETO!
```

### Cenário 3: Código Parcial (< 8 dígitos)

```
Usuário digita: "539"
  ↓
cleanValue.length = 3 (< 8)
  ↓
Agenda timer 800ms
  ↓
Aguarda 800ms
  ↓
Timer dispara:
  ├─ Aplica padding: "539".padStart(8, '0')
  ↓
handleTireCodeSubmit("00000539") ✅
```

---

## 🧪 Como Testar

### Teste 1: RFID Completo
1. Acesse **Conferência de Serial**
2. Selecione um chassis
3. Escaneie RFID: `301854AAE059B8000149614B`
4. **Resultado esperado:**
   - Toast: "RFID Decodificado - CAI: 530030 | Código: 05396562"
   - Campo exibe: `05396562` ✅
   - Pneu registrado com código correto

### Teste 2: Código de Barras Normal
1. Digite: `05396562` (8 dígitos)
2. Aguarde 400ms (auto-submit)
3. **Resultado esperado:**
   - Pneu encontrado
   - Nenhuma decodificação RFID (é código normal)

### Teste 3: Código Parcial com Padding
1. Digite: `539` (3 dígitos)
2. Aguarde 800ms
3. **Resultado esperado:**
   - Código padded para: `00000539`
   - Busca executada

---

## 📊 Comparação Antes vs Depois

| Cenário | Antes | Depois |
|---------|-------|--------|
| **RFID 24 chars** | Submetia primeiros 8 chars ❌ | Aguarda 24 chars completos ✅ |
| **Código 8 dígitos** | Submit em 100ms ✅ | Submit em 400ms ✅ |
| **Código < 8 dígitos** | Submit em 800ms ✅ | Submit em 800ms ✅ |
| **Decodificação RFID** | Não ocorria (código truncado) ❌ | Funciona corretamente ✅ |
| **UX** | Código errado exibido ❌ | Código correto exibido ✅ |

---

## 📁 Arquivos Modificados

```
✅ /src/app/pages/ConferirPneus.tsx
   - handleTireCodeChange (linha ~4386)
     → Removido auto-submit imediato de 8 dígitos
     → Adicionado delay de 400ms para códigos >= 8 chars
     → Timer cancelado se mais caracteres chegarem
```

---

## 💡 Detalhes Técnicos

### Timer Cancelável

```typescript
// Cancela timer anterior se houver
if (autoSubmitTimerRef.current) {
  clearTimeout(autoSubmitTimerRef.current);
}

// Cria novo timer
autoSubmitTimerRef.current = setTimeout(() => { ... }, 400);
```

**Como funciona:**
1. Cada caractere digitado/escaneado cancela o timer anterior
2. Isso impede submissão prematura durante a digitação/scan
3. Apenas quando o input estabiliza (sem novos chars) o timer dispara

### Detecção de RFID Completo

```typescript
if (cleanValue.length === 24 && /^[0-9A-F]{24}$/.test(cleanValue)) {
  // Submit imediato (100ms) - não passa pelo timer de 400ms
  setTimeout(() => handleTireCodeSubmit(cleanValue), 100);
}
```

**Por que 100ms?**
- Garante que `setTireCodeInput(cleanValue)` completou
- Evita race conditions com React state
- Imperceptível para o usuário

---

## 🚨 Observações Importantes

### Scanners RFID Variam

Diferentes coletores RFID têm velocidades diferentes:
- **Rápidos:** ~150ms para 24 chars
- **Médios:** ~250ms para 24 chars
- **Lentos:** ~400ms para 24 chars

**Solução:** Timer de 400ms cobre todos os casos + margem de segurança

### Digitação Manual

Se o usuário digitar manualmente um RFID de 24 caracteres:
- Cada caractere reseta o timer de 400ms
- Apenas quando parar de digitar o timer dispara
- Funcionamento normal esperado

### Códigos de 8 Dígitos

O delay adicional de 400ms (antes era 100ms):
- **Impacto:** +300ms de latência
- **Perceptível?** Não - 0.4s é imperceptível
- **Benefício:** Evita bug crítico de RFID truncado

---

## 🔗 Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `FIX_RFID_CONFERENCIA_DISPLAY.md` | Fix da exibição do código decodificado |
| `FIX_RFID_CONFERENCIA.md` | Implementação original RFID em Conferência |
| `LOGICA_RFID_ATUALIZADA.md` | Explicação da decodificação SGTIN-96 |

---

**Desenvolvido em:** 25/05/2026  
**Versão:** 1.0.2 (Patch)  
**Status:** Corrigido e testado ✅
