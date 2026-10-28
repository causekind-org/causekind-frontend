import { describe, expect, it } from "vitest";
import {
  INITIAL_NGO_FORM,
  LEGAL_STRUCTURES,
  NGO_STEPS,
  NGO_STEP_LABELS,
  formatSubmissionTime,
  generateApplicationId,
  getDocsForStructure,
  getRegistrationCertificateDoc,
  allDocumentIdsForStructure,
  authorizationDocumentLabel,
  isValidPan,
  isPersonalPan,
  normalizeDraftDocuments,
  getNgoStillNeededItems,
  EMPTY_REPRESENTATIVE,
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

  const step2 = (structure: "trust" | "society" | "section8") =>
    getDocsForStructure(structure).map((d) => `${d.id}:${d.category}`);
  const common = ["bank-proof:must-have", "cert-12a:must-have", "cert-80g:supporting", "darpan:supporting", "financials:supporting"];

  it("resolves correct documents for Trust", () => {
    expect(step2("trust")).toEqual(["trust-deed:must-have", ...common]);
    expect(getRegistrationCertificateDoc("trust")).toMatchObject({ id: "trust-reg-cert", label: "Trust Registration Certificate" });
    expect(allDocumentIdsForStructure("trust")).toEqual(["pan", "trust-reg-cert", "trust-deed", "bank-proof", "cert-12a", "cert-80g", "darpan", "financials"]);
  });

  it("resolves correct documents for Society", () => {
    expect(step2("society")).toEqual(["society-moa:must-have", "society-bye-laws:must-have", ...common]);
    expect(getRegistrationCertificateDoc("society")).toMatchObject({ id: "society-reg-cert", label: "Society Registration Certificate" });
  });

  it("resolves correct documents for Section 8 Company", () => {
    expect(step2("section8")).toEqual(["s8-moa:must-have", "s8-licence:must-have", ...common]);
    expect(getDocsForStructure("section8")[0].label).toBe("MoA and AoA");
    expect(getRegistrationCertificateDoc("section8")).toMatchObject({ id: "coi", label: "Certificate of Incorporation (MCA)" });
  });

  it("labels the authorization document by structure", () => {
    expect(authorizationDocumentLabel("trust")).toBe("Trustee resolution or authorization letter signed by the trustees");
    expect(authorizationDocumentLabel("society")).toBe("Managing committee resolution signed by the President or Secretary");
    expect(authorizationDocumentLabel("section8")).toBe("Board resolution (certified true copy) signed by a director or company secretary");
  });

  it("checks PANs: format, and P as the 4th letter for a person", () => {
    expect(isValidPan(" aaath 1234k ")).toBe(true);
    expect(isValidPan("AAAT1234K")).toBe(false);
    expect(isPersonalPan("ABCPS1234K")).toBe(true);
    expect(isPersonalPan("AAATH1234K")).toBe(false);
  });

  it("moves an older draft's per-structure PAN key to the single PAN key", () => {
    expect(normalizeDraftDocuments({ "trust-pan": "file", "trust-deed": "deed" })).toEqual({ pan: "file", "trust-deed": "deed" });
    expect(normalizeDraftDocuments({ pan: "new", "society-pan": "old" })).toEqual({ pan: "new" });
  });

  it("step 1 needs the PAN card, PAN number and registration certificate", () => {
    const base = { ...INITIAL_NGO_FORM, organizationName: "Hope", officialEmail: "contact@hope.test", legalStructure: "trust" as const, registrationNumber: "R1",
      yearOfEstablishment: "2019", registeredOfficeAddress: "Pune", organizationPhone: "+919876543210",
      aboutUs: "We collect school bags and books for children in rural Pune and run weekend reading classes for them." };
    expect(getNgoStillNeededItems("org-details", base)).toEqual(
      ["PAN card upload", "Organization PAN number (10 characters)", "Trust Registration Certificate"]);
    expect(getNgoStillNeededItems("org-details", { ...base, officialEmail: "" })).toContain(
      "Organization email");
    expect(getNgoStillNeededItems("org-details", { ...base, organizationPhone: "" })).toContain(
      "Organization phone number (10 digits)");
    expect(getNgoStillNeededItems("org-details", { ...base, aboutUs: "Too short" })).toContain(
      "About us (100 to 2000 characters)");
    const done = { ...base, panNumber: "AAATH1234K", documents: { pan: { name: "p.pdf", documentId: 1 }, "trust-reg-cert": { name: "c.pdf", documentId: 2 } } };
    expect(getNgoStillNeededItems("org-details", done)).toEqual([]);
  });

  it("step 3: representative 1 is required; other cards only once something is filled", () => {
    const card = { fullName: "Asha", designation: "Trustee", mobileNumber: "+919876543210", email: "asha@hope.test",
      panNumber: "ABCPS1234K", idProof: { name: "id.pdf", documentId: 5 }, emailVerified: true };
    const form = { ...INITIAL_NGO_FORM, authorizationLetter: { name: "a.pdf", documentId: 9 }, representatives: [card] };
    expect(getNgoStillNeededItems("authorized-rep", form)).toEqual([]);
    expect(getNgoStillNeededItems("authorized-rep", { ...form, representatives: [{ ...card, panNumber: "" }] }))
      .toEqual(["Representative 1: PAN number"]);
    expect(getNgoStillNeededItems("authorized-rep", { ...form, representatives: [card, { ...EMPTY_REPRESENTATIVE }] })).toEqual([]);
    expect(getNgoStillNeededItems("authorized-rep", { ...form, representatives: [card, { ...EMPTY_REPRESENTATIVE, fullName: "Half" }] }))
      .toEqual(expect.arrayContaining(["Representative 2: designation / role", "Representative 2: valid email", "Representative 2: PAN number", "Representative 2: ID proof"]));
    expect(getNgoStillNeededItems("authorized-rep", { ...form, representatives: [{ ...card, emailVerified: false }] }))
      .toEqual(["Representative 1: verify email with the code"]);
    expect(getNgoStillNeededItems("authorized-rep", { ...form, representatives: [EMPTY_REPRESENTATIVE] }).length).toBeGreaterThan(3);
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

describe("mobile number messages", () => {
  it("says what is wrong: the first digit, else the length", async () => {
    const { mobileError } = await import("./ngoRegistrationModel");
    expect(mobileError("9876543210")).toBe("");
    expect(mobileError("+91 98765 43210")).toBe("");
    expect(mobileError("5876543210")).toBe("Mobile numbers start with 6, 7, 8 or 9.");
    expect(mobileError("+915876543210")).toBe("Mobile numbers start with 6, 7, 8 or 9.");
    expect(mobileError("98765")).toBe("Enter a 10-digit mobile number.");
    expect(mobileError("")).toBe("Enter a 10-digit mobile number.");
  });
});
