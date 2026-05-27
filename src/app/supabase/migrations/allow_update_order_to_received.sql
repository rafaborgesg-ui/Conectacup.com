-- Migration: Allow users to update order status to 'received'
-- Created: 2026-04-29
-- Description: Adds RLS policy to allow authenticated users to update order status to 'received' after physical conference

-- Drop existing restrictive update policy if it exists
DROP POLICY IF EXISTS "Criador pode editar pedidos draft" ON tire_orders;

-- Recreate the draft editing policy (same as before)
CREATE POLICY "Criador pode editar pedidos draft"
  ON tire_orders FOR UPDATE
  TO authenticated
  USING (status = 'draft' AND created_by = auth.uid())
  WITH CHECK (status = 'draft' AND created_by = auth.uid());

-- Add new policy: Allow any authenticated user to update status to 'received'
-- This is needed for physical conference workflow where any user can mark an order as received
CREATE POLICY "Usuários podem marcar pedidos como recebidos"
  ON tire_orders FOR UPDATE
  TO authenticated
  USING (status IN ('sent', 'approved'))
  WITH CHECK (status = 'received');

-- Comment explaining the policies
COMMENT ON TABLE tire_orders IS 'Pedidos de pneus com RLS: criadores podem editar drafts, todos podem marcar como recebido após conferência física';
