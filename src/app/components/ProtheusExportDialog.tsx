import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { FileSpreadsheet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ProtheusExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (season: string, stage: string) => Promise<void>;
  seasons: string[];
  stages: string[];
}

export function ProtheusExportDialog({
  isOpen,
  onClose,
  onExport,
  seasons,
  stages
}: ProtheusExportDialogProps) {
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedSeason('');
      setSelectedStage('');
      setIsExporting(false);
    }
  }, [isOpen]);

  const handleExport = async () => {
    if (!selectedSeason || !selectedStage) {
      toast.error('Seleção incompleta', {
        description: 'Por favor, selecione temporada e etapa'
      });
      return;
    }

    setIsExporting(true);
    try {
      await onExport(selectedSeason, selectedStage);
      onClose();
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar', {
        description: 'Tente novamente'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <DialogTitle>Exportar Relatório Protheus</DialogTitle>
              <DialogDescription>
                Selecione temporada e etapa para exportar
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Filtros aplicados:</p>
              <ul className="space-y-0.5 text-xs">
                <li>• <strong>Todos os pneus</strong> da temporada e etapa selecionadas</li>
                <li>• Códigos Protheus e preços são buscados automaticamente</li>
              </ul>
            </div>
          </div>

          {/* Seleção de Temporada */}
          <div className="space-y-2">
            <Label htmlFor="season">Temporada *</Label>
            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
              <SelectTrigger id="season">
                <SelectValue placeholder="Selecione a temporada" />
              </SelectTrigger>
              <SelectContent>
                {seasons.length === 0 ? (
                  <SelectItem value="no-seasons" disabled>
                    Nenhuma temporada disponível
                  </SelectItem>
                ) : (
                  seasons.map(season => (
                    <SelectItem key={season} value={season}>
                      {season}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Etapa */}
          <div className="space-y-2">
            <Label htmlFor="stage">Etapa *</Label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger id="stage">
                <SelectValue placeholder="Selecione a etapa" />
              </SelectTrigger>
              <SelectContent>
                {stages.length === 0 ? (
                  <SelectItem value="no-stages" disabled>
                    Nenhuma etapa disponível
                  </SelectItem>
                ) : (
                  stages.map(stage => (
                    <SelectItem key={stage} value={stage}>
                      Etapa {stage}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Preview da exportação */}
          {selectedSeason && selectedStage && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Será exportado:</strong>
              </p>
              <p className="text-sm text-gray-800">
                <span className="font-semibold text-blue-600">Todos os pneus</span> da temporada{' '}
                <span className="font-semibold">{selectedSeason}</span>, etapa{' '}
                <span className="font-semibold">{selectedStage}</span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={!selectedSeason || !selectedStage || isExporting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isExporting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Exportando...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exportar Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}