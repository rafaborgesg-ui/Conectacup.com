import { AlertCircle, Copy, ExternalLink, Check, Rocket, FileCode, CheckCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { copyToClipboard } from '../utils/clipboard';

interface GasProgrammingMigrationAlertProps {
  errorCode?: string;
  errorMessage?: string;
}

export function GasProgrammingMigrationAlert({ errorCode, errorMessage }: GasProgrammingMigrationAlertProps) {
  // Se não houver erro específico de tabela não encontrada, não exibe nada
  if (!errorCode && !errorMessage) {
    return null;
  }

  // Verifica se é erro de tabela não encontrada
  const isTableNotFound = 
    errorCode === 'PGRST116' || 
    errorCode === '42P01' ||
    errorMessage?.includes('gas_programming') ||
    errorMessage?.includes('relation') ||
    errorMessage?.includes('does not exist');

  if (!isTableNotFound) {
    return null;
  }

  const migrationSQL = `-- ============================================
-- MIGRATION: Programação de Gases
-- Data: 2025-11-27
-- ============================================

CREATE TABLE IF NOT EXISTS public.gas_programming (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pista TEXT NOT NULL,
  etapa TEXT NOT NULL,
  temporada TEXT NOT NULL,
  categoria TEXT NOT NULL,
  gas_type TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  fornecedor TEXT,
  data_programada DATE,
  status TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado', 'solicitado', 'confirmado', 'entregue', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_gas_programming_pista ON public.gas_programming(pista);
CREATE INDEX IF NOT EXISTS idx_gas_programming_etapa ON public.gas_programming(etapa);
CREATE INDEX IF NOT EXISTS idx_gas_programming_temporada ON public.gas_programming(temporada);
CREATE INDEX IF NOT EXISTS idx_gas_programming_status ON public.gas_programming(status);

ALTER TABLE public.gas_programming ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para usuários autenticados"
ON public.gas_programming FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserção para usuários autenticados"
ON public.gas_programming FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualização para usuários autenticados"
ON public.gas_programming FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir deleção para usuários autenticados"
ON public.gas_programming FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION update_gas_programming_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_gas_programming_updated_at ON public.gas_programming;
CREATE TRIGGER set_gas_programming_updated_at
  BEFORE UPDATE ON public.gas_programming
  FOR EACH ROW EXECUTE FUNCTION update_gas_programming_updated_at();`;

  const handleCopyToClipboard = async () => {
    try {
      await copyToClipboard(migrationSQL);
      toast.success('SQL copiado! Cole no SQL Editor do Supabase');
    } catch (error) {
      toast.error('Erro ao copiar', {
        description: 'Tente selecionar e copiar manualmente'
      });
    }
  };

  return (
    <Card className="p-6 mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-orange-300">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <AlertCircle className="text-orange-600" size={24} />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-orange-900">🔧 Configuração Necessária</h3>
            <Badge className="bg-orange-600 text-white">Setup Requerido</Badge>
          </div>
          
          <p className="text-sm text-orange-800 mb-4">
            A tabela <code className="bg-orange-100 px-2 py-0.5 rounded text-orange-900">gas_programming</code> não foi encontrada. 
            Execute a migration SQL para habilitar o módulo de Programação de Gases.
          </p>

          <div className="bg-white rounded-lg p-4 mb-4 border border-orange-200">
            <h4 className="text-sm text-orange-900 mb-3 flex items-center gap-2">
              <Rocket size={16} />
              Passos para Ativar:
            </h4>
            
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">1</Badge>
                <div>
                  <strong>Copie o SQL da Migration</strong>
                  <p className="text-xs text-gray-600 mt-1">
                    Clique no botão "Copiar SQL" abaixo
                  </p>
                </div>
              </li>
              
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">2</Badge>
                <div>
                  <strong>Acesse o Supabase Dashboard</strong>
                  <p className="text-xs text-gray-600 mt-1">
                    Vá em: <code className="bg-gray-100 px-1 py-0.5 rounded">SQL Editor</code> → <code className="bg-gray-100 px-1 py-0.5 rounded">New Query</code>
                  </p>
                </div>
              </li>
              
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">3</Badge>
                <div>
                  <strong>Cole e Execute</strong>
                  <p className="text-xs text-gray-600 mt-1">
                    Cole o SQL copiado e clique em <code className="bg-gray-100 px-1 py-0.5 rounded">Run</code>
                  </p>
                </div>
              </li>
              
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">4</Badge>
                <div>
                  <strong>Recarregue a página</strong>
                  <p className="text-xs text-gray-600 mt-1">
                    Pressione <code className="bg-gray-100 px-1 py-0.5 rounded">F5</code> para atualizar
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleCopyToClipboard}
            >
              <Copy size={14} className="mr-2" />
              Copiar SQL
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className="border-orange-300"
              onClick={() => window.open('https://app.supabase.com', '_blank')}
            >
              <ExternalLink size={14} className="mr-2" />
              Abrir Supabase
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className="border-orange-300"
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/supabase/migrations/gas_programming.sql';
                link.download = 'gas_programming.sql';
                link.click();
              }}
            >
              <FileCode size={14} className="mr-2" />
              Baixar SQL
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t border-orange-200">
            <h4 className="text-xs text-orange-900 mb-2 flex items-center gap-1">
              <CheckCircle size={12} />
              O que você vai ter após o setup:
            </h4>
            <ul className="text-xs text-gray-700 space-y-1 ml-4">
              <li>✅ Programação de gases por Pista, Etapa e Temporada</li>
              <li>✅ Base completa de fornecedores com contatos</li>
              <li>✅ Relatórios históricos e estatísticas</li>
              <li>✅ Timeline de entregas programadas</li>
              <li>✅ 12 tipos de gases cadastrados (N₂, O₂, Argônio, etc)</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}