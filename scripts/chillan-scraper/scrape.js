// Scraper de @bomberoschillan (cuenta institucional del Cuerpo de Bomberos
// de Chillán — ahí es donde realmente se publican los despachos automáticos
// de VIPER, no en @despachoscbch, que está abandonada desde 2023). La cuenta
// también publica comunicados generales mezclados con los despachos; el
// parser (parseTweet.js) descarta automáticamente todo lo que no calce con
// el formato exacto de despacho, así que esos posts institucionales
// simplemente se ignoran.
//
// Lee cookies de sesión ya exportadas (ver README.md — este script NUNCA
// pide ni maneja tu contraseña, solo usa cookies que tú mismo generas al
// loguearte en tu navegador).
//
// Estrategia: Playwright navega al perfil ya logueado y lee el texto
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

const CUENTA = 'bomberoschillan';
const COOKIES_PATH = process.env.X_COOKIES_PATH || './cookies.json';
const SALIDA_PATH = process.env.SALIDA_PATH || '../../data/incidentes-chillan.json';
// El feed no avisa cuándo se cierra un incidente, así que expiramos solos —
// ajusta esto si ves que los pines duran mucho más o menos que la atención real.
const HORAS_EXPIRACION = 4;

async function cargarExistentes() {
  try {
    const raw = await fs.readFile(SALIDA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function main() {
  const cookiesRaw = await fs.readFile(COOKIES_PATH, 'utf-8');
  const cookies = JSON.parse(cookiesRaw);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  });
  await context.addCookies(cookies);
  const page = await context.newPage();

  await page.goto(`https://x.com/${CUENTA}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('article', { timeout: 30000 });
  // Deja que carguen algunos tweets más aparte de los primeros.
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(2000);

  const tweets = await page.$$eval('article', (nodos) =>
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

  await browser.close();

  const existentes = await cargarExistentes();
  const idsExistentes = new Set(existentes.map((e) => e.tweetUrl));

  const nuevos = [];
  for (const t of tweets) {
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
      id: `chillan-auto-${t.url.split('/status/')[1]}`,
      tipo: 'incidente',
      titulo: `${parsed.tipo} — ${parsed.calle1} / ${parsed.calle2}, ${parsed.comuna}`,
      nivelAlerta: nivelAlertaPorCarros(parsed.carros),
      estado: 'en_atencion',
      latitude: ubicacion.latitude,
      longitude: ubicacion.longitude,
      fecha: t.fechaIso || new Date().toISOString(),
      curadoManualmente: false,
      fuente: 'Automatizado — despacho VIPER vía @bomberoschillan',
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
