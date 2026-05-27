/**
 * Utilitário para copiar texto para o clipboard de forma segura
 * Funciona mesmo quando a API do Clipboard está bloqueada por políticas de permissão
 */

/**
 * Copia texto para o clipboard usando fallback para browsers que bloqueiam a API
 */
export async function copyToClipboard(text: string): Promise<void> {
  // Tenta usar a API moderna do Clipboard primeiro
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      console.warn('Clipboard API bloqueada, usando fallback:', error);
      // Se falhar, usa o método fallback abaixo
    }
  }

  // Fallback: usa o método antigo com document.execCommand
  return copyToClipboardFallback(text);
}

/**
 * Método fallback para copiar texto quando a API do Clipboard está bloqueada
 */
function copyToClipboardFallback(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Cria um elemento textarea temporário
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Torna o textarea invisível mas ainda focável
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    
    // Seleciona o texto
    textArea.focus();
    textArea.select();
    
    try {
      // Tenta copiar usando o comando antigo
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        resolve();
      } else {
        reject(new Error('Falha ao copiar usando execCommand'));
      }
    } catch (err) {
      document.body.removeChild(textArea);
      reject(err);
    }
  });
}

/**
 * Lê texto do clipboard de forma segura
 */
export async function readFromClipboard(): Promise<string> {
  // Tenta usar a API moderna do Clipboard
  if (navigator.clipboard && navigator.clipboard.readText) {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      console.warn('Clipboard API bloqueada para leitura:', error);
      throw new Error('Não foi possível ler do clipboard. Use Ctrl+V manualmente.');
    }
  }
  
  throw new Error('API do Clipboard não disponível');
}
