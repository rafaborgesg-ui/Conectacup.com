import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Activity, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { getAccessToken } from '../utils/supabase/client';

export function ServerHealthCheck() {
  const [status, setStatus] = useState<'checking' | 'healthy' | 'error' | 'unauthorized'>('checking');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkHealth = async () => {
    setIsLoading(true);
    setStatus('checking');
    setMessage('Verificando servidor...');
    
    try {
      // 1. Verifica token
      const token = await getAccessToken();
      
      if (!token) {
        setStatus('unauthorized');
        setMessage('Nenhum token de autenticação encontrado');
        setDetails({ error: 'Faça login novamente' });
        setIsLoading(false);
        return;
      }
      
      // 2. Testa endpoint público (health)
      const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/health`;
      console.log('🔍 Testando:', healthUrl);
      
      const healthResponse = await fetch(healthUrl);
      const healthData = await healthResponse.json();
      
      if (!healthResponse.ok) {
        throw new Error(`Health check falhou: ${healthResponse.status}`);
      }
      
      // 3. Testa endpoint autenticado (tire-models)
      const modelsUrl = `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/tire-models`;
      console.log('🔍 Testando (autenticado):', modelsUrl);
      
      const modelsResponse = await fetch(modelsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const modelsData = await modelsResponse.json();
      
      if (!modelsResponse.ok) {
        if (modelsResponse.status === 401) {
          setStatus('unauthorized');
          setMessage('Token de autenticação inválido ou expirado');
          setDetails({
            error: 'Faça login novamente',
            status: modelsResponse.status,
            response: modelsData,
          });
        } else {
          throw new Error(`Tire models falhou: ${modelsResponse.status}`);
        }
      } else {
        setStatus('healthy');
        setMessage('Servidor funcionando corretamente!');
        setDetails({
          health: healthData,
          models: modelsData,
          token: token.substring(0, 20) + '...',
        });
      }
    } catch (error: any) {
      console.error('❌ Health check error:', error);
      setStatus('error');
      setMessage(`Erro: ${error.message}`);
      setDetails({ error: error.toString() });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Activity className="animate-pulse text-blue-500" size={24} />;
      case 'healthy':
        return <CheckCircle2 className="text-green-500" size={24} />;
      case 'error':
        return <XCircle className="text-red-500" size={24} />;
      case 'unauthorized':
        return <AlertCircle className="text-yellow-500" size={24} />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'checking':
        return <Badge variant="outline" className="bg-blue-50">Verificando...</Badge>;
      case 'healthy':
        return <Badge className="bg-green-500">Saudável</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'unauthorized':
        return <Badge className="bg-yellow-500">Não Autorizado</Badge>;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-semibold">Status do Servidor</h3>
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div className="space-y-3">
        <div className="text-sm">
          <p className="text-gray-600 mb-1">Projeto ID:</p>
          <code className="bg-gray-100 px-2 py-1 rounded text-xs">{projectId}</code>
        </div>

        <div className="text-sm">
          <p className="text-gray-600 mb-1">URL do Servidor:</p>
          <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
            https://{projectId}.supabase.co/functions/v1/make-server-02726c7c
          </code>
        </div>

        {details && (
          <div className="text-sm">
            <p className="text-gray-600 mb-1">Detalhes:</p>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        )}

        <Button 
          onClick={checkHealth} 
          disabled={isLoading}
          className="w-full"
          variant="outline"
        >
          <RefreshCw className={isLoading ? 'animate-spin' : ''} size={16} />
          <span className="ml-2">Verificar Novamente</span>
        </Button>
      </div>
    </Card>
  );
}
