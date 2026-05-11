"use client";

import dynamic from "next/dynamic";

/** Formulario con Phantom/Web3 pesado solo en cliente: evita desajuste SSR/recuperación hidratación. */
const Etapa1DemoLazy = dynamic(
    () =>
        import("@/components/Etapa1Demo").then((m) => ({
            default: m.Etapa1Demo,
        })),
    {
        ssr: false,
        loading: () => (
            <p className="text-muted text-sm" aria-busy="true">
                Cargando la demo técnica…
            </p>
        ),
    },
);

export function Etapa1DemoIsland() {
    return <Etapa1DemoLazy />;
}
