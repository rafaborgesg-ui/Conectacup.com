/**
 * 🚀 App Principal - Conecta Cup v4.8.16
 * Fix crítico: Restaurada lógica de autenticação com imports explícitos
 * 
 * @updated 2026-03-24T22:15:00Z
 */
import { useEffect, useRef } from 'react';
import { RouterProvider } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { createClient, getCurrentUser } from './utils/supabase/client';
import { projectId } from './utils/supabase/info';
import { router } from './routes';
import { registerServiceWorker, setupInstallPrompt } from './utils/pwa';

// 🚨 PROTEÇÃO GLOBAL: Garante que só há UM listener de auth em toda a aplicação
let GLOBAL_AUTH_LISTENER_INITIALIZED = false;

// 🧹 LIMPEZA INICIAL: Reseta contador se for carregamento inicial da página
if (performance.navigation.type === performance.navigation.TYPE_NAVIGATE || 
    performance.navigation.type === performance.navigation.TYPE_RELOAD) {
  sessionStorage.removeItem('checkAuthCount');
  console.log('🧹 Limpeza inicial: contador resetado');
}

/**
 * Setup de usuário de desenvolvimento
 * Cria automaticamente o usuário admin para desenvolvimento local
 */
async function setupDevUser() {
  // Só executa em localhost
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return;
  }
  
  // Verifica se já rodou o setup (cache de 24h)
  const lastSetup = localStorage.getItem('dev-user-setup-timestamp');
  if (lastSetup) {
    const timeSinceSetup = Date.now() - parseInt(lastSetup);
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (timeSinceSetup < ONE_DAY) {
      return; // Já rodou recentemente
    }
  }
  
  try {
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/dev/setup-user`, {
      method: 'POST'
    });
    
    if (response.ok) {
      localStorage.setItem('dev-user-setup-timestamp', Date.now().toString());
      console.log('✅ DEV: Usuário admin configurado');
    }
  } catch (error) {
    console.log('ℹ️ DEV: Setup automático falhou (normal se servidor não estiver rodando)');
  }
}

export default function App() {
  // 🔐 PROTEÇÃO ANTI-LOOP: Refs persistem entre re-renders
  const authChangeCount = useRef(0);
  const loopDetected = useRef(false);
  const isProcessingOAuth = useRef(false);
  const authInitialized = useRef(false);
  const lastProcessedEvent = useRef<string>('');

  // 🛡️ PROTEÇÃO GLOBAL: Captura erros não tratados que podem causar loops
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('🚨 Erro global capturado:', event.error);
      event.preventDefault();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Promise rejection não tratada:', event.reason);
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    // 🚨 PROTEÇÃO GLOBAL: Verifica flag GLOBAL primeiro
    if (GLOBAL_AUTH_LISTENER_INITIALIZED) {
      console.warn('🚫 GLOBAL: Auth listener já existe - ABORTANDO');
      return () => {};
    }
    
    // 🚨 PROTEÇÃO LOCAL: Verifica flag do componente
    if (authInitialized.current) {
      console.warn('⚠️ LOCAL: Auth já inicializado - IGNORANDO execução do useEffect');
      return () => {};
    }
    
    // Marca como inicializado IMEDIATAMENTE (GLOBAL + LOCAL)
    GLOBAL_AUTH_LISTENER_INITIALIZED = true;
    authInitialized.current = true;
    
    // 🔍 DEBUG: Contador de execuções
    let checkAuthCount = parseInt(sessionStorage.getItem('checkAuthCount') || '0');
    checkAuthCount++;
    sessionStorage.setItem('checkAuthCount', checkAuthCount.toString());
    
    if (checkAuthCount > 10) {
      console.error('🚨 ERRO CRÍTICO: useEffect executado mais de 10 vezes!');
      sessionStorage.setItem('checkAuthCount', '0');
      console.warn('⚠️ Sistema em modo de recuperação - aguardando estabilização...');
      
      GLOBAL_AUTH_LISTENER_INITIALIZED = false;
      authInitialized.current = false;
      loopDetected.current = true;
      
      return () => {};
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 [${checkAuthCount}x] useEffect EXECUTADO`);
    console.log(`${'='.repeat(60)}\n`);
    
    const checkAuth = async () => {
      try {
        const urlHash = window.location.hash;
        const urlSearch = window.location.search;
        
        const isOAuthCallback = 
          urlHash.includes('access_token') ||
          urlHash.includes('refresh_token') ||
          urlHash.includes('error=') ||
          urlSearch.includes('code=');
        
        if (isOAuthCallback) {
          console.log('🔐 ✅ OAuth callback detectado, aguardando processamento...');
          return;
        }
        
        await setupDevUser();
        
        const user = await getCurrentUser();
        
        if (user) {
          console.log('✅ Usuário autenticado:', user.email);
          
          const profileId = user.profileId || user.user_metadata?.profileId || user.role;
          
          localStorage.setItem('porsche-cup-user', JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            profileId,
          }));
        } else {
          console.log('ℹ️ Nenhuma sessão encontrada - redirecionando para login');
          if (!window.location.pathname.startsWith('/login') && 
              !window.location.pathname.startsWith('/signup') &&
              !window.location.pathname.startsWith('/reset-password')) {
            router.navigate('/login');
          }
        }
      } catch (error: any) {
        console.warn('Erro na verificação de autenticação:', error);
        if (!window.location.pathname.startsWith('/login') && 
            !window.location.pathname.startsWith('/signup') &&
            !window.location.pathname.startsWith('/reset-password')) {
          router.navigate('/login');
        }
      }
    };
    
    checkAuth();
    
    const supabase = createClient();
    
    // 🔐 OAuth Callback Listener - Detecta retorno do Google OAuth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!event) {
        console.warn('⚠️ Evento de auth é null/undefined - ignorando');
        return;
      }
      
      // 🎯 FILTRAGEM INTELIGENTE: Ignora eventos automáticos do Supabase
      const EVENTOS_IGNORADOS = ['INITIAL_SESSION', 'TOKEN_REFRESHED', 'USER_UPDATED'];
      
      if (EVENTOS_IGNORADOS.includes(event)) {
        console.log(`ℹ️ Evento ${event} ignorado (automático do Supabase)`);
        return;
      }
      
      // 🚫 PROTEÇÃO EXTRA: Se receber SIGNED_IN e já está autenticado fora de /login ou /signup, ignora
      if (event === 'SIGNED_IN' && 
          window.location.pathname !== '/login' && 
          window.location.pathname !== '/signup' &&
          localStorage.getItem('porsche-cup-user')) {
        console.log('ℹ️ SIGNED_IN ignorado - usuário já autenticado e não está em página de auth');
        return;
      }
      
      // 🚫 ANTI-DUPLICAÇÃO: Ignora eventos duplicados consecutivos
      const eventKey = `${event}-${session?.user?.id || 'no-user'}`;
      if (lastProcessedEvent.current === eventKey) {
        console.log(`⚠️ Evento duplicado ignorado: ${event}`);
        return;
      }
      lastProcessedEvent.current = eventKey;
      
      authChangeCount.current++;
      console.log(`🔐 Auth mudou [${authChangeCount.current}]: ${event}`, session ? '(com sessão)' : '(sem sessão)');
      
      // PROTEÇÃO ANTI-LOOP: Para tudo após 3 tentativas
      if (authChangeCount.current > 3 || loopDetected.current) {
        if (!loopDetected.current) {
          console.error(`⚠️ Loop OAuth detectado! Auth mudou ${authChangeCount.current} vezes`);
          console.error('🛑 PARANDO processamento para evitar loop infinito');
          loopDetected.current = true;
          
          if (window.location.hash || window.location.search) {
            window.history.replaceState(null, '', window.location.pathname);
          }
          
          subscription.unsubscribe();
        }
        return;
      }
      
      if (event === 'SIGNED_IN' && session && !isProcessingOAuth.current) {
        console.log('✅ SIGNED_IN detectado - processando...');
        isProcessingOAuth.current = true;
        
        // ⭐ FALLBACK IMEDIATO: Se já tem role no metadata, usa direto
        const existingRole = session.user.user_metadata?.role;
        if (existingRole) {
          console.log('⚡ FAST PATH: Role já existe no metadata:', existingRole);
          
          const userName = session.user.user_metadata?.name || 
                          session.user.user_metadata?.full_name || 
                          session.user.email?.split('@')[0] || 
                          'Usuário';
          
          const profileId = session.user.user_metadata?.profileId || existingRole;
          
          localStorage.setItem('porsche-cup-user', JSON.stringify({
            id: session.user.id,
            email: session.user.email,
            name: userName,
            role: existingRole,
            profileId,
          }));
          
          if (window.location.hash || window.location.search) {
            window.history.replaceState(null, '', window.location.pathname);
          }
          
          if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
            console.log('🔄 Redirecionando de auth page para home...');
            router.navigate('/');
          } else {
            console.log('✅ Já está na área autenticada - não redireciona');
          }
          
          isProcessingOAuth.current = false;
          return;
        }
        
        try {
          console.log('🔄 Chamando ensure-role...');
          const ensureRoleResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/auth/ensure-role`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          
          if (ensureRoleResponse.ok) {
            const ensureRoleData = await ensureRoleResponse.json();
            console.log('✅ ensure-role OK:', ensureRoleData);
            
            if (ensureRoleData.user) {
              const profileId = ensureRoleData.user.profileId || ensureRoleData.user.role;
              
              localStorage.setItem('porsche-cup-user', JSON.stringify({
                id: ensureRoleData.user.id,
                email: ensureRoleData.user.email,
                name: ensureRoleData.user.name,
                role: ensureRoleData.user.role,
                profileId,
              }));
              
              if (window.location.hash || window.location.search) {
                window.history.replaceState(null, '', window.location.pathname);
              }
              
              if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
                console.log('🔄 Redirecionando de auth page para home...');
                router.navigate('/');
              }
            }
          } else {
            console.warn('⚠️ ensure-role FALHOU - usando fallback');
            const defaultRole = 'operator';
            const userName = session.user.user_metadata?.name || 
                            session.user.user_metadata?.full_name || 
                            session.user.email?.split('@')[0] || 
                            'Usuário';
            
            const profileId = session.user.user_metadata?.profileId || defaultRole;
            
            localStorage.setItem('porsche-cup-user', JSON.stringify({
              id: session.user.id,
              email: session.user.email,
              name: userName,
              role: defaultRole,
              profileId,
            }));
            
            if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
              console.log('🔄 Redirecionando de auth page para home...');
              router.navigate('/');
            }
          }
        } catch (error) {
          console.error('❌ Erro ao chamar ensure-role:', error);
          const defaultRole = 'operator';
          const userName = session.user.user_metadata?.name || 
                          session.user.user_metadata?.full_name || 
                          session.user.email?.split('@')[0] || 
                          'Usuário';
          
          const profileId = session.user.user_metadata?.profileId || defaultRole;
          
          localStorage.setItem('porsche-cup-user', JSON.stringify({
            id: session.user.id,
            email: session.user.email,
            name: userName,
            role: defaultRole,
            profileId,
          }));
          
          if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
            console.log('🔄 Redirecionando de auth page para home...');
            router.navigate('/');
          }
        } finally {
          isProcessingOAuth.current = false;
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 SIGNED_OUT detectado - limpando sessão');
        localStorage.removeItem('porsche-cup-user');
        router.navigate('/login');
      }
    });
    
    // Timeout de segurança: Reseta contador após 2 segundos
    const resetCounterTimeout = setTimeout(() => {
      if (authChangeCount.current > 0) {
        console.log(`🔄 Auto-reset: Contador de auth changes resetado (estava em ${authChangeCount.current})`);
        authChangeCount.current = 0;
        loopDetected.current = false;
        lastProcessedEvent.current = '';
      }
    }, 2000);
    
    // Inicializa PWA
    registerServiceWorker();
    setupInstallPrompt();
    
    // Cleanup: Remove listener quando componente desmontar
    return () => {
      console.log('🧹 Limpando auth listener e resetando flags');
      subscription.unsubscribe();
      clearTimeout(resetCounterTimeout);
      GLOBAL_AUTH_LISTENER_INITIALIZED = false;
      authInitialized.current = false;
    };
  }, []);

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
