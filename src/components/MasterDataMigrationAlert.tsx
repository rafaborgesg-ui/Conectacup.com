import { useState, useEffect } from 'react';
import { AlertCircle, Database, ExternalLink, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface MasterDataMigrationAlertProps {
  errorCode?: string;
  errorMessage?: string;
}

export function MasterDataMigrationAlert({ errorCode, errorMessage }: MasterDataMigrationAlertProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Mostra alerta se for erro de tabela não encontrada
    if (errorCode === 'PGRST205' || errorMessage?.includes('master_data')) {
      setIsVisible(true);
    }
  }, [errorCode, errorMessage]);

  const handleCopySQL = async () => {
    try {
      // Instrução simples para copiar
      const instruction = `-- Execute esta migration no SQL Editor do Supabase
-- Link: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql

-- 1. Abra o arquivo MIGRATION_MASTER_DATA.sql no projeto
-- 2. Copie TODO o conteúdo
-- 3. Cole no SQL Editor
-- 4. Clique em "Run"`;
      
      await navigator.clipboard.writeText(instruction);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in slide-in-from-top duration-300">
      <Alert className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 shadow-2xl">
        <Database className="h-6 w-6 text-yellow-700 animate-pulse" />
        <AlertTitle className="text-yellow-900 flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <strong>Migration Necessária: Master Data</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-7 w-7 p-0 hover:bg-yellow-200/50"
          >
            ×
          </Button>
        </AlertTitle>
        <AlertDescription className="text-yellow-800 space-y-3">
          <p className="text-sm">
            A tabela <code className="bg-yellow-100 px-2 py-1 rounded">master_data</code> não foi encontrada no banco de dados.
          </p>
          
          <div className="bg-white border border-yellow-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-yellow-900">
              📋 Passo a Passo Rápido:
            </p>
            
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li>
                Abra o arquivo <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">MIGRATION_MASTER_DATA.sql</code> no projeto
              </li>
              <li>
                Copie <strong>TODO</strong> o conteúdo do arquivo
              </li>
              <li>
                Acesse o SQL Editor do Supabase:
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 ml-1 text-blue-600"
                  onClick={() => window.open('https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql', '_blank')}
                >
                  Abrir SQL Editor <ExternalLink className="h-3 w-3 ml-1 inline" />
                </Button>
              </li>
              <li>
                Cole o código no editor e clique em <Badge variant="default" className="bg-green-600">Run</Badge>
              </li>
              <li>
                Aguarde a confirmação de sucesso (36 itens criados)
              </li>
              <li>
                Recarregue esta página
              </li>
            </ol>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => window.open('https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql', '_blank')}
            >
              <Database className="h-4 w-4 mr-2" />
              Abrir SQL Editor
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open('/QUICK_START_MASTER_DATA.md', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Quick Start
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCopySQL}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Instruções
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-yellow-700 mt-2">
            💡 <strong>Dica:</strong> Após executar a migration, você terá 36 itens pré-cadastrados em 9 categorias.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
