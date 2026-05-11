import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { DeferredSiteHeader } from "@/components/layout/SiteHeaderLoader";
import { SiteFooter } from "@/components/layout/SiteFooter";

import "@/styles/tracesol.css";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "TraceSol Logistics · Trazabilidad",
    description:
        "Visibilidad logística y demo Etapa 1: actor, envío y checkpoint en Solana con sync al backend.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" className={inter.variable} suppressHydrationWarning>
            <body suppressHydrationWarning>
                <DeferredSiteHeader />
                {children}
                <SiteFooter />
            </body>
        </html>
    );
}
