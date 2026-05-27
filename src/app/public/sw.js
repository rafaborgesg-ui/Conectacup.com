// Service Worker DESABILITADO - Não intercepta OAuth callback
// OAuth precisa passar direto sem cache

self.addEventListener('install', (event) => {
  console.log('[SW] Instalado mas INATIVO para OAuth');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Ativado - limpando caches antigos');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// NÃO intercepta fetch - deixa OAuth passar direto
self.addEventListener('fetch', (event) => {
  // Se for OAuth callback, deixa passar sem cache
  if (event.request.url.includes('access_token') || 
      event.request.url.includes('code=') ||
      event.request.url.includes('supabase.co/auth')) {
    return; // Não intercepta
  }
  
  // Para outros requests, passa direto também (por enquanto)
  return;
});
