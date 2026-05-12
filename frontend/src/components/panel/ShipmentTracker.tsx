"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getShipmentsForWallet, type ShipmentListItem } from "@/lib/api/shipments";

function statusBadgeClass(status: string): string {
    switch (status) {
        case "Delivered":
            return "badge badge--success";
        case "Cancelled":
            return "badge badge--danger";
        case "OutForDelivery":
            return "badge badge--info";
        default:
            return "badge badge--neutral";
    }
}

export type ShipmentTrackerProps = {
    apiBaseUrl: string;
    wallet: string;
};

export function ShipmentTracker({ apiBaseUrl, wallet }: ShipmentTrackerProps) {
    const [rows, setRows] = useState<ShipmentListItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getShipmentsForWallet(apiBaseUrl, wallet);
            if (!res.ok) {
                setRows(null);
                setError(`HTTP ${res.status}`);
                return;
            }
            setRows(res.data);
        } catch (e) {
            setRows(null);
            setError(e instanceof Error ? e.message : "Error de red");
        } finally {
            setLoading(false);
        }
    }, [apiBaseUrl, wallet]);

    useEffect(() => {
        void Promise.resolve().then(() => void load());
    }, [load]);

    return (
        <div className="panel-etapa2-tracker" data-testid="shipment-tracker">
            <div className="panel-etapa2-tracker__hd">
                <h2 className="panel-etapa2-title">Seguimiento de envíos</h2>
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => void load()}>
                    Actualizar
                </button>
            </div>
            {loading && <p className="text-muted text-sm">Cargando…</p>}
            {error && <p className="text-sm" role="alert">{error}</p>}
            {!loading && rows && rows.length === 0 && (
                <p className="text-muted text-sm">No hay envíos para esta wallet.</p>
            )}
            {rows && rows.length > 0 && (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>On-chain</th>
                                <th>Producto</th>
                                <th>Estado</th>
                                <th>Creado</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.shipmentId}>
                                    <td className="mono text-sm">{r.shipmentId.slice(0, 8)}…</td>
                                    <td className="mono text-sm">{r.onChainShipmentId}</td>
                                    <td>{r.product}</td>
                                    <td>
                                        <span className={statusBadgeClass(r.status)}>{r.status}</span>
                                    </td>
                                    <td className="text-sm text-muted">{r.createdAt}</td>
                                    <td>
                                        <Link
                                            prefetch={false}
                                            className="btn btn--ghost btn--sm"
                                            href={`/panel/envios/${encodeURIComponent(r.shipmentId)}`}
                                        >
                                            Ver
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
