// Scraper de cuentas institucionales de Cuerpos de Bomberos que usan VIPER
// (despacho automático) — cada una publica también comunicados generales
// mezclados con los despachos; el parser (parseTweet.js) descarta
// automáticamente todo lo que no calce con el formato exacto de despacho,
// así que esos posts institucionales simplemente se ignoran.
//
// bomberoschillan: Chillán (@despachoscbch, la cuenta "de despacho" que
//   parecía obvia, está abandonada desde 2023 — los despachos reales salen
//   de la cuenta institucional).
// CentralCBC: Concepción, mismo formato de tweet verificado a mano.
//
// Lee cookies de sesión ya exportadas (ver README.md — este script NUNCA
// pide ni maneja tu contraseña, solo usa cookies que tú mismo generas al
// loguearte en tu navegador).
//
// Estrategia: Playwright navega a cada perfil ya logueado y lee el texto
// renderizado de los tweets (no intercepta las llamadas internas GraphQL de
// X) — es menos "elegante" pero mucho más fácil de depurar y de mantener
// cuando X cambie algo, que es justo lo que nos importa para un proyecto
// personal de bajo presupuesto.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parsearTweetDespacho } from './parseTweet.js';
import { nivelAlertaPorCarros } from './severidad.js';
import { geocodificarInterseccion } from './geocode.js';

const CUENTAS = ['bomberoschillan', 'CentralCBC'];
const COOKIES_PATH = process.env.X_COOKIES_PATH || './cookies.json';
// El nombre del archivo quedó de cuando esto era solo Chillán — se mantiene
// así para no romper la URL que ya lee la app; el contenido ahora cubre
// todas las comunas en CUENTAS.
const SALIDA_PATH = process.env.SALIDA_PATH || '../../data/incidentes-chillan.json';
// El feed no avisa cuándo se cierra un incidente, así que expiramos solos —
// ajusta esto si ves que los pines duran mucho más o menos que la atención real.
const HORAS_EXPIRACION = 12;

async function cargarExistentes() {
  try {
    const raw = await fs.readFile(SALIDA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Cookie-Editor (extensión del navegador) exporta sameSite con los valores
// crudos de la API de cookies de Chrome ("no_restriction", "lax", "strict",
// "unspecified"), pero Playwright solo acepta "Strict" | "Lax" | "None".
const SAME_SITE_MAP = {
  no_restriction: 'None',
  lax: 'Lax',
  strict: 'Strict',
  unspecified: 'Lax',
};

function normalizarCookies(cookies) {
  return cookies.map((c) => ({
    ...c,
    sameSite: SAME_SITE_MAP[String(c.sameSite).toLowerCase()] || 'Lax',
  }));
}

async function scrapearCuenta(page, cuenta) {
  await page.goto(`https://x.com/${cuenta}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('article', { timeout: 30000 });
  // Deja que carguen algunos tweets más aparte de los primeros.
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(2000);

  return page.$$eval('article', (nodos) =>
    nodos.map((n) => {
      const textoEl = n.querySelector('[data-testid="tweetText"]');
      const linkEl = n.querySelector('a[href*="/status/"]');
      const timeEl = n.querySelector('time');
      return {
        texto: textoEl ? textoEl.innerText : '',
        url: linkEl ? linkEl.href : null,
        fechaIso: timeEl ? timeEl.getAttribute('datetime') : null,
      };
    })
  );
}

async function main() {
  const cookiesRaw = await fs.readFile(COOKIES_PATH, 'utf-8');
  const cookies = normalizarCookies(JSON.parse(cookiesRaw));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
    // X traduce automáticamente los tweets si detecta que el idioma de la
    // cuenta/navegador no calza con el del tweet — necesitamos el texto en
    // español tal cual para que el parser funcione. El idioma de la CUENTA
    // (Settings → Languages) es el que manda; esto es una segunda capa por
    // si acaso.
    locale: 'es-CL',
    extraHTTPHeaders: { 'Accept-Language': 'es-CL,es;q=0.9' },
  });
  await context.addCookies(cookies);
  const page = await context.newPage();

  const tweetsPorCuenta = [];
  for (const cuenta of CUENTAS) {
    try {
      const tweets = await scrapearCuenta(page, cuenta);
      tweetsPorCuenta.push(...tweets.map((t) => ({ ...t, cuenta })));
    } catch (err) {
      // Si una cuenta falla (perfil caído, selector cambió, etc.), seguimos
      // con las demás en vez de perder todo el scrape.
      console.warn(`No se pudo scrapear @${cuenta}:`, err.message);
    }
  }

  await browser.close();

  const existentes = await cargarExistentes();
  const idsExistentes = new Set(existentes.map((e) => e.tweetUrl));

  const nuevos = [];
  for (const t of tweetsPorCuenta) {
    if (!t.url || idsExistentes.has(t.url)) continue;

    const parsed = parsearTweetDespacho(t.texto);
    if (!parsed) continue; // no calza con el formato esperado: mejor ignorarlo que inventar

    let ubicacion = null;
    try {
      ubicacion = await geocodificarInterseccion(parsed.calle1, parsed.calle2, parsed.comuna);
    } catch (err) {
      console.warn(`Geocodificación falló para "${parsed.calle1}" / "${parsed.calle2}":`, err.message);
    }
    if (!ubicacion) continue; // sin ubicación confiable, no lo publicamos

    nuevos.push({
      id: `viper-auto-${t.url.split('/status/')[1]}`,
      tipo: 'incidente',
      titulo: `${parsed.tipo} — ${parsed.calle1} / ${parsed.calle2}, ${parsed.comuna}`,
      nivelAlerta: nivelAlertaPorCarros(parsed.carros),
      estado: 'en_atencion',
      latitude: ubicacion.latitude,
      longitude: ubicacion.longitude,
      fecha: t.fechaIso || new Date().toISOString(),
      curadoManualmente: false,
      fuente: `Automatizado — despacho VIPER vía @${t.cuenta}`,
      tweetUrl: t.url,
    });
  }

  const ahora = Date.now();
  const vigentes = [...existentes, ...nuevos].filter((e) => {
    const edadHoras = (ahora - new Date(e.fecha).getTime()) / 3600000;
    return edadHoras < HORAS_EXPIRACION;
  });

  await fs.mkdir(path.dirname(SALIDA_PATH), { recursive: true });
  await fs.writeFile(SALIDA_PATH, JSON.stringify(vigentes, null, 2));
  console.log(`${nuevos.length} incidentes nuevos, ${vigentes.length} vigentes en total.`);
}

main().catch((err) => {
  console.error('Error en el scraper:', err);
  process.exit(1);
});
