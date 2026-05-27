# 🔄 useDataFetch - Exemplo de Migração Prática

**Objetivo**: Mostrar na prática como migrar um componente existente para usar `useDataFetch`.

---

## 📋 Componente Exemplo: ContainerList

Vamos migrar um componente típico que busca dados do Supabase.

---

## ❌ ANTES - Código Duplicado (40 linhas)

```tsx
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

export function ContainerList() {
  // Estados duplicados em 15+ componentes
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função de fetch duplicada
  const loadContainers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('containers')
        .select('*')
        .order('name', { ascending: true });
      
      if (fetchError) {
        throw fetchError;
      }
      
      setContainers(data || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      toast.error(`Erro ao carregar containers: ${errorMsg}`);
      console.error('Error loading containers:', err);
    } finally {
      setLoading(false);
    }
  };

  // useEffect duplicado
  useEffect(() => {
    loadContainers();
  }, []);

  // Event listener duplicado
  useEffect(() => {
    const handleUpdate = () => loadContainers();
    window.addEventListener('containers-updated', handleUpdate);
    return () => window.removeEventListener('containers-updated', handleUpdate);
  }, []);

  // Renderização com estados duplicados
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-red-600">
        Erro: {error}
        <button onClick={loadContainers}>Tentar Novamente</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={loadContainers}>🔄 Atualizar</button>
      <div className="grid gap-4">
        {containers.map((container) => (
          <div key={container.id} className="border p-4 rounded">
            {container.name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Problemas**:
- ❌ 40 linhas de código
- ❌ 3 useState (duplicado 15x)
- ❌ 2 useEffect (duplicado 15x)
- ❌ Try-catch manual
- ❌ Toast manual
- ❌ Cleanup manual
- ❌ Sem retry
- ❌ Sem cache
- ❌ Sem debounce

---

## ✅ DEPOIS - Com useDataFetch (12 linhas)

```tsx
import { useEffect } from 'react';
import { useDataFetch } from '../utils/useDataFetch';
import { createClient } from '../utils/supabase/client';

export function ContainerList() {
  // Tudo em 1 linha! 🎉
  const { data: containers, loading, error, refetch } = useDataFetch(
    async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('containers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    [],
    {
      errorMessage: 'Erro ao carregar containers',
      showErrorToast: true,
    }
  );

  // Event listener simplificado
  useEffect(() => {
    const handleUpdate = () => refetch();
    window.addEventListener('containers-updated', handleUpdate);
    return () => window.removeEventListener('containers-updated', handleUpdate);
  }, [refetch]);

  // Renderização idêntica
  if (loading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <div className="text-red-600">
        Erro: {error.message}
        <button onClick={refetch}>Tentar Novamente</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={refetch}>🔄 Atualizar</button>
      <div className="grid gap-4">
        {containers?.map((container) => (
          <div key={container.id} className="border p-4 rounded">
            {container.name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Melhorias**:
- ✅ 12 linhas (**-70% de código**)
- ✅ 0 useState (hook cuida)
- ✅ 1 useEffect (só event listener)
- ✅ Try-catch automático
- ✅ Toast automático
- ✅ Cleanup automático
- ✅ Retry opcional
- ✅ Cache opcional
- ✅ Debounce opcional

---

## 🚀 Versão PREMIUM - Com Todas Features

```tsx
import { useEffect } from 'react';
import { useSupabaseFetch } from '../utils/useDataFetch';

export function ContainerList() {
  // Versão premium com cache, retry, callbacks
  const { 
    data: containers, 
    loading, 
    error, 
    refetch,
    isRefetching 
  } = useSupabaseFetch(
    (supabase) => supabase
      .from('containers')
      .select('*')
      .order('name', { ascending: true }),
    [],
    {
      // Cache de 5 minutos
      cacheTime: 5 * 60 * 1000,
      
      // Retry 3x se falhar
      retryCount: 3,
      retryDelay: 2000,
      
      // Callbacks
      onSuccess: (data) => {
        console.log(`✅ ${data.length} containers carregados`);
      },
      onError: (error) => {
        console.error('❌ Erro:', error);
        // Enviar para Sentry, Analytics, etc
      },
      
      // Toasts
      successMessage: 'Containers carregados!',
      errorMessage: 'Erro ao carregar containers',
      showSuccessToast: false, // Só mostra em refetch manual
      showErrorToast: true,
    }
  );

  // Event listener
  useEffect(() => {
    const handleUpdate = () => refetch();
    window.addEventListener('containers-updated', handleUpdate);
    return () => window.removeEventListener('containers-updated', handleUpdate);
  }, [refetch]);

  // Loading com skeleton
  if (loading && !containers) {
    return <ContainerListSkeleton />;
  }

  // Error com retry
  if (error) {
    return (
      <ErrorState 
        error={error}
        onRetry={refetch}
        title="Erro ao Carregar Containers"
      />
    );
  }

  return (
    <div className="relative">
      {/* Overlay de refetch */}
      {isRefetching && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center z-10">
          <LoadingSpinner />
        </div>
      )}

      {/* Header com ações */}
      <div className="flex justify-between items-center mb-4">
        <h2>Containers ({containers?.length || 0})</h2>
        <button 
          onClick={refetch}
          disabled={isRefetching}
          className="btn-primary"
        >
          {isRefetching ? '🔄 Atualizando...' : '🔄 Atualizar'}
        </button>
      </div>

      {/* Lista */}
      {containers?.length === 0 ? (
        <EmptyState 
          icon="📦"
          title="Nenhum container cadastrado"
          description="Cadastre o primeiro container para começar"
        />
      ) : (
        <div className="grid gap-4">
          {containers?.map((container) => (
            <ContainerCard key={container.id} container={container} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Features Extras**:
- ✅ **Cache** - não recarrega se dados recentes
- ✅ **Retry** - tenta 3x se falhar
- ✅ **Callbacks** - logs, analytics
- ✅ **Loading states** - skeleton + overlay
- ✅ **Empty state** - UX completa
- ✅ **TypeScript** - type-safe

---

## 📊 Comparação Lado a Lado

| Feature | ANTES | DEPOIS |
|---------|-------|--------|
| **Linhas de código** | 40 | 12 (-70%) |
| **useState** | 3 | 0 |
| **useEffect** | 2 | 1 |
| **Try-catch** | Manual | Automático |
| **Toast de erro** | Manual | Automático |
| **Cleanup** | Manual | Automático |
| **Retry** | ❌ | ✅ (opcional) |
| **Cache** | ❌ | ✅ (opcional) |
| **Debounce** | ❌ | ✅ (opcional) |
| **TypeScript** | Parcial | Completo |
| **Callbacks** | ❌ | ✅ |
| **Refetch state** | ❌ | ✅ |

---

## 🎯 Passo a Passo da Migração

### 1️⃣ Identificar Estados

```tsx
// ANTES
const [containers, setContainers] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
```

**Ação**: Remover todos - hook cuida disso

---

### 2️⃣ Extrair Fetch Function

```tsx
// ANTES - dentro do useEffect
const loadContainers = async () => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('containers')
    .select('*');
  // ...
};

// DEPOIS - extrair para ser reutilizável
const fetchContainers = async () => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('containers')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data || [];
};
```

---

### 3️⃣ Substituir por useDataFetch

```tsx
// ANTES
useEffect(() => {
  loadContainers();
}, []);

// DEPOIS
const { data: containers, loading, error, refetch } = useDataFetch(
  fetchContainers,
  []
);
```

---

### 4️⃣ Ajustar Renderização

```tsx
// ANTES
{containers.map(...)}

// DEPOIS (usar optional chaining)
{containers?.map(...)}
// Porque data pode ser null inicialmente
```

---

### 5️⃣ Testar

- [ ] Loading funciona?
- [ ] Dados carregam?
- [ ] Error mostra?
- [ ] Refetch funciona?
- [ ] Event listener funciona?
- [ ] Cleanup funciona (ao desmontar)?

---

## 🎁 Bonus: Múltiplos Fetches

### ANTES - Múltiplas queries sequenciais

```tsx
const [containers, setContainers] = useState([]);
const [models, setModels] = useState([]);
const [status, setStatus] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadAll = async () => {
    setLoading(true);
    
    // Sequencial - lento!
    const { data: c } = await supabase.from('containers').select('*');
    setContainers(c);
    
    const { data: m } = await supabase.from('tire_models').select('*');
    setModels(m);
    
    const { data: s } = await supabase.from('tire_status').select('*');
    setStatus(s);
    
    setLoading(false);
  };
  
  loadAll();
}, []);
```

**Problema**: Sequencial = 3x mais lento!

---

### DEPOIS - Múltiplas queries em paralelo

```tsx
// Opção 1: Múltiplos hooks (cache compartilhado)
const { data: containers } = useDataFetch(() => fetchContainers(), []);
const { data: models } = useDataFetch(() => fetchModels(), []);
const { data: status } = useDataFetch(() => fetchStatus(), []);

// loading individual por hook
const loading = !containers || !models || !status;
```

```tsx
// Opção 2: Single hook com Promise.all
const { data, loading } = useDataFetch(
  async () => {
    const [containers, models, status] = await Promise.all([
      fetchContainers(),
      fetchModels(),
      fetchStatus(),
    ]);
    
    return { containers, models, status };
  },
  []
);

// data.containers, data.models, data.status
```

**Benefício**: 3x mais rápido (paralelo)!

---

## 📚 Mais Exemplos Reais

### Dashboard com Stats

```tsx
function Dashboard() {
  const { data: stats, loading } = useDataFetch(
    async () => {
      const supabase = createClient();
      
      // Busca várias métricas
      const [totalTires, activeTires, containers] = await Promise.all([
        supabase.from('stock_entries').select('*', { count: 'exact' }),
        supabase.from('stock_entries').select('*', { count: 'exact' }).neq('status', 'Descartado DSI'),
        supabase.from('containers').select('*'),
      ]);

      return {
        total: totalTires.count || 0,
        active: activeTires.count || 0,
        containers: containers.data?.length || 0,
      };
    },
    [],
    {
      cacheTime: 2 * 60 * 1000, // Cache 2min
    }
  );

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard title="Total" value={stats.total} />
      <StatCard title="Ativos" value={stats.active} />
      <StatCard title="Containers" value={stats.containers} />
    </div>
  );
}
```

---

### Search com Debounce

```tsx
function TireSearch() {
  const [query, setQuery] = useState('');

  const { data: results, loading } = useDataFetch(
    async () => {
      if (!query || query.length < 3) return [];
      
      const supabase = createClient();
      const { data } = await supabase
        .from('stock_entries')
        .select('*')
        .ilike('barcode', `%${query}%`)
        .limit(20);
      
      return data || [];
    },
    [query],
    {
      debounceMs: 300, // Aguarda 300ms após digitar
    }
  );

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por código..."
      />
      
      {loading && <span>🔍 Buscando...</span>}
      
      <SearchResults results={results} />
    </div>
  );
}
```

---

## ✅ Checklist Final

Ao migrar cada componente:

- [ ] ✅ Remover `useState` de loading/error/data
- [ ] ✅ Remover `useEffect` de fetch
- [ ] ✅ Extrair fetch para função separada
- [ ] ✅ Adicionar `useDataFetch`
- [ ] ✅ Adicionar optional chaining (`data?.map`)
- [ ] ✅ Configurar opções (toast, cache, retry)
- [ ] ✅ Testar loading state
- [ ] ✅ Testar error state
- [ ] ✅ Testar refetch
- [ ] ✅ Verificar cleanup (desmontar componente)
- [ ] ✅ Commit com mensagem clara

---

## 🎯 Próximo Componente Sugerido

**Dashboard.tsx** - Maior impacto!

Tem múltiplos fetches, loading states complexos, e é o componente mais acessado.

**Economia estimada**: -60 linhas de código

Quer que eu migre o Dashboard agora? 🚀
