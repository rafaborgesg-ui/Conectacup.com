/**
 * Utilitários para gerenciar gerações de carros no Supabase
 * Tabela: geracao
 */

import { createClient } from './supabase/client';

export interface Geracao {
  id: string;
  codigo: string; // Ex: '991/I', '991/II', '992'
  descricao?: string;
  ativo: boolean;
  ordem?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Busca todas as gerações
 */
export async function getGeracoes(): Promise<Geracao[]> {
  try {
    console.log('🔍 Buscando gerações do Supabase...');
    
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('geracao')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    
    if (error) {
      console.error('❌ Erro ao buscar gerações:', error);
      throw error;
    }
    
    console.log(`✅ ${data?.length || 0} gerações encontradas`);
    
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar gerações:', error);
    throw error;
  }
}

/**
 * Busca geração por código
 */
export async function getGeracaoByCodigo(codigo: string): Promise<Geracao | null> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('geracao')
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
    console.error('❌ Erro ao buscar geração por código:', error);
    throw error;
  }
}

/**
 * Cria uma nova geração
 */
export async function createGeracao(geracao: Omit<Geracao, 'id' | 'created_at' | 'updated_at'>): Promise<Geracao> {
  try {
    console.log('➕ Criando nova geração:', geracao.codigo);
    
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('geracao')
      .insert([{
        codigo: geracao.codigo,
        descricao: geracao.descricao,
        ativo: geracao.ativo ?? true,
        ordem: geracao.ordem,
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar geração:', error);
      throw error;
    }
    
    console.log('✅ Geração criada com sucesso');
    return data;
  } catch (error) {
    console.error('❌ Erro ao criar geração:', error);
    throw error;
  }
}

/**
 * Atualiza uma geração existente
 */
export async function updateGeracao(id: string, updates: Partial<Omit<Geracao, 'id' | 'created_at' | 'updated_at'>>): Promise<Geracao> {
  try {
    console.log('✏️ Atualizando geração:', id);
    
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('geracao')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao atualizar geração:', error);
      throw error;
    }
    
    console.log('✅ Geração atualizada com sucesso');
    return data;
  } catch (error) {
    console.error('❌ Erro ao atualizar geração:', error);
    throw error;
  }
}

/**
 * Deleta uma geração (soft delete - marca como inativo)
 */
export async function deleteGeracao(id: string): Promise<void> {
  try {
    console.log('🗑️ Deletando geração:', id);
    
    const supabase = createClient();
    
    // Soft delete - marca como inativo
    const { error } = await supabase
      .from('geracao')
      .update({ ativo: false })
      .eq('id', id);
    
    if (error) {
      console.error('❌ Erro ao deletar geração:', error);
      throw error;
    }
    
    console.log('✅ Geração deletada com sucesso (marcada como inativa)');
  } catch (error) {
    console.error('❌ Erro ao deletar geração:', error);
    throw error;
  }
}

/**
 * Deleta uma geração permanentemente (hard delete)
 */
export async function hardDeleteGeracao(id: string): Promise<void> {
  try {
    console.log('⚠️ HARD DELETE - Deletando geração permanentemente:', id);
    
    const supabase = createClient();
    
    const { error } = await supabase
      .from('geracao')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ Erro ao deletar geração permanentemente:', error);
      throw error;
    }
    
    console.log('✅ Geração deletada permanentemente');
  } catch (error) {
    console.error('❌ Erro ao deletar geração permanentemente:', error);
    throw error;
  }
}

/**
 * Reordena gerações
 */
export async function reorderGeracoes(reorderedGeracoes: { id: string; ordem: number }[]): Promise<void> {
  try {
    console.log('🔄 Reordenando gerações...');
    
    const supabase = createClient();
    
    // Atualiza ordem de cada geração
    const updates = reorderedGeracoes.map(({ id, ordem }) =>
      supabase
        .from('geracao')
        .update({ ordem })
        .eq('id', id)
    );
    
    await Promise.all(updates);
    
    console.log('✅ Gerações reordenadas com sucesso');
  } catch (error) {
    console.error('❌ Erro ao reordenar gerações:', error);
    throw error;
  }
}
