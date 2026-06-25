-- Fix RLS: allow creator to change order status from draft to sent/approved
-- The old policy blocked status changes because WITH CHECK required status = 'draft'
-- Execute in Supabase SQL Editor

DROP POLICY IF EXISTS "Criador pode editar pedidos draft" ON tire_orders;

CREATE POLICY "Criador pode gerenciar seus pedidos"
  ON tire_orders FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid() AND status IN ('draft', 'sent', 'approved'));

-- Keep the received policy intact
-- "Usuários podem marcar pedidos como recebidos" remains unchanged
