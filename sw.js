/* Service worker de V8086 : met l'application en cache pour qu'elle fonctionne sans connexion.
   À chaque modification d'un fichier de l'application, changer VERSION : c'est ce qui
   déclenche la mise à jour du cache chez les utilisateurs. */
'use strict';

const VERSION = 'v8086-1';

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'src/language.js',
  'src/permanent.js',
  'src/errors/errors.js',
  'src/lexer/lexer.js',
  'src/parser/parser.js',
  'src/semantic/semantic.js',
  'src/compiler.js',
  'src/vm/vm.js',
  'src/ui/samples.js',
  'src/ui/help.js',
  'src/ui/highlight.js',
  'src/ui/editor.js',
  'src/ui/app.js',
  'src/ui/pwa.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fichiers de l'application : cache d'abord. Le reste (documentation, etc.) : réseau, puis cache.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});
