# 📝 Adicionar Preços de Venda aos Modelos de Pneus

## O que faz?

Esta migration adiciona a coluna `sale_price_by_year` à tabela `tire_models` para armazenar **preços de venda em reais (R$)** por ano, separados dos preços de compra.

## Diferença entre Preços

- **`price_by_year`** (já existe): Preços de **COMPRA** em **euros (€)**
- **`sale_price_by_year`** (nova coluna): Preços de **VENDA** em **reais (R$)**

## Como executar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Cole o conteúdo do arquivo `add_sale_price_to_tire_models.sql`
5. Clique em **Run** (ou pressione `Ctrl + Enter`)
6. Verifique as mensagens de sucesso

### Opção 2: Via CLI do Supabase

```bash
supabase db push
```

## Exemplo de Dados

### Antes da migration:
```json
{
  "name": "30/65-18 N3",
  "price_by_year": {
    "2025": 1500,
    "2026": 1600
  }
}
```

### Após a migration:
```json
{
  "name": "30/65-18 N3",
  "price_by_year": {
    "2025": 1500,
    "2026": 1600
  },
  "sale_price_by_year": {
    "2025": 8000,
    "2026": 8500
  }
}
```

## Validação

Após executar a migration, rode esta query para verificar:

```sql
SELECT 
  id,
  name,
  price_by_year,
  sale_price_by_year
FROM tire_models
LIMIT 5;
```

## Teste no Frontend

1. Acesse **Cadastro de Modelos de Pneus**
2. Adicione ou edite um modelo
3. Na seção "Preços por Ano":
   - Digite o ano (ex: 2025)
   - Digite o **Preço de Compra (€)**: 1500
   - Digite o **Preço de Venda (R$)**: 8000
   - Clique no **+**
4. Salve o modelo
5. Verifique se ambos os preços foram salvos

## Rollback (caso necessário)

Se precisar reverter a mudança:

```sql
ALTER TABLE tire_models DROP COLUMN IF EXISTS sale_price_by_year;
```

## Status

- ✅ Interface atualizada
- ✅ TypeScript atualizado
- ✅ Código de salvamento implementado
- ⏳ **Migration SQL pendente de execução**

Execute a migration agora para começar a usar preços de venda!
