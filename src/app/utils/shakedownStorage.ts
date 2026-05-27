import { createClient } from './supabase/client';
import type { ChassisCheckData } from './tireCheckSupabase';

export interface ShakedownList {
  id: string;
  season_name: string;
  stage_name: string;
  check_date: string;
  min_voltas: number;
  max_voltas: number;
  chassis_data: ChassisCheckData[];
  created_at: string;
  created_by: string;
}

/**
 * Cria uma nova lista de Shakedown
 */
export async function createShakedownList(
  seasonName: string,
  stageName: string,
  checkDate: string,
  minVoltas: number,
  maxVoltas: number,
  chassisData: ChassisCheckData[]
): Promise<ShakedownList | null> {
  try {
    const supabase = createClient();
    
    // Busca o usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('shakedown_lists')
      .insert([
        {
          season_name: seasonName,
          stage_name: stageName,
          check_date: checkDate,
          min_voltas: minVoltas,
          max_voltas: maxVoltas,
          chassis_data: chassisData,
          created_by: user.email || 'unknown'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar lista de Shakedown:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar lista de Shakedown:', error);
    return null;
  }
}

/**
 * Busca todas as listas de Shakedown (ordenadas por data de criação decrescente)
 */
export async function getShakedownLists(): Promise<ShakedownList[]> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('shakedown_lists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar listas de Shakedown:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar listas de Shakedown:', error);
    return [];
  }
}

/**
 * Busca uma lista de Shakedown específica por ID
 */
export async function getShakedownListById(id: string): Promise<ShakedownList | null> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('shakedown_lists')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar lista de Shakedown:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar lista de Shakedown:', error);
    return null;
  }
}

/**
 * Atualiza uma lista de Shakedown existente
 */
export async function updateShakedownList(
  id: string,
  minVoltas: number,
  maxVoltas: number,
  chassisData: ChassisCheckData[]
): Promise<ShakedownList | null> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('shakedown_lists')
      .update({
        min_voltas: minVoltas,
        max_voltas: maxVoltas,
        chassis_data: chassisData
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar lista de Shakedown:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao atualizar lista de Shakedown:', error);
    return null;
  }
}

/**
 * Atualiza apenas os estados de acompanhamento (inversão completa e segundo jogo)
 */
export async function updateShakedownTracking(
  id: string,
  chassisData: ChassisCheckData[]
): Promise<ShakedownList | null> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('shakedown_lists')
      .update({
        chassis_data: chassisData
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar acompanhamento de Shakedown:', error);
      throw error;
    }

    console.log('✅ Acompanhamento de Shakedown atualizado com sucesso');
    return data;
  } catch (error) {
    console.error('Erro ao atualizar acompanhamento de Shakedown:', error);
    return null;
  }
}

/**
 * Deleta uma lista de Shakedown
 */
export async function deleteShakedownList(id: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('shakedown_lists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar lista de Shakedown:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao deletar lista de Shakedown:', error);
    return false;
  }
}

/**
 * Agrupa listas de Shakedown por temporada e etapa
 */
export function groupShakedownListsBySeasonAndStage(lists: ShakedownList[]): Record<string, Record<string, ShakedownList[]>> {
  const grouped: Record<string, Record<string, ShakedownList[]>> = {};

  lists.forEach(list => {
    if (!grouped[list.season_name]) {
      grouped[list.season_name] = {};
    }
    if (!grouped[list.season_name][list.stage_name]) {
      grouped[list.season_name][list.stage_name] = [];
    }
    grouped[list.season_name][list.stage_name].push(list);
  });

  return grouped;
}