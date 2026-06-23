import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Upload, Trash2, AlertCircle, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { formatDate, formatSession, createWatermarkData, type WatermarkData } from '../utils/watermarkGenerator';
import { copyToClipboard } from '../utils/clipboard';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';
import ImageEditor from './ImageEditor';
import { deleteDamagePhoto } from '../utils/wheelDamageStorage';

interface AvariaDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  occurrence: any;
  isPending?: boolean;
  onApprove?: (occurrenceId: string) => void;
}

export default function AvariaDetailsModal({ isOpen, onClose, occurrence, isPending = false, onApprove }: AvariaDetailsModalProps) {
  const supabase = createClient();
  const [isPlacaInfoOpen, setIsPlacaInfoOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>(occurrence?.photo_urls || []);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Estados do ImageEditor
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [currentEditingImage, setCurrentEditingImage] = useState<File | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]); // Fila de fotos para processar
  const [processedPhotos, setProcessedPhotos] = useState<Blob[]>([]); // Fotos já processadas
  const [currentWatermarkData, setCurrentWatermarkData] = useState<WatermarkData | null>(null);
  
  // Estados do formulário de edição
  const [editForm, setEditForm] = useState({
    driver_number: occurrence?.driver_number || '',
    driver_name: occurrence?.driver_name || '',
    session: occurrence?.session || '',
    wheel_position: occurrence?.wheel_position || '',
    wheel_color: occurrence?.wheel_color || '',
    damage_type: occurrence?.damage_type || '',
    action_taken: occurrence?.action_taken || '',
    destination: occurrence?.destination || '',
    serial_number: occurrence?.serial_number || '',
    observations: occurrence?.observations || ''
  });

  // Atualiza photoUrls quando occurrence mudar
  useEffect(() => {
    if (occurrence?.photo_urls) {
      setPhotoUrls(occurrence.photo_urls);
    }
  }, [occurrence?.photo_urls]);

  // Carrega histórico ao abrir o modal
  useEffect(() => {
    if (isOpen && occurrence?.id) {
      loadHistory();
    }
  }, [isOpen, occurrence?.id]);

  // 🆕 Processa a fila de fotos pendentes
  useEffect(() => {
    if (pendingPhotos.length > 0 && !isImageEditorOpen && !currentEditingImage && occurrence) {
      // Pega a primeira foto da fila
      const nextPhoto = pendingPhotos[0];
      setCurrentEditingImage(nextPhoto);
      
      // Gera watermark data
      const watermarkData = createWatermarkData(
        occurrence.stage_name,
        occurrence.driver_number,
        occurrence.driver_name,
        occurrence.category,
        occurrence.classe || occurrence.category,
        occurrence.chassis,
        occurrence.incident_date,
        occurrence.session,
        occurrence.line_code
      );
      
      setCurrentWatermarkData(watermarkData);
      setIsImageEditorOpen(true);
    }
  }, [pendingPhotos, isImageEditorOpen, currentEditingImage, occurrence]);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('wheel_damage_history')
        .select('*')
        .eq('occurrence_id', occurrence.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        return;
      }

      setHistory(data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function addHistoryEntry(actionType: string, changes: any = null, description: string = '') {
    try {
      console.log('📝 Adicionando entrada no histórico:', { actionType, description, occurrenceId: occurrence?.id });
      
      if (!occurrence?.id) {
        console.error('❌ occurrence.id não está disponível');
        toast.error('Erro: ID da ocorrência não disponível');
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // 🆕 Busca o nome do usuário do user_metadata (sistema Supabase Auth)
      let userName = 'Sistema';
      if (user?.id) {
        // Prioridade: user_metadata.name > user_metadata.full_name > email
        userName = user.user_metadata?.name || 
                   user.user_metadata?.full_name || 
                   user.email?.split('@')[0] || 
                   'Usuário';
      }

      const historyEntry = {
        occurrence_id: occurrence.id,
        action_type: actionType,
        changes: changes,
        description: description,
        user_id: user?.id || null,
        user_name: userName
      };

      console.log('🔍 Dados que serão inseridos:', historyEntry);

      const { data, error } = await supabase
        .from('wheel_damage_history')
        .insert(historyEntry)
        .select();

      if (error) {
        console.error('❌ Erro DETALHADO ao adicionar entrada no histórico:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        toast.error(`Erro ao registrar no histórico: ${error.message}`);
        return;
      }

      console.log('✅ Entrada adicionada no histórico:', data);
      
      // Recarrega o histórico
      await loadHistory();
    } catch (error: any) {
      console.error('❌ Exception ao adicionar entrada no histórico:', {
        error,
        message: error?.message,
        stack: error?.stack
      });
      toast.error(`Erro ao registrar no histórico: ${error?.message || 'Erro desconhecido'}`);
    }
  }
  
  if (!isOpen || !occurrence) return null;

  async function handleApprove() {
    setShowApprovalDialog(false);
    setIsApproving(true);
    try {
      // Busca o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('wheel_damage_occurrences')
        .update({ 
          status: 'approved',
          approved_by: user?.id || null,
          approved_at: new Date().toISOString()
        })
        .eq('id', occurrence.id);

      if (error) {
        console.error('❌ Erro ao aprovar avaria:', error);
        toast.error('Erro ao aprovar avaria');
        return;
      }

      // Adiciona entrada no histórico
      await addHistoryEntry('approved', null, 'Avaria aprovada');

      toast.success('Avaria aprovada com sucesso!');
      if (onApprove) {
        onApprove(occurrence.id);
      }
    } catch (error) {
      console.error('❌ Erro ao aprovar avaria:', error);
      toast.error('Erro ao aprovar avaria');
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReprove() {
    // Abre o formulário de edição em vez de reprovar diretamente
    setShowApprovalDialog(false);
    setShowEditForm(true);
    // Inicializa o formulário com os dados atuais
    setEditForm({
      driver_number: occurrence?.driver_number || '',
      driver_name: occurrence?.driver_name || '',
      session: occurrence?.session || '',
      wheel_position: occurrence?.wheel_position || '',
      wheel_color: occurrence?.wheel_color || '',
      damage_type: occurrence?.damage_type || '',
      action_taken: occurrence?.action_taken || '',
      destination: occurrence?.destination || '',
      serial_number: occurrence?.serial_number || '',
      observations: occurrence?.observations || ''
    });
  }

  async function handleSaveAndApprove() {
    setIsApproving(true);
    try {
      // Busca o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      // Prepara as alterações para o histórico
      const changes: any = {};
      if (editForm.driver_number !== occurrence.driver_number) changes.driver_number = { old: occurrence.driver_number, new: editForm.driver_number };
      if (editForm.driver_name !== occurrence.driver_name) changes.driver_name = { old: occurrence.driver_name, new: editForm.driver_name };
      if (editForm.session !== occurrence.session) changes.session = { old: occurrence.session, new: editForm.session };
      if (editForm.wheel_position !== occurrence.wheel_position) changes.wheel_position = { old: occurrence.wheel_position, new: editForm.wheel_position };
      if (editForm.wheel_color !== occurrence.wheel_color) changes.wheel_color = { old: occurrence.wheel_color, new: editForm.wheel_color };
      if (editForm.damage_type !== occurrence.damage_type) changes.damage_type = { old: occurrence.damage_type, new: editForm.damage_type };
      if (editForm.action_taken !== occurrence.action_taken) changes.action_taken = { old: occurrence.action_taken, new: editForm.action_taken };
      if (editForm.destination !== occurrence.destination) changes.destination = { old: occurrence.destination, new: editForm.destination };
      if (editForm.serial_number !== occurrence.serial_number) changes.serial_number = { old: occurrence.serial_number, new: editForm.serial_number };
      if (editForm.observations !== occurrence.observations) changes.observations = { old: occurrence.observations, new: editForm.observations };
      
      // Atualiza a avaria com os dados editados E aprova
      const { error } = await supabase
        .from('wheel_damage_occurrences')
        .update({ 
          driver_number: editForm.driver_number,
          driver_name: editForm.driver_name,
          session: editForm.session,
          wheel_position: editForm.wheel_position,
          wheel_color: editForm.wheel_color || null,
          damage_type: editForm.damage_type,
          action_taken: editForm.action_taken || null,
          destination: editForm.destination,
          serial_number: editForm.serial_number || null,
          observations: editForm.observations || null,
          status: 'approved',
          approved_by: user?.id || null,
          approved_at: new Date().toISOString()
        })
        .eq('id', occurrence.id);

      if (error) {
        console.error('❌ Erro ao salvar e aprovar avaria:', error);
        toast.error('Erro ao salvar e aprovar avaria');
        return;
      }

      // Adiciona entrada no histórico
      const changesCount = Object.keys(changes).length;
      await addHistoryEntry(
        'updated', 
        changes, 
        `Avaria corrigida e aprovada (${changesCount} campo${changesCount > 1 ? 's alterados' : ' alterado'})`
      );

      toast.success('Avaria atualizada e aprovada com sucesso!');
      setShowEditForm(false);
      if (onApprove) {
        onApprove(occurrence.id);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar e aprovar avaria:', error);
      toast.error('Erro ao salvar e aprovar avaria');
    } finally {
      setIsApproving(false);
    }
  }

  // Extrai a geração do chassis (ex: "247/992.1" -> "992.1")
  function getGenerationFromChassis(chassis: string): string {
    if (!chassis || !chassis.includes('/')) return '';
    const parts = chassis.split('/');
    return parts.length > 1 ? parts[1].trim() : '';
  }

  function getPositionLabel(position: string): string {
    const map: Record<string, string> = {
      'dianteira': 'Dianteira',
      'dianteira_direita': 'Dianteira Direita',
      'dianteira_esquerda': 'Dianteira Esquerda',
      'traseira': 'Traseira',
      'traseira_direita': 'Traseira Direita',
      'traseira_esquerda': 'Traseira Esquerda'
    };
    return map[position] || position;
  }

  function getDamageTypeLabel(type: string): string {
    const map: Record<string, string> = {
      'empenada': 'Empenada',
      'fora_de_centro': 'Fora de Centro',
      'vazamento': 'Vazamento',
      'pintura': 'Pintura',
      'dsi': 'DSI',
      'corte': 'Corte',
      'fissura': 'Fissura',
      'quebra': 'Quebra'
    };
    return map[type] || type;
  }

  function getActionLabel(action: string): string {
    const map: Record<string, string> = {
      'reforma': 'Reforma',
      'pintura': 'Pintura',
      'dsi': 'DSI'
    };
    return map[action] || action;
  }

  function getColorLabel(color: string): string {
    const map: Record<string, string> = {
      'chumbo': 'Chumbo',
      'prata': 'Prata',
      'preta': 'Preta',
      'colorida': 'Colorida'
    };
    return map[color] || color;
  }

  // Função para fazer upload de fotos
  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // 🆕 Ao invés de fazer upload direto, adiciona as fotos à fila de processamento
    const newPhotos = Array.from(files);
    setPendingPhotos([...pendingPhotos, ...newPhotos]);
    
    // Limpa o input
    if (event.target) {
      event.target.value = '';
    }
  }

  // 🆕 Salva foto processada do ImageEditor
  async function handleImageEditorSave(processedBlob: Blob) {
    setIsUploadingPhotos(true);
    
    try {
      const currentSequence = photoUrls.length + 1;
      const fileName = `${occurrence.line_code}.${currentSequence}.jpg`;
      
      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('wheel-damage-photos')
        .upload(fileName, processedBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Erro ao fazer upload da foto:', error);
        toast.error(`Erro ao fazer upload da foto ${currentSequence}`);
        return;
      }

      // Busca URL pública
      const { data: urlData } = supabase.storage
        .from('wheel-damage-photos')
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        const updatedUrls = [...photoUrls, urlData.publicUrl];
        
        // Atualiza no banco de dados
        const { error: updateError } = await supabase
          .from('wheel_damage_occurrences')
          .update({ photo_urls: updatedUrls })
          .eq('id', occurrence.id);

        if (updateError) {
          console.error('❌ Erro ao atualizar URLs no banco:', updateError);
          toast.error('Erro ao salvar foto');
          return;
        }

        // Atualiza estado local
        setPhotoUrls(updatedUrls);
        
        // Adiciona entrada no histórico
        await addHistoryEntry('photo_added', null, '1 foto adicionada');
        
        toast.success('Foto adicionada com sucesso!');
      }
    } catch (error) {
      console.error('❌ Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setIsUploadingPhotos(false);
      // Remove a foto atual da fila de pendentes
      setPendingPhotos(prev => prev.slice(1));
      setCurrentEditingImage(null);
      setIsImageEditorOpen(false);
    }
  }

  // 🆕 Cancela edição de foto
  function handleImageEditorClose() {
    // Remove a foto da fila mas não adiciona ao array
    setPendingPhotos(prev => prev.slice(1));
    setCurrentEditingImage(null);
    setIsImageEditorOpen(false);
  }

  // 🆕 Função para deletar uma foto
  async function handleDeletePhoto(photoUrl: string, photoIndex: number) {
    const confirmDelete = window.confirm(`Deseja realmente excluir a foto ${occurrence.line_code}.${photoIndex + 1}.jpg?\n\nAs fotos subsequentes serão renumeradas automaticamente.`);
    
    if (!confirmDelete) return;

    try {
      toast.info('Excluindo foto e reorganizando sequência...');

      // 1. Remove a foto selecionada do Supabase Storage
      const deleted = await deleteDamagePhoto(photoUrl);
      
      if (!deleted) {
        toast.error('Erro ao excluir foto do storage');
        return;
      }

      // 2. Renumera as fotos subsequentes
      const updatedUrls = [...photoUrls];
      updatedUrls.splice(photoIndex, 1); // Remove a URL deletada

      // 3. Para cada foto após a deletada, precisamos renomear no storage
      const newUrls: string[] = [];
      
      for (let i = 0; i < updatedUrls.length; i++) {
        const currentUrl = updatedUrls[i];
        const newSequence = i + 1;
        
        // Se o índice mudou (fotos após a deletada), renomeia
        if (i >= photoIndex) {
          try {
            // Extrai o path atual
            const url = new URL(currentUrl);
            const pathParts = url.pathname.split('/');
            const oldFilePath = pathParts.slice(pathParts.indexOf('wheel-damage-photos') + 1).join('/');
            
            // Novo nome do arquivo
            const newFileName = `${occurrence.line_code}.${newSequence}.jpg`;
            
            // Download da foto atual
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('wheel-damage-photos')
              .download(oldFilePath);
            
            if (downloadError || !fileData) {
              console.error('❌ Erro ao baixar foto para renomear:', downloadError);
              newUrls.push(currentUrl); // Mantém a URL original em caso de erro
              continue;
            }
            
            // Upload com novo nome
            const { error: uploadError } = await supabase.storage
              .from('wheel-damage-photos')
              .upload(newFileName, fileData, {
                cacheControl: '3600',
                upsert: true,
                contentType: 'image/jpeg'
              });
            
            if (uploadError) {
              console.error('❌ Erro ao fazer upload da foto renomeada:', uploadError);
              newUrls.push(currentUrl);
              continue;
            }
            
            // Remove o arquivo antigo
            await supabase.storage
              .from('wheel-damage-photos')
              .remove([oldFilePath]);
            
            // Gera nova URL pública
            const { data: { publicUrl } } = supabase.storage
              .from('wheel-damage-photos')
              .getPublicUrl(newFileName);
            
            newUrls.push(publicUrl);
          } catch (error) {
            console.error('❌ Erro ao renomear foto:', error);
            newUrls.push(currentUrl);
          }
        } else {
          // Fotos antes da deletada mantêm a URL original
          newUrls.push(currentUrl);
        }
      }

      // 4. Atualiza no banco de dados
      const { error: updateError } = await supabase
        .from('wheel_damage_occurrences')
        .update({ photo_urls: newUrls })
        .eq('id', occurrence.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar URLs no banco:', updateError);
        toast.error('Erro ao atualizar registro no banco');
        return;
      }

      // 5. Atualiza estado local
      setPhotoUrls(newUrls);

      // 6. Adiciona entrada no histórico
      await addHistoryEntry('photo_removed', null, `Foto ${occurrence.line_code}.${photoIndex + 1}.jpg removida e sequência reorganizada`);

      toast.success('Foto excluída e sequência reorganizada com sucesso!');

    } catch (error) {
      console.error('❌ Erro ao deletar foto:', error);
      toast.error('Erro ao excluir foto');
    }
  }

  return (
    <>
      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePhotoUpload}
        className="hidden"
      />
      
      <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto" onClick={onClose}>
        <div className="min-h-screen flex items-center justify-center p-4 md:p-8" onClick={onClose}>
          <div className="bg-background border border-border rounded-lg w-full max-w-5xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="border-b border-border p-6 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Button variant="outline" size="sm" onClick={() => setIsPlacaInfoOpen(true)}>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Placa (Ajuda)
                </Button>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Avaria {occurrence.line_code}</h2>
              <p className="text-muted-foreground text-sm">{occurrence.chassis} - {occurrence.stage_name}</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Alerta de Pendência */}
              {isPending && (
                <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-600 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-red-700 font-bold text-sm">
                        PENDENTE: Esta ocorrência aguarda aprovação do administrador.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowApprovalDialog(true)}
                      disabled={isApproving}
                    >
                      {isApproving ? 'Analisando...' : 'Analisar'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Fotos da Avaria */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">FOTOS DA AVARIA</CardTitle>
                    <Button variant="destructive" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Adicionar Fotos
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {photoUrls && photoUrls.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {photoUrls.map((url: string, index: number) => (
                        <div key={index} className="border border-border rounded-lg overflow-hidden bg-muted/20">
                          <div className="relative aspect-[4/3] bg-black">
                            <img 
                              src={url} 
                              alt={`Foto ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-semibold text-foreground">
                                  {occurrence.line_code}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {occurrence.line_code}.{index + 1}.jpg
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Sequência: {index + 1}
                                </div>
                              </div>
                              <Button variant="destructive" size="sm" onClick={() => handleDeletePhoto(url, index)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma foto disponível
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Informações da Ocorrência */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">INFORMAÇÕES DA OCORRÊNCIA</CardTitle>
                  <p className="text-sm text-muted-foreground">Detalhes completos da avaria registrada</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Linha 1 */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Categoria</div>
                      <Badge variant="secondary" className="text-sm">
                        {occurrence.category}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        Modelo: {getGenerationFromChassis(occurrence.chassis) || occurrence.classe || occurrence.category}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Piloto</div>
                      <div className="text-sm font-semibold text-foreground">
                        #{occurrence.driver_number} {occurrence.driver_name}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Sessão</div>
                      <div className="text-sm font-semibold text-foreground">
                        {formatSession(occurrence.session)}
                      </div>
                    </div>

                    {/* Linha 2 */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Posição da Roda</div>
                      <div className="text-sm font-semibold text-foreground">
                        {getPositionLabel(occurrence.wheel_position)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Cor da Roda</div>
                      <div className="text-sm font-semibold text-foreground">
                        {occurrence.wheel_color ? getColorLabel(occurrence.wheel_color) : '-'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Tipo de Avaria</div>
                      <div className="text-sm font-semibold text-foreground">
                        {getDamageTypeLabel(occurrence.damage_type)}
                      </div>
                    </div>

                    {/* Linha 3 */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Ação Tomada</div>
                      <div className="text-sm font-semibold text-foreground">
                        {occurrence.action_taken ? getActionLabel(occurrence.action_taken) : '-'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Destino</div>
                      <Badge 
                        variant={occurrence.destination === 'CUP' || occurrence.destination === 'CONTA' ? 'destructive' : 'secondary'}
                        className="text-sm"
                      >
                        {occurrence.destination}
                      </Badge>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Registrado em</div>
                      <div className="text-sm font-semibold text-foreground">
                        {new Date(occurrence.created_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    {/* Serial Number (se existir) */}
                    {occurrence.serial_number && (
                      <div className="md:col-span-3">
                        <div className="text-xs text-muted-foreground mb-1">Serial Number</div>
                        <div className="text-sm font-mono font-semibold text-foreground">
                          {occurrence.serial_number}
                        </div>
                      </div>
                    )}

                    {/* Observações (se existir) */}
                    {occurrence.observations && (
                      <div className="md:col-span-3">
                        <div className="text-xs text-muted-foreground mb-1">Observações</div>
                        <div className="text-sm text-foreground bg-muted/30 p-3 rounded-lg">
                          {occurrence.observations}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Histórico */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">HISTÓRICO</CardTitle>
                  <p className="text-sm text-muted-foreground">Registro de eventos desta avaria</p>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando histórico...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Evento: Criação */}
                      <div className="flex gap-4 items-start">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground font-semibold text-sm">
                          C
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">CREATED</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(occurrence.created_at).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-foreground">Avaria registrada</div>
                          <div className="text-xs text-muted-foreground">
                            {occurrence.created_by_name || 'Sistema'}
                          </div>
                        </div>
                      </div>

                      {/* Eventos adicionais */}
                      {history.map((entry, index) => (
                        <div key={index} className="flex gap-4 items-start">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground font-semibold text-sm">
                            {entry.action_type.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{entry.action_type.toUpperCase()}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(entry.created_at).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-foreground">{entry.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {entry.user_name}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Footer com ações */}
            <div className="border-t border-border p-6 bg-muted/30 flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>

          {/* Modal de Ajuda da Placa */}
          {isPlacaInfoOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
              <div className="bg-background border border-border rounded-lg w-full max-w-2xl mx-4 shadow-xl">
                <div className="border-b border-border p-6 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Informações para Placa</h2>
                    <button
                      onClick={() => setIsPlacaInfoOpen(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    {/* Etapa */}
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Etapa</div>
                      <div className="text-lg font-bold text-foreground">{occurrence.stage_code || occurrence.stage_name}</div>
                      <div className="text-sm text-muted-foreground">{occurrence.stage_name}</div>
                    </div>

                    {/* Data do Incidente */}
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Data do Incidente</div>
                      <div className="text-lg font-bold text-foreground">
                        {new Date(occurrence.incident_date || occurrence.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    {/* Local */}
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Local</div>
                      <div className="text-lg font-bold text-foreground">{occurrence.location || 'Interlagos'}</div>
                    </div>

                    {/* Piloto */}
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Piloto</div>
                      <div className="text-lg font-bold text-foreground">#{occurrence.driver_number} {occurrence.driver_name}</div>
                    </div>

                    {/* Chassis */}
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Chassis</div>
                      <div className="text-lg font-bold text-foreground">
                        {occurrence.chassis ? occurrence.chassis.replace('/', '-') : '-'}
                      </div>
                    </div>

                    {/* Classe do Piloto */}
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Classe do Piloto</div>
                      <div className="text-lg font-bold text-foreground">{occurrence.driver_class || occurrence.category}</div>
                    </div>

                    {/* Categoria do Carro */}
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Categoria do Carro</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-sm font-bold">
                          {occurrence.category}
                        </Badge>
                      </div>
                    </div>

                    {/* Sessão */}
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Sessão</div>
                      <div className="text-lg font-bold text-foreground">{formatSession(occurrence.session)}</div>
                    </div>
                  </div>

                  {/* Código da Ocorrência */}
                  <div className="mt-8 pt-6 border-t border-border">
                    <div className="text-sm text-muted-foreground mb-2">Código da Ocorrência</div>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-bold text-foreground">{occurrence.line_code}</div>
                      <button
                        onClick={async () => {
                          try {
                            await copyToClipboard(occurrence.line_code);
                            toast.success('Código copiado!');
                          } catch (error) {
                            toast.error('Erro ao copiar código');
                          }
                        }}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Copiar código"
                      >
                        <Copy className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border p-6 bg-muted/30 flex justify-end">
                  <Button variant="outline" onClick={() => setIsPlacaInfoOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Dialog de Aprovação */}
          {showApprovalDialog && (
            <div 
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]"
              onClick={() => setShowApprovalDialog(false)}
            >
              <div 
                className="bg-background border border-border rounded-lg w-full max-w-md mx-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-2">Aprovar Ocorrência</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Deseja aprovar a ocorrência #{occurrence.line_code}? Esta ação não poderá ser desfeita.
                  </p>
                  
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="destructive"
                      onClick={handleReprove}
                      disabled={isApproving}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reprovar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowApprovalDialog(false)}
                      disabled={isApproving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isApproving ? (
                        'Aprovando...'
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Aprovar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Formulário de Edição */}
          {showEditForm && (
            <div 
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]"
              onClick={() => setShowEditForm(false)}
            >
              <div 
                className="bg-background border border-border rounded-lg w-full max-w-2xl mx-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-2">Editar e Aprovar Ocorrência</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Edite os campos abaixo e clique em "Salvar e Aprovar" para finalizar a avaria.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Piloto</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editForm.driver_number}
                          onChange={(e) => setEditForm({ ...editForm, driver_number: e.target.value })}
                          className="w-full p-2 border border-border rounded-lg"
                        />
                        <input
                          type="text"
                          value={editForm.driver_name}
                          onChange={(e) => setEditForm({ ...editForm, driver_name: e.target.value })}
                          className="w-full p-2 border border-border rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Sessão</div>
                      <input
                        type="text"
                        value={editForm.session}
                        onChange={(e) => setEditForm({ ...editForm, session: e.target.value })}
                        className="w-full p-2 border border-border rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Posição da Roda</div>
                      <input
                        type="text"
                        value={editForm.wheel_position}
                        onChange={(e) => setEditForm({ ...editForm, wheel_position: e.target.value })}
                        className="w-full p-2 border border-border rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Cor da Roda</div>
                      <input
                        type="text"
                        value={editForm.wheel_color}
                        onChange={(e) => setEditForm({ ...editForm, wheel_color: e.target.value })}
                        className="w-full p-2 border border-border rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Tipo de Avaria</div>
                      <input
                        type="text"
                        value={editForm.damage_type}
                        onChange={(e) => setEditForm({ ...editForm, damage_type: e.target.value })}
                        className="w-full p-2 border border-border rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Ação Tomada</div>
                      <input
                        type="text"
                        value={editForm.action_taken}
                        onChange={(e) => setEditForm({ ...editForm, action_taken: e.target.value })}
                        className="w-full p-2 border border-border rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Destino</div>
                      <input
                        type="text"
                        value={editForm.destination}
                        onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                        className="w-full p-2 border border-border rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Serial Number</div>
                      <input
                        type="text"
                        value={editForm.serial_number}
                        onChange={(e) => setEditForm({ ...editForm, serial_number: e.target.value })}
                        className="w-full p-2 border border-border rounded-lg"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-sm text-muted-foreground mb-1">Observações</div>
                      <textarea
                        value={editForm.observations}
                        onChange={(e) => setEditForm({ ...editForm, observations: e.target.value })}
                        className="w-full p-2 border border-border rounded-lg"
                        rows={4}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-6">
                    <Button
                      variant="destructive"
                      onClick={() => setShowEditForm(false)}
                      disabled={isApproving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveAndApprove}
                      disabled={isApproving}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isApproving ? (
                        'Salvando...'
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Salvar e Aprovar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ImageEditor */}
      {isImageEditorOpen && currentEditingImage && currentWatermarkData && (
        <ImageEditor
          isOpen={isImageEditorOpen}
          imageFile={currentEditingImage}
          onClose={handleImageEditorClose}
          onSave={handleImageEditorSave}
          watermarkData={currentWatermarkData}
        />
      )}
    </>
  );
}