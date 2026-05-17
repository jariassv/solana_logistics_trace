"use client";

import { AdminShipmentCard } from "@/components/admin/AdminShipmentCard";
import { AdminShipmentDetailModal } from "@/components/admin/AdminShipmentDetailModal";
import type { ShipmentListItem } from "@/lib/api/shipments";

export type AdminShipmentsPanelProps = {
    rows: ShipmentListItem[] | null;
    loading: boolean;
    role: string | null;
    wallet: string | null;
    apiBaseUrl: string;
    programActive: boolean;
    actorOnChain: boolean;
    selectedShipmentId: string | null;
    detailShipmentId: string | null;
    onSelectShipment: (shipmentId: string) => void;
    onRecordEvent: (shipmentId: string) => void;
    onOpenDetail: (shipmentId: string) => void;
    onCloseDetail: () => void;
};

export function AdminShipmentsPanel({
    rows,
    loading,
    role,
    wallet,
    apiBaseUrl,
    programActive,
    actorOnChain,
    selectedShipmentId,
    onSelectShipment,
    onRecordEvent,
    detailShipmentId,
    onOpenDetail,
    onCloseDetail,
}: AdminShipmentsPanelProps) {
    return (
        <section className="admin-shipments-panel" aria-labelledby="admin-shipments-title">
            <header className="admin-shipments-panel__hd">
                <div>
                    <h2 id="admin-shipments-title" className="admin-shipments-panel__title">
                        Envíos y eventos
                    </h2>
                    <p className="text-sm text-muted mb-0">
                        Seleccione un envío para ver el detalle o registrar un evento según su rol.
                    </p>
                </div>
            </header>

            {loading ? (
                <p className="text-sm text-muted">Cargando envíos…</p>
            ) : !rows?.length ? (
                <div className="admin-shipments-panel__empty card">
                    <div className="card__bd text-sm text-muted">
                        <p className="mb-0">
                            No hay envíos visibles para su cartera. Un remitente (Sender) debe
                            registrar un envío desde el proceso guiado.
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
                            programActive={programActive}
                            actorOnChain={actorOnChain}
                            hasWallet={Boolean(wallet)}
                            selected={selectedShipmentId === shipment.shipmentId}
                            onViewDetail={onOpenDetail}
                            onRecordEvent={(id) => {
                                onSelectShipment(id);
                                onRecordEvent(id);
                            }}
                        />
                    ))}
                </div>
            )}

            <AdminShipmentDetailModal
                open={detailShipmentId !== null}
                shipmentId={detailShipmentId}
                apiBaseUrl={apiBaseUrl}
                wallet={wallet}
                role={role}
                programActive={programActive}
                actorOnChain={actorOnChain}
                onClose={onCloseDetail}
                onRecordEvent={(id) => {
                    onCloseDetail();
                    onSelectShipment(id);
                    onRecordEvent(id);
                }}
            />
        </section>
    );
}
