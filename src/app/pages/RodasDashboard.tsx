import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, AlertTriangle, Mail } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { sanitizeFileName } from '../utils/stringUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { NovaAvariaModal } from '../components/NovaAvariaModal';
import { EnviarPlanilhaModal } from '../components/EnviarPlanilhaModal';

interface Season {
  id: string;
  name: string;
  year: number;
  status: 'active' | 'inactive';
}

interface SeasonStage {
  id: string;
  name: string;
  season_id: string;
  start_date: string;
  end_date: string;
}

interface Occurrence {
  id: string;
  stage_name: string;
  category: string;
  wheel_position: string;
  damage_type: string;
  destination: string;
  driver_name: string;
  driver_number: string;
  status: string;
  created_at: string;
  incident_date: string;
}

interface CategoryPositionData {
  category: string;
  position: string;
  count: number;
  wheels: string[];
}

export default function RodasDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryPositionData, setCategoryPositionData] = useState<CategoryPositionData[]>([]);
  
  // Filtros
  const [selectedStage, setSelectedStage] = useState('current'); // Alterado de 'all' para 'current'
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDestination, setSelectedDestination] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState('all');
  
  // Listas para filtros
  const [stages, setStages] = useState<SeasonStage[]>([]);
  const [drivers, setDrivers] = useState<string[]>([]);
  const [damageTypes, setDamageTypes] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [currentStage, setCurrentStage] = useState<SeasonStage | null>(null); // Etapa vigente
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Modal de envio de planilha
  const [isEnviarPlanilhaModalOpen, setIsEnviarPlanilhaModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedStage, selectedType, selectedDestination, selectedDriver]);

  async function loadData() {
    setLoading(true);
    try {
      // Carrega temporada ativa
      const { data: seasonData, error: seasonError } = await supabase
        .from('seasons')
        .select('*')
        .eq('status', 'active')
        .single();

      console.log('🏁 Temporada ativa:', seasonData);
      if (seasonError) console.log('❌ Erro temporada:', seasonError);

      setActiveSeason(seasonData);

      // Carrega TODAS as avarias aprovadas (não reprovadas)
      const { data: allOccurrences, error: occError } = await supabase
        .from('wheel_damage_occurrences')
        .select('*')
        .neq('status', 'rejected')
        .order('created_at', { ascending: false });

      console.log('🔄 Avarias carregadas:', allOccurrences?.length || 0);
      if (occError) console.error('❌ Erro ao carregar avarias:', occError);

      setOccurrences(allOccurrences || []);

      // Conta pendências (status = 'pending')
      const pending = (allOccurrences || []).filter(o => o.status === 'pending');
      setPendingCount(pending.length);
      console.log('⚠️ Pendências:', pending.length);

      // Extrai pilotos únicos
      const uniqueDrivers = [...new Set(allOccurrences?.map(o => o.driver_name).filter(Boolean))] as string[];
      setDrivers(uniqueDrivers.sort());
      console.log('👤 Pilotos únicos:', uniqueDrivers.length);

      // Extrai tipos de danos únicos
      const uniqueDamageTypes = [...new Set(allOccurrences?.map(o => o.damage_type).filter(Boolean))] as string[];
      setDamageTypes(uniqueDamageTypes.sort());
      console.log('🛠️ Tipos de danos únicos:', uniqueDamageTypes.length);

      // Extrai destinos únicos
      const uniqueDestinations = [...new Set(allOccurrences?.map(o => o.destination).filter(Boolean))] as string[];
      setDestinations(uniqueDestinations.sort());
      console.log('🚚 Destinos únicos:', uniqueDestinations.length);

      if (seasonData) {
        // Carrega etapas da temporada
        const { data: stagesData, error: stagesError } = await supabase
          .from('season_stages')
          .select('*')
          .eq('season_id', seasonData.id)
          .order('start_date', { ascending: true });

        console.log('📍 Etapas carregadas:', stagesData?.length || 0);
        if (stagesError) console.log('❌ Erro etapas:', stagesError);

        setStages(stagesData || []);

        // Determinar a etapa vigente (mais próxima da data atual, mas nunca futura)
        let vigente: SeasonStage | null = null;
        if (stagesData && stagesData.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const sortedStages = [...stagesData].sort((a, b) => 
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          );
          
          for (let i = sortedStages.length - 1; i >= 0; i--) {
            const stage = sortedStages[i];
            const startDate = new Date(stage.start_date);
            const endDate = new Date(stage.end_date);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            
            if (today >= startDate && today <= endDate) {
              vigente = stage;
              break;
            }
            
            if (startDate <= today) {
              vigente = stage;
              break;
            }
          }
          
          if (!vigente && sortedStages.length > 0) {
            vigente = sortedStages[0];
          }
        }
        
        setCurrentStage(vigente);
        console.log('📅 Etapa vigente:', vigente?.name);

        // Aplica filtros
        let filteredOccurrences = allOccurrences || [];
        
        // Filtro de etapa
        if (selectedStage === 'all') {
          // Mostra todas as avarias, sem filtro de etapa
          // filteredOccurrences já contém todas
        } else if (selectedStage !== 'current') {
          const selectedStageData = stagesData?.find(s => s.id === selectedStage);
          if (selectedStageData) {
            filteredOccurrences = filteredOccurrences.filter(o => o.stage_name === selectedStageData.name);
          }
        } else if (vigente) {
          // Filtra pela etapa vigente
          filteredOccurrences = filteredOccurrences.filter(o => o.stage_name === vigente.name);
        }

        // Filtro de tipo de avaria
        if (selectedType !== 'all') {
          filteredOccurrences = filteredOccurrences.filter(o => 
            o.damage_type === selectedType
          );
        }

        // Filtro de destino
        if (selectedDestination !== 'all') {
          filteredOccurrences = filteredOccurrences.filter(o => 
            o.destination?.toLowerCase() === selectedDestination.toLowerCase()
          );
        }

        // Filtro de piloto
        if (selectedDriver !== 'all') {
          filteredOccurrences = filteredOccurrences.filter(o => o.driver_name === selectedDriver);
        }

        console.log('🔍 Avarias após filtros:', filteredOccurrences.length);

        // Calcula avarias por categoria e posição (com base nos filtros)
        const categoryMap = new Map<string, CategoryPositionData>();
        
        filteredOccurrences.forEach(occ => {
          // Normaliza categoria para MAIÚSCULAS
          const categoryNormalized = (occ.category || 'SEM CATEGORIA').trim().toUpperCase();
          
          // Determina se é dianteira ou traseira
          const position = (occ.wheel_position || '').toLowerCase();
          let positionType = 'DESCONHECIDA';
          
          if (position.includes('dianteira')) {
            positionType = 'DIANTEIRA';
          } else if (position.includes('traseira')) {
            positionType = 'TRASEIRA';
          }
          
          const key = `${categoryNormalized}-${positionType}`;
          
          if (categoryMap.has(key)) {
            const existing = categoryMap.get(key)!;
            existing.count++;
            existing.wheels.push(occ.wheel_position);
          } else {
            categoryMap.set(key, {
              category: categoryNormalized,
              position: positionType,
              count: 1,
              wheels: [occ.wheel_position]
            });
          }
        });

        const categoryData = Array.from(categoryMap.values()).sort((a, b) => {
          // Ordena por categoria e depois por posição
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.position.localeCompare(b.position);
        });

        setCategoryPositionData(categoryData);
        console.log('📊 Categorias/Posições:', categoryData);

        // Calcula avarias por etapa (com dados reais)
        const stageCountMap = new Map<string, number>();
        
        (allOccurrences || []).forEach(occ => {
          const stageName = occ.stage_name;
          if (stageName) {
            stageCountMap.set(stageName, (stageCountMap.get(stageName) || 0) + 1);
          }
        });

        // Cria dados do gráfico baseado em TODAS as etapas que têm avarias
        // Agrega por nome curto para evitar chaves duplicadas
        const aggregatedData = new Map<string, number>();
        
        Array.from(stageCountMap.entries()).forEach(([stageName, count]) => {
          const shortName = stageName.split(' - ')[0]; // Pega apenas a primeira parte do nome
          const currentCount = aggregatedData.get(shortName) || 0;
          aggregatedData.set(shortName, currentCount + count);
        });
        
        const stageChartData = Array.from(aggregatedData.entries())
          .map(([name, count]) => ({
            name,
            avarias: count
          }))
          .sort((a, b) => a.name.localeCompare(b.name)); // Ordena alfabeticamente

        setChartData(stageChartData);
        console.log('📈 Gráfico de etapas:', stageChartData);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleNewOccurrence() {
    setIsModalOpen(true);
  }
  
  function handleModalSave() {
    // Recarrega dados após salvar
    loadData();
  }

  async function handleSendEmail(stageId: string, extraEmails: string[]) {
    setIsSendingEmail(true);
    
    try {
      console.log('📧 Gerando planilha e enviando por e-mail...');
      console.log('🎯 Etapa selecionada:', stageId);
      console.log('📬 Destinatários extras:', extraEmails);

      // 1. Buscar dados da etapa selecionada
      const selectedStageData = stages.find(s => s.id === stageId);
      if (!selectedStageData) {
        throw new Error('Etapa não encontrada');
      }

      // 2. Buscar avarias da etapa
      const { data: stageOccurrences, error: occError } = await supabase
        .from('wheel_damage_occurrences')
        .select('*')
        .eq('stage_name', selectedStageData.name)
        .neq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (occError) {
        console.error('❌ Erro ao buscar avarias:', occError);
        throw new Error('Erro ao buscar avarias: ' + occError.message);
      }

      if (!stageOccurrences || stageOccurrences.length === 0) {
        throw new Error('Nenhuma avaria encontrada para esta etapa');
      }

      console.log(`📊 ${stageOccurrences.length} avarias encontradas`);

      // 3. Gerar dados da planilha (usando biblioteca xlsx no frontend)
      const XLSX = await import('xlsx');
      const excelData: any[] = [];

      // Funções auxiliares
      const formatPosition = (position: string) => {
        const map: Record<string, string> = {
          dianteira: 'D',
          dianteira_direita: 'DD',
          dianteira_esquerda: 'DE',
          traseira: 'T',
          traseira_direita: 'TD',
          traseira_esquerda: 'TE',
        };
        return map[position] || position;
      };

      const formatSession = (session: string) => {
        const map: Record<string, string> = {
          free_practice: 'Treino Livre',
          qualifying: 'Classificação',
          race: 'Corrida',
          warm_up: 'Warm-up',
        };
        return map[session] || session || '-';
      };

      const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('pt-BR');
      };

      // Para cada avaria, gera linhas
      for (const occ of stageOccurrences) {
        const totalPhotos = occ.photo_urls?.length || 0;

        if (totalPhotos > 0) {
          // Uma linha para cada foto
          for (let i = 1; i <= totalPhotos; i++) {
            excelData.push({
              'Data Incidente': formatDate(occ.incident_date),
              'Data Relatório': formatDate(occ.created_at),
              'Etapa': occ.stage_name || '-',
              'Categoria': occ.category || '-',
              'Modelo': occ.car_generation || '-',
              'Número Piloto': occ.driver_number || '-',
              'Nome Piloto': occ.driver_name || '-',
              'Classe': occ.classe || '-',
              'Chassis': occ.chassis || '-',
              'Roda avariada': formatPosition(occ.wheel_position),
              'Cor da roda': occ.wheel_color || '-',
              'Serial number': occ.serial_number || '-',
              'Sessão': formatSession(occ.session),
              'Tipo Avaria': occ.damage_type?.replace('_', ' ').toUpperCase() || '-',
              'Nível empenamento': occ.warping_level || '-',
              'Ação Tomada': occ.action_taken || '-',
              'Destino': occ.destination || '-',
              'Observações': occ.observations || '-',
              'Legendas fotos': `${occ.line_code}.${i}`,
              'Índice Roda': occ.line_code,
              'Peças ADM': '',
            });
          }
        } else {
          // Sem fotos, uma linha
          excelData.push({
            'Data Incidente': formatDate(occ.incident_date),
            'Data Relatório': formatDate(occ.created_at),
            'Etapa': occ.stage_name || '-',
            'Categoria': occ.category || '-',
            'Modelo': occ.car_generation || '-',
            'Número Piloto': occ.driver_number || '-',
            'Nome Piloto': occ.driver_name || '-',
            'Classe': occ.classe || '-',
            'Chassis': occ.chassis || '-',
            'Roda avariada': formatPosition(occ.wheel_position),
            'Cor da roda': occ.wheel_color || '-',
            'Serial number': occ.serial_number || '-',
            'Sessão': formatSession(occ.session),
            'Tipo Avaria': occ.damage_type?.replace('_', ' ').toUpperCase() || '-',
            'Nível empenamento': occ.warping_level || '-',
            'Ação Tomada': occ.action_taken || '-',
            'Destino': occ.destination || '-',
            'Observações': occ.observations || '-',
            'Legendas fotos': '-',
            'Índice Roda': occ.line_code,
            'Peças ADM': '',
          });
        }
      }

      console.log(`📝 Gerando planilha com ${excelData.length} linhas...`);

      // 4. Gerar arquivo XLSX
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Avarias');

      // 5. Converter para base64
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      
      // 🔥 MELHORADO: Conversão mais robusta para base64
      let excelBase64: string;
      try {
        // Método mais confiável para converter ArrayBuffer para base64
        const uint8Array = new Uint8Array(excelBuffer);
        const chunks: string[] = [];
        const chunkSize = 0x8000; // 32KB chunks
        
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize);
          chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
        }
        
        excelBase64 = btoa(chunks.join(''));
        
        console.log(`📦 Planilha gerada: ${(uint8Array.length / 1024).toFixed(2)} KB`);
        console.log(`📦 Base64 gerado: ${(excelBase64.length / 1024).toFixed(2)} KB`);
        
        // ⚠️ Alerta se arquivo muito grande (Resend tem limite de 40MB)
        if (uint8Array.length > 10 * 1024 * 1024) {
          console.warn('⚠️ Arquivo muito grande! Pode ter problema no envio.');
        }
      } catch (conversionError) {
        console.error('❌ Erro ao converter para base64:', conversionError);
        throw new Error('Erro ao processar planilha. Tente com menos dados.');
      }

      console.log('📦 Planilha gerada e convertida para base64');

      // 6. Nome do arquivo
      // 🔥 Sanitiza nome removendo caracteres inválidos: : \ / ? * [ ]
      const sanitizedStageName = sanitizeFileName(selectedStageData.name).replace(/\s+/g, '_');
      const fileName = `Avarias_${sanitizedStageName}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;

      // 7. Chamar função SQL para enviar e-mail
      const { data, error } = await supabase.rpc('send_wheel_damage_report_email', {
        p_stage_id: stageId,
        p_extra_emails: extraEmails,
        p_excel_base64: excelBase64,
        p_filename: fileName
      });

      if (error) {
        console.error('❌ Erro ao enviar e-mail:', error);
        throw error;
      }

      console.log('✅ Resposta:', data);

      if (data.success) {
        alert(`✅ E-mail enviado com sucesso!\n\nDestinatários:\n${data.recipients.join('\n')}\n\nTotal de avarias: ${data.total_occurrences}`);
        setIsEnviarPlanilhaModalOpen(false);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao processar envio:', error);
      alert(`❌ Erro ao enviar e-mail:\n\n${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSendingEmail(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-gray-900 mb-1">DASHBOARD</h1>
          <p className="text-gray-600 text-sm">VISÃO GERAL DO SISTEMA DE AVARIAS DE RODAS</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsEnviarPlanilhaModalOpen(true)}
            className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Mail className="w-5 h-5" />
            ENVIAR PLANILHA
          </button>
          <button
            onClick={handleNewOccurrence}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            INICIAR NOVA OCORRÊNCIA
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div>
          <label className="block text-gray-700 text-sm mb-2">ETAPA:</label>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
          >
            <option value="all">TODAS</option>
            <option value="current">
              VIGENTE ({currentStage ? currentStage.name : 'Nenhuma'})
            </option>
            {stages.map(stage => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 text-sm mb-2">TIPO:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
          >
            <option value="all">TODOS</option>
            {damageTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 text-sm mb-2">DESTINO:</label>
          <select
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
          >
            <option value="all">TODOS</option>
            {destinations.map(destination => (
              <option key={destination} value={destination}>
                {destination}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 text-sm mb-2">PILOTO:</label>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
          >
            <option value="all">TODOS</option>
            {drivers.map(driver => (
              <option key={driver} value={driver}>
                {driver}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card de Pendências */}
      <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-600 rounded-lg p-6 mb-8">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
          <div>
            <h2 className="text-red-700 text-lg font-semibold mb-1 flex items-center gap-2">
              <span>⚠</span> PENDÊNCIAS
            </h2>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold text-red-600">{pendingCount}</span>
              <span className="text-gray-700">avarias aguardando aprovação do admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Avarias por Categoria e Posição */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-red-600 pl-3">
          AVARIAS POR CATEGORIA E POSIÇÃO
        </h2>
        
        {categoryPositionData.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">
              Nenhuma avaria encontrada com os filtros aplicados
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categoryPositionData.map((item, index) => (
              <div 
                key={index}
                className="bg-black border border-gray-800 rounded-lg p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-gray-400" />
                  <h3 className="text-white font-semibold text-sm">
                    {item.category} - {item.position}
                  </h3>
                </div>
                
                <div className="mb-2">
                  <span className="text-5xl font-bold text-white">{item.count}</span>
                </div>
                
                <p className="text-gray-400 text-xs uppercase">
                  RODAS
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gráfico */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">MÉDIA DE AVARIAS POR ETAPA</h2>
          <p className="text-gray-600 text-sm">TEMPORADA ATUAL</p>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280" 
                tick={{ fill: '#6b7280' }}
              />
              <YAxis 
                stroke="#6b7280" 
                tick={{ fill: '#6b7280' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#1f2937'
                }}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              />
              <Bar 
                dataKey="avarias" 
                fill="#dc2626" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modal */}
      <NovaAvariaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
      />
      
      {/* Modal de envio de planilha */}
      <EnviarPlanilhaModal
        isOpen={isEnviarPlanilhaModalOpen}
        onClose={() => setIsEnviarPlanilhaModalOpen(false)}
        stages={stages}
        onSend={handleSendEmail}
        isSending={isSendingEmail}
      />
    </div>
  );
}

export { RodasDashboard };