/**
 * useFocusTrap Hook
 * Mantém o foco dentro de um elemento (modal/dialog) para acessibilidade
 * WCAG 2.1 - Guideline 2.4.3: Focus Order
 */

import { useEffect } from 'react';

export function useFocusTrap(
  ref: React.RefObject<HTMLElement>, 
  isActive: boolean
) {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const element = ref.current;
    
    // Query de elementos focáveis, excluindo disabled
    const focusableSelector = `
      button:not([disabled]),
      [href],
      input:not([disabled]),
      select:not([disabled]),
      textarea:not([disabled]),
      [tabindex]:not([tabindex="-1"]):not([disabled])
    `.trim();
    
    const focusableElements = element.querySelectorAll(focusableSelector);
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Foca primeiro elemento ao abrir (com delay para garantir renderização)
    const focusTimer = setTimeout(() => {
      firstElement?.focus();
    }, 100);

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab (navegar para trás)
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab (navegar para frente)
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Adiciona listener
    element.addEventListener('keydown', handleTab);

    // Cleanup
    return () => {
      clearTimeout(focusTimer);
      element.removeEventListener('keydown', handleTab);
    };
  }, [ref, isActive]);
}
