"use client";

import type { ReactNode } from "react";

import type { JourneyStepInsight } from "@/lib/shipments/journeyTimeline";

export type JourneyStepTooltipProps = {
    id: string;
    insight: JourneyStepInsight;
    children: ReactNode;
    hostClassName?: string;
};

export function JourneyStepTooltip({ id, insight, children, hostClassName }: JourneyStepTooltipProps) {
    const tooltipId = `journey-tip-${id}`;
    const hostCls = ["shipment-journey__tip-host", hostClassName].filter(Boolean).join(" ");
    return (
        <span className={hostCls}>
            <span className="shipment-journey__tip-trigger" aria-describedby={tooltipId} tabIndex={0}>
                {children}
            </span>
            <span className="shipment-journey__tooltip" id={tooltipId} role="tooltip">
                {insight.lines.map((line, i) => (
                    <span key={`${id}-${i}`} className="shipment-journey__tooltip-line">
                        {line}
                    </span>
                ))}
            </span>
        </span>
    );
}
