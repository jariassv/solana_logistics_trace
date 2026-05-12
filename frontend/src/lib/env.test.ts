import { describe, expect, it } from "vitest";

import { apiOriginFromApiBase } from "./env";

describe("apiOriginFromApiBase", () => {
    it("strips trailing /api/v1", () => {
        expect(apiOriginFromApiBase("http://127.0.0.1:8001/api/v1")).toBe("http://127.0.0.1:8001");
        expect(apiOriginFromApiBase("http://127.0.0.1:8001/api/v1/")).toBe("http://127.0.0.1:8001");
    });
});
