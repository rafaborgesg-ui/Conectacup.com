# ✅ Entrada de Estoque na Tabela Estoque vs. Demanda

## 📋 O que foi implementado

Sistema que exibe as quantidades REAIS conferidas dos pedidos na tabela "Estoque vs. Demanda", mostrando uma nova linha chamada "Entrada de Estoque" abaixo de cada pedido conferido.

---

## 🎯 Mudança Fundamental

### ANTES:
```
Estoque Inicial = Estoque Final Anterior + Quantidade do Pedido
```

### AGORA:
```
Estoque Inicial = Estoque Final Anterior + Entrada de Estoque (Quantidade Conferida)
```

---

## 🔄 Fluxo Completo

### 1. Pedido Criado (Sem Conferência)
```
┌────────────────────────────────────────────┐
│ 📦 Pedido #001 - 100 pneus                 │
│ +20  +30  +50  (quantidades pedidas)       │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ Estoque Inicial                            │
│ 100  150  200  (estoque ANTERIOR - SEM pedido) │
└────────────────────────────────────────────┘
```
**Observação:** Sem conferência, o pedido NÃO é somado ao estoque inicial!

### 2. Pedido Conferido (Com Conferência)
```
┌────────────────────────────────────────────┐
│ 📦 Pedido #001 - 100 pneus                 │
│ +20  +30  +50  (quantidades pedidas)       │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ ✅ Entrada de Estoque                      │
│ +20  +30  +50  (quantidades conferidas)    │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ Estoque Inicial                            │
│ 120  180  250  (estoque + entrada)         │
└────────────────────────────────────────────┘
```
**Observação:** Com conferência SEM divergências, entrada = pedido!

### 3. Pedido Conferido COM Divergências
```
┌────────────────────────────────────────────┐
│ 📦 Pedido #001 - 100 pneus                 │
│ +20  +30  +50  (quantidades pedidas)       │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ ⚠️ Entrada de Estoque                      │
│ +18  +30  +47  (quantidades REAIS)         │
│ ⚠️   ✅   ⚠️   (células com divergência)   │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ Estoque Inicial                            │
│ 118  180  247  (estoque + entrada REAL)    │
└────────────────────────────────────────────┘
```
**Observação:** Entrada reflete o que REALMENTE chegou, não o que foi pedido!

---

## 🎨 Cores da Linha "Entrada de Estoque"

### Sem Divergências (Verde)
- **Background:** `#F0FDF4` (verde claro)
- **Texto:** `#059669` (verde)
- **Ícone:** ✅
- **Células com valores:** Verde mais escuro (`#DCFCE7` / `#16A34A`)

### Com Divergências (Vermelho)
- **Background:** `#FEF2F2` (vermelho claro)
- **Texto:** `#DC2626` (vermelho)
- **Ícone:** ⚠️
- **Células com divergência:** Vermelho (`#FEE2E2` / `#DC2626`)
- **Células sem divergência:** Verde (`#DCFCE7` / `#16A34A`)

---

## 🔧 Mudanças Técnicas

### 1. Novo Estado (/pages/Demanda.tsx linha ~115)

```typescript
const [orderConferences, setOrderConferences] = useState<Map<string, any>>(new Map());
```

### 2. Carregamento das Conferências (linha ~1174)

```typescript
// Carrega conferências dos pedidos
const orderIds = calculationsData
  .filter(calc => calc.order_id)
  .map(calc => calc.order_id);

if (orderIds.length > 0) {
  const { data: conferencesData, error: conferencesError } = await supabase
    .from('order_conferences')
    .select('*')
    .in('order_id', orderIds)
    .order('conference_date', { ascending: false });
  
  if (!conferencesError && conferencesData) {
    const conferencesMap = new Map<string, any>();
    conferencesData.forEach(conf => {
      // Pega apenas a conferência mais recente de cada pedido
      if (!conferencesMap.has(conf.order_id)) {
        conferencesMap.set(conf.order_id, conf);
      }
    });
    setOrderConferences(conferencesMap);
  }
}
```

### 3. Modificação do Cálculo de Estoque Acumulado (linha ~2019)

**ANTES:**
```typescript
// Adicionava SEMPRE a quantidade do pedido
if (!isInternational && demand.ordered_tires) {
  demand.ordered_tires.forEach((tire: any) => {
    const currentStock = accumulatedStock.get(tire.model) || 0;
    accumulatedStock.set(tire.model, currentStock + (tire.qty || 0));
  });
}
```

**AGORA:**
```typescript
// Adiciona apenas se houver conferência, usando as quantidades CONFERIDAS
const conference = demand.order_id ? orderConferences.get(demand.order_id) : null;

if (!isInternational && conference && conference.items_detail) {
  conference.items_detail.forEach((item: any) => {
    const currentStock = accumulatedStock.get(item.model_code) || 0;
    accumulatedStock.set(item.model_code, currentStock + (item.quantity_scanned || 0));
  });
}
```

### 4. Nova Linha de Renderização (linha ~2086)

```typescript
// 🆕 Linha 1.5: Entrada de Estoque (se pedido foi conferido)
if (conference && conference.items_detail) {
  // Criar um Map das quantidades conferidas para lookup rápido
  const conferencedTiresMap = new Map<string, number>();
  conference.items_detail.forEach((item: any) => {
    conferencedTiresMap.set(item.model_code, item.quantity_scanned || 0);
  });
  
  const hasDivergences = conference.has_divergences;
  
  rows.push(
    <tr key={`${demand.stage_id}-entrada`} style={{ 
      borderBottom: '1px solid #F3F4F6', 
      background: hasDivergences ? '#FEF2F2' : '#F0FDF4' 
    }}>
      <td></td>
      <td></td>
      <td style={{ color: hasDivergences ? '#DC2626' : '#059669' }}>
        <div>
          <span>{hasDivergences ? '⚠️' : '✅'}</span>
          <span>Entrada de Estoque</span>
        </div>
      </td>
      {allTireModels.map((tire) => {
        const quantityConferenced = conferencedTiresMap.get(tire.model) || 0;
        const quantityOrdered = orderedTiresMap.get(tire.model) || 0;
        const hasDivergence = quantityConferenced !== quantityOrdered;
        
        return (
          <td style={{ 
            backgroundColor: quantityConferenced > 0 ? 
              (hasDivergence ? '#FEE2E2' : '#DCFCE7') : '#F9FAFB',
            color: quantityConferenced > 0 ? 
              (hasDivergence ? '#DC2626' : '#16A34A') : '#9CA3AF'
          }}>
            {quantityConferenced > 0 ? `+${quantityConferenced}` : '-'}
          </td>
        );
      })}
    </tr>
  );
}
```

---

## 📊 Estrutura de Dados da Conferência

A conferência salva em `order_conferences` contém:

```typescript
{
  order_id: string;
  conference_date: string;
  total_items_expected: number;
  total_items_scanned: number;
  has_divergences: boolean;
  divergences: Array<{
    model: string;
    expected: number;
    scanned: number;
    difference: number;
  }>;
  items_detail: Array<{
    model_code: string;           // ← Usado para lookup
    model_description: string;
    quantity_ordered: number;
    quantity_scanned: number;     // ← Usado para estoque
  }>;
}
```

**Campo-chave:** `items_detail` é usado para:
1. Calcular o estoque acumulado (`quantity_scanned`)
2. Renderizar a linha de Entrada de Estoque
3. Identificar divergências (comparando `quantity_scanned` vs `quantity_ordered`)

---

## 🔄 Ordem de Renderização das Linhas

Para cada etapa com pedido conferido:

```
1. 📦 Pedido Realizado      (verde claro)
2. ✅ Entrada de Estoque    (verde/vermelho dependendo divergências)
3. Estoque Inicial          (branco)
4. Consumo Previsto         (branco)
5. Estoque Final            (branco)
```

Para cada etapa SEM pedido:

```
1. Estoque Inicial          (branco)
2. Consumo Previsto         (branco)
3. Estoque Final            (branco)
```

---

## 🎯 Benefícios

1. **Visibilidade Total:** Vê exatamente o que chegou vs. o que foi pedido
2. **Precisão de Estoque:** Estoque reflete a realidade física
3. **Rastreamento de Divergências:** Fácil identificar problemas de fornecimento
4. **Auditoria:** Histórico completo de entradas vs. pedidos
5. **Planejamento:** Decisões baseadas em dados reais, não estimativas

---

## 📝 Exemplo Completo

### Cenário: Etapa de Pré-Temporada

**Estoque Anterior:** 100 pneus 27/65-18 P1L

**Pedido #001:**
- 27/65-18 P1L: 50 pneus
- 27/65-18 P2R: 30 pneus

**Conferência Física:**
- 27/65-18 P1L: 48 pneus ⚠️ (faltaram 2)
- 27/65-18 P2R: 30 pneus ✅ (conferido)

**Resultado na Tabela:**

| Linha               | 27/65-18 P1L | 27/65-18 P2R |
|---------------------|--------------|--------------|
| 📦 Pedido #001      | +50          | +30          |
| ⚠️ Entrada Estoque  | +48 ⚠️       | +30 ✅       |
| Estoque Inicial     | 148          | 30           |
| Consumo Previsto    | -120         | -80          |
| Estoque Final       | 28           | -50          |

**Observação:** O estoque inicial é 148 (100 + 48), NÃO 150 (100 + 50)!

---

## 🧪 Como Testar

1. **Criar um pedido**
   - Ir em "Pedidos de Pneus"
   - Criar pedido com múltiplos modelos
   - Verificar que aparece na aba "Estoque vs. Demanda"

2. **Conferir pedido SEM divergências**
   - Clicar no botão verde de conferência
   - Escanear TODOS os pneus do pedido
   - Finalizar conferência
   - Voltar para "Estoque vs. Demanda"
   - **Deve aparecer:** Linha verde "✅ Entrada de Estoque" com as quantidades

3. **Conferir pedido COM divergências**
   - Criar novo pedido
   - Na conferência, escanear MENOS pneus que o pedido
   - Aceitar as divergências
   - Voltar para "Estoque vs. Demanda"
   - **Deve aparecer:** Linha vermelha "⚠️ Entrada de Estoque" com células em vermelho para modelos com divergência

4. **Verificar cálculo do estoque**
   - Conferir que o "Estoque Inicial" usa a quantidade CONFERIDA, não a PEDIDA
   - Testar com múltiplas etapas e pedidos

---

## 🚨 Casos Especiais

### Pedido Não Conferido
- Linha "Pedido" aparece normalmente
- NÃO aparece linha "Entrada de Estoque"
- Estoque inicial NÃO inclui o pedido (porque não chegou!)

### Etapa Internacional
- Mesmo com conferência, o estoque inicial é sempre 0
- Entrada de estoque NÃO afeta o estoque acumulado
- Linha "Entrada de Estoque" ainda aparece para documentação

### Reconferência
- Sistema usa apenas a conferência mais recente
- Se fizer reconferência, a entrada de estoque é atualizada automaticamente

---

## 📚 Arquivos Modificados

- `/pages/Demanda.tsx`:
  - Linha ~115: Novo estado `orderConferences`
  - Linha ~1174: Carregamento de conferências
  - Linha ~2019: Modificação do cálculo de estoque acumulado
  - Linha ~2086: Nova linha de renderização "Entrada de Estoque"
  - Linha ~2135: Atualização de comentário "Estoque Inicial"

---

## 🔮 Possíveis Melhorias Futuras

- [ ] Tooltip mostrando detalhes da conferência ao passar o mouse
- [ ] Botão para reconferir direto da tabela
- [ ] Filtro para mostrar apenas etapas com divergências
- [ ] Exportar relatório de divergências
- [ ] Gráfico de tendência de divergências ao longo do tempo
