import { AlertCircle, Database, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';

export function PistaMigrationAlert() {
  const handleOpenSupabase = () => {
    window.open('https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql', '_blank');
  };

  return (
    <Card className="p-6 border-orange-200 bg-orange-50">
      <Alert className="border-orange-300">
        <AlertCircle className="h-5 w-5 text-orange-600" />
        <AlertTitle className="text-orange-900">
          <Database className="inline-block mr-2" size={18} />
          Configuração Necessária no Banco de Dados
        </AlertTitle>
        <AlertDescription className="space-y-4 mt-4">
          <p className="text-orange-800">
            Os campos <strong>Endereço Completo</strong> e <strong>Coordenadas</strong> da seção Pista 
            precisam de colunas no banco de dados do Supabase.
          </p>
          
          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <h4 className="text-sm text-gray-900 mb-3">
              📋 Passo a Passo Rápido:
            </h4>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>
                Clique no botão abaixo para abrir o SQL Editor do Supabase
              </li>
              <li>
                Abra o arquivo: <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  /docs/migrations/sql/ADD_PISTA_FIELDS_TO_MASTER_DATA.sql
                </code>
              </li>
              <li>
                Copie todo o conteúdo do arquivo SQL
              </li>
              <li>
                Cole no SQL Editor do Supabase e clique em <strong>RUN</strong>
              </li>
              <li>
                Aguarde a mensagem: <span className="text-green-600">✅ MIGRATION EXECUTADA COM SUCESSO!</span>
              </li>
            </ol>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleOpenSupabase}
              className="bg-orange-600 hover:bg-orange-700"
              size="sm"
            >
              <ExternalLink size={16} className="mr-2" />
              Abrir SQL Editor
            </Button>
          </div>

          <p className="text-xs text-orange-700">
            ⚠️ <strong>Importante:</strong> Após executar a migration, os campos começarão a salvar corretamente.
            Você pode remover este alerta editando o arquivo <code>/components/MasterData.tsx</code>.
          </p>
        </AlertDescription>
      </Alert>
    </Card>
  );
}
