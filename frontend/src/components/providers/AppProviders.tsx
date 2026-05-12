"use client";

import type { ReactNode } from "react";

import { WalletSessionProvider } from "@/lib/wallet/WalletSessionContext";

export function AppProviders({ children }: { children: ReactNode }) {
    return <WalletSessionProvider>{children}</WalletSessionProvider>;
}
