-- Adiciona campos para registrar pedidos de pneus na tabela demand_calculations
-- Execute este SQL no Supabase SQL Editor

-- Adiciona coluna para armazenar as quantidades pedidas por modelo
ALTER TABLE demand_calculations 
ADD COLUMN IF NOT EXISTS ordered_tires JSONB DEFAULT '[]'::jsonb;

-- Adiciona coluna para o nome do pedido
ALTER TABLE demand_calculations 
ADD COLUMN IF NOT EXISTS order_name TEXT;

-- Adiciona coluna para o ID do pedido (referência)
ALTER TABLE demand_calculations 
ADD COLUMN IF NOT EXISTS order_id UUID;

-- Adiciona coluna para a data do pedido
ALTER TABLE demand_calculations 
ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ;

-- Adiciona comentários para documentação
COMMENT ON COLUMN demand_calculations.ordered_tires IS 'Array de objetos {model: string, qty: number} com as quantidades pedidas por modelo';
COMMENT ON COLUMN demand_calculations.order_name IS 'Nome do pedido de pneus associado a esta etapa';
COMMENT ON COLUMN demand_calculations.order_id IS 'ID do pedido na tabela tire_orders';
COMMENT ON COLUMN demand_calculations.order_date IS 'Data em que o pedido foi criado/enviado';

-- Adiciona índice para melhorar performance de consultas por order_id
CREATE INDEX IF NOT EXISTS idx_demand_calculations_order_id ON demand_calculations(order_id);
