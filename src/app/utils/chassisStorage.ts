/**
 * Utilitários para gerenciar chassis no Supabase
 * Tabela: chassis
 */

import { createClient } from './supabase/client';

export interface Chassis {
  id: string;
  codigo: string; // Ex: '#1', '#2', '#99'
  geracao?: string; // Ex: '991/I', '991/II', '992'
  ativo: boolean;
  ordem?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Busca todos os chassis
 */
export async function getChassis(): Promise<Chassis[]> {
  try {
    console.log('🔍 Buscando chassis do Supabase...');
    
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('chassis')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    
    if (error) {
      console.error('❌ Erro ao buscar chassis:', error);
      throw error;
    }
    
    console.log(`✅ ${data?.length || 0} chassis encontrados`);
    
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar chassis:', error);
    throw error;
  }
}

/**
 * Busca chassis por código
 */
export async function getChassisByCodigo(codigo: string): Promise<Chassis | null> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('chassis')
      .select('*')
      .eq('codigo', codigo)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Não encontrado
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Erro ao buscar chassis por código:', error);
    throw error;
  }
}

/**
 * Cria um novo chassis
 */
export async function createChassis(chassis: Omit<Chassis, 'id' | 'created_at' | 'updated_at'>): Promise<Chassis> {
  try {
    console.log('➕ Criando novo chassis:', chassis.codigo);
    
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('chassis')
      .insert([{
        codigo: chassis.codigo,
        geracao: chassis.geracao,
        ativo: chassis.ativo ?? true,
        ordem: chassis.ordem,
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar chassis:', error);
      throw error;
    }
    
    console.log('✅ Chassis criado com sucesso');
    return data;
  } catch (error) {
    console.error('❌ Erro ao criar chassis:', error);
    throw error;
  }
}

/**
 * Atualiza um chassis existente
 */
export async function updateChassis(id: string, updates: Partial<Omit<Chassis, 'id' | 'created_at' | 'updated_at'>>): Promise<Chassis> {
  try {
    console.log('✏️ Atualizando chassis:', id);
    
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('chassis')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao atualizar chassis:', error);
      throw error;
    }
    
    console.log('✅ Chassis atualizado com sucesso');
    return data;
  } catch (error) {
    console.error('❌ Erro ao atualizar chassis:', error);
    throw error;
  }
}

/**
 * Deleta um chassis (soft delete - marca como inativo)
 */
export async function deleteChassis(id: string): Promise<void> {
  try {
    console.log('🗑️ Deletando chassis:', id);
    
    const supabase = createClient();
    
    // Soft delete - marca como inativo
    const { error } = await supabase
      .from('chassis')
      .update({ ativo: false })
      .eq('id', id);
    
    if (error) {
      console.error('❌ Erro ao deletar chassis:', error);
      throw error;
    }
    
    console.log('✅ Chassis deletado com sucesso (marcado como inativo)');
  } catch (error) {
    console.error('❌ Erro ao deletar chassis:', error);
    throw error;
  }
}

/**
 * Deleta um chassis permanentemente (hard delete)
 */
export async function hardDeleteChassis(id: string): Promise<void> {
  try {
    console.log('⚠️ HARD DELETE - Deletando chassis permanentemente:', id);
    
    const supabase = createClient();
    
    const { error } = await supabase
      .from('chassis')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ Erro ao deletar chassis permanentemente:', error);
      throw error;
    }
    
    console.log('✅ Chassis deletado permanentemente');
  } catch (error) {
    console.error('❌ Erro ao deletar chassis permanentemente:', error);
    throw error;
  }
}

/**
 * Busca gerações disponíveis
 */
export async function getGeracoes(): Promise<string[]> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('chassis')
      .select('geracao')
      .not('geracao', 'is', null)
      .eq('ativo', true);
    
    if (error) {
      console.error('❌ Erro ao buscar gerações:', error);
      throw error;
    }
    
    // Remove duplicatas e valores nulos
    const geracoes = [...new Set(data.map(item => item.geracao).filter(Boolean))] as string[];
    
    return geracoes.sort();
  } catch (error) {
    console.error('❌ Erro ao buscar gerações:', error);
    throw error;
  }
}

/**
 * Busca chassis por geração
 */
export async function getChassisByGeracao(geracao: string): Promise<Chassis[]> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('chassis')
      .select('*')
      .eq('geracao', geracao)
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    
    if (error) {
      console.error('❌ Erro ao buscar chassis por geração:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar chassis por geração:', error);
    throw error;
  }
}

/**
 * Reordena chassis
 */
export async function reorderChassis(reorderedChassis: { id: string; ordem: number }[]): Promise<void> {
  try {
    console.log('🔄 Reordenando chassis...');
    
    const supabase = createClient();
    
    // Atualiza ordem de cada chassis
    const updates = reorderedChassis.map(({ id, ordem }) =>
      supabase
        .from('chassis')
        .update({ ordem })
        .eq('id', id)
    );
    
    await Promise.all(updates);
    
    console.log('✅ Chassis reordenados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao reordenar chassis:', error);
    throw error;
  }
}
