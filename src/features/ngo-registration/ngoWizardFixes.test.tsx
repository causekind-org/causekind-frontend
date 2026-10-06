import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { OrgDetails } from "./steps/OrgDetails";
import { AuthorizedRepresentative } from "./steps/AuthorizedRepresentative";
import { LegalDocuments } from "./steps/LegalDocuments";
import { OrgPhotos } from "./steps/OrgPhotos";
import { ReviewSubmit } from "./steps/ReviewSubmit";
import {
  INITIAL_NGO_FORM, prefillNgoFormWithUser, correctionFieldLabel, correctionFieldStep, firstCorrectionStep,
} from "./ngoRegistrationModel";

vi.mock("@/lib/api", () => ({ uploadNgoDocument: vi.fn(), uploadNgoPhoto: vi.fn() }));

const noop = () => {};
const trust = { ...INITIAL_NGO_FORM, legalStructure: "trust" as const };

describe("NGO wizard has no example placeholders (point 1)", () => {
  it.each([
    ["Organization details", <OrgDetails key="1" data={trust} onChange={noop} onBack={noop} onContinue={noop} />],
    ["Legal documents", <LegalDocuments key="2" data={trust} onChange={noop} onBack={noop} onContinue={noop} />],
    ["Authorized representative", <AuthorizedRepresentative key="3" data={trust} onChange={noop} onBack={noop} onContinue={noop} />],
    ["Photos", <OrgPhotos key="4" data={trust} onChange={noop} onBack={noop} onContinue={noop} />],
    ["Review", <ReviewSubmit key="5" data={trust} onChange={noop} onBack={noop} onEditStep={noop} onSubmit={noop} />],
  ])("%s: no input or textarea carries example data", (_name, step) => {
    const { container } = render(step);
    const fields = container.querySelectorAll("input, textarea");
    for (const el of fields) {
      expect(el.getAttribute("placeholder") ?? "").toBe("");
    }
    expect(container.textContent).not.toMatch(/Priya|Helping Hands|98765|U85300|helpinghands\.org|e\.g\./i);
  });
});

describe("prefill from signup (point 2)", () => {
  const user = { fullName: "Hope Welfare Trust", phone: "+919876543210", email: "hope@ngo.test" };

  it("fills the empty organization name, mobile and official email", () => {
    const form = prefillNgoFormWithUser(INITIAL_NGO_FORM, user);
    expect(form.organizationName).toBe("Hope Welfare Trust");
    expect(form.mobileNumber).toBe("+919876543210");
    expect(form.officialEmail).toBe("hope@ngo.test");
  });

  it("never overwrites what the NGO typed", () => {
    const typed = { ...INITIAL_NGO_FORM, organizationName: "Typed", mobileNumber: "9000000000", officialEmail: "typed@ngo.test" };
    expect(prefillNgoFormWithUser(typed, user)).toMatchObject({ organizationName: "Typed", mobileNumber: "9000000000", officialEmail: "typed@ngo.test" });
  });

  it("leaves fields flagged for correction empty, and does nothing without a user", () => {
    const form = prefillNgoFormWithUser(INITIAL_NGO_FORM, user, ["organizationName", "mobileNumber"]);
    expect(form.organizationName).toBe("");
    expect(form.mobileNumber).toBe("");
    expect(form.officialEmail).toBe("hope@ngo.test");
    expect(prefillNgoFormWithUser(INITIAL_NGO_FORM, null)).toBe(INITIAL_NGO_FORM);
  });

  it("treats whitespace as empty", () => {
    expect(prefillNgoFormWithUser({ ...INITIAL_NGO_FORM, mobileNumber: "  " }, user).mobileNumber).toBe("+919876543210");
  });
});

describe("correction items (point 9)", () => {
  it("names and places each item", () => {
    expect(correctionFieldLabel("registrationNumber")).toBe("Registration number");
    expect(correctionFieldLabel("documents.trust-deed")).toBe("Registered Trust Deed");
    expect(correctionFieldLabel("documents.company-pan")).toBe("Company PAN Card");
    expect(correctionFieldLabel("activityPhotos.1")).toBe("Activity photo 2");
    expect(correctionFieldStep("yearOfEstablishment")).toBe("org-details");
    expect(correctionFieldStep("documents.coi")).toBe("legal-documents");
    expect(correctionFieldStep("authorizationLetter")).toBe("authorized-rep");
    expect(correctionFieldStep("logo")).toBe("org-photos");
  });

  it("finds the first flagged step in wizard order", () => {
    expect(firstCorrectionStep(["logo", "documents.trust-deed", "officialEmail"])).toBe("legal-documents");
    expect(firstCorrectionStep(["officePhoto"])).toBe("org-photos");
    expect(firstCorrectionStep([])).toBeNull();
  });

  it("shows the reviewer's note next to the flagged field", () => {
    const { getByText } = render(
      <OrgDetails data={trust} onChange={noop} onBack={noop} onContinue={noop}
        corrections={{ registrationNumber: "Does not match the certificate" }} />);
    const note = getByText(/Does not match the certificate/);
    const field = note.closest("div.space-y-1")!;
    expect(field.querySelector("#ngo-reg-no")).not.toBeNull();
  });
});
