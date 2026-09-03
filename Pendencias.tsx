import React, { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { AlertCircle } from 'lucide-react';
import AvariaDetailsModal from '../components/AvariaDetailsModal';

export default function Pendencias() {
  const supabase = createClient();
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOccurrence, setSelectedOccurrence] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadPendingOccurrences();
  }, []);

  async function loadPendingOccurrences() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wheel_damage_occurrences')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar pendências:', error);
        return;
      }

      setOccurrences(data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar pendências:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenDetails(occurrence: any) {
    setSelectedOccurrence(occurrence);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedOccurrence(null);
  }

  function handleApprove(occurrenceId: string) {
    // Recarrega a lista após aprovar
    loadPendingOccurrences();
    handleCloseModal();
  }

  function getDamageTypeLabel(type: string): string {
    const map: Record<string, string> = {
      'empenada': 'Empenada',
      'fora_de_centro': 'Fora_de_Centro',
      'vazamento': 'Vazamento',
      'pintura': 'Pintura',
      'dsi': 'DSI',
      'corte': 'Corte',
      'fissura': 'Fissura',
      'quebra': 'Quebra'
    };
    return map[type] || type;
  }

  function getPositionShortLabel(position: string): string {
    const map: Record<string, string> = {
      'dianteira': 'D',
      'dianteira_direita': 'D',
      'dianteira_esquerda': 'D',
      'traseira': 'T',
      'traseira_direita': 'D',
      'traseira_esquerda': 'D'
    };
    return map[position] || position;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Pendências</h1>
        <p className="text-muted-foreground">Ocorrências aguardando aprovação do administrador</p>
      </div>

      {/* Alert de Pendências */}
      <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-600 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-red-700 text-xl font-bold mb-1 flex items-center gap-2">
              OCORRÊNCIAS PENDENTES DE APROVAÇÃO
            </h2>
            <p className="text-red-600 text-sm">
              {isLoading ? 'Carregando...' : `${occurrences.length} ${occurrences.length === 1 ? 'ocorrência aguardando' : 'ocorrências aguardando'} análise`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabela de Pendências */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pendências</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando pendências...
            </div>
          ) : occurrences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma pendência no momento
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">#</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Etapa</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Categoria</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Piloto</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Roda</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tipo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {occurrences.map((occurrence) => (
                    <tr
                      key={occurrence.id}
                      onClick={() => handleOpenDetails(occurrence)}
                      className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-4 text-sm font-semibold text-foreground">
                        {occurrence.line_code}
                      </td>
                      <td className="py-4 px-4 text-sm text-foreground">
                        <div className="font-semibold">{occurrence.stage_code || occurrence.stage_name}</div>
                        <div className="text-xs text-muted-foreground">{occurrence.stage_name?.replace(occurrence.stage_code, '').trim()}</div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="text-xs font-semibold">
                          {occurrence.category}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-sm text-foreground">
                        <div className="font-semibold">#{occurrence.driver_number} {occurrence.driver_name}</div>
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-foreground text-center">
                        {getPositionShortLabel(occurrence.wheel_position)}
                      </td>
                      <td className="py-4 px-4 text-sm text-foreground">
                        {getDamageTypeLabel(occurrence.damage_type)}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {new Date(occurrence.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      {selectedOccurrence && (
        <AvariaDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          occurrence={selectedOccurrence}
          isPending={true}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
