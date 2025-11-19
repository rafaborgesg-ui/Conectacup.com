/**
 * Utilitário de Exportação para Excel
 * Exporta dados de relatórios com filtros aplicados
 */

import * as XLSX from 'xlsx';
import type { StockEntry } from './storage';

interface ExportOptions {
  fileName?: string;
  sheetName?: string;
  filters?: {
    season?: string[];
    stage?: string[];
    status?: string[];
    model?: string[];
    container?: string[];
    pilot?: string[];
    championship?: string[];
    category?: string[];
  };
  includeFiltersSummary?: boolean;
}

/**
 * Exporta dados de estoque para Excel
 */
export function exportStockToExcel(
  data: StockEntry[],
  options: ExportOptions = {}
) {
  const {
    fileName = `Estoque_Pneus_${new Date().toISOString().split('T')[0]}.xlsx`,
    sheetName = 'Estoque de Pneus',
    filters,
    includeFiltersSummary = true,
  } = options;

  // Cria workbook
  const workbook = XLSX.utils.book_new();

  // Se incluir resumo de filtros, cria aba separada
  if (includeFiltersSummary && filters) {
    const filtersData = createFiltersSheet(filters, data.length);
    const filtersSheet = XLSX.utils.aoa_to_sheet(filtersData);
    XLSX.utils.book_append_sheet(workbook, filtersSheet, 'Filtros Aplicados');
  }

  // Converte dados para formato de planilha
  const worksheetData = data.map(entry => ({
    'Código de Barras': entry.barcode,
    'Modelo': entry.model_name || '-',
    'Tipo': entry.model_type || '-',
    'Container': entry.container_name || 'Sem Container',
    'Status': entry.status || 'Novo',
    'Piloto': (entry as any).pilot || '-',
    'Equipe': (entry as any).team || '-',
    'Temporada': (entry as any).ano || '-',
    'Etapa': (entry as any).etapa || '-',
    'Campeonato': (entry as any).campeonato || '-',
    'Categoria': (entry as any).categoria || '-',
    'Observações': entry.notes || '-',
    'Data de Criação': new Date(entry.created_at).toLocaleString('pt-BR'),
    'Última Atualização': entry.updated_at ? new Date(entry.updated_at).toLocaleString('pt-BR') : '-',
  }));

  // Cria worksheet
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);

  // Ajusta largura das colunas
  const columnWidths = [
    { wch: 18 }, // Código de Barras
    { wch: 25 }, // Modelo
    { wch: 10 }, // Tipo
    { wch: 20 }, // Container
    { wch: 15 }, // Status
    { wch: 25 }, // Piloto
    { wch: 25 }, // Equipe
    { wch: 12 }, // Temporada
    { wch: 10 }, // Etapa
    { wch: 20 }, // Campeonato
    { wch: 20 }, // Categoria
    { wch: 30 }, // Observações
    { wch: 20 }, // Data de Criação
    { wch: 20 }, // Última Atualização
  ];
  worksheet['!cols'] = columnWidths;

  // Adiciona worksheet ao workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Exporta arquivo
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exporta resumo de ocupação de containers para Excel
 */
export function exportContainerOccupancyToExcel(
  containers: any[],
  stockEntries: StockEntry[],
  fileName: string = `Ocupacao_Containers_${new Date().toISOString().split('T')[0]}.xlsx`
) {
  const workbook = XLSX.utils.book_new();

  // Calcula ocupação de cada container
  const occupancyData = containers.map(container => {
    const containerEntries = stockEntries.filter(
      e => e.container_id === container.id && 
      e.status !== 'Descartado DSI' && 
      e.status !== 'Descarte DSI' && 
      e.status !== 'Descarte'
    );

    const occupancy = container.capacity > 0 
      ? ((containerEntries.length / container.capacity) * 100).toFixed(1)
      : '0.0';

    return {
      'Container': container.name,
      'Localização': container.location || '-',
      'Pneus Ativos': containerEntries.length,
      'Capacidade': container.capacity || 0,
      'Disponível': Math.max(0, (container.capacity || 0) - containerEntries.length),
      'Ocupação (%)': occupancy,
      'Status': getOccupancyStatus(parseFloat(occupancy)),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(occupancyData);

  // Ajusta largura das colunas
  worksheet['!cols'] = [
    { wch: 25 }, // Container
    { wch: 20 }, // Localização
    { wch: 15 }, // Pneus Ativos
    { wch: 12 }, // Capacidade
    { wch: 12 }, // Disponível
    { wch: 15 }, // Ocupação (%)
    { wch: 15 }, // Status
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ocupação de Containers');
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exporta movimentações para Excel
 */
export function exportMovementsToExcel(
  movements: any[],
  fileName: string = `Movimentacoes_${new Date().toISOString().split('T')[0]}.xlsx`
) {
  const workbook = XLSX.utils.book_new();

  const movementData = movements.map(movement => ({
    'Data/Hora': new Date(movement.timestamp || movement.created_at).toLocaleString('pt-BR'),
    'Código': movement.barcode,
    'Modelo': movement.modelName || movement.model_name,
    'Tipo': movement.modelType || movement.model_type,
    'De': movement.fromContainerName || movement.from_container_name || 'Sem Container',
    'Para': movement.toContainerName || movement.to_container_name || 'Sem Container',
    'Responsável': movement.movedByName || movement.moved_by_name || '-',
    'Motivo': movement.reason || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(movementData);

  worksheet['!cols'] = [
    { wch: 20 }, // Data/Hora
    { wch: 18 }, // Código
    { wch: 25 }, // Modelo
    { wch: 10 }, // Tipo
    { wch: 20 }, // De
    { wch: 20 }, // Para
    { wch: 25 }, // Responsável
    { wch: 30 }, // Motivo
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimentações');
  XLSX.writeFile(workbook, fileName);
}

/**
 * Cria dados para aba de filtros
 */
function createFiltersSheet(filters: any, totalRecords: number): any[][] {
  const data: any[][] = [
    ['FILTROS APLICADOS NO RELATÓRIO'],
    [''],
    ['Data de Exportação:', new Date().toLocaleString('pt-BR')],
    ['Total de Registros:', totalRecords],
    [''],
    ['FILTROS ATIVOS:'],
    [''],
  ];

  if (filters.season && filters.season.length > 0) {
    data.push(['Temporada:', filters.season.join(', ')]);
  }

  if (filters.stage && filters.stage.length > 0) {
    data.push(['Etapa:', filters.stage.join(', ')]);
  }

  if (filters.status && filters.status.length > 0) {
    data.push(['Status:', filters.status.join(', ')]);
  }

  if (filters.model && filters.model.length > 0) {
    data.push(['Modelo:', filters.model.join(', ')]);
  }

  if (filters.container && filters.container.length > 0) {
    data.push(['Container:', filters.container.join(', ')]);
  }

  if (filters.pilot && filters.pilot.length > 0) {
    data.push(['Piloto:', filters.pilot.join(', ')]);
  }

  if (filters.championship && filters.championship.length > 0) {
    data.push(['Campeonato:', filters.championship.join(', ')]);
  }

  if (filters.category && filters.category.length > 0) {
    data.push(['Categoria:', filters.category.join(', ')]);
  }

  // Se nenhum filtro aplicado
  if (data.length === 7) {
    data.push(['Nenhum filtro aplicado']);
  }

  return data;
}

/**
 * Retorna status baseado na ocupação
 */
function getOccupancyStatus(occupancy: number): string {
  if (occupancy >= 100) return '🔴 CHEIO';
  if (occupancy >= 90) return '🟠 CRÍTICO';
  if (occupancy >= 70) return '🟡 ALTO';
  if (occupancy >= 40) return '🟢 NORMAL';
  return '⚪ BAIXO';
}
