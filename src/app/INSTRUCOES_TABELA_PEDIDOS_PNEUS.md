# 📋 Instruções: Criar Tabela tire_orders

## 🎯 Objetivo
Criar a tabela `tire_orders` e `tire_order_items` no Supabase para armazenar os pedidos de pneus.

## 📝 Script SQL

Execute este script no **SQL Editor** do Supabase:

```sql
-- ========================================
-- TABELA: tire_orders
-- Descrição: Armazena os pedidos de pneus
-- ========================================

CREATE TABLE IF NOT EXISTS tire_orders (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  
  -- Informações do pedido
  order_number VARCHAR(50) UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'received', 'cancelled')),
  
  -- Totais
  total_items INTEGER NOT NULL DEFAULT 0,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  total_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Observações
  notes TEXT,
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- TABELA: tire_order_items
-- Descrição: Itens dos pedidos de pneus
-- ========================================

CREATE TABLE IF NOT EXISTS tire_order_items (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES tire_orders(id) ON DELETE CASCADE,
  
  -- Informações do item
  model_code VARCHAR(50) NOT NULL,
  model_description VARCHAR(255),
  
  -- Quantidades
  quantity_needed INTEGER NOT NULL DEFAULT 0,
  quantity_ordered INTEGER NOT NULL DEFAULT 0,
  quantity_received INTEGER DEFAULT 0,
  
  -- Valores
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Observações
  notes TEXT,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ÍNDICES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_tire_orders_season_id ON tire_orders(season_id);
CREATE INDEX IF NOT EXISTS idx_tire_orders_status ON tire_orders(status);
CREATE INDEX IF NOT EXISTS idx_tire_orders_created_by ON tire_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_tire_orders_created_at ON tire_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tire_order_items_order_id ON tire_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tire_order_items_model_code ON tire_order_items(model_code);

-- ========================================
-- TRIGGERS
-- ========================================

-- Trigger para atualizar updated_at automaticamente (tire_orders)
CREATE OR REPLACE FUNCTION update_tire_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tire_orders_updated_at
BEFORE UPDATE ON tire_orders
FOR EACH ROW
EXECUTE FUNCTION update_tire_orders_updated_at();

-- Trigger para atualizar updated_at automaticamente (tire_order_items)
CREATE OR REPLACE FUNCTION update_tire_order_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tire_order_items_updated_at
BEFORE UPDATE ON tire_order_items
FOR EACH ROW
EXECUTE FUNCTION update_tire_order_items_updated_at();

-- Trigger para gerar order_number automaticamente
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number = 'PED-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('tire_orders_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence para order_number
CREATE SEQUENCE IF NOT EXISTS tire_orders_seq START 1;

CREATE TRIGGER trigger_generate_order_number
BEFORE INSERT ON tire_orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();

-- ========================================
-- RLS (Row Level Security)
-- ========================================

ALTER TABLE tire_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tire_order_items ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ver seus próprios pedidos
CREATE POLICY "Users can view their own orders"
ON tire_orders FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Policy: Todos podem criar pedidos
CREATE POLICY "Users can create orders"
ON tire_orders FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Policy: Todos podem atualizar seus próprios pedidos (apenas drafts)
CREATE POLICY "Users can update their draft orders"
ON tire_orders FOR UPDATE
TO authenticated
USING (created_by = auth.uid() AND status = 'draft')
WITH CHECK (created_by = auth.uid());

-- Policy: Todos podem deletar seus próprios pedidos (apenas drafts)
CREATE POLICY "Users can delete their draft orders"
ON tire_orders FOR DELETE
TO authenticated
USING (created_by = auth.uid() AND status = 'draft');

-- Policy: Todos podem ver itens dos pedidos que têm acesso
CREATE POLICY "Users can view order items"
ON tire_order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tire_orders
    WHERE tire_orders.id = tire_order_items.order_id
    AND tire_orders.created_by = auth.uid()
  )
);

-- Policy: Todos podem criar itens em seus pedidos
CREATE POLICY "Users can create order items"
ON tire_order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tire_orders
    WHERE tire_orders.id = tire_order_items.order_id
    AND tire_orders.created_by = auth.uid()
  )
);

-- Policy: Todos podem atualizar itens de pedidos draft
CREATE POLICY "Users can update draft order items"
ON tire_order_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tire_orders
    WHERE tire_orders.id = tire_order_items.order_id
    AND tire_orders.created_by = auth.uid()
    AND tire_orders.status = 'draft'
  )
);

-- Policy: Todos podem deletar itens de pedidos draft
CREATE POLICY "Users can delete draft order items"
ON tire_order_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tire_orders
    WHERE tire_orders.id = tire_order_items.order_id
    AND tire_orders.created_by = auth.uid()
    AND tire_orders.status = 'draft'
  )
);

-- ========================================
-- COMENTÁRIOS
-- ========================================

COMMENT ON TABLE tire_orders IS 'Armazena pedidos de pneus baseados na análise de demanda';
COMMENT ON TABLE tire_order_items IS 'Itens dos pedidos de pneus';

COMMENT ON COLUMN tire_orders.order_number IS 'Número do pedido (gerado automaticamente)';
COMMENT ON COLUMN tire_orders.status IS 'Status do pedido: draft, sent, approved, received, cancelled';
COMMENT ON COLUMN tire_orders.total_items IS 'Total de itens no pedido';
COMMENT ON COLUMN tire_orders.total_quantity IS 'Quantidade total de pneus';
COMMENT ON COLUMN tire_orders.total_value IS 'Valor total do pedido';

COMMENT ON COLUMN tire_order_items.quantity_needed IS 'Quantidade necessária (da análise de demanda)';
COMMENT ON COLUMN tire_order_items.quantity_ordered IS 'Quantidade efetivamente pedida';
COMMENT ON COLUMN tire_order_items.quantity_received IS 'Quantidade recebida';
```

## ✅ Verificação

Execute esta query para confirmar:

```sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('tire_orders', 'tire_order_items')
  AND table_schema = 'public';
```

Deve retornar 2 linhas:
- `tire_orders` com ~14 colunas
- `tire_order_items` com ~11 colunas

## 🎨 Estrutura das Tabelas

### tire_orders
```
├── id (UUID, PK)
├── season_id (UUID, FK → seasons)
├── order_number (VARCHAR, UNIQUE, auto-gerado)
├── status (VARCHAR: draft, sent, approved, received, cancelled)
├── total_items (INTEGER)
├── total_quantity (INTEGER)
├── total_value (DECIMAL)
├── notes (TEXT)
├── created_by (UUID, FK → auth.users)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
├── sent_at (TIMESTAMP)
├── approved_at (TIMESTAMP)
└── received_at (TIMESTAMP)
```

### tire_order_items
```
├── id (UUID, PK)
├── order_id (UUID, FK → tire_orders)
├── model_code (VARCHAR)
├── model_description (VARCHAR)
├── quantity_needed (INTEGER)
├── quantity_ordered (INTEGER)
├── quantity_received (INTEGER)
├── unit_price (DECIMAL)
├── total_price (DECIMAL)
├── notes (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## 🔐 Segurança (RLS)

- ✅ Usuários podem ver apenas seus próprios pedidos
- ✅ Usuários podem criar pedidos
- ✅ Usuários podem editar apenas pedidos em status "draft"
- ✅ Usuários podem deletar apenas pedidos em status "draft"
- ✅ Administradores terão acesso total (via políticas adicionais)

## 📊 Funcionalidades Implementadas

### Status do Pedido
1. **draft** - Rascunho, ainda pode ser editado
2. **sent** - Enviado para aprovação
3. **approved** - Aprovado
4. **received** - Recebido no estoque
5. **cancelled** - Cancelado

### Numeração Automática
- Formato: `PED-2025-00001`
- Ano atual + sequência numérica

### Integração com Demanda
- Usa dados da tabela `demand_calculations`
- Calcula automaticamente a necessidade baseado em:
  - Estoque atual (`stock_entries`)
  - Demanda total da temporada
  - Flag `exclude_wet_tires`

## 🎯 Próximos Passos

Após criar as tabelas:
1. A página já está funcional em: **Administração > Em Desenvolvimento > Jamyli > Pedidos de Pneus**
2. Teste criar um pedido baseado em uma temporada
3. Implemente o envio de email ao enviar pedido
4. Adicione relatórios de pedidos
