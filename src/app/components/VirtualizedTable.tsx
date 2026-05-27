/**
 * Componente de Tabela Virtualizada com Lazy Loading
 * Renderiza apenas as linhas visíveis na viewport para melhorar performance
 * Suporta arrastar colunas e ordenação por clique
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { TableSkeleton } from './LoadingSkeleton';

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  overscan?: number;
  emptyMessage?: string;
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
  className?: string;
  onColumnReorder?: (newColumns: Column<T>[]) => void;
  onSort?: (columnKey: string, direction: SortDirection) => void;
  sortColumn?: string | null;
  sortDirection?: SortDirection;
}

// Componente de cabeçalho de coluna arrastável
interface DraggableColumnHeaderProps<T> {
  column: Column<T>;
  index: number;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
  onSort?: (columnKey: string) => void;
  sortColumn?: string | null;
  sortDirection?: SortDirection;
}

function DraggableColumnHeader<T>({ 
  column, 
  index, 
  moveColumn, 
  onSort,
  sortColumn,
  sortDirection 
}: DraggableColumnHeaderProps<T>) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'column',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'column',
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;

      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;

      moveColumn(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  preview(drop(ref));

  const isSorted = sortColumn === column.key;
  const showSortIcon = column.sortable !== false;

  return (
    <div
      ref={ref}
      className={`
        px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-700
        ${isDragging ? 'opacity-40' : ''}
        ${isOver ? 'bg-blue-50' : ''}
        ${showSortIcon ? 'cursor-pointer hover:bg-gray-100' : ''}
        ${column.className || ''}
        flex items-center gap-2 select-none transition-colors
      `}
      onClick={() => {
        if (showSortIcon && onSort) {
          onSort(String(column.key));
        }
      }}
    >
      <div
        ref={drag}
        className="cursor-move hover:text-gray-900 transition-colors"
        onClick={(e) => e.stopPropagation()}
        title="Arraste para reordenar"
      >
        <GripVertical size={14} />
      </div>
      <span className="flex-1">{column.header}</span>
      {showSortIcon && (
        <div className="ml-auto" title={isSorted ? `Ordenado ${sortDirection === 'asc' ? 'crescente' : 'decrescente'}` : 'Clique para ordenar'}>
          {!isSorted && <ArrowUpDown size={14} className="text-gray-400" />}
          {isSorted && sortDirection === 'asc' && <ArrowUp size={14} className="text-[#D50000]" />}
          {isSorted && sortDirection === 'desc' && <ArrowDown size={14} className="text-[#D50000]" />}
        </div>
      )}
    </div>
  );
}

// Componente interno sem DndProvider
function VirtualizedTableInner<T extends { id?: string | number }>(props: VirtualizedTableProps<T>) {
  const {
    data,
    columns: initialColumns,
    rowHeight = 80,
    overscan = 5,
    emptyMessage = 'Nenhum dado disponível',
    isLoading = false,
    onRowClick,
    className = '',
    onColumnReorder,
    onSort,
    sortColumn,
    sortDirection,
  } = props;

  const [columns, setColumns] = useState(initialColumns);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Atualiza colunas quando initialColumns mudar
  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  // Move coluna
  const moveColumn = useCallback((dragIndex: number, hoverIndex: number) => {
    setColumns((prevColumns) => {
      const newColumns = [...prevColumns];
      const draggedColumn = newColumns[dragIndex];
      newColumns.splice(dragIndex, 1);
      newColumns.splice(hoverIndex, 0, draggedColumn);
      return newColumns;
    });
  }, []);

  // Notifica pai quando a ordem muda
  useEffect(() => {
    if (onColumnReorder && JSON.stringify(columns) !== JSON.stringify(initialColumns)) {
      onColumnReorder(columns);
    }
  }, [columns]);

  // Handler de ordenação
  const handleSort = useCallback((columnKey: string) => {
    if (!onSort) return;
    
    let newDirection: SortDirection = 'asc';
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        newDirection = 'desc';
      } else if (sortDirection === 'desc') {
        newDirection = null;
      }
    }
    
    onSort(columnKey, newDirection);
  }, [onSort, sortColumn, sortDirection]);

  // Atualiza altura do container
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
      }
    };

    updateHeight();

    // Observa mudanças de tamanho
    if (containerRef.current) {
      resizeObserverRef.current = new ResizeObserver(updateHeight);
      resizeObserverRef.current.observe(containerRef.current);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // Calcula quais linhas devem ser renderizadas
  const { visibleRows, startIndex, endIndex, totalHeight } = useMemo(() => {
    const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIdx = Math.min(
      data.length,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
    );

    return {
      visibleRows: data.slice(startIdx, endIdx),
      startIndex: startIdx,
      endIndex: endIdx,
      totalHeight: data.length * rowHeight,
    };
  }, [data, scrollTop, containerHeight, rowHeight, overscan]);

  // Handler de scroll com throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-12 text-center ${className}`}>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header - Fixo */}
      <div className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
        <div className="grid" style={{ gridTemplateColumns: columns.map(c => c.width || '1fr').join(' ') }}>
          {columns.map((column, idx) => (
            <DraggableColumnHeader
              key={`${column.key}-${idx}`}
              column={column}
              index={idx}
              moveColumn={moveColumn}
              onSort={handleSort}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
            />
          ))}
        </div>
      </div>

      {/* Body - Virtualizado */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-auto"
        style={{ height: '600px', maxHeight: '70vh' }}
      >
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          <div style={{ transform: `translateY(${startIndex * rowHeight}px)` }}>
            {visibleRows.map((row, idx) => {
              const rowId = row.id || startIndex + idx;

              return (
                <div
                  key={rowId}
                  className={`
                    grid border-b border-gray-100 hover:bg-gray-50 transition-colors
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                  style={{ 
                    gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
                    minHeight: `${rowHeight}px`,
                  }}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column, colIdx) => (
                    <div
                      key={colIdx}
                      className={`px-4 py-3 flex items-center text-sm text-gray-900 ${column.className || ''}`}
                    >
                      {column.render 
                        ? column.render(row) 
                        : String((row as any)[column.key] || '-')}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer com informações de paginação */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between text-sm text-gray-600">
        <span>
          Mostrando {startIndex + 1}-{Math.min(endIndex, data.length)} de {data.length} registros
        </span>
        <span className="text-xs text-gray-500">
          Scroll para carregar mais
        </span>
      </div>
    </div>
  );
}

// Componente exportado com DndProvider
export function VirtualizedTable<T extends { id?: string | number }>(props: VirtualizedTableProps<T>) {
  return (
    <DndProvider backend={HTML5Backend}>
      <VirtualizedTableInner {...props} />
    </DndProvider>
  );
}
