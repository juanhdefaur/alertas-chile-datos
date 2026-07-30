// Heurística propia (NO es una escala oficial de Bomberos/VIPER): el texto del
// despacho no trae un nivel de alerta, así que aproximamos la severidad por la
// cantidad de carros que despachan — más carros, respuesta más grande. Mismo
// espíritu que RANGOS_CLUSTER en src/utils/severidad.js del lado de la app
// (que hace lo mismo con focos de calor satelitales).
export function nivelAlertaPorCarros(carros) {
  if (carros >= 6) return 'roja';
  if (carros >= 3) return 'naranja';
  return 'amarilla';
}
