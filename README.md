# alertas-chile-datos

Datos públicos generados automáticamente para [Alertas Chile](https://github.com/juanhdefaur/alertas-chile).

- `data/incidentes-chillan.json` — incidentes de Cuerpos de Bomberos que usan VIPER (despacho automatizado), actualizado cada 10 minutos por un GitHub Action. El nombre del archivo quedó de cuando era solo Chillán; hoy cubre también Concepción, Coihueco, Coronel y Coquimbo (ver `CUENTAS` en `scripts/chillan-scraper/scrape.js`).
- `scripts/chillan-scraper/` — el scraper. Ver [scripts/chillan-scraper/README.md](scripts/chillan-scraper/README.md) para configurarlo.

**No es información oficial de Bomberos ni de VIPER** — es una extracción automatizada de contenido público, con clasificación de severidad hecha por heurística propia. Ver el README del scraper para el detalle.
