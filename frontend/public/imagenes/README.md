# Referencias visuales (`/imagenes`)

Coloca aquí recursos estáticos que alimenten la UI (sin import desde bundler: rutas absolutas `/imagenes/...`).

| Archivo (sugerido) | Uso |
|--------------------|-----|
| `timeline-spine.svg` | Línea guía opcional del rail de etapas (envíos). |
| `logo-mark.svg` | Marca compacta para header o landing. |
| `stage-*.svg` | Iconos opcionales por etapa de envío. |

El componente `ShipmentStatusRail` puede referenciar estos archivos en CSS con `background-image: url('/imagenes/timeline-spine.svg')`.
