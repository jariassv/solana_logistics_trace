"use client";

import {
    shipmentCardActions,
    statusBadgeClass,
} from "@/lib/admin/shipmentActions";
import type { ShipmentListItem } from "@/lib/api/shipments";

export type AdminShipmentCardProps = {
    shipment: ShipmentListItem;
    role: string | null;
    programActive: boolean;
    actorOnChain: boolean;
    hasWallet: boolean;
    selected?: boolean;
    onViewDetail: (shipmentId: string) => void;
    onRecordEvent: (shipmentId: string) => void;
};

export function AdminShipmentCard({
    shipment,
    role,
    programActive,
    actorOnChain,
    hasWallet,
    selected,
    onViewDetail,
    onRecordEvent,
}: AdminShipmentCardProps) {
    const actions = shipmentCardActions({
        role,
        hasWallet,
        programActive,
        actorOnChain,
    });

    return (
        <article
            className={`admin-shipment-card card${selected ? " admin-shipment-card--selected" : ""}`}
            data-testid={`admin-shipment-card-${shipment.shipmentId}`}
        >
            <div className="card__bd admin-shipment-card__bd">
                <div className="admin-shipment-card__hd">
                    <span className={statusBadgeClass(shipment.status)}>{shipment.status}</span>
                    <span className="text-xs text-muted mono">#{shipment.onChainShipmentId}</span>
                </div>
                <h3 className="admin-shipment-card__title">{shipment.product}</h3>
                <p className="text-sm text-muted mb-2">
                    {shipment.requiresColdChain ? "Cadena de frío" : "Estándar"} ·{" "}
                    <time dateTime={shipment.createdAt}>{shipment.createdAt}</time>
                </p>
                <div className="admin-shipment-card__actions">
                    {actions.map((action) => {
                        const handler =
                            action.id === "view_detail"
                                ? () => onViewDetail(shipment.shipmentId)
                                : () => onRecordEvent(shipment.shipmentId);
                        return (
                            <button
                                key={action.id}
                                type="button"
                                className={
                                    action.id === "view_detail"
                                        ? "btn btn--ghost btn--sm"
                                        : "btn btn--secondary btn--sm"
                                }
                                disabled={!action.enabled}
                                title={action.reason}
                                onClick={handler}
                            >
                                {action.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </article>
    );
}
