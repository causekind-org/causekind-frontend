import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrgDetails } from "./steps/OrgDetails";
import { AuthorizedRepresentative } from "./steps/AuthorizedRepresentative";
import { DocUploadCard } from "./components/DocUploadCard";
import { INITIAL_NGO_FORM, type NGOFormState } from "./ngoRegistrationModel";
import { buildSubmitPayload } from "./ngoWizardPayload";
import {
  checkNgoPanLetters, sendNgoRepresentativeEmailCode, uploadNgoDocument, verifyNgoRepresentativeEmailCode,
} from "@/lib/api";

vi.mock("@/lib/api", () => ({
  uploadNgoDocument: vi.fn(),
  checkNgoPanLetters: vi.fn(),
  sendNgoRepresentativeEmailCode: vi.fn(),
  verifyNgoRepresentativeEmailCode: vi.fn(),
  NGO_DOCUMENT_RULE: "Upload a PDF, JPG or PNG up to 10 MB",
}));

beforeAll(() => {
  window.scrollTo = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(uploadNgoDocument).mockImplementation(async (file: File) => ({ documentId: 50, s3Key: `ngo-documents/${file.name}` }) as never);
  vi.mocked(checkNgoPanLetters).mockResolvedValue({ warnings: [] } as never);
});

const pdf = (name = "doc.pdf") => new File(["%PDF-1.4"], name, { type: "application/pdf" });
const file = (name: string, documentId = 1) => ({ name, documentId });

/** Renders a step with real state, and exposes the latest form for assertions. */
function Harness({ initial, step, onForm }: { initial: NGOFormState; step: "org" | "rep"; onForm: (f: NGOFormState) => void }) {
  const [data, setData] = useState(initial);
  const onChange = (patch: Partial<NGOFormState>) => setData((prev) => { const next = { ...prev, ...patch }; onForm(next); return next; });
  const props = { data, onChange, onBack: vi.fn(), onContinue: vi.fn() };
  return step === "org" ? <OrgDetails {...props} /> : <AuthorizedRepresentative {...props} />;
}

describe("Step 1: Organization", () => {
  it("asks for the fields in order, with the certificate named by structure", async () => {
    render(<Harness initial={INITIAL_NGO_FORM} step="org" onForm={() => {}} />);
    const labels = [...document.querySelectorAll("label, [aria-label^='Upload ']")].map((el) =>
      (el.getAttribute("aria-label") ?? el.textContent ?? "").replace("*", "").trim());
    const order = ["Organization Name", "Legal Structure", "Upload PAN card", "PAN Number", "Registration Number", "Year of Establishment", "Registered Office Address"];
    const positions = order.map((l) => labels.findIndex((x) => x.startsWith(l)));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(screen.getByText(/choose your legal structure first/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Section 8/i }));
    expect(screen.getByText("Certificate of Incorporation (MCA)")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Society/i }));
    expect(screen.getByText("Society Registration Certificate")).toBeInTheDocument();
  });

  it("shows the PAN letter warnings for the typed PAN, without blocking", async () => {
    vi.mocked(checkNgoPanLetters).mockResolvedValue({
      warnings: [{ code: "PERSONAL_PAN", severity: "DANGER", field: "panNumber", message: "This is a personal PAN. NGOs must use the organization's PAN." }],
    } as never);
    render(<Harness initial={{ ...INITIAL_NGO_FORM, organizationName: "Hope Welfare Trust", legalStructure: "trust" }} step="org" onForm={() => {}} />);
    await userEvent.type(screen.getByLabelText(/PAN Number/i), "aaaph1234k");
    expect(screen.getByLabelText(/PAN Number/i)).toHaveValue("AAAPH1234K");
    const warnings = await screen.findByRole("list", { name: "PAN check" });
    expect(warnings).toHaveTextContent(/personal PAN/);
    expect(checkNgoPanLetters).toHaveBeenCalledWith({ panNumber: "AAAPH1234K", legalStructure: "trust", organizationName: "Hope Welfare Trust" });
  });

  it("changing the structure asks first, then keeps the PAN card and common documents only", async () => {
    let form = INITIAL_NGO_FORM;
    const start: NGOFormState = {
      ...INITIAL_NGO_FORM, legalStructure: "trust", authorizationLetter: file("resolution.pdf"),
      documents: { pan: file("pan.pdf"), "trust-reg-cert": file("reg.pdf"), "trust-deed": file("deed.pdf"), "bank-proof": file("bank.pdf") },
    };
    render(<Harness initial={start} step="org" onForm={(f) => { form = f; }} />);
    await userEvent.click(screen.getByRole("button", { name: /Society/i }));
    const dialog = screen.getByRole("alertdialog", { name: /Change legal structure/i });
    await userEvent.click(within(dialog).getByRole("button", { name: /Keep Trust/i }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByText("reg.pdf")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Society/i }));
    await userEvent.click(screen.getByRole("button", { name: "Change structure" }));
    expect(form.legalStructure).toBe("society");
    expect(Object.keys(form.documents).sort()).toEqual(["bank-proof", "pan"]);
    expect(form.authorizationLetter).toBeNull();
    expect(screen.getByText("pan.pdf")).toBeInTheDocument();
  });
});

describe("Uploads: PDF, JPG or PNG up to 10 MB", () => {
  it("refuses other types and larger files before uploading", async () => {
    render(<DocUploadCard docId="pan" label="PAN card" category="must-have" uploaded={null} onUpload={vi.fn()} onRemove={vi.fn()} />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await userEvent.upload(input, new File(["x"], "notes.txt", { type: "text/plain" }), { applyAccept: false });
    expect(await screen.findByRole("alert")).toHaveTextContent("Upload a PDF, JPG or PNG up to 10 MB");
    const big = new File([new Uint8Array(11 * 1024 * 1024)], "big.pdf", { type: "application/pdf" });
    await userEvent.upload(input, big);
    expect(screen.getByRole("alert")).toHaveTextContent("Upload a PDF, JPG or PNG up to 10 MB");
    expect(uploadNgoDocument).not.toHaveBeenCalled();
    const nearly = new File([new Uint8Array(Math.floor(9.9 * 1024 * 1024))], "ok.pdf", { type: "application/pdf" });
    await userEvent.upload(input, nearly);
    await waitFor(() => expect(uploadNgoDocument).toHaveBeenCalledTimes(1));
  });
});

describe("Step 3: Authorized representatives", { timeout: 20000 }, () => {
  const ready: NGOFormState = {
    ...INITIAL_NGO_FORM, legalStructure: "section8",
    representatives: [{ fullName: "", designation: "", mobileNumber: "+919876543210", email: "hope@ngo.test", panNumber: "", idProof: null, emailVerified: false }],
  };

  it("labels the authorization document by structure and starts with one required card", () => {
    render(<Harness initial={ready} step="rep" onForm={() => {}} />);
    expect(screen.getByText("Board resolution (certified true copy) signed by a director or company secretary")).toBeInTheDocument();
    expect(screen.getAllByRole("group", { name: /Representative \d/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Remove representative 1/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toHaveValue("hope@ngo.test");
  });

  it("adds cards up to five and removes the optional ones", async () => {
    let form = ready;
    render(<Harness initial={ready} step="rep" onForm={(f) => { form = f; }} />);
    const add = screen.getByRole("button", { name: /Add representative/i });
    for (let i = 0; i < 4; i++) await userEvent.click(add);
    expect(screen.getAllByRole("group", { name: /Representative \d/ })).toHaveLength(5);
    expect(add).toBeDisabled();
    await userEvent.type(screen.getAllByLabelText(/^Full name/)[2], "Third Person");
    await userEvent.click(screen.getByRole("button", { name: "Remove representative 2" }));
    expect(form.representatives).toHaveLength(4);
    expect(form.representatives[1].fullName).toBe("Third Person");
    expect(add).toBeEnabled();
  });

  it("verifies an email with the code; changing the email needs a new code", async () => {
    vi.mocked(sendNgoRepresentativeEmailCode).mockResolvedValue({ sent: true, verified: false });
    vi.mocked(verifyNgoRepresentativeEmailCode)
      .mockRejectedValueOnce(new Error("That verification code is incorrect or has expired."))
      .mockResolvedValueOnce({ verified: true });
    let form = ready;
    render(<Harness initial={ready} step="rep" onForm={(f) => { form = f; }} />);
    await userEvent.type(screen.getByLabelText(/^Full name/), "Ananya");
    await userEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(sendNgoRepresentativeEmailCode).toHaveBeenCalledWith("hope@ngo.test", "Ananya");
    await userEvent.type(await screen.findByLabelText(/6-digit code/), "111111");
    expect(await screen.findByRole("alert")).toHaveTextContent(/incorrect or has expired/);
    expect(form.representatives[0].emailVerified).toBe(false);
    await userEvent.clear(screen.getByLabelText(/6-digit code/));
    await userEvent.type(screen.getByLabelText(/6-digit code/), "222222");
    expect(await screen.findByText("Verified")).toBeInTheDocument();
    expect(form.representatives[0].emailVerified).toBe(true);

    await userEvent.type(screen.getByLabelText(/^Email/), "x");
    expect(form.representatives[0].emailVerified).toBe(false);
    expect(screen.getByRole("button", { name: "Send code" })).toBeInTheDocument();
  });

  it("warns when a representative's PAN is not a personal PAN", async () => {
    render(<Harness initial={ready} step="rep" onForm={() => {}} />);
    await userEvent.type(screen.getByLabelText(/^PAN number/), "AAATH1234K");
    expect(screen.getByText(/not a personal PAN/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/^PAN number/));
    await userEvent.type(screen.getByLabelText(/^PAN number/), "ABCPS1234K");
    expect(screen.queryByText(/not a personal PAN/)).not.toBeInTheDocument();
  });

  it("continues only when card 1 is complete and every filled card is complete", () => {
    const card = { fullName: "A", designation: "Trustee", mobileNumber: "+919876543210", email: "a@ngo.test", panNumber: "", idProof: file("id.pdf"), emailVerified: true };
    const done = { ...ready, authorizationLetter: file("res.pdf"), representatives: [card, { ...card, fullName: "B", email: "b@ngo.test", idProof: null }] };
    const { unmount } = render(<Harness initial={done} step="rep" onForm={() => {}} />);
    expect(screen.getByRole("button", { name: /Continue/i })).toBeDisabled();
    expect(screen.getByText(/Representative 2: ID proof/)).toBeInTheDocument();
    unmount();
    render(<Harness initial={{ ...done, representatives: [card] }} step="rep" onForm={() => {}} />);
    expect(screen.getByRole("button", { name: /Continue/i })).toBeEnabled();
  });

  it("submits card 1 as the contact and drops empty extra cards", () => {
    const card = { fullName: "A", designation: "Trustee", mobileNumber: "+919876543210", email: "a@ngo.test", panNumber: "abcps1234k", idProof: file("id.pdf", 7), emailVerified: true };
    const payload = buildSubmitPayload({ ...ready, legalStructure: "trust", panNumber: "aaath 1234k",
      documents: { pan: file("p.pdf"), "trust-deed": file("d.pdf"), "society-moa": file("old.pdf"), "trustee-info": file("old2.pdf") },
      representatives: [card, { ...INITIAL_NGO_FORM.representatives[0] }] });
    expect(payload.officialEmail).toBe("a@ngo.test");
    expect(payload.representativeName).toBe("A");
    expect(payload.panNumber).toBe("AAATH1234K");
    expect(payload.representatives).toHaveLength(1);
    expect(payload.representatives[0].panNumber).toBe("ABCPS1234K");
    expect(payload.representatives[0].idProof?.documentId).toBe(7);
    expect(Object.keys(payload.documents).sort()).toEqual(["pan", "trust-deed"]);
  });
});
