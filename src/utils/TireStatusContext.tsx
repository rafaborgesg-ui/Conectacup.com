import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { projectId, publicAnonKey } from './supabase/info';
import { getAccessToken } from './supabase/client';

export interface TireStatus {
  id: string;
  name: string;
  color: string;
  created_at?: string;
  updated_at?: string;
}

interface TireStatusContextType {
  statusList: TireStatus[];
  isLoading: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
  getStatusById: (id: string) => TireStatus | undefined;
  getStatusByName: (name: string | null | undefined) => TireStatus | undefined;
}

const TireStatusContext = createContext<TireStatusContextType | undefined>(undefined);

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c`;

// Status padrão (fallback quando não conseguir carregar do servidor)
// IMPORTANTE: UUIDs válidos para compatibilidade com Supabase
// NOTA: Cores sincronizadas com o banco de dados (tire_status)
const DEFAULT_STATUS: TireStatus[] = [
  { id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', name: 'Novo', color: '#3B82F6' }, // Azul
  { id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', name: 'Pneu CUP', color: '#10B981' }, // Verde
  { id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', name: 'Usado', color: '#F59E0B' }, // Laranja
  { id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', name: 'Recapado', color: '#8B5CF6' }, // Roxo
  { id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b', name: 'Piloto', color: '#10B981' }, // Verde (CORRIGIDO)
  { id: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c', name: 'Descarte', color: '#DC2626' }, // Vermelho
  { id: 'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d', name: 'Descarte Piloto', color: '#EF4444' }, // Vermelho claro
];

interface TireStatusProviderProps {
  children: ReactNode;
  onError?: (error: { code?: string; message?: string } | null) => void;
}

export function TireStatusProvider({ children, onError }: TireStatusProviderProps) {
  const [statusList, setStatusList] = useState<TireStatus[]>(DEFAULT_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Obtém token (DEV ou Supabase Auth)
      let token: string;
      const devUser = localStorage.getItem('porsche-cup-user');
      if (devUser) {
        try {
          const userData = JSON.parse(devUser);
          if (userData.id === 'dev-admin-local') {
            token = publicAnonKey;
          } else {
            token = await getAccessToken() || publicAnonKey;
          }
        } catch (e) {
          token = await getAccessToken() || publicAnonKey;
        }
      } else {
        token = await getAccessToken() || publicAnonKey;
      }
      
      const response = await fetch(`${API_BASE}/tire-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Falha silenciosa - usa status padrão
        setStatusList(DEFAULT_STATUS);
        return;
      }
      
      const result = await response.json();
      
      // Se retornar dados válidos, usa eles; senão usa padrão
      if (result.data && result.data.length > 0) {
        setStatusList(result.data);
        console.log('✅ Status carregados do servidor:', result.data.length);
      } else {
        // Sem logs de warning - apenas usa padrão silenciosamente
        setStatusList(DEFAULT_STATUS);
      }
    } catch (err: any) {
      // Falha silenciosa - apenas usa status padrão
      setStatusList(DEFAULT_STATUS);
      // Não mostra erros no console - app funciona normalmente com status padrão
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Escuta atualizações
    const handleUpdate = () => fetchStatus();
    window.addEventListener('tire-status-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('tire-status-updated', handleUpdate);
    };
  }, []);

  const refreshStatus = async () => {
    await fetchStatus();
  };

  const getStatusById = (id: string): TireStatus | undefined => {
    return statusList.find(s => s.id === id);
  };

  const getStatusByName = (name: string | null | undefined): TireStatus | undefined => {
    if (!name || typeof name !== 'string') return undefined;
    if (!statusList || statusList.length === 0) return undefined;
    return statusList.find(s => s && s.name && typeof s.name === 'string' && s.name.toLowerCase() === name.toLowerCase());
  };

  return (
    <TireStatusContext.Provider
      value={{
        statusList,
        isLoading,
        error,
        refreshStatus,
        getStatusById,
        getStatusByName,
      }}
    >
      {children}
    </TireStatusContext.Provider>
  );
}

export function useTireStatus() {
  const context = useContext(TireStatusContext);
  if (context === undefined) {
    throw new Error('useTireStatus must be used within a TireStatusProvider');
  }
  return context;
}
