/**
 * Utilitário para gerar UUIDs v4 compatíveis com Supabase
 * 
 * IMPORTANTE: Este utilitário corrige o problema de IDs inválidos
 * que causavam erros "invalid input syntax for type uuid"
 */

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Valida se uma string é um UUID válido
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Converte IDs sequenciais antigos para UUIDs válidos
 * Usado para migração de dados existentes
 */
export function convertLegacyIdToUUID(legacyId: string): string {
  // Se já é um UUID válido, retorna como está
  if (isValidUUID(legacyId)) {
    return legacyId;
  }
  
  // Para IDs sequenciais ("1", "2", etc.), gera um UUID baseado no valor
  const num = parseInt(legacyId) || 0;
  const paddedNum = num.toString().padStart(8, '0');
  
  return `${paddedNum}-0000-4000-8000-000000000000`;
}