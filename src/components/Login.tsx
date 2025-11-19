import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';
import { Eye, EyeOff, Lock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import porscheCupLogo from 'figma:asset/3ae08ff326060d9638298673cda23da363101b9f.png';
import bgImage from 'figma:asset/259c0344182d6b72c303b23272de9d50609534c2.png';
import { createClient } from '../utils/supabase/client';
import { PasswordRecovery } from './PasswordRecovery';
import { SplashScreen } from './SplashScreen';

interface LoginProps {
  onLogin: (userRole: string) => void;
  onSignUp?: () => void;
}

type LoginView = 'login' | 'recovery';

interface ValidationState {
  isValid: boolean;
  message: string;
}

export function Login({ onLogin, onSignUp }: LoginProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<LoginView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailValidation, setEmailValidation] = useState<ValidationState>({ isValid: false, message: '' });
  const [passwordValidation, setPasswordValidation] = useState<ValidationState>({ isValid: false, message: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Detecta mudanças no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Validação em tempo real do email
  useEffect(() => {
    if (!touched.email) return;
    
    if (email.length === 0) {
      setEmailValidation({ isValid: false, message: 'Email é obrigatório' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailValidation({ isValid: false, message: 'Email inválido' });
    } else {
      setEmailValidation({ isValid: true, message: 'Email válido' });
    }
  }, [email, touched.email]);

  // Validação em tempo real da senha
  useEffect(() => {
    if (!touched.password) return;
    
    if (password.length === 0) {
      setPasswordValidation({ isValid: false, message: 'Senha é obrigatória' });
    } else if (password.length < 6) {
      setPasswordValidation({ isValid: false, message: 'Mínimo 6 caracteres' });
    } else {
      setPasswordValidation({ isValid: true, message: 'Senha válida' });
    }
  }, [password, touched.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Previne múltiplos cliques enquanto está processando
    if (isLoading) {
      console.warn('⚠️ Login já em andamento, ignorando clique duplicado');
      return;
    }
    
    // Marca todos os campos como touched
    setTouched({ email: true, password: true });
    
    if (!email.trim() || !password.trim()) {
      toast.error('Campos obrigatórios', {
        description: 'Por favor, preencha email e senha.',
      });
      return;
    }

    console.log('🔐 Iniciando processo de login...');
    setIsLoading(true);

    try {
      // 🔓 CREDENCIAIS DE DESENVOLVIMENTO - Redirecionadas para Supabase Auth
      // IMPORTANTE: Credencial DEV agora usa Supabase Auth para evitar erros 401
      // Isso garante que todas as requisições terão token válido

      // Validação síncrona para credenciais reais (não depende do useEffect)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmailValid = emailRegex.test(email);
      const isPasswordValid = password.length >= 6;
      
      if (!isEmailValid) {
        toast.error('Email inválido', {
          description: 'Por favor, insira um email válido.',
        });
        setIsLoading(false);
        return;
      }
      
      if (!isPasswordValid) {
        toast.error('Senha inválida', {
          description: 'A senha deve ter no mínimo 6 caracteres.',
        });
        setIsLoading(false);
        return;
      }

      // Autentica via Supabase Auth (produção)
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        toast.error('Credenciais inválidas', {
          description: error.message || 'Email ou senha incorretos.',
        });
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        toast.error('Erro no login', {
          description: 'Não foi possível autenticar. Tente novamente.',
        });
        setIsLoading(false);
        return;
      }

      // Extrai informações do usuário
      const user = data.user;
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';
      const role = user.user_metadata?.role || 'operator';
      
      // 🔐 RBAC: Garante que o profileId esteja definido (usa role como profileId padrão)
      const profileId = user.user_metadata?.profileId || role;

      // Salva informações do usuário no localStorage (Supabase Auth já gerencia a sessão)
      localStorage.setItem('porsche-cup-user', JSON.stringify({
        id: user.id,
        email: user.email,
        name,
        role,
        profileId, // ✅ Adiciona profileId para sistema RBAC
      }));

      console.log(`✅ Login bem-sucedido: ${email} (${role})`);
      
      toast.success('Login realizado com sucesso!', {
        description: `Bem-vindo, ${name}`,
      });

      // Chama callback de login
      onLogin(role);
    } catch (error: any) {
      console.error('Login exception:', error);
      toast.error('Erro ao fazer login', {
        description: error.message || 'Ocorreu um erro inesperado. Tente novamente.',
      });
    } finally {
      // Garante que isLoading sempre será resetado
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Previne múltiplos cliques
    if (isLoading) {
      console.warn('⚠️ Login Google já em andamento, ignorando clique duplicado');
      return;
    }
    
    try {
      console.log('='.repeat(60));
      console.log('🔐 INICIANDO LOGIN GOOGLE - MODO FORÇADO');
      console.log('='.repeat(60));
      setIsLoading(true);
      const supabase = createClient();
      
      // 🎯 FORÇA o redirectTo para a raiz do domínio
      // Isso sobrescreve qualquer configuração do Supabase Dashboard
      const redirectUrl = window.location.origin + '/';
      
      console.log('📍 Current URL:', window.location.href);
      console.log('📍 Origin:', window.location.origin);
      console.log('📍 Forced Redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        console.error('❌ Google OAuth Error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Erro no login com Google', {
          description: error.message || 'Não foi possível autenticar com Google.',
        });
        setIsLoading(false);
        return;
      }

      console.log('✅ OAuth iniciado - redirecionando para Google...');
      console.log('URL callback esperada: [PROJECT_ID].supabase.co/auth/v1/callback');
      
      // O usuário será redirecionado para o Google
      // Após autenticação, voltará para a aplicação
      // Não resetamos isLoading aqui pois a página será redirecionada
    } catch (error: any) {
      console.error('Google login exception:', error);
      toast.error('Erro ao fazer login com Google', {
        description: error.message || 'Ocorreu um erro inesperado.',
      });
    } finally {
      // Garante que isLoading sempre será resetado (exceto em redirecionamento bem-sucedido)
      setIsLoading(false);
    }
  };

  // Mostra splash screen primeiro
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Se está na view de recuperação, mostra o componente
  if (currentView === 'recovery') {
    return <PasswordRecovery onBack={() => setCurrentView('login')} />;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-0 py-4 sm:p-4 relative overflow-hidden">
      {/* Imagem de fundo tecnológica */}
      <div 
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: `url(${bgImage})`,
          opacity: 1.0,
          transform: `translateY(-150px) scale(${isMobile ? '0.7' : '0.82'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          width: '100%',
          height: '100%',
          minWidth: '100vw',
          minHeight: '100vh'
        }}
      />
      
      {/* Overlay para melhor legibilidade */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/40" />
      
      {/* Background Pattern adicional */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,.05) 10px,
            rgba(255,255,255,.05) 20px
          )`
        }} />
      </div>

      <div className="w-full max-w-[360px] px-4 sm:max-w-xs sm:px-0 relative z-10 mt-56">
        {/* Login Card */}
        <div className="space-y-3">
          <form onSubmit={handleSubmit} className="space-y-2">
            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-white text-xs">
                E-mail
              </Label>
              <div className="relative">
                <User className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={10} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched({ ...touched, email: true })}
                  placeholder="seu@email.com"
                  className={`!pl-6 pr-6 h-7 text-sm bg-white/5 border-white/20 text-white placeholder:text-gray-500 transition-all hover:bg-white/10 focus:bg-white/10 !outline-none !ring-0 focus-visible:!outline-none focus-visible:!ring-0 focus:!outline-none focus:!ring-0 focus:!shadow-none ${
                    touched.email
                      ? emailValidation.isValid
                        ? 'border-[#00A86B] focus:border-[#00A86B]'
                        : 'border-[#D50000] focus:border-[#D50000]'
                      : 'focus:border-[#D50000]'
                  }`}
                  style={{ paddingLeft: '1.5rem' }}
                  disabled={isLoading}
                  autoFocus
                  autoComplete="email"
                />
                {touched.email && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {emailValidation.isValid ? (
                      <CheckCircle2 className="text-[#00A86B]" size={10} />
                    ) : (
                      <AlertCircle className="text-[#D50000]" size={10} />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label htmlFor="password" className="text-white text-xs">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={10} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched({ ...touched, password: true })}
                  placeholder="••••••••"
                  className={`!pl-6 pr-12 h-7 text-sm bg-white/5 border-white/20 text-white placeholder:text-gray-500 transition-all hover:bg-white/10 focus:bg-white/10 !outline-none !ring-0 focus-visible:!outline-none focus-visible:!ring-0 focus:!outline-none focus:!ring-0 focus:!shadow-none ${
                    touched.password
                      ? passwordValidation.isValid
                        ? 'border-[#00A86B] focus:border-[#00A86B]'
                        : 'border-[#D50000] focus:border-[#D50000]'
                      : 'focus:border-[#D50000]'
                  }`}
                  style={{ paddingLeft: '1.5rem' }}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {touched.password && (
                    <div>
                      {passwordValidation.isValid ? (
                        <CheckCircle2 className="text-[#00A86B]" size={10} />
                      ) : (
                        <AlertCircle className="text-[#D50000]" size={10} />
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-white transition-colors"
                    disabled={isLoading}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={10} /> : <Eye size={10} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || (touched.email && !emailValidation.isValid) || (touched.password && !passwordValidation.isValid)}
              className="w-full bg-gradient-to-r from-[#D50000] to-[#B00000] hover:from-[#B00000] hover:to-[#8B0000] text-white font-semibold py-3 rounded-lg shadow-md shadow-red-900/30 transition-all duration-200 hover:shadow-lg hover:shadow-red-900/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-xs"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-1">
                  <div className="w-2.5 h-2.5 border border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Entrando...</span>
                </div>
              ) : (
                <span>Entrar</span>
              )}
            </Button>

            {/* Forgot Password & Sign Up */}
            <div className="flex items-center justify-between text-[3px]">
              <button
                type="button"
                onClick={() => setCurrentView('recovery')}
                className="text-gray-400 hover:text-white transition-colors text-[12px]"
                disabled={isLoading}
              >
                Esqueceu sua senha?
              </button>
              
              {onSignUp && (
                <button
                  type="button"
                  onClick={onSignUp}
                  className="text-[#D50000] hover:text-[#FF5252] transition-colors font-medium text-[12px]"
                  disabled={isLoading}
                >
                  Criar conta
                </button>
              )}
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-black/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-gray-400 text-[10px]">ou</span>
            </div>
          </div>

          {/* Google Login */}
          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white hover:bg-gray-100 text-gray-800 py-3 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 border border-gray-200 text-xs"
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium">{isLoading ? 'Conectando...' : 'Continuar com Google'}</span>
          </Button>

          {/* Credenciais de DEV - Visível apenas em localhost */}
          {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
            <div className="mt-3 p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-[10px] text-blue-300 text-center leading-tight">
                💻 <strong>Modo DEV:</strong> Use credenciais de desenvolvimento
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-gray-500 text-[11px]">
            © 2025 Conecta Cup. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
