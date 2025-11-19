/**
 * 🦾 Utilitários de Acessibilidade (a11y)
 * 
 * Helpers para melhorar acessibilidade da aplicação
 */

/**
 * Verifica se uma cor tem contraste suficiente (WCAG AA)
 * @param foreground - Cor do texto (hex)
 * @param background - Cor de fundo (hex)
 * @returns Ratio de contraste
 */
export function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (hex: string): number => {
    // Remove # se presente
    hex = hex.replace('#', '');
    
    // Converte para RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // Aplica fórmula de luminância relativa
    const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Verifica se o contraste atende aos padrões WCAG
 * @param ratio - Ratio de contraste
 * @param level - Nível desejado ('AA' ou 'AAA')
 * @param isLargeText - Se é texto grande (18pt+ ou 14pt+ negrito)
 */
export function meetsWCAG(
  ratio: number,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Sugere cor de texto adequada baseada no fundo
 * @param backgroundColor - Cor de fundo (hex)
 * @returns '#000000' ou '#FFFFFF'
 */
export function suggestTextColor(backgroundColor: string): string {
  const whiteRatio = getContrastRatio('#FFFFFF', backgroundColor);
  const blackRatio = getContrastRatio('#000000', backgroundColor);
  
  return whiteRatio > blackRatio ? '#FFFFFF' : '#000000';
}

/**
 * Gera ID único para vincular label e input
 */
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Cria props ARIA para input com label
 */
export function createInputA11yProps(
  label: string,
  options: {
    required?: boolean;
    invalid?: boolean;
    errorMessage?: string;
    description?: string;
  } = {}
) {
  const id = generateA11yId('input');
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  
  return {
    id,
    'aria-labelledby': labelId,
    'aria-required': options.required || undefined,
    'aria-invalid': options.invalid || undefined,
    'aria-errormessage': options.invalid && options.errorMessage ? errorId : undefined,
    'aria-describedby': options.description ? descriptionId : undefined,
    labelProps: {
      id: labelId,
      htmlFor: id
    },
    errorProps: options.invalid && options.errorMessage ? {
      id: errorId,
      role: 'alert',
      'aria-live': 'polite' as const
    } : undefined,
    descriptionProps: options.description ? {
      id: descriptionId
    } : undefined
  };
}

/**
 * Cria props ARIA para componente de notificação/toast
 */
export function createToastA11yProps(
  type: 'success' | 'error' | 'warning' | 'info' = 'info'
) {
  return {
    role: type === 'error' ? 'alert' : 'status',
    'aria-live': type === 'error' ? 'assertive' : 'polite' as const,
    'aria-atomic': true as const
  };
}

/**
 * Cria props ARIA para dialog/modal
 */
export function createDialogA11yProps(title: string, description?: string) {
  const titleId = generateA11yId('dialog-title');
  const descId = description ? generateA11yId('dialog-desc') : undefined;
  
  return {
    role: 'dialog',
    'aria-modal': true as const,
    'aria-labelledby': titleId,
    'aria-describedby': descId,
    titleProps: {
      id: titleId
    },
    descriptionProps: descId ? {
      id: descId
    } : undefined
  };
}

/**
 * Cria props ARIA para loading spinner
 */
export function createLoadingA11yProps(message: string = 'Carregando...') {
  return {
    role: 'status',
    'aria-live': 'polite' as const,
    'aria-label': message
  };
}

/**
 * Cria props ARIA para botão de ação (delete, edit, etc)
 */
export function createActionButtonA11yProps(
  action: string,
  itemName?: string
) {
  const label = itemName ? `${action} ${itemName}` : action;
  
  return {
    'aria-label': label,
    title: label
  };
}

/**
 * Cria props ARIA para status badge
 */
export function createStatusBadgeA11yProps(
  status: string,
  description?: string
) {
  return {
    role: 'status',
    'aria-label': description || `Status: ${status}`
  };
}

/**
 * Anuncia mensagem para screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove após 1 segundo
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Gerencia foco em trap (para modals/dialogs)
 */
export class FocusTrap {
  private container: HTMLElement;
  private previousFocus: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];
  
  constructor(container: HTMLElement) {
    this.container = container;
  }
  
  activate() {
    // Salva elemento com foco atual
    this.previousFocus = document.activeElement as HTMLElement;
    
    // Encontra elementos focáveis
    this.focusableElements = Array.from(
      this.container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    
    // Foca primeiro elemento
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }
    
    // Adiciona listener de teclado
    document.addEventListener('keydown', this.handleKeyDown);
  }
  
  deactivate() {
    // Remove listener
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Restaura foco anterior
    if (this.previousFocus) {
      this.previousFocus.focus();
    }
  }
  
  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];
    
    // Shift + Tab no primeiro elemento -> vai para o último
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    }
    // Tab no último elemento -> vai para o primeiro
    else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  };
}

/**
 * Verifica se um elemento está visível na viewport
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Scroll suave para elemento com focus
 */
export function scrollToElement(
  element: HTMLElement,
  options: ScrollIntoViewOptions = {
    behavior: 'smooth',
    block: 'center'
  }
) {
  element.scrollIntoView(options);
  
  // Foca elemento após scroll (com delay para suavidade)
  setTimeout(() => {
    element.focus();
  }, 300);
}

/**
 * Verifica se navegação é por teclado
 */
export function isKeyboardNavigation(): boolean {
  return document.body.classList.contains('keyboard-navigation');
}

/**
 * Inicializa detecção de navegação por teclado
 */
export function initKeyboardNavigationDetection() {
  // Detecta uso de teclado
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
    }
  });
  
  // Detecta uso de mouse
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
  });
}

/**
 * Formata número para leitura por screen reader
 */
export function formatNumberForScreenReader(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num);
}

/**
 * Formata data para leitura por screen reader
 */
export function formatDateForScreenReader(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(d);
}

/**
 * Cria descrição acessível para gráfico
 */
export function createChartA11yDescription(
  type: 'bar' | 'line' | 'pie',
  data: Array<{ label: string; value: number }>,
  title?: string
): string {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const descriptions = data.map(item => 
    `${item.label}: ${formatNumberForScreenReader(item.value)}`
  );
  
  return `
    ${title ? `${title}. ` : ''}
    Gráfico de ${type === 'bar' ? 'barras' : type === 'line' ? 'linhas' : 'pizza'}
    com ${data.length} ${data.length === 1 ? 'item' : 'itens'}.
    Total: ${formatNumberForScreenReader(totalValue)}.
    ${descriptions.join('. ')}.
  `.trim().replace(/\s+/g, ' ');
}

/**
 * Cores com contraste garantido WCAG AA
 */
export const ACCESSIBLE_COLORS = {
  // Texto escuro em fundos claros
  darkOnLight: {
    text: '#1F2937',      // gray-800
    textSecondary: '#4B5563', // gray-600
    background: '#FFFFFF',
    backgroundAlt: '#F9FAFB' // gray-50
  },
  
  // Texto claro em fundos escuros
  lightOnDark: {
    text: '#F9FAFB',      // gray-50
    textSecondary: '#D1D5DB', // gray-300
    background: '#1F2937', // gray-800
    backgroundAlt: '#111827' // gray-900
  },
  
  // Status com bom contraste
  status: {
    success: {
      text: '#065F46',    // green-800
      background: '#D1FAE5' // green-100
    },
    error: {
      text: '#991B1B',    // red-800
      background: '#FEE2E2' // red-100
    },
    warning: {
      text: '#92400E',    // yellow-800
      background: '#FEF3C7' // yellow-100
    },
    info: {
      text: '#1E40AF',    // blue-800
      background: '#DBEAFE' // blue-100
    }
  },
  
  // Porsche Cup com contraste garantido
  porscheCup: {
    primary: {
      text: '#FFFFFF',
      background: '#D50000' // Vermelho Porsche - ratio 4.54:1 com branco
    },
    secondary: {
      text: '#1F2937',
      background: '#F3F4F6' // gray-100
    }
  }
};

/**
 * Valida cor de fundo e sugere cor de texto acessível
 */
export function ensureAccessibleContrast(backgroundColor: string): {
  textColor: string;
  meetsWCAG_AA: boolean;
  meetsWCAG_AAA: boolean;
  ratio: number;
} {
  const textColor = suggestTextColor(backgroundColor);
  const ratio = getContrastRatio(textColor, backgroundColor);
  
  return {
    textColor,
    meetsWCAG_AA: meetsWCAG(ratio, 'AA'),
    meetsWCAG_AAA: meetsWCAG(ratio, 'AAA'),
    ratio
  };
}
