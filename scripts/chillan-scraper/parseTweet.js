// Parsea los tweets automáticos de VIPER para distintos Cuerpos de Bomberos.
// Formato real observado (siempre el mismo cuerpo, cambia solo el prefijo):
//   "10-6-2: Estamos respondiendo a una Emanación de gas en las esquinas de
//    DIAGONAL LAS TERMAS y RIO VIEJO, en la comuna de CHILLÁN. Concurren 2
//    carros de Bomberos de Chillan #Chillán #H5 #B3"
//   "Alarma de Incendio: Estamos respondiendo a INCENDIO en las esquinas de
//    MATILDE URRUTIA CERDA y SAN CARLOS, en la comuna de CHILLÁN. Concurren
//    8 carros de Bomberos de Chillan #Chillán #B1 #B3 #B5 #B4 #B6 #K3 #X4 #K1"
// El prefijo antes de "Estamos respondiendo a" varía (código VIPER o "Alarma
// de X:"), así que lo ignoramos y anclamos el parseo ahí.
//
// Caso especial: ubicaciones sin "cruce" real (puentes, rutas) vienen con la
// segunda calle vacía — "...en las esquinas de PUENTE LLACOLEN y , en la
// comuna de..." — por eso el grupo de calle2 usa (.*?) (cero o más), no
// (.+?): si queda vacío, en el código de más abajo lo tratamos como "una
// sola calle", no como un cruce.
const PATRON = /Estamos respondiendo a\s+(.+?)\s+en las esquinas de\s+(.+?)\s+y\s+(.*?),\s*en la comuna de\s+([^.]+)\.\s*Concurren\s+(\d+)\s+carros/i;

// "INCENDIO" (todo mayúscula) se ve como si gritara; "una Emanación de gas"
// ya viene bien capitalizado. Solo normalizamos cuando TODO el texto está en
// mayúsculas.
function normalizarTipo(texto) {
  const sinArticulo = texto.replace(/^(un|una)\s+/i, '').trim();
  if (sinArticulo === sinArticulo.toUpperCase()) {
    return sinArticulo.charAt(0) + sinArticulo.slice(1).toLowerCase();
  }
  return sinArticulo;
}

// Ojo: no usar \b\w para esto — \w en JS no reconoce letras acentuadas
// (á, é, í, ó, ú, ñ), así que "CHILLÁN" quedaba mal como "ChilláN".
function tituloCalle(calle) {
  return calle
    .trim()
    .toLowerCase()
    .split(' ')
    .map((palabra) => (palabra ? palabra.charAt(0).toUpperCase() + palabra.slice(1) : palabra))
    .join(' ');
}

// Devuelve null si el texto no calza con el formato esperado (mejor no
// publicar nada a que publiquemos algo mal interpretado).
export function parsearTweetDespacho(texto) {
  const m = texto.match(PATRON);
  if (!m) return null;
  const [, tipoRaw, calle1Raw, calle2Raw, comunaRaw, carrosRaw] = m;
  return {
    tipo: normalizarTipo(tipoRaw),
    calle1: tituloCalle(calle1Raw),
    calle2: calle2Raw.trim() ? tituloCalle(calle2Raw) : null,
    comuna: tituloCalle(comunaRaw),
    carros: parseInt(carrosRaw, 10),
  };
}
