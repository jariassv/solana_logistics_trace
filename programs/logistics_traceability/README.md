# Programa Anchor — `logistics_traceability`

Contrato **TraceSol** en Solana (Anchor): actores, envíos, checkpoints e incidencias críticas.

Documentación general: [README principal](../../README.md).

---

## Instrucciones principales

`initialize`, `register_actor`, `create_shipment`, `record_checkpoint`, `report_critical_incident`, `cancel_shipment`, `confirm_delivery`.

El [backend](../../backend/README.md) sincroniza vía `POST /api/v1/*/sync`.

---

## Requisitos

- Rust `1.89.0` (`rust-toolchain.toml`)
- Anchor `0.32.x`
- Solana CLI

---

## Build y deploy (localnet)

```bash
solana-test-validator --reset
cd programs/logistics_traceability
solana config set --url localhost
anchor build
anchor deploy
```

Program id:

```bash
solana-keygen pubkey target/deploy/logistics_traceability-keypair.json
```

Propagar a `PROGRAM_ID` y `NEXT_PUBLIC_PROGRAM_ID`. Activar en `/consola`.

```bash
anchor keys sync -p logistics_traceability   # si cambia keypair
```

---

## Tests

```bash
cargo test -p tests --lib -- --test-threads=1
```

Validador + programa desplegados con el mismo `declare_id`.

---

## Estructura

- `programs/logistics_traceability/src/` — programa
- `tests/` — integración RPC
- `target/deploy/` — `.so` y keypair

---

## Orden de arranque

1. [infra](../../infra/README.md) → 2. **Anchor** → 3. [backend](../../backend/README.md) → 4. [frontend](../../frontend/README.md)

---

## Rama Git

Rama `solana/anchor` → merge a `main`.
