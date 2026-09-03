-- Tabela de Pedidos de Pneus
CREATE TABLE IF NOT EXISTS tire_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id),
  season_name TEXT NOT NULL,
  order_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'approved', 'received')),
  total_items INTEGER NOT NULL DEFAULT 0,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  total_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  selected_stages TEXT[] DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS tire_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES tire_orders(id) ON DELETE CASCADE,
  model_code TEXT NOT NULL,
  model_description TEXT NOT NULL,
  quantity_needed INTEGER NOT NULL DEFAULT 0,
  quantity_ordered INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tire_orders_season_id ON tire_orders(season_id);
CREATE INDEX IF NOT EXISTS idx_tire_orders_created_by ON tire_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_tire_orders_status ON tire_orders(status);
CREATE INDEX IF NOT EXISTS idx_tire_orders_created_at ON tire_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tire_order_items_order_id ON tire_order_items(order_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tire_orders_updated_at BEFORE UPDATE ON tire_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tire_order_items_updated_at BEFORE UPDATE ON tire_order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE tire_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tire_order_items ENABLE ROW LEVEL SECURITY;

-- Política: Todos os usuários autenticados podem ver todos os pedidos
CREATE POLICY "Usuários autenticados podem ver pedidos"
  ON tire_orders FOR SELECT
  TO authenticated
  USING (true);

-- Política: Todos os usuários autenticados podem criar pedidos
CREATE POLICY "Usuários autenticados podem criar pedidos"
  ON tire_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Apenas o criador pode editar pedidos em draft
CREATE POLICY "Criador pode editar pedidos draft"
  ON tire_orders FOR UPDATE
  TO authenticated
  USING (status = 'draft' AND created_by = auth.uid());

-- Política: Todos os usuários autenticados podem ver itens de pedidos
CREATE POLICY "Usuários autenticados podem ver itens"
  ON tire_order_items FOR SELECT
  TO authenticated
  USING (true);

-- Política: Todos os usuários autenticados podem criar itens
CREATE POLICY "Usuários autenticados podem criar itens"
  ON tire_order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Apenas o criador pode editar itens de pedidos em draft
CREATE POLICY "Criador pode editar itens draft"
  ON tire_order_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tire_orders
    WHERE tire_orders.id = tire_order_items.order_id
    AND tire_orders.status = 'draft'
    AND tire_orders.created_by = auth.uid()
  ));

-- Política: Apenas o criador pode deletar itens de pedidos em draft
CREATE POLICY "Criador pode deletar itens draft"
  ON tire_order_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tire_orders
    WHERE tire_orders.id = tire_order_items.order_id
    AND tire_orders.status = 'draft'
    AND tire_orders.created_by = auth.uid()
  ));
