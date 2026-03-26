// IurisPocket Service Worker
// Versión de caché — incrementar para forzar actualización
const CACHE_NAME = 'iurispocket-v1';

// Archivos a cachear inmediatamente al instalar
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './Constitucion_Panama.html',
  './Codigo_Civil_Panama.html',
  './Codigo_Comercio_Panama.html',
  './Codigo_Penal_Panama.html',
  './Código_Procesal_Civil_Panama.html',
  './Ley_41_1998_Ambiente_Panama.html',
  './Diccionario_Juridico_Elemental_Cabanellas.html'
];

// ── INSTALL: Pre-cachea todos los archivos ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-cacheando archivos...');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      console.log('[SW] Instalación completa');
      return self.skipWaiting();
    }).catch(err => {
      console.warn('[SW] Error en pre-caché (puede ser normal en desarrollo):', err);
    })
  );
});

// ── ACTIVATE: Limpia cachés viejos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Eliminando caché viejo:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── FETCH: Cache-first con fallback a red ──
self.addEventListener('fetch', event => {
  // Solo interceptar peticiones GET del mismo origen
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Devuelve del caché inmediatamente (funciona offline)
        return cachedResponse;
      }

      // No está en caché: va a la red y guarda la respuesta
      return fetch(event.request).then(networkResponse => {
        // Solo cachea respuestas válidas del mismo origen
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Sin red y sin caché: página de error offline
        return new Response(
          `<!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sin conexión — IurisPocket</title>
            <style>
              body { background:#0d1b2a; color:#f0f4f8; font-family:sans-serif;
                     display:flex; align-items:center; justify-content:center;
                     min-height:100vh; text-align:center; padding:24px; }
              h1 { font-size:2rem; margin-bottom:12px; }
              p  { color:#8ea3b8; margin-bottom:24px; }
              a  { background:#C8A951; color:#0d1b2a; padding:10px 24px;
                   border-radius:8px; text-decoration:none; font-weight:700; }
            </style>
          </head>
          <body>
            <div>
              <div style="font-size:3rem;margin-bottom:16px;">⚖️</div>
              <h1>Sin conexión</h1>
              <p>Este recurso no está disponible offline.<br>
                 Los documentos principales sí funcionan sin internet.</p>
              <a href="./index.html">← Volver al inicio</a>
            </div>
          </body>
          </html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      });
    })
  );
});
