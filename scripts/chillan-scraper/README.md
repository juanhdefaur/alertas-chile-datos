# Scraper de despachos VIPER (Bomberos Chillán + Concepción)

Lee los tweets automáticos que VIPER publica para varios Cuerpos de Bomberos
(ver `CUENTAS` en `scrape.js` — hoy `@bomberoschillan` y `@CentralCBC`),
extrae tipo de incidente + intersección, geocodifica con Nominatim y guarda
el resultado en `data/incidentes-chillan.json`. La app lo lee desde ahí (vía
`raw.githubusercontent.com`, sin backend propio).

Agregar otra ciudad es tan simple como sumar su handle de X a `CUENTAS` en
`scrape.js`, siempre que use el mismo formato de tweet ("Estamos respondiendo
a ... en las esquinas de ... y ..., en la comuna de ... Concurren N carros").

## Antes de empezar — léelo en serio

- **No es un dato oficial.** El nivel de alerta (`amarilla`/`naranja`/`roja`)
  es una heurística nuestra basada en la cantidad de carros despachados, no
  una clasificación de Bomberos. Está documentado en `severidad.js`.
- **Usa una cuenta de X desechable, no la tuya personal.** Leer X de forma
  automatizada viola sus Términos de Servicio; hay riesgo real de que la
  cuenta usada quede suspendida.
- **Este proyecto nunca ve tu contraseña.** Tú te logueas en tu navegador,
  exportas las cookies de sesión ya generadas, y esas cookies (no tu clave)
  son lo único que se guarda como secret de GitHub.
- Este scraper puede dejar de funcionar sin aviso si X cambia su interfaz —
  revisa el workflow de vez en cuando (pestaña "Actions" del repo en GitHub).

## 1. Crear la cuenta desechable

Crea una cuenta nueva de X solo para esto. Sigue a
[@bomberoschillan](https://x.com/bomberoschillan) y
[@CentralCBC](https://x.com/CentralCBC) (opcional, pero ayuda a que el feed
cargue rápido). Ojo: son cuentas institucionales — publican tanto despachos
automáticos de VIPER como comunicados generales; el scraper descarta solo lo
que no calce con el formato de despacho.

## 2. Exportar las cookies de sesión

1. Instala la extensión de navegador **Cookie-Editor** (Chrome/Firefox).
2. Entra a x.com con la cuenta desechable, logueado.
3. Abre Cookie-Editor sobre la pestaña de x.com, click en "Export" → "Export as JSON".
4. Guarda ese JSON en tu computador (por ejemplo `cookies.json`) — **no lo
   subas al repo ni lo compartas**, es equivalente a tu sesión logueada.

## 3. Cargarlo como secret de GitHub

En el repo de GitHub: **Settings → Secrets and variables → Actions → New
repository secret**.

- Nombre: `X_COOKIES_JSON`
- Valor: el contenido completo del JSON exportado en el paso 2.

## 4. Probarlo localmente (opcional, recomendado antes de confiar en el cron)

```bash
cd scripts/chillan-scraper
npm install
npx playwright install chromium
# copia tu cookies.json exportado en esta carpeta
X_COOKIES_PATH=./cookies.json SALIDA_PATH=../../data/incidentes-chillan.json node scrape.js
```

Revisa `data/incidentes-chillan.json` — debería tener los incidentes vigentes
de las últimas `HORAS_EXPIRACION` horas (4 por defecto, en `scrape.js`).

## 5. Activar el cron

El workflow `.github/workflows/scrape-chillan.yml` ya está configurado para
correr cada 10 minutos una vez que el secret `X_COOKIES_JSON` exista. También
puedes dispararlo a mano desde la pestaña "Actions" → "Scraper Bomberos
Chillán" → "Run workflow".

## Ajustes que probablemente quieras tocar

- `severidad.js`: umbrales de carros → nivel de alerta.
- `geocode.js`: `DISTANCIA_MAXIMA_KM` (qué tan lejos puede estar el par de
  calles geocodificadas antes de descartar el resultado).
- `scrape.js`: `HORAS_EXPIRACION` (cuánto dura un incidente en el mapa si no
  hay señal de que terminó).
