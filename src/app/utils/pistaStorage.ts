import { createClient } from './supabase/client';

export interface Pista {
  id: string;
  nome: string;
  endereco?: string;
  coordenadas?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

/**
 * Busca todas as pistas
 */
export async function getPistas(): Promise<Pista[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('pista')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar pistas:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca uma pista por ID
 */
export async function getPistaById(id: string): Promise<Pista | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('pista')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar pista:', error);
    throw error;
  }

  return data;
}

/**
 * Cria uma nova pista
 */
export async function createPista(pista: Omit<Pista, 'id' | 'created_at' | 'updated_at'>): Promise<Pista> {
  const supabase = createClient();
  
  // Pega o usuário atual
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('pista')
    .insert([{
      nome: pista.nome,
      endereco: pista.endereco,
      coordenadas: pista.coordenadas,
      created_by: user?.id,
      updated_by: user?.id
    }])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar pista:', error);
    throw error;
  }

  return data;
}

/**
 * Atualiza uma pista existente
 */
export async function updatePista(id: string, pista: Partial<Omit<Pista, 'id' | 'created_at' | 'updated_at' | 'created_by'>>): Promise<Pista> {
  const supabase = createClient();
  
  // Pega o usuário atual
  const { data: { user } } = await supabase.auth.getUser();

  const updateData: any = {
    ...pista,
    updated_by: user?.id
  };

  const { data, error } = await supabase
    .from('pista')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar pista:', error);
    throw error;
  }

  return data;
}

/**
 * Deleta uma pista
 */
export async function deletePista(id: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('pista')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar pista:', error);
    throw error;
  }
}

/**
 * Busca pistas por nome (pesquisa)
 */
export async function searchPistas(searchTerm: string): Promise<Pista[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('pista')
    .select('*')
    .or(`nome.ilike.%${searchTerm}%,endereco.ilike.%${searchTerm}%,coordenadas.ilike.%${searchTerm}%`)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao pesquisar pistas:', error);
    throw error;
  }

  return data || [];
}
