/**
 * Utilitários para manipulação de strings
 */

/**
 * Sanitiza nome de arquivo removendo caracteres inválidos
 * Caracteres inválidos no Excel/Windows: : \ / ? * [ ]
 * 
 * @param fileName - Nome do arquivo a ser sanitizado
 * @param replacement - Caractere de substituição (padrão: '_')
 * @returns Nome do arquivo sanitizado
 * 
 * @example
 * sanitizeFileName('Temporada: 2024/2025') // 'Temporada_ 2024_2025'
 * sanitizeFileName('Etapa [1]') // 'Etapa _1_'
 */
export function sanitizeFileName(fileName: string, replacement: string = '_'): string {
  // Remove ou substitui caracteres inválidos: : \ / ? * [ ]
  return fileName.replace(/[:\\/\?*\[\]]/g, replacement);
}

/**
 * Sanitiza nome de planilha Excel (sheet name)
 * Excel tem limite de 31 caracteres e não permite: : \ / ? * [ ]
 * 
 * @param sheetName - Nome da planilha a ser sanitizado
 * @param maxLength - Tamanho máximo (padrão: 31)
 * @returns Nome da planilha sanitizado
 * 
 * @example
 * sanitizeSheetName('Chassis: 701') // 'Chassis_ 701'
 * sanitizeSheetName('Nome muito longo que precisa ser cortado', 20) // 'Nome muito longo que'
 */
export function sanitizeSheetName(sheetName: string, maxLength: number = 31): string {
  // Remove caracteres inválidos
  const sanitized = sheetName.replace(/[:\\/\?*\[\]]/g, '_');
  
  // Limita tamanho
  return sanitized.substring(0, maxLength);
}

/**
 * Normaliza string para uso em IDs ou URLs
 * Remove acentos, converte para lowercase e substitui espaços
 * 
 * @param str - String a ser normalizada
 * @returns String normalizada
 * 
 * @example
 * normalizeForId('São Paulo - SP') // 'sao-paulo-sp'
 */
export function normalizeForId(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Substitui não-alfanuméricos por hífen
    .replace(/^-+|-+$/g, ''); // Remove hífens no início e fim
}

/**
 * Trunca string adicionando reticências se necessário
 * 
 * @param str - String a ser truncada
 * @param maxLength - Tamanho máximo
 * @param ellipsis - Reticências (padrão: '...')
 * @returns String truncada
 * 
 * @example
 * truncate('Texto muito longo', 10) // 'Texto m...'
 */
export function truncate(str: string, maxLength: number, ellipsis: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - ellipsis.length) + ellipsis;
}
