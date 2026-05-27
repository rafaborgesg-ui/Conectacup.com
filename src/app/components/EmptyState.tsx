import { LucideIcon } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'default' | 'outline' | 'ghost';
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actions = [],
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 md:py-16 text-center px-4",
      className
    )}>
      {/* Icon Circle */}
      <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
        <Icon className="w-10 h-10 md:w-12 md:h-12 text-gray-400" strokeWidth={1.5} />
      </div>
      
      {/* Title */}
      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-sm md:text-base text-gray-500 mb-6 max-w-sm">
        {description}
      </p>
      
      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {actions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={index}
                onClick={action.onClick}
                variant={action.variant || (index === 0 ? 'default' : 'outline')}
                size="lg"
                className="min-w-[160px]"
              >
                {ActionIcon && <ActionIcon className="mr-2" size={18} />}
                {action.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
