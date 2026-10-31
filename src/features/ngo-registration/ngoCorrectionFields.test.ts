import { describe, expect, it } from "vitest";
import { INITIAL_NGO_FORM, type NGOFormState } from "./ngoRegistrationModel";
import { changedFlaggedFields, fillFlaggedFileSlots, originalFlaggedValues } from "./ngoCorrectionFields";
import { matchesQuery } from "@/components/admin/AdminSearchBox";

const form = (patch: Partial<NGOFormState>): NGOFormState => ({ ...INITIAL_NGO_FORM, ...patch });

describe("flagged items: fixed only when different from the originally submitted value", () => {
  it("uses the server's original (latest round previousValues) over what the wizard opened with", () => {
    const loaded = form({ registrationNumber: "TR/SAVED" });
    const original = originalFlaggedValues(loaded, ["registrationNumber"], {
      correctionHistory: [{ previousValues: { registrationNumber: "TR/ORIG" } }],
    });
    expect(original.registrationNumber).toBe("TR/ORIG");
    expect(changedFlaggedFields(loaded, original).has("registrationNumber")).toBe(true);
    expect(changedFlaggedFields(form({ registrationNumber: "TR/ORIG" }), original).size).toBe(0);
  });

  it("falls back to the saved submission when the server sends no originals", () => {
    const loaded = form({ registrationNumber: "TR/ORIG" });
    const original = originalFlaggedValues(loaded, ["registrationNumber"], {});
    expect(changedFlaggedFields(loaded, original).size).toBe(0);
    expect(changedFlaggedFields(form({ registrationNumber: "TR/NEW" }), original).has("registrationNumber")).toBe(true);
  });

  it("a flagged document counts as fixed only once replaced (not when kept or removed)", () => {
    const pan = { name: "pan.pdf", documentId: 13 };
    const loaded = form({ documents: { pan } });
    const original = originalFlaggedValues(loaded, ["documents.pan"], { originalValues: { "documents.pan": 13 } });
    expect(changedFlaggedFields(loaded, original).size).toBe(0);
    expect(changedFlaggedFields(form({ documents: { pan: null } }), original).size).toBe(0);
    expect(changedFlaggedFields(form({ documents: { pan: { name: "pan-new.pdf", documentId: 99 } } }), original).has("documents.pan")).toBe(true);
  });
});

describe("client-side search treats % and _ literally", () => {
  it("matches only the literal characters", () => {
    expect(matchesQuery("50%", "Get 50% off")).toBe(true);
    expect(matchesQuery("%", "Hope Trust")).toBe(false);
    expect(matchesQuery("a_b", "a_b drive")).toBe(true);
    expect(matchesQuery("_", "abc")).toBe(false);
  });
});

describe("backend contract: correctionOriginalValues / correctionOriginalFiles", () => {
  it("compares text with the original and files by document:{id}; the old file fills its empty slot until replaced", () => {
    const status = {
      correctionOriginalValues: { registrationNumber: "TR/ORIG", "documents.pan": "document:13" },
      correctionOriginalFiles: { "documents.pan": { documentId: 13, name: "pan.pdf" } },
    };
    const keys = ["registrationNumber", "documents.pan"];
    let loaded = form({ registrationNumber: "TR/ORIG", documents: {} });
    const original = originalFlaggedValues(loaded, keys, status);
    loaded = fillFlaggedFileSlots(loaded, keys, status);
    expect(loaded.documents.pan?.name).toBe("pan.pdf");
    expect(changedFlaggedFields(loaded, original).size).toBe(0);
    const fixed = { ...loaded, registrationNumber: "TR/NEW", documents: { pan: { name: "new.pdf", documentId: 77 } } };
    expect([...changedFlaggedFields(fixed, original)].sort()).toEqual(["documents.pan", "registrationNumber"]);
  });
});
