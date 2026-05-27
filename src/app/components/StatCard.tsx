import { motion } from 'motion/react';
import { Calendar, ChevronDown, ChevronUp, Package, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { cn } from './ui/utils';

// ============================================
// STATCARD - COMPONENTE REUTILIZÁVEL
// Design inspirado em apps premium (Stripe, Linear)
// ============================================

export interface StatCardProps {
  /** Título principal do card */
  title: string;
  
  /** Valor numérico ou string a ser exibido */
  value: number | string;
  
  /** Label descritiva (ex: "em estoque ativo") */
  changeLabel?: string;
  
  /** Ícone do Lucide React */
  icon: React.ComponentType<{ className?: string }>;
  
  /** Cor principal (hex) - usada para ícone, texto e gradientes */
  accentColor: string;
  
  /** Cor de fundo do ícone (opcional, senão usa accentColor) */
  iconBg?: string;
  
  /** Gradiente de fundo do card (opcional) */
  gradient?: string;
  
  /** Número de containers associados (opcional) */
  containers?: number;
  
  /** Tipo/categoria do card (usado para identificação) */
  type?: string;
  
  /** Indicador de mudança/comparação (opcional) */
  change?: {
    value: number;
    label?: string;
    trend: 'up' | 'down' | 'neutral';
  };
  
  /** Callback ao clicar no card */
  onClick?: () => void;
  
  /** Estado de loading */
  isLoading?: boolean;
  
  /** Estado selecionado (visual diferenciado) */
  isSelected?: boolean;
  
  /** Variante de tamanho/densidade */
  variant?: 'default' | 'compact' | 'detailed';
  
  /** Desabilita interação */
  disabled?: boolean;
  
  /** Mostra indicador de expansão */
  expandable?: boolean;
  
  /** Classe CSS adicional */
  className?: string;
}

/**
 * Helper: Converte hex para rgba
 */
const hexToRgba = (hex: string, alpha: number = 1): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(156, 163, 175, ${alpha})`;
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * StatCard - Card de estatística reutilizável
 * 
 * @example
 * ```tsx
 * <StatCard
 *   title="Total de Pneus"
 *   value={1234}
 *   icon={Package}
 *   accentColor="#3B82F6"
 *   changeLabel="em estoque ativo"
 *   containers={12}
 *   onClick={() => handleCardClick('total')}
 *   isSelected={selectedCard === 'total'}
 * />
 * ```
 */
export function StatCard({
  title,
  value,
  changeLabel,
  icon: Icon,
  accentColor,
  iconBg,
  gradient,
  containers,
  type,
  change,
  onClick,
  isLoading = false,
  isSelected = false,
  variant = 'default',
  disabled = false,
  expandable = true,
  className
}: StatCardProps) {
  
  // Estados de variante
  const isCompact = variant === 'compact';
  const isDetailed = variant === 'detailed';
  
  // Cor do ícone (prioriza iconBg, senão usa accentColor)
  const effectiveIconBg = iconBg || accentColor;
  
  // Skeleton durante loading
  if (isLoading) {
    return (
      <Card className={cn("p-6 space-y-4", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-10 rounded-lg" />
          {change && <Skeleton className="h-6 w-16 rounded-full" />}
        </div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-24" />
        {changeLabel && <Skeleton className="h-3 w-28" />}
      </Card>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: disabled ? 0 : -4 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden group transition-all duration-300 h-full flex flex-col",
          !disabled && onClick && "cursor-pointer hover:shadow-lg",
          isSelected && "ring-2 ring-offset-2",
          disabled && "opacity-60 cursor-not-allowed",
          isCompact && "p-4",
          isDetailed && "p-6",
          !isCompact && !isDetailed && "p-5",
          className
        )}
        onClick={disabled ? undefined : onClick}
        style={{
          borderColor: isSelected ? accentColor : undefined,
          boxShadow: isSelected ? `0 0 0 3px ${hexToRgba(accentColor, 0.1)}` : undefined
        }}
        role={onClick ? "button" : undefined}
        tabIndex={onClick && !disabled ? 0 : undefined}
        aria-pressed={isSelected}
        aria-label={`${title}: ${value}`}
      >
        {/* Gradiente de fundo sutil */}
        {gradient && (
          <div 
            className={cn(
              "absolute inset-0 opacity-50 transition-opacity duration-300",
              !disabled && "group-hover:opacity-70"
            )}
            style={{
              background: `linear-gradient(135deg, ${gradient})`
            }}
          />
        )}
        
        {/* Fundo de destaque quando selecionado */}
        {!gradient && (
          <div 
            className="absolute inset-0 opacity-0 transition-opacity duration-300"
            style={{
              background: hexToRgba(accentColor, 0.05),
              opacity: isSelected ? 0.1 : 0
            }}
          />
        )}
        
        {/* Content */}
        <div className="relative space-y-3">
          {/* Header: Ícone + Badge de Mudança */}
          <div className="flex items-center justify-between">
            <motion.div 
              className={cn(
                "rounded-lg shadow-sm transition-all duration-300",
                !disabled && "group-hover:rotate-6 group-hover:scale-110",
                isCompact ? "p-2" : "p-2.5"
              )}
              style={{
                background: `linear-gradient(135deg, ${effectiveIconBg} 0%, ${effectiveIconBg}dd 100%)`
              }}
              whileHover={{ rotate: disabled ? 0 : 12 }}
            >
              <Icon className={cn(
                "text-white",
                isCompact ? "w-4 h-4" : "w-5 h-5"
              )} />
            </motion.div>
            
            {change && (
              <Badge 
                variant={change.trend === 'up' ? 'default' : change.trend === 'down' ? 'destructive' : 'secondary'}
                className="flex items-center gap-1 text-xs"
              >
                {change.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {change.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                {change.value > 0 ? '+' : ''}{change.value}%
              </Badge>
            )}
          </div>

          {/* Título */}
          <div>
            <p 
              className={cn(
                "font-medium mb-1",
                isCompact ? "text-xs" : "text-sm"
              )}
              style={{ color: accentColor }}
            >
              {title}
            </p>
            
            {/* Valor principal */}
            <p 
              className={cn(
                "font-bold tabular-nums",
                isCompact ? "text-2xl" : isDetailed ? "text-4xl" : "text-3xl"
              )}
              style={{ color: accentColor }}
            >
              {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
            </p>
          </div>

          {/* Footer: Labels e Metadados */}
          <div className="space-y-1">
            {changeLabel && (
              <p 
                className={cn(
                  "flex items-center gap-1",
                  isCompact ? "text-[10px]" : "text-xs"
                )}
                style={{ color: hexToRgba(accentColor, 0.8) }}
              >
                <Calendar className={cn(isCompact ? "w-2.5 h-2.5" : "w-3 h-3")} />
                {changeLabel}
              </p>
            )}
            
            {change?.label && (
              <p 
                className={cn(
                  "flex items-center gap-1",
                  isCompact ? "text-[10px]" : "text-xs"
                )}
                style={{ color: hexToRgba(accentColor, 0.7) }}
              >
                {change.label}
              </p>
            )}
            
            {containers !== undefined && (
              <p 
                className={cn(
                  "font-medium flex items-center gap-1",
                  isCompact ? "text-[10px]" : "text-xs"
                )}
                style={{ color: hexToRgba(accentColor, 0.7) }}
              >
                <Package className={cn(isCompact ? "w-2.5 h-2.5" : "w-3 h-3")} />
                {containers} {containers === 1 ? 'container' : 'containers'}
              </p>
            )}
          </div>

          {/* Indicador de expansão (se clicável) */}
          {expandable && onClick && !disabled && (
            <div 
              className={cn(
                "absolute bottom-2 right-2 transition-transform duration-300",
                isSelected && "rotate-180"
              )}
              style={{ color: hexToRgba(accentColor, 0.6) }}
              aria-hidden="true"
            >
              {isSelected ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          )}
        </div>

        {/* Shine effect on hover */}
        {!disabled && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />
        )}
        
        {/* Borda superior de destaque */}
        {isSelected && (
          <motion.div
            layoutId="selected-indicator"
            className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
            style={{ backgroundColor: accentColor }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          />
        )}
      </Card>
    </motion.div>
  );
}

/**
 * StatCardSkeleton - Skeleton loader para StatCard
 */
export function StatCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' | 'detailed' }) {
  const isCompact = variant === 'compact';
  const isDetailed = variant === 'detailed';
  
  return (
    <Card className={cn(
      "space-y-4",
      isCompact && "p-4",
      isDetailed && "p-6",
      !isCompact && !isDetailed && "p-5"
    )}>
      <div className="flex items-center justify-between">
        <Skeleton className={cn(
          "rounded-lg",
          isCompact ? "h-8 w-8" : "h-10 w-10"
        )} />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className={cn(
        isCompact ? "h-3 w-24" : "h-4 w-32"
      )} />
      <Skeleton className={cn(
        isCompact ? "h-6 w-20" : isDetailed ? "h-10 w-28" : "h-8 w-24"
      )} />
      <Skeleton className={cn(
        isCompact ? "h-2 w-20" : "h-3 w-28"
      )} />
    </Card>
  );
}
