import { useState, useEffect } from 'react';
import { AlertTriangle, X, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { copyToClipboard } from '../utils/clipboard';

interface DatabaseMigrationAlertProps {
  errorCode?: string;
  errorMessage?: string;
}

export function DatabaseMigrationAlert({ errorCode, errorMessage }: DatabaseMigrationAlertProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Mostra alerta se for erro de coluna não existente
    if (errorCode === '42703' && errorMessage?.includes('display_order')) {
      const dismissed = localStorage.getItem('migration-alert-dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    }
  }, [errorCode, errorMessage]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('migration-alert-dismissed', 'true');
  };

  const handleCopySQL = async () => {
    const sql = `-- Adicionar coluna display_order
ALTER TABLE public.tire_status 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_tire_status_order 
ON public.tire_status(display_order);

-- Verificar
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tire_status' 
AND column_name = 'display_order';`;

    try {
      await copyToClipboard(sql);
      toast.success('SQL copiado!', {
        description: 'Cole no Supabase SQL Editor'
      });
    } catch (error) {
      toast.error('Erro ao copiar', {
        description: 'Tente selecionar e copiar manualmente'
      });
    }
  };

  const openSupabaseSQL = () => {
    window.open('https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql', '_blank');
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-fade-in">
      <Alert className="bg-yellow-50 border-yellow-400 shadow-lg">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <AlertTitle className="text-yellow-900 mb-2">
              Migração de Banco de Dados Necessária
            </AlertTitle>
            <AlertDescription className="text-yellow-800 space-y-3">
              <p>
                A tabela <code className="bg-yellow-100 px-1.5 py-0.5 rounded">tire_status</code> precisa 
                da coluna <code className="bg-yellow-100 px-1.5 py-0.5 rounded">display_order</code> para 
                funcionar corretamente.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white hover:bg-yellow-50 border-yellow-400 text-yellow-900"
                  onClick={handleCopySQL}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar SQL
                </Button>
                
                <Button
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  onClick={openSupabaseSQL}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Supabase SQL Editor
                </Button>
              </div>

              <div className="bg-yellow-100 p-3 rounded-md text-sm">
                <p className="font-medium mb-1 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Passos:
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-6">
                  <li>Clique em "Copiar SQL"</li>
                  <li>Abra o Supabase SQL Editor</li>
                  <li>Cole e execute o SQL</li>
                  <li>Recarregue esta página</li>
                </ol>
              </div>

              <p className="text-xs">
                💡 <strong>Nota:</strong> O sistema está funcionando em modo de fallback. 
                A migração é necessária para ativar a ordenação customizada de status.
              </p>
            </AlertDescription>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-yellow-600 hover:text-yellow-800 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </Alert>
    </div>
  );
}