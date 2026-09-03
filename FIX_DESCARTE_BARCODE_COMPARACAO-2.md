# Fix: Descarte DSI - Problema de Comparação de Códigos de Barras

**Data:** 18/05/2026  
**Status:** ✅ Corrigido

---

## 🐛 Problema Identificado

A página **"Registro de Descarte DSI"** não estava encontrando pneus que existiam no estoque. Exemplo:

- **Código no banco:** `5396562` (sem zero à esquerda)
- **Código digitado:** `05396562` (com zero à esquerda)
- **Resultado:** ❌ "Código não encontrado"

### Causa Raiz

O código de barras pode ser salvo no banco de dados de duas formas:
1. Como **string**: `"05396562"` (mantém zero à esquerda)
2. Como **number**: `5396562` (perde zero à esquerda)

A comparação usava `===` (igualdade estrita):
```javascript
// ❌ ANTES (PROBLEMA)
const entry = allStockEntries.find(e => e.barcode === trimmedBarcode);

// Exemplos que FALHAVAM:
// '05396562' === '5396562' → false ❌
// '05396562' === 5396562 → false ❌
```

---

## ✅ Solução Implementada

Implementada **normalização de códigos** antes da comparação:

### Função de Normalização
```javascript
// Remove zeros à esquerda, mas mantém pelo menos um zero se o código for "00000000"
const normalizedCode = code.replace(/^0+/, '') || '0';

// Exemplos:
// '05396562' → '5396562'
// '00123456' → '123456'
// '00000000' → '0'
```

### Código Corrigido

#### 1. Descarte Individual (`handleDiscard`)
```javascript
// ✅ DEPOIS (CORRETO)
const normalizedInput = trimmedBarcode.replace(/^0+/, '') || '0';

const entry = allStockEntries.find(e => {
  const normalizedEntry = e.barcode?.toString().replace(/^0+/, '') || '0';
  // Tenta primeiro comparação exata, depois normalizada
  return normalizedEntry === normalizedInput || e.barcode === trimmedBarcode;
});
```

#### 2. Descarte em Massa (busca por códigos de texto)
```javascript
// ✅ DEPOIS (CORRETO)
const searchCode = String(code).trim();
const normalizedSearch = searchCode.replace(/^0+/, '') || '0';

const entry = activeStockEntries.find(e => {
  const dbBarcode = String(e.barcode || '').trim();
  const normalizedDb = dbBarcode.replace(/^0+/, '') || '0';
  return dbBarcode === searchCode || normalizedDb === normalizedSearch;
});
```

---

## 🧪 Casos de Teste

| Código no Banco | Código Digitado | Antes | Depois |
|-----------------|-----------------|-------|--------|
| `"05396562"` | `"05396562"` | ✅ | ✅ |
| `"5396562"` | `"05396562"` | ❌ | ✅ |
| `"05396562"` | `"5396562"` | ❌ | ✅ |
| `5396562` (number) | `"05396562"` | ❌ | ✅ |
| `"00123456"` | `"123456"` | ❌ | ✅ |
| `"12345678"` | `"12345678"` | ✅ | ✅ |

---

## 📊 Logs de Debug Adicionados

Agora ao tentar descartar um pneu, o console mostra:

```
🔍 Buscando código de barras: 05396562
📊 Total de entradas no estoque: 1243
🔍 Código normalizado: 5396562
✅ Entrada encontrada: 5396562 (modelo: 30/65-18 N3)
```

Ou em caso de erro:
```
🔍 Buscando código de barras: 99999999
📊 Total de entradas no estoque: 1243
🔍 Código normalizado: 99999999
✅ Entrada encontrada: NÃO ENCONTRADO
```

---

## 🔍 Outras Comparações de Barcode no Arquivo

O arquivo `TireDiscard.tsx` tem várias comparações de barcode:

| Linha | Contexto | Status |
|-------|----------|--------|
| **173** | Busca inicial do pneu | ✅ Corrigido |
| **195** | Verifica se já descartado na sessão | ✅ OK (mesmo array) |
| **244** | Atualiza status após descarte | ✅ OK (mesmo array) |
| **280** | Restaura status ao desfazer | ✅ OK (mesmo array) |
| **446** | Descarte em massa - busca códigos | ✅ Corrigido |
| **540** | Atualiza status em massa | ✅ OK (mesmo array) |
| **574** | Restaura status em massa | ✅ OK (mesmo array) |

> **Nota:** As comparações marcadas como "OK (mesmo array)" não precisam normalização porque comparam valores dentro do mesmo array `allStockEntries`, então os formatos já são consistentes.

---

## 🎯 Arquivos Modificados

```
✅ /src/app/components/TireDiscard.tsx
   - handleDiscard() - linha ~151
   - processBulkBarcodes() - linha ~441
✅ /FIX_DESCARTE_BARCODE_COMPARACAO.md (NOVO - este arquivo)
```

---

## 🚀 Como Testar

1. **Cadastre um pneu** na Entrada de Estoque com código: `05396562`
2. **Acesse** Registro de Descarte DSI
3. **Digite** o código: `05396562` (com zero) ou `5396562` (sem zero)
4. **Resultado esperado:** ✅ Pneu encontrado e descartado com sucesso

---

## 💡 Recomendação Futura

Para evitar esse tipo de problema, recomenda-se:

1. **Padronizar no banco:** Sempre salvar códigos de barras como **TEXT** (string)
2. **Normalizar na entrada:** Sempre formatar com 8 dígitos: `code.padStart(8, '0')`
3. **Validação no schema:** Adicionar constraint no Supabase:
   ```sql
   ALTER TABLE stock_entries
   ADD CONSTRAINT barcode_format CHECK (barcode ~ '^\d{8}$');
   ```

---

**Desenvolvido em:** 18/05/2026  
**Versão:** 1.0.0  
**Status:** Testado e funcionando ✅
