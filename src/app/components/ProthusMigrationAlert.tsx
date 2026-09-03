import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';

export function ProtheusMigrationAlert() {
  return (
    <Alert className="mb-6 border-amber-500 bg-amber-50">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900">⚠️ Configuração Necessária: Protheus</AlertTitle>
      <AlertDescription className="text-amber-800">
        <div className="space-y-2 mt-2">
          <p className="text-sm">
            Para que os campos <strong>Descrição</strong> e <strong>Responsável</strong> sejam salvos, 
            você precisa executar <strong>2 configurações</strong> no Supabase:
          </p>
          
          <div className="bg-red-50 border border-red-300 rounded p-2 text-xs mb-2">
            <p className="font-semibold text-red-900">🔴 IMPORTANTE:</p>
            <p className="text-red-800">Execute na ordem: 1️⃣ Migration SQL → 2️⃣ Deploy Backend</p>
          </div>
          <div className="bg-white/50 border border-amber-200 rounded p-3 text-xs space-y-3">
            <div>
              <p className="font-semibold text-amber-900 mb-1">1️⃣ Migration SQL (1 minuto):</p>
              <ol className="list-decimal ml-4 space-y-1 text-gray-700">
                <li>
                  Acesse:{' '}
                  <a 
                    href="https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    SQL Editor
                  </a>
                </li>
                <li>Copie o arquivo: <code className="bg-amber-100 px-1 py-0.5 rounded">ADD_PROTHEUS_FIELDS_TO_MASTER_DATA.sql</code></li>
                <li>Cole e clique em <strong>RUN</strong></li>
              </ol>
            </div>
            
            <div className="border-t border-amber-300 pt-2">
              <p className="font-semibold text-amber-900 mb-1">2️⃣ Deploy Backend (2 minutos):</p>
              <ol className="list-decimal ml-4 space-y-1 text-gray-700">
                <li>
                  Acesse:{' '}
                  <a 
                    href="https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/functions/make-server-02726c7c"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Edge Function
                  </a>
                </li>
                <li>Copie o arquivo: <code className="bg-amber-100 px-1 py-0.5 rounded">/supabase/functions/server/index.tsx</code></li>
                <li>Cole no editor e clique em <strong>Deploy</strong></li>
              </ol>
            </div>
            
            <p className="text-gray-600 italic pt-1">Após concluir, recarregue a página (F5)</p>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button
              onClick={() => window.open('https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql', '_blank')}
              variant="default"
              size="sm"
              className="bg-amber-600 hover:bg-amber-700"
            >
              1️⃣ SQL Editor
            </Button>
            <Button
              onClick={() => window.open('https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/functions/make-server-02726c7c', '_blank')}
              variant="default"
              size="sm"
              className="bg-amber-600 hover:bg-amber-700"
            >
              2️⃣ Edge Function
            </Button>
            <Button
              onClick={() => window.open('/docs/migrations/sql/ADD_PROTHEUS_FIELDS_TO_MASTER_DATA.sql', '_blank')}
              variant="outline"
              size="sm"
              className="border-amber-600 text-amber-700 hover:bg-amber-100"
            >
              📄 Migration SQL
            </Button>
            <Button
              onClick={() => window.open('/DEPLOY_BACKEND_PROTHEUS.md', '_blank')}
              variant="outline"
              size="sm"
              className="border-amber-600 text-amber-700 hover:bg-amber-100"
            >
              📖 Guia Deploy
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
