import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { createClient } from '../utils/supabase/client';
import { Button } from '../components/ui/button';
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Validação de senha
  const passwordValidation = {
    minLength: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  useEffect(() => {
    // Verifica se há uma sessão de recuperação válida
    const checkRecoverySession = async () => {
      try {
        const supabase = createClient();
        
        console.log('🔍 Verificando URL:', window.location.href);
        console.log('🔍 Hash da URL:', window.location.hash);
        console.log('🔍 Search params:', window.location.search);
        
        // MÉTODO 1: Verifica token_hash nos query params (novo formato Supabase)
        const urlParams = new URLSearchParams(window.location.search);
        const tokenHash = urlParams.get('token_hash');
        const type = urlParams.get('type');
        
        console.log('🔐 Token Hash extraído:', tokenHash ? 'SIM' : 'NÃO');
        console.log('🔐 Type:', type);
        
        if (tokenHash && type === 'recovery') {
          console.log('✅ Token hash encontrado, verificando sessão...');
          
          // Verifica se o token é válido obtendo a sessão
          const { data: { session }, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          
          if (error || !session) {
            console.error('❌ Erro ao verificar token:', error);
            setError('Link de recuperação inválido ou expirado.');
            setIsValidSession(false);
            toast.error('Link inválido', {
              description: 'Este link de recuperação é inválido ou já expirou. Solicite um novo link.'
            });
          } else {
            console.log('✅ Token verificado e sessão estabelecida:', session);
            setIsValidSession(true);
            
            // Limpa os parâmetros da URL por segurança
            window.history.replaceState(null, '', window.location.pathname);
          }
          setCheckingSession(false);
          return;
        }
        
        // MÉTODO 2: Verifica se há código de verificação nos query params (PKCE flow)
        const code = urlParams.get('code');
        
        console.log('🔐 Código PKCE extraído:', code ? 'SIM' : 'NÃO');
        
        if (code) {
          console.log('✅ Código PKCE encontrado, trocando por sessão...');
          
          // Troca o código por uma sessão válida
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('❌ Erro ao trocar código por sessão:', error);
            setError('Link de recuperação inválido ou expirado.');
            setIsValidSession(false);
            toast.error('Link inválido', {
              description: 'Este link de recuperação é inválido ou já expirou. Solicite um novo link.'
            });
          } else {
            console.log('✅ Sessão estabelecida com sucesso via PKCE:', data);
            setIsValidSession(true);
            
            // Limpa os parâmetros da URL por segurança
            window.history.replaceState(null, '', window.location.pathname);
          }
          setCheckingSession(false);
          return;
        }
        
        // MÉTODO 3: Extrai access_token do hash da URL (método antigo)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');
        
        console.log('🔐 Access Token extraído:', accessToken ? 'SIM' : 'NÃO');
        console.log('🔐 Refresh Token extraído:', refreshToken ? 'SIM' : 'NÃO');
        console.log('🔐 Hash Type:', hashType);
        
        // Se temos tokens no hash, estabelece a sessão manualmente
        if (accessToken && refreshToken) {
          console.log('✅ Tokens encontrados na URL, estabelecendo sessão...');
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('❌ Erro ao estabelecer sessão:', error);
            setError('Link de recuperação inválido ou expirado.');
            setIsValidSession(false);
            toast.error('Link inválido', {
              description: 'Este link de recuperação é inválido ou já expirou. Solicite um novo link.'
            });
          } else {
            console.log('✅ Sessão estabelecida com sucesso via tokens:', data);
            setIsValidSession(true);
            
            // Limpa os tokens da URL por segurança
            window.history.replaceState(null, '', window.location.pathname);
          }
          setCheckingSession(false);
          return;
        }
        
        // MÉTODO 4: Fallback - tenta verificar se já existe uma sessão
        console.log('🔄 Nenhum código ou token encontrado, verificando sessão existente...');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📊 Session existente:', session);
        console.log('📊 Error:', error);
        
        if (error || !session) {
          console.error('⚠️ Nenhuma sessão de recuperação encontrada:', error);
          setError('Link de recuperação inválido ou expirado.');
          setIsValidSession(false);
          toast.error('Link inválido', {
            description: 'Este link de recuperação é inválido ou já expirou. Solicite um novo link.'
          });
        } else {
          console.log('✅ Sessão de recuperação válida encontrada');
          setIsValidSession(true);
        }
      } catch (err) {
        console.error('❌ Erro ao verificar sessão:', err);
        setError('Erro ao verificar link de recuperação.');
        setIsValidSession(false);
      } finally {
        setCheckingSession(false);
      }
    };

    checkRecoverySession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      toast.error('Senha inválida', {
        description: 'A senha deve atender todos os requisitos de segurança.'
      });
      return;
    }

    if (!passwordsMatch) {
      toast.error('Senhas não conferem', {
        description: 'As senhas digitadas não são iguais.'
      });
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      
      // Atualiza a senha usando a sessão de recuperação atual
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      toast.success('Senha redefinida com sucesso!', {
        description: 'Você já pode fazer login com sua nova senha.'
      });

      // Aguarda um momento para o usuário ver a mensagem e redireciona
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      console.error('Erro ao redefinir senha:', err);
      setError(err.message || 'Erro ao redefinir senha. Tente novamente.');
      toast.error('Erro ao redefinir senha', {
        description: err.message || 'Ocorreu um erro. Por favor, solicite um novo link de recuperação.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Mostra loading enquanto verifica a sessão
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" 
           style={{
             background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)'
           }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D50000] mx-auto mb-4"></div>
          <p className="text-gray-300">Verificando link de recuperação...</p>
        </div>
      </div>
    );
  }

  // Se não houver sessão válida, mostra erro e botão para voltar
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" 
           style={{
             background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)'
           }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-[#D50000] to-[#8B0000] rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-red-900/50">
              <XCircle className="text-white" size={48} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Link Inválido</h1>
            <p className="text-gray-400">O link de recuperação expirou ou é inválido</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
            <p className="text-gray-300 mb-6 text-center">
              Este link de recuperação de senha já foi usado, expirou ou é inválido.
            </p>
            
            <p className="text-gray-400 text-sm mb-6 text-center">
              Por favor, solicite um novo link de recuperação de senha.
            </p>

            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-[#D50000] to-[#B00000] hover:from-[#B00000] hover:to-[#8B0000] text-white py-6 rounded-xl shadow-lg shadow-red-900/30 transition-all duration-200 hover:shadow-xl hover:shadow-red-900/50"
            >
              Voltar ao Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{
           background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)'
         }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-[#D50000] to-[#8B0000] rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-red-900/50">
            <Lock className="text-white" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Redefinir Senha</h1>
          <p className="text-gray-400">Escolha uma nova senha segura</p>
        </div>

        {/* Formulário */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
          <form onSubmit={handleResetPassword} className="space-y-6">
            {/* Nova Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D50000] focus:border-transparent transition-all"
                  placeholder="Digite sua nova senha"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Validação de Senha */}
            {newPassword && (
              <div className="space-y-2 text-sm">
                <ValidationItem 
                  valid={passwordValidation.minLength} 
                  text="Mínimo de 8 caracteres" 
                />
                <ValidationItem 
                  valid={passwordValidation.hasUpper} 
                  text="Pelo menos uma letra maiúscula" 
                />
                <ValidationItem 
                  valid={passwordValidation.hasLower} 
                  text="Pelo menos uma letra minúscula" 
                />
                <ValidationItem 
                  valid={passwordValidation.hasNumber} 
                  text="Pelo menos um número" 
                />
              </div>
            )}

            {/* Confirmar Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D50000] focus:border-transparent transition-all"
                  placeholder="Digite a senha novamente"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmPassword && (
                <div className="mt-2">
                  <ValidationItem 
                    valid={passwordsMatch} 
                    text="As senhas conferem" 
                  />
                </div>
              )}
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Botão de Redefinir */}
            <Button
              type="submit"
              disabled={loading || !isPasswordValid || !passwordsMatch}
              className="w-full bg-gradient-to-r from-[#D50000] to-[#B00000] hover:from-[#B00000] hover:to-[#8B0000] text-white py-6 rounded-xl shadow-lg shadow-red-900/30 transition-all duration-200 hover:shadow-xl hover:shadow-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Redefinindo...</span>
                </div>
              ) : (
                'Redefinir Senha'
              )}
            </Button>

            {/* Link para Login */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-gray-400 hover:text-white transition-colors text-sm"
                disabled={loading}
              >
                Voltar ao Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para itens de validação
function ValidationItem({ valid, text }: { valid: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {valid ? (
        <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
      ) : (
        <XCircle size={16} className="text-gray-500 flex-shrink-0" />
      )}
      <span className={valid ? 'text-green-400' : 'text-gray-400'}>
        {text}
      </span>
    </div>
  );
}