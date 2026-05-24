"use client";

import { JourneyStepTooltip } from "@/components/shipments/JourneyStepTooltip";
import { JourneyStepIcon, IconMapPin } from "@/components/ui/TraceIcons";
import { useLocationsCatalog } from "@/lib/api/useLocationsCatalog";
import type { CheckpointItem } from "@/lib/api/shipments";
import type { IncidentItem } from "@/lib/api/incidents";
import { resolveLossJourneyStepId } from "@/lib/incidents/criticalIncidentFlow";
import { resolveEndpointDisplay } from "@/lib/shipments/locationEndpoint";
import {
    buildEndpointInsight,
    buildJourneyStepInsight,
    exceptionStatusLabel,
    journeyRailStatusCaption,
    resolveJourneyStepStates,
    resolveNowStepId,
} from "@/lib/shipments/journeyTimeline";

export type ShipmentJourneyTimelineProps = {
    origin: string;
    destination: string;
    status: string;
    checkpoints: CheckpointItem[];
    createdAt: string;
    apiBaseUrl?: string;
    incidents?: readonly IncidentItem[];
};

export function ShipmentJourneyTimeline({
    origin,
    destination,
    status,
    checkpoints,
    createdAt,
    apiBaseUrl,
    incidents = [],
}: ShipmentJourneyTimelineProps) {
    const { items: locationCatalog } = useLocationsCatalog(apiBaseUrl);
    const originDisplay = resolveEndpointDisplay(origin, locationCatalog);
    const destinationDisplay = resolveEndpointDisplay(destination, locationCatalog);
    const logisticsTypes = checkpoints
        .filter((c) => c.type !== "SensorData" && !c.actor.startsWith("system@"))
        .map((c) => c.type);
    const steps = resolveJourneyStepStates(status, logisticsTypes);
    const nowStepId = resolveNowStepId(checkpoints, createdAt);
    const lossStepId = resolveLossJourneyStepId(incidents, status, checkpoints);
    const exception = exceptionStatusLabel(status);

    const originInsight = buildEndpointInsight(
        "origin",
        originDisplay.title,
        originDisplay.subtitle,
        checkpoints,
    );
    const destinationInsight = buildEndpointInsight(
        "destination",
        destinationDisplay.title,
        destinationDisplay.subtitle,
        checkpoints,
    );

    return (
        <section className="shipment-journey" aria-label="Recorrido y etapas del envío">
            <div className="shipment-journey__corridor">
                <JourneyStepTooltip id="endpoint-origin" insight={originInsight}>
                    <div className="shipment-journey__endpoint">
                        <span className="shipment-journey__endpoint-icon" aria-hidden>
                            <IconMapPin className="trace-icon shipment-journey__endpoint-pin" />
                        </span>
                        <span className="shipment-journey__endpoint-tag">Origen</span>
                        <span className="shipment-journey__endpoint-title">{originDisplay.title}</span>
                        {originDisplay.subtitle ? (
                            <span className="shipment-journey__endpoint-sub">
                                {originDisplay.subtitle}
                            </span>
                        ) : null}
                    </div>
                </JourneyStepTooltip>
                <div className="shipment-journey__corridor-line" aria-hidden>
                    <span className="shipment-journey__corridor-track" />
                </div>
                <JourneyStepTooltip
                    id="endpoint-dest"
                    insight={destinationInsight}
                    hostClassName="shipment-journey__tip-host--dest"
                >
                    <div className="shipment-journey__endpoint shipment-journey__endpoint--dest">
                        <span className="shipment-journey__endpoint-icon" aria-hidden>
                            <IconMapPin className="trace-icon shipment-journey__endpoint-pin" />
                        </span>
                        <span className="shipment-journey__endpoint-tag">Destino</span>
                        <span className="shipment-journey__endpoint-title">
                            {destinationDisplay.title}
                        </span>
                        {destinationDisplay.subtitle ? (
                            <span className="shipment-journey__endpoint-sub">
                                {destinationDisplay.subtitle}
                            </span>
                        ) : null}
                    </div>
                </JourneyStepTooltip>
            </div>

            <div className="shipment-journey__rail-wrap">
                <p className="shipment-journey__rail-caption">
                    Ciclo logístico
                    <span className="shipment-journey__rail-status">
                        · {journeyRailStatusCaption(status)}
                    </span>
                </p>
                <div className="shipment-journey__rail" data-testid="shipment-journey-timeline">
                    <div className="shipment-journey__rail-spine" aria-hidden />
                    <ol className="shipment-journey__steps">
                        {steps.map(({ step, state, eventRecorded }) => {
                            const cls = [
                                "shipment-journey__step",
                                state === "current" && "is-current",
                                state === "past" && "is-past",
                                state === "future" && "is-future",
                                state === "offpath" && "is-muted",
                                lossStepId === step.id && "is-loss",
                            ]
                                .filter(Boolean)
                                .join(" ");
                            const insight = buildJourneyStepInsight(
                                step,
                                state,
                                checkpoints,
                                createdAt,
                            );
                            return (
                                <li key={step.id} className={cls}>
                                    <JourneyStepTooltip id={`step-${step.id}`} insight={insight}>
                                        <span
                                            className={`shipment-journey__marker shipment-journey__marker--${step.icon}`}
                                            aria-hidden
                                        >
                                            <span className="shipment-journey__icon-wrap">
                                                <JourneyStepIcon
                                                    kind={step.icon}
                                                    className="trace-icon shipment-journey__step-icon"
                                                />
                                            </span>
                                            {eventRecorded && state !== "future" ? (
                                                <span
                                                    className="shipment-journey__check"
                                                    aria-hidden
                                                >
                                                    ✓
                                                </span>
                                            ) : null}
                                        </span>
                                    </JourneyStepTooltip>
                                    <span className="shipment-journey__label">{step.label}</span>
                                    {step.id === nowStepId ? (
                                        <span className="shipment-journey__here">Ahora</span>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ol>
                </div>
                {exception ? (
                    <p className="shipment-journey__exception" role="status">
                        <span className="badge badge--danger">{exception}</span>
                    </p>
                ) : null}
            </div>
        </section>
    );
}
