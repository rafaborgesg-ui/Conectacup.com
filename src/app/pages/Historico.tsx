import { useState, useEffect } from 'react';
import { FileText, Calendar, Car, CheckCircle, AlertTriangle, Search, Download, ChevronRight, ChevronDown, Eye } from 'lucide-react';
import { getTireCheckSessions } from '../utils/tireCheckSupabase';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TireData {
  posicao: string;
  codigo: string;
  piloto: string;
  ano?: string;
  set?: string;
  tipo?: string;
  voltas?: string;
  situacao: string;
  validacao?: string;
  divergencia?: boolean;
  pilotoInvalido?: boolean;
}

interface TireSet {
  jogo: number;
  label: string;
  montadoNoCarro: boolean;
  tires: TireData[];
}

interface ChassisConferenceData {
  chassis: string;
  piloto: string;
  corrida: string;
  categoria: string;
  sheetName: string;
  tiresChecked: number;
  tireSets: TireSet[];
}

interface TireCheckSession {
  id: string;
  season_name: string;
  stage_name: string;
  check_date: string;
  chassis_data: ChassisConferenceData[];
  created_by: string;
  created_at: string;
}

interface GroupedSessions {
  [seasonName: string]: {
    [stageName: string]: TireCheckSession[];
  };
}

export default function Historico() {
  const [sessions, setSessions] = useState<TireCheckSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [selectedSession, setSelectedSession] = useState<TireCheckSession | null>(null);
  const [selectedChassisIndex, setSelectedChassisIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const data = await getTireCheckSessions();
      
      console.log('🔍 Dados brutos recebidos:', data.length, 'sessões');
      console.log('🔍 Todas as sessões:', data.map(s => ({
        id: s.id,
        temporada: s.season_name,
        etapa: s.stage_name,
        chassis: s.chassis_data.length,
        data: s.check_date,
        created_at: s.created_at
      })));
      
      // 🔥 REMOVIDA A DEDUPLICAÇÃO - Todas as sessões são legítimas
      // Se foram salvas em momentos diferentes, são conferências distintas
      
      console.log('📋 SESSÕES CARREGADAS:', data.length);
      console.log('📊 DETALHAMENTO POR SESSÃO:', data.map(s => ({
        id: s.id,
        temporada: s.season_name,
        etapa: s.stage_name,
        chassis: s.chassis_data.length,
        data: s.check_date,
        lista_chassis: s.chassis_data.map(c => `${c.chassis}|${c.piloto}`)
      })));
      
      setSessions(data);
      console.log('✅ Conferências carregadas:', data.length);
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de conferências');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    // Implementar filtro por data futuramente
    toast.info('Filtro por data em desenvolvimento');
  };

  // Agrupa sessões por temporada e etapa
  const groupedSessions = sessions.reduce<GroupedSessions>((acc, session) => {
    const season = session.season_name;
    const stage = session.stage_name;
    
    if (!acc[season]) {
      acc[season] = {};
    }
    
    if (!acc[season][stage]) {
      acc[season][stage] = [];
    }
    
    acc[season][stage].push(session);
    
    return acc;
  }, {});

  // Calcula estatísticas totais
  const totalStages = Object.values(groupedSessions).reduce(
    (acc, stages) => acc + Object.keys(stages).length,
    0
  );

  // 🔥 CONTAGEM CORRETA: Chassis únicos globalmente (sem duplicatas entre sessões)
  const uniqueChassisSet = new Set<string>();
  const chassisTiresMap = new Map<string, number>(); // 🔥 NOVO: Mapa para guardar pneus por chassis único
  
  sessions.forEach(session => {
    session.chassis_data.forEach(chassis => {
      const chassisKey = `${chassis.chassis}|${chassis.piloto}`;
      uniqueChassisSet.add(chassisKey);
      // 🔥 NOVO: Guarda o número de pneus do chassis (sobrescreve se já existe)
      chassisTiresMap.set(chassisKey, chassis.tiresChecked);
    });
  });
  
  const totalChassis = uniqueChassisSet.size;
  
  // 🔥 CORREÇÃO: Soma pneus apenas de chassis únicos (não duplica entre sessões)
  const totalTires = Array.from(chassisTiresMap.values()).reduce(
    (sum, tires) => sum + tires,
    0
  );
  
  console.log('🎯 CHASSIS ÚNICOS GLOBALMENTE:', {
    total_sessoes: sessions.length,
    chassis_unicos: totalChassis,
    lista_chassis_unicos: Array.from(uniqueChassisSet)
  });

  console.log('🎯 PNEUS ÚNICOS GLOBALMENTE:', {
    total_chassis_unicos: totalChassis,
    total_pneus: totalTires,
    media_pneus_por_chassis: (totalTires / totalChassis).toFixed(2)
  });

  const completionRate = 100; // Taxa de conclusão fixa para este exemplo

  const toggleSeason = (seasonName: string) => {
    const newExpanded = new Set(expandedSeasons);
    if (newExpanded.has(seasonName)) {
      newExpanded.delete(seasonName);
    } else {
      newExpanded.add(seasonName);
    }
    setExpandedSeasons(newExpanded);
  };

  const toggleStage = (stageKey: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageKey)) {
      newExpanded.delete(stageKey);
    } else {
      newExpanded.add(stageKey);
    }
    setExpandedStages(newExpanded);
  };

  const viewSessionDetails = (session: TireCheckSession, chassisIndex: number) => {
    setSelectedSession(session);
    setSelectedChassisIndex(chassisIndex);
    setShowModal(true);
  };

  const exportChassisToPDF = (chassis: ChassisConferenceData, sessionDate: string) => {
    const doc = new jsPDF();
    let yPos = 15;

    // Header com cores Porsche
    doc.setFillColor(213, 0, 0); // Vermelho Porsche
    doc.rect(0, 0, 210, 35, 'F');

    // Logo/Título
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('CONECTA CUP', 15, 15);
    
    doc.setFontSize(12);
    doc.text('Relatório de Conferência de Pneus', 15, 23);
    
    // Data
    doc.setFontSize(10);
    doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, 15, 30);

    yPos = 45;

    // Informações do Chassis
    doc.setFillColor(243, 244, 246);
    doc.rect(15, yPos, 180, 25, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text(`Chassis: ${chassis.chassis}`, 20, yPos + 8);
    
    doc.setFontSize(11);
    doc.text(`Piloto: ${chassis.piloto}`, 20, yPos + 16);
    doc.text(`Data Conferência: ${formatDate(sessionDate)}`, 105, yPos + 16);
    
    doc.setFontSize(10);
    doc.text(`Total de Pneus: ${chassis.tiresChecked}`, 20, yPos + 22);

    yPos += 35;

    // Tabela de Pneus por Jogo
    (chassis.tireSets || []).forEach((tireSet, setIdx) => {
      // Verifica se precisa de nova página
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Título do Jogo
      doc.setFillColor(239, 68, 68); // Vermelho mais claro
      doc.rect(15, yPos, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(`Jogo ${tireSet.jogo}${tireSet.montadoNoCarro ? ' • Montado no carro' : ''}`, 20, yPos + 5.5);
      
      yPos += 10;

      // Dados da tabela
      const tableData = tireSet.tires.map(tire => ({
        codigo: tire.codigo,
        posicao: tire.posicao,
        piloto: tire.piloto,
        ano: tire.ano || '-',
        set: tire.set || '-',
        lado: tire.posicao?.includes('D') ? 'Dir' : 'Esq',
        tipo: tire.tipo || '-',
        voltas: tire.voltas || '-',
        situacao: tire.situacao,
        validacao: tire.validacao && tire.validacao !== 'OK' ? tire.validacao : 'OK',
        divergencia: tire.divergencia
      }));

      autoTable(doc, {
        startY: yPos,
        head: [['Código', 'Pos', 'Piloto', 'Ano', 'Set', 'Lado', 'Tipo', 'Voltas', 'Situação', 'Validação']],
        body: tableData.map(t => [
          t.codigo, t.posicao, t.piloto, t.ano, t.set, t.lado, t.tipo, t.voltas, t.situacao, t.validacao
        ]),
        margin: { left: 15, right: 15 },
        headStyles: { 
          fillColor: [55, 65, 81],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: { 
          fontSize: 8,
          textColor: [55, 65, 81]
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 12 },
          2: { cellWidth: 25 },
          3: { cellWidth: 12 },
          4: { cellWidth: 12 },
          5: { cellWidth: 12 },
          6: { cellWidth: 15 },
          7: { cellWidth: 15 },
          8: { cellWidth: 20 },
          9: { cellWidth: 22 }
        },
        didParseCell: (data) => {
          // Destaca linhas com divergência em amarelo
          if (data.section === 'body' && tableData[data.row.index].divergencia) {
            data.cell.styles.fillColor = [254, 243, 199]; // Amarelo
          }
          
          // Cores para situação
          if (data.section === 'body' && data.column.index === 8) {
            const situacao = data.cell.text[0];
            if (situacao === 'Guardar') {
              data.cell.styles.textColor = [6, 95, 70];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [153, 27, 27];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          
          // Cores para validação
          if (data.section === 'body' && data.column.index === 9) {
            const validacao = data.cell.text[0];
            if (validacao === 'OK') {
              data.cell.styles.textColor = [6, 95, 70];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [153, 27, 27];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
      doc.text('Conecta Cup - Sistema de Gestão de Pneus', 105, 285, { align: 'center' });
    }

    doc.save(`Chassis_${chassis.chassis}_${chassis.piloto.replace(/\s/g, '_')}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  const exportAllToPDF = () => {
    const doc = new jsPDF();
    let yPos = 15;

    // Header com cores Porsche
    doc.setFillColor(213, 0, 0);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('CONECTA CUP', 15, 15);
    
    doc.setFontSize(12);
    doc.text('Relatório Geral de Conferências', 15, 23);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, 15, 30);

    yPos = 45;

    // Estatísticas Gerais
    doc.setFillColor(243, 244, 246);
    doc.rect(15, yPos, 180, 30, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Resumo Geral', 20, yPos + 8);
    
    doc.setFontSize(10);
    doc.text(`Total de Etapas: ${totalStages}`, 20, yPos + 16);
    doc.text(`Total de Chassis: ${totalChassis}`, 70, yPos + 16);
    doc.text(`Total de Pneus: ${totalTires}`, 130, yPos + 16);
    doc.text(`Taxa de Conclusão: 100%`, 20, yPos + 24);

    yPos += 40;

    // Lista de Conferências por Temporada/Etapa
    Object.entries(groupedSessions).forEach(([seasonName, stages]) => {
      // Temporada
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFillColor(213, 0, 0);
      doc.rect(15, yPos, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(seasonName, 20, yPos + 5.5);
      
      yPos += 10;

      // Etapas
      Object.entries(stages).forEach(([stageName, stageSessions]) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFillColor(239, 68, 68);
        doc.rect(15, yPos, 180, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.text(`Etapa - ${stageName}`, 20, yPos + 4.5);
        
        yPos += 9;

        // Tabela de Chassis
        const tableData = stageSessions.flatMap(session =>
          session.chassis_data.map(chassis => {
            const divergencias = (chassis.tireSets || []).reduce(
              (sum, set) => sum + set.tires.filter(t => t.divergencia).length,
              0
            );
            return {
              chassis: chassis.chassis,
              piloto: chassis.piloto,
              pneus: chassis.tiresChecked,
              data: formatDate(session.check_date),
              divergencias: divergencias
            };
          })
        );

        autoTable(doc, {
          startY: yPos,
          head: [['Chassis', 'Piloto', 'Pneus', 'Data Conferência', 'Divergências']],
          body: tableData.map(d => [
            d.chassis,
            d.piloto,
            d.pneus.toString(),
            d.data,
            d.divergencias > 0 ? `${d.divergencias}` : 'Nenhuma'
          ]),
          margin: { left: 15, right: 15 },
          headStyles: {
            fillColor: [55, 65, 81],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: 9,
            textColor: [55, 65, 81]
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251]
          },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 45 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 45 },
            4: { cellWidth: 35, halign: 'center' }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
              const divergencias = tableData[data.row.index].divergencias;
              if (divergencias > 0) {
                data.cell.styles.textColor = [153, 27, 27];
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.textColor = [6, 95, 70];
              }
            }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      });
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
      doc.text('Conecta Cup - Sistema de Gestão de Pneus', 105, 285, { align: 'center' });
    }

    doc.save(`Relatorio_Geral_Conferencias_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh' }}>
      {/* Header */}
      <div 
        className="border-b"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)',
          borderColor: '#E5E7EB'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
                boxShadow: '0 4px 12px rgba(213, 0, 0, 0.25)'
              }}
            >
              <FileText size={24} strokeWidth={2} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Histórico de Conferências
              </h1>
              <p className="text-gray-500 mt-1">
                Visualize todas as etapas e conferências de pneus realizadas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div 
            className="rounded-xl border p-4"
            style={{ background: '#FEF2F2', borderColor: '#FEE2E2' }}
          >
            <div className="text-xs font-medium text-gray-600 mb-1">TOTAL ETAPAS</div>
            <div className="text-2xl font-bold text-gray-900">{totalStages}</div>
          </div>

          <div 
            className="rounded-xl border p-4"
            style={{ background: '#FFF7ED', borderColor: '#FFEDD5' }}
          >
            <div className="text-xs font-medium text-gray-600 mb-1">TOTAL CHASSIS</div>
            <div className="text-2xl font-bold text-gray-900">{totalChassis}</div>
          </div>

          <div 
            className="rounded-xl border p-4"
            style={{ background: '#F0FDF4', borderColor: '#DCFCE7' }}
          >
            <div className="text-xs font-medium text-gray-600 mb-1">TOTAL PNEUS</div>
            <div className="text-2xl font-bold text-gray-900">{totalTires}</div>
          </div>

          <div 
            className="rounded-xl border p-4"
            style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}
          >
            <div className="text-xs font-medium text-gray-600 mb-1">TAXA CONCLUSÃO</div>
            <div className="text-2xl font-bold text-gray-900">{completionRate}%</div>
          </div>
        </div>

        {/* Filtros */}
        <div 
          className="rounded-xl border p-6 mb-6"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Search size={20} className="text-gray-400" />
            <h3 className="font-semibold text-gray-900">Filtros</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                Data Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                style={{ borderColor: '#E5E7EB' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                Data Fim
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                style={{ borderColor: '#E5E7EB' }}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="w-full px-6 py-2 rounded-lg font-semibold text-white flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)'
                }}
              >
                <Search size={18} />
                Buscar
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Etapas */}
        <div 
          className="rounded-xl border"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
        >
          <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Etapas Realizadas ({totalStages})
              </h2>
              <button
                onClick={exportAllToPDF}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 border rounded-lg hover:bg-gray-50"
                style={{ borderColor: '#E5E7EB' }}
              >
                <Download size={16} />
                Exportar
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="text-gray-400">Carregando histórico...</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma conferência realizada ainda</p>
              <p className="text-sm text-gray-400 mt-2">
                As conferências salvas aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#E5E7EB' }}>
              {Object.entries(groupedSessions).map(([seasonName, stages]) => (
                <div key={seasonName}>
                  {/* Temporada */}
                  <button
                    onClick={() => toggleSeason(seasonName)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedSeasons.has(seasonName) ? (
                        <ChevronDown size={20} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={20} className="text-gray-400" />
                      )}
                      <div className="text-left">
                        <div className="font-bold text-gray-900">{seasonName}</div>
                        <div className="text-sm text-gray-500">
                          {Object.keys(stages).length} etapa(s)
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Etapas da Temporada */}
                  {expandedSeasons.has(seasonName) && (
                    <div className="bg-gray-50">
                      {Object.entries(stages).map(([stageName, stageSessions]) => {
                        const stageKey = `${seasonName}-${stageName}`;
                        
                        // 🔥 CORREÇÃO: Conta chassis ÚNICOS ao invés de somar duplicados
                        // Se há múltiplas sessões, cada chassis só é contado uma vez
                        const uniqueChassis = new Set<string>();
                        const chassisTiresMap = new Map<string, number>();
                        
                        stageSessions.forEach(session => {
                          session.chassis_data.forEach(chassis => {
                            uniqueChassis.add(chassis.chassis);
                            // Guarda o número de pneus (sobrescreve se já existe, pegando último)
                            chassisTiresMap.set(chassis.chassis, chassis.tiresChecked);
                          });
                        });
                        
                        const totalChassisInStage = uniqueChassis.size;
                        const totalTiresInStage = Array.from(chassisTiresMap.values()).reduce(
                          (sum, tires) => sum + tires,
                          0
                        );

                        return (
                          <div key={stageKey} className="border-t" style={{ borderColor: '#E5E7EB' }}>
                            {/* Etapa */}
                            <button
                              onClick={() => toggleStage(stageKey)}
                              className="w-full px-6 py-4 pl-16 flex items-center justify-between hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div 
                                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                                  style={{ background: '#FEE2E2' }}
                                >
                                  <FileText size={20} className="text-red-600" />
                                </div>
                                <div className="text-left">
                                  <div className="font-semibold text-gray-900">
                                    Etapa - {stageName}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                    <span>{formatDate(stageSessions[0].check_date)}</span>
                                    <span className="flex items-center gap-1">
                                      <Car size={14} />
                                      {totalChassisInStage} chassis
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <CheckCircle size={14} />
                                      {totalTiresInStage} pneus
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span 
                                  className="px-3 py-1 rounded-full text-sm font-medium"
                                  style={{ background: '#D1FAE5', color: '#065F46' }}
                                >
                                  Concluído
                                </span>
                                {expandedStages.has(stageKey) ? (
                                  <ChevronDown size={20} className="text-gray-400" />
                                ) : (
                                  <ChevronRight size={20} className="text-gray-400" />
                                )}
                              </div>
                            </button>

                            {/* Chassis da Etapa */}
                            {expandedStages.has(stageKey) && (
                              <div className="bg-white border-t" style={{ borderColor: '#E5E7EB' }}>
                                <div className="px-6 py-3 bg-gray-50 border-b" style={{ borderColor: '#E5E7EB' }}>
                                  <div className="text-sm font-semibold text-gray-700">
                                    Chassis Conferidos ({totalChassisInStage})
                                  </div>
                                </div>
                                
                                {stageSessions.map((session) => (
                                  session.chassis_data.map((chassis, idx) => {
                                    const divergencias = (chassis.tireSets || []).reduce(
                                      (sum, set) => sum + set.tires.filter(t => t.divergencia).length,
                                      0
                                    );

                                    return (
                                      <div
                                        key={`${session.id}-${idx}`}
                                        className="px-6 py-4 border-b hover:bg-gray-50 transition-colors"
                                        style={{ borderColor: '#E5E7EB' }}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-4">
                                            <div 
                                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                                              style={{ background: '#F3F4F6' }}
                                            >
                                              <Car size={20} className="text-gray-600" />
                                            </div>
                                            <div>
                                              <div className="font-semibold text-gray-900">
                                                Chassis {chassis.chassis}
                                              </div>
                                              <div className="text-sm text-gray-500">
                                                {chassis.piloto}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-4">
                                            <div className="text-right text-sm">
                                              <div className="text-gray-500">Conferido em</div>
                                              <div className="font-medium text-gray-900">
                                                {formatDate(session.check_date)}
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              <span 
                                                className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                                                style={{ background: '#D1FAE5', color: '#065F46' }}
                                              >
                                                <CheckCircle size={14} />
                                                {chassis.tiresChecked} pneus
                                              </span>

                                              {divergencias > 0 && (
                                                <span 
                                                  className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                                                  style={{ background: '#FEE2E2', color: '#991B1B' }}
                                                >
                                                  <AlertTriangle size={14} />
                                                  {divergencias} divergência(s)
                                                </span>
                                              )}

                                              <button
                                                onClick={() => viewSessionDetails(session, idx)}
                                                className="px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-100"
                                                style={{ color: '#D50000' }}
                                              >
                                                <Eye size={16} />
                                                Ver Pneus
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {showModal && selectedSession && (
        <ChassisDetailsModal
          session={selectedSession}
          initialChassisIndex={selectedChassisIndex}
          onClose={() => setShowModal(false)}
          onExportPDF={exportChassisToPDF}
        />
      )}
    </div>
  );
}

// Modal de Detalhes do Chassis
function ChassisDetailsModal({ session, initialChassisIndex, onClose, onExportPDF }: { session: TireCheckSession; initialChassisIndex: number; onClose: () => void; onExportPDF: (chassis: ChassisConferenceData, sessionDate: string) => void }) {
  const [selectedChassisIndex, setSelectedChassisIndex] = useState(initialChassisIndex);
  const selectedChassis = session.chassis_data[selectedChassisIndex];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full flex flex-col"
        style={{ maxWidth: '1200px', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: '#E5E7EB' }}
        >
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Chassis {selectedChassis.chassis} - {selectedChassis.piloto}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {selectedChassis.tiresChecked} pneus conferidos
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Seletor de Chassis */}
        {session.chassis_data.length > 1 && (
          <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-2 overflow-x-auto flex-shrink-0" style={{ borderColor: '#E5E7EB' }}>
            {session.chassis_data.map((chassis, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedChassisIndex(idx)}
                className="px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap"
                style={{
                  background: selectedChassisIndex === idx ? '#D50000' : '#FFFFFF',
                  color: selectedChassisIndex === idx ? '#FFFFFF' : '#374151',
                  border: `1px solid ${selectedChassisIndex === idx ? '#D50000' : '#E5E7EB'}`
                }}
              >
                {chassis.chassis}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1" style={{ minHeight: 0 }}>
          {(selectedChassis.tireSets || []).map((tireSet) => (
            <div key={tireSet.jogo} className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center gap-2 mb-4">
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: tireSet.montadoNoCarro ? '#10B981' : '#6B7280' }}
                >
                  {tireSet.jogo}
                </div>
                <h3 className="font-bold text-gray-900">
                  Jogo {tireSet.jogo}
                  {tireSet.montadoNoCarro && (
                    <span className="ml-2 text-sm font-normal text-green-600">
                      • Montado no carro
                    </span>
                  )}
                </h3>
                <span className="text-sm text-gray-500 ml-auto">
                  {tireSet.tires.length} pneus
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Código</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Posição</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Piloto</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Ano</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Set</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Lado</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Tipo</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Voltas</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Situação</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Validação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tireSet.tires.map((tire, idx) => (
                      <tr 
                        key={idx} 
                        className="border-t" 
                        style={{ 
                          borderColor: '#E5E7EB',
                          background: tire.divergencia ? '#FEF3C7' : 'transparent'
                        }}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{tire.codigo}</td>
                        <td className="px-4 py-3 text-gray-700">{tire.posicao}</td>
                        <td className="px-4 py-3 text-gray-700">{tire.piloto}</td>
                        <td className="px-4 py-3 text-gray-700">{tire.ano || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{tire.set || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {tire.posicao?.includes('D') ? 'Direito' : 'Esquerdo'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{tire.tipo || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{tire.voltas || '-'}</td>
                        <td className="px-4 py-3">
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              background: tire.situacao === 'Guardar' ? '#D1FAE5' : '#FEE2E2',
                              color: tire.situacao === 'Guardar' ? '#065F46' : '#991B1B'
                            }}
                          >
                            {tire.situacao}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {tire.validacao && tire.validacao !== 'OK' ? (
                            <span 
                              className="px-3 py-1 rounded-full text-xs font-medium"
                              style={{ background: '#FEE2E2', color: '#991B1B' }}
                            >
                              {tire.validacao}
                            </span>
                          ) : (
                            <span 
                              className="px-3 py-1 rounded-full text-xs font-medium"
                              style={{ background: '#D1FAE5', color: '#065F46' }}
                            >
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 flex-shrink-0" style={{ borderColor: '#E5E7EB' }}>
          <button
            onClick={onClose}
            className="px-6 py-2 border rounded-lg font-semibold text-gray-700 hover:bg-white"
            style={{ borderColor: '#E5E7EB' }}
          >
            Fechar
          </button>
          <button
            onClick={() => onExportPDF(selectedChassis, session.check_date)}
            className="px-6 py-2 rounded-lg font-semibold text-white flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)' }}
          >
            <Download size={16} />
            Exportar PDF
          </button>
        </div>
      </div>
    </div>
  );
}