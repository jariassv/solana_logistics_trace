"use client";

import { useCallback, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/AdminModal";
import { AdminShipmentsPanel } from "@/components/admin/AdminShipmentsPanel";
import { CreateShipmentForm } from "@/components/admin/CreateShipmentForm";
import { InitializeProgramPanel } from "@/components/admin/InitializeProgramPanel";
import { RecordCheckpointForm } from "@/components/admin/RecordCheckpointForm";
import { ActorRegistrationForm } from "@/components/registro/ActorRegistrationForm";
import {
    adminStepLabel,
    roleDisplayName,
    stepLockReason,
    stepVisualStatus,
    type AdminProcessStep,
} from "@/lib/admin/processCapabilities";
import { useAdminProcessState } from "@/lib/admin/useAdminProcessState";
import { programStateSummary } from "@/lib/panel/etapa1UserMessages";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

const PROCESS_STEPS: AdminProcessStep[] = [
    "initialize",
    "register_actor",
    "create_shipment",
    "record_checkpoint",
];

const STEP_DESCRIPTIONS: Record<AdminProcessStep, string> = {
    initialize: "Activación única del programa en la red.",
    register_actor: "Alta de su identidad como participante logístico.",
    create_shipment: "Creación de un envío (solo remitente).",
    record_checkpoint: "Evento logístico sobre un envío ya registrado.",
};

export function AdminWorkspace() {
    const { role, actorLoading, refreshActor } = useWalletSession();
    const state = useAdminProcessState();
    const [openStep, setOpenStep] = useState<AdminProcessStep | null>(null);
    const [detailShipmentId, setDetailShipmentId] = useState<string | null>(null);

    const {
        cfg,
        programId,
        connection,
        payer,
        wallet,
        prog,
        processContext,
        actorOnChain,
        rows,
        shipmentsLoading,
        selectedShipmentId,
        setSelectedShipmentId,
        selectedShipment,
        selectedShipmentPda,
        refreshAll,
    } = state;

    const configSummary = programStateSummary({
        hasProgramId: Boolean(programId),
        actors: prog?.decoded.actorsRegistered ?? null,
        shipments: prog?.decoded.shipmentsCreated ?? null,
        checkpoints: prog?.decoded.checkpointsRecorded ?? null,
        configReadable: Boolean(prog),
    });

    const closeModal = useCallback(() => setOpenStep(null), []);

    const onStepSuccess = useCallback(async () => {
        await refreshAll();
        await refreshActor();
        setOpenStep(null);
    }, [refreshAll, refreshActor]);

    const openStepIfAllowed = useCallback(
        (step: AdminProcessStep) => {
            const status = stepVisualStatus(step, processContext);
            if (status === "locked") {
                return;
            }
            setOpenStep(step);
        },
        [processContext],
    );

    const openRecordForShipment = useCallback(
        (shipmentId: string) => {
            setSelectedShipmentId(shipmentId);
            const ctx = {
                ...processContext,
                selectedShipmentId: shipmentId,
            };
            const status = stepVisualStatus("record_checkpoint", ctx);
            if (status === "locked") {
                return;
            }
            setOpenStep("record_checkpoint");
        },
        [processContext, setSelectedShipmentId],
    );

    const modalTitle = openStep ? adminStepLabel(openStep) : "";

    const modalBody = useMemo(() => {
        if (!openStep || !programId || !payer) {
            return null;
        }
        switch (openStep) {
            case "initialize":
                return (
                    <InitializeProgramPanel
                        connection={connection}
                        programId={programId}
                        payer={payer}
                        programActive={Boolean(prog)}
                        onSuccess={() => void onStepSuccess()}
                    />
                );
            case "register_actor":
                return (
                    <ActorRegistrationForm
                        embedded
                        onSuccess={() => void onStepSuccess()}
                        onOpenInitialize={() => setOpenStep("initialize")}
                    />
                );
            case "create_shipment":
                return (
                    <CreateShipmentForm
                        connection={connection}
                        programId={programId}
                        payer={payer}
                        apiBaseUrl={cfg.apiBaseUrl}
                        role={role}
                        onSuccess={() => void onStepSuccess()}
                    />
                );
            case "record_checkpoint":
                if (!selectedShipmentPda || !selectedShipment) {
                    return (
                        <p className="text-sm text-muted mb-0">
                            Seleccione un envío en las tarjetas antes de registrar el evento.
                        </p>
                    );
                }
                return (
                    <RecordCheckpointForm
                        connection={connection}
                        programId={programId}
                        payer={payer}
                        shipmentPda={selectedShipmentPda}
                        onChainShipmentId={selectedShipment.onChainShipmentId}
                        apiBaseUrl={cfg.apiBaseUrl}
                        onSuccess={() => void onStepSuccess()}
                    />
                );
            default:
                return null;
        }
    }, [
        openStep,
        programId,
        payer,
        connection,
        prog,
        onStepSuccess,
        selectedShipmentPda,
        selectedShipment,
        cfg.apiBaseUrl,
        role,
    ]);

    return (
        <div className="admin-workspace">
            <header className="admin-workspace__hd">
                <div>
                    <h1 className="page-title mb-1">Centro de administración</h1>
                    <p className="page-sub mb-0">
                        Proceso guiado y envíos: cada acción se habilita según el paso anterior y su
                        rol.
                    </p>
                </div>
                <div className="admin-workspace__meta">
                    {actorLoading ? (
                        <span className="text-sm text-muted">Cargando perfil…</span>
                    ) : (
                        <span className="badge badge--neutral">
                            {roleDisplayName(role)}
                        </span>
                    )}
                    <span className="text-xs text-muted mono" title={wallet ?? undefined}>
                        {wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : ""}
                    </span>
                </div>
            </header>

            <AdminShipmentsPanel
                rows={rows}
                loading={shipmentsLoading}
                role={role}
                wallet={wallet}
                apiBaseUrl={cfg.apiBaseUrl}
                programActive={Boolean(prog)}
                actorOnChain={actorOnChain === true}
                selectedShipmentId={selectedShipmentId}
                onSelectShipment={setSelectedShipmentId}
                onRecordEvent={openRecordForShipment}
                detailShipmentId={detailShipmentId}
                onOpenDetail={setDetailShipmentId}
                onCloseDetail={() => setDetailShipmentId(null)}
            />

            <div className="admin-workspace__layout admin-workspace__layout--process">
                <aside className="admin-workspace__aside card">
                    <div className="card__hd">Estado del programa</div>
                    <div className="card__bd text-sm">
                        <p className="admin-workspace__state-line mb-2">{configSummary}</p>
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => void refreshAll()}
                        >
                            Actualizar
                        </button>
                    </div>
                </aside>

                <div className="admin-workspace__steps">
                    <h2 className="admin-workspace__steps-title">Proceso operativo</h2>
                    <ol className="admin-stepper">
                        {PROCESS_STEPS.map((step, index) => {
                            const status = stepVisualStatus(step, processContext);
                            const lockReason = stepLockReason(step, processContext);
                            const isOpen = openStep === step;
                            return (
                                <li
                                    key={step}
                                    className={`admin-stepper__item admin-stepper__item--${status}`}
                                >
                                    <div className="admin-stepper__card">
                                        <span className="admin-stepper__index">{index + 1}</span>
                                        <div className="admin-stepper__body">
                                            <h3 className="admin-stepper__title">
                                                {adminStepLabel(step)}
                                            </h3>
                                            <p className="admin-stepper__desc text-sm text-muted">
                                                {STEP_DESCRIPTIONS[step]}
                                            </p>
                                            {status === "locked" && lockReason ? (
                                                <p className="admin-stepper__lock text-xs text-muted">
                                                    {lockReason}
                                                </p>
                                            ) : null}
                                            {status === "done" ? (
                                                <span className="badge badge--success">Completado</span>
                                            ) : null}
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn--secondary btn--sm"
                                            disabled={status === "locked"}
                                            aria-expanded={isOpen}
                                            onClick={() => openStepIfAllowed(step)}
                                        >
                                            {status === "done" ? "Ver / repetir" : "Abrir"}
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </div>

            <AdminModal open={openStep !== null} title={modalTitle} onClose={closeModal} size="lg">
                {modalBody}
            </AdminModal>
        </div>
    );
}
