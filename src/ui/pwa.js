/* Enregistre le service worker (fonctionnement hors connexion).
   Il n'est actif que sur un site servi en http(s) ; ouvert depuis un fichier local, l'application
   fonctionne normalement sans lui. */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* hors connexion ou refusé : sans conséquence */ });
  });
})();
