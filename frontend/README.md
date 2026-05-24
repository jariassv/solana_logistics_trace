# Frontend — TraceSol Logistics

Aplicación **Next.js** con **Phantom** para operación logística, consulta pública y administración.

Documentación general: [README principal](../README.md).

---

## Funcionalidades

| Área | Rutas |
|------|-------|
| Landing | `/` |
| Consulta pública | `/envios`, `/envios/[id]` |
| Registro | `/registro` |
| Panel | `/panel/*` |
| Admin | `/admin/*` |
| Consola | `/consola` |
| Demo Etapa 1 | `/demo` |

Mapa de recorrido, timeline, incidencias críticas on-chain y anclaje de alertas del motor.

---

## Requisitos

- Node.js / npm
- Backend y Postgres — [backend/README.md](../backend/README.md)
- Programa Solana en la red configurada
- Phantom para firmar

---

## Configuración

```bash
cp .env.example .env.local
```

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Con `/api/v1`, sin barra final |
| `NEXT_PUBLIC_PROGRAM_ID` | Igual que `PROGRAM_ID` del backend |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | RPC del navegador |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `localnet`, `devnet`, … |

---

## Desarrollo

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)

```bash
npm run lint && npm run build && npm test
```

---

## Flujo típico

1. Stack [infra](../infra/README.md) + [Anchor](../programs/logistics_traceability/README.md) + [backend](../backend/README.md)
2. `/consola` — activar programa
3. `/registro` — actor
4. `/panel` — operación

Sin `NEXT_PUBLIC_API_BASE_URL` no hay sync a Postgres.

---

## Rama Git

Rama `frontend` → merge a `main`.
