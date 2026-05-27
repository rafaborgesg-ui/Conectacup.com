import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { cn } from "./utils";

export interface MultiSelectOption {
  label: string;
  value: string;
  color?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Selecione...",
  emptyMessage = "Nenhuma opção encontrada.",
  searchPlaceholder = "Buscar...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [triggerWidth, setTriggerWidth] = React.useState<number | undefined>(undefined);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  React.useEffect(() => {
    const updateWidth = () => {
      if (triggerRef.current) {
        setTriggerWidth(triggerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    
    // Atualiza ao redimensionar
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  // Atualiza largura quando seleções mudam
  React.useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [selected]);

  const handleSelect = (value: string) => {
    if (value === "all") {
      onChange([]);
    } else {
      const newSelected = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      onChange(newSelected);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  const maxVisibleBadges = 2;
  const visibleSelected = selected.slice(0, maxVisibleBadges);
  const remainingCount = selected.length - maxVisibleBadges;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <div ref={triggerRef as any}>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between h-auto min-h-[36px] px-3 py-2", className)}
          >
            <div className="flex flex-wrap gap-1 flex-1 items-center">
              {selected.length === 0 ? (
                <span className="text-sm text-muted-foreground">{placeholder}</span>
              ) : (
                <>
                  {visibleSelected.map((value) => {
                    const option = options.find((opt) => opt.value === value);
                    return (
                      <Badge
                        key={value}
                        variant="secondary"
                        className="text-xs pl-2 pr-1 py-0.5 flex items-center gap-1"
                      >
                        {option?.color && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: option.color }}
                          />
                        )}
                        <span className="max-w-[100px] truncate">
                          {option?.label || value}
                        </span>
                        <span
                          onClick={(e) => handleRemove(value, e)}
                          className="ml-0.5 hover:bg-gray-300 rounded-full p-0.5 transition-colors cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleRemove(value, e as any);
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </span>
                      </Badge>
                    );
                  })}
                  {remainingCount > 0 && (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      +{remainingCount}
                    </Badge>
                  )}
                </>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 max-w-[calc(100vw-16px)]" 
        align={isMobile ? "center" : "start"}
        side="bottom"
        style={{ 
          width: triggerWidth ? `${triggerWidth}px` : 'var(--radix-popover-trigger-width)',
          maxHeight: 'min(var(--radix-popover-content-available-height, 400px), 400px)'
        }}
        sideOffset={4}
        avoidCollisions={true}
        collisionPadding={{ top: 8, right: 8, bottom: 8, left: 8 }}
        onOpenAutoFocus={(e) => {
          // Previne scroll automático ao abrir em mobile
          if (isMobile) {
            e.preventDefault();
          }
        }}
      >
        <Command className="h-full">
          <CommandInput placeholder={searchPlaceholder} className="text-sm h-10 border-b" />
          <CommandList className="max-h-[calc(min(var(--radix-popover-content-available-height,350px),350px)-44px)] overflow-y-auto overscroll-contain">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => handleSelect("all")}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selected.length === 0 ? "opacity-100" : "opacity-0"
                  )}
                />
                Todos
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.color && (
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
