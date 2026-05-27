import { useEffect, useRef } from 'react';

export interface KeyboardConfig {
  /**
   * Scroll focused input to center of viewport
   * @default true
   */
  autoScroll?: boolean;

  /**
   * Delay before scrolling (ms) - wait for keyboard animation
   * @default 300
   */
  scrollDelay?: number;

  /**
   * Adjust scroll position (positive = scroll down more, negative = scroll up more)
   * @default 0
   */
  scrollOffset?: number;

  /**
   * Prevent zoom on input focus (iOS)
   * @default true
   */
  preventZoom?: boolean;

  /**
   * Add padding to bottom when keyboard is open
   * @default true
   */
  addBottomPadding?: boolean;

  /**
   * Callback when keyboard opens
   */
  onKeyboardOpen?: () => void;

  /**
   * Callback when keyboard closes
   */
  onKeyboardClose?: () => void;
}

/**
 * Hook para lidar com o teclado virtual mobile
 * 
 * Features:
 * - Auto-scroll quando input recebe foco
 * - Detecta abertura/fechamento do teclado
 * - Previne zoom no iOS
 * - Adiciona padding quando necessário
 * - Ajusta viewport
 * 
 * @example
 * ```tsx
 * function MyForm() {
 *   useKeyboardAdjustment({
 *     autoScroll: true,
 *     preventZoom: true,
 *     onKeyboardOpen: () => console.log('Keyboard opened'),
 *   });
 * 
 *   return <form>...</form>;
 * }
 * ```
 */
export function useKeyboardAdjustment(config: KeyboardConfig = {}) {
  const {
    autoScroll = true,
    scrollDelay = 300,
    scrollOffset = 0,
    preventZoom = true,
    addBottomPadding = true,
    onKeyboardOpen,
    onKeyboardClose,
  } = config;

  const keyboardOpen = useRef(false);
  const originalViewportHeight = useRef(0);

  useEffect(() => {
    // Previne zoom em inputs (iOS)
    if (preventZoom) {
      // Adiciona font-size mínimo de 16px para prevenir zoom
      const style = document.createElement('style');
      style.textContent = `
        input, textarea, select {
          font-size: 16px !important;
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, [preventZoom]);

  useEffect(() => {
    // Guarda altura original do viewport
    originalViewportHeight.current = window.visualViewport?.height || window.innerHeight;

    // Auto-scroll quando input recebe foco
    if (autoScroll) {
      const handleFocus = (e: FocusEvent) => {
        const target = e.target as HTMLElement;

        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT'
        ) {
          setTimeout(() => {
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });

            // Ajuste adicional se configurado
            if (scrollOffset !== 0) {
              window.scrollBy(0, scrollOffset);
            }
          }, scrollDelay);
        }
      };

      document.addEventListener('focusin', handleFocus);

      return () => {
        document.removeEventListener('focusin', handleFocus);
      };
    }
  }, [autoScroll, scrollDelay, scrollOffset]);

  useEffect(() => {
    // Detecta abertura/fechamento do teclado via Visual Viewport API
    if (window.visualViewport) {
      const handleResize = () => {
        const currentHeight = window.visualViewport!.height;
        const heightDiff = originalViewportHeight.current - currentHeight;

        // Considera teclado aberto se altura diminuiu mais de 150px
        const isKeyboardOpen = heightDiff > 150;

        if (isKeyboardOpen && !keyboardOpen.current) {
          // Teclado abriu
          keyboardOpen.current = true;

          if (addBottomPadding) {
            document.body.style.paddingBottom = `${heightDiff}px`;
          }

          onKeyboardOpen?.();
        } else if (!isKeyboardOpen && keyboardOpen.current) {
          // Teclado fechou
          keyboardOpen.current = false;

          if (addBottomPadding) {
            document.body.style.paddingBottom = '0';
          }

          onKeyboardClose?.();
        }
      };

      window.visualViewport.addEventListener('resize', handleResize);

      return () => {
        window.visualViewport!.removeEventListener('resize', handleResize);
        if (addBottomPadding) {
          document.body.style.paddingBottom = '0';
        }
      };
    }
  }, [addBottomPadding, onKeyboardOpen, onKeyboardClose]);

  return {
    isKeyboardOpen: keyboardOpen.current,
  };
}

/**
 * Hook simplificado - apenas scroll ao focar
 * 
 * @example
 * ```tsx
 * useAutoScrollOnFocus();
 * ```
 */
export function useAutoScrollOnFocus(delay = 300) {
  useKeyboardAdjustment({
    autoScroll: true,
    scrollDelay: delay,
    preventZoom: true,
    addBottomPadding: false,
  });
}

/**
 * Componente wrapper para adicionar keyboard handling
 * 
 * @example
 * ```tsx
 * <KeyboardAware>
 *   <form>
 *     <input />
 *     <button>Submit</button>
 *   </form>
 * </KeyboardAware>
 * ```
 */
export function KeyboardAware({ 
  children, 
  config 
}: { 
  children: React.ReactNode;
  config?: KeyboardConfig;
}) {
  useKeyboardAdjustment(config);
  return <>{children}</>;
}
