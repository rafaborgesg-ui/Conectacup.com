/**
 * 🏁 SEASON CATEGORIES - Integração com Supabase
 * 
 * Este módulo gerencia as configurações de categorias de temporada,
 * armazenando informações sobre modelos de carro e pneus associados.
 * 
 * TABELA: season_categories
 * MIGRATION: create_season_categories.sql
 * 
 * ✅ 100% integrado com Supabase
 * ✅ Sem cache, sem localStorage
 * ✅ Row Level Security habilitado
 */

import { createClient } from './supabase/client';

/**
 * Interface que representa uma categoria de temporada
 */
export interface SeasonCategory {
  id: string;
  category_name: string;
  car_model: string;
  category_type: 'geral' | 'trophy';
  slick_tires: string[];
  wet_tires: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Dados para criar/atualizar uma categoria
 */
export interface SeasonCategoryInput {
  category_name: string;
  car_model: string;
  category_type: 'geral' | 'trophy';
  slick_tires: string[];
  wet_tires: string[];
}

/**
 * Busca todas as categorias de temporada
 * @returns Array de categorias ordenadas por data de criação
 */
export async function fetchSeasonCategories(): Promise<SeasonCategory[]> {
  const supabase = createClient();

  console.log('🚀 [SEASON CATEGORIES] Buscando todas as categorias...');

  const { data, error } = await supabase
    .from('season_categories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar categorias:', error);
    throw new Error(`Erro ao buscar categorias: ${error.message}`);
  }

  console.log(`✅ ${data?.length || 0} categorias encontradas`);
  return data || [];
}

/**
 * Busca uma categoria específica por ID
 * @param id - UUID da categoria
 * @returns Categoria encontrada ou null
 */
export async function fetchSeasonCategoryById(id: string): Promise<SeasonCategory | null> {
  const supabase = createClient();

  console.log(`🔍 [SEASON CATEGORIES] Buscando categoria ${id}...`);

  const { data, error } = await supabase
    .from('season_categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.warn('⚠️ Categoria não encontrada');
      return null;
    }
    console.error('❌ Erro ao buscar categoria:', error);
    throw new Error(`Erro ao buscar categoria: ${error.message}`);
  }

  console.log('✅ Categoria encontrada:', data.category_name);
  return data;
}

/**
 * Cria uma nova categoria de temporada
 * @param input - Dados da categoria
 * @returns Categoria criada
 */
export async function createSeasonCategory(input: SeasonCategoryInput): Promise<SeasonCategory> {
  const supabase = createClient();

  console.log('➕ [SEASON CATEGORIES] Criando nova categoria:', input.category_name);

  // Validação
  if (!input.category_name || !input.car_model) {
    throw new Error('Nome da categoria e modelo do carro são obrigatórios');
  }

  if (input.slick_tires.length !== 2) {
    throw new Error('É necessário selecionar exatamente 2 pneus SLICK');
  }

  if (input.wet_tires.length !== 2) {
    throw new Error('É necessário selecionar exatamente 2 pneus WET');
  }

  const { data, error } = await supabase
    .from('season_categories')
    .insert([{
      category_name: input.category_name,
      car_model: input.car_model,
      category_type: input.category_type,
      slick_tires: input.slick_tires,
      wet_tires: input.wet_tires,
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao criar categoria:', error);
    throw new Error(`Erro ao criar categoria: ${error.message}`);
  }

  console.log('✅ Categoria criada com sucesso:', data.id);
  return data;
}

/**
 * Atualiza uma categoria existente
 * @param id - UUID da categoria
 * @param input - Dados atualizados
 * @returns Categoria atualizada
 */
export async function updateSeasonCategory(
  id: string,
  input: SeasonCategoryInput
): Promise<SeasonCategory> {
  const supabase = createClient();

  console.log(`📝 [SEASON CATEGORIES] Atualizando categoria ${id}...`);

  // Validação
  if (!input.category_name || !input.car_model) {
    throw new Error('Nome da categoria e modelo do carro são obrigatórios');
  }

  if (input.slick_tires.length !== 2) {
    throw new Error('É necessário selecionar exatamente 2 pneus SLICK');
  }

  if (input.wet_tires.length !== 2) {
    throw new Error('É necessário selecionar exatamente 2 pneus WET');
  }

  const { data, error } = await supabase
    .from('season_categories')
    .update({
      category_name: input.category_name,
      car_model: input.car_model,
      category_type: input.category_type,
      slick_tires: input.slick_tires,
      wet_tires: input.wet_tires,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao atualizar categoria:', error);
    throw new Error(`Erro ao atualizar categoria: ${error.message}`);
  }

  console.log('✅ Categoria atualizada com sucesso');
  return data;
}

/**
 * Exclui uma categoria de temporada
 * @param id - UUID da categoria
 */
export async function deleteSeasonCategory(id: string): Promise<void> {
  const supabase = createClient();

  console.log(`🗑️ [SEASON CATEGORIES] Excluindo categoria ${id}...`);

  const { error } = await supabase
    .from('season_categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Erro ao excluir categoria:', error);
    throw new Error(`Erro ao excluir categoria: ${error.message}`);
  }

  console.log('✅ Categoria excluída com sucesso');
}

/**
 * Busca categorias por nome
 * @param categoryName - Nome da categoria para filtrar
 * @returns Array de categorias que correspondem ao nome
 */
export async function fetchSeasonCategoriesByName(
  categoryName: string
): Promise<SeasonCategory[]> {
  const supabase = createClient();

  console.log(`🔍 [SEASON CATEGORIES] Buscando categorias com nome: ${categoryName}...`);

  const { data, error } = await supabase
    .from('season_categories')
    .select('*')
    .eq('category_name', categoryName)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar categorias:', error);
    throw new Error(`Erro ao buscar categorias: ${error.message}`);
  }

  console.log(`✅ ${data?.length || 0} categorias encontradas`);
  return data || [];
}

/**
 * Verifica se existe uma categoria com nome e modelo duplicados
 * @param categoryName - Nome da categoria
 * @param carModel - Modelo do carro
 * @param excludeId - ID para excluir da busca (útil em edições)
 * @returns true se já existe uma configuração duplicada
 */
export async function checkDuplicateCategory(
  categoryName: string,
  carModel: string,
  excludeId?: string
): Promise<boolean> {
  const supabase = createClient();

  let query = supabase
    .from('season_categories')
    .select('id')
    .eq('category_name', categoryName)
    .eq('car_model', carModel);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Erro ao verificar duplicatas:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}