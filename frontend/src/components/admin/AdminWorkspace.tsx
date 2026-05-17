"use client";

import { useCallback, useMemo, useState } from "react";

import { AdminDashboardStats } from "@/components/admin/AdminDashboardStats";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminShipmentSearch } from "@/components/admin/AdminShipmentSearch";
import { AdminShipmentsPanel } from "@/components/admin/AdminShipmentsPanel";
import { CreateShipmentForm } from "@/components/admin/CreateShipmentForm";
import { RecordCheckpointForm } from "@/components/admin/RecordCheckpointForm";
import {
    computeShipmentStats,
    EMPTY_SHIPMENT_FILTERS,
    filterShipments,
    uniqueShipmentStatuses,
    type ShipmentFilters,
} from "@/lib/admin/shipmentFilters";
import { useAdminState } from "@/lib/admin/useAdminState";
import { roleDisplayName } from "@/lib/panel/capabilities";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

type AdminModalKind = "create_shipment" | "record_checkpoint" | null;

export function AdminWorkspace() {
    const { role, actorLoading, refreshActor } = useWalletSession();
    const state = useAdminState();
    const [filters, setFilters] = useState<ShipmentFilters>(EMPTY_SHIPMENT_FILTERS);
    const [openModal, setOpenModal] = useState<AdminModalKind>(null);
    const [recordShipmentId, setRecordShipmentId] = useState<string | null>(null);

    const {
        cfg,
        programId,
        connection,
        payer,
        wallet,
        programActive,
        actorOnChain,
        rows,
        shipmentsLoading,
        refreshAll,
        resolveShipmentPda,
    } = state;

    const allRows = useMemo(() => rows ?? [], [rows]);
    const stats = useMemo(
        () => (allRows.length ? computeShipmentStats(allRows) : null),
        [allRows],
    );
    const filteredRows = useMemo(
        () => filterShipments(allRows, filters),
        [allRows, filters],
    );
    const statusOptions = useMemo(() => uniqueShipmentStatuses(allRows), [allRows]);

    const recordShipment = useMemo(
        () => allRows.find((r) => r.shipmentId === recordShipmentId) ?? null,
        [allRows, recordShipmentId],
    );
    const recordShipmentPda = useMemo(() => {
        if (!recordShipment) {
            return null;
        }
        return resolveShipmentPda(recordShipment.onChainShipmentId);
    }, [recordShipment, resolveShipmentPda]);

    const closeModal = useCallback(() => {
        setOpenModal(null);
        setRecordShipmentId(null);
    }, []);

    const onFormSuccess = useCallback(async () => {
        await refreshAll();
        await refreshActor();
        closeModal();
    }, [refreshAll, refreshActor, closeModal]);

    const openRecordForShipment = useCallback((shipmentId: string) => {
        setRecordShipmentId(shipmentId);
        setOpenModal("record_checkpoint");
    }, []);

    const modalTitle =
        openModal === "create_shipment"
            ? "Registro de envío"
            : openModal === "record_checkpoint"
              ? "Evento logístico"
              : "";

    return (
        <div className="admin-workspace">
            <header className="admin-page-header">
                <div className="admin-page-header__intro">
                    <h1 className="admin-page-header__title">Centro de administración</h1>
                    <p className="admin-page-header__sub">
                        Gestión de envíos, búsqueda y eventos logísticos según su rol.
                    </p>
                </div>
                <div className="admin-page-header__meta">
                    {actorLoading ? (
                        <span className="admin-page-header__meta-label">Cargando perfil…</span>
                    ) : (
                        <span className="badge badge--neutral">{roleDisplayName(role)}</span>
                    )}
                    {wallet ? (
                        <span className="admin-page-header__wallet mono" title={wallet}>
                            {wallet.slice(0, 4)}…{wallet.slice(-4)}
                        </span>
                    ) : null}
                </div>
            </header>

            <div className="admin-workspace__stack">
            <AdminDashboardStats
                stats={stats}
                loading={shipmentsLoading}
                filteredCount={filteredRows.length}
                onRefresh={() => void refreshAll()}
            />

            <AdminShipmentSearch
                filters={filters}
                statusOptions={statusOptions}
                resultCount={filteredRows.length}
                totalCount={allRows.length}
                onChange={setFilters}
                onReset={() => setFilters(EMPTY_SHIPMENT_FILTERS)}
            />

            <AdminShipmentsPanel
                rows={filteredRows}
                loading={shipmentsLoading}
                role={role}
                programActive={programActive}
                programConfigured={Boolean(programId)}
                actorOnChain={actorOnChain}
                actorLoading={actorLoading}
                hasWallet={Boolean(wallet)}
                onRecordEvent={openRecordForShipment}
                onCreateShipment={() => setOpenModal("create_shipment")}
            />
            </div>

            <AdminModal
                open={openModal !== null}
                title={modalTitle}
                onClose={closeModal}
                size="lg"
            >
                {openModal === "create_shipment" && programId && payer ? (
                    <CreateShipmentForm
                        connection={connection}
                        programId={programId}
                        payer={payer}
                        apiBaseUrl={cfg.apiBaseUrl}
                        role={role}
                        onSuccess={() => void onFormSuccess()}
                    />
                ) : null}
                {openModal === "record_checkpoint" && programId && payer ? (
                    recordShipment && recordShipmentPda ? (
                        <RecordCheckpointForm
                            connection={connection}
                            programId={programId}
                            payer={payer}
                            shipmentPda={recordShipmentPda}
                            onChainShipmentId={recordShipment.onChainShipmentId}
                            apiBaseUrl={cfg.apiBaseUrl}
                            onSuccess={() => void onFormSuccess()}
                        />
                    ) : (
                        <p className="text-sm text-muted mb-0">
                            No se pudo resolver el envío seleccionado.
                        </p>
                    )
                ) : null}
            </AdminModal>
        </div>
    );
}
