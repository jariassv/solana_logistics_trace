import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    getActorMe,
    getShipmentCheckpoints,
    getShipmentDetail,
    getShipmentsForWallet,
} from "./shipments";

const listRow = {
    shipmentId: "ship-1",
    onChainShipmentId: "42",
    status: "InTransit",
    product: "Caja",
    createdAt: "2026-01-01T00:00:00Z",
    requiresColdChain: false,
};

const participant = (wallet: string, name: string) => ({
    wallet,
    walletMasked: `${wallet.slice(0, 4)}…${wallet.slice(-4)}`,
    displayName: name,
    role: "Carrier",
});

const detailBody = {
    ...listRow,
    displayLabel: null,
    productLabel: "Caja térmica",
    origin: "A",
    destination: "B",
    sender: "wallet-sender",
    recipient: "wallet-recipient",
    senderParticipant: participant("wallet-sender", "Remitente SA"),
    recipientParticipant: participant("wallet-recipient", "Destino Ltd"),
    checkpointCount: 1,
    incidentCount: 0,
    openIncidentCount: 0,
    deliveredAt: null,
    weightKg: 12.5,
    quantity: 48,
    quantityUnit: "cajas",
    estimatedDeliveryAt: "2026-01-10T12:00:00Z",
    referenceCode: "PO-99",
    priority: "urgent",
    notes: "Entregar en horario de mañana",
    checkpoints: [
        {
            checkpointId: "cp-1",
            onChainCheckpointId: "1",
            type: "Pickup",
            occurredAt: "2026-01-02T00:00:00Z",
            location: "Hub",
            actor: "actor-1",
            actorWalletMasked: "acto…r-1",
            actorDisplayName: "Transportes Norte",
            actorRole: "Carrier",
            temperatureCenti: null,
            humidity: null,
            latitude: 10,
            longitude: -66,
            metadata: {},
            txHash: "tx-1",
        },
    ],
    incidents: [],
};

describe("shipments API client", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("getShipmentsForWallet parses list response", async () => {
        const fetchSpy = fetch as unknown as ReturnType<typeof vi.fn>;
        fetchSpy.mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify([listRow]),
        });

        const res = await getShipmentsForWallet("http://localhost:8000/api/v1", "wallet-1");
        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.data).toHaveLength(1);
            expect(res.data[0]?.product).toBe("Caja");
        }
        expect(fetchSpy.mock.calls[0][0]).toBe(
            "http://localhost:8000/api/v1/shipments?wallet=wallet-1",
        );
    });

    it("getShipmentDetail parses detail payload", async () => {
        const fetchSpy = fetch as unknown as ReturnType<typeof vi.fn>;
        fetchSpy.mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify(detailBody),
        });

        const res = await getShipmentDetail("http://x/api/v1", "ship-1", "wallet-1");
        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.data.checkpointCount).toBe(1);
            expect(res.data.checkpoints[0]?.type).toBe("Pickup");
            expect(res.data.weightKg).toBe(12.5);
            expect(res.data.referenceCode).toBe("PO-99");
            expect(res.data.priority).toBe("urgent");
        }
    });

    it("getShipmentCheckpoints parses checkpoint array", async () => {
        const fetchSpy = fetch as unknown as ReturnType<typeof vi.fn>;
        fetchSpy.mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify(detailBody.checkpoints),
        });

        const res = await getShipmentCheckpoints("http://x/api/v1", "ship-1", "wallet-1");
        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.data).toHaveLength(1);
        }
    });

    it("getActorMe parses actor profile", async () => {
        const fetchSpy = fetch as unknown as ReturnType<typeof vi.fn>;
        fetchSpy.mockResolvedValue({
            ok: true,
            status: 200,
            text: async () =>
                JSON.stringify({
                    wallet: "w1",
                    role: "Sender",
                    name: "Alice",
                    location: null,
                    registrationTxHash: "tx-reg",
                }),
        });

        const res = await getActorMe("http://x/api/v1", "w1");
        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.data.role).toBe("Sender");
        }
    });

    it("returns error result on HTTP failure", async () => {
        const fetchSpy = fetch as unknown as ReturnType<typeof vi.fn>;
        fetchSpy.mockResolvedValue({
            ok: false,
            status: 404,
            text: async () => '{"error":"not found"}',
        });

        const res = await getShipmentsForWallet("http://x/api/v1", "w1");
        expect(res.ok).toBe(false);
        if (!res.ok) {
            expect(res.status).toBe(404);
        }
    });
});
