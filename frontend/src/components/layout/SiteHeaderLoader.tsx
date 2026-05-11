"use client";

import dynamic from "next/dynamic";

/**
 * El header navega por `pathname` + enlaces prefetch; cargarlo solo en el cliente elimina hidrataciones
 * incoherentes con extensiones/RSC.
 */
export const DeferredSiteHeader = dynamic(
    () =>
        import("./SiteHeader").then((m) => ({
            default: m.SiteHeader,
        })),
    {
        ssr: false,
        loading: () => (
            <header className="site-header" aria-busy="true">
                <div
                    className="header-inner"
                    style={{
                        minHeight: "var(--header-height)",
                        boxSizing: "border-box",
                    }}
                />
            </header>
        ),
    },
);
