"use client";

import { IconLink } from "@/components/ui/TraceIcons";
import { getPublicConfig } from "@/lib/env";
import { solanaExplorerTxUrl } from "@/lib/solana/explorer";
import { maskTxSignature } from "@/lib/wallet/display";

export type ShipmentCreationTxHashProps = {
    txHash: string;
    /** Etiqueta visible (por defecto «Tx blockchain»). */
    label?: string;
    className?: string;
};

/** Firma de la transacción que creó el envío on-chain. */
export function ShipmentCreationTxHash({
    txHash,
    label = "Tx blockchain",
    className,
}: ShipmentCreationTxHashProps) {
    const trimmed = txHash.trim();
    if (!trimmed) {
        return null;
    }

    const { network } = getPublicConfig();
    const explorerUrl = solanaExplorerTxUrl(trimmed, network);
    const masked = maskTxSignature(trimmed);

    return (
        <p
            className={["shipment-timeline__tx shipment-creation-tx", className]
                .filter(Boolean)
                .join(" ")}
        >
            <IconLink className="trace-icon shipment-timeline__tx-icon" />
            <span className="shipment-timeline__tx-label">{label}</span>
            {explorerUrl ? (
                <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shipment-timeline__tx-hash mono shipment-creation-tx__link"
                    title={trimmed}
                >
                    {masked}
                </a>
            ) : (
                <code className="shipment-timeline__tx-hash mono" title={trimmed}>
                    {masked}
                </code>
            )}
        </p>
    );
}
