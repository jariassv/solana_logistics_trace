import { describe, expect, it } from "vitest";

import {
    buildCheckpointMetadataJson,
    buildCheckpointMetadataObject,
    CHECKPOINT_METADATA_MAX_BYTES,
    toggleMetadataTag,
    validateCheckpointMetadataJson,
} from "./checkpointMetadata";

describe("checkpointMetadata", () => {
    it("builds object from tags and comment", () => {
        expect(
            buildCheckpointMetadataObject({
                selectedTagIds: ["on_time", "cargo_verified"],
                comment: "  Sin novedad  ",
            }),
        ).toEqual({
            tags: ["cargo_verified", "on_time"],
            notes: "Sin novedad",
        });
    });

    it("returns empty json when nothing selected", () => {
        const { json } = buildCheckpointMetadataJson(
            { selectedTagIds: [], comment: "" },
            null,
        );
        expect(json).toBe("");
    });

    it("merges coordinates into payload", () => {
        const { json } = buildCheckpointMetadataJson(
            { selectedTagIds: ["on_time"], comment: "" },
            { lat: 13.7, lng: -89.2 },
        );
        const parsed = JSON.parse(json) as { tags: string[]; lat: number; lng: number };
        expect(parsed.tags).toEqual(["on_time"]);
        expect(parsed.lat).toBe(13.7);
        expect(parsed.lng).toBe(-89.2);
    });

    it("rejects metadata over byte limit", () => {
        const long = "x".repeat(CHECKPOINT_METADATA_MAX_BYTES);
        expect(validateCheckpointMetadataJson(JSON.stringify({ notes: long }))).toMatch(/supera/);
    });

    it("toggles tag selection", () => {
        expect(toggleMetadataTag([], "a", true)).toEqual(["a"]);
        expect(toggleMetadataTag(["a"], "a", false)).toEqual([]);
        expect(toggleMetadataTag(["a"], "b", true)).toEqual(["a", "b"]);
    });
});
