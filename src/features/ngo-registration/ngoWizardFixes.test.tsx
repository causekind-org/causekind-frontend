import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IndianPhoneInput } from "./components/IndianPhoneInput";
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

  it("fills the empty organization name, organization phone, mobile and official email", () => {
    const form = prefillNgoFormWithUser(INITIAL_NGO_FORM, user);
    expect(form.organizationName).toBe("Hope Welfare Trust");
    expect(form.organizationPhone).toBe("+919876543210");
    expect(form.mobileNumber).toBe("+919876543210");
    expect(form.officialEmail).toBe("hope@ngo.test");
  });

  it("never overwrites what the NGO typed", () => {
    const typed = { ...INITIAL_NGO_FORM, organizationName: "Typed", organizationPhone: "9000000000", mobileNumber: "9000000000", officialEmail: "typed@ngo.test" };
    expect(prefillNgoFormWithUser(typed, user)).toMatchObject({ organizationName: "Typed", organizationPhone: "9000000000", mobileNumber: "9000000000", officialEmail: "typed@ngo.test" });
  });

  it("leaves fields flagged for correction empty, and does nothing without a user", () => {
    const form = prefillNgoFormWithUser(INITIAL_NGO_FORM, user, ["organizationName", "organizationPhone", "mobileNumber"]);
    expect(form.organizationName).toBe("");
    expect(form.organizationPhone).toBe("");
    expect(form.mobileNumber).toBe("");
    expect(form.officialEmail).toBe("hope@ngo.test");
    expect(prefillNgoFormWithUser(INITIAL_NGO_FORM, null)).toBe(INITIAL_NGO_FORM);
  });

  it("treats whitespace as empty", () => {
    expect(prefillNgoFormWithUser({ ...INITIAL_NGO_FORM, organizationPhone: "  ", mobileNumber: "  " }, user).organizationPhone).toBe("+919876543210");
  });

  it("leaves Representative 1 email empty, while preserving typed email and mobile", () => {
    const rep = prefillNgoFormWithUser(INITIAL_NGO_FORM, user).representatives[0];
    expect(rep).toMatchObject({ email: "", mobileNumber: "", emailVerified: false });
    const typed = { ...INITIAL_NGO_FORM, representatives: [{ ...INITIAL_NGO_FORM.representatives[0], email: "rep@ngo.test", mobileNumber: "+919111122222" }] };
    expect(prefillNgoFormWithUser(typed, user).representatives[0].email).toBe("rep@ngo.test");
    expect(prefillNgoFormWithUser(typed, user).representatives[0].mobileNumber).toBe("+919111122222");
  });
});

describe("correction items (point 9)", () => {
  it("names and places each item", () => {
    expect(correctionFieldLabel("registrationNumber")).toBe("Registration number");
    expect(correctionFieldLabel("documents.trust-deed")).toBe("Registered Trust Deed");
    expect(correctionFieldLabel("documents.company-pan")).toBe("Company PAN Card");
    expect(correctionFieldLabel("activityPhotos.1")).toBe("Activity photo 2");
    expect(correctionFieldStep("yearOfEstablishment")).toBe("org-details");
    // The PAN card and registration certificate are step 1; the rest of the documents step 2.
    expect(correctionFieldStep("documents.coi")).toBe("org-details");
    expect(correctionFieldStep("documents.pan")).toBe("org-details");
    expect(correctionFieldStep("panNumber")).toBe("org-details");
    expect(correctionFieldStep("documents.society-moa")).toBe("legal-documents");
    expect(correctionFieldStep("representatives.2.idProof")).toBe("authorized-rep");
    expect(correctionFieldLabel("representatives.2.idProof")).toBe("Representative 3 ID proof");
    expect(correctionFieldLabel("documents.s8-licence")).toBe("Section 8 Licence (Form INC-12)");
    expect(correctionFieldStep("authorizationLetter")).toBe("authorized-rep");
    expect(correctionFieldStep("logo")).toBe("org-photos");
  });

  it("finds the first flagged step in wizard order", () => {
    expect(firstCorrectionStep(["logo", "documents.trust-deed", "officialEmail"])).toBe("org-details");
    expect(firstCorrectionStep(["logo", "documents.trust-deed"])).toBe("legal-documents");
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

  it("IndianPhoneInput prevents typing more than 10 digits into an empty field", async () => {
    const user = userEvent.setup();
    let latestVal = "";
    function TestWrapper() {
      const [val, setVal] = React.useState("");
      return <IndianPhoneInput value={val} onChange={(next) => { latestVal = next; setVal(next); }} />;
    }
    render(<TestWrapper />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.maxLength).toBe(10);

    // Type 12 digits: "987654321099"
    await user.type(input, "987654321099");

    // Native maxLength limits input value to 10 characters
    expect(input.value).toBe("9876543210");
    expect(latestVal).toBe("+919876543210");
  });

  it("IndianPhoneInput cleans and limits pasted number with extra digits", () => {
    let currentVal = "";
    render(
      <IndianPhoneInput value={currentVal} onChange={(val) => { currentVal = val; }} />
    );
    const input = screen.getByRole("textbox");

    fireEvent.paste(input, {
      clipboardData: {
        getData: () => "+91 98765 43210 99",
      },
    });

    expect(currentVal).toBe("+919876543210");
  });

  it("IndianPhoneInput allows legacy 11+ digits without truncation so user can edit", () => {
    const legacyVal = "+91987654321099"; // 12 digits
    render(
      <IndianPhoneInput value={legacyVal} onChange={noop} />
    );
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.maxLength).toBe(12);
    expect(input.value).toBe("987654321099");
  });
});

