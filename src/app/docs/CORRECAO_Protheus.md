# 🔧 Correção: Colunas A, H e I da Exportação Protheus

## 🎯 Problema Identificado

As colunas **A (Código Protheus)**, **H (Preço Compra)** e **I (Preço Venda)** estavam vazias no arquivo Excel exportado.

## 🔍 Causa Raiz

No componente `/components/Reports.tsx`, ao carregar os modelos de pneus do Supabase, **apenas 4 campos** estavam sendo extraídos:

```typescript
// ❌ ANTES (INCORRETO)
const models: TireModel[] = (modelsData || []).map((model: any) => ({
  id: model.id,
  name: model.name,
  code: model.code,
  type: model.type,
  // ❌ FALTAVAM: protheus_code, price_by_year, sale_price_by_year
}));
```

Como esses 3 campos não estavam sendo extraídos do banco de dados, eles ficavam `undefined` no array `tireModels`, e consequentemente as colunas A, H e I ficavam vazias na exportação.

## ✅ Solução Implementada

Adicionei a extração dos 3 campos faltantes:

```typescript
// ✅ DEPOIS (CORRETO)
const models: TireModel[] = (modelsData || []).map((model: any) => ({
  id: model.id,
  name: model.name,
  code: model.code,
  type: model.type,
  protheus_code: model.protheus_code,           // ✅ ADICIONADO
  price_by_year: model.price_by_year,           // ✅ ADICIONADO
  sale_price_by_year: model.sale_price_by_year, // ✅ ADICIONADO
}));
```

## 📋 Mudanças Adicionais

### 1. Removido Filtro de Status "Piloto"

**Antes:**
```typescript
// Filtrava apenas status "Piloto"
const filteredData = data.filter(entry => {
  return (
    entryStatus === 'piloto' &&
    entrySeason === season &&
    entryStage === stage
  );
});
```

**Depois:**
```typescript
// Exporta TODOS os pneus da temporada/etapa
const filteredData = data.filter(entry => {
  return (
    entrySeason === season &&
    entryStage === stage
  );
});
```

### 2. Mensagens Atualizadas

**Modal de Exportação:**
```
✅ Todos os pneus da temporada e etapa selecionadas
✅ Códigos Protheus e preços são buscados automaticamente
```

**Mensagem de Erro:**
```
Nenhum pneu encontrado para a temporada e etapa selecionadas
(removido: "com status Piloto")
```

## 🧪 Como Testar

### 1. Verifique o Cadastro de Modelos

Antes de exportar, certifique-se de que pelo menos 1 modelo tem dados completos:

1. Vá em **Cadastro de Modelos de Pneus**
2. Edite um modelo existente
3. Preencha:
   - ✅ **Código do Protheus**: ex: `PR-2025-001`
   - ✅ **Preço de Compra (€)**: ex: `1200` para o ano `2025`
   - ✅ **Preço de Venda (R$)**: ex: `6500` para o ano `2025`
4. Salve

### 2. Cadastre Pneus com Este Modelo

1. Vá em **Entrada de Estoque**
2. Adicione pelo menos 2 pneus:
   - Use o modelo configurado acima
   - Preencha: Temporada = `2025`, Etapa = `3`
   - Preencha Piloto (qualquer nome)
   - Defina um Status (qualquer um)

### 3. Exporte o Relatório Protheus

1. Vá em **Relatórios & Histórico**
2. Clique em **Exportar → Protheus**
3. Modal abre:
   - Selecione: Temporada = `2025`
   - Selecione: Etapa = `3`
   - Clique: **Exportar Excel**

### 4. Verifique o Console (F12)

Logs que devem aparecer:
```
[Reports] Iniciando exportação Protheus
[Reports] Total de entries: XX
[Reports] Total de tire models: YY
[Reports] Amostra tire models: [
  {
    name: "Nome do Modelo",
    protheus_code: "PR-2025-001",    ← deve estar presente
    price_by_year: { 2025: 1200 },   ← deve estar presente
    sale_price_by_year: { 2025: 6500 } ← deve estar presente
  }
]

[Protheus Export] Total de pneus filtrados: 2
[Protheus Export] Total de modelos disponíveis: YY
[Protheus Export] Processando pneu: {
  barcode: "PN000123456",
  modelName: "Nome do Modelo",
  modelFound: true,                  ← deve ser true
  proteusCode: "PR-2025-001",        ← deve estar presente
  priceByYear: { 2025: 1200 },
  salePriceByYear: { 2025: 6500 }
}
[Protheus Export] Preços encontrados: {
  years: ["2025"],
  latestYear: "2025",
  purchasePrice: 1200,               ← deve ter valor
  salePrice: 6500                    ← deve ter valor
}
```

### 5. Abra o Arquivo Excel Gerado

Verifique as colunas:

| A (Protheus) | B (Barcode) | C (Modelo) | H (Compra €) | I (Venda R$) |
|--------------|-------------|------------|--------------|--------------|
| PR-2025-001  | PN000123456 | Nome Modelo| 1200.00      | 6500.00      |
| PR-2025-001  | PN000123457 | Nome Modelo| 1200.00      | 6500.00      |

**✅ Se as colunas A, H e I estiverem preenchidas = CORRIGIDO!**

## ⚠️ Cenários Esperados

### Modelo SEM Código Protheus

| Situação | Resultado |
|----------|-----------|
| Modelo não tem `protheus_code` | Coluna A fica **vazia** |
| Modelo não tem preços | Colunas H e I ficam com `0` |

**Isso é NORMAL!** Não é erro. Significa que você precisa completar o cadastro daquele modelo.

### Preços de Anos Diferentes

Se o modelo tem preços para 2024, 2025 e 2026:
- Sistema automaticamente usa o **ano mais recente** (2026)
- Colunas H e I mostram os preços de 2026

## 📂 Arquivos Modificados

### 1. `/components/Reports.tsx`
```typescript
// Linha ~238-243
const models: TireModel[] = (modelsData || []).map((model: any) => ({
  id: model.id,
  name: model.name,
  code: model.code,
  type: model.type,
  protheus_code: model.protheus_code,           // ← ADICIONADO
  price_by_year: model.price_by_year,           // ← ADICIONADO  
  sale_price_by_year: model.sale_price_by_year, // ← ADICIONADO
}));
```

### 2. `/utils/excelExport.ts`
```typescript
// Linha ~6-13: Removido filtro de status "Piloto"
const filteredData = data.filter(entry => {
  const entrySeason = (entry as any).ano?.toString() || '';
  const entryStage = (entry as any).etapa?.toString() || '';
  
  return (
    entrySeason === season &&
    entryStage === stage
  );
});
```

### 3. `/components/ProtheusExportDialog.tsx`
```typescript
// Linha ~81-86: Atualizado texto do info box
<li>• <strong>Todos os pneus</strong> da temporada e etapa selecionadas</li>
<li>• Códigos Protheus e preços são buscados automaticamente</li>
```

## 🐛 Se Ainda Não Funcionar

### Verifique o Console

Se aparecer:
```
modelFound: false
proteusCode: "NÃO ENCONTRADO"
```

**Problema:** O nome do modelo no pneu não corresponde ao nome no cadastro.

**Solução:**
1. Verifique se o `model_name` do pneu está **exatamente igual** ao `name` do modelo
2. Cuidado com espaços extras, maiúsculas/minúsculas

---

Se aparecer:
```
modelFound: true
proteusCode: undefined
priceByYear: undefined
```

**Problema:** Os campos ainda não estão sendo carregados.

**Solução:**
1. Faça **hard refresh** da página (Ctrl+Shift+R)
2. Verifique se a correção foi aplicada em `/components/Reports.tsx`
3. Confirme que os logs mostram os 3 campos extras

---

Se aparecer:
```
[Reports] Amostra tire models: []
```

**Problema:** Nenhum modelo cadastrado.

**Solução:**
1. Acesse **Cadastro de Modelos de Pneus**
2. Cadastre pelo menos 1 modelo

## ✅ Checklist Final

Antes de reportar problema, verifique:

- [ ] Fiz hard refresh da página (Ctrl+Shift+R)
- [ ] Há pelo menos 1 modelo cadastrado com dados completos
- [ ] Há pelo menos 1 pneu cadastrado com a temporada/etapa que vou exportar
- [ ] O nome do modelo no pneu corresponde ao nome no cadastro
- [ ] Verifiquei o console e os logs aparecem corretamente
- [ ] Abri o arquivo Excel e as colunas ainda estão vazias

Se todos os itens estão ✅ e ainda não funciona, envie os logs do console.

---

**Versão:** 2.1  
**Data:** 05/02/2025  
**Status:** ✅ Corrigido
