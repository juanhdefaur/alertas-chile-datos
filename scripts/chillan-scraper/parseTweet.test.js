import { parsearTweetDespacho } from './parseTweet.js';

const CASOS = [
  {
    texto:
      '10-6-2: Estamos respondiendo a una Emanación de gas en las esquinas de DIAGONAL LAS TERMAS y RIO VIEJO, en la comuna de CHILLÁN. Concurren 2 carros de Bomberos de Chillan #Chillán #H5 #B3',
    esperado: { calle1: 'Diagonal Las Termas', calle2: 'Rio Viejo', comuna: 'Chillán', carros: 2 },
  },
  {
    texto:
      '10-0-1: Estamos respondiendo a una emergencia estructural en las esquinas de ISLA CHINCAO y ISLA SAN FELIX, en la comuna de CHILLÁN. Concurren 3 carros de Bomberos de Chillan #Chillán #B6 #B4 #B5',
    esperado: { calle1: 'Isla Chincao', calle2: 'Isla San Felix', comuna: 'Chillán', carros: 3 },
  },
  {
    texto:
      'Alarma de Incendio: Estamos respondiendo a INCENDIO en las esquinas de MATILDE URRUTIA CERDA y SAN CARLOS, en la comuna de CHILLÁN. Concurren 8 carros de Bomberos de Chillan #Chillán #B1 #B3 #B5 #B4 #B6 #K3 #X4 #K1',
    esperado: { calle1: 'Matilde Urrutia Cerda', calle2: 'San Carlos', comuna: 'Chillán', carros: 8 },
  },
  {
    texto:
      '10-0-1: Estamos respondiendo a un Incendio estructural en las esquinas de MATILDE URRUTIA CERDA y SAN CARLOS, en la comuna de CHILLÁN. Concurren 4 carros de Bomberos de Chillan #Chillán #B1 #B3 #B5 #B4',
    esperado: { calle1: 'Matilde Urrutia Cerda', calle2: 'San Carlos', comuna: 'Chillán', carros: 4 },
  },
  {
    // Puentes/rutas sin cruce real: VIPER manda la segunda calle vacía.
    texto:
      '10-4-2: Estamos respondiendo a un Rescate en accidente de tránsito en las esquinas de PUENTE LLACOLEN y , en la comuna de CONCEPCIÓN. Concurren 2 carros de Bomberos de Concepción #Concepción #RX4 #H1',
    esperado: { calle1: 'Puente Llacolen', calle2: null, comuna: 'Concepción', carros: 2 },
  },
  {
    texto: 'Esto no calza con nada y debería devolver null',
    esperado: null,
  },
];

let ok = 0;
let fail = 0;
for (const { texto, esperado } of CASOS) {
  const r = parsearTweetDespacho(texto);
  console.log(JSON.stringify(r));
  const pasa =
    esperado === null
      ? r === null
      : r &&
        r.calle1 === esperado.calle1 &&
        r.calle2 === esperado.calle2 &&
        r.comuna === esperado.comuna &&
        r.carros === esperado.carros;
  if (pasa) ok++;
  else {
    fail++;
    console.log('  ^ FALLO, esperaba:', JSON.stringify(esperado));
  }
}
console.log(`\n${ok} ok, ${fail} fallidos`);
process.exit(fail > 0 ? 1 : 0);
