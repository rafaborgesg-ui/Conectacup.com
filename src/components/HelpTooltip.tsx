import { ReactNode, useState } from 'react';
import { HelpCircle, Info, Lightbulb, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface HelpTooltipProps {
  content: string;
  type?: 'help' | 'info' | 'tip' | 'warning';
  side?: 'top' | 'right' | 'bottom' | 'left';
  children?: ReactNode;
  className?: string;
  iconSize?: number;
  maxWidth?: number;
  showIcon?: boolean;
}

/**
 * HelpTooltip - Tooltip contextual inteligente
 * 
 * Uso:
 * 
 * 1. Wrapper de campo:
 *    <HelpTooltip content="Digite o código de 7-8 dígitos">
 *      <Input />
 *    </HelpTooltip>
 * 
 * 2. Ícone standalone:
 *    <HelpTooltip content="Dica importante" showIcon />
 * 
 * 3. Tipos diferentes:
 *    <HelpTooltip content="Ajuda" type="help" />
 *    <HelpTooltip content="Informação" type="info" />
 *    <HelpTooltip content="Dica rápida" type="tip" />
 *    <HelpTooltip content="Atenção!" type="warning" />
 */
export function HelpTooltip({
  content,
  type = 'help',
  side = 'top',
  children,
  className = '',
  iconSize = 16,
  maxWidth = 280,
  showIcon = true,
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Ícones por tipo
  const icons = {
    help: HelpCircle,
    info: Info,
    tip: Lightbulb,
    warning: AlertCircle,
  };

  // Cores por tipo
  const colors = {
    help: 'text-blue-500 hover:text-blue-600',
    info: 'text-gray-500 hover:text-gray-600',
    tip: 'text-yellow-600 hover:text-yellow-700',
    warning: 'text-red-500 hover:text-red-600',
  };

  // Estilos do conteúdo por tipo
  const contentStyles = {
    help: 'bg-blue-50 border-blue-200 text-blue-900',
    info: 'bg-gray-50 border-gray-200 text-gray-900',
    tip: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    warning: 'bg-red-50 border-red-200 text-red-900',
  };

  const Icon = icons[type];
  const colorClass = colors[type];
  const contentClass = contentStyles[type];

  // Se tem children, envolve eles + ícone
  if (children) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip open={isOpen} onOpenChange={setIsOpen}>
          <div className={`inline-flex items-center gap-2 ${className}`}>
            {children}
            {showIcon && (
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`flex-shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 rounded-full ${colorClass}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  aria-label="Ajuda"
                >
                  <Icon size={iconSize} strokeWidth={2} />
                </button>
              </TooltipTrigger>
            )}
          </div>
          <TooltipContent 
            side={side} 
            className={`border ${contentClass} shadow-lg`}
            style={{ maxWidth: `${maxWidth}px` }}
          >
            <p className="text-xs leading-relaxed">{content}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Ícone standalone
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex flex-shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 rounded-full ${colorClass} ${className}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            aria-label="Ajuda"
          >
            <Icon size={iconSize} strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          className={`border ${contentClass} shadow-lg`}
          style={{ maxWidth: `${maxWidth}px` }}
        >
          <p className="text-xs leading-relaxed">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * FieldWithHelp - Campo com ajuda integrada
 * 
 * Uso:
 * <FieldWithHelp
 *   label="Código de Barras"
 *   help="Digite o código de 7-8 dígitos do pneu"
 * >
 *   <Input />
 * </FieldWithHelp>
 */
interface FieldWithHelpProps {
  label: string;
  help: string;
  children: ReactNode;
  required?: boolean;
  type?: 'help' | 'info' | 'tip' | 'warning';
  className?: string;
}

export function FieldWithHelp({
  label,
  help,
  children,
  required = false,
  type = 'help',
  className = '',
}: FieldWithHelpProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-sm text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <HelpTooltip content={help} type={type} iconSize={14} showIcon />
      </div>
      {children}
    </div>
  );
}

/**
 * SectionHelp - Ajuda para seções inteiras
 * 
 * Uso:
 * <SectionHelp
 *   title="Seleção Rápida"
 *   help="Use os atalhos de teclado A-G ou 1-7 para selecionar modelos rapidamente"
 * />
 */
interface SectionHelpProps {
  title?: string;
  help: string;
  type?: 'help' | 'info' | 'tip' | 'warning';
  className?: string;
}

export function SectionHelp({
  title,
  help,
  type = 'info',
  className = '',
}: SectionHelpProps) {
  const bgColors = {
    help: 'bg-blue-50 border-blue-200',
    info: 'bg-gray-50 border-gray-200',
    tip: 'bg-yellow-50 border-yellow-200',
    warning: 'bg-red-50 border-red-200',
  };

  const textColors = {
    help: 'text-blue-900',
    info: 'text-gray-900',
    tip: 'text-yellow-900',
    warning: 'text-red-900',
  };

  const iconColors = {
    help: 'text-blue-500',
    info: 'text-gray-500',
    tip: 'text-yellow-600',
    warning: 'text-red-500',
  };

  const icons = {
    help: HelpCircle,
    info: Info,
    tip: Lightbulb,
    warning: AlertCircle,
  };

  const Icon = icons[type];

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${bgColors[type]} ${className}`}>
      <Icon size={16} className={`flex-shrink-0 mt-0.5 ${iconColors[type]}`} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-xs font-semibold ${textColors[type]} mb-1`}>
            {title}
          </p>
        )}
        <p className={`text-xs ${textColors[type]} opacity-90 leading-relaxed`}>
          {help}
        </p>
      </div>
    </div>
  );
}

/**
 * QuickTip - Dica rápida inline
 * 
 * Uso:
 * <QuickTip>Pressione Enter para confirmar</QuickTip>
 */
interface QuickTipProps {
  children: ReactNode;
  className?: string;
}

export function QuickTip({ children, className = '' }: QuickTipProps) {
  return (
    <div className={`flex items-center gap-1.5 text-xs text-gray-500 ${className}`}>
      <Lightbulb size={12} className="text-yellow-600 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}
