"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useConsolaAccess } from "@/lib/consola/useConsolaAccess";

export type ConsolaNavLinkProps = {
    className?: string;
    children: ReactNode;
};

/** Enlace a Consola solo si la wallet conectada puede acceder. */
export function ConsolaNavLink({ className, children }: ConsolaNavLinkProps) {
    const { canAccess, loading } = useConsolaAccess();
    if (loading || !canAccess) {
        return null;
    }
    return (
        <Link prefetch={false} className={className} href="/consola">
            {children}
        </Link>
    );
}
