// ══════════════════════════════════════════════════════════════
//  SERVICE WORKER — Yamaha SMAX/Force 155 Simulateur
//  Rôle : permettre l'ouverture de l'app sans connexion du tout (pas
//  seulement les données déjà gérées par localStorage, mais le
//  CHARGEMENT de la page elle-même), et garder en cache les tuiles de
//  carte OpenStreetMap déjà consultées pour un trajet Balabala déjà
//  exploré une fois.
//
//  Ce fichier ne touche à AUCUNE donnée de l'app (calibrage moteur,
//  entretien, historique...) : tout ça reste dans localStorage, géré
//  ailleurs, et fonctionne déjà sans ce service worker.
//
//  Stratégies volontairement différentes selon le type de ressource :
//  - Page HTML principale : "réseau d'abord, cache en secours" — pour
//    toujours servir la dernière version en ligne, et ne retomber sur
//    la version en cache que si le réseau est indisponible.
//  - Tuiles de carte OSM : "cache d'abord" — une tuile de carte ne
//    change jamais, donc autant éviter de la retélécharger à chaque
//    fois et économiser la donnée mobile.
// ══════════════════════════════════════════════════════════════

const CACHE_NAME = 'smax155-cache-v1';
const CORE_ASSETS = [
  './',
  './Yamaha_Smax.html',
  './manifest.json',
];

// ── Installation : met en cache le HTML principal immédiatement, pour
//    qu'un premier lancement hors-ligne (juste après l'installation)
//    fonctionne déjà. skipWaiting() active la nouvelle version tout de
//    suite plutôt que d'attendre la fermeture de tous les onglets.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => { /* pas bloquant : l'app reste utilisable en ligne même si la mise en cache initiale échoue */ })
  );
  self.skipWaiting();
});

// ── Activation : supprime les anciennes versions du cache (si le fichier
//    a déjà été mis à jour une fois auparavant), pour ne pas accumuler
//    indéfiniment des versions obsolètes dans le stockage du navigateur.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

function isMapTile(url) {
  // Tuiles OpenStreetMap (fond de carte Balabala) : ex.
  // https://a.tile.openstreetmap.org/11/1234/567.png
  return /tile\.openstreetmap\.org\//.test(url);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // ne met en cache que les lectures, jamais les appels d'action (OSRM, Overpass, etc.)

  const url = req.url;

  if (isMapTile(url)) {
    // Cache d'abord : une tuile déjà téléchargée ne change jamais.
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((resp) => {
            if (resp && resp.ok) cache.put(req, resp.clone());
            return resp;
          }).catch(() => cached); // hors-ligne et jamais vue : rien à faire, la carte affichera un vide
        })
      )
    );
    return;
  }

  // Pour tout le reste servi par la même origine (le HTML principal,
  // manifest.json...) : réseau d'abord pour rester à jour, cache en
  // secours si hors-ligne.
  if (url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Autres domaines (OSRM, Nominatim, Overpass, polices Google Fonts...) :
  // laissés passer normalement, sans interception — ce sont des services
  // qui nécessitent une connexion active de toute façon (calcul d'itinéraire,
  // recherche d'adresse), la mise en cache n'y apporterait rien d'utile.
});
