"use client";

import type { ShipmentDetail } from "@/lib/api/shipments";
import {
    formatQuantityLine,
    formatWeightKg,
    priorityLabel,
} from "@/lib/shipment/shipmentDetailsForm";

export type ShipmentOperationalDetailsProps = {
    detail: ShipmentDetail;
    /** Clase raíz opcional (p. ej. shipment-hero__metrics). */
    className?: string;
    /** Si true, usa rejilla de métricas del hero; si false, lista en resumen. */
    variant?: "metrics" | "summary";
};

function formatDateOnly(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
    } catch {
        return iso;
    }
}

export function hasOperationalDetails(detail: ShipmentDetail): boolean {
    return (
        detail.weightKg != null ||
        detail.quantity != null ||
        detail.estimatedDeliveryAt != null ||
        detail.referenceCode != null ||
        detail.notes != null ||
        detail.priority !== "normal"
    );
}

export function ShipmentOperationalDetails({
    detail,
    className,
    variant = "metrics",
}: ShipmentOperationalDetailsProps) {
    if (!hasOperationalDetails(detail)) {
        return null;
    }

    if (variant === "summary") {
        return (
            <div className={className}>
                {detail.weightKg != null ? (
                    <p className="mb-1">
                        <span className="text-muted">Peso:</span> {formatWeightKg(detail.weightKg)}
                    </p>
                ) : null}
                {detail.quantity != null ? (
                    <p className="mb-1">
                        <span className="text-muted">Cantidad:</span>{" "}
                        {formatQuantityLine(detail.quantity, detail.quantityUnit)}
                    </p>
                ) : null}
                {detail.estimatedDeliveryAt ? (
                    <p className="mb-1">
                        <span className="text-muted">Entrega estimada:</span>{" "}
                        <time dateTime={detail.estimatedDeliveryAt}>
                            {formatDateOnly(detail.estimatedDeliveryAt)}
                        </time>
                    </p>
                ) : null}
                {detail.referenceCode ? (
                    <p className="mb-1">
                        <span className="text-muted">Referencia:</span>{" "}
                        <span className="mono">{detail.referenceCode}</span>
                    </p>
                ) : null}
                {detail.priority !== "normal" ? (
                    <p className="mb-1">
                        <span className="text-muted">Prioridad:</span>{" "}
                        {priorityLabel(detail.priority)}
                    </p>
                ) : null}
                {detail.notes ? (
                    <p className="mb-0">
                        <span className="text-muted">Notas:</span> {detail.notes}
                    </p>
                ) : null}
            </div>
        );
    }

    return (
        <>
            {detail.weightKg != null ? (
                <div className={`shipment-hero__metric${className ? ` ${className}` : ""}`}>
                    <dt>Peso</dt>
                    <dd>{formatWeightKg(detail.weightKg)}</dd>
                </div>
            ) : null}
            {detail.quantity != null ? (
                <div className="shipment-hero__metric">
                    <dt>Cantidad</dt>
                    <dd>{formatQuantityLine(detail.quantity, detail.quantityUnit)}</dd>
                </div>
            ) : null}
            {detail.priority !== "normal" ? (
                <div className="shipment-hero__metric">
                    <dt>Prioridad</dt>
                    <dd>{priorityLabel(detail.priority)}</dd>
                </div>
            ) : null}
            {detail.referenceCode ? (
                <div className="shipment-hero__metric">
                    <dt>Referencia</dt>
                    <dd className="mono">{detail.referenceCode}</dd>
                </div>
            ) : null}
            {detail.estimatedDeliveryAt ? (
                <div className="shipment-hero__metric">
                    <dt>Entrega est.</dt>
                    <dd>
                        <time dateTime={detail.estimatedDeliveryAt}>
                            {formatDateOnly(detail.estimatedDeliveryAt)}
                        </time>
                    </dd>
                </div>
            ) : null}
            {detail.notes ? (
                <p className="shipment-hero__notes text-sm text-muted mb-0 mt-2">
                    <strong>Notas:</strong> {detail.notes}
                </p>
            ) : null}
        </>
    );
}
