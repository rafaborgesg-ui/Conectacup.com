import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Eye, EyeOff, Lock, User, Mail, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import porscheCupLogo from 'figma:asset/3ae08ff326060d9638298673cda23da363101b9f.png';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';

interface SignUpProps {
  onSignUpSuccess?: () => void;
  onBackToLogin?: () => void;
}

export function SignUp({ onSignUpSuccess, onBackToLogin }: SignUpProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

  // Validação em tempo real
  const [validations, setValidations] = useState({
    nameValid: false,
    emailValid: false,
    passwordLength: false,
    passwordMatch: false,
  });

  const handleInputChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Validações em tempo real
    const newValidations = {
      nameValid: newFormData.name.trim().length >= 3,
      emailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newFormData.email),
      passwordLength: newFormData.password.length >= 6,
      passwordMatch: newFormData.password === newFormData.confirmPassword && newFormData.confirmPassword.length > 0,
    };
    setValidations(newValidations);
  };

  // Testa conexão com servidor ao montar componente
  const checkServerHealth = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/health`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Servidor disponível');
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch (error) {
      setServerStatus('offline');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!validations.nameValid) {
      toast.error('Nome deve ter pelo menos 3 caracteres');
      return;
    }

    if (!validations.emailValid) {
      toast.error('Email inválido');
      return;
    }

    if (!validations.passwordLength) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (!validations.passwordMatch) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      console.log('📝 Iniciando cadastro de usuário...');
      
      // Chama API do servidor para criar usuário
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/signup`;
      console.log('🔗 URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          name: formData.name.trim(),
        }),
      });

      console.log('📡 Response status:', response.status);
      
      let data;
      try {
        data = await response.json();
        console.log('📦 Response data:', data);
      } catch (jsonError) {
        console.error('❌ Erro ao parsear JSON:', jsonError);
        throw new Error('Resposta inválida do servidor');
      }

      if (!response.ok) {
        console.error('❌ Erro na resposta:', data);
        throw new Error(data.error || 'Erro ao criar conta');
      }

      // Sucesso
      toast.success('Conta criada com sucesso!', {
        description: 'Você já pode fazer login.',
      });

      // Aguarda um pouco e redireciona para login
      setTimeout(() => {
        onSignUpSuccess?.();
        navigate('/login');
      }, 1500);

    } catch (error: any) {
      console.error('❌ SignUp error:', error);
      
      // Erro de rede (Failed to fetch)
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        toast.error('Servidor temporariamente indisponível', {
          description: 'O sistema de cadastro está sendo inicializado. Por favor, aguarde alguns segundos e tente novamente.',
          duration: 5000,
        });
        
        // Tenta verificar health após erro
        setTimeout(() => {
          checkServerHealth();
        }, 2000);
      } else if (error.message.includes('already registered') || error.message.includes('já está cadastrado')) {
        toast.error('Este email já está cadastrado', {
          description: 'Faça login ou use outro email.',
        });
      } else if (error.message.includes('Resposta inválida')) {
        toast.error('Erro no servidor', {
          description: 'O servidor não está respondendo corretamente. Tente novamente mais tarde.',
        });
      } else {
        toast.error('Erro ao criar conta', {
          description: error.message || 'Tente novamente mais tarde.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = validations.nameValid && validations.emailValid && validations.passwordLength && validations.passwordMatch;

  // Não verifica servidor ao montar - deixa usuário tentar e mostra erro se falhar
  // React.useEffect(() => {
  //   checkServerHealth();
  // }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#1A1A1A] to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#D50000] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#D50000] rounded-full blur-3xl" />
      </div>

      {/* Card de SignUp */}
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          
          <h1 className="text-white mb-2">
            Criar Conta
          </h1>
          
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSignUp} className="space-y-5">
            {/* Campo Nome */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white flex items-center gap-2">
                <User className="w-4 h-4" />
                Nome Completo
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Digite seu nome"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="input-with-icon h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#D50000] focus:ring-[#D50000] rounded-xl"
                  disabled={isLoading}
                  autoComplete="name"
                />
                {formData.name && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {validations.nameValid ? (
                      <CheckCircle2 className="w-5 h-5 text-[#00A86B]" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-[#FFB800]" />
                    )}
                  </div>
                )}
              </div>
              {formData.name && !validations.nameValid && (
                <p className="text-xs text-[#FFB800] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Nome deve ter pelo menos 3 caracteres
                </p>
              )}
            </div>

            {/* Campo Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="input-with-icon h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#D50000] focus:ring-[#D50000] rounded-xl"
                  disabled={isLoading}
                  autoComplete="email"
                />
                {formData.email && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {validations.emailValid ? (
                      <CheckCircle2 className="w-5 h-5 text-[#00A86B]" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-[#FFB800]" />
                    )}
                  </div>
                )}
              </div>
              {formData.email && !validations.emailValid && (
                <p className="text-xs text-[#FFB800] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Email inválido
                </p>
              )}
            </div>

            {/* Campo Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="input-with-icon pr-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#D50000] focus:ring-[#D50000] rounded-xl"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.password && !validations.passwordLength && (
                <p className="text-xs text-[#FFB800] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Senha deve ter pelo menos 6 caracteres
                </p>
              )}
            </div>

            {/* Campo Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Confirmar Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Digite a senha novamente"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="input-with-icon pr-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#D50000] focus:ring-[#D50000] rounded-xl"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && (
                <>
                  {validations.passwordMatch ? (
                    <p className="text-xs text-[#00A86B] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      As senhas coincidem
                    </p>
                  ) : (
                    <p className="text-xs text-[#FFB800] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      As senhas não coincidem
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Botão Criar Conta */}
            <Button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full h-12 bg-gradient-to-r from-[#D50000] to-[#A80000] hover:from-[#A80000] hover:to-[#D50000] text-white border-0 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Criando conta...</span>
                </div>
              ) : (
                'Criar Conta'
              )}
            </Button>

            {/* Link para Login */}
            <div className="text-center pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onBackToLogin}
                className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 text-sm"
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4" />
                Já tem uma conta? Faça login
              </button>
            </div>
          </form>

          {/* Ajuda em caso de erro */}
          {serverStatus === 'offline' && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-xs text-yellow-300 text-center leading-relaxed">
                ⚠️ Se o cadastro não funcionar, aguarde alguns segundos (servidor inicializando) ou consulte <strong>TROUBLESHOOTING_SIGNUP.md</strong>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Ao criar uma conta, você concorda com nossos termos de uso
          </p>
        </div>
      </div>
    </div>
  );
}