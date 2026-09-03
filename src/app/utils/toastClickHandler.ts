/**
 * 🎯 Toast Click Handler - v1.1.0
 * Handler global para fechar toasts ao clicar neles (exceto botões e elementos interativos)
 * Fix: Removidos logs para evitar poluição do console
 */

import { toast } from "sonner@2.0.3";

let initialized = false;

export function initToastClickHandler() {
  // Evita inicialização duplicada
  if (initialized) return;
  
  // Event delegation - escuta cliques em todo o documento
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    
    // Verifica se o clique foi dentro de um toast
    const toastElement = target.closest('[data-sonner-toast]');
    if (!toastElement) return;
    
    // Não fecha se clicar no botão X
    const isCloseButton = target.closest('button[data-close-button]') || 
                         target.closest('button[aria-label="Close toast"]');
    if (isCloseButton) return;
    
    // Não fecha se clicar em um botão (pode ser botão de ação)
    if (target.tagName === 'BUTTON') return;
    
    // Não fecha se clicar em links ou inputs
    if (['A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    
    // Fecha todos os toasts (comportamento padrão do Sonner quando não há ID)
    toast.dismiss();
  }, false);
  
  initialized = true;
}