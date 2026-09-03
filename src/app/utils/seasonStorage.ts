import { createClient } from './supabase/client';

export interface Season {
  id: string;
  name?: string;
  year: number;
  championships: {
    preseason: {
      active: boolean;
      wildcards: number;
      slicks_per_stage: number;
      wets_per_stage: number;
    };
    sprint: {
      active: boolean;
      wildcards: number;
      slicks_per_stage: number;
      wets_per_stage: number;
    };
    endurance: {
      active: boolean;
      wildcards: number;
      endurance_300: {
        slicks_per_stage: number;
        wets_per_stage: number;
      };
      endurance_500: {
        slicks_per_stage: number;
        wets_per_stage: number;
      };
    };
    trophy: {
      active: boolean;
      wildcards: number;
      slicks_per_stage: number;
      wets_per_stage: number;
    };
  };
  status?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface SeasonStage {
  id: string;
  season_id: string;
  name: string;
  track: string;
  start_date: string;
  end_date: string;
  main_championship: string;
  endurance_type?: 'endurance_300' | 'endurance_500'; // Tipo de endurance (300km ou 500km)
  include_trophy: boolean;
  categories?: Array<{ name: string; car_count: number } | string>; // Categorias que participam da etapa (pode ser objeto com car_count ou string legacy)
  created_at?: string;
  updated_at?: string;
}

/**
 * Busca todas as temporadas
 */
export async function getSeasons(): Promise<Season[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('year', { ascending: false });

  if (error) {
    console.error('Erro ao buscar temporadas:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca uma temporada por ID
 */
export async function getSeasonById(id: string): Promise<Season | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar temporada:', error);
    throw error;
  }

  return data;
}

/**
 * Busca etapas de uma temporada
 */
export async function getSeasonStages(seasonId: string): Promise<SeasonStage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('season_stages')
    .select('*')
    .eq('season_id', seasonId)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Erro ao buscar etapas da temporada:', error);
    throw error;
  }

  return data || [];
}

/**
 * Cria uma nova temporada com suas etapas
 */
export async function createSeason(seasonData: Omit<Season, 'id' | 'created_at' | 'updated_at'>, stages: Omit<SeasonStage, 'id' | 'season_id' | 'created_at' | 'updated_at'>[]): Promise<Season> {
  const supabase = createClient();
  
  // Pega o usuário atual
  const { data: { user } } = await supabase.auth.getUser();

  // Cria a temporada
  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .insert([{
      ...seasonData,
      created_by: user?.id,
      updated_by: user?.id
    }])
    .select()
    .single();

  if (seasonError) {
    console.error('Erro ao criar temporada:', seasonError);
    throw seasonError;
  }

  // Cria as etapas
  if (stages.length > 0) {
    const stagesWithSeasonId = stages.map(stage => ({
      ...stage,
      season_id: season.id
    }));

    const { error: stagesError } = await supabase
      .from('season_stages')
      .insert(stagesWithSeasonId);

    if (stagesError) {
      console.error('Erro ao criar etapas:', stagesError);
      throw stagesError;
    }
  }

  return season;
}

/**
 * Atualiza uma temporada existente
 */
export async function updateSeason(id: string, seasonData: Partial<Omit<Season, 'id' | 'created_at' | 'updated_at' | 'created_by'>>): Promise<Season> {
  const supabase = createClient();
  
  // Pega o usuário atual
  const { data: { user } } = await supabase.auth.getUser();

  const updateData: any = {
    ...seasonData,
    updated_by: user?.id
  };

  const { data, error } = await supabase
    .from('seasons')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar temporada:', error);
    throw error;
  }

  return data;
}

/**
 * Atualiza as etapas de uma temporada (deleta antigas e cria novas)
 */
export async function updateSeasonStages(seasonId: string, stages: Omit<SeasonStage, 'id' | 'season_id' | 'created_at' | 'updated_at'>[]): Promise<void> {
  const supabase = createClient();
  
  // Deleta todas as etapas antigas
  const { error: deleteError } = await supabase
    .from('season_stages')
    .delete()
    .eq('season_id', seasonId);

  if (deleteError) {
    console.error('Erro ao deletar etapas antigas:', deleteError);
    throw deleteError;
  }

  // Cria as novas etapas
  if (stages.length > 0) {
    const stagesWithSeasonId = stages.map(stage => ({
      ...stage,
      season_id: seasonId
    }));

    const { error: insertError } = await supabase
      .from('season_stages')
      .insert(stagesWithSeasonId);

    if (insertError) {
      console.error('Erro ao criar novas etapas:', insertError);
      throw insertError;
    }
  }
}

/**
 * Deleta uma temporada e suas etapas
 */
export async function deleteSeason(id: string): Promise<void> {
  const supabase = createClient();
  
  // Deleta as etapas primeiro (cascade deve fazer isso automaticamente, mas garantimos)
  await supabase
    .from('season_stages')
    .delete()
    .eq('season_id', id);

  // Deleta a temporada
  const { error } = await supabase
    .from('seasons')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar temporada:', error);
    throw error;
  }
}

/**
 * Verifica se já existe uma temporada para o ano
 */
export async function checkDuplicateSeason(year: number, excludeId?: string): Promise<boolean> {
  const supabase = createClient();
  
  let query = supabase
    .from('seasons')
    .select('id')
    .eq('year', year);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao verificar duplicação de temporada:', error);
    throw error;
  }

  return (data?.length || 0) > 0;
}

/**
 * Ativa uma temporada e desativa todas as outras
 */
export async function toggleSeasonStatus(seasonId: string, newStatus: 'active' | 'inactive'): Promise<void> {
  const supabase = createClient();

  // Se estamos ativando uma temporada, primeiro desativamos todas as outras
  if (newStatus === 'active') {
    const { error: deactivateError } = await supabase
      .from('seasons')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .neq('id', seasonId);

    if (deactivateError) {
      console.error('Erro ao desativar outras temporadas:', deactivateError);
      throw deactivateError;
    }
  }

  // Atualiza o status da temporada selecionada
  const { error } = await supabase
    .from('seasons')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', seasonId);

  if (error) {
    console.error('Erro ao atualizar status da temporada:', error);
    throw error;
  }
}