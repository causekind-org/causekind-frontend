import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NgoReviewPanel } from "./NgoReviewPanel";
import { adminGetNgoApplications, adminGetNgoApplication, adminGetNgoEvidenceLink } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => ({
  ApiError: (await orig<typeof import("@/lib/api")>()).ApiError,
  adminGetNgoApplications: vi.fn(),
  adminGetNgoApplication: vi.fn(),
  adminDecideNgoApplication: vi.fn(),
  adminGetNgoEvidenceLink: vi.fn(),
}));

const application = {
  id: 20, userId: 8, applicationId: "CK-NGO-2026-V2000001", organizationName: "Hope Welfare Trust", status: "UNDER_REVIEW",
  legalStructure: "TRUST", registrationNumber: "TR/2026/1001", registeredOfficeAddress: "12 Shanti Nagar, Pune",
  yearOfEstablishment: "2019", representativeName: "Ananya Sharma", designation: "Secretary", mobileNumber: "+919876543210",
  officialEmail: "contact@hope.test", verifiedAt: "2026-10-05T10:00:00", submittedAt: null, updatedAt: null, reviewedAt: null,
  rejectionReason: null, needsInformationDetails: null, aiScreeningVerdict: null, aiScreeningNotes: null, panNumber: "AABCT1234C",
};
const doc = (id: number, type: string, name: string, field: string) =>
  ({ id, kind: "document", type, name, ownershipRecorded: true, moderationVerdict: null, field, mimeType: "application/pdf" });
const files = [
  doc(1, "PAN", "pan.pdf", "documents.pan"),
  doc(2, "TRUST_REG_CERT", "reg.pdf", "documents.trust-reg-cert"),
  doc(3, "TRUST_DEED", "deed.pdf", "documents.trust-deed"),
  doc(4, "BANK_PROOF", "bank.pdf", "documents.bank-proof"),
  doc(5, "CERT_12A", "12a.pdf", "documents.cert-12a"),
  doc(6, "CERT_80G", "80g.pdf", "documents.cert-80g"),
  doc(7, "AUTHORIZATION_LETTER", "resolution.pdf", "authorizationLetter"),
  doc(8, "REP_ID_PROOF", "ananya-id.pdf", "representatives.0.idProof"),
  doc(9, "REP_ID_PROOF", "ravi-id.pdf", "representatives.1.idProof"),
];
const panCheck = {
  check: {
    panNumber: "AABCT1234C", validFormat: true, holderLetter: "C", holderType: "Company", legalStructure: "trust",
    expectedHolderLetter: "T", structureMatches: false, personalPan: false, nameLetter: "H", nameLetterMatches: false, warnings: [],
  },
  organizationNameSource: null, dateOfFormationSource: null, panNumberSource: "typed",
};
const representatives = [
  { position: 0, fullName: "Ananya Sharma", designation: "Secretary", mobileNumber: "+919876543210", email: "contact@hope.test",
    emailVerified: true, emailVerifiedAt: "2026-10-05T09:00:00", panNumber: "ABCPS1234K", panValidFormat: true, panPersonal: true,
    idProofFileId: 8, idProofField: "representatives.0.idProof" },
  { position: 1, fullName: "Ravi Kumar", designation: "Treasurer", mobileNumber: "+919811112222", email: "ravi@hope.test",
    emailVerified: true, emailVerifiedAt: "2026-10-05T09:05:00", panNumber: "AABCT1234C", panValidFormat: true, panPersonal: false,
    idProofFileId: 9, idProofField: "representatives.1.idProof" },
];
const v2Detail = {
  application, files, submissions: [application], decisions: [], current: true, corrections: null, panCheck,
  wizardV2: true, representatives,
  requiredDocuments: ["documents.pan", "documents.trust-reg-cert", "documents.trust-deed", "documents.bank-proof", "documents.cert-12a"],
  optionalDocuments: ["documents.cert-80g", "documents.darpan", "documents.financials"],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminGetNgoApplications).mockResolvedValue({ content: [application], totalPages: 1, totalElements: 1 } as never);
  vi.mocked(adminGetNgoEvidenceLink).mockImplementation(async (_id, file) => ({ url: `https://signed.example/${file.kind}-${file.id}` }));
});

describe("admin NGO review: current wizard", { timeout: 20000 }, () => {
  it("shows the PAN, the PAN check (no 'read from card' row), and each representative", async () => {
    vi.mocked(adminGetNgoApplication).mockResolvedValue(v2Detail as never);
    render(<NgoReviewPanel initialApplicationId="CK-NGO-2026-V2000001" />);

    const box = await screen.findByTestId("pan-check");
    expect(box).toHaveAttribute("data-status", "problem");
    expect(within(box).getByTestId("pan-check-holder")).toHaveTextContent(/Company · does not match Trust/);
    expect(within(box).getByTestId("pan-check-name")).toHaveTextContent(/Does not match/);
    expect(within(box).queryByTestId("pan-check-sources")).not.toBeInTheDocument();
    expect(screen.getAllByText("AABCT1234C").length).toBeGreaterThan(0);

    const reps = screen.getAllByTestId("representative");
    expect(reps).toHaveLength(2);
    expect(reps[0]).toHaveTextContent("1. Ananya Sharma");
    expect(reps[0]).toHaveTextContent("✓ verified");
    expect(reps[0]).toHaveTextContent("personal PAN ✓");
    expect(reps[0]).toHaveTextContent("ananya-id.pdf");
    expect(reps[1]).toHaveTextContent(/not a personal PAN/);
  });

  it("groups evidence by step and marks required and optional documents", async () => {
    vi.mocked(adminGetNgoApplication).mockResolvedValue(v2Detail as never);
    render(<NgoReviewPanel initialApplicationId="CK-NGO-2026-V2000001" />);
    await screen.findByText("Organization (step 1)");
    const headings = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(headings).toEqual(["Organization (step 1)", "Legal documents (step 2)", "Authorized representatives (step 3)"]);
    const items = screen.getAllByTestId("evidence-item");
    const byName = (n: string) => items.find((i) => i.textContent?.includes(n))!;
    expect(byName("80g.pdf")).toHaveTextContent("Optional · a plus");
    expect(byName("bank.pdf")).toHaveTextContent("Required");
    expect(byName("ravi-id.pdf")).toHaveTextContent("Representative 2 ID proof");
  });

  it("can request changes on new fields, documents and a representative", async () => {
    vi.mocked(adminGetNgoApplication).mockResolvedValue(v2Detail as never);
    render(<NgoReviewPanel initialApplicationId="CK-NGO-2026-V2000001" />);
    const items = await screen.findByRole("group", { name: /Items that need changes/i });
    for (const name of ["PAN number", "PAN card", "Representative 2 email", "Representative 1 ID proof", "80G certificate", "Section 8 Licence (Form INC-12)"].slice(0, 5)) {
      expect(within(items).getByText(name)).toBeInTheDocument();
    }
    // Representative 1's fields replace the older single-representative items.
    expect(within(items).queryByText("Official email")).not.toBeInTheDocument();
    await userEvent.click(within(items).getByRole("checkbox", { name: /Representative 2 email/ }));
    expect(within(items).getByRole("textbox", { name: /What is wrong with Representative 2 email/ })).toBeInTheDocument();
  });

  it("still shows an older application as it was submitted", async () => {
    const older = {
      application: { ...application, panNumber: null }, submissions: [application], decisions: [], current: true, corrections: null,
      panCheck: null, wizardV2: false, representatives: [],
      requiredDocuments: v2Detail.requiredDocuments, optionalDocuments: v2Detail.optionalDocuments,
      files: [doc(11, "TRUSTEE_INFO", "trustees.pdf", "documents.trustee-info"), doc(12, "PAN", "pan-old.pdf", "documents.pan")],
    };
    vi.mocked(adminGetNgoApplication).mockResolvedValue(older as never);
    render(<NgoReviewPanel initialApplicationId="CK-NGO-2026-V2000001" />);
    expect(await screen.findByText(/earlier application form/i)).toBeInTheDocument();
    expect(screen.queryByTestId("pan-check")).not.toBeInTheDocument();
    expect(screen.queryByTestId("representative")).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual(["Documents"]);
    expect(screen.getAllByText("Current Trustee / Office-Bearer Info").length).toBeGreaterThan(0);
    const checklist = screen.getByRole("group", { name: /Items that need changes/i });
    expect(within(checklist).getByText("Official email")).toBeInTheDocument();
  });
});
