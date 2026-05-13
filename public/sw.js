// Service Worker - NNE Sistema PWA
// IMPORTANTE: bump esta versão a cada deploy que mude bundles JS/CSS pra
// forçar limpeza automática do cache no cliente (assets antigos com mojibake
// ou bugs já corrigidos só somem quando essa string muda).
const CACHE_NAME = 'nne-v6-20260512d'
const PRECACHE = [
  '/',
  '/img/logo-nne.png',
]

// Install: precache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and Supabase API calls
  if (request.method !== 'GET' || url.hostname.includes('supabase')) return

  // Assets: cache-first
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/img/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return res
      }))
    )
    return
  }

  // HTML: network-first with fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    )
  }
})
