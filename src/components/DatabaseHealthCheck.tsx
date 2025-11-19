import { useState } from 'react';
import { CheckCircle2, AlertCircle, Database, RefreshCw, Shield, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface HealthCheckResult {
  totalRecords: number;
  validBarcodes: number;
  invalidBarcodes: number;
  corruptedRecords: any[];
  isHealthy: boolean;
}

export function DatabaseHealthCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [result, setResult] = useState<HealthCheckResult | null>(null);

  const clearCompleteCache = async () => {
    setIsClearingCache(true);
    
    try {
      // 1. Limpa localStorage
      const keysToPreserve = ['porsche-cup-user', 'sb-access-token', 'sb-refresh-token'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToPreserve.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      console.log('✅ localStorage limpo (preservando autenticação)');
      
      // 2. Limpa sessionStorage
      sessionStorage.clear();
      console.log('✅ sessionStorage limpo');
      
      // 3. Desregistra service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('✅ Service worker desregistrado');
        }
      }
      
      // 4. Limpa cache do service worker
      if ('caches' in window) {
        const names = await caches.keys();
        for (const name of names) {
          await caches.delete(name);
          console.log(`✅ Cache deletado: ${name}`);
        }
      }
      
      toast.success('Cache limpo com sucesso!', {
        description: 'A página será recarregada automaticamente...',
        duration: 2000
      });
      
      // 5. Recarrega a página após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Erro ao limpar cache:', error);
      toast.error('Erro ao limpar cache', {
        description: error.message
      });
      setIsClearingCache(false);
    }
  };

  const runHealthCheck = async () => {
    setIsChecking(true);
    const supabase = createClient();

    try {
      // 1. Buscar todos os registros
      const { data: allEntries, error: fetchError } = await supabase
        .from('stock_entries')
        .select('id, barcode, model_name, container_name, created_at')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // 2. Validar barcodes
      const validBarcodePattern = /^\d{8}$/;
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      const validBarcodes = allEntries?.filter(entry => validBarcodePattern.test(entry.barcode)) || [];
      const invalidBarcodes = allEntries?.filter(entry => !validBarcodePattern.test(entry.barcode)) || [];
      const corruptedRecords = invalidBarcodes.map(entry => ({
        ...entry,
        issue: uuidPattern.test(entry.barcode) 
          ? 'UUID detectado' 
          : entry.barcode.length !== 8 
          ? `Tamanho incorreto (${entry.barcode.length})` 
          : 'Formato inválido'
      }));

      const healthResult: HealthCheckResult = {
        totalRecords: allEntries?.length || 0,
        validBarcodes: validBarcodes.length,
        invalidBarcodes: invalidBarcodes.length,
        corruptedRecords,
        isHealthy: invalidBarcodes.length === 0
      };

      setResult(healthResult);

      if (healthResult.isHealthy) {
        toast.success('✅ Banco de dados 100% saudável!', {
          description: `${healthResult.totalRecords} registros válidos encontrados.`
        });
      } else {
        toast.error('❌ Registros corrompidos encontrados!', {
          description: `${healthResult.invalidBarcodes} registros com problemas detectados.`
        });
      }

    } catch (error: any) {
      console.error('❌ Erro ao verificar saúde do banco:', error);
      toast.error('Erro ao verificar banco de dados', {
        description: error.message
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Verificação de Integridade</h3>
              <p className="text-sm text-gray-500">Validação completa do banco de dados</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={clearCompleteCache}
              disabled={isClearingCache || isChecking}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              {isClearingCache ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Limpando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Cache
                </>
              )}
            </Button>
            
            <Button
              onClick={runHealthCheck}
              disabled={isChecking || isClearingCache}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Verificar Agora
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Aviso sobre UUID específico */}
        
      </div>

      {result && (
        <div className="space-y-4">
          {/* Status Geral */}
          <div className={`p-4 rounded-lg ${result.isHealthy ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.isHealthy ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-900">Banco de Dados Saudável</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">Problemas Detectados</span>
                </>
              )}
            </div>
            
            <Progress 
              value={(result.validBarcodes / result.totalRecords) * 100} 
              className="h-2 mb-2"
            />
            
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <p className="text-xs text-gray-600">Total de Registros</p>
                <p className="text-xl font-bold text-gray-900">{result.totalRecords}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Barcodes Válidos</p>
                <p className="text-xl font-bold text-green-600">{result.validBarcodes}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Barcodes Inválidos</p>
                <p className="text-xl font-bold text-red-600">{result.invalidBarcodes}</p>
              </div>
            </div>
          </div>

          {/* Detalhes dos Registros Corrompidos */}
          {result.corruptedRecords.length > 0 && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Registros Corrompidos ({result.corruptedRecords.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.corruptedRecords.map((record, index) => (
                  <div key={index} className="bg-white p-3 rounded border border-red-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-gray-900 truncate">
                          {record.barcode}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {record.model_name} | {record.container_name}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs shrink-0">
                        {record.issue}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Ação Necessária:</strong> Execute o script SQL <code className="px-1 py-0.5 bg-yellow-100 rounded">FIX_CORRUPTED_BARCODES.sql</code> no Supabase Dashboard para limpar estes registros.
                </p>
              </div>
            </div>
          )}

          {/* Mensagem de Sucesso */}
          {result.isHealthy && (
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">
                    ✅ Todos os registros estão corretos!
                  </h4>
                  <p className="text-sm text-green-700">
                    Nenhum barcode corrompido foi encontrado. O sistema está funcionando perfeitamente e todas as validações de integridade estão ativas.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-white text-green-700 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Formato de 8 dígitos
                    </Badge>
                    <Badge variant="outline" className="bg-white text-green-700 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Apenas numéricos
                    </Badge>
                    <Badge variant="outline" className="bg-white text-green-700 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Sem UUIDs
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !isChecking && (
        <div className="text-center py-8 text-gray-500">
          <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Clique em "Verificar Agora" para iniciar a validação</p>
        </div>
      )}
    </Card>
  );
}
