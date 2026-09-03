/**
 * 🔄 useDataFetch - Hook Reutilizável para Fetch de Dados
 * 
 * Elimina código duplicado de loading/error/data em múltiplos componentes.
 * 
 * Features:
 * - ✅ Loading state automático
 * - ✅ Error handling com retry
 * - ✅ Refetch manual
 * - ✅ Dependências reativas
 * - ✅ Cleanup automático
 * - ✅ TypeScript type-safe
 * - ✅ Callbacks success/error
 * - ✅ Cache opcional
 * - ✅ Debounce opcional
 * 
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useDataFetch(
 *   () => supabase.from('stock_entries').select('*'),
 *   []
 * );
 * 
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorState error={error} />;
 * return <Table data={data} />;
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner@2.0.3';

/**
 * Opções de configuração do hook
 */
export interface UseDataFetchOptions<T> {
  /**
   * Callback executado quando data é carregada com sucesso
   */
  onSuccess?: (data: T) => void;

  /**
   * Callback executado quando há erro
   */
  onError?: (error: Error) => void;

  /**
   * Mensagem de toast ao sucesso (opcional)
   */
  successMessage?: string;

  /**
   * Mensagem de toast ao erro (opcional)
   */
  errorMessage?: string;

  /**
   * Mostra toast de erro automaticamente
   * @default true
   */
  showErrorToast?: boolean;

  /**
   * Mostra toast de sucesso automaticamente
   * @default false
   */
  showSuccessToast?: boolean;

  /**
   * Executa fetch automaticamente no mount
   * @default true
   */
  autoFetch?: boolean;

  /**
   * Delay inicial antes do primeiro fetch (ms)
   * Útil para evitar race conditions
   * @default 0
   */
  initialDelay?: number;

  /**
   * Cache de dados por tempo (ms)
   * Se houver cache válido, não refetch
   * @default 0 (sem cache)
   */
  cacheTime?: number;

  /**
   * Debounce para refetch (ms)
   * Útil para evitar múltiplas chamadas rápidas
   * @default 0 (sem debounce)
   */
  debounceMs?: number;

  /**
   * Retry automático em caso de erro
   * @default 0 (sem retry)
   */
  retryCount?: number;

  /**
   * Delay entre retries (ms)
   * @default 1000
   */
  retryDelay?: number;
}

/**
 * Resultado retornado pelo hook
 */
export interface UseDataFetchResult<T> {
  /**
   * Dados carregados (null se ainda não carregou)
   */
  data: T | null;

  /**
   * Estado de loading
   */
  loading: boolean;

  /**
   * Erro ocorrido (null se sem erro)
   */
  error: Error | null;

  /**
   * Função para refazer o fetch manualmente
   */
  refetch: () => Promise<void>;

  /**
   * Limpa dados e estado
   */
  reset: () => void;

  /**
   * Define dados manualmente (útil para otimistic updates)
   */
  setData: (data: T | null) => void;

  /**
   * Indica se está fazendo refetch (já tem dados mas está recarregando)
   */
  isRefetching: boolean;
}

/**
 * Cache interno para armazenar dados temporariamente
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * Hook principal para fetch de dados
 * 
 * @param fetchFn - Função que retorna uma Promise com os dados
 * @param deps - Array de dependências (como useEffect)
 * @param options - Opções de configuração
 * 
 * @returns {UseDataFetchResult<T>} Objeto com data, loading, error, refetch, etc
 * 
 * @example
 * ```tsx
 * // Exemplo 1: Simples
 * const { data, loading, error } = useDataFetch(
 *   async () => {
 *     const { data } = await supabase.from('containers').select('*');
 *     return data;
 *   },
 *   []
 * );
 * 
 * // Exemplo 2: Com callbacks
 * const { data, refetch } = useDataFetch(
 *   fetchContainers,
 *   [],
 *   {
 *     onSuccess: (data) => console.log('Loaded:', data.length),
 *     onError: (err) => console.error('Failed:', err),
 *     successMessage: 'Dados carregados!',
 *   }
 * );
 * 
 * // Exemplo 3: Com cache e retry
 * const { data, loading } = useDataFetch(
 *   fetchExpensiveData,
 *   [],
 *   {
 *     cacheTime: 5 * 60 * 1000, // Cache de 5 minutos
 *     retryCount: 3,
 *     retryDelay: 2000,
 *   }
 * );
 * ```
 */
export function useDataFetch<T = any>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList = [],
  options: UseDataFetchOptions<T> = {}
): UseDataFetchResult<T> {
  const {
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    showErrorToast = true,
    showSuccessToast = false,
    autoFetch = true,
    initialDelay = 0,
    cacheTime = 0,
    debounceMs = 0,
    retryCount = 0,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);

  // Refs para controle
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cacheKeyRef = useRef<string>(
    `fetch-${fetchFn.toString().slice(0, 50)}-${JSON.stringify(deps)}`
  );

  /**
   * Verifica se há cache válido
   */
  const getCachedData = useCallback((): T | null => {
    if (cacheTime <= 0) return null;

    const cached = cache.get(cacheKeyRef.current);
    if (!cached) return null;

    const isValid = Date.now() - cached.timestamp < cacheTime;
    if (!isValid) {
      cache.delete(cacheKeyRef.current);
      return null;
    }

    return cached.data;
  }, [cacheTime]);

  /**
   * Salva dados no cache
   */
  const setCachedData = useCallback(
    (newData: T) => {
      if (cacheTime <= 0) return;

      cache.set(cacheKeyRef.current, {
        data: newData,
        timestamp: Date.now(),
      });
    },
    [cacheTime]
  );

  /**
   * Executa o fetch com retry logic
   */
  const executeFetch = useCallback(
    async (isManualRefetch = false): Promise<void> => {
      try {
        // Verifica cache
        const cachedData = getCachedData();
        if (cachedData && !isManualRefetch) {
          if (isMountedRef.current) {
            setData(cachedData);
            setLoading(false);
            setError(null);
          }
          return;
        }

        // Define loading state
        if (isMountedRef.current) {
          if (data && isManualRefetch) {
            setIsRefetching(true);
          } else {
            setLoading(true);
          }
          setError(null);
        }

        // Executa fetch
        const result = await fetchFn();

        if (isMountedRef.current) {
          setData(result);
          setLoading(false);
          setIsRefetching(false);
          setError(null);
          retryCountRef.current = 0;

          // Cache
          setCachedData(result);

          // Callbacks
          onSuccess?.(result);

          // Toast
          if (showSuccessToast && successMessage) {
            toast.success(successMessage);
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Retry logic
        if (retryCountRef.current < retryCount) {
          retryCountRef.current++;
          console.warn(
            `⚠️ Fetch falhou. Tentativa ${retryCountRef.current}/${retryCount}. Retry em ${retryDelay}ms...`
          );

          await new Promise((resolve) => setTimeout(resolve, retryDelay));

          if (isMountedRef.current) {
            return executeFetch(isManualRefetch);
          }
        }

        // Se todas as tentativas falharam
        if (isMountedRef.current) {
          setError(error);
          setLoading(false);
          setIsRefetching(false);
          retryCountRef.current = 0;

          // Callbacks
          onError?.(error);

          // Toast
          if (showErrorToast) {
            const message =
              errorMessage || `Erro ao carregar dados: ${error.message}`;
            toast.error(message);
          }

          console.error('❌ useDataFetch error:', error);
        }
      }
    },
    [
      fetchFn,
      data,
      getCachedData,
      setCachedData,
      onSuccess,
      onError,
      successMessage,
      errorMessage,
      showErrorToast,
      showSuccessToast,
      retryCount,
      retryDelay,
    ]
  );

  /**
   * Refetch com debounce opcional
   */
  const refetch = useCallback(async () => {
    if (debounceMs > 0) {
      // Limpa timer anterior
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Cria novo timer
      return new Promise<void>((resolve) => {
        debounceTimerRef.current = setTimeout(async () => {
          await executeFetch(true);
          resolve();
        }, debounceMs);
      });
    } else {
      // Sem debounce
      await executeFetch(true);
    }
  }, [executeFetch, debounceMs]);

  /**
   * Reset completo
   */
  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
    setIsRefetching(false);
    retryCountRef.current = 0;

    // Limpa cache
    cache.delete(cacheKeyRef.current);

    // Limpa debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  /**
   * Effect principal - executa fetch quando deps mudam
   */
  useEffect(() => {
    if (!autoFetch) return;

    const runFetch = async () => {
      if (initialDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, initialDelay));
      }

      if (isMountedRef.current) {
        await executeFetch(false);
      }
    };

    runFetch();
  }, [...deps, autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Cleanup ao desmontar
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // Limpa debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    reset,
    setData,
    isRefetching,
  };
}

/**
 * Hook especializado para Supabase queries
 * 
 * @example
 * ```tsx
 * const { data: containers } = useSupabaseFetch(
 *   (supabase) => supabase.from('containers').select('*')
 * );
 * ```
 */
export function useSupabaseFetch<T = any>(
  queryFn: (supabase: any) => Promise<{ data: T | null; error: any }>,
  deps: React.DependencyList = [],
  options: UseDataFetchOptions<T> = {}
) {
  return useDataFetch(
    async () => {
      const { createClient } = await import('./supabase/client');
      const supabase = createClient();
      const { data, error } = await queryFn(supabase);

      if (error) throw error;
      return data as T;
    },
    deps,
    options
  );
}

/**
 * Limpa todo o cache global
 */
export function clearDataFetchCache() {
  cache.clear();
  console.log('✅ Cache do useDataFetch limpo');
}

/**
 * Limpa cache de uma chave específica
 */
export function clearCacheByKey(key: string) {
  cache.delete(key);
  console.log(`✅ Cache da chave "${key}" limpo`);
}
