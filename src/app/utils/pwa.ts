// Utilities para PWA

/**
 * Registra o Service Worker
 */
export async function registerServiceWorker() {
  // 🔴 DESABILITADO TEMPORARIAMENTE PARA DEBUG OAUTH
  // O Service Worker está causando erros MIME type que atrapalham o debug
  console.log('⚠️ Service Worker DESABILITADO temporariamente (debug OAuth)');
  return;
  
  // Não tenta registrar em ambientes de preview/desenvolvimento
  if (window.location.hostname.includes('figma') || 
      window.location.hostname === 'localhost') {
    console.log('Service Worker desabilitado em ambiente de preview');
    return;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado:', registration);
      
      // Verifica atualizações a cada 24h
      setInterval(() => {
        registration.update();
      }, 24 * 60 * 60 * 1000);
      
      return registration;
    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
    }
  }
}

/**
 * Solicita permissão para notificações
 */
export async function requestNotificationPermission() {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Permissão de notificação concedida');
      return true;
    }
  }
  return false;
}

/**
 * Envia notificação local
 */
export async function sendNotification(title: string, options?: NotificationOptions) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    
    await registration.showNotification(title, {
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      vibrate: [200, 100, 200],
      ...options,
    });
  }
}

/**
 * Detecta se o app está sendo executado como PWA
 */
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

/**
 * Detecta se é um dispositivo móvel
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Detecta se é iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Detecta se é Android
 */
export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

/**
 * Adiciona o app à tela inicial (Android)
 */
export function addToHomeScreen() {
  // O evento beforeinstallprompt deve ser capturado antes
  const deferredPrompt = (window as any).deferredPrompt;
  
  if (deferredPrompt) {
    deferredPrompt.prompt();
    
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuário aceitou adicionar à tela inicial');
      }
      (window as any).deferredPrompt = null;
    });
  }
}

/**
 * Verifica suporte a recursos PWA
 */
export function checkPWASupport() {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    notifications: 'Notification' in window,
    pushManager: 'PushManager' in window,
    backgroundSync: 'SyncManager' in window,
    badging: 'setAppBadge' in navigator,
  };
}

/**
 * Atualiza badge do app (quantos itens pendentes)
 */
export function updateAppBadge(count: number) {
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      (navigator as any).setAppBadge(count);
    } else {
      (navigator as any).clearAppBadge();
    }
  }
}

/**
 * Vibração háptica (se suportado)
 */
export function hapticFeedback(pattern: number | number[] = 10) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Compartilhamento nativo (Web Share API)
 */
export async function nativeShare(data: ShareData) {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      return false;
    }
  }
  return false;
}

/**
 * Wake Lock - mantém a tela ligada
 */
export async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      const wakeLock = await (navigator as any).wakeLock.request('screen');
      console.log('Wake Lock ativado');
      
      return () => {
        wakeLock.release();
        console.log('Wake Lock liberado');
      };
    } catch (error) {
      console.error('Erro ao requisitar Wake Lock:', error);
    }
  }
  return () => {};
}

/**
 * Detecta modo de exibição
 */
export function getDisplayMode(): 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' {
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }
  return 'browser';
}

/**
 * Captura o evento de instalação do PWA
 */
export function setupInstallPrompt() {
  // Só configura em ambientes de produção
  if (window.location.hostname.includes('figma') || 
      window.location.hostname === 'localhost') {
    console.log('Install prompt desabilitado em ambiente de preview');
    return;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).deferredPrompt = e;
    
    // Dispara evento customizado para mostrar botão de instalação
    window.dispatchEvent(new Event('pwa-installable'));
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('PWA instalado com sucesso');
    (window as any).deferredPrompt = null;
  });
}
