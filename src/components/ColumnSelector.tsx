import { useState, useEffect } from 'react';
import { Settings, Check, Save, Star, GripVertical } from 'lucide-react';
import { Button } from './ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';

export interface ColumnOption {
  key: string;
  label: string;
  defaultVisible?: boolean;
}

interface ColumnSelectorProps {
  availableColumns?: ColumnOption[];
  visibleColumns?: string[];
  onVisibleColumnsChange?: (selected: string[]) => void;
  // Props alternativas para compatibilidade
  columns?: ColumnOption[];
  selectedColumns?: string[];
  onChange?: (selected: string[]) => void;
  // Identificador único para salvar preferências
  storageKey?: string;
}

export function ColumnSelector({ 
  availableColumns, 
  visibleColumns, 
  onVisibleColumnsChange,
  columns: altColumns,
  selectedColumns: altSelectedColumns,
  onChange: altOnChange,
  storageKey = 'default-columns'
}: ColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const [hasSavedPreference, setHasSavedPreference] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [orderedColumns, setOrderedColumns] = useState<ColumnOption[]>([]);

  // Usa as props alternativas se as principais não forem fornecidas
  const columns = availableColumns || altColumns || [];
  const selectedColumns = visibleColumns || altSelectedColumns || [];
  const onChange = onVisibleColumnsChange || altOnChange || (() => {});

  // Validação de segurança
  if (!Array.isArray(columns) || columns.length === 0) {
    console.warn('ColumnSelector: nenhuma coluna fornecida');
    return null;
  }

  if (!Array.isArray(selectedColumns)) {
    console.error('ColumnSelector: selectedColumns não é um array', selectedColumns);
    return null;
  }

  // Inicializa a ordem das colunas baseada nas colunas selecionadas
  useEffect(() => {
    // Mantém a ordem das colunas selecionadas conforme o array selectedColumns
    const orderedSelected = selectedColumns
      .map(key => columns.find(col => col.key === key))
      .filter((col): col is ColumnOption => col !== undefined);
    
    // Adiciona as colunas não selecionadas ao final
    const notSelected = columns.filter(col => !selectedColumns.includes(col.key));
    
    setOrderedColumns([...orderedSelected, ...notSelected]);
  }, [columns, selectedColumns]);

  // Verifica se há preferências salvas ao montar o componente
  useEffect(() => {
    const savedPreference = localStorage.getItem(`column-preference-${storageKey}`);
    setHasSavedPreference(!!savedPreference);
  }, [storageKey]);

  // Debug: verificar se o componente está renderizando
  console.log('ColumnSelector renderizado com', selectedColumns.length, 'colunas selecionadas de', columns.length, 'disponíveis');

  const toggleColumn = (key: string) => {
    if (selectedColumns.includes(key)) {
      // Não permitir desmarcar todas as colunas
      if (selectedColumns.length === 1) {
        return;
      }
      // Remove a coluna mantendo a ordem das restantes
      onChange(selectedColumns.filter(k => k !== key));
    } else {
      // Adiciona a coluna na posição correta baseada na ordem visual atual
      const newOrder = orderedColumns
        .filter(col => selectedColumns.includes(col.key) || col.key === key)
        .map(col => col.key);
      onChange(newOrder);
    }
  };

  const selectAll = () => {
    // Seleciona todas na ordem atual
    onChange(orderedColumns.map(c => c.key));
  };

  const resetToDefault = () => {
    // Reseta para as colunas padrão na ordem original
    const defaultKeys = columns.filter(c => c.defaultVisible !== false).map(c => c.key);
    onChange(defaultKeys);
  };

  const handleMouseDown = (index: number) => {
    setDraggedIndex(index);
  };

  const handleMouseEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;

    // Reordena as colunas
    const newOrder = [...orderedColumns];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    
    setOrderedColumns(newOrder);
    setDraggedIndex(index);

    // Atualiza a ordem das colunas selecionadas
    const newSelectedOrder = newOrder
      .filter(col => selectedColumns.includes(col.key))
      .map(col => col.key);
    onChange(newSelectedOrder);
  };

  const handleMouseUp = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Adiciona listener global para mouseup
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setDraggedIndex(null);
      setDragOverIndex(null);
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const saveUserPreference = () => {
    try {
      localStorage.setItem(
        `column-preference-${storageKey}`, 
        JSON.stringify(selectedColumns)
      );
      setHasSavedPreference(true);
      toast.success('✓ Preferências salvas com sucesso!', {
        description: 'Suas colunas e ordem personalizadas foram salvas',
        duration: 3000,
      });
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      toast.error('Erro ao salvar preferências', {
        description: 'Não foi possível salvar suas preferências',
      });
    }
  };

  const loadUserPreference = () => {
    try {
      const saved = localStorage.getItem(`column-preference-${storageKey}`);
      if (saved) {
        const savedColumns = JSON.parse(saved);
        // Valida que as colunas salvas ainda existem
        const validColumns = savedColumns.filter((key: string) => 
          columns.some(c => c.key === key)
        );
        if (validColumns.length > 0) {
          onChange(validColumns);
          toast.success('Preferências carregadas', {
            description: `${validColumns.length} colunas restauradas na ordem salva`,
            duration: 2000,
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
      toast.error('Erro ao carregar preferências');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 border-2 hover:border-[#D50000] hover:text-[#D50000] transition-colors"
        >
          <Settings size={16} />
          <span className="font-medium">Colunas</span>
          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
            {selectedColumns.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-900">Selecionar Colunas</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="h-7 px-2 text-xs"
              >
                Todas
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefault}
                className="h-7 px-2 text-xs"
              >
                Padrão
              </Button>
              {hasSavedPreference && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadUserPreference}
                  className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  title="Restaurar minhas preferências salvas"
                >
                  <Star size={14} className="mr-1" />
                  Meu
                </Button>
              )}
            </div>
          </div>
          
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {orderedColumns.map((column, index) => (
              <div 
                key={column.key} 
                onMouseEnter={() => draggedIndex !== null && handleMouseEnter(index)}
                className={`flex items-center space-x-2 p-2 rounded-lg transition-all ${
                  draggedIndex === index 
                    ? 'bg-[#D50000]/10 scale-105 shadow-md opacity-50' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div
                  onMouseDown={() => handleMouseDown(index)}
                  onMouseUp={handleMouseUp}
                  className={`flex items-center p-1 -m-1 ${
                    draggedIndex === index ? 'cursor-grabbing' : 'cursor-grab'
                  } select-none`}
                >
                  <GripVertical 
                    size={16} 
                    className={`flex-shrink-0 transition-colors ${
                      draggedIndex === index 
                        ? 'text-[#D50000]' 
                        : 'text-gray-400 hover:text-[#D50000]'
                    }`}
                  />
                </div>
                <Checkbox
                  id={`column-${column.key}`}
                  checked={selectedColumns.includes(column.key)}
                  onCheckedChange={() => toggleColumn(column.key)}
                  disabled={selectedColumns.length === 1 && selectedColumns.includes(column.key)}
                />
                <Label
                  htmlFor={`column-${column.key}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {column.label}
                </Label>
                {selectedColumns.includes(column.key) && (
                  <Check size={14} className="text-green-600 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 flex items-center gap-1">
              <GripVertical size={12} />
              Clique e segure no ícone <GripVertical size={10} className="inline mx-0.5" /> e passe o mouse sobre outra linha para reordenar
            </p>
          </div>

          <div className="pt-2 border-t border-gray-200 space-y-2">
            <p className="text-xs text-gray-500">
              {selectedColumns.length} de {columns.length} colunas selecionadas
            </p>
            
            {/* Botão para salvar preferências */}
            <Button
              variant="outline"
              size="sm"
              onClick={saveUserPreference}
              className="w-full gap-2 border-[#D50000] text-[#D50000] hover:bg-[#D50000] hover:text-white transition-colors"
            >
              <Save size={14} />
              <span className="text-xs font-medium">Salvar como Meu Padrão</span>
            </Button>
            
            {hasSavedPreference && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <Star size={12} />
                Você tem preferências salvas
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
