import { describe, expect, it } from "vitest";

import { shipmentCardActions } from "./shipmentActions";

describe("shipmentCardActions", () => {
    it("enables record_event for Carrier", () => {
        const actions = shipmentCardActions({
            role: "Carrier",
            hasWallet: true,
            programActive: true,
            actorOnChain: true,
        });
        const record = actions.find((a) => a.id === "record_event");
        expect(record?.enabled).toBe(true);
    });

    it("disables record_event for Sender", () => {
        const actions = shipmentCardActions({
            role: "Sender",
            hasWallet: true,
            programActive: true,
            actorOnChain: true,
        });
        const record = actions.find((a) => a.id === "record_event");
        expect(record?.enabled).toBe(false);
    });
});
