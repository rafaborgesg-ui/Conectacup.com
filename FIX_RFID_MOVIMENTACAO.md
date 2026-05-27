# Fix: Movimentação de Pneus - Integração RFID

**Data:** 25/05/2026  
**Status:** ✅ Implementado

---

## 📋 Resumo

Adicionada capacidade de leitura RFID na página **"Movimentação de Pneus"**, usando a mesma lógica implementada em "Entrada de Estoque".

---

## 🔧 Alterações Implementadas

### 1. Funções RFID Adicionadas

```typescript
// Detecta se o código é RFID (24 caracteres hexadecimais)
const isRFIDCode = (code: string): boolean => {
  const trimmed = code.trim();
  return /^[0-9A-Fa-f]{24}$/.test(trimmed);
};

// Decodifica SGTIN-96 e extrai código de barras e CAI
const decodeRFID = (epcHex: string): { barcode: string; cai: string } | null => {
  // Extrai Serial Number (38 bits finais)
  // Extrai Item Reference (24 bits)
  // CAI = ItemReference / 16
  // Barcode = Serial / 4
};
```

### 2. Modificação no handleBarcodeChange

**Antes:**
```typescript
const handleBarcodeChange = async (value: string) => {
  const numericValue = value.replace(/\D/g, ''); // Apenas números
  setBarcode(numericValue);
  // Busca automática com 3+ dígitos
};
```

**Depois:**
```typescript
const handleBarcodeChange = async (value: string) => {
  const cleanValue = value.trim().toUpperCase();
  
  // Valida: apenas hexadecimal (0-9, A-F)
  if (!/^[0-9A-F]*$/.test(cleanValue)) {
    return;
  }
  
  setBarcode(cleanValue);
  
  // Auto-submit quando completo
  if (cleanValue.length === 24 && isRFIDCode(cleanValue)) {
    setTimeout(() => handleBarcodeSubmit(), 100);
  } else if (cleanValue.length === 8 && /^\d{8}$/.test(cleanValue)) {
    setTimeout(() => handleBarcodeSubmit(), 100);
  }
};
```

### 3. Modificação no handleBarcodeSubmit

**Antes:**
```typescript
const handleBarcodeSubmit = async (e?: React.FormEvent) => {
  if (barcode.length !== 8) {
    toast.error('Código inválido');
    return;
  }
  
  // Busca direta pelo código de barras
  const { data } = await supabase
    .from('stock_entries')
    .select('*')
    .eq('barcode', barcode)
    .single();
};
```

**Depois:**
```typescript
const handleBarcodeSubmit = async (e?: React.FormEvent) => {
  let searchBarcode = barcode;
  
  // Detecta e decodifica RFID
  if (isRFIDCode(barcode)) {
    const rfidData = decodeRFID(barcode);
    
    if (!rfidData) {
      toast.error('Erro ao decodificar RFID');
      return;
    }
    
    searchBarcode = rfidData.barcode;
    
    toast.success('RFID Decodificado', {
      description: `CAI: ${rfidData.cai} | Código: ${rfidData.barcode}`,
    });
  } else if (barcode.length !== 8) {
    toast.error('Código inválido');
    return;
  }
  
  // Busca pelo código decodificado
  const { data } = await supabase
    .from('stock_entries')
    .select('*')
    .eq('barcode', searchBarcode)
    .single();
};
```

### 4. Atualização do Input Component

**Antes:**
```tsx
<Input
  type="text"
  maxLength={8}
  placeholder="00000000"
/>
<p className="text-xs text-gray-500 mt-1">
  Digite ou escaneie o código de 8 dígitos
</p>
```

**Depois:**
```tsx
<Input
  type="text"
  maxLength={24}
  placeholder="00000000 ou RFID"
/>
<p className="text-xs text-gray-500 mt-1">
  Digite ou escaneie o código de 8 dígitos ou RFID (24 caracteres)
</p>
```

---

## 🔄 Fluxo Completo - Movimentação com RFID

```
1. Usuário acessa "Movimentação de Pneus"
   └─ Campo aceita até 24 caracteres (hexadecimal)

2. Usuário escaneia RFID: 301854AAE059B8000149614B
   └─ handleBarcodeChange detecta 24 caracteres hex

3. Auto-submit disparado automaticamente
   └─ Chama: handleBarcodeSubmit()

4. Sistema detecta RFID (24 chars)
   └─ isRFIDCode() retorna true

5. Decodifica RFID
   └─ decodeRFID() extrai:
       - Serial Number: 21586251
       - Item Reference: 8480480
       - CAI: 530030 (ItemRef / 16)
       - Barcode: 05396562 (Serial / 4)

6. Exibe toast de confirmação
   └─ "RFID Decodificado - CAI: 530030 | Código: 05396562"

7. Busca pneu no banco de dados
   └─ SELECT * FROM stock_entries WHERE barcode = '05396562'

8. Exibe dados do pneu encontrado
   └─ Modelo, Container atual, Status

9. Usuário seleciona container de destino
   └─ Confirma movimentação

10. Sistema registra movimentação
    └─ Atualiza container_id do pneu
```

---

## 📊 Logs de Debug

Ao escanear RFID na Movimentação de Pneus, o console mostrará:

```
🔍 isRFIDCode("301854AAE059B8000149614B") = true (24 chars)
🎯 RFID completo detectado, auto-submit...
📡 ========================================
📡 CÓDIGO RFID DETECTADO!
📡 Código: 301854AAE059B8000149614B
📡 Iniciando decodificação...
📡 Decodificando RFID: 301854AAE059B8000149614B
📊 RFID Decodificado: ItemRef=8480480, Serial=21586251
🔑 Código CAI extraído: 530030 (ItemReference: 8480480)
📊 Código de Barras extraído: 05396562 (Serial: 21586251 / 4 = 5396562)
✅ RFID decodificado com sucesso!
📊 CAI: 530030
📊 Código de Barras: 05396562
🔍 Buscando código de barras: 05396562 (normalizado: 5396562)
```

---

## 🧪 Como Testar

### 1. Acesse a Página
- Navegue para **"Movimentação de Pneus"**

### 2. Teste com RFID
- Escaneie ou digite: `301854AAE059B8000149614B`
- **Resultado esperado:**
  - Toast: "RFID Decodificado - CAI: 530030 | Código: 05396562"
  - Pneu encontrado automaticamente
  - Dados do pneu exibidos (Modelo: 30/65-18 N3)

### 3. Teste com Código de Barras Normal
- Digite: `05396562`
- **Resultado esperado:**
  - Busca direta pelo código
  - Pneu encontrado
  - Dados exibidos

### 4. Teste com Código Inválido
- Digite: `99999999`
- **Resultado esperado:**
  - Toast: "Pneu não encontrado - Código 99999999 não existe no estoque"

---

## 🎯 Benefícios

1. **Paridade de Funcionalidade:** Movimentação agora suporta RFID assim como Entrada de Estoque
2. **Agilidade:** Leitura RFID automática sem necessidade de digitar
3. **Precisão:** Decodificação SGTIN-96 garante código correto
4. **Feedback Visual:** Toast mostra CAI e código extraídos
5. **Compatibilidade:** Continua aceitando códigos de barras tradicionais

---

## 📁 Arquivos Modificados

```
✅ /src/app/components/TireMovement.tsx
   - Adicionado isRFIDCode() (linha ~324)
   - Adicionado decodeRFID() (linha ~333)
   - Modificado handleBarcodeChange() (linha ~379)
   - Modificado handleBarcodeSubmit() (linha ~401)
   - Atualizado Input maxLength: 8 → 24 (linha ~1176)
   - Atualizado placeholder e help text (linhas ~1179, ~1185)
```

---

## 🔗 Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `INTEGRACAO_RFID_CAI.md` | Documentação da integração CAI com RFID |
| `LOGICA_RFID_ATUALIZADA.md` | Explicação da decodificação SGTIN-96 |
| `TireStockEntry.tsx` | Implementação RFID original (referência) |

---

## 💡 Observações Técnicas

### Validação Hexadecimal
```typescript
// Aceita apenas: 0-9, A-F (case insensitive, convertido para uppercase)
if (!/^[0-9A-F]*$/.test(cleanValue)) {
  return; // Bloqueia caracteres inválidos
}
```

### Auto-Submit
```typescript
// RFID: 24 chars hexadecimais
if (cleanValue.length === 24 && isRFIDCode(cleanValue)) {
  setTimeout(() => handleBarcodeSubmit(), 100);
}

// Código de barras: 8 dígitos numéricos
else if (cleanValue.length === 8 && /^\d{8}$/.test(cleanValue)) {
  setTimeout(() => handleBarcodeSubmit(), 100);
}
```

### Timeout de 100ms
O `setTimeout` de 100ms garante que o estado `barcode` foi atualizado antes de chamar `handleBarcodeSubmit()`, evitando race conditions.

---

**Desenvolvido em:** 25/05/2026  
**Versão:** 1.0.0  
**Status:** Testado e pronto para produção ✅
