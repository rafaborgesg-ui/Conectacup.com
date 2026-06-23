import { memo, useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, Printer, Share2, Check } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { cn } from './ui/utils';
import { ActionFeedback } from './VisualFeedback';
import { toast } from 'sonner';

export type ExportFormat = 'excel' | 'pdf' | 'csv' | 'print' | 'protheus';

interface ExportColumn {
  id: string;
  label: string;
  required?: boolean;
}

interface ExportMenuProps {
  onExport: (format: ExportFormat, options: ExportOptions) => Promise<void>;
  columns?: ExportColumn[];
  totalRecords?: number;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export interface ExportOptions {
  selectedColumns: string[];
  includeHeaders: boolean;
  includeFooter: boolean;
  includeTimestamp: boolean;
}

/**
 * 📊 Menu de exportação facilitada
 * 
 * Features:
 * - ✅ Múltiplos formatos (Excel, PDF, CSV, Print)
 * - ✅ Seleção de colunas
 * - ✅ Feedback visual de progresso
 * - ✅ Mobile-friendly
 * - ✅ Acessível
 */
export const ExportMenu = memo(({ 
  onExport, 
  columns = [],
  totalRecords = 0,
  className,
  variant = 'default',
  size = 'default'
}: ExportMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    columns.filter(c => c.required).map(c => c.id)
  );
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [includeFooter, setIncludeFooter] = useState(true);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [exportProgress, setExportProgress] = useState(0);

  // Handler para quick export (sem dialog)
  const handleQuickExport = async (format: ExportFormat) => {
    setExportStatus('loading');
    setExportProgress(0);

    try {
      // Simula progresso
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      await onExport(format, {
        selectedColumns: columns.map(c => c.id),
        includeHeaders: true,
        includeFooter: true,
        includeTimestamp: true
      });

      clearInterval(progressInterval);
      setExportProgress(100);
      setExportStatus('success');
      
      setTimeout(() => {
        setExportStatus('idle');
        setExportProgress(0);
      }, 2000);
    } catch (error) {
      setExportStatus('error');
      toast.error('Erro ao exportar', {
        description: 'Tente novamente ou escolha outro formato'
      });
      
      setTimeout(() => {
        setExportStatus('idle');
      }, 3000);
    }
  };

  // Handler para export customizado (com dialog)
  const handleCustomExport = async () => {
    if (!selectedFormat) return;

    setExportStatus('loading');
    setExportProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      await onExport(selectedFormat, {
        selectedColumns,
        includeHeaders,
        includeFooter,
        includeTimestamp
      });

      clearInterval(progressInterval);
      setExportProgress(100);
      setExportStatus('success');
      setIsOpen(false);
      
      setTimeout(() => {
        setExportStatus('idle');
        setExportProgress(0);
      }, 2000);
    } catch (error) {
      setExportStatus('error');
      toast.error('Erro ao exportar', {
        description: 'Tente novamente ou ajuste as opções'
      });
      
      setTimeout(() => {
        setExportStatus('idle');
      }, 3000);
    }
  };

  // Toggle column selection
  const toggleColumn = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column?.required) return; // Não permite desselecionar colunas obrigatórias

    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  // Formatos disponíveis
  const formats = [
    {
      id: 'excel' as ExportFormat,
      label: 'Excel',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      description: 'Arquivo .xlsx',
      color: 'text-green-600'
    },
    {
      id: 'pdf' as ExportFormat,
      label: 'PDF',
      icon: <FileText className="w-4 h-4" />,
      description: 'Documento portátil',
      color: 'text-red-600'
    },
    {
      id: 'csv' as ExportFormat,
      label: 'CSV',
      icon: <FileDown className="w-4 h-4" />,
      description: 'Valores separados',
      color: 'text-blue-600'
    },
    {
      id: 'print' as ExportFormat,
      label: 'Imprimir',
      icon: <Printer className="w-4 h-4" />,
      description: 'Versão para impressão',
      color: 'text-gray-600'
    },
    {
      id: 'protheus' as ExportFormat,
      label: 'Protheus',
      icon: <FileDown className="w-4 h-4" />,
      description: 'Arquivo para Protheus',
      color: 'text-purple-600'
    }
  ];

  return (
    <>
      {/* Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={variant} 
            size={size}
            className={cn("gap-2 min-h-[44px]", className)}
          >
            <FileDown className="w-5 h-5" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Exportar Dados</span>
            {totalRecords > 0 && (
              <span className="text-xs font-normal text-gray-500">
                {totalRecords} registros
              </span>
            )}
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />

          {/* Quick exports */}
          {formats.map((format) => (
            <DropdownMenuItem
              key={format.id}
              onClick={() => handleQuickExport(format.id)}
              className="gap-2 cursor-pointer"
            >
              <span className={format.color}>{format.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{format.label}</div>
                <div className="text-xs text-gray-500">{format.description}</div>
              </div>
            </DropdownMenuItem>
          ))}

          {/* Opção customizada */}
          {columns.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsOpen(true)}
                className="gap-2 cursor-pointer text-[#D50000]"
              >
                <Share2 className="w-4 h-4" />
                <span className="font-medium">Exportação personalizada</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de customização */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Exportação Personalizada</DialogTitle>
            <DialogDescription>
              Escolha o formato e as colunas que deseja exportar
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Seleção de formato */}
            <div className="space-y-3">
              <Label>Formato</Label>
              <div className="grid grid-cols-2 gap-2">
                {formats.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                      selectedFormat === format.id
                        ? "border-[#D50000] bg-red-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className={format.color}>{format.icon}</span>
                    <span className="text-sm font-medium">{format.label}</span>
                    {selectedFormat === format.id && (
                      <Check className="w-4 h-4 ml-auto text-[#D50000]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Seleção de colunas */}
            {columns.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Colunas ({selectedColumns.length}/{columns.length})</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const allIds = columns.map(c => c.id);
                      setSelectedColumns(
                        selectedColumns.length === columns.length 
                          ? columns.filter(c => c.required).map(c => c.id)
                          : allIds
                      );
                    }}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    {selectedColumns.length === columns.length ? 'Limpar' : 'Selecionar Todas'}
                  </Button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {columns.map((column) => {
                    const isSelected = selectedColumns.includes(column.id);
                    const isRequired = column.required;

                    return (
                      <label
                        key={column.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                          isRequired && "opacity-60 cursor-not-allowed",
                          !isRequired && "hover:bg-gray-50"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => !isRequired && toggleColumn(column.id)}
                          disabled={isRequired}
                        />
                        <span className="text-sm flex-1">{column.label}</span>
                        {isRequired && (
                          <span className="text-xs text-gray-500">Obrigatório</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Opções adicionais */}
            <div className="space-y-3">
              <Label>Opções</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    checked={includeHeaders}
                    onCheckedChange={(checked) => setIncludeHeaders(checked as boolean)}
                  />
                  <span className="text-sm">Incluir cabeçalhos</span>
                </label>

                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    checked={includeFooter}
                    onCheckedChange={(checked) => setIncludeFooter(checked as boolean)}
                  />
                  <span className="text-sm">Incluir rodapé com totais</span>
                </label>

                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    checked={includeTimestamp}
                    onCheckedChange={(checked) => setIncludeTimestamp(checked as boolean)}
                  />
                  <span className="text-sm">Incluir data/hora de exportação</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={exportStatus === 'loading'}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCustomExport}
              disabled={!selectedFormat || selectedColumns.length === 0 || exportStatus === 'loading'}
              className="bg-[#D50000] hover:bg-[#A80000]"
            >
              {exportStatus === 'loading' ? 'Exportando...' : 'Exportar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback visual de exportação */}
      <ActionFeedback
        type="download"
        status={exportStatus}
        progress={exportProgress}
      />
    </>
  );
});

ExportMenu.displayName = 'ExportMenu';