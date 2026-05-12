"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

function shortPubkey(pk: string, head = 4, tail = 4): string {
    if (pk.length <= head + tail + 1) {
        return pk;
    }
    return `${pk.slice(0, head)}…${pk.slice(-tail)}`;
}

type NavSpec = {
    href: string;
    label: string;
    enabled: (s: { wallet: string | null; role: string | null }) => boolean;
    disabledTitle: (s: { wallet: string | null; role: string | null }) => string;
};

const NAV_SPECS: NavSpec[] = [
    { href: "/", label: "Inicio", enabled: () => true, disabledTitle: () => "" },
    { href: "/envios", label: "Envíos", enabled: () => true, disabledTitle: () => "" },
    { href: "/registro", label: "Registro", enabled: () => true, disabledTitle: () => "" },
    {
        href: "/admin",
        label: "Admin",
        enabled: ({ wallet }) => Boolean(wallet),
        disabledTitle: () => "Conecte la wallet con el botón superior",
    },
    { href: "/consola", label: "Consola", enabled: () => true, disabledTitle: () => "" },
];

function navClass(active: boolean, disabled: boolean): string {
    const base = active ? "is-active" : "";
    if (disabled) {
        return `${base} nav-main__link--disabled`.trim();
    }
    return base;
}

export function SiteHeader() {
    const pathname = usePathname();
    const { wallet, role, actorLoading, connectError, connect, disconnect } = useWalletSession();
    const [menuOpen, setMenuOpen] = useState(false);
    const [navReady, setNavReady] = useState(false);

    const navState = useMemo(() => ({ wallet, role }), [wallet, role]);

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

    useEffect(() => {
        let alive = true;
        queueMicrotask(() => {
            if (alive) {
                setMenuOpen(false);
            }
        });
        return () => {
            alive = false;
        };
    }, [pathname]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }
        const mq = window.matchMedia("(min-width: 900px)");
        const closeOnDesktop = () => {
            if (mq.matches) {
                setMenuOpen(false);
            }
        };
        closeOnDesktop();
        mq.addEventListener("change", closeOnDesktop);
        return () => mq.removeEventListener("change", closeOnDesktop);
    }, []);

    const closeMenu = useCallback(() => setMenuOpen(false), []);

    const renderNavLink = (spec: NavSpec) => {
        const active =
            spec.href === "/"
                ? pathname === "/"
                : navReady && (pathname === spec.href || pathname.startsWith(`${spec.href}/`));
        const enabled = spec.enabled(navState);
        const title = !enabled ? spec.disabledTitle(navState) : undefined;

        if (!enabled) {
            return (
                <span
                    key={spec.href}
                    className={navClass(Boolean(active), true)}
                    title={title}
                    aria-disabled="true"
                >
                    {spec.label}
                </span>
            );
        }

        return (
            <Link
                key={spec.href}
                href={spec.href}
                prefetch={false}
                className={navClass(Boolean(active), false)}
                title={title}
            >
                {spec.label}
            </Link>
        );
    };

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
                        {NAV_SPECS.map(renderNavLink)}
                    </nav>
                    <div className="header-wallet" aria-label="Wallet">
                        {connectError ? (
                            <p
                                className="header-wallet__error"
                                role="alert"
                                data-testid="header-wallet-error"
                            >
                                {connectError}
                            </p>
                        ) : null}
                        {wallet ? (
                            <div className="header-wallet__connected">
                                <span
                                    className="header-wallet__pk mono"
                                    title={wallet}
                                    data-testid="header-wallet-pk"
                                >
                                    {shortPubkey(wallet)}
                                </span>
                                {actorLoading ? (
                                    <span className="header-wallet__role text-muted text-xs">
                                        Rol…
                                    </span>
                                ) : role ? (
                                    <span
                                        className="header-wallet__role badge badge--neutral"
                                        data-testid="header-wallet-role"
                                    >
                                        {role}
                                    </span>
                                ) : (
                                    <span
                                        className="header-wallet__role text-muted text-xs"
                                        title="Wallet sin actor registrado en backend"
                                    >
                                        Sin registro
                                    </span>
                                )}
                                <button
                                    type="button"
                                    className="btn btn--ghost btn--sm"
                                    data-testid="header-wallet-disconnect"
                                    onClick={() => void disconnect()}
                                >
                                    Desconectar
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="btn btn--primary btn--sm"
                                data-testid="header-wallet-connect"
                                onClick={() => void connect()}
                            >
                                Conectar wallet
                            </button>
                        )}
                    </div>
                    <div className="nav-actions">
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
                    {NAV_SPECS.map((spec) => {
                        const active =
                            spec.href === "/"
                                ? pathname === "/"
                                : navReady &&
                                  (pathname === spec.href ||
                                      pathname.startsWith(`${spec.href}/`));
                        const enabled = spec.enabled(navState);
                        const title = !enabled ? spec.disabledTitle(navState) : undefined;
                        if (!enabled) {
                            return (
                                <span
                                    key={spec.href}
                                    className={navClass(Boolean(active), true)}
                                    title={title}
                                    aria-disabled="true"
                                >
                                    {spec.label}
                                </span>
                            );
                        }
                        return (
                            <Link
                                key={spec.href}
                                href={spec.href}
                                prefetch={false}
                                className={navClass(Boolean(active), false)}
                                onClick={closeMenu}
                                title={title}
                            >
                                {spec.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
