/**
 * Monitor de Ocupação de Containers em Tempo Real
 * Exibe ocupação atual de todos os containers com atualização automática
 */

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, Box, FileSpreadsheet } from 'lucide-react';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { createClient } from '../utils/supabase/client';
import { LoadingSpinner } from './LoadingSpinner';
import { exportContainerOccupancyToExcel } from '../utils/excelExport';
import { toast } from 'sonner';

interface ContainerOccupancy {
  id: string;
  name: string;
  location: string;
  capacity: number;
  currentStock: number;
  occupancyPercent: number;
  status: 'empty' | 'low' | 'normal' | 'high' | 'critical' | 'full';
  statusColor: string;
  statusLabel: string;
}

interface ContainerOccupancyMonitorProps {
  refreshInterval?: number; // em milissegundos
  showHeader?: boolean;
  compact?: boolean;
  onContainerClick?: (containerId: string) => void;
}

export function ContainerOccupancyMonitor({
  refreshInterval = 30000, // 30 segundos
  showHeader = true,
  compact = false,
  onContainerClick,
}: ContainerOccupancyMonitorProps) {
  const [containers, setContainers] = useState<ContainerOccupancy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [stockEntries, setStockEntries] = useState<any[]>([]);
  const [containersRaw, setContainersRaw] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Carrega dados dos containers
  const loadContainerOccupancy = async () => {
    try {
      setError(null);
      const supabase = createClient();

      // Busca containers
      console.log('🔍 Buscando containers...');
      const { data: containersData, error: containersError } = await supabase
        .from('containers')
        .select('*')
        .order('name');

      if (containersError) {
        console.error('❌ Erro ao buscar containers:', containersError);
        throw new Error(`Erro ao buscar containers: ${containersError.message}`);
      }

      console.log(`✅ ${containersData?.length || 0} containers encontrados`);

      // Busca pneus ativos (não descartados) - Abordagem mais simples e segura
      console.log('🔍 Buscando stock_entries...');
      const { data: stockData, error: stockError } = await supabase
        .from('stock_entries')
        .select('container_id, status')
        .neq('status', 'Descartado DSI')
        .neq('status', 'Descarte DSI')
        .neq('status', 'Descarte')
        .limit(50000);

      if (stockError) {
        console.error('⚠️ Erro ao buscar stock_entries:', stockError);
        // Continua mesmo com erro no estoque, apenas com containers vazios
        console.warn('Continuando com containers vazios devido a erro no estoque');
        toast.warning('Aviso', {
          description: 'Não foi possível carregar dados de estoque. Mostrando containers vazios.',
          duration: 4000,
        });
      } else {
        console.log(`✅ ${stockData?.length || 0} entradas de estoque encontradas`);
      }

      // Salva dados brutos para exportação
      setContainersRaw(containersData || []);
      setStockEntries(stockData || []);

      // Calcula ocupação de cada container
      const occupancyData: ContainerOccupancy[] = (containersData || []).map(container => {
        const currentStock = (stockData || []).filter(
          entry => entry.container_id === container.id
        ).length;

        const occupancyPercent = container.capacity > 0
          ? (currentStock / container.capacity) * 100
          : 0;

        const status = getOccupancyStatus(occupancyPercent);
        const { color, label } = getStatusDetails(status);

        return {
          id: container.id,
          name: container.name,
          location: container.location || '-',
          capacity: container.capacity || 0,
          currentStock,
          occupancyPercent,
          status,
          statusColor: color,
          statusLabel: label,
        };
      });

      setContainers(occupancyData);
      setLastUpdate(new Date());
      console.log('✅ Ocupação de containers atualizada com sucesso');
    } catch (error: any) {
      console.error('❌ Erro ao carregar ocupação de containers:', error);
      setError(error.message || 'Erro desconhecido');
      toast.error('Erro ao carregar ocupação', {
        description: error.message || 'Não foi possível carregar os dados de ocupação dos containers.',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega dados inicialmente
  useEffect(() => {
    loadContainerOccupancy();
  }, []);

  // Atualização automática
  useEffect(() => {
    const interval = setInterval(() => {
      loadContainerOccupancy();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Escuta eventos de atualização de estoque
  useEffect(() => {
    const handleStockUpdate = () => {
      loadContainerOccupancy();
    };

    window.addEventListener('stock-entries-updated', handleStockUpdate);
    window.addEventListener('containers-updated', handleStockUpdate);

    return () => {
      window.removeEventListener('stock-entries-updated', handleStockUpdate);
      window.removeEventListener('containers-updated', handleStockUpdate);
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" text="Carregando ocupação..." />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <p className="text-gray-900 mb-2">Erro ao carregar ocupação</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={loadContainerOccupancy} size="sm">
            Tentar novamente
          </Button>
        </div>
      </Card>
    );
  }

  // Função de exportação para Excel
  const handleExportToExcel = () => {
    try {
      exportContainerOccupancyToExcel(
        containersRaw,
        stockEntries,
        `Ocupacao_Containers_${new Date().toISOString().split('T')[0]}.xlsx`
      );
      toast.success('Exportado com sucesso!', {
        description: 'Arquivo Excel gerado com dados de ocupação',
        duration: 3000,
      });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar', {
        description: 'Não foi possível gerar o arquivo Excel',
        duration: 4000,
      });
    }
  };

  // Estatísticas gerais
  const totalContainers = containers.length;
  const fullContainers = containers.filter(c => c.status === 'full').length;
  const criticalContainers = containers.filter(c => c.status === 'critical').length;
  const totalCapacity = containers.reduce((sum, c) => sum + c.capacity, 0);
  const totalOccupied = containers.reduce((sum, c) => sum + c.currentStock, 0);
  const averageOccupancy = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0;

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-gray-900">Ocupação de Containers</h3>
            <p className="text-sm text-gray-500">
              Atualizado às {lastUpdate.toLocaleTimeString('pt-BR')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-white">
              {totalContainers} containers
            </Badge>
            {criticalContainers > 0 && (
              <Badge variant="destructive">
                {criticalContainers} crítico{criticalContainers > 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              onClick={handleExportToExcel}
              size="sm"
              variant="outline"
              className="bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              disabled={containers.length === 0}
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">Exportar Excel</span>
              <span className="sm:hidden">Excel</span>
            </Button>
          </div>
        </div>
      )}

      {/* Estatísticas Gerais */}
      {!compact && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Ocupação Média</p>
                <p className="text-xl text-gray-900">{averageOccupancy.toFixed(1)}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-white border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Pneus Ativos</p>
                <p className="text-xl text-gray-900">{totalOccupied}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Box className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Capacidade Total</p>
                <p className="text-xl text-gray-900">{totalCapacity}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-50 to-white border-orange-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Cheios</p>
                <p className="text-xl text-gray-900">{fullContainers + criticalContainers}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Lista de Containers */}
      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {containers.map(container => (
          <Card
            key={container.id}
            className={`p-4 transition-all hover:shadow-md ${
              onContainerClick ? 'cursor-pointer' : ''
            }`}
            onClick={() => onContainerClick?.(container.id)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-gray-900 truncate">{container.name}</h4>
                {!compact && (
                  <p className="text-xs text-gray-500 truncate">{container.location}</p>
                )}
              </div>
              <Badge 
                variant="outline" 
                className="ml-2 flex-shrink-0"
                style={{ 
                  backgroundColor: `${container.statusColor}15`,
                  borderColor: container.statusColor,
                  color: container.statusColor,
                }}
              >
                {container.statusLabel}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress 
                value={container.occupancyPercent} 
                className="h-2"
                indicatorClassName={getProgressColor(container.status)}
              />

              {/* Números */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {container.currentStock} / {container.capacity}
                </span>
                <span className={`font-medium ${getTextColor(container.status)}`}>
                  {container.occupancyPercent.toFixed(1)}%
                </span>
              </div>

              {/* Aviso se crítico */}
              {(container.status === 'critical' || container.status === 'full') && !compact && (
                <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  <AlertTriangle className="w-3 h-3" />
                  <span>
                    {container.status === 'full' 
                      ? 'Container cheio' 
                      : `${container.capacity - container.currentStock} espaços restantes`
                    }
                  </span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {containers.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum container cadastrado</p>
        </Card>
      )}
    </div>
  );
}

// Helper functions
function getOccupancyStatus(percent: number): 'empty' | 'low' | 'normal' | 'high' | 'critical' | 'full' {
  if (percent >= 100) return 'full';
  if (percent >= 90) return 'critical';
  if (percent >= 70) return 'high';
  if (percent >= 40) return 'normal';
  if (percent > 0) return 'low';
  return 'empty';
}

function getStatusDetails(status: string): { color: string; label: string } {
  switch (status) {
    case 'full':
      return { color: '#DC2626', label: 'Cheio' };
    case 'critical':
      return { color: '#F59E0B', label: 'Crítico' };
    case 'high':
      return { color: '#EAB308', label: 'Alto' };
    case 'normal':
      return { color: '#10B981', label: 'Normal' };
    case 'low':
      return { color: '#3B82F6', label: 'Baixo' };
    case 'empty':
      return { color: '#9CA3AF', label: 'Vazio' };
    default:
      return { color: '#6B7280', label: 'N/A' };
  }
}

function getProgressColor(status: string): string {
  switch (status) {
    case 'full':
      return 'bg-red-600';
    case 'critical':
      return 'bg-orange-500';
    case 'high':
      return 'bg-yellow-500';
    case 'normal':
      return 'bg-green-500';
    case 'low':
      return 'bg-blue-500';
    case 'empty':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
}

function getTextColor(status: string): string {
  switch (status) {
    case 'full':
      return 'text-red-600';
    case 'critical':
      return 'text-orange-600';
    case 'high':
      return 'text-yellow-600';
    case 'normal':
      return 'text-green-600';
    case 'low':
      return 'text-blue-600';
    case 'empty':
      return 'text-gray-500';
    default:
      return 'text-gray-600';
  }
}
