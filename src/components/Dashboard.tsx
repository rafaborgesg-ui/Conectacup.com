import { useState, useEffect } from 'react';
import { Package, Activity, Trash2, TrendingUp, Calendar, ChevronDown, ChevronUp, Box, MapPin, UserX, User, Home } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ResponsiveTable, ResponsiveGrid } from './ResponsiveTable';
import { useTireStatus } from '../utils/TireStatusContext';
import { StatusBadge } from './StatusBadge';
import { createClient } from '../utils/supabase/client';
import { PageHeader } from './PageHeader';
import { EmptyState } from './EmptyState';
import { DashboardCharts } from './DashboardCharts';
import { DashboardCardSkeleton, PageSkeleton } from './LoadingSkeleton';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorState } from './ErrorState';
import { ContainerOccupancyMonitor } from './ContainerOccupancyMonitor';
import { AnimatedTransition, AnimatedList, AnimatedListItem } from './AnimatedTransition';
import { StatCard, StatCardSkeleton } from './StatCard';

interface StatCardData {
  title: string;
  value: number;
  changeLabel: string;
  icon: any;
  gradient: string;
  iconBg: string;
  accentColor: string; // Cor hex do status (ex: #3B82F6)
  containers?: number;
  type: 'total' | 'active' | 'new' | 'discard' | 'discard-pilot' | 'pilot' | string;
}

export function Dashboard() {
  const [stats, setStats] = useState<StatCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<'total' | 'active' | 'new' | 'discard' | 'discard-pilot' | 'pilot' | null>(null);
  const { statusList, getStatusByName } = useTireStatus();
  
  // States para dados da tabela detalhada
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [activeEntries, setActiveEntries] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [tireModels, setTireModels] = useState<any[]>([]);

  // Helper: Converte hex para rgba
  const hexToRgba = (hex: string, alpha: number = 1): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(156, 163, 175, ${alpha})`; // fallback cinza
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  useEffect(() => {
    loadDashboardData();

    // Atualiza quando houver mudanças
    const handleUpdate = () => loadDashboardData();
    window.addEventListener('stock-entries-updated', handleUpdate);
    window.addEventListener('tire-status-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('stock-entries-updated', handleUpdate);
      window.removeEventListener('tire-status-updated', handleUpdate);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const supabase = createClient();
      
      // Busca todos os pneus da tabela stock_entries
      // IMPORTANTE: Aumentado para 10000 para garantir que todos os registros sejam carregados
      console.log('🔄 Dashboard: Buscando stock_entries com LIMIT 10000');
      const { data: allEntries, error: allError } = await supabase
        .from('stock_entries')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(10000); // Limite aumentado para comportar todos os registros
      
      console.log(`✅ Dashboard: Query executada. Registros retornados: ${(allEntries || []).length}`);
      
      if (allError) {
        console.error('Erro ao buscar stock_entries:', allError);
        throw allError;
      }
      
      // Filtra pneus ativos (exclui descartados DSI - qualquer variação, mantém "Descarte Piloto")
      const activeEntries = (allEntries || []).filter(entry => 
        entry.status !== 'Descartado DSI' && 
        entry.status !== 'Descarte DSI' && 
        entry.status !== 'Descarte'
      );
      
      // Busca containers
      const { data: containers, error: containersError } = await supabase
        .from('containers')
        .select('*');
      
      if (containersError) {
        console.error('Erro ao buscar containers:', containersError);
      }
      
      // Busca tire_models
      const { data: tireModels, error: modelsError } = await supabase
        .from('tire_models')
        .select('*');
      
      if (modelsError) {
        console.error('Erro ao buscar tire_models:', modelsError);
      }

      // Busca status com ordem (com fallback se display_order não existir)
      let tireStatusData: any[] | null = null;
      let statusError: any = null;
      
      // Tenta buscar com display_order
      const result = await supabase
        .from('tire_status')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      
      tireStatusData = result.data;
      statusError = result.error;
      
      // Se der erro de coluna não existente, tenta sem display_order
      if (statusError && statusError.code === '42703') {
        console.warn('⚠️ Coluna display_order não existe. Executando fallback...');
        console.warn('📋 Execute: MIGRATION_ADD_DISPLAY_ORDER.sql no Supabase');
        
        const fallbackResult = await supabase
          .from('tire_status')
          .select('*')
          .order('name', { ascending: true });
        
        tireStatusData = fallbackResult.data;
        statusError = fallbackResult.error;
      }
      
      if (statusError) {
        console.error('❌ Erro ao buscar status:', statusError);
      }
      
      // DEBUG: Mostra status cadastrados na tabela tire_status
      console.log('\n📋 DEBUG - Status cadastrados na tabela tire_status:');
      (tireStatusData || []).forEach((status: any, index: number) => {
        console.log(`  ${index + 1}. "${status.name}" (length: ${status.name.length}, charCodes: ${Array.from(status.name).map((c: string) => c.charCodeAt(0)).join(',')})`);
      });
      
      // Salva nos states para uso na tabela detalhada
      setAllEntries(allEntries || []);
      setActiveEntries(activeEntries);
      setContainers(containers || []);
      setTireModels(tireModels || []);
      
      console.log('📊 Dashboard - Dados carregados do Supabase:');
      console.log('  - Total de entradas:', (allEntries || []).length);
      console.log('  - Entradas ativas:', activeEntries.length);
      console.log('  - Entradas descartadas:', ((allEntries || []).length - activeEntries.length));
      console.log('  - Containers:', (containers || []).length);
      console.log('  - Modelos de pneus:', (tireModels || []).length);
      console.log('  - Status:', (tireStatusData || []).length);
      
      // DEBUG: Mostra distribuição de status no banco
      console.log('\n📊 DEBUG - Distribuição de Status (TODOS os registros):');
      const statusDistribution = (allEntries || []).reduce((acc: any, entry) => {
        const status = entry.status || 'Sem Status';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      Object.entries(statusDistribution).forEach(([status, count]) => {
        console.log(`  "${status}": ${count} pneus (length: ${status.length}, charCodes: ${Array.from(status).map((c: string) => c.charCodeAt(0)).join(',')})`);
      });
      
      console.log('\n📊 DEBUG - Distribuição de Status (APENAS ATIVOS):');
      const activeStatusDistribution = activeEntries.reduce((acc: any, entry) => {
        const status = entry.status || 'Sem Status';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      Object.entries(activeStatusDistribution).forEach(([status, count]) => {
        console.log(`  "${status}": ${count} pneus`);
      });
      
      // DEBUG: Verifica se "Piloto" existe no banco
      const pilotoCount = (allEntries || []).filter(e => {
        const status = e.status || '';
        return status.toLowerCase().includes('piloto');
      }).length;
      console.log(`\n🔍 DEBUG - Pneus com "piloto" no status (case-insensitive): ${pilotoCount}`);

    // Total de pneus EXCLUINDO os descartados
    const totalPneus = activeEntries.length;

    // Containers com pneus ativos (excluindo descartados)
    // IMPORTANTE: Filtra apenas pneus que TÊM container_id válido (não NULL, não vazio)
    const containersWithActiveTires = new Set(
      activeEntries
        .filter(e => e.container_id != null && e.container_id !== '')
        .map(e => e.container_id)
    ).size;

    // CARD FIXO: Total de Pneus (sempre em primeiro)
    const statsData: StatCardData[] = [
      {
        title: 'Total de Pneus em estoque',
        value: totalPneus,
        changeLabel: 'em estoque ativo',
        icon: Package,
        gradient: 'from-blue-50 to-blue-100',
        iconBg: 'from-blue-500 to-blue-600',
        accentColor: 'blue',
        containers: containersWithActiveTires,
        type: 'total',
      },
    ];

    // CARDS DINÂMICOS: Baseados nos status cadastrados
    // Gera cards dinamicamente para cada status, seguindo a ordem definida
    console.log('\n🔍 DEBUG - Processando cards de status cadastrados:');
    if (tireStatusData && tireStatusData.length > 0) {
      tireStatusData.forEach((status: any) => {
        console.log(`\n  Status cadastrado: "${status.name}"`);
        
        // CORREÇÃO: Para status de descarte, usa allEntries (inclui descartados)
        // Para outros status, usa activeEntries (exclui descartados)
        const isDiscardStatus = status.name === 'Descartado DSI' || 
                                status.name === 'Descarte DSI' || 
                                status.name === 'Descarte';
        const entriesToCount = isDiscardStatus ? allEntries : activeEntries;
        
        // 🛡️ CORREÇÃO: Comparação mais robusta que ignora espaços extras
        const countWithStatus = (entriesToCount || []).filter(e => {
          const entryStatus = (e.status || '').trim();
          const statusName = (status.name || '').trim();
          return entryStatus === statusName;
        }).length;
        
        // Conta containers únicos com pneus deste status
        // Para descartados usa allEntries, para outros usa activeEntries
        // IMPORTANTE: Filtra apenas pneus que TÊM container_id válido (não NULL, não vazio)
        const containersWithStatus = new Set(
          entriesToCount
            .filter(e => {
              const entryStatus = (e.status || '').trim();
              const statusName = (status.name || '').trim();
              return entryStatus === statusName;
            })
            .filter(e => e.container_id != null && e.container_id !== '')
            .map(e => e.container_id)
        ).size;
        
        // Log de debug para validação
        const totalInDB = (allEntries || []).filter(e => {
          const entryStatus = (e.status || '').trim();
          const statusName = (status.name || '').trim();
          return entryStatus === statusName;
        }).length;
        const totalInActive = countWithStatus;
        const discarded = totalInDB - totalInActive;
        
        console.log(`    - Total no banco: ${totalInDB}`);
        console.log(`    - Em activeEntries: ${totalInActive}`);
        console.log(`    - Filtrados como descartados: ${discarded}`);
        console.log(`    - Containers: ${containersWithStatus}`);
        
        // DEBUG: Mostra alguns exemplos de entradas com esse status
        const examples = entriesToCount.filter(e => {
          const entryStatus = (e.status || '').trim();
          const statusName = (status.name || '').trim();
          return entryStatus === statusName;
        }).slice(0, 2);
        if (examples.length > 0) {
          console.log(`    - Exemplos:`, examples.map(e => ({ barcode: e.barcode, status: e.status })));
        }

        // Mapeamento de ícones padrão por status
        const getIconForStatus = (statusName: string) => {
          const lowerName = statusName.toLowerCase();
          if (lowerName.includes('novo')) return TrendingUp;
          if (lowerName.includes('cup') || lowerName.includes('ativo')) return Activity;
          if (lowerName.includes('descart')) return Trash2;
          if (lowerName.includes('piloto')) return User;
          return Box; // Ícone padrão
        };

        statsData.push({
          title: status.name,
          value: countWithStatus,
          changeLabel: `${countWithStatus} ${countWithStatus === 1 ? 'pneu' : 'pneus'}`,
          icon: getIconForStatus(status.name),
          gradient: '',  // Usaremos style inline
          iconBg: '',    // Usaremos style inline
          accentColor: status.color, // Mantém a cor hex completa
          containers: containersWithStatus,
          type: status.name.toLowerCase().replace(/\s+/g, '-') as any,
        });
      });
    }

      setStats(statsData);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="px-3 py-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
        {/* Page Header Skeleton */}
        <div className="space-y-3">
          <div className="h-8 w-1/3 bg-gray-200 rounded animate-shimmer" />
          <div className="h-4 w-1/2 bg-gray-200 rounded animate-shimmer" />
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>

        {/* Loading centralizado */}
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Carregando dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        icon={Home}
        title="Dashboard"
        description="Visão geral do estoque de pneus Conecta Cup"
        breadcrumbs={[
          { label: 'Dashboard' }
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            changeLabel={stat.changeLabel}
            icon={stat.icon}
            accentColor={stat.accentColor}
            iconBg={stat.iconBg}
            gradient={stat.gradient}
            containers={stat.containers}
            type={stat.type}
            onClick={() => setSelectedCard(selectedCard === stat.type ? null : stat.type as any)}
            isSelected={selectedCard === stat.type}
            variant="default"
            expandable={true}
          />
        ))}
      </div>

      {/* 📊 Gráficos Visuais */}
      {!selectedCard && allEntries.length > 0 && (
        <DashboardCharts 
          allEntries={allEntries}
          activeEntries={activeEntries}
          containers={containers}
          tireModels={tireModels}
        />
      )}

      {/* 📦 Monitor de Ocupação de Containers */}
      {!selectedCard && containers.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ContainerOccupancyMonitor 
            refreshInterval={30000}
            showHeader={true}
            compact={false}
          />
        </div>
      )}

      {/* Tabela Detalhada */}
      {selectedCard && (
        <Card className="p-0 bg-white border border-gray-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          {(() => {
            let filteredEntries = [];
            let title = '';
            let description = '';
            let statusColor = '';

            if (selectedCard === 'total') {
              filteredEntries = activeEntries;
              title = 'Total de Pneus em Estoque';
              description = 'Pneus ativos no sistema (excluindo descartados)';
              statusColor = '#3B82F6'; // Azul
            } else {
              // Busca o status correspondente ao card selecionado
              // O type é criado como status.name.toLowerCase().replace(/\s+/g, '-')
              // Então precisamos reverter essa transformação
              const statusName = stats.find(s => s.type === selectedCard)?.title;
              
              if (statusName) {
                // Para "Descartado" usa allEntries (inclui descartados), para outros usa allEntries
                const entriesToFilter = allEntries;
                
                // Compatibilidade retroativa: aceita variações do status de descarte
                if (statusName === 'Descartado DSI' || statusName === 'Descarte DSI') {
                  filteredEntries = entriesToFilter.filter(e => 
                    e.status === 'Descartado DSI' || 
                    e.status === 'Descarte DSI' || 
                    e.status === 'Descarte'
                  );
                } else {
                  filteredEntries = entriesToFilter.filter(e => e.status === statusName);
                }
                
                title = statusName;
                
                // Descrições customizadas baseadas no nome do status
                if (statusName === 'Novo') {
                  description = 'Estoque disponível para uso';
                } else if (statusName === 'Descartado DSI' || statusName === 'Descarte DSI') {
                  description = 'Pneus removidos do estoque ativo';
                } else if (statusName === 'Descarte Piloto') {
                  description = 'Pneus descartados por piloto';
                } else if (statusName === 'Piloto') {
                  description = 'Pneus de piloto';
                } else if (statusName.toLowerCase().includes('cup')) {
                  description = 'Pneus atualmente em uso';
                } else {
                  description = `Pneus com status: ${statusName}`;
                }
                
                // Cor do header baseada na cor do status
                statusColor = stats.find(s => s.type === selectedCard)?.accentColor || '#6B7280';
              }
            }

            // Debug: Log dos dados filtrados
            console.log('🔍 Dashboard - Filtro aplicado:', {
              selectedCard,
              title,
              totalEntries: filteredEntries.length,
              statusColor,
            });

            // Limita a 20 itens mais recentes
            const displayEntries = filteredEntries.slice(0, 20);

            return (
              <>
                {/* Header */}
                <div 
                  className="px-6 py-4 text-white"
                  style={{
                    background: `linear-gradient(to right, ${statusColor}, ${statusColor})`
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{title}</h3>
                      <p className="text-sm text-white/80">{description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{filteredEntries.length}</div>
                      <div className="text-sm text-white/80">
                        {displayEntries.length < filteredEntries.length && `Exibindo ${displayEntries.length}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabela */}
                <div className="overflow-x-auto">
                  {displayEntries.length === 0 ? (
                    <div className="p-12 text-center text-gray-600">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhum pneu encontrado nesta categoria</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Código
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Modelo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Container
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Localização
                          </th>
                          {selectedCard === 'active' && (
                            <>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Piloto
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Data Consumo
                              </th>
                            </>
                          )}
                          {(selectedCard === 'discard' || selectedCard === 'discard-pilot') && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                              Motivo
                            </th>
                          )}
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {displayEntries.map((entry, idx) => {
                          const container = containers.find(c => c.id === entry.container_id);
                          const model = tireModels.find(m => m.id === entry.model_id);

                          return (
                            <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-mono font-medium text-gray-900">
                                  {entry.barcode}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {model?.type || 'N/A'}
                                  </Badge>
                                  <span className="text-sm text-gray-900">{model?.name || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Box className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-900">{container?.name || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{container?.location || 'N/A'}</span>
                                </div>
                              </td>
                              {selectedCard === 'active' && (
                                <>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-gray-900">{entry.pilot || '-'}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-gray-600">
                                      {entry.created_at 
                                        ? new Date(entry.created_at).toLocaleDateString('pt-BR')
                                        : '-'}
                                    </span>
                                  </td>
                                </>
                              )}
                              {(selectedCard === 'discard' || selectedCard === 'discard-pilot') && (
                                <td className="px-6 py-4">
                                  <span className="text-sm text-gray-600">{entry.notes || '-'}</span>
                                </td>
                              )}
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <StatusBadge statusName={entry.status || 'Novo'} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Footer */}
                {filteredEntries.length > 20 && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
                    <p className="text-sm text-gray-600">
                      Exibindo os 20 registros mais recentes de {filteredEntries.length} total.
                      Para ver todos, acesse o módulo <strong>Relatórios & Histórico</strong>.
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </Card>
      )}

      {/* Informação adicional */}
      <Card className="p-6 bg-gradient-to-br from-gray-50 to-white border-gray-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-[#D50000] to-[#A80000] rounded-xl shadow-md">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              Sistema Integrado
            </h3>

          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Online
          </div>
        </div>
      </Card>
    </div>
  );
}
