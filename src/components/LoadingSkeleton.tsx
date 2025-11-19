import { cn } from '../components/ui/utils';
import { Card } from './ui/card';

interface SkeletonProps {
  className?: string;
}

// Skeleton básico (base para outros)
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div 
      className={cn(
        'animate-pulse rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]',
        'animate-shimmer',
        className
      )}
      style={{
        animation: 'shimmer 2s ease-in-out infinite'
      }}
    />
  );
}

// Skeleton para Cards KPI do Dashboard
export function DashboardCardSkeleton() {
  return (
    <Card className="p-3 sm:p-4 space-y-3">
      {/* Header com ícone */}
      <div className="flex items-center justify-between">
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>

      {/* Título */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-8 w-1/2" />
      </div>

      {/* Footer */}
      <div className="space-y-1">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </Card>
  );
}

// Skeleton para Tabela
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className={cn(
                'h-4 flex-1',
                // Primeira coluna mais estreita (checkbox/id)
                colIndex === 0 && 'max-w-[50px]'
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Skeleton para Form
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          {/* Label */}
          <Skeleton className="h-4 w-1/4" />
          {/* Input */}
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}

      {/* Botões */}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  );
}

// Skeleton para Grid de Cards
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>

          {/* Conteúdo */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Skeleton para Lista de Itens
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
          {/* Avatar/Icon */}
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          
          {/* Conteúdo */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>

          {/* Action */}
          <Skeleton className="w-8 h-8 rounded-md flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

// Skeleton para Gráfico
export function ChartSkeleton() {
  return (
    <Card className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>

      {/* Gráfico */}
      <div className="space-y-2">
        {/* Barras/linhas simuladas */}
        <div className="flex items-end gap-2 h-48">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="flex-1"
              style={{ 
                height: `${Math.random() * 60 + 40}%` 
              }}
            />
          ))}
        </div>

        {/* Eixo X */}
        <div className="flex justify-between px-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-8" />
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 justify-center">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </Card>
  );
}

// Skeleton para Página Completa
export function PageSkeleton() {
  return (
    <div className="px-3 py-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Cards KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <DashboardCardSkeleton key={i} />
        ))}
      </div>

      {/* Conteúdo Principal */}
      <Card className="p-4 sm:p-6">
        <TableSkeleton />
      </Card>
    </div>
  );
}

// Skeleton para Entry de Estoque (específico)
export function StockEntrySkeleton() {
  return (
    <div className="space-y-6">
      {/* Seleção de Modelo */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      </div>

      {/* Container */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Código de Barras */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Botão */}
      <Skeleton className="h-12 w-full rounded-md" />

      {/* Últimas Entradas */}
      <div className="space-y-3 pt-4">
        <Skeleton className="h-5 w-48" />
        <ListSkeleton items={3} />
      </div>
    </div>
  );
}

// Skeleton para Relatórios
export function ReportSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="p-4 space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Tabela */}
      <Card className="p-4 sm:p-6">
        <TableSkeleton rows={10} columns={6} />
      </Card>
    </div>
  );
}

// CSS para animação shimmer (adicionar ao globals.css)
export const shimmerStyles = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-shimmer {
  background: linear-gradient(
    90deg,
    rgba(229, 231, 235, 1) 0%,
    rgba(243, 244, 246, 1) 50%,
    rgba(229, 231, 235, 1) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s ease-in-out infinite;
}
`;
