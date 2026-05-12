"use client";

import {
    SHIPMENT_MAIN_FLOW,
    shouldShowExceptionBadge,
    stepStateForStatus,
} from "@/lib/panel/shipmentLifecycle";

export type ShipmentStatusRailProps = {
    status: string;
};

/**
 * Rail horizontal minimalista: la etapa actual gana énfasis (escala y sombra).
 */
export function ShipmentStatusRail({ status }: ShipmentStatusRailProps) {
    return (
        <div className="shipment-rail" data-testid="shipment-status-rail" aria-label="Etapas del envío">
            <div className="shipment-rail__track" aria-hidden="true" />
            <ol className="shipment-rail__steps">
                {SHIPMENT_MAIN_FLOW.map((step) => {
                    const st = stepStateForStatus(status, step.code);
                    const cls = [
                        "shipment-rail__step",
                        st === "current" && "is-current",
                        st === "past" && "is-past",
                        st === "future" && "is-future",
                        st === "offpath" && "is-muted",
                    ]
                        .filter(Boolean)
                        .join(" ");
                    return (
                        <li key={step.code} className={cls}>
                            <span className="shipment-rail__dot" aria-hidden="true" />
                            <span className="shipment-rail__label">{step.label}</span>
                            <span className="shipment-rail__code mono">{step.code}</span>
                        </li>
                    );
                })}
            </ol>
            {shouldShowExceptionBadge(status) && (
                <p className="shipment-rail__terminal text-sm mt-2 mb-0" role="status">
                    <span className="badge badge--danger">{status}</span>
                </p>
            )}
        </div>
    );
}
