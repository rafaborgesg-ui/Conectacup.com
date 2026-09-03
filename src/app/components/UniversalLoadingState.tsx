import { LoadingSpinner } from './LoadingSpinner';
import { FormSkeleton, TableSkeleton, CardGridSkeleton, ReportSkeleton } from './LoadingSkeleton';
import { PageHeader } from './PageHeader';
import { Card } from './ui/card';
import { LucideIcon } from 'lucide-react';

interface UniversalLoadingStateProps {
  type: 'form' | 'table' | 'grid' | 'report' | 'custom';
  title?: string;
  icon?: LucideIcon;
  text?: string;
  formFields?: number;
  tableRows?: number;
  tableColumns?: number;
  gridCount?: number;
}

/**
 * Componente universal para loading states
 * 
 * Uso rápido:
 * 
 * if (isLoading) {
 *   return <UniversalLoadingState type="form" title="Título" icon={IconComponent} />;
 * }
 */
export function UniversalLoadingState({
  type,
  title,
  icon,
  text = 'Carregando...',
  formFields = 4,
  tableRows = 10,
  tableColumns = 5,
  gridCount = 6,
}: UniversalLoadingStateProps) {
  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        {title && icon && <PageHeader icon={icon} title={title} />}
        
        {!title && (
          <div className="space-y-3">
            <div className="h-8 w-1/3 bg-gray-200 rounded animate-shimmer" />
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-shimmer" />
          </div>
        )}

        {/* Content Skeleton */}
        <Card className="p-6">
          {type === 'form' && <FormSkeleton fields={formFields} />}
          {type === 'table' && <TableSkeleton rows={tableRows} columns={tableColumns} />}
          {type === 'grid' && <CardGridSkeleton count={gridCount} />}
          {type === 'report' && <ReportSkeleton />}
          
          {type === 'custom' && (
            <div className="space-y-4">
              <div className="h-10 w-full bg-gray-200 rounded animate-shimmer" />
              <div className="h-32 w-full bg-gray-200 rounded animate-shimmer" />
            </div>
          )}
        </Card>

        {/* Loading centralizado */}
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text={text} />
        </div>
      </div>
    </div>
  );
}

// Exports específicos para uso direto
export const FormLoadingState = (props: Omit<UniversalLoadingStateProps, 'type'>) => 
  <UniversalLoadingState {...props} type="form" />;

export const TableLoadingState = (props: Omit<UniversalLoadingStateProps, 'type'>) => 
  <UniversalLoadingState {...props} type="table" />;

export const GridLoadingState = (props: Omit<UniversalLoadingStateProps, 'type'>) => 
  <UniversalLoadingState {...props} type="grid" />;

export const ReportLoadingState = (props: Omit<UniversalLoadingStateProps, 'type'>) => 
  <UniversalLoadingState {...props} type="report" />;
