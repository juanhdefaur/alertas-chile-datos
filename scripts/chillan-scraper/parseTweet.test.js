import { parsearTweetDespacho } from './parseTweet.js';

const EJEMPLOS = [
  '10-6-2: Estamos respondiendo a una Emanación de gas en las esquinas de DIAGONAL LAS TERMAS y RIO VIEJO, en la comuna de CHILLÁN. Concurren 2 carros de Bomberos de Chillan #Chillán #H5 #B3',
  '10-0-1: Estamos respondiendo a una emergencia estructural en las esquinas de ISLA CHINCAO y ISLA SAN FELIX, en la comuna de CHILLÁN. Concurren 3 carros de Bomberos de Chillan #Chillán #B6 #B4 #B5',
  'Alarma de Incendio: Estamos respondiendo a INCENDIO en las esquinas de MATILDE URRUTIA CERDA y SAN CARLOS, en la comuna de CHILLÁN. Concurren 8 carros de Bomberos de Chillan #Chillán #B1 #B3 #B5 #B4 #B6 #K3 #X4 #K1',
  '10-0-1: Estamos respondiendo a un Incendio estructural en las esquinas de MATILDE URRUTIA CERDA y SAN CARLOS, en la comuna de CHILLÁN. Concurren 4 carros de Bomberos de Chillan #Chillán #B1 #B3 #B5 #B4',
  'Esto no calza con nada y debería devolver null',
];

let ok = 0;
let fail = 0;
for (const texto of EJEMPLOS) {
  const r = parsearTweetDespacho(texto);
  console.log(JSON.stringify(r));
  if (texto.startsWith('Esto no calza')) {
    if (r === null) ok++;
    else fail++;
  } else if (r && r.calle1 && r.calle2 && r.comuna && r.carros > 0) {
    ok++;
  } else {
    fail++;
  }
}
console.log(`\n${ok} ok, ${fail} fallidos`);
process.exit(fail > 0 ? 1 : 0);
