/**
 * Handlers para Operações Offline
 * 
 * Define como cada tipo de operação deve ser processada
 * quando a conexão for restabelecida.
 */

import { offlineQueue } from './offlineQueue';
import { createClient } from './supabase/client';
import type { StockEntry } from './storage';

/**
 * Registra todos os handlers de operações offline
 * Deve ser chamado uma vez na inicialização do app
 */
export function registerOfflineHandlers() {
  // Handler para salvar entrada de estoque
  offlineQueue.registerHandler('stock-entry', async (data: StockEntry) => {
    console.log('🔄 [Offline Queue] Processando entrada de estoque:', data.barcode);
    
    const supabase = createClient();
    
    const { error } = await supabase
      .from('stock_entries')
      .insert([data]);
    
    if (error) {
      // Se for duplicata, não é erro fatal
      if (error.message?.includes('duplicate') || 
          error.message?.includes('already exists') ||
          error.message?.includes('duplicado')) {
        console.warn('⚠️ [Offline Queue] Código já existe (ignorando):', data.barcode);
        return; // Considera sucesso para remover da queue
      }
      
      throw new Error(error.message);
    }
    
    console.log('✅ [Offline Queue] Entrada salva com sucesso:', data.barcode);
    
    // Dispara evento para atualizar interface
    window.dispatchEvent(new Event('stock-entries-updated'));
  });

  // Handler para deletar entrada de estoque
  offlineQueue.registerHandler('stock-delete', async (data: { barcode: string }) => {
    console.log('🔄 [Offline Queue] Processando exclusão:', data.barcode);
    
    const supabase = createClient();
    
    const { error } = await supabase
      .from('stock_entries')
      .delete()
      .eq('barcode', data.barcode);
    
    if (error) {
      throw new Error(error.message);
    }
    
    console.log('✅ [Offline Queue] Entrada deletada com sucesso:', data.barcode);
    window.dispatchEvent(new Event('stock-entries-updated'));
  });

  // Handler para atualizar entrada de estoque
  offlineQueue.registerHandler('stock-update', async (data: { barcode: string; updates: Partial<StockEntry> }) => {
    console.log('🔄 [Offline Queue] Processando atualização:', data.barcode);
    
    const supabase = createClient();
    
    const { error } = await supabase
      .from('stock_entries')
      .update(data.updates)
      .eq('barcode', data.barcode);
    
    if (error) {
      throw new Error(error.message);
    }
    
    console.log('✅ [Offline Queue] Entrada atualizada com sucesso:', data.barcode);
    window.dispatchEvent(new Event('stock-entries-updated'));
  });

  console.log('✅ Handlers offline registrados');
}
