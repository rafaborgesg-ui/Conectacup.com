import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * 🎯 Hook para debug de renderizações
 * Monitora e loga quando e por que um componente renderiza
 * 
 * @usage
 * ```tsx
 * function MyComponent({ data, loading }) {
 *   useRenderDebug('MyComponent', { data, loading });
 *   // ...
 * }
 * ```
 */
export function useRenderDebug(componentName: string, props?: Record<string, any>) {
  const renderCount = useRef(0);
  const previousProps = useRef<Record<string, any>>();

  useEffect(() => {
    renderCount.current += 1;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [${componentName}] Render #${renderCount.current}`);
      
      if (props && previousProps.current) {
        // Detecta quais props mudaram
        const changedProps = Object.keys(props).filter(
          key => props[key] !== previousProps.current![key]
        );
        
        if (changedProps.length > 0) {
          console.log(`   📝 Props alteradas:`, changedProps);
          changedProps.forEach(key => {
            console.log(`      - ${key}:`, 
              previousProps.current![key], 
              '→', 
              props[key]
            );
          });
        }
      }
      
      previousProps.current = props;
    }
  });
}

/**
 * 🚀 Hook para debounce de valores
 * Útil para inputs de busca e operações custosas
 * 
 * @usage
 * ```tsx
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 500);
 * 
 * useEffect(() => {
 *   // Só executa 500ms após o usuário parar de digitar
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 🎯 Hook para throttle de funções
 * Limita a frequência de execução de uma função
 * 
 * @usage
 * ```tsx
 * const handleScroll = useThrottle(() => {
 *   console.log('Scroll event');
 * }, 200);
 * 
 * useEffect(() => {
 *   window.addEventListener('scroll', handleScroll);
 *   return () => window.removeEventListener('scroll', handleScroll);
 * }, [handleScroll]);
 * ```
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: any[]) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;

      if (timeSinceLastRun >= delay) {
        callback(...args);
        lastRun.current = now;
      } else {
        // Agenda a execução para o final do throttle
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRun.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * 🔍 Hook para detectar visibilidade de elemento
 * Útil para lazy loading e infinite scroll
 * 
 * @usage
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * const isVisible = useIntersectionObserver(ref, { threshold: 0.5 });
 * 
 * useEffect(() => {
 *   if (isVisible) {
 *     loadMoreData();
 *   }
 * }, [isVisible]);
 * 
 * return <div ref={ref}>Content</div>;
 * ```
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

/**
 * 💾 Hook para localStorage com sincronização
 * Mantém estado sincronizado com localStorage
 * 
 * @usage
 * ```tsx
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // Estado para armazenar o valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Retorna uma versão wrapped do setState que persiste no localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Permite value ser uma função como useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Salva estado
      setStoredValue(valueToStore);
      
      // Salva no localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error saving localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * ⏱️ Hook para medir performance de componentes
 * 
 * @usage
 * ```tsx
 * function MyComponent() {
 *   usePerformanceMonitor('MyComponent');
 *   // ...
 * }
 * ```
 */
export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>();
  const mountTime = useRef<number>();

  useEffect(() => {
    // Mede tempo de mount
    if (!mountTime.current) {
      mountTime.current = performance.now();
      console.log(`⚡ [${componentName}] Mounted in ${mountTime.current.toFixed(2)}ms`);
    }

    return () => {
      // Cleanup
      if (mountTime.current) {
        const lifetime = performance.now() - mountTime.current;
        console.log(`⚡ [${componentName}] Unmounted after ${lifetime.toFixed(2)}ms`);
      }
    };
  }, [componentName]);

  useEffect(() => {
    // Mede tempo de cada render
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      if (renderTime > 16.67) { // > 1 frame (60fps)
        console.warn(`⚠️ [${componentName}] Slow render: ${renderTime.toFixed(2)}ms`);
      }
    }
    renderStartTime.current = performance.now();
  });
}
