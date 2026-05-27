/**
 * Mapa Visual dos Contêineres em Grid Layout
 * Visualização interativa da disposição física dos containers
 */

import { useState, useEffect } from 'react';
import { Package, MapPin, Maximize2, Box, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { createClient } from '../utils/supabase/client';
import { LoadingSpinner } from './LoadingSpinner';

interface Container {
  id: string;
  name: string;
  location: string;
  capacity: number;
  currentStock: number;
  occupancyPercent: number;
  position?: { row: number; col: number }; // Posição no grid
}

interface ContainerGridMapProps {
  columns?: number;
  onContainerClick?: (container: Container) => void;
  refreshInterval?: number;
}

export function ContainerGridMap({
  columns = 4,
  onContainerClick,
  refreshInterval = 30000,
}: ContainerGridMapProps) {
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Carrega dados dos containers
  const loadContainers = async () => {
    try {
      const supabase = createClient();

      // Busca containers
      const { data: containersData, error: containersError } = await supabase
        .from('containers')
        .select('*')
        .order('name');

      if (containersError) throw containersError;

      // Busca pneus ativos (otimizado)
      const { data: stockData, error: stockError } = await supabase
        .from('stock_entries')
        .select('container_id')
        .not('status', 'in', '("Descartado DSI","Descarte DSI","Descarte")')
        .limit(10000); // Limite aumentado para comportar todos os registros

      if (stockError) throw stockError;

      // Calcula ocupação e atribui posições
      const containersWithOccupancy: Container[] = (containersData || []).map((container, index) => {
        const currentStock = (stockData || []).filter(
          entry => entry.container_id === container.id
        ).length;

        const occupancyPercent = container.capacity > 0
          ? (currentStock / container.capacity) * 100
          : 0;

        return {
          id: container.id,
          name: container.name,
          location: container.location || '-',
          capacity: container.capacity || 0,
          currentStock,
          occupancyPercent,
          position: {
            row: Math.floor(index / columns),
            col: index % columns,
          },
        };
      });

      setContainers(containersWithOccupancy);
    } catch (error) {
      console.error('Erro ao carregar containers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContainers();
  }, []);

  useEffect(() => {
    const interval = setInterval(loadContainers, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  useEffect(() => {
    const handleUpdate = () => loadContainers();
    window.addEventListener('stock-entries-updated', handleUpdate);
    window.addEventListener('containers-updated', handleUpdate);
    return () => {
      window.removeEventListener('stock-entries-updated', handleUpdate);
      window.removeEventListener('containers-updated', handleUpdate);
    };
  }, []);

  const handleContainerClick = (container: Container) => {
    setSelectedContainer(container);
    setShowDetails(true);
    onContainerClick?.(container);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" text="Carregando mapa de containers..." />
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-600" />
            <h3 className="text-gray-900">Mapa de Containers</h3>
          </div>
          <Badge variant="outline" className="bg-white">
            {containers.length} containers
          </Badge>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-sm text-gray-600">Status:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span className="text-xs text-gray-600">Vazio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-600">Normal (até 70%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-gray-600">Alto (70-90%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-xs text-gray-600">Crítico (90-99%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-xs text-gray-600">Cheio (100%)</span>
          </div>
        </div>

        {/* Grid de Containers */}
        <div 
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {containers.map(container => (
            <ContainerCard
              key={container.id}
              container={container}
              onClick={() => handleContainerClick(container)}
            />
          ))}
        </div>

        {containers.length === 0 && (
          <Card className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum container cadastrado</p>
          </Card>
        )}
      </div>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#D50000]" />
              {selectedContainer?.name}
            </DialogTitle>
            <DialogDescription>
              Detalhes do container
            </DialogDescription>
          </DialogHeader>

          {selectedContainer && (
            <div className="space-y-4">
              {/* Localização */}
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Localização:</span>
                <span className="text-gray-900">{selectedContainer.location}</span>
              </div>

              {/* Ocupação */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Ocupação</span>
                  <span className="font-medium text-gray-900">
                    {selectedContainer.occupancyPercent.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={selectedContainer.occupancyPercent}
                  className="h-3"
                  indicatorClassName={getProgressColor(selectedContainer.occupancyPercent)}
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{selectedContainer.currentStock} pneus</span>
                  <span>Capacidade: {selectedContainer.capacity}</span>
                </div>
              </div>

              {/* Espaço Disponível */}
              <Card className={`p-4 ${
                selectedContainer.occupancyPercent >= 90 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedContainer.occupancyPercent >= 90 
                      ? 'bg-red-100' 
                      : 'bg-green-100'
                  }`}>
                    <Box className={`w-5 h-5 ${
                      selectedContainer.occupancyPercent >= 90 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Espaço Disponível</p>
                    <p className="text-xl font-bold text-gray-900">
                      {selectedContainer.capacity - selectedContainer.currentStock}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Alertas */}
              {selectedContainer.occupancyPercent >= 90 && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-900">Container Crítico</p>
                    <p className="text-orange-700 mt-1">
                      {selectedContainer.occupancyPercent >= 100
                        ? 'Este container está completamente cheio.'
                        : `Apenas ${selectedContainer.capacity - selectedContainer.currentStock} espaços restantes.`
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Componente de Card Individual
function ContainerCard({ 
  container, 
  onClick 
}: { 
  container: Container; 
  onClick: () => void;
}) {
  const getStatusColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-600';
    if (percent >= 90) return 'bg-orange-500';
    if (percent >= 70) return 'bg-yellow-500';
    if (percent > 0) return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getBorderColor = (percent: number) => {
    if (percent >= 100) return 'border-red-600';
    if (percent >= 90) return 'border-orange-500';
    if (percent >= 70) return 'border-yellow-500';
    if (percent > 0) return 'border-green-500';
    return 'border-gray-300';
  };

  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 ${getBorderColor(container.occupancyPercent)}`}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header com indicador de status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {container.name}
            </h4>
            <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {container.location}
            </p>
          </div>
          <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${getStatusColor(container.occupancyPercent)}`} />
        </div>

        {/* Barra de Progresso */}
        <Progress 
          value={container.occupancyPercent}
          className="h-2"
          indicatorClassName={getStatusColor(container.occupancyPercent)}
        />

        {/* Números */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-600">
            {container.currentStock}/{container.capacity}
          </div>
          <div className="text-xs font-medium text-gray-900">
            {container.occupancyPercent.toFixed(0)}%
          </div>
        </div>

        {/* Ícone de expandir */}
        <div className="flex justify-end">
          <Maximize2 className="w-3 h-3 text-gray-400" />
        </div>
      </div>
    </Card>
  );
}

function getProgressColor(percent: number): string {
  if (percent >= 100) return 'bg-red-600';
  if (percent >= 90) return 'bg-orange-500';
  if (percent >= 70) return 'bg-yellow-500';
  if (percent > 0) return 'bg-green-500';
  return 'bg-gray-400';
}
