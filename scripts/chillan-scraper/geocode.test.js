import { parsearTweetDespacho } from './parseTweet.js';
import { geocodificarInterseccion } from './geocode.js';

const EJEMPLOS = [
  '10-6-2: Estamos respondiendo a una Emanación de gas en las esquinas de DIAGONAL LAS TERMAS y RIO VIEJO, en la comuna de CHILLÁN. Concurren 2 carros de Bomberos de Chillan #Chillán #H5 #B3',
  '10-0-1: Estamos respondiendo a una emergencia estructural en las esquinas de ISLA CHINCAO y ISLA SAN FELIX, en la comuna de CHILLÁN. Concurren 3 carros de Bomberos de Chillan #Chillán #B6 #B4 #B5',
  'Alarma de Incendio: Estamos respondiendo a INCENDIO en las esquinas de MATILDE URRUTIA CERDA y SAN CARLOS, en la comuna de CHILLÁN. Concurren 8 carros de Bomberos de Chillan #Chillán #B1 #B3 #B5 #B4 #B6 #K3 #X4 #K1',
];

for (const texto of EJEMPLOS) {
  const parsed = parsearTweetDespacho(texto);
  const geo = await geocodificarInterseccion(parsed.calle1, parsed.calle2, parsed.comuna);
  console.log(`${parsed.calle1} y ${parsed.calle2} ->`, geo);
}
