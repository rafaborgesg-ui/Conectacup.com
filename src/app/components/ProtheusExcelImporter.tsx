import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle, Trash2, FileSpreadsheet, Database } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import * as XLSX from 'xlsx';
import { createClient } from '../utils/supabase/client';

interface ImportResult {
  setor: { created: number; updated: number; errors: string[] };
  projeto: { created: number; updated: number; errors: string[] };
  conta_contabil: { created: number; updated: number; errors: string[] };
}

interface ProtheusExcelImporterProps {
  onImportComplete: () => void;
  isAdmin?: boolean;
}

export function ProtheusExcelImporter({ onImportComplete, isAdmin = false }: ProtheusExcelImporterProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Valida extensão do arquivo
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      toast.error('Formato de arquivo inválido', {
        description: 'Por favor, selecione um arquivo Excel (.xlsx ou .xls)'
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      // Lê o arquivo Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Arquivo Excel vazio ou inválido');
      }
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      console.log('📊 Dados do Excel:', jsonData);

      // Detecta as seções baseadas nos cabeçalhos
      const sections = detectSections(jsonData);
      
      console.log('📋 Seções detectadas:', sections);

      // Processa cada seção
      const result = await processImport(sections, jsonData);
      
      setImportResult(result);

      // Mostra resultado
      const totalCreated = result.setor.created + result.projeto.created + result.conta_contabil.created;
      const totalUpdated = result.setor.updated + result.projeto.updated + result.conta_contabil.updated;
      const totalErrors = result.setor.errors.length + result.projeto.errors.length + result.conta_contabil.errors.length;

      if (totalErrors > 0) {
        toast.warning(`Importação concluída com ${totalErrors} erro(s)`, {
          description: `${totalCreated} criados, ${totalUpdated} atualizados`,
          duration: 5000
        });
      } else {
        toast.success('Importação concluída!', {
          description: `${totalCreated} criados, ${totalUpdated} atualizados`,
          duration: 3000
        });
      }

      onImportComplete();
    } catch (error: any) {
      console.error('❌ Erro ao importar:', error);
      toast.error('Erro ao importar arquivo', {
        description: error.message
      });
    } finally {
      setIsImporting(false);
      // Limpa o input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const detectSections = (data: any[][]) => {
    const sections = {
      setor: { startRow: -1, endRow: -1, colSetor: -1, colDescricao: -1, colResponsavel: -1 },
      projeto: { startRow: -1, endRow: -1, colProjeto: -1, colDescricao: -1, colTemporada: -1 },
      conta_contabil: { startRow: -1, endRow: -1, colConta: -1, colDescricao: -1 }
    };

    // Procura pelos cabeçalhos
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;

      const rowStr = row.map(cell => (cell || '').toString().toLowerCase().trim());

      // Detecta seção Setor
      if (rowStr.includes('setor') && !rowStr.includes('conta')) {
        sections.setor.startRow = i;
        sections.setor.colSetor = row.findIndex((cell: any) => 
          (cell || '').toString().toLowerCase().trim() === 'setor'
        );
        sections.setor.colDescricao = row.findIndex((cell: any) => {
          const cellStr = (cell || '').toString().toLowerCase().trim();
          return cellStr === 'descrição' || cellStr === 'descricao';
        });
        sections.setor.colResponsavel = row.findIndex((cell: any) => {
          const cellStr = (cell || '').toString().toLowerCase().trim();
          return cellStr === 'responsavel' || cellStr === 'responsável';
        });
      }

      // Detecta seção Projeto
      if (rowStr.includes('projeto')) {
        sections.projeto.startRow = i;
        sections.projeto.colProjeto = row.findIndex((cell: any) => 
          (cell || '').toString().toLowerCase().trim() === 'projeto'
        );
        sections.projeto.colDescricao = row.findIndex((cell: any) => {
          const cellStr = (cell || '').toString().toLowerCase().trim();
          return cellStr === 'descrição' || cellStr === 'descricao';
        });
        sections.projeto.colTemporada = row.findIndex((cell: any) => 
          (cell || '').toString().toLowerCase().trim() === 'temporada'
        );
      }

      // Detecta seção Conta Contábil
      if (rowStr.includes('conta') && (rowStr.includes('contábil') || rowStr.includes('contabil'))) {
        sections.conta_contabil.startRow = i;
        sections.conta_contabil.colConta = row.findIndex((cell: any) => {
          const cellStr = (cell || '').toString().toLowerCase().trim();
          return cellStr === 'conta contábil' || cellStr === 'conta contabil';
        });
        sections.conta_contabil.colDescricao = row.findIndex((cell: any) => {
          const cellStr = (cell || '').toString().toLowerCase().trim();
          return cellStr === 'descrição' || cellStr === 'descricao';
        });
      }
    }

    // Determina onde cada seção termina
    const starts = [
      sections.setor.startRow,
      sections.projeto.startRow,
      sections.conta_contabil.startRow
    ].filter(r => r >= 0).sort((a, b) => a - b);

    if (sections.setor.startRow >= 0) {
      const nextStart = starts.find(s => s > sections.setor.startRow);
      sections.setor.endRow = nextStart ? nextStart - 1 : data.length - 1;
    }

    if (sections.projeto.startRow >= 0) {
      const nextStart = starts.find(s => s > sections.projeto.startRow);
      sections.projeto.endRow = nextStart ? nextStart - 1 : data.length - 1;
    }

    if (sections.conta_contabil.startRow >= 0) {
      const nextStart = starts.find(s => s > sections.conta_contabil.startRow);
      sections.conta_contabil.endRow = nextStart ? nextStart - 1 : data.length - 1;
    }

    return sections;
  };

  const processImport = async (sections: any, data: any[][]): Promise<ImportResult> => {
    const supabase = createClient();
    const result: ImportResult = {
      setor: { created: 0, updated: 0, errors: [] },
      projeto: { created: 0, updated: 0, errors: [] },
      conta_contabil: { created: 0, updated: 0, errors: [] }
    };

    // Processa Setor
    if (sections.setor.startRow >= 0) {
      for (let i = sections.setor.startRow + 1; i <= sections.setor.endRow; i++) {
        const row = data[i];
        if (!row) continue;

        const setor = row[sections.setor.colSetor];
        const descricao = row[sections.setor.colDescricao];
        const responsavel = sections.setor.colResponsavel >= 0 ? row[sections.setor.colResponsavel] : null;

        if (!setor) continue;

        try {
          // Verifica se já existe
          const { data: existing } = await supabase
            .from('setor')
            .select('id')
            .eq('setor', setor)
            .single();

          if (existing) {
            // Atualiza
            const { error } = await supabase
              .from('setor')
              .update({
                descricao: descricao || null,
                responsavel: responsavel || null
              })
              .eq('setor', setor);

            if (error) throw error;
            result.setor.updated++;
          } else {
            // Cria
            const { error } = await supabase
              .from('setor')
              .insert({
                setor,
                descricao: descricao || null,
                responsavel: responsavel || null
              });

            if (error) throw error;
            result.setor.created++;
          }
        } catch (error: any) {
          console.error(`Erro ao processar setor ${setor}:`, error);
          result.setor.errors.push(`Setor ${setor}: ${error.message}`);
        }
      }
    }

    // Processa Projeto
    if (sections.projeto.startRow >= 0) {
      for (let i = sections.projeto.startRow + 1; i <= sections.projeto.endRow; i++) {
        const row = data[i];
        if (!row) continue;

        const projeto = row[sections.projeto.colProjeto];
        const descricao = row[sections.projeto.colDescricao];
        const temporada = sections.projeto.colTemporada >= 0 ? row[sections.projeto.colTemporada] : null;

        if (!projeto) continue;

        try {
          // Verifica se já existe
          const { data: existing } = await supabase
            .from('projeto')
            .select('id')
            .eq('projeto', projeto)
            .single();

          if (existing) {
            // Atualiza
            const updateData: any = {
              descricao: descricao || null
            };
            
            // Só atualiza temporada se existir na planilha
            if (temporada !== null && temporada !== undefined) {
              updateData.temporada = parseInt(String(temporada)) || null;
            }
            
            const { error } = await supabase
              .from('projeto')
              .update(updateData)
              .eq('projeto', projeto);

            if (error) throw error;
            result.projeto.updated++;
          } else {
            // Cria
            const insertData: any = {
              projeto,
              descricao: descricao || null
            };
            
            // Só adiciona temporada se existir na planilha
            if (temporada !== null && temporada !== undefined) {
              insertData.temporada = parseInt(String(temporada)) || null;
            }
            
            const { error } = await supabase
              .from('projeto')
              .insert(insertData);

            if (error) throw error;
            result.projeto.created++;
          }
        } catch (error: any) {
          console.error(`Erro ao processar projeto ${projeto}:`, error);
          result.projeto.errors.push(`Projeto ${projeto}: ${error.message}`);
        }
      }
    }

    // Processa Conta Contábil
    if (sections.conta_contabil.startRow >= 0) {
      for (let i = sections.conta_contabil.startRow + 1; i <= sections.conta_contabil.endRow; i++) {
        const row = data[i];
        if (!row) continue;

        const contaContabil = row[sections.conta_contabil.colConta];
        const descricao = row[sections.conta_contabil.colDescricao];

        if (!contaContabil) continue;

        try {
          // Verifica se já existe
          const { data: existing } = await supabase
            .from('conta_contabil')
            .select('id')
            .eq('Conta Contábil', contaContabil)
            .single();

          if (existing) {
            // Atualiza
            const { error } = await supabase
              .from('conta_contabil')
              .update({
                'Descrição': descricao || null
              })
              .eq('Conta Contábil', contaContabil);

            if (error) throw error;
            result.conta_contabil.updated++;
          } else {
            // Cria
            const { error } = await supabase
              .from('conta_contabil')
              .insert({
                'Conta Contábil': contaContabil,
                'Descrição': descricao || null
              });

            if (error) throw error;
            result.conta_contabil.created++;
          }
        } catch (error: any) {
          console.error(`Erro ao processar conta ${contaContabil}:`, error);
          result.conta_contabil.errors.push(`Conta ${contaContabil}: ${error.message}`);
        }
      }
    }

    return result;
  };

  const handleClearDatabase = async () => {
    setIsClearing(true);

    try {
      const supabase = createClient();

      // Deleta todos os registros das 3 tabelas
      const { error: setorError } = await supabase
        .from('setor')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

      if (setorError) throw new Error(`Erro ao limpar setor: ${setorError.message}`);

      const { error: projetoError } = await supabase
        .from('projeto')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

      if (projetoError) throw new Error(`Erro ao limpar projeto: ${projetoError.message}`);

      const { error: contaError } = await supabase
        .from('conta_contabil')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

      if (contaError) throw new Error(`Erro ao limpar conta_contabil: ${contaError.message}`);

      toast.success('Banco de dados limpo com sucesso!');
      onImportComplete();
    } catch (error: any) {
      console.error('❌ Erro ao limpar banco:', error);
      toast.error('Erro ao limpar banco de dados', {
        description: error.message
      });
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Botões de ação */}
      <div className="flex gap-2 items-center">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="gap-2"
        >
          {isImporting ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Importando...
            </>
          ) : (
            <>
              <Upload size={16} />
              Importar Excel
            </>
          )}
        </Button>

        {isAdmin && (
          <Button
            variant="destructive"
            onClick={() => setShowClearConfirm(true)}
            disabled={isClearing || isImporting}
            className="gap-2"
          >
            {isClearing ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Limpando...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Limpar Banco
              </>
            )}
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Resultado da importação */}
      {importResult && (
        <Card className="p-4 border-2 border-green-500/20 bg-green-500/5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-green-500 mt-1" size={20} />
            <div className="flex-1 space-y-3">
              <h3 className="font-semibold">Resultado da Importação</h3>
              
              <div className="grid grid-cols-3 gap-4">
                {/* Setor */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Setor</p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-green-500/10">
                      +{importResult.setor.created}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-500/10">
                      ↻{importResult.setor.updated}
                    </Badge>
                    {importResult.setor.errors.length > 0 && (
                      <Badge variant="outline" className="bg-red-500/10">
                        ✕{importResult.setor.errors.length}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Projeto */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Projeto</p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-green-500/10">
                      +{importResult.projeto.created}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-500/10">
                      ↻{importResult.projeto.updated}
                    </Badge>
                    {importResult.projeto.errors.length > 0 && (
                      <Badge variant="outline" className="bg-red-500/10">
                        ✕{importResult.projeto.errors.length}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Conta Contábil */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Conta Contábil</p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-green-500/10">
                      +{importResult.conta_contabil.created}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-500/10">
                      ↻{importResult.conta_contabil.updated}
                    </Badge>
                    {importResult.conta_contabil.errors.length > 0 && (
                      <Badge variant="outline" className="bg-red-500/10">
                        ✕{importResult.conta_contabil.errors.length}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Erros detalhados */}
              {(importResult.setor.errors.length > 0 || 
                importResult.projeto.errors.length > 0 || 
                importResult.conta_contabil.errors.length > 0) && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium text-red-500">Erros encontrados:</p>
                  <div className="space-y-1 text-sm text-muted-foreground max-h-32 overflow-y-auto">
                    {importResult.setor.errors.map((err, i) => (
                      <p key={`setor-${i}`} className="text-red-400">• {err}</p>
                    ))}
                    {importResult.projeto.errors.map((err, i) => (
                      <p key={`projeto-${i}`} className="text-red-400">• {err}</p>
                    ))}
                    {importResult.conta_contabil.errors.map((err, i) => (
                      <p key={`conta-${i}`} className="text-red-400">• {err}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Informações sobre o formato */}
      <Card className="p-4 border-porsche-red/20 bg-porsche-red/5">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="text-porsche-red mt-1 flex-shrink-0" size={20} />
          <div className="flex-1 space-y-2">
            <h4 className="font-semibold text-gray-900">Formato do Excel</h4>
            <div className="text-sm space-y-2">
              <p className="text-muted-foreground">O arquivo deve conter cabeçalhos para identificar as seções:</p>
              
              <div className="grid gap-2 pt-1">
                <div className="flex gap-2 items-start">
                  <span className="text-lg">🏢</span>
                  <div className="flex-1">
                    <strong className="text-gray-900">Setor:</strong>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Colunas: "Setor" (ex: "ADM"), "Descrição" (ex: "ADMINISTRATIVO"), "Responsável" (opcional)
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 items-start">
                  <span className="text-lg">📊</span>
                  <div className="flex-1">
                    <strong className="text-gray-900">Projeto:</strong>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Colunas: "Projeto" (ex: "25ET1"), "Descrição" (ex: "Etapa 1"), "Temporada" (opcional, ex: 2025)
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 items-start">
                  <span className="text-lg">💰</span>
                  <div className="flex-1">
                    <strong className="text-gray-900">Conta Contábil:</strong>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Colunas: "Conta Contábil" (ex: "311010001"), "Descrição" (ex: "RECEITA REVENDA DE MERCADORIAS")
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-porsche-red/10">
                <p className="text-xs text-muted-foreground">
                  <strong>ℹ️ Comportamento:</strong>
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5 ml-4 mt-1">
                  <li>• Registros existentes (mesmo código) serão <strong className="text-blue-600">atualizados</strong></li>
                  <li>• Novos registros (código inexistente) serão <strong className="text-green-600">criados</strong></li>
                  <li>• Registros não presentes na planilha serão <strong className="text-gray-600">mantidos</strong> sem alteração</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  📖 <a 
                    href="/docs/EXEMPLO_IMPORTACAO_PROTHEUS.md" 
                    target="_blank" 
                    className="text-porsche-red hover:underline"
                  >
                    Ver documentação completa e exemplos
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Dialog de confirmação para limpar banco */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="text-red-500" size={20} />
              Confirmar Limpeza do Banco de Dados
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Esta ação irá <strong>DELETAR PERMANENTEMENTE</strong> todos os registros das seguintes tabelas:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Setor</li>
                <li>Projeto</li>
                <li>Conta Contábil</li>
              </ul>
              <p className="text-red-500 font-semibold pt-2">
                ⚠️ Esta ação não pode ser desfeita!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearDatabase}
              className="bg-red-500 hover:bg-red-600"
            >
              Sim, limpar banco de dados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
