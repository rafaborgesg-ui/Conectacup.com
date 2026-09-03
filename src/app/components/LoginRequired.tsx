import { AlertCircle, LogIn } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';

interface LoginRequiredProps {
  onLoginClick?: () => void;
}

export function LoginRequired({ onLoginClick }: LoginRequiredProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full space-y-6">
        <Alert variant="destructive" className="border-red-500 bg-red-50">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg">Autenticação Necessária</AlertTitle>
          <AlertDescription className="mt-3 space-y-3">
            <p>
              Você precisa estar autenticado para acessar esta funcionalidade.
            </p>
            <div className="bg-white rounded-lg p-4 border border-red-200 space-y-2">
              <p className="text-sm font-medium text-gray-900">
                Credenciais de Desenvolvimento:
              </p>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Email:</span>{' '}
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    rafael.borges@porschegt3cup.com.br
                  </code>
                </p>
                <p>
                  <span className="font-medium">Senha:</span>{' '}
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    Porschegt3cupHere
                  </code>
                </p>
              </div>
            </div>
            <Button 
              onClick={onLoginClick}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Fazer Login
            </Button>
          </AlertDescription>
        </Alert>
        
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            💡 <strong>Dica:</strong> Este usuário foi criado automaticamente no modo de desenvolvimento.
          </p>
          <p className="text-xs text-gray-500">
            Em produção, você precisará criar sua própria conta.
          </p>
        </div>
      </div>
    </div>
  );
}
