import { describe, expect, it } from "vitest";
import {
  INITIAL_NGO_FORM,
  LEGAL_STRUCTURES,
  NGO_STEPS,
  NGO_STEP_LABELS,
  formatSubmissionTime,
  generateApplicationId,
  getDocsForStructure,
  legalStructureLabel,
} from "./ngoRegistrationModel";

describe("ngoRegistrationModel", () => {
  it("defines all 6 steps in the expected sequence", () => {
    expect(NGO_STEPS).toEqual([
      "org-details",
      "legal-documents",
      "authorized-rep",
      "org-photos",
      "review-submit",
      "email-verification",
    ]);
  });

  it("provides labels for all 6 steps", () => {
    for (const step of NGO_STEPS) {
      expect(NGO_STEP_LABELS[step]).toBeTruthy();
    }
  });

  it("contains valid legal structure definitions", () => {
    expect(LEGAL_STRUCTURES.length).toBe(3);
    const ids = LEGAL_STRUCTURES.map((s) => s.id);
    expect(ids).toContain("trust");
    expect(ids).toContain("society");
    expect(ids).toContain("section8");
  });

  it("resolves correct documents for Trust", () => {
    const docs = getDocsForStructure("trust");
    expect(docs.some((d) => d.id === "trust-reg-cert" && d.category === "must-have")).toBe(true);
    expect(docs.some((d) => d.id === "trust-deed" && d.category === "must-have")).toBe(true);
    expect(docs.some((d) => d.id === "trust-pan" && d.category === "supporting")).toBe(true);
  });

  it("resolves correct documents for Society", () => {
    const docs = getDocsForStructure("society");
    expect(docs.some((d) => d.id === "society-reg-cert" && d.category === "must-have")).toBe(true);
    expect(docs.some((d) => d.id === "society-moa" && d.category === "must-have")).toBe(true);
    expect(docs.some((d) => d.id === "society-bye-laws" && d.category === "must-have")).toBe(true);
  });

  it("resolves correct documents for Section 8 Company", () => {
    const docs = getDocsForStructure("section8");
    expect(docs.some((d) => d.id === "coi" && d.category === "must-have")).toBe(true);
    expect(docs.some((d) => d.id === "cin" && d.category === "must-have")).toBe(true);
    expect(docs.some((d) => d.id === "s8-moa" && d.category === "must-have")).toBe(true);
    expect(docs.some((d) => d.id === "s8-aoa" && d.category === "must-have")).toBe(true);
  });

  it("resolves empty docs for unselected structure", () => {
    expect(getDocsForStructure("")).toEqual([]);
  });

  it("initial form state has expected empty defaults", () => {
    expect(INITIAL_NGO_FORM.organizationName).toBe("");
    expect(INITIAL_NGO_FORM.legalStructure).toBe("");
    expect(INITIAL_NGO_FORM.registrationNumber).toBe("");
    expect(INITIAL_NGO_FORM.documents).toEqual({});
    expect(INITIAL_NGO_FORM.representativeName).toBe("");
    expect(INITIAL_NGO_FORM.authorizationLetter).toBeNull();
    expect(INITIAL_NGO_FORM.logo).toBeNull();
    expect(INITIAL_NGO_FORM.officePhoto).toBeNull();
    expect(INITIAL_NGO_FORM.activityPhotos).toEqual([null, null, null]);
    expect(INITIAL_NGO_FORM.confirmationChecked).toBe(false);
  });

  it("generates a formatted 2026 application ID", () => {
    const id = generateApplicationId();
    expect(id).toMatch(/^CK-NGO-2026-\d{4}$/);
  });

  it("formats submission time to readable Indian date format", () => {
    const date = new Date("2026-09-07T14:30:00Z");
    const formatted = formatSubmissionTime(date);
    expect(formatted).toBeTruthy();
    expect(formatted).toContain("2026");
  });

  it("returns human-readable label for legal structures", () => {
    expect(legalStructureLabel("trust")).toBe("Trust");
    expect(legalStructureLabel("society")).toBe("Society");
    expect(legalStructureLabel("section8")).toBe("Section 8 Company");
    expect(legalStructureLabel("")).toBe("");
  });
});
