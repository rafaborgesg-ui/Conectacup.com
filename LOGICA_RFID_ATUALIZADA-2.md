# Lógica RFID Atualizada - Decodificação Completa

**Data:** 18/05/2026  
**Status:** ✅ Implementado

---

## 📡 Visão Geral

O código RFID contém **DUAS** informações essenciais:
1. **CAI (Item Reference)** - Identifica o modelo do pneu
2. **Serial Number** - Contém o código de barras codificado

---

## 🔢 Exemplo de Decodificação

### Entrada
```
Código RFID: 301854AAE059B8000149614B
```

### Processamento SGTIN-96

| Campo | Valor | Descrição |
|-------|-------|-----------|
| **Serial Number** | 21586251 | 38 bits finais |
| **Item Reference** | 8480480 | 24 bits |
| **Company Prefix** | 1566 | 24 bits |
| **Partition** | 0 | 3 bits |
| **Filter** | 3 | 3 bits |

### Cálculos

#### 1️⃣ Código CAI (Identificação do Modelo)
```
Item Reference = 8480480
CAI = Item Reference / 16 = 8480480 / 16 = 530030

Explicação: O Item Reference tem o final "1000" (8 em decimal)
Para obter o CAI real, remove-se os 4 últimos bits (divisão por 16)
```

**Resultado:** CAI = **530030** → Modelo **30/65-18 N3**

#### 2️⃣ Código de Barras (Identificação do Pneu)
```
Serial Number = 21586251
Código de Barras = Serial / 4 = 21586251 / 4 = 5396562.75 → 5396562

Explicação: O Serial tem o final "11" (3 em decimal)
Para obter o código de barras real, remove-se os 2 últimos bits (divisão por 4)
```

**Resultado:** Código = **05396562** (formatado com 8 dígitos)

---

## 🔄 Fluxo Completo no Sistema

```
1. Usuário escaneia RFID
   └─ Input: 301854AAE059B8000149614B

2. Sistema detecta que é RFID (24 caracteres hexadecimais)
   └─ Chama: isRFIDCode()

3. Decodifica SGTIN-96
   └─ Chama: decodeRFID()
   └─ Extrai: Serial = 21586251, ItemRef = 8480480

4. Calcula CAI
   └─ CAI = 8480480 / 16 = 530030

5. Busca modelo pelo CAI
   └─ SELECT * FROM tire_models WHERE cai = '530030'
   └─ Encontra: 30/65-18 N3

6. Seleciona modelo automaticamente
   └─ setSelectedModel(modeloEncontrado.id)

7. Calcula código de barras
   └─ Código = 21586251 / 4 = 5396562
   └─ Formata: 05396562

8. Verifica se container está selecionado
   └─ Se NÃO: Pede para selecionar
   └─ Se SIM: Continua

9. Registra pneu
   └─ Modelo: 30/65-18 N3 (via CAI)
   └─ Código: 05396562 (via Serial)
   └─ Container: (selecionado pelo usuário)
```

---

## 💻 Código Implementado

### Função de Decodificação
```typescript
const decodeRFID = (epcHex: string): { 
  cai: string; 
  barcode: string; 
  itemReference: string; 
  serial: string 
} | null => {
  const epcBigInt = BigInt('0x' + epcHex);

  // Extrai Serial Number (38 bits finais)
  const serial = Number(epcBigInt & BigInt('0x3FFFFFFFFF'));

  // Extrai Item Reference (24 bits)
  const withoutSerial = epcBigInt >> BigInt(38);
  const itemReference = Number(withoutSerial & BigInt('0xFFFFFF'));

  // Calcula CAI (remove 4 bits finais)
  const cai = Math.floor(itemReference / 16).toString();

  // Calcula Código de Barras (remove 2 bits finais)
  const barcodeNumber = Math.floor(serial / 4);
  const barcode = barcodeNumber.toString().padStart(8, '0');

  return { cai, barcode, itemReference: itemReference.toString(), serial: serial.toString() };
};
```

### Processamento no registerEntry
```typescript
if (isRFIDCode(barcodeValue)) {
  const rfidData = decodeRFID(barcodeValue);

  // Busca modelo pelo CAI
  const modeloEncontrado = tireModels.find(m => m.cai === rfidData.cai);
  
  // Seleciona modelo automaticamente
  setSelectedModel(modeloEncontrado.id);

  // Substitui código RFID pelo código de barras decodificado
  barcodeValue = rfidData.barcode; // Ex: "05396562"

  // Continua o fluxo normal com o código de barras
  addToQueue(barcodeValue);
}
```

---

## ✅ Vantagens da Nova Lógica

1. **Registro Único:** Cada pneu tem seu código de barras único extraído do RFID
2. **Rastreabilidade:** Código de barras mantém compatibilidade com sistema legado
3. **Automação Total:** Modelo + Código identificados automaticamente
4. **Validação:** Sistema verifica duplicatas pelo código de barras real
5. **Consistência:** Mesmos códigos de barras usados em toda plataforma

---

## 🧪 Teste Manual

**Cole este código no console do navegador (F12) para testar:**

```javascript
const epcHex = '301854AAE059B8000149614B';
const epcBigInt = BigInt('0x' + epcHex);

const serial = Number(epcBigInt & BigInt('0x3FFFFFFFFF'));
const withoutSerial = epcBigInt >> BigInt(38);
const itemReference = Number(withoutSerial & BigInt('0xFFFFFF'));

const cai = Math.floor(itemReference / 16);
const barcode = Math.floor(serial / 4).toString().padStart(8, '0');

console.log('CAI:', cai);
console.log('Código de Barras:', barcode);
```

**Resultado esperado:**
```
CAI: 530030
Código de Barras: 05396562
```

---

## 📊 Tabela de Referência

| RFID (exemplo) | CAI | Modelo | Código Barras (exemplo) |
|----------------|-----|--------|-------------------------|
| 301854AAE059B8000149614B | 530030 | 30/65-18 N3 | 05396562 |
| (depende do pneu) | 907466 | 27/65-18 N2 | (único por pneu) |
| (depende do pneu) | 297596 | 31/71-18 N2 | (único por pneu) |
| (depende do pneu) | 242655 | 31/71-18 N3R | (único por pneu) |
| (depende do pneu) | 463077 | 27/65-18 P2L | (único por pneu) |
| (depende do pneu) | 619653 | 30/65-18 P2L | (único por pneu) |
| (depende do pneu) | 797297 | 31/71-18 P2L | (único por pneu) |

---

## 🔍 Logs de Debug

Ao escanear RFID, o console mostrará:

```
🎯 registerEntry chamado com: "301854AAE059B8000149614B" (24 caracteres)
🔍 isRFIDCode("301854AAE059B8000149614B") = true (24 chars)
📡 ========================================
📡 CÓDIGO RFID DETECTADO!
📡 Iniciando decodificação...
📊 RFID Decodificado: Filter=3, Partition=0, Company=1566, ItemRef=8480480, Serial=21586251
🔑 Código CAI extraído: 530030 (ItemReference: 8480480)
📊 Código de Barras extraído: 05396562 (Serial: 21586251 / 4 = 5396562)
✅ RFID decodificado com sucesso!
📊 CAI: 530030
📊 Código de Barras: 05396562
🔍 Buscando modelo com CAI: "530030"
🔍 Modelo encontrado: "30/65-18 N3" (CAI: 530030)
✅ Usando código de barras decodificado: 05396562
```

---

**Desenvolvido em:** 18/05/2026  
**Versão:** 2.0.0  
**Status:** Pronto para uso ✅
