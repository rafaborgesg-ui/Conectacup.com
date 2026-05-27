/**
 * PROGRAMAÇÃO DE GASES - Integração direta com Supabase
 * Solução alternativa que não depende de Edge Functions
 */

import { createClient } from './supabase/client';
import { getAccessToken } from './supabase/client';

export interface GasProgramming {
  id: string;
  pista: string;
  etapa: string;
  temporada: string;
  categoria: string;
  gas_type: string;
  quantidade: number;
  fornecedor?: string;
  data_programada?: string;
  status: 'planejado' | 'solicitado' | 'confirmado' | 'entregue' | 'cancelado';
  observacoes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/**
 * Busca programações de gases com filtros opcionais
 */
export async function getGasProgramming(filters?: {
  pista?: string;
  etapa?: string;
  temporada?: string;
}): Promise<GasProgramming[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('gas_programming')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (filters?.pista) {
    query = query.eq('pista', filters.pista);
  }
  if (filters?.etapa) {
    query = query.eq('etapa', filters.etapa);
  }
  if (filters?.temporada) {
    query = query.eq('temporada', filters.temporada);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Erro ao buscar programações:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Salva uma programação de gás (criar ou atualizar)
 */
export async function saveGasProgramming(
  programming: Omit<GasProgramming, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<GasProgramming> {
  const supabase = await createClient();
  
  // Se tem ID, é atualização
  if (programming.id) {
    const { id, ...updateData } = programming;
    
    const { data, error } = await supabase
      .from('gas_programming')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao atualizar programação:', error);
      throw error;
    }
    
    window.dispatchEvent(new Event('gas-programming-updated'));
    return data;
  }
  
  // Senão, é inserção
  // Remove o campo id se ele existir (pode vir como undefined)
  const { id, ...insertData } = programming;
  
  // Log para debug
  console.log('Inserindo programação:', insertData);
  
  const { data, error } = await supabase
    .from('gas_programming')
    .insert([insertData])
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao criar programação:', error);
    throw error;
  }
  
  console.log('Programação criada com sucesso:', data);
  window.dispatchEvent(new Event('gas-programming-updated'));
  return data;
}

/**
 * Deleta uma programação de gás
 */
export async function deleteGasProgramming(id: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('gas_programming')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao deletar programação:', error);
    throw error;
  }
  
  window.dispatchEvent(new Event('gas-programming-updated'));
}

/**
 * Busca estatísticas de programação de gases
 */
export async function getGasProgrammingStats(filters?: {
  pista?: string;
  temporada?: string;
}): Promise<{
  totalProgramado: number;
  porStatus: Record<string, number>;
  porCategoria: Record<string, number>;
  porGas: Record<string, number>;
  historicoEtapas: Array<{ etapa: string; pista: string; total: number }>;
}> {
  const supabase = await createClient();
  
  let query = supabase
    .from('gas_programming')
    .select('*');
  
  if (filters?.pista) {
    query = query.eq('pista', filters.pista);
  }
  if (filters?.temporada) {
    query = query.eq('temporada', filters.temporada);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Erro ao buscar stats:', error);
    throw error;
  }
  
  // Processar estatísticas
  const stats = {
    totalProgramado: data?.length || 0,
    porStatus: {} as Record<string, number>,
    porCategoria: {} as Record<string, number>,
    porGas: {} as Record<string, number>,
    historicoEtapas: [] as Array<{ etapa: string; pista: string; total: number }>
  };
  
  if (data) {
    data.forEach(item => {
      // Por status
      stats.porStatus[item.status] = (stats.porStatus[item.status] || 0) + 1;
      
      // Por categoria
      stats.porCategoria[item.categoria] = (stats.porCategoria[item.categoria] || 0) + 1;
      
      // Por tipo de gás
      stats.porGas[item.gas_type] = (stats.porGas[item.gas_type] || 0) + 1;
    });
    
    // Histórico por etapas
    const etapasMap = new Map<string, { etapa: string; pista: string; total: number }>();
    data.forEach(item => {
      const key = `${item.pista}-${item.etapa}`;
      if (etapasMap.has(key)) {
        etapasMap.get(key)!.total++;
      } else {
        etapasMap.set(key, {
          etapa: item.etapa,
          pista: item.pista,
          total: 1
        });
      }
    });
    stats.historicoEtapas = Array.from(etapasMap.values());
  }
  
  return stats;
}
