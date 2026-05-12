import { describe, expect, it } from "vitest";

import { mainFlowIndex, stepStateForStatus } from "./shipmentLifecycle";

describe("shipmentLifecycle", () => {
    it("marks past, current and future in main flow", () => {
        expect(stepStateForStatus("InTransit", "Created")).toBe("past");
        expect(stepStateForStatus("InTransit", "InTransit")).toBe("current");
        expect(stepStateForStatus("InTransit", "Delivered")).toBe("future");
    });

    it("resolves mainFlowIndex", () => {
        expect(mainFlowIndex("Delivered")).toBe(4);
        expect(mainFlowIndex("Unknown")).toBe(-1);
    });

    it("dims rail for cancelled", () => {
        expect(stepStateForStatus("Cancelled", "Created")).toBe("offpath");
    });
});
