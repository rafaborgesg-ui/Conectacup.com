import React, { useState, useEffect } from 'react';
import { Plus, Image as ImageIcon, Trash2, Download, Upload, Filter } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import NovaAvariaModal from '../components/NovaAvariaModal';
import AvariaDetailsModal from '../components/AvariaDetailsModal';
import { formatDate, formatSession } from '../utils/watermarkGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface WheelDamageOccurrence {
  id: string;
  line_code: string;
  incident_date: string;
  stage_name: string;
  category: string;
  car_generation: string; // 🆕 Modelo/geração do carro (992.1, 991.2, 991.1)
  driver_name: string;
  driver_number: string;
  chassis: string; // 🆕 Código do chassis
  classe: string; // 🆕 Classe do piloto (CARRERA, CHALLENGE, etc)
  wheel_position: string;
  wheel_color: string; // 🆕 Cor da roda
  serial_number: string; // 🆕 Serial number
  session: string; // 🆕 Sessão
  damage_type: string;
  warping_level: string; // 🆕 Nível de empenamento
  action_taken: string; // 🆕 Ação tomada
  destination: string;
  observations: string; // 🆕 Observações
  status: string;
  created_at: string;
  photo_urls: string[];
}

export default function Avarias() {
  const supabase = createClient();
  
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados de filtros
  const [filterStage, setFilterStage] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterYear, setFilterYear] = useState('');
  
  // Estados para os dados dos filtros
  const [stages, setStages] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // 🆕 Estado para download de fotos
  const [isDownloadingPhotos, setIsDownloadingPhotos] = useState(false);
  
  // 🆕 Estado para menu de exportação
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Estado para modal de detalhes
  const [selectedOccurrence, setSelectedOccurrence] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // 🆕 Estados para modal de importação
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wheel_damage_occurrences')
        .select('*')
        .neq('status', 'rejected') // Não mostra avarias reprovadas
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar avarias:', error);
        return;
      }

      setOccurrences(data || []);
      
      // Extrai valores únicos para filtros
      const uniqueStages = [...new Set(data?.map(o => o.stage_name).filter(Boolean))];
      const uniqueDrivers = [...new Set(data?.map(o => o.driver_name).filter(Boolean))];
      const uniqueYears = [...new Set(data?.map(o => new Date(o.created_at).getFullYear()).filter(Boolean))];
      
      setStages(uniqueStages);
      setDrivers(uniqueDrivers);
      setYears(uniqueYears);
      
    } catch (error) {
      console.error('❌ Erro ao processar dados:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredOccurrences = occurrences.filter(occ => {
    if (filterStage && occ.stage_name !== filterStage) return false;
    if (filterType && occ.damage_type !== filterType) return false;
    if (filterDestination && occ.destination !== filterDestination) return false;
    if (filterDriver && occ.driver_name !== filterDriver) return false;
    if (filterYear && new Date(occ.created_at).getFullYear().toString() !== filterYear) return false;
    return true;
  });

  function getPositionAbbreviation(position: string): string {
    const map: Record<string, string> = {
      'dianteira': 'D',
      'dianteira_direita': 'DD',
      'dianteira_esquerda': 'DE',
      'traseira': 'T',
      'traseira_direita': 'TD',
      'traseira_esquerda': 'TE'
    };
    return map[position] || position;
  }

  function getDestinationStyle(destination: string) {
    if (destination === 'CUP') return 'bg-red-600 text-white';
    if (destination === 'CONTA') return 'bg-red-600 text-white';
    return 'border border-gray-400 text-gray-200';
  }

  function handleClearFilters() {
    setFilterStage('');
    setFilterType('');
    setFilterDestination('');
    setFilterDriver('');
    setFilterYear('');
  }

  async function handleDelete(occurrence: any) {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir a avaria ${occurrence.line_code}?\n\n` +
      `Piloto: #${occurrence.driver_number} - ${occurrence.driver_name}\n` +
      `Etapa: ${occurrence.stage_name}\n\n` +
      `Esta ação não pode ser desfeita e todas as fotos serão removidas.`
    );

    if (!confirmDelete) return;

    setIsDeleting(occurrence.id);

    try {
      console.log('🗑️ Excluindo avaria:', occurrence.line_code);

      // 1. Deleta as fotos do Storage (se existirem)
      if (occurrence.photo_urls && occurrence.photo_urls.length > 0) {
        console.log('📸 Deletando', occurrence.photo_urls.length, 'fotos do Storage...');
        
        // Extrai os caminhos das fotos (formato: bucket/path)
        const filePaths = occurrence.photo_urls.map((url: string) => {
          // URL público: https://PROJECT.supabase.co/storage/v1/object/public/wheel-damage-photos/ID/filename.jpg
          // Extrai: ID/filename.jpg
          const match = url.match(/wheel-damage-photos\/(.+)$/);
          return match ? match[1] : null;
        }).filter(Boolean);

        if (filePaths.length > 0) {
          const { error: storageError } = await supabase
            .storage
            .from('wheel-damage-photos')
            .remove(filePaths);

          if (storageError) {
            console.error('❌ Erro ao deletar fotos do Storage:', storageError);
            // Continua mesmo se houver erro no storage
          } else {
            console.log('✅ Fotos deletadas do Storage');
          }
        }
      }

      // 2. Deleta o registro do banco de dados
      console.log('📝 Deletando registro do banco de dados...');
      const { error: dbError } = await supabase
        .from('wheel_damage_occurrences')
        .delete()
        .eq('id', occurrence.id);

      if (dbError) {
        console.error('❌ Erro ao deletar registro:', dbError);
        alert(`Erro ao excluir avaria: ${dbError.message}`);
        return;
      }

      console.log('✅ Avaria excluída com sucesso!');
      
      // Atualiza a lista
      await loadData();
      
    } catch (error: any) {
      console.error('❌ Erro ao excluir avaria:', error);
      alert(`Erro ao excluir avaria: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsDeleting(null);
    }
  }

  function handleRowClick(occurrence: any) {
    setSelectedOccurrence(occurrence);
    setIsDetailsModalOpen(true);
  }

  // 🆕 Função para baixar todas as fotos em ZIP
  async function handleDownloadPhotos() {
    if (filteredOccurrences.length === 0) {
      alert('Nenhuma avaria encontrada com os filtros aplicados.');
      return;
    }

    // Filtra apenas ocorrências que possuem fotos
    const occurrencesWithPhotos = filteredOccurrences.filter(
      occ => occ.photo_urls && occ.photo_urls.length > 0
    );

    if (occurrencesWithPhotos.length === 0) {
      alert('Nenhuma foto encontrada nas avarias filtradas.');
      return;
    }

    const totalPhotos = occurrencesWithPhotos.reduce(
      (sum, occ) => sum + (occ.photo_urls?.length || 0),
      0
    );

    const confirmDownload = window.confirm(
      `Será feito o download de ${totalPhotos} foto(s) de ${occurrencesWithPhotos.length} avaria(s).\\n\\n` +
      `Filtros aplicados:\\n` +
      `${filterStage ? `• Etapa: ${filterStage}\\n` : ''}` +
      `${filterType ? `• Tipo: ${filterType}\\n` : ''}` +
      `${filterDestination ? `• Destino: ${filterDestination}\\n` : ''}` +
      `${filterDriver ? `• Piloto: ${filterDriver}\\n` : ''}` +
      `${filterYear ? `• Ano: ${filterYear}\\n` : ''}` +
      `\\nDeseja continuar?`
    );

    if (!confirmDownload) return;

    setIsDownloadingPhotos(true);

    try {
      console.log('📦 Iniciando download de fotos...');
      const zip = new JSZip();

      let downloadedCount = 0;

      // Percorre cada ocorrência
      for (const occurrence of occurrencesWithPhotos) {
        console.log(`📁 Processando ${occurrence.line_code}...`);

        // Cria uma pasta para cada ocorrência
        const folder = zip.folder(occurrence.line_code);

        if (!folder) continue;

        // Baixa cada foto da ocorrência
        for (let i = 0; i < occurrence.photo_urls.length; i++) {
          const photoUrl = occurrence.photo_urls[i];
          const fileName = `${occurrence.line_code}.${i + 1}.jpg`;

          try {
            console.log(`  📸 Baixando ${fileName}...`);

            // Faz o fetch da imagem
            const response = await fetch(photoUrl);
            if (!response.ok) {
              console.error(`❌ Erro ao baixar ${fileName}: ${response.statusText}`);
              continue;
            }

            const blob = await response.blob();
            folder.file(fileName, blob);

            downloadedCount++;
            console.log(`  ✅ ${fileName} adicionado ao ZIP`);
          } catch (error) {
            console.error(`❌ Erro ao processar ${fileName}:`, error);
          }
        }
      }

      console.log(`📦 Gerando arquivo ZIP com ${downloadedCount} fotos...`);

      // Gera o arquivo ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Cria nome do arquivo com data/hora
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
      const fileName = `Avarias_Fotos_${dateStr}_${timeStr}.zip`;

      // Cria link de download e clica automaticamente
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Libera memória
      URL.revokeObjectURL(link.href);

      console.log(`✅ Download concluído: ${fileName}`);
      alert(`✅ Download concluído!\\n\\n${downloadedCount} foto(s) de ${occurrencesWithPhotos.length} avaria(s).`);

    } catch (error: any) {
      console.error('❌ Erro ao gerar ZIP:', error);
      alert(`Erro ao gerar arquivo ZIP: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsDownloadingPhotos(false);
    }
  }

  // 🆕 Função para exportar para Excel (XLSX)
  async function handleExportXLSX() {
    if (filteredOccurrences.length === 0) {
      alert('Nenhuma avaria encontrada com os filtros aplicados.');
      return;
    }

    setShowExportMenu(false);

    // Prepara os dados para exportação - nova estrutura completa
    const exportData: any[] = [];

    // Para cada ocorrência, gera linhas com legendas de fotos
    filteredOccurrences.forEach((occ: WheelDamageOccurrence) => {
      const totalPhotos = occ.photo_urls?.length || 0;

      // Se houver fotos, gera uma linha para cada foto com sufixo .1, .2, .3
      // Se não houver fotos, gera apenas uma linha
      if (totalPhotos > 0) {
        for (let i = 1; i <= totalPhotos; i++) {
          exportData.push({
            'Data Incidente': new Date(occ.incident_date).toLocaleDateString('pt-BR'),
            'Data Relatório': new Date(occ.created_at).toLocaleDateString('pt-BR'),
            'Etapa': occ.stage_name || '-',
            'Categoria': occ.category || '-',
            'Modelo': occ.car_generation || '-', // 🆕 Modelo/geração do carro
            'Número Piloto': occ.driver_number || '-',
            'Nome Piloto': occ.driver_name || '-',
            'Classe': occ.classe || '-',
            'Chassis': occ.chassis || '-',
            'Roda avariada': getPositionAbbreviation(occ.wheel_position),
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
            'Peças ADM': ''
          });
        }
      } else {
        // Sem fotos, gera apenas uma linha
        exportData.push({
          'Data Incidente': new Date(occ.incident_date).toLocaleDateString('pt-BR'),
          'Data Relatório': new Date(occ.created_at).toLocaleDateString('pt-BR'),
          'Etapa': occ.stage_name || '-',
          'Categoria': occ.category || '-',
          'Modelo': occ.car_generation || '-', // 🆕 Modelo/geração do carro
          'Número Piloto': occ.driver_number || '-',
          'Nome Piloto': occ.driver_name || '-',
          'Classe': occ.classe || '-',
          'Chassis': occ.chassis || '-',
          'Roda avariada': getPositionAbbreviation(occ.wheel_position),
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
          'Peças ADM': ''
        });
      }
    });

    // Cria uma planilha
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Avarias');

    // Gera o arquivo Excel
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Cria nome do arquivo com data/hora
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
    const fileName = `Avarias_${dateStr}_${timeStr}.xlsx`;

    // Cria link de download e clica automaticamente
    const link = document.createElement('a');
    link.href = URL.createObjectURL(excelBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Libera memória
    URL.revokeObjectURL(link.href);

    console.log(`✅ Download concluído: ${fileName}`);
    alert(`✅ Download concluído!\n\n${exportData.length} linha(s) exportadas de ${filteredOccurrences.length} avaria(s).`);
  }

  // 🆕 Função para exportar para CSV
  async function handleExportCSV() {
    if (filteredOccurrences.length === 0) {
      alert('Nenhuma avaria encontrada com os filtros aplicados.');
      return;
    }

    setShowExportMenu(false);

    // Prepara os dados para exportação - nova estrutura completa
    const exportData: any[] = [];

    // Para cada ocorrência, gera linhas com legendas de fotos
    filteredOccurrences.forEach((occ: WheelDamageOccurrence) => {
      const totalPhotos = occ.photo_urls?.length || 0;

      // Se houver fotos, gera uma linha para cada foto com sufixo .1, .2, .3
      // Se não houver fotos, gera apenas uma linha
      if (totalPhotos > 0) {
        for (let i = 1; i <= totalPhotos; i++) {
          exportData.push({
            'Data Incidente': new Date(occ.incident_date).toLocaleDateString('pt-BR'),
            'Data Relatório': new Date(occ.created_at).toLocaleDateString('pt-BR'),
            'Etapa': occ.stage_name || '-',
            'Categoria': occ.category || '-',
            'Modelo': occ.car_generation || '-', // 🆕 Modelo/geração do carro
            'Número Piloto': occ.driver_number || '-',
            'Nome Piloto': occ.driver_name || '-',
            'Classe': occ.classe || '-',
            'Chassis': occ.chassis || '-',
            'Roda avariada': getPositionAbbreviation(occ.wheel_position),
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
            'Peças ADM': ''
          });
        }
      } else {
        // Sem fotos, gera apenas uma linha
        exportData.push({
          'Data Incidente': new Date(occ.incident_date).toLocaleDateString('pt-BR'),
          'Data Relatório': new Date(occ.created_at).toLocaleDateString('pt-BR'),
          'Etapa': occ.stage_name || '-',
          'Categoria': occ.category || '-',
          'Modelo': occ.car_generation || '-', // 🆕 Modelo/geração do carro
          'Número Piloto': occ.driver_number || '-',
          'Nome Piloto': occ.driver_name || '-',
          'Classe': occ.classe || '-',
          'Chassis': occ.chassis || '-',
          'Roda avariada': getPositionAbbreviation(occ.wheel_position),
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
          'Peças ADM': ''
        });
      }
    });

    // Converte para CSV
    const csv = Papa.unparse(exportData);

    // Cria blob
    const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    // Cria nome do arquivo com data/hora
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
    const fileName = `Avarias_${dateStr}_${timeStr}.csv`;

    // Cria link de download e clica automaticamente
    const link = document.createElement('a');
    link.href = URL.createObjectURL(csvBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Libera memória
    URL.revokeObjectURL(link.href);

    console.log(`✅ Download concluído: ${fileName}`);
    alert(`✅ Download concluído!\n\n${exportData.length} linha(s) exportadas de ${filteredOccurrences.length} avaria(s).`);
  }

  // 🆕 Função para importar planilha (XLSX/CSV)
  async function handleImportFile(file: File) {
    setIsImporting(true);
    
    try {
      console.log('📥 Iniciando importação de:', file.name);
      
      let data: any[] = [];
      
      // Detecta o tipo de arquivo
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Lê arquivo Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      } else if (file.name.endsWith('.csv')) {
        // Lê arquivo CSV
        const text = await file.text();
        const results = Papa.parse(text, { header: true });
        
        if (results.errors.length > 0) {
          console.error('❌ Erros ao processar CSV:', results.errors);
          alert('Erro ao processar o arquivo CSV. Verifique o formato e tente novamente.');
          return;
        }
        
        data = results.data as any[];
      } else {
        alert('Formato de arquivo não suportado. Use .xlsx, .xls ou .csv');
        return;
      }
      
      // Remove linhas vazias
      data = data.filter(row => {
        const values = Object.values(row);
        return values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
      });
      
      console.log('📊 Linhas encontradas:', data.length);
      
      if (data.length === 0) {
        alert('Nenhum dado encontrado no arquivo.');
        return;
      }
      
      // Mapeia os nomes das colunas (case-insensitive)
      const normalizeKey = (key: string) => key.toLowerCase().trim();
      
      // Validação e transformação dos dados
      const validRecords: any[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2; // +2 porque conta header e índice começa em 0
        
        // Normaliza as chaves do objeto
        const normalizedRow: any = {};
        Object.keys(row).forEach(key => {
          normalizedRow[normalizeKey(key)] = row[key];
        });
        
        // Busca os valores com nomes de colunas flexíveis
        const getFieldValue = (possibleNames: string[]) => {
          for (const name of possibleNames) {
            const value = normalizedRow[normalizeKey(name)];
            if (value !== null && value !== undefined && String(value).trim() !== '' && String(value).trim() !== '-') {
              return String(value).trim();
            }
          }
          return null;
        };
        
        // Extrai campos obrigatórios
        const dataIncidente = getFieldValue(['Data Incidente', 'Data do Incidente', 'Incident Date']);
        const etapa = getFieldValue(['Etapa', 'Stage', 'Etapa Nome']);
        const categoria = getFieldValue(['Categoria', 'Category']);
        const numeroPiloto = getFieldValue(['Número Piloto', 'Numero Piloto', 'Driver Number', 'Número', '#']);
        const nomePiloto = getFieldValue(['Nome Piloto', 'Piloto', 'Driver Name', 'Driver']);
        const rodaAvariada = getFieldValue(['Roda avariada', 'Roda Avariada', 'Wheel Position', 'Posição']);
        const tipoAvaria = getFieldValue(['Tipo Avaria', 'Tipo de Avaria', 'Damage Type', 'Tipo']);
        const destino = getFieldValue(['Destino', 'Destination']);
        
        // Valida campos obrigatórios
        if (!dataIncidente || !etapa || !categoria || !numeroPiloto || !nomePiloto || !rodaAvariada || !tipoAvaria || !destino) {
          errors.push(`Linha ${rowNumber}: campos obrigatórios faltando`);
          continue;
        }
        
        // Converte data (aceita formato DD/MM/YYYY ou YYYY-MM-DD)
        let incidentDate: Date;
        try {
          const dateParts = dataIncidente.split('/');
          if (dateParts.length === 3) {
            // Formato DD/MM/YYYY
            incidentDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
          } else {
            // Formato YYYY-MM-DD
            incidentDate = new Date(dataIncidente);
          }
          
          if (isNaN(incidentDate.getTime())) {
            errors.push(`Linha ${rowNumber}: data inválida (${dataIncidente})`);
            continue;
          }
        } catch (e) {
          errors.push(`Linha ${rowNumber}: erro ao processar data (${dataIncidente})`);
          continue;
        }
        
        // Mapeia posição da roda (aceita variações)
        const positionMap: Record<string, string> = {
          'd': 'dianteira',
          'dd': 'dianteira_direita',
          'de': 'dianteira_esquerda',
          't': 'traseira',
          'td': 'traseira_direita',
          'te': 'traseira_esquerda',
          'dianteira': 'dianteira',
          'dianteira direita': 'dianteira_direita',
          'dianteira esquerda': 'dianteira_esquerda',
          'traseira': 'traseira',
          'traseira direita': 'traseira_direita',
          'traseira esquerda': 'traseira_esquerda'
        };
        
        const wheelPosition = positionMap[rodaAvariada.toLowerCase()] || 'dianteira';
        
        // Mapeia tipo de avaria (aceita variações)
        const damageTypeMap: Record<string, string> = {
          'empenada': 'empenada',
          'fora de centro': 'fora_de_centro',
          'vazamento': 'vazamento',
          'pintura': 'pintura',
          'dsi': 'dsi'
        };
        
        const damageType = damageTypeMap[tipoAvaria.toLowerCase()] || 'empenada';
        
        // Campos opcionais
        const modelo = getFieldValue(['Modelo', 'Model', 'Geração', 'Generation']);
        const classe = getFieldValue(['Classe', 'Class']);
        const chassis = getFieldValue(['Chassis', 'Chassi', 'Car']);
        const corRoda = getFieldValue(['Cor da roda', 'Cor Roda', 'Wheel Color']);
        const serialNumber = getFieldValue(['Serial number', 'Serial Number', 'SN']);
        const sessao = getFieldValue(['Sessão', 'Session']);
        const nivelEmpenamento = getFieldValue(['Nível empenamento', 'Nivel Empenamento', 'Warping Level']);
        const acaoTomada = getFieldValue(['Ação Tomada', 'Acao Tomada', 'Action Taken']);
        const observacoes = getFieldValue(['Observações', 'Observacoes', 'Observations', 'Obs']);
        
        // Monta o objeto para inserção
        validRecords.push({
          incident_date: incidentDate.toISOString().split('T')[0],
          stage_name: etapa,
          category: categoria,
          car_generation: modelo || null,
          driver_number: numeroPiloto,
          driver_name: nomePiloto,
          classe: classe || categoria, // Se não tiver classe, usa categoria
          chassis: chassis || `${categoria}-${numeroPiloto}`, // Gera chassis dummy se não informado
          wheel_position: wheelPosition,
          wheel_color: corRoda || null,
          serial_number: serialNumber || null,
          session: sessao || null,
          damage_type: damageType,
          warping_level: nivelEmpenamento || null,
          action_taken: acaoTomada || null,
          destination: destino,
          observations: observacoes || null,
          status: 'approved', // Importações entram como aprovadas
          photo_urls: []
        });
      }
      
      console.log('✅ Registros válidos:', validRecords.length);
      console.log('❌ Erros:', errors.length);
      
      if (errors.length > 0) {
        console.warn('⚠️ Erros de validação:', errors);
      }
      
      if (validRecords.length === 0) {
        alert(`Nenhum registro válido encontrado.\\n\\nErros:\\n${errors.join('\\n')}`);
        return;
      }
      
      // Mostra confirmação
      const confirmImport = window.confirm(
        `Confirma a importação de ${validRecords.length} avaria(s)?\\n\\n` +
        `${errors.length > 0 ? `⚠️ ${errors.length} linha(s) com erro serão ignoradas.\\n\\n` : ''}` +
        `As avarias serão importadas com status "APROVADA".`
      );
      
      if (!confirmImport) {
        alert('Importação cancelada.');
        return;
      }
      
      // 🆕 Busca o último line_code para gerar códigos sequenciais
      console.log('🔢 Buscando último código sequencial...');
      const { data: existingCodes, error: codesError } = await supabase
        .from('wheel_damage_occurrences')
        .select('line_code')
        .order('line_code', { ascending: false })
        .limit(1);
      
      if (codesError) {
        console.error('❌ Erro ao buscar códigos:', codesError);
        alert(`Erro ao buscar códigos existentes: ${codesError.message}`);
        return;
      }
      
      // Extrai o número do último código (ex: "L123" -> 123)
      let lastNumber = 0;
      if (existingCodes && existingCodes.length > 0) {
        const lastCode = existingCodes[0].line_code;
        const match = lastCode.match(/L(\d+)/);
        if (match) {
          lastNumber = parseInt(match[1], 10);
        }
      }
      
      console.log('🔢 Último código encontrado:', lastNumber);
      
      // Adiciona line_code sequencial a cada registro
      const recordsWithCodes = validRecords.map((record, index) => ({
        ...record,
        line_code: `L${String(lastNumber + index + 1).padStart(2, '0')}`
      }));
      
      console.log('✅ Códigos gerados:', recordsWithCodes.map(r => r.line_code).join(', '));
      
      // Insere os registros no banco
      console.log('💾 Inserindo registros no banco...');
      const { data: insertedData, error } = await supabase
        .from('wheel_damage_occurrences')
        .insert(recordsWithCodes)
        .select();
      
      if (error) {
        console.error('❌ Erro ao inserir registros:', error);
        alert(`Erro ao importar dados: ${error.message}`);
        return;
      }
      
      console.log('✅ Importação concluída:', insertedData);
      
      alert(
        `✅ Importação concluída com sucesso!\\n\\n` +
        `${validRecords.length} avaria(s) importadas.\\n` +
        `${errors.length > 0 ? `${errors.length} linha(s) ignoradas por erros.` : ''}`
      );
      
      // Recarrega a lista
      await loadData();
      
      // Fecha o modal
      setIsImportModalOpen(false);
      
    } catch (error: any) {
      console.error('❌ Erro geral ao importar:', error);
      alert(`Erro ao importar arquivo: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Avarias de Rodas</h1>
            <p className="text-muted-foreground">Registro e histórico de avarias de rodas</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadPhotos}
              disabled={isDownloadingPhotos || filteredOccurrences.length === 0}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              {isDownloadingPhotos ? 'Baixando...' : 'Fotos'}
            </Button>
            
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={filteredOccurrences.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                    onClick={handleExportXLSX}
                  >
                    📊 Excel (XLSX)
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                    onClick={handleExportCSV}
                  >
                    📄 CSV
                  </button>
                </div>
              )}
            </div>
            
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              id="import-file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImportFile(file);
                }
              }}
            />
            <label
              htmlFor="import-file"
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar Planilha
            </label>
            <Button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Nova Avaria
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Etapa</label>
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  className="w-full bg-input-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Todas</option>
                  {stages.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tipo</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-input-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Todos</option>
                  <option value="empenada">Empenada</option>
                  <option value="fora_de_centro">Fora de Centro</option>
                  <option value="vazamento">Vazamento</option>
                  <option value="pintura">Pintura</option>
                  <option value="dsi">DSI</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Destino</label>
                <select
                  value={filterDestination}
                  onChange={(e) => setFilterDestination(e.target.value)}
                  className="w-full bg-input-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Todos</option>
                  <option value="CUP">CUP</option>
                  <option value="CONTA">CONTA</option>
                  <option value="INDEFINIDO">INDEFINIDO</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Piloto</label>
                <select
                  value={filterDriver}
                  onChange={(e) => setFilterDriver(e.target.value)}
                  className="w-full bg-input-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Todos</option>
                  {drivers.map(driver => (
                    <option key={driver} value={driver}>{driver}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Ano</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full bg-input-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Todos</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Avarias */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Avarias</CardTitle>
            {!isLoading && filteredOccurrences.length > 0 && (
              <Badge variant="secondary">
                {filteredOccurrences.length} {filteredOccurrences.length === 1 ? 'avaria' : 'avarias'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : filteredOccurrences.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Nenhuma avaria encontrada</p>
              <Button onClick={() => setIsModalOpen(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Registrar Nova Avaria
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground text-sm font-medium">#</th>
                    <th className="text-left py-3 px-4 text-muted-foreground text-sm font-medium">Etapa</th>
                    <th className="text-left py-3 px-4 text-muted-foreground text-sm font-medium">Categoria</th>
                    <th className="text-left py-3 px-4 text-muted-foreground text-sm font-medium">Piloto</th>
                    <th className="text-left py-3 px-4 text-muted-foreground text-sm font-medium">Posição</th>
                    <th className="text-left py-3 px-4 text-muted-foreground text-sm font-medium">Tipo</th>
                    <th className="text-left py-3 px-4 text-muted-foreground text-sm font-medium">Destino</th>
                    <th className="text-left py-3 px-4 text-muted-foreground text-sm font-medium">Data</th>
                    <th className="text-left py-3 px-4 text-muted-foreground text-sm font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOccurrences.map((occ, index) => (
                    <tr 
                      key={occ.id}
                      className={`border-b border-border hover:bg-muted/50 transition-colors ${
                        occ.status === 'pending' ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : ''
                      }`}
                      onClick={() => handleRowClick(occ)}
                    >
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-sm text-foreground">{occ.line_code}</span>
                          {occ.status === 'pending' && (
                            <Badge variant="outline" className="w-fit bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                              ⚠️ PENDENTE
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-foreground text-sm font-medium">{occ.stage_name?.split(' - ')[0] || ''}</div>
                        <div className="text-muted-foreground text-xs">{occ.stage_name?.split(' - ')[1] || ''}</div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="secondary">
                          {occ.category}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-foreground text-sm">
                          <span className="font-semibold">#{occ.driver_number}</span> {occ.driver_name}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="font-mono text-xs">
                          {getPositionAbbreviation(occ.wheel_position)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-foreground text-sm capitalize">
                          {occ.damage_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge 
                          variant={occ.destination === 'CUP' || occ.destination === 'CONTA' ? 'destructive' : 'secondary'}
                        >
                          {occ.destination}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-muted-foreground text-sm">
                        {new Date(occ.created_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <Button
                          onClick={() => handleDelete(occ)}
                          variant="outline"
                          size="sm"
                          disabled={isDeleting === occ.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nova Avaria */}
      <NovaAvariaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {
          loadData();
          setIsModalOpen(false);
        }}
      />

      {/* Modal Detalhes da Avaria */}
      <AvariaDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedOccurrence(null);
        }}
        occurrence={selectedOccurrence}
        isPending={selectedOccurrence?.status === 'pending'}
        onApprove={() => {
          loadData(); // Recarrega a lista após aprovar
          setIsDetailsModalOpen(false);
          setSelectedOccurrence(null);
        }}
      />
    </div>
  );
}