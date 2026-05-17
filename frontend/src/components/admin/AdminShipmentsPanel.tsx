"use client";

import {
    AdminShipmentCard,
    adminShipmentDetailHref,
} from "@/components/admin/AdminShipmentCard";
import { canCreateShipmentAction } from "@/lib/admin/shipmentActions";
import type { ShipmentListItem } from "@/lib/api/shipments";

export type AdminShipmentsPanelProps = {
    rows: ShipmentListItem[];
    loading: boolean;
    role: string | null;
    programActive: boolean;
    programConfigured: boolean;
    actorOnChain: boolean | null;
    actorLoading?: boolean;
    hasWallet: boolean;
    onRecordEvent: (shipmentId: string) => void;
    onCreateShipment: () => void;
};

export function AdminShipmentsPanel({
    rows,
    loading,
    role,
    programActive,
    programConfigured,
    actorOnChain,
    actorLoading,
    hasWallet,
    onRecordEvent,
    onCreateShipment,
}: AdminShipmentsPanelProps) {
    const createAction = canCreateShipmentAction({
        role,
        hasWallet,
        programActive,
        actorOnChain,
    });

    return (
        <section className="admin-section admin-shipments-panel" aria-labelledby="admin-shipments-title">
            <header className="admin-section__head admin-shipments-panel__head">
                <div>
                    <h2 id="admin-shipments-title" className="admin-section__title">
                        Listado de envíos
                    </h2>
                    <p className="admin-section__desc">
                        Acciones disponibles en cada tarjeta según su rol.
                    </p>
                </div>
                <button
                    type="button"
                    className="btn btn--primary"
                    disabled={!createAction.enabled}
                    title={createAction.reason}
                    onClick={onCreateShipment}
                >
                    Registrar envío
                </button>
            </header>

            {loading ? (
                <p className="admin-shipments-panel__status text-muted">Cargando envíos…</p>
            ) : rows.length === 0 ? (
                <div className="admin-shipments-panel__empty card">
                    <div className="card__bd">
                        <p className="admin-section__desc mb-0">
                            No hay envíos que coincidan con los filtros. Ajuste la búsqueda o
                            registre un nuevo envío si tiene rol Sender.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="admin-shipments-panel__grid" data-testid="admin-shipments-grid">
                    {rows.map((shipment) => (
                        <AdminShipmentCard
                            key={shipment.shipmentId}
                            shipment={shipment}
                            role={role}
                            programConfigured={programConfigured}
                            actorOnChain={actorOnChain}
                            actorLoading={actorLoading}
                            hasWallet={hasWallet}
                            detailHref={adminShipmentDetailHref(shipment.shipmentId)}
                            onRecordEvent={onRecordEvent}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
