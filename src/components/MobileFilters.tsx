import { useState, useCallback, memo } from 'react';
import { Filter, X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { cn } from './ui/utils';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterSection {
  id: string;
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  icon?: React.ReactNode;
}

interface MobileFiltersProps {
  sections: FilterSection[];
  onClear: () => void;
  totalResults?: number;
  className?: string;
}

// 🎯 Seção de filtro individual (memoizada)
const FilterSectionComponent = memo(({ 
  section, 
  onToggle 
}: { 
  section: FilterSection;
  onToggle: (value: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="space-y-3">
      {/* Header da seção */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors tap-highlight-none"
      >
        <div className="flex items-center gap-2">
          {section.icon}
          <span className="font-medium text-gray-900">{section.label}</span>
          {section.selectedValues.length > 0 && (
            <Badge 
              variant="default" 
              className="bg-[#D50000] text-white ml-2"
            >
              {section.selectedValues.length}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Opções */}
      {isExpanded && (
        <div className="space-y-2 pl-2">
          {section.options.map((option) => {
            const isSelected = section.selectedValues.includes(option.value);
            
            return (
              <button
                key={option.value}
                onClick={() => onToggle(option.value)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg transition-all tap-highlight-none",
                  isSelected 
                    ? "bg-red-50 border-2 border-[#D50000]" 
                    : "bg-white border border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox visual */}
                  <div 
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                      isSelected 
                        ? "bg-[#D50000] border-[#D50000]" 
                        : "border-gray-300"
                    )}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    )}
                  </div>
                  
                  <span className={cn(
                    "text-left",
                    isSelected ? "font-medium text-gray-900" : "text-gray-700"
                  )}>
                    {option.label}
                  </span>
                </div>

                {/* Count badge */}
                {option.count !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {option.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

FilterSectionComponent.displayName = 'FilterSectionComponent';

/**
 * 📱 Componente de filtros otimizado para mobile
 * 
 * Features:
 * - ✅ Sheet lateral deslizante
 * - ✅ Seções expansíveis
 * - ✅ Contador de filtros ativos
 * - ✅ Badge com total de resultados
 * - ✅ Limpar todos os filtros
 * - ✅ Touch-friendly (48px+ targets)
 * - ✅ Animações suaves
 */
export function MobileFilters({ 
  sections, 
  onClear, 
  totalResults,
  className 
}: MobileFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Conta total de filtros ativos
  const activeFiltersCount = sections.reduce(
    (sum, section) => sum + section.selectedValues.length, 
    0
  );

  // Handler para toggle de opção
  const handleToggle = useCallback((sectionId: string, value: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const newValues = section.selectedValues.includes(value)
      ? section.selectedValues.filter(v => v !== value)
      : [...section.selectedValues, value];

    section.onChange(newValues);
  }, [sections]);

  // Handler para limpar todos os filtros
  const handleClearAll = useCallback(() => {
    onClear();
    setIsOpen(false);
  }, [onClear]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* Trigger Button */}
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "relative gap-2 min-h-[48px] tap-highlight-none",
            activeFiltersCount > 0 && "border-[#D50000] bg-red-50",
            className
          )}
        >
          <Filter className={cn(
            "w-5 h-5",
            activeFiltersCount > 0 && "text-[#D50000]"
          )} />
          <span>Filtros</span>
          
          {/* Badge com contador */}
          {activeFiltersCount > 0 && (
            <Badge 
              variant="default"
              className="absolute -top-2 -right-2 bg-[#D50000] text-white h-6 w-6 flex items-center justify-center p-0 rounded-full"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      {/* Sheet Content */}
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md flex flex-col p-0 h-full overflow-hidden gap-0"
      >
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">Filtros</SheetTitle>
            
            {/* Contador de resultados */}
            {totalResults !== undefined && (
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {totalResults} resultado{totalResults !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Clear all button */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-[#D50000] hover:text-[#A80000] hover:bg-red-50 gap-2 mt-3"
            >
              <X className="w-4 h-4" />
              Limpar todos ({activeFiltersCount})
            </Button>
          )}
        </SheetHeader>

        {/* Filtros scrolláveis - com overflow direto para garantir scroll no mobile */}
        <div 
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: '-ms-autohiding-scrollbar',
            touchAction: 'pan-y',
            overflowY: 'scroll',
            minHeight: 0, // Crucial para flex child com scroll
            flex: '1 1 0%' // Força flex-basis: 0
          }}
        >
          <div className="space-y-6 p-6 pb-6">
            {sections.map((section) => (
              <FilterSectionComponent
                key={section.id}
                section={section}
                onToggle={(value) => handleToggle(section.id, value)}
              />
            ))}
          </div>
        </div>

        {/* Footer com ações */}
        <div className="p-6 pt-4 border-t bg-white space-y-3 flex-shrink-0">
          <Button
            onClick={() => setIsOpen(false)}
            className="w-full bg-[#D50000] hover:bg-[#A80000] text-white min-h-[48px]"
          >
            <Check className="w-5 h-5 mr-2" />
            Aplicar Filtros
          </Button>
          
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              onClick={handleClearAll}
              className="w-full min-h-[48px]"
            >
              Limpar e Fechar
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * 🎯 Hook helper para gerenciar estado de filtros
 * 
 * @usage
 * ```tsx
 * const filters = useFilters({
 *   model: [],
 *   container: [],
 *   status: []
 * });
 * 
 * <MobileFilters 
 *   sections={[
 *     {
 *       id: 'model',
 *       label: 'Modelo',
 *       options: modelOptions,
 *       selectedValues: filters.model,
 *       onChange: filters.setModel
 *     }
 *   ]}
 *   onClear={filters.clearAll}
 * />
 * ```
 */
export function useFilters<T extends Record<string, string[]>>(
  initialState: T
): T & { 
  clearAll: () => void;
  hasActiveFilters: boolean;
  activeCount: number;
} {
  const [state, setState] = useState<T>(initialState);

  const clearAll = useCallback(() => {
    const cleared = Object.keys(initialState).reduce(
      (acc, key) => ({ ...acc, [key]: [] }),
      {} as T
    );
    setState(cleared);
  }, [initialState]);

  const activeCount = Object.values(state).reduce(
    (sum, arr) => sum + (arr as string[]).length,
    0
  );

  // Cria setters dinâmicos para cada chave
  const setters = Object.keys(initialState).reduce((acc, key) => {
    return {
      ...acc,
      [`set${key.charAt(0).toUpperCase()}${key.slice(1)}`]: (values: string[]) => {
        setState(prev => ({ ...prev, [key]: values }));
      }
    };
  }, {} as any);

  return {
    ...state,
    ...setters,
    clearAll,
    hasActiveFilters: activeCount > 0,
    activeCount
  };
}
