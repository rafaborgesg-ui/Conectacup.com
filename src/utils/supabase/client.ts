import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

// Singleton instance
let supabaseInstance: any = null;

/**
 * Cria ou retorna a instância singleton do cliente Supabase
 * Configurado para autenticação segura com persistência de sessão
 */
export function createClient() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sb-auth-token', // Nova chave isolada para Supabase
        storage: {
          getItem: (key: string) => {
            if (typeof window !== 'undefined') {
              return localStorage.getItem(key);
            }
            return null;
          },
          setItem: (key: string, value: string) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem(key, value);
            }
          },
          removeItem: (key: string) => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem(key);
            }
          },
        },
      },
      // CRÍTICO: Define headers globais para todas as requisições
      global: {
        headers: {
          // Aumenta o limite de registros retornados pelo PostgREST
          'Range-Unit': 'items',
          'Prefer': 'count=exact'
        },
      },
      db: {
        schema: 'public',
      },
    });
  }
  return supabaseInstance;
}

/**
 * Obtém o token de acesso atual do usuário autenticado
 * @returns Token JWT ou null se não autenticado
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return null;
    }
    
    return session.access_token;
  } catch (error) {
    console.warn('Erro ao obter token:', error);
    return null;
  }
}

/**
 * Obtém informações do usuário autenticado
 * @returns User object ou null se não autenticado
 */
export async function getCurrentUser() {
  const supabase = createClient();
  
  try {
    // Usa getSession() em vez de getUser() para evitar erro "Auth session missing"
    // getSession() verifica localmente, getUser() faz request ao servidor
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.user) {
      return null;
    }
    
    const user = session.user;
    
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
      role: user.user_metadata?.role || 'operator',
      user_metadata: user.user_metadata,
    };
  } catch (error) {
    console.warn('Erro ao verificar sessão:', error);
    return null;
  }
}

/**
 * Verifica se o usuário está autenticado
 * @returns true se autenticado, false caso contrário
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Logout do usuário
 */
export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
