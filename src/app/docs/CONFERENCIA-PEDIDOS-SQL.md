# SQL para Tabela de Conferências de Pedidos

## Criação da tabela `order_conferences`

Execute este SQL no Supabase SQL Editor:

```sql
-- Tabela para armazenar conferências de pedidos
CREATE TABLE IF NOT EXISTS public.order_conferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.tire_orders(id) ON DELETE CASCADE,
  conference_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_items_expected INTEGER NOT NULL,
  total_items_scanned INTEGER NOT NULL,
  has_divergences BOOLEAN NOT NULL DEFAULT false,
  divergences JSONB DEFAULT '[]'::jsonb,
  items_detail JSONB DEFAULT '[]'::jsonb,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_order_conferences_order_id ON public.order_conferences(order_id);
CREATE INDEX IF NOT EXISTS idx_order_conferences_date ON public.order_conferences(conference_date DESC);
CREATE INDEX IF NOT EXISTS idx_order_conferences_divergences ON public.order_conferences(has_divergences);

-- RLS Policies
ALTER TABLE public.order_conferences ENABLE ROW LEVEL SECURITY;

-- Policy para leitura
CREATE POLICY "Allow read access to all users"
ON public.order_conferences FOR SELECT
USING (true);

-- Policy para inserção (apenas usuários autenticados)
CREATE POLICY "Allow insert for authenticated users"
ON public.order_conferences FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy para atualização (apenas usuários autenticados)
CREATE POLICY "Allow update for authenticated users"
ON public.order_conferences FOR UPDATE
USING (auth.role() = 'authenticated');

-- Comentários
COMMENT ON TABLE public.order_conferences IS 'Armazena conferências físicas realizadas para pedidos de pneus';
COMMENT ON COLUMN public.order_conferences.order_id IS 'Referência ao pedido conferido';
COMMENT ON COLUMN public.order_conferences.conference_date IS 'Data e hora da conferência';
COMMENT ON COLUMN public.order_conferences.total_items_expected IS 'Total de itens esperados (conforme pedido)';
COMMENT ON COLUMN public.order_conferences.total_items_scanned IS 'Total de itens lidos na conferência';
COMMENT ON COLUMN public.order_conferences.has_divergences IS 'Indica se houve divergências na conferência';
COMMENT ON COLUMN public.order_conferences.divergences IS 'Array JSON com detalhes das divergências por modelo';
COMMENT ON COLUMN public.order_conferences.items_detail IS 'Array JSON com detalhamento completo dos itens conferidos';
COMMENT ON COLUMN public.order_conferences.success_count IS 'Quantidade de itens salvos com sucesso no estoque';
COMMENT ON COLUMN public.order_conferences.error_count IS 'Quantidade de itens com erro ao salvar';
COMMENT ON COLUMN public.order_conferences.errors IS 'Array JSON com mensagens de erro detalhadas';
```

## Estrutura dos campos JSON

### `divergences` (JSONB)
```json
[
  {
    "model": "27/65-18 P1L - Pirelli Slick P Zero Dianteiro",
    "expected": 40,
    "scanned": 38,
    "difference": -2
  }
]
```

### `items_detail` (JSONB)
```json
[
  {
    "model_code": "27/65-18 P1L",
    "model_description": "Pirelli Slick P Zero Dianteiro",
    "quantity_ordered": 40,
    "quantity_scanned": 38
  }
]
```

### `errors` (JSONB)
```json
[
  "ABC123456: Modelo não encontrado",
  "XYZ789012: Modelo sem tipo"
]
```

## Como testar

Após criar a tabela, você pode testar com:

```sql
-- Verificar se a tabela foi criada
SELECT * FROM public.order_conferences;

-- Verificar policies
SELECT * FROM pg_policies WHERE tablename = 'order_conferences';
```
