/**
 * Utilitários para gerenciamento de storage de fotos de avarias de rodas
 */

import { createClient } from './supabase/client';

const BUCKET_NAME = 'wheel-damage-photos';

/**
 * Faz upload de uma foto para o Supabase Storage
 * @param file Arquivo da foto (já processado com marca d'água)
 * @param damageId ID da avaria para organizar no storage
 * @returns URL pública da foto ou null em caso de erro
 */
export async function uploadDamagePhoto(file: File, damageId: string): Promise<string | null> {
  try {
    const supabase = createClient();
    
    // Gera nome único para o arquivo
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${damageId}/${timestamp}.${fileExtension}`;

    // Faz upload do arquivo
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) {
      console.error('❌ Erro ao fazer upload da foto:', error);
      return null;
    }

    // Obtém URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    console.log('✅ Foto enviada com sucesso:', publicUrl);
    return publicUrl;

  } catch (error) {
    console.error('❌ Erro ao processar upload:', error);
    return null;
  }
}

/**
 * Faz upload de múltiplas fotos
 * @param files Array de arquivos
 * @param damageId ID da avaria
 * @returns Array de URLs públicas
 */
export async function uploadMultipleDamagePhotos(
  files: File[], 
  damageId: string
): Promise<string[]> {
  const uploadPromises = files.map(file => uploadDamagePhoto(file, damageId));
  const results = await Promise.all(uploadPromises);
  
  // Filtra resultados com sucesso (não null)
  return results.filter(url => url !== null) as string[];
}

/**
 * Remove uma foto do storage
 * @param photoUrl URL da foto
 */
export async function deleteDamagePhoto(photoUrl: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Extrai o path do arquivo da URL
    const url = new URL(photoUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(pathParts.indexOf(BUCKET_NAME) + 1).join('/');

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('❌ Erro ao deletar foto:', error);
      return false;
    }

    console.log('✅ Foto deletada com sucesso');
    return true;

  } catch (error) {
    console.error('❌ Erro ao processar deleção:', error);
    return false;
  }
}

/**
 * Remove todas as fotos de uma avaria
 * @param damageId ID da avaria
 */
export async function deleteAllDamagePhotos(damageId: string): Promise<boolean> {
  try {
    const supabase = createClient();

    // Lista todas as fotos da avaria
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(damageId);

    if (listError) {
      console.error('❌ Erro ao listar fotos:', listError);
      return false;
    }

    if (!files || files.length === 0) {
      console.log('⚠️ Nenhuma foto encontrada para deletar');
      return true;
    }

    // Remove todas as fotos
    const filePaths = files.map(file => `${damageId}/${file.name}`);
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths);

    if (deleteError) {
      console.error('❌ Erro ao deletar fotos:', deleteError);
      return false;
    }

    console.log(`✅ ${files.length} fotos deletadas com sucesso`);
    return true;

  } catch (error) {
    console.error('❌ Erro ao processar deleção em lote:', error);
    return false;
  }
}
