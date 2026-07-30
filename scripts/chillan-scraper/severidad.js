// Heurística propia (NO es una escala oficial de Bomberos/VIPER): el texto del
// despacho no trae un nivel de alerta, así que en principio se podría
// aproximar la severidad por la cantidad de carros que despachan (más
// carros, respuesta más grande) — pero por ahora, mientras validamos que el
// pipeline sea confiable, dejamos todo en modo aviso (amarillo) sin escalar
// por color. Para reactivar la escala, cambiar el cuerpo de esta función.
export function nivelAlertaPorCarros(_carros) {
  return 'amarilla';
}
