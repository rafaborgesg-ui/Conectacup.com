import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TrendingUp, Package, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

interface DashboardChartsProps {
  allEntries: any[];
  activeEntries: any[];
  containers: any[];
  tireModels: any[];
}

export function DashboardCharts({ allEntries, activeEntries, containers, tireModels }: DashboardChartsProps) {
  const [timeRange, setTimeRange] = useState<'7' | '30' | 'monthly'>('7');
  const [detailView, setDetailView] = useState(false);
  const [detailType, setDetailType] = useState<'slick' | 'wet' | 'all' | null>(null);
  const [modelChartView, setModelChartView] = useState<'simple' | 'stacked'>('simple');
  const [tireStatuses, setTireStatuses] = useState<{ id: string; name: string; color: string }[]>([]);

  // Carrega status cadastrados
  useEffect(() => {
    loadTireStatuses();
  }, []);

  const loadTireStatuses = async () => {
    try {
      const { createClient } = await import('../utils/supabase/client');
      const supabase = createClient();
      
      // COPIA EXATA DO REPORTS.TSX - Busca direto do Supabase
      const { data: statusData, error: statusError } = await supabase
        .from('tire_status')
        .select('id, name, color')
        .order('display_order', { ascending: true })
        .order('name');

      if (statusError) {
        console.error('❌ [DashboardCharts] Erro ao buscar status:', statusError);
        setTireStatuses([]);
      } else if (statusData && statusData.length > 0) {
        console.log('✅ [DashboardCharts] Status carregados (display_order):', 
          statusData.map((s: any, i: number) => `${i+1}. "${s.name}" → ${s.color}`)
        );
        setTireStatuses(statusData);
      } else {
        setTireStatuses([]);
      }
    } catch (error) {
      console.error('❌ [DashboardCharts] Erro ao carregar status:', error);
      setTireStatuses([]);
    }
  };

  // 📈 GRÁFICO DE LINHA: Entradas nos últimos dias ou meses
  const lineChartData = useMemo(() => {
    const today = new Date();
    const data = [];

    if (timeRange === 'monthly') {
      // Visualização Mensal: últimos 6 meses
      const monthsToShow = 6;
      
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
        
        const entriesInMonth = allEntries.filter(entry => {
          const entryDate = new Date(entry.created_at);
          return entryDate >= monthDate && entryDate < nextMonth;
        });

        data.push({
          date: monthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''),
          total: entriesInMonth.length,
          slick: entriesInMonth.filter(e => {
            const model = tireModels.find(m => m.id === e.model_id);
            return model?.type === 'Slick';
          }).length,
          wet: entriesInMonth.filter(e => {
            const model = tireModels.find(m => m.id === e.model_id);
            return model?.type === 'Wet';
          }).length,
        });
      }
    } else {
      // Visualização Diária: 7 ou 30 dias
      const days = parseInt(timeRange);
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const entriesOnDate = allEntries.filter(entry => {
          const entryDate = new Date(entry.created_at);
          return entryDate >= date && entryDate < nextDate;
        });

        data.push({
          date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          total: entriesOnDate.length,
          slick: entriesOnDate.filter(e => {
            const model = tireModels.find(m => m.id === e.model_id);
            return model?.type === 'Slick';
          }).length,
          wet: entriesOnDate.filter(e => {
            const model = tireModels.find(m => m.id === e.model_id);
            return model?.type === 'Wet';
          }).length,
        });
      }
    }

    return data;
  }, [allEntries, tireModels, timeRange]);

  // 📊 DADOS DETALHADOS: Por modelo de pneu
  const detailedChartData = useMemo(() => {
    if (!detailView || !detailType) return [];
    
    const today = new Date();
    const data = [];

    if (timeRange === 'monthly') {
      const monthsToShow = 6;
      
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
        
        const entriesInMonth = allEntries.filter(entry => {
          const entryDate = new Date(entry.created_at);
          const model = tireModels.find(m => m.id === entry.model_id);
          if (detailType === 'all') {
            return entryDate >= monthDate && entryDate < nextMonth;
          }
          return entryDate >= monthDate && entryDate < nextMonth && model?.type?.toLowerCase() === detailType;
        });

        const dataPoint: any = {
          date: monthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''),
        };

        // Agrupar por modelo
        const modelGroups: { [key: string]: number } = {};
        entriesInMonth.forEach(entry => {
          const model = tireModels.find(m => m.id === entry.model_id);
          if (model) {
            modelGroups[model.name] = (modelGroups[model.name] || 0) + 1;
          }
        });

        Object.keys(modelGroups).forEach(modelName => {
          dataPoint[modelName] = modelGroups[modelName];
        });

        data.push(dataPoint);
      }
    } else {
      const days = parseInt(timeRange);
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const entriesOnDate = allEntries.filter(entry => {
          const entryDate = new Date(entry.created_at);
          const model = tireModels.find(m => m.id === entry.model_id);
          if (detailType === 'all') {
            return entryDate >= date && entryDate < nextDate;
          }
          return entryDate >= date && entryDate < nextDate && model?.type?.toLowerCase() === detailType;
        });

        const dataPoint: any = {
          date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        };

        // Agrupar por modelo
        const modelGroups: { [key: string]: number } = {};
        entriesOnDate.forEach(entry => {
          const model = tireModels.find(m => m.id === entry.model_id);
          if (model) {
            modelGroups[model.name] = (modelGroups[model.name] || 0) + 1;
          }
        });

        Object.keys(modelGroups).forEach(modelName => {
          dataPoint[modelName] = modelGroups[modelName];
        });

        data.push(dataPoint);
      }
    }

    return data;
  }, [allEntries, tireModels, timeRange, detailView, detailType]);

  // Obter lista de modelos únicos para o tipo selecionado
  const uniqueModels = useMemo(() => {
    if (!detailType) return [];
    
    const models = new Set<string>();
    allEntries.forEach(entry => {
      const model = tireModels.find(m => m.id === entry.model_id);
      if (model) {
        if (detailType === 'all' || model.type?.toLowerCase() === detailType) {
          models.add(model.name);
        }
      }
    });
    return Array.from(models);
  }, [allEntries, tireModels, detailType]);

  // Cores para os modelos baseadas no tipo (laranja para Slick, azul para Wet)
  const getModelColor = (modelName: string): string => {
    const model = tireModels.find(m => m.name === modelName);
    const isSlick = model?.type?.toLowerCase() === 'slick';
    
    if (detailType === 'all') {
      // Para 'all', usar cores fixas por tipo
      const slickColors = ['#F97316', '#FB923C', '#FDBA74', '#FCD34D', '#FBBF24', '#F59E0B'];
      const wetColors = ['#3B82F6', '#60A5FA', '#93C5FD', '#7DD3FC', '#38BDF8', '#0EA5E9'];
      
      // Contar quantos modelos do mesmo tipo já foram processados
      const modelsOfSameType = uniqueModels.filter((m, idx) => {
        const mModel = tireModels.find(tm => tm.name === m);
        const isSameType = mModel?.type?.toLowerCase() === model?.type?.toLowerCase();
        return isSameType && uniqueModels.indexOf(m) < uniqueModels.indexOf(modelName);
      }).length;
      
      return isSlick 
        ? slickColors[modelsOfSameType % slickColors.length]
        : wetColors[modelsOfSameType % wetColors.length];
    } else if (detailType === 'slick') {
      const colors = ['#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#FCD34D', '#FBBF24'];
      const idx = uniqueModels.indexOf(modelName);
      return colors[idx % colors.length];
    } else {
      const colors = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#7DD3FC'];
      const idx = uniqueModels.indexOf(modelName);
      return colors[idx % colors.length];
    }
  };

  // 🥧 GRÁFICO DE PIZZA: Slick vs Wet (apenas ativos)
  const pieChartData = useMemo(() => {
    const slickCount = activeEntries.filter(entry => {
      const model = tireModels.find(m => m.id === entry.model_id);
      return model?.type === 'Slick';
    }).length;

    const wetCount = activeEntries.filter(entry => {
      const model = tireModels.find(m => m.id === entry.model_id);
      return model?.type === 'Wet';
    }).length;

    return [
      { name: 'Slick', value: slickCount, color: '#F97316' }, // Laranja
      { name: 'Wet', value: wetCount, color: '#3B82F6' },     // Azul
    ];
  }, [activeEntries, tireModels]);

  // 📊 GRÁFICO DE BARRAS SIMPLES: Top modelos (apenas ativos)
  const topModelsDataSimple = useMemo(() => {
    const modelCounts: { [key: string]: number } = {};
    
    activeEntries.forEach(entry => {
      const model = tireModels.find(m => m.id === entry.model_id);
      if (model) {
        const key = model.name;
        modelCounts[key] = (modelCounts[key] || 0) + 1;
      }
    });

    const sortedModels = Object.entries(modelCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count], index) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        fullName: name,
        quantidade: count,
        color: index === 0 ? '#D50000' : '#EF4444',
      }));

    return sortedModels;
  }, [activeEntries, tireModels]);

  // 📊 GRÁFICO DE BARRAS EMPILHADO: Top modelos com breakdown por status (apenas ativos)
  const topModelsDataStacked = useMemo(() => {
    // Agrupa por modelo
    const modelData: { [key: string]: { total: number; statusCounts: { [status: string]: number } } } = {};
    
    activeEntries.forEach(entry => {
      const model = tireModels.find(m => m.id === entry.model_id);
      if (model) {
        const modelName = model.name;
        // Normaliza status com trim igual ao Dashboard
        const status = (entry.status || 'Sem Status').trim();
        
        if (!modelData[modelName]) {
          modelData[modelName] = { total: 0, statusCounts: {} };
        }
        
        modelData[modelName].total += 1;
        modelData[modelName].statusCounts[status] = (modelData[modelName].statusCounts[status] || 0) + 1;
      }
    });

    // Converte para array e ordena por total
    const sortedModels = Object.entries(modelData)
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([name, data]) => {
        const displayName = name.length > 20 ? name.substring(0, 20) + '...' : name;
        const result: any = {
          name: displayName,
          fullName: name,
          total: data.total,
        };
        
        // Adiciona cada status como propriedade separada
        Object.entries(data.statusCounts).forEach(([status, count]) => {
          result[status] = count;
        });
        
        return result;
      });

    return sortedModels;
  }, [activeEntries, tireModels]);

  // 📋 Lista de status únicos encontrados nos modelos (ordenados pela tabela tire_status)
  const uniqueStatuses = useMemo(() => {
    // Pega todos os status que existem nas entries
    const statusSet = new Set<string>();
    
    activeEntries.forEach(entry => {
      const status = (entry.status || 'Sem Status').trim();
      statusSet.add(status);
    });
    
    const foundStatuses = Array.from(statusSet);
    
    // 🔥 FILTRA: Mostra APENAS status cadastrados na tabela tire_status
    const registeredStatuses = foundStatuses.filter(statusName => {
      return tireStatuses.some(s => s.name.trim() === statusName.trim());
    });
    
    // Ordena PELA ORDEM DA TABELA tire_status (display_order)
    const sortedStatuses = registeredStatuses.sort((a, b) => {
      const indexA = tireStatuses.findIndex(s => s.name.trim() === a.trim());
      const indexB = tireStatuses.findIndex(s => s.name.trim() === b.trim());
      return indexA - indexB;
    });
    
    console.log('✅ [DashboardCharts] Status exibidos no gráfico (apenas cadastrados):', sortedStatuses);
    
    return sortedStatuses;
  }, [activeEntries, tireStatuses]);

  // 📊 GRÁFICO DE BARRAS: Ocupação de contêineres
  const containerOccupancyData = useMemo(() => {
    return containers.map(container => {
      // Conta apenas pneus ativos neste container
      const tiresInContainer = activeEntries.filter(e => e.container_id === container.id).length;
      const percentage = container.capacity > 0 
        ? Math.round((tiresInContainer / container.capacity) * 100)
        : 0;

      return {
        name: container.name.length > 15 ? container.name.substring(0, 15) + '...' : container.name,
        fullName: container.name,
        ocupacao: percentage,
        atual: tiresInContainer,
        capacidade: container.capacity,
        color: percentage >= 90 ? '#DC2626' : percentage >= 70 ? '#F59E0B' : '#10B981',
      };
    }).sort((a, b) => b.ocupacao - a.ocupacao);
  }, [containers, activeEntries]);

  // Custom tooltip para gráficos
  const CustomTooltip = ({ active, payload, label, type }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Calcula total para percentuais
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => {
          if (!entry.value || entry.value === 0) return null;
          const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
          
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-semibold text-gray-900">
                {type === 'percent' ? `${entry.value}%` : entry.value}
              </span>
              {type !== 'percent' && (
                <span className="text-xs text-gray-500">({percentage}%)</span>
              )}
              {entry.payload.fullName && entry.payload.fullName !== label && (
                <span className="text-xs text-gray-500">({entry.payload.fullName})</span>
              )}
            </div>
          );
        })}
        {payload[0]?.payload?.atual !== undefined && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
            {payload[0].payload.atual} / {payload[0].payload.capacidade} pneus
          </div>
        )}
        {payload[0]?.payload?.total !== undefined && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs font-semibold text-gray-700">
            Total: {payload[0].payload.total} pneus
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Título da Seção */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-[#D50000] to-[#B00000] rounded-lg">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Análise Visual</h2>
          <p className="text-sm text-gray-500">Gráficos e estatísticas do estoque</p>
        </div>
      </div>

      {/* Grid de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* 📈 GRÁFICO 1: Entradas ao longo do tempo */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#D50000]" />
              <h3 className="font-semibold text-gray-900">
                Entradas de Pneus
                {detailView && detailType && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    → Detalhes {detailType === 'slick' ? 'Slick' : detailType === 'wet' ? 'Wet' : 'Todos'}
                  </span>
                )}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {detailView && (
                <button
                  onClick={() => {
                    setDetailView(false);
                    setDetailType(null);
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                  ← Voltar
                </button>
              )}
              <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as '7' | '30' | 'monthly')} className="w-auto">
                <TabsList className="grid w-[270px] grid-cols-3 h-8">
                  <TabsTrigger value="7" className="text-xs">7 dias</TabsTrigger>
                  <TabsTrigger value="30" className="text-xs">30 dias</TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs">Mensal</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            {detailView ? (
              <BarChart data={detailedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip content={<CustomTooltip type="number" />} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="square"
                />
                {uniqueModels.map((modelName, index) => (
                  <Bar 
                    key={modelName}
                    dataKey={modelName} 
                    stackId="a"
                    fill={getModelColor(modelName)}
                    name={modelName}
                    radius={index === uniqueModels.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    onClick={() => {
                      setDetailView(false);
                      setDetailType(null);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </BarChart>
            ) : (
              <BarChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip content={<CustomTooltip type="number" />} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="square"
                />
                <Bar 
                  dataKey="slick" 
                  stackId="a"
                  fill="#F97316"
                  name="Slick"
                  radius={[0, 0, 0, 0]}
                  onClick={() => {
                    setDetailView(true);
                    setDetailType('slick');
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <Bar 
                  dataKey="wet" 
                  stackId="a"
                  fill="#3B82F6"
                  name="Wet"
                  radius={[4, 4, 0, 0]}
                  onClick={() => {
                    setDetailView(true);
                    setDetailType('wet');
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            )}
          </ResponsiveContainer>

          {!detailView && (
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div 
                className="cursor-pointer hover:bg-red-50 rounded-lg p-2 transition-colors"
                onClick={() => {
                  setDetailView(true);
                  setDetailType('all');
                }}
                title="Clique para ver detalhes de todos os modelos"
              >
                <p className="text-xs text-gray-500">Total 🔍</p>
                <p className="text-lg font-bold text-[#D50000]">
                  {lineChartData.reduce((sum, day) => sum + day.total, 0)}
                </p>
              </div>
              <div 
                className="cursor-pointer hover:bg-orange-50 rounded-lg p-2 transition-colors"
                onClick={() => {
                  setDetailView(true);
                  setDetailType('slick');
                }}
                title="Clique para ver detalhes por modelo"
              >
                <p className="text-xs text-gray-500">Slick 🔍</p>
                <p className="text-lg font-bold text-[#F97316]">
                  {lineChartData.reduce((sum, day) => sum + day.slick, 0)}
                </p>
              </div>
              <div 
                className="cursor-pointer hover:bg-blue-50 rounded-lg p-2 transition-colors"
                onClick={() => {
                  setDetailView(true);
                  setDetailType('wet');
                }}
                title="Clique para ver detalhes por modelo"
              >
                <p className="text-xs text-gray-500">Wet 🔍</p>
                <p className="text-lg font-bold text-[#3B82F6]">
                  {lineChartData.reduce((sum, day) => sum + day.wet, 0)}
                </p>
              </div>
            </div>
          )}

          {detailView && (
            <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">
                💡 Dica: Clique nas barras ou no botão "Voltar" para retornar à visão geral
              </p>
              <p className="text-xs text-gray-500">
                Mostrando {uniqueModels.length} modelo(s) de pneu {
                  detailType === 'slick' ? 'Slick' : 
                  detailType === 'wet' ? 'Wet' : 
                  '(Slick + Wet)'
                }
              </p>
            </div>
          )}
        </Card>

        {/* 🥧 GRÁFICO 2: Distribuição Slick vs Wet */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-[#D50000]" />
            <h3 className="font-semibold text-gray-900">Distribuição por Tipo</h3>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip type="number" />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {pieChartData.map((item) => (
              <div key={item.name} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="text-xs text-gray-600">{item.name}</p>
                </div>
                <p className="text-2xl font-bold" style={{ color: item.color }}>
                  {item.value}
                </p>
                <p className="text-xs text-gray-500">
                  {((item.value / activeEntries.length) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* 📊 GRÁFICO 3: Modelos de Pneus (Simples/Empilhado) */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#D50000]" />
              <h3 className="font-semibold text-gray-900 transition-all duration-300">
                Modelos de Pneus
                {modelChartView === 'stacked' && (
                  <span className="text-sm font-normal text-gray-500 ml-2 animate-fade-in">• Por Status</span>
                )}
              </h3>
            </div>
            <button
              onClick={() => setModelChartView(modelChartView === 'simple' ? 'stacked' : 'simple')}
              className="px-3 py-1.5 text-xs bg-gradient-to-r from-[#D50000] to-[#EF4444] hover:from-[#B50000] hover:to-[#D50000] text-white rounded-lg transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow-md active:scale-95"
            >
              {modelChartView === 'simple' ? (
                <>
                  <BarChart3 className="w-3.5 h-3.5" />
                  Ver por Status
                </>
              ) : (
                <>
                  <Package className="w-3.5 h-3.5" />
                  Ver Simples
                </>
              )}
            </button>
          </div>

          <div className="transition-opacity duration-300" key={modelChartView}>
            {modelChartView === 'simple' ? (
              // 🔹 VISUALIZAÇÃO SIMPLES: Total por Modelo
              topModelsDataSimple.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                <BarChart 
                  data={topModelsDataSimple}
                  layout="vertical"
                  margin={{ top: 5, right: 40, left: 5, bottom: 5 }}
                  onClick={() => setModelChartView('stacked')}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    type="number"
                    stroke="#6B7280"
                    style={{ fontSize: '12px' }}
                    allowDecimals={false}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    stroke="#6B7280"
                    style={{ fontSize: '10px' }}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip type="number" />} />
                  <Bar 
                    dataKey="quantidade"
                    radius={[0, 4, 4, 0]}
                    name="Quantidade"
                  >
                    {topModelsDataSimple.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#D50000'} />
                    ))}
                    {/* Total dentro da barra (branco) */}
                    <LabelList 
                      dataKey="quantidade" 
                      position="insideRight"
                      content={(props: any) => {
                        const { x, y, width, value } = props;
                        const barWidth = width || 0;
                        const minWidthForInside = 40;
                        const isInside = barWidth > minWidthForInside;
                        
                        return (
                          <text
                            x={isInside ? x + barWidth - 8 : x + barWidth + 8}
                            y={y + 17}
                            fill={isInside ? '#FFFFFF' : '#000000'}
                            textAnchor={isInside ? 'end' : 'start'}
                            fontSize="12px"
                            fontWeight="600"
                          >
                            {value}
                          </text>
                        );
                      }}
                    />
                    {/* Percentual fora da barra (cinza) */}
                    <LabelList 
                      dataKey="quantidade" 
                      position="right"
                      content={(props: any) => {
                        const { x, y, width, value } = props;
                        const barWidth = width || 0;
                        
                        // Calcula percentual
                        const total = activeEntries.length;
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                        
                        return (
                          <text
                            x={x + barWidth + 8}
                            y={y + 17}
                            fill="#6B7280"
                            textAnchor="start"
                            fontSize="12px"
                            fontWeight="600"
                          >
                            {percentage}%
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum dado disponível</p>
                  <p className="text-xs mt-1">Adicione pneus ao estoque para visualizar</p>
                </div>
              </div>
            )
          ) : tireStatuses.length === 0 ? (
            // 🔄 LOADING: Aguardando status serem carregados
            <div className="h-[350px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-30 animate-pulse" />
                <p className="text-sm">Carregando status...</p>
              </div>
            </div>
          ) : (
            // 🔹 VISUALIZAÇÃO EMPILHADA: Breakdown por Status
            topModelsDataStacked.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart 
                  data={topModelsDataStacked}
                  layout="vertical"
                  margin={{ top: 5, right: 80, left: 5, bottom: 5 }}
                  onClick={() => setModelChartView('simple')}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    type="number"
                    stroke="#6B7280"
                    style={{ fontSize: '12px' }}
                    allowDecimals={false}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    stroke="#6B7280"
                    style={{ fontSize: '10px' }}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip type="number" />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    iconType="square"
                  />
                  
                  {/* Renderiza uma barra para cada status */}
                  {uniqueStatuses.map((statusName, index) => {
                    // Busca com match robusto (trim) igual ao Dashboard
                    const statusInfo = tireStatuses.find(s => s.name.trim() === statusName.trim());
                    const color = statusInfo?.color || '#6B7280';
                    const isLast = index === uniqueStatuses.length - 1;

                    
                    return (
                      <Bar 
                        key={statusName}
                        dataKey={statusName}
                        stackId="a"
                        fill={color}
                        name={statusName}
                        radius={isLast ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                      >
                        <LabelList 
                          dataKey={statusName}
                          position="center"
                          content={(props: any) => {
                            const { x, y, width, value, index: barIndex } = props;
                            if (!value || value === 0) return null;
                            
                            const barWidth = width || 0;
                            const minWidthForLabel = 35;
                            
                            if (barWidth < minWidthForLabel) return null;
                            
                            // Calcula percentual
                            const modelData = topModelsDataStacked[barIndex];
                            const total = modelData?.total || 0;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : '0';
                            
                            return (
                              <text
                                x={x + barWidth / 2}
                                y={y + 17}
                                fill="#FFFFFF"
                                textAnchor="middle"
                                fontSize="11px"
                                fontWeight="600"
                              >
                                {value} ({percentage}%)
                              </text>
                            );
                          }}
                        />
                        
                        {/* Label com total APENAS na última barra do stack */}
                        {isLast && (
                          <LabelList 
                            dataKey={statusName}
                            position="right"
                            content={(props: any) => {
                              const { x, y, width, index: barIndex } = props;
                              const modelData = topModelsDataStacked[barIndex];
                              const total = modelData?.total || 0;
                              
                              // Calcula a posição total do stack (x + width da última barra)
                              const stackEndX = x + (width || 0);
                              
                              return (
                                <text
                                  x={stackEndX + 8}
                                  y={y + 17}
                                  fill="#000000"
                                  textAnchor="start"
                                  fontSize="13px"
                                  fontWeight="700"
                                >
                                  {total}
                                </text>
                              );
                            }}
                          />
                        )}
                      </Bar>
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum dado disponível</p>
                  <p className="text-xs mt-1">Adicione pneus ao estoque para visualizar</p>
                </div>
              </div>
            )
          )}

          </div>
        </Card>

        {/* 📊 GRÁFICO 4: Ocupação de Contêineres */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-[#D50000]" />
            <h3 className="font-semibold text-gray-900">Ocupação de Contêineres</h3>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={containerOccupancyData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                type="number"
                domain={[0, 100]}
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                label={{ value: '%', position: 'insideRight' }}
              />
              <YAxis 
                type="category"
                dataKey="name"
                stroke="#6B7280"
                style={{ fontSize: '11px' }}
                width={80}
              />
              <Tooltip content={<CustomTooltip type="percent" />} />
              <Bar 
                dataKey="ocupacao" 
                fill="#10B981"
                radius={[0, 4, 4, 0]}
                name="Ocupação"
              >
                {containerOccupancyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {containerOccupancyData.slice(0, 3).map((container, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: container.color }}
                  />
                  <span className="text-gray-700">{container.fullName}</span>
                </div>
                <span className="font-semibold" style={{ color: container.color }}>
                  {container.ocupacao}%
                </span>
              </div>
            ))}
            
            {/* Alerta de containers cheios */}
            {containerOccupancyData.some(c => c.ocupacao >= 90) && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-semibold text-red-900 mb-1">
                  ⚠️ Atenção: Contêineres quase cheios
                </p>
                <p className="text-xs text-red-700">
                  {containerOccupancyData.filter(c => c.ocupacao >= 90).length} contêiner(es) 
                  com ocupação ≥ 90%
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Resumo Estatístico */}
      <Card className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-white">
        <h3 className="font-semibold text-gray-900 mb-4">📊 Resumo Estatístico</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">
              {timeRange === 'monthly' ? 'Média de Entradas/Mês' : 'Média de Entradas/Dia'}
            </p>
            <p className="text-2xl font-bold text-[#D50000]">
              {Math.round(lineChartData.reduce((sum, day) => sum + day.total, 0) / lineChartData.length) || 0}
            </p>
          </div>

          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Ocupação Média</p>
            <p className="text-2xl font-bold text-[#F59E0B]">
              {Math.round(containerOccupancyData.reduce((sum, c) => sum + c.ocupacao, 0) / containerOccupancyData.length)}%
            </p>
          </div>

          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Modelos Ativos</p>
            <p className="text-2xl font-bold text-[#10B981]">
              {new Set(activeEntries.map(e => e.model_id)).size}
            </p>
          </div>

          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Contêineres em Uso</p>
            <p className="text-2xl font-bold text-[#3B82F6]">
              {new Set(activeEntries.filter(e => e.container_id).map(e => e.container_id)).size}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
