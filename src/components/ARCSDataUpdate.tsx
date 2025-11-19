import { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle, Loader2, BarChart3 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { toast } from 'sonner@2.0.3';
import * as XLSX from 'xlsx';
import { getStockEntries, updateStockEntryByBarcode, getTireModels, getContainers, saveStockEntry, type StockEntry, type TireModel, type Container } from '../utils/storage';

interface ARCSRecord {
  piloto: string;
  numero: string;
  categoria: string;
  ano: string;
  etapa: string;
  pista: string;
  campeonato: string;
  tipo: string;
  set: string;
  lado: string;
  serial: string;
  condicao: string;
  local: string;
  tv: string;
  dataHora: string;
}

interface ProcessResult {
  total: number;
  updated: number;
  created: number;
  notFound: number;
  errors: string[];
}

interface ProcessProgress {
  current: number;
  total: number;
  currentBarcode: string;
  currentAction: string;
  updated: number;
  created: number;
  errors: number;
}

/**
 * Determina o modelo do pneu baseado na categoria, lado e tipo
 * Tabela de mapeamento dos 7 modelos oficiais da Porsche Cup Brasil:
 * 
 * TIPO         | CATEGORIA              | LADO                    | ESPECIFICAÇÃO   | MODEL NAME (stock_entries)
 * ============================================================================================================
 * SLICK        | Trophy/Challenge       | Dianteiro (DD ou DE)    | 27/65-18 N2     | Slick 991 Dianteiro
 * SLICK        | Trophy/Challenge       | Traseiro (TD ou TE)     | 31/71-18 N2     | Slick 991 Traseiro
 * SLICK        | Carrera                | Dianteiro (DD ou DE)    | 30/65-18 N3     | Slick 992 Dianteiro
 * SLICK        | Carrera                | Traseiro (TD ou TE)     | 31/71-18 N3R    | Slick 992 Traseiro
 * WET          | Trophy/Challenge       | Dianteiro (DD ou DE)    | 27/65-18 P2L    | Wet 991 Dianteiro
 * WET          | Carrera                | Dianteiro (DD ou DE)    | 30/65-18 P2L    | Wet 992 Dianteiro
 * WET          | Carrera/Challenge/Trophy| Traseiro (TD ou TE)    | 31/71-18 P2L    | Wet 991 e 992 Traseiro
 */
function determineModel(
  categoria: string,
  lado: string,
  tipo: string,
  models: TireModel[]
): TireModel | null {
  const categoriaUpper = categoria?.toUpperCase().trim() || '';
  const ladoUpper = lado?.toUpperCase().trim() || '';
  const tipoLower = tipo?.toLowerCase().trim() || '';

  // Determina se é Slick ou Wet
  const isWet = tipoLower.includes('wet') || tipoLower.includes('chuva');
  const tireType = isWet ? 'Wet' : 'Slick';

  // Determina categoria: Trophy/Challenge são tratados como 991, Carrera como 992
  const isTrophyOrChallenge = categoriaUpper.includes('TROPHY') || categoriaUpper.includes('CHALLENGE');
  const isCarrera = categoriaUpper.includes('CARRERA');

  // Determina se é dianteiro ou traseiro baseado nos códigos DD, DE, TD, TE
  const isDianteiro = ladoUpper === 'DD' || ladoUpper === 'DE' || 
                      ladoUpper.includes('DIANT') || 
                      ladoUpper.includes('FRONT');
  const isTraseiro = ladoUpper === 'TD' || ladoUpper === 'TE' || 
                     ladoUpper.includes('TRAS') || 
                     ladoUpper.includes('REAR');

  // Lógica de mapeamento
  let modelName = '';

  if (tireType === 'Slick') {
    if (isTrophyOrChallenge && isDianteiro) {
      modelName = 'Slick 991 Dianteiro'; // 27/65-18 N2
    } else if (isTrophyOrChallenge && isTraseiro) {
      modelName = 'Slick 991 Traseiro'; // 31/71-18 N2
    } else if (isCarrera && isDianteiro) {
      modelName = 'Slick 992 Dianteiro'; // 30/65-18 N3
    } else if (isCarrera && isTraseiro) {
      modelName = 'Slick 992 Traseiro'; // 31/71-18 N3R
    }
  } else if (tireType === 'Wet') {
    if (isTrophyOrChallenge && isDianteiro) {
      modelName = 'Wet 991 Dianteiro'; // 27/65-18 P2L
    } else if (isCarrera && isDianteiro) {
      modelName = 'Wet 992 Dianteiro'; // 30/65-18 P2L
    } else if (isTraseiro) {
      // Wet traseiro é compartilhado entre todas as categorias
      modelName = 'Wet 991 e 992 Traseiro'; // 31/71-18 P2L
    }
  }

  if (!modelName) {
    console.warn(`⚠️ Não foi possível determinar modelo: categoria=${categoria}, lado=${lado}, tipo=${tipo}`);
    return null;
  }

  // Busca o modelo na lista disponível pelo nome exato
  const model = models.find(m => 
    m.name.trim() === modelName && 
    m.type === tireType
  );

  if (!model) {
    console.warn(`⚠️ Modelo não encontrado na base de dados: "${modelName}" (${tireType})`);
    console.warn(`   Modelos disponíveis do tipo ${tireType}:`, models.filter(m => m.type === tireType).map(m => m.name));
  }

  return model || null;
}

export function ARCSDataUpdate() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState<ProcessProgress | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    // Valida tipo de arquivo
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx')) {
      toast.error('Arquivo inválido', {
        description: 'Por favor, selecione um arquivo Excel (.xlsx)',
      });
      return;
    }

    setFile(selectedFile);
    setResult(null);
    toast.success('Arquivo carregado', {
      description: selectedFile.name,
    });
  };

  const normalizeBarcode = (serial: string): string => {
    // Remove espaços e converte para string
    const cleaned = String(serial || '').trim();
    
    if (!cleaned) return '';
    
    // Se já tem 8 dígitos, retorna como está
    if (cleaned.length === 8) return cleaned;
    
    // Se tem menos de 8 dígitos, adiciona zeros à esquerda
    if (cleaned.length < 8) {
      return cleaned.padStart(8, '0');
    }
    
    // Se tem mais de 8 dígitos, pega os últimos 8
    return cleaned.slice(-8);
  };

  const processExcel = async () => {
    if (!file) {
      toast.error('Nenhum arquivo selecionado');
      return;
    }

    setProcessing(true);
    setProgress(null);
    setResult(null);
    
    try {
      // Lê o arquivo
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Pega a primeira planilha
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Valida se tem dados
      if (jsonData.length < 2) {
        toast.error('Planilha vazia', {
          description: 'A planilha não contém dados para processar.',
        });
        setProcessing(false);
        return;
      }

      // Processa os dados
      const records: ARCSRecord[] = [];
      
      // Assume que a primeira linha é o cabeçalho
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Ignora linhas vazias
        if (!row || row.length === 0) continue;
        
        const record: ARCSRecord = {
          piloto: row[0] || '',
          numero: row[1] || '',
          categoria: row[2] || '',
          ano: row[3] || '',
          etapa: row[4] || '',
          pista: row[5] || '',
          campeonato: row[6] || '',
          tipo: row[7] || '',
          set: row[8] || '',
          lado: row[9] || '',
          serial: row[10] || '', // Coluna K (índice 10)
          condicao: row[11] || '', // Coluna L (índice 11)
          local: row[12] || '',
          tv: row[13] || '',
          dataHora: row[14] || '',
        };
        
        // Só adiciona se tiver serial e condição
        if (record.serial && record.condicao) {
          records.push(record);
        }
      }

      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📊 INICIANDO PROCESSAMENTO DA PLANILHA ARCS');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`📋 Total de registros: ${records.length}`);
      
      // Agrupa por condição para mostrar resumo
      const condicaoCount = records.reduce((acc, r) => {
        const cond = r.condicao.toUpperCase();
        acc[cond] = (acc[cond] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('📊 Distribuição por condição:');
      Object.entries(condicaoCount).forEach(([cond, count]) => {
        console.log(`   - ${cond}: ${count} pneus`);
      });
      console.log('');
      console.log('📦 Contêiner padrão para novos cadastros: "Sem Contêiner"');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');

      // Inicializa progresso
      setProgress({
        current: 0,
        total: records.length,
        currentBarcode: '',
        currentAction: 'Carregando dados...',
        updated: 0,
        created: 0,
        errors: 0,
      });

      // Carrega dados necessários
      const stockEntries = await getStockEntries(true); // true = inclui descartados
      const tireModels = await getTireModels();
      const containers = await getContainers();
      
      console.log(`✅ Dados carregados: ${stockEntries.length} pneus, ${tireModels.length} modelos, ${containers.length} contêineres`);
      
      const result: ProcessResult = {
        total: records.length,
        updated: 0,
        created: 0,
        notFound: 0,
        errors: [],
      };

      // Processa cada registro
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        // Pequena pausa para permitir visualização do progresso (remove em produção se necessário)
        if (i > 0 && i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        try {
          const normalizedSerial = normalizeBarcode(record.serial);
          
          // Atualiza progresso
          setProgress({
            current: i + 1,
            total: records.length,
            currentBarcode: normalizedSerial || record.serial,
            currentAction: 'Verificando...',
            updated: result.updated,
            created: result.created,
            errors: result.notFound,
          });
          
          if (!normalizedSerial) {
            result.errors.push(`Serial inválido: "${record.serial}"`);
            result.notFound++;
            continue;
          }

          console.log(`🔍 Processando: ${record.serial} → ${normalizedSerial} (Condição: "${record.condicao}")`);
          console.log(`   Categoria: ${record.categoria}, Lado: ${record.lado}, Tipo: ${record.tipo}`);

          // Busca o pneu no estoque pelo barcode
          let entry = stockEntries.find(e => e.barcode === normalizedSerial);
          
          // Se não encontrou, tenta cadastrar automaticamente
          if (!entry) {
            console.log(`🆕 Pneu ${normalizedSerial} não encontrado. Tentando cadastro automático...`);
            
            // Atualiza progresso
            setProgress(prev => prev ? { ...prev, currentAction: 'Cadastrando novo pneu...' } : null);
            
            // Determina o modelo baseado em categoria e lado
            const model = determineModel(record.categoria, record.lado, record.tipo, tireModels);
            
            if (!model) {
              result.notFound++;
              result.errors.push(`Pneu ${normalizedSerial}: Não foi possível determinar o modelo (categoria: ${record.categoria}, lado: ${record.lado}, tipo: ${record.tipo})`);
              console.error(`❌ Não foi possível determinar modelo para ${normalizedSerial}`);
              continue;
            }
            
            // Cria nova entrada no estoque SEM CONTÊINER (padrão)
            // IMPORTANTE: Igual ao DataImport.tsx - todos os pneus novos começam sem contêiner
            try {
              const newEntry: Partial<StockEntry> = {
                barcode: normalizedSerial,
                model_id: model.id,
                model_name: model.name,
                model_type: model.type,
                container_id: null, // Sem contêiner físico
                container_name: 'Sem Contêiner', // Padrão do sistema
                pilot: record.piloto || null,
                status: 'Novo', // Status inicial, será atualizado logo em seguida
              };
              
              await saveStockEntry(newEntry as any);
              result.created++;
              console.log(`✅ Pneu ${normalizedSerial} cadastrado automaticamente: ${model.name} em "Sem Contêiner"`);
              
              // Atualiza progresso
              setProgress(prev => prev ? { ...prev, created: result.created } : null);
              
              // CRÍTICO: Recarrega o registro do banco para obter o ID correto
              // Aguarda um pequeno delay para garantir que o banco processou
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Recarrega todos os stock_entries para obter o registro recém-criado
              const refreshedEntries = await getStockEntries(true);
              const createdEntry = refreshedEntries.find(e => e.barcode === normalizedSerial);
              
              if (createdEntry) {
                entry = createdEntry;
                // Atualiza lista local
                stockEntries.push(createdEntry);
                console.log(`✅ Registro ${normalizedSerial} recarregado do banco com ID: ${createdEntry.id}`);
              } else {
                console.warn(`⚠️ Não foi possível recarregar ${normalizedSerial} do banco`);
                // Fallback: usa dados locais temporários
                entry = {
                  id: normalizedSerial,
                  barcode: normalizedSerial,
                  model_id: model.id,
                  model_name: model.name,
                  model_type: model.type,
                  container_id: defaultContainer.id,
                  container_name: defaultContainer.name,
                  status: 'Novo',
                  created_at: new Date().toISOString(),
                } as StockEntry;
                stockEntries.push(entry);
              }
              
            } catch (createError: any) {
              result.notFound++;
              result.errors.push(`Erro ao cadastrar ${normalizedSerial}: ${createError.message}`);
              console.error(`❌ Erro ao cadastrar ${normalizedSerial}:`, createError);
              continue;
            }
          }

          // Determina o novo status baseado na condição
          let newStatus: StockEntry['status'];
          const condicaoLower = record.condicao.toLowerCase().trim();
          
          // Aceita tanto infinitivo (GUARDAR/DESCARTAR) quanto particípio (GUARDADO/DESCARTADO)
          if (condicaoLower === 'guardado' || condicaoLower === 'guardar') {
            newStatus = 'Piloto' as any;
            console.log(`✅ Condição "${record.condicao}" mapeada para status "Piloto"`);
          } else if (condicaoLower === 'descartado' || condicaoLower === 'descartar') {
            newStatus = 'Descarte Piloto';
            console.log(`✅ Condição "${record.condicao}" mapeada para status "Descarte Piloto"`);
          } else {
            // Ignora outras condições não reconhecidas
            console.log(`⏭️ Ignorando condição desconhecida "${record.condicao}" para ${normalizedSerial}`);
            result.notFound++;
            result.errors.push(`Pneu ${normalizedSerial}: Condição desconhecida "${record.condicao}" (esperado: GUARDAR ou DESCARTAR)`);
            continue;
          }

          console.log(`📝 Atualizando ${normalizedSerial}: ${entry.status || 'Novo'} → ${newStatus}`);
          
          // Atualiza progresso
          setProgress(prev => prev ? { ...prev, currentAction: `Atualizando status → ${newStatus}` } : null);

          // Prepara objeto com todos os campos a atualizar
          const updates: Partial<StockEntry> = {
            status: newStatus,
            pilot: record.piloto || null,
            numero: record.numero || null,
            categoria: record.categoria || null,
            ano: record.ano || null,
            etapa: record.etapa || null,
            pista: record.pista || null,
            campeonato: record.campeonato || null,
            set_pneu: record.set || null,
            lado: record.lado || null,
            local: record.local || null,
            tempo_vida: record.tv || null,
            data_hora: record.dataHora || null,
          };

          // Remove campos undefined/null vazios para não sobrescrever com null desnecessário
          Object.keys(updates).forEach(key => {
            const value = updates[key as keyof typeof updates];
            if (value === '' || value === null || value === undefined) {
              delete updates[key as keyof typeof updates];
            }
          });

          // Atualiza todos os campos no Supabase usando o barcode
          try {
            console.log(`🔄 Iniciando atualização de ${normalizedSerial}. Campos:`, Object.keys(updates));
            
            await updateStockEntryByBarcode(normalizedSerial, updates);
            result.updated++;
            
            const fieldsLog = Object.keys(updates).filter(k => k !== 'status').join(', ');
            console.log(`✅ Atualizado ${normalizedSerial} → Status: ${newStatus}${fieldsLog ? `, Campos: ${fieldsLog}` : ''}`);
            
            // Atualiza progresso
            setProgress(prev => prev ? { ...prev, updated: result.updated } : null);
            
            // Dispara evento para atualizar cache e outras telas
            window.dispatchEvent(new Event('stock-entries-updated'));
          } catch (updateError: any) {
            const errorDetail = updateError?.message || 'Erro desconhecido';
            result.errors.push(`Erro ao atualizar ${normalizedSerial}: ${errorDetail}`);
            console.error(`❌ Falha ao atualizar ${normalizedSerial}:`, updateError);
            console.error(`   Dados tentados:`, updates);
            result.notFound++;
            
            // Atualiza progresso
            setProgress(prev => prev ? { ...prev, errors: result.notFound } : null);
          }
          
        } catch (error: any) {
          const errorMsg = `Erro ao processar ${record.serial}: ${error.message || error}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`, error);
        }
      }

      // Mensagens de feedback
      const totalProcessed = result.updated + result.created;
      
      // Logs detalhados do resultado
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📊 RESULTADO DO PROCESSAMENTO ARCS:');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`✅ Atualizados: ${result.updated}`);
      console.log(`🆕 Cadastrados: ${result.created}`);
      console.log(`⏭️  Ignorados: ${result.notFound}`);
      console.log(`📋 Total processado: ${totalProcessed} de ${result.total}`);
      if (result.errors.length > 0) {
        console.log(`❌ Erros: ${result.errors.length}`);
        console.log('   Detalhes:', result.errors);
      }
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      
      if (totalProcessed > 0) {
        const parts = [];
        if (result.updated > 0) parts.push(`${result.updated} atualizados`);
        if (result.created > 0) parts.push(`${result.created} cadastrados`);
        
        toast.success('Processamento concluído!', {
          description: parts.join(', ') + '.',
          duration: 5000,
        });
        
        // IMPORTANTE: Aguarda um momento para garantir que todas as atualizações foram commitadas
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Dispara evento para atualizar Dashboard e outras telas
        console.log('📢 Disparando evento global: stock-entries-updated');
        window.dispatchEvent(new Event('stock-entries-updated'));
        
        // Aguarda mais um momento para garantir que o evento foi processado
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('✅ Evento disparado. Outras telas devem recarregar automaticamente.');
      } else {
        toast.warning('Nenhum pneu foi processado', {
          description: 'Verifique se os códigos de barras e condições estão corretos.',
        });
      }

      setResult(result);
      setProgress(null);
      
    } catch (error) {
      console.error('Erro ao processar planilha:', error);
      toast.error('Erro ao processar planilha', {
        description: error.message || 'Verifique o formato do arquivo.',
      });
      setProgress(null);
    } finally {
      setProcessing(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <div className="px-4 py-6 md:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="gradient-text-porsche">
          Atualizar Base de Dados ARCS
        </h1>
        <p className="text-gray-600">
          Importe dados do ARCS para atualizar status dos pneus
        </p>
      </div>

      {/* Instruções */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-3">
            <p className="font-medium">Formato da planilha ARCS esperado:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-medium mb-1">Colunas principais:</p>
                <ul className="space-y-0.5 ml-4 list-disc">
                  <li>Coluna A: Piloto</li>
                  <li>Coluna B: Nº</li>
                  <li>Coluna C: Categoria</li>
                  <li>Coluna D: Ano</li>
                  <li>Coluna E: Etapa</li>
                  <li>Coluna F: Pista</li>
                  <li>Coluna G: Campeonato</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">Colunas de controle:</p>
                <ul className="space-y-0.5 ml-4 list-disc">
                  <li>Coluna I: Set (conjunto do pneu)</li>
                  <li>Coluna J: Lado</li>
                  <li><strong>Coluna K: Serial (código de barras)</strong></li>
                  <li><strong>Coluna L: Condição (guardado/descartado)</strong></li>
                  <li>Coluna M: Local</li>
                  <li>Coluna N: T.V (Tempo de Vida)</li>
                  <li>Coluna O: Data e hora</li>
                </ul>
              </div>
            </div>
            <p className="text-sm mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <strong>Ações:</strong> Condição "guardado" → Status "Piloto" | Condição "descartado" → Status "Descarte Piloto"
              <br />
              <strong>Importante:</strong> Todos os campos da planilha serão atualizados no banco de dados para cada código de barras encontrado.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Upload Area */}
      <Card className="p-8">
        <div
          className={`
            border-2 border-dashed rounded-xl p-12
            transition-all duration-200
            ${dragActive 
              ? 'border-[#D50000] bg-red-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${file ? 'bg-green-50 border-green-400' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            {file ? (
              <>
                <FileSpreadsheet className="w-16 h-16 text-green-600" />
                <div className="text-center">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={processExcel}
                    disabled={processing}
                    className="bg-gradient-to-r from-[#D50000] to-[#A80000]"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Processar Planilha
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={clearFile}
                    variant="outline"
                    disabled={processing}
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Upload className="w-16 h-16 text-gray-400" />
                <div className="text-center">
                  <p className="font-medium text-gray-900 mb-1">
                    Arraste o arquivo Excel aqui
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    ou clique para selecionar
                  </p>
                  <label htmlFor="file-upload">
                    <Button variant="outline" asChild>
                      <span>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Selecionar Arquivo
                      </span>
                    </Button>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleFileInput}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Formatos aceitos: .xlsx
                </p>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Indicador de Progresso */}
      {progress && (
        <Card className="p-6 border-2 border-[#D50000] bg-gradient-to-br from-red-50 to-white">
          <div className="space-y-4">
            {/* Header do Progresso */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#D50000] rounded-full flex items-center justify-center animate-pulse">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Processando Planilha ARCS
                  </h3>
                  <p className="text-sm text-gray-600">
                    Aguarde enquanto atualizamos o banco de dados...
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#D50000]">
                  {Math.round((progress.current / progress.total) * 100)}%
                </p>
                <p className="text-xs text-gray-600">
                  {progress.current} de {progress.total}
                </p>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="space-y-2">
              <Progress 
                value={(progress.current / progress.total) * 100} 
                className="h-3 bg-gray-200"
              />
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-600 font-medium">
                    {progress.currentBarcode}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">
                    {progress.currentAction}
                  </span>
                </div>
              </div>
            </div>

            {/* Estatísticas em Tempo Real */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600 mb-0.5">Atualizados</p>
                <p className="text-lg font-bold text-green-600">{progress.updated}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600 mb-0.5">Cadastrados</p>
                <p className="text-lg font-bold text-purple-600">{progress.created}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600 mb-0.5">Erros</p>
                <p className="text-lg font-bold text-orange-600">{progress.errors}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Resultado */}
      {result && (
        <Card className="p-6">
          <h3 className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Resultado do Processamento
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-blue-600">{result.total}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Atualizados</p>
              <p className="text-2xl font-bold text-green-600">{result.updated}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Cadastrados</p>
              <p className="text-2xl font-bold text-purple-600">{result.created}</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Erros</p>
              <p className="text-2xl font-bold text-orange-600">{result.notFound}</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-orange-600">
                <XCircle className="w-4 h-4" />
                <h4 className="font-medium">Avisos e Erros</h4>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                {result.errors.map((error, index) => (
                  <p key={index} className="text-sm text-orange-700 mb-1">
                    • {error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Informações Adicionais */}
      <Card className="p-6 bg-gray-50">
        <h3 className="font-medium mb-3">ℹ️ Informações Importantes</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>✓ Códigos de barras são normalizados para 8 dígitos (zero à esquerda se necessário)</li>
          <li>✓ Apenas pneus com condição "guardado" ou "descartado" são processados</li>
          <li>✓ <strong>Pneus não encontrados são cadastrados automaticamente</strong> usando categoria e lado da planilha</li>
          <li>✓ O modelo do pneu é determinado automaticamente cruzando categoria (991/992) e lado (dianteiro/traseiro)</li>
          <li>✓ Pneus novos são alocados no primeiro contêiner disponível</li>
          <li>✓ As alterações são salvas automaticamente no banco de dados Supabase</li>
        </ul>
      </Card>
    </div>
  );
}
