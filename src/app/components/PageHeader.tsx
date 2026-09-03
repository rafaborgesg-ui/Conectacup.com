import { LucideIcon, ChevronRight } from 'lucide-react';
import { cn } from './ui/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ 
  icon: Icon, 
  title, 
  description, 
  breadcrumbs = [],
  actions,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 md:mb-8", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <Breadcrumb className="mb-3">
          
        </Breadcrumb>
      )}

      {/* Header Content */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="hidden sm:flex w-12 h-12 bg-gradient-to-br from-[#D50000] to-[#A80000] rounded-xl items-center justify-center shadow-lg">
              <Icon className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
          )}
          
          <div>
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="sm:hidden flex w-10 h-10 bg-gradient-to-br from-[#D50000] to-[#A80000] rounded-lg items-center justify-center shadow-lg">
                  <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
              )}
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
                {title}
              </h1>
            </div>
            
            {description && (
              null
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 hidden lg:flex">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}