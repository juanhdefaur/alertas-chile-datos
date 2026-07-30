// Geocodifica una intersección (calle1 y calle2) en una comuna de Chile usando
// Nominatim (OpenStreetMap, gratis, sin key) — misma API que ya usa la app en
// src/api/geocoding.js.
//
// Nominatim NO resuelve intersecciones directamente: "CalleA y CalleB, Ciudad"
// solo ancla a CalleA e ignora CalleB (verificado a mano). La estrategia que sí
// funciona: geocodificar cada calle por separado (varias puede devolver, si la
// calle tiene tramos en distintos barrios) y quedarse con el PAR más cercano
// entre las dos listas — ese par es, casi siempre, el cruce real, porque dos
// tramos con esos nombres solo están cerca entre sí donde de verdad se cruzan.
const BASE_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'alertaschile-chillan-scraper/1.0 (uso personal, bajo volumen)';

// Si el par más cercano encontrado queda a más de esto, asumimos que no
// encontramos el cruce real (nombres de calle raros, mal mapeados en OSM,
// etc.) y preferimos NO publicar un pin potencialmente engañoso.
const DISTANCIA_MAXIMA_KM = 3;

function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Nominatim pide no pasar 1 request/segundo — importa que esto se respete
// entre TODAS las llamadas (incluso de intersecciones distintas, con varios
// incidentes seguidos en un mismo scrape), no solo entre las dos calles de
// una misma intersección. Por eso el límite vive acá, en el único lugar que
// realmente dispara requests a Nominatim, en vez de en cada llamador.
let ultimaRequest = 0;
async function esperarTurno() {
  const desdeUltima = Date.now() - ultimaRequest;
  if (desdeUltima < 1100) await esperar(1100 - desdeUltima);
  ultimaRequest = Date.now();
}

async function geocodificarCalle(nombreCalle, comuna) {
  await esperarTurno();
  const q = `${nombreCalle}, ${comuna}, Chile`;
  const url = `${BASE_URL}?q=${encodeURIComponent(q)}&format=json&limit=4&countrycodes=cl&accept-language=es`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'es' } });
  if (!res.ok) throw new Error(`Nominatim respondió ${res.status} para "${q}"`);
  const data = await res.json();
  return data.map((r) => ({ lat: parseFloat(r.lat), lon: parseFloat(r.lon) }));
}

// Devuelve { latitude, longitude, distanciaKm } o null si no se pudo
// encontrar un cruce razonablemente confiable.
export async function geocodificarInterseccion(calle1, calle2, comuna) {
  const candidatosA = await geocodificarCalle(calle1, comuna);
  const candidatosB = await geocodificarCalle(calle2, comuna);

  if (candidatosA.length === 0 || candidatosB.length === 0) return null;

  let mejor = null;
  for (const a of candidatosA) {
    for (const b of candidatosB) {
      const d = distanciaKm(a.lat, a.lon, b.lat, b.lon);
      if (!mejor || d < mejor.distanciaKm) {
        mejor = { latitude: (a.lat + b.lat) / 2, longitude: (a.lon + b.lon) / 2, distanciaKm: d };
      }
    }
  }

  if (!mejor || mejor.distanciaKm > DISTANCIA_MAXIMA_KM) return null;
  return mejor;
}
