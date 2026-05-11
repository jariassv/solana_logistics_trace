"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const NAV = [
    { href: "/", label: "Inicio" },
    { href: "/panel", label: "Panel" },
    { href: "/demo", label: "Demo Etapa 1" },
    { href: "/sistema", label: "Sistema" },
] as const;

function navClass(active: boolean): string {
    return active ? "is-active" : "";
}

export function SiteHeader() {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [navReady, setNavReady] = useState(false);

    useEffect(() => {
        let alive = true;
        queueMicrotask(() => {
            if (alive) {
                setNavReady(true);
            }
        });
        return () => {
            alive = false;
        };
    }, []);

    const closeMenu = useCallback(() => setMenuOpen(false), []);

    return (
        <>
            <header className="site-header">
                <div className="header-inner">
                    <Link
                        href="/"
                        className="brand"
                        aria-label="TraceSol Logistics inicio"
                        prefetch={false}
                    >
                        <span className="brand__icon" aria-hidden="true">
                            ◇
                        </span>
                        TraceSol Logistics
                    </Link>
                    <nav className="nav-main" aria-label="Principal">
                        {NAV.map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                prefetch={false}
                                className={navClass(navReady && pathname === href)}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>
                    <div className="nav-actions">
                        <Link
                            prefetch={false}
                            className="btn btn--ghost btn--sm"
                            href="/demo"
                        >
                            Probar flujo
                        </Link>
                        <Link
                            prefetch={false}
                            className="btn btn--primary btn--sm"
                            href="/panel"
                        >
                            Panel
                        </Link>
                        <button
                            type="button"
                            className="mobile-toggle"
                            aria-expanded={menuOpen}
                            aria-controls="mobile-menu"
                            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
                            onClick={() => setMenuOpen((o) => !o)}
                        >
                            ☰
                        </button>
                    </div>
                </div>
            </header>
            <div
                className={`mobile-nav${menuOpen ? " is-open" : ""}`}
                id="mobile-menu"
                role="dialog"
                aria-label="Menú móvil"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        closeMenu();
                    }
                }}
            >
                <div className="mobile-nav__panel">
                    {NAV.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            prefetch={false}
                            className={navClass(navReady && pathname === href)}
                            onClick={closeMenu}
                        >
                            {label}
                        </Link>
                    ))}
                </div>
            </div>
        </>
    );
}
