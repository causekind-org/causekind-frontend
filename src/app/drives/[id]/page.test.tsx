import { render, screen, waitFor } from "@testing-library/react";
import DriveDetailPage from "./page";
import { DriveDetailView } from "@/features/ngo-drives/components/DriveDetailView";
import type { PublicNgoDrive } from "@/lib/api";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the next/navigation hooks
// The drive page FAQ reads the shared "faq" keys: real English strings.
vi.mock("next-intl", async () => {
  const en = (await import("../../../../messages/en.json")).default as Record<string, Record<string, unknown>>;
  const t = (ns?: string) => (k: string) => { const v = ns ? en[ns]?.[k] : undefined; return typeof v === "string" ? v : k; };
  return { useLocale: () => "en", useTranslations: t };
});
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock API
const mockGetNgoDrive = vi.fn();
const mockGetMyNgoDriveOffers = vi.fn();
const mockGetNgoDriveProof = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getNgoDrive: (...args: any[]) => mockGetNgoDrive(...args),
    getMyNgoDriveOffers: (...args: any[]) => mockGetMyNgoDriveOffers(...args),
    getNgoDriveProof: (...args: any[]) => mockGetNgoDriveProof(...args),
  };
});

describe("DriveDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    mockGetMyNgoDriveOffers.mockResolvedValue([]);
    mockGetNgoDriveProof.mockResolvedValue(null);
  });

  it("renders with a PublicNgoDriveDto-shaped response", async () => {
    mockGetNgoDrive.mockResolvedValue({
      id: 1,
      title: "Winter Blankets for Homeless",
      category: "Bedding",
      itemName: "Blankets",
      quantityNeeded: 50,
      unit: "pieces",
      condition: "GENTLY_USED",
      details: "Must be thick",
      description: "We are collecting blankets before winter.",
      urgency: "HIGH",
      beneficiaryGroup: "Homeless people",
      beneficiaryCount: 50,
      neededBy: "2024-11-01",
      availableDays: ["Mon", "Wed"],
      availableFrom: "10:00",
      availableTo: "14:00",
      quantityPledged: 10,
      quantityReceived: 5,
      stillNeeded: 35,
      status: "APPROVED",
      ngoOrganizationName: "Helping Hands NGO",
      ngoCity: "New Delhi",
      verified: true,
    });

    render(<DriveDetailPage />);

    // Wait for the drive to load and check title
    expect(await screen.findByText("Winter Blankets for Homeless")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId("page-skeleton")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Winter Blankets for Homeless")).toBeInTheDocument();
    expect(screen.getAllByText("Helping Hands NGO").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("We are collecting blankets before winter.")).toBeInTheDocument();
    expect(screen.getByText("Gently used items are welcome (clean, working, no major damage).")).toBeInTheDocument();
    expect(screen.getByText("Mon, Wed, 10:00–14:00")).toBeInTheDocument();
  });

  it("renders all V2 sections when V2 fields are present", async () => {
    const v2Drive: PublicNgoDrive = {
      id: 2,
      title: "Tablets for Rural School Students",
      tagline: "Bridging the digital divide for 100 students",
      category: "Electronics",
      itemName: "Android Tablets",
      quantityNeeded: 100,
      unit: "PIECES",
      condition: "NEW_OR_GENTLY_USED",
      conditionRule: "Accepts: Unused, Like New, Good",
      mustBeWorking: true,
      whoFor: "Underprivileged students in grade 8-10 at Zilla Parishad school.",
      whyNow: "Board exams begin in two months and syllabus is online.",
      whatChanges: "Every student can participate in interactive learning.",
      beneficiaryGroup: "School students",
      beneficiaryCount: 100,
      beneficiaryDescription: "Enrolled in government-run high school",
      neededBy: "2024-12-15",
      availableDays: ["MON", "TUE", "WED", "THU", "FRI"],
      availableFrom: "09:00",
      availableTo: "17:00",
      handoverMode: "BOTH",
      locationArea: "Dharavi",
      locationCity: "Mumbai",
      urgency: "HIGH",
      changemakerName: "Sunita Deshmukh",
      changemakerRole: "Program Director",
      changemakerPhotoUrl: "https://example.com/sunita.jpg",
      changemakerWhy: "I grew up without books; technology changes lives.",
      pastWorkUrl: "https://example.com/sunita-impact",
      quantityPledged: 20,
      quantityReceived: 30,
      stillNeeded: 50,
      status: "LIVE",
      ngoOrganizationName: "Rural Education Initiative",
      ngoCity: "Mumbai",
      verified: true,
      ngo: {
        organizationName: "Rural Education Initiative",
        city: "Mumbai",
        legalStructure: "TRUST",
        registrationNumber: "TR-12345/2015",
        yearOfEstablishment: "2015",
        registeredOfficeAddress: "Plot 42, Sector 12, Dharavi, Mumbai 400017",
        verifiedAt: "2024-01-15T10:30:00Z",
        website: "https://ruraleducation.org",
        trackRecord: {
          completedDrives: 4,
          itemsReceived: 350,
          drivesWithApprovedProof: 4,
        },
      },
      photoUrls: [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ],
    };

    mockGetNgoDrive.mockResolvedValue(v2Drive);
    render(<DriveDetailPage />);

    // 1. Hero & Tagline & Location
    expect(await screen.findByText("Tablets for Rural School Students")).toBeInTheDocument();
    expect(screen.getByText("Bridging the digital divide for 100 students")).toBeInTheDocument();
    expect(screen.getByText("Dharavi, Mumbai")).toBeInTheDocument();
    expect(screen.getByText("Needed by 15-12-2024")).toBeInTheDocument();

    // 2. Story answers
    expect(screen.getByText("Who is this for?")).toBeInTheDocument();
    expect(screen.getByText("Underprivileged students in grade 8-10 at Zilla Parishad school.")).toBeInTheDocument();
    expect(screen.getByText("Why now?")).toBeInTheDocument();
    expect(screen.getByText("Board exams begin in two months and syllabus is online.")).toBeInTheDocument();
    expect(screen.getByText("What will change after you give?")).toBeInTheDocument();
    expect(screen.getByText("Every student can participate in interactive learning.")).toBeInTheDocument();

    // 3. Must be working note
    expect(screen.getByText("Items must be in working order")).toBeInTheDocument();

    // 4. Beneficiary description
    expect(screen.getByText("Enrolled in government-run high school")).toBeInTheDocument();

    // 5. Changemaker section
    expect(screen.getByText("Who is behind the drive")).toBeInTheDocument();
    expect(screen.getByText("Sunita Deshmukh")).toBeInTheDocument();
    expect(screen.getByText("Program Director")).toBeInTheDocument();
    expect(screen.getByText(/I grew up without books/)).toBeInTheDocument();

    // 6. Handover section with public registered address and Open in Maps
    expect(screen.getByText("Drop-off or pickup")).toBeInTheDocument();
    expect(screen.getByText("Plot 42, Sector 12, Dharavi, Mumbai 400017")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open in maps/i })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps")
    );
    expect(screen.getByText("The drive contact person's phone number is shared after the NGO accepts your offer.")).toBeInTheDocument();

    // 7. NGO Card with Verified badge date & checklist
    expect(screen.getByText("Verified by CauseKind")).toBeInTheDocument();
    expect(screen.getByText(/Verified on 15-01-2024/)).toBeInTheDocument();
    expect(screen.getByText(/What we checked: registration, address, contact person/)).toBeInTheDocument();
    expect(screen.queryByText("Legal structure")).not.toBeInTheDocument(); // removed from the About the NGO card
    expect(screen.getByText("2015")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ruraleducation.org" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view past work/i })).toHaveAttribute("href", "https://example.com/sunita-impact");

    // 8. Track record
    expect(screen.getByText("Track Record on CauseKind")).toBeInTheDocument();
    expect(screen.getByText("350")).toBeInTheDocument();
  });

  it("legacy drive falls back cleanly without errors or changemaker section", async () => {
    const legacyDrive: PublicNgoDrive = {
      id: 3,
      title: "Books for Community Library",
      category: "Education",
      itemName: "Story books",
      quantityNeeded: 200,
      unit: "PIECES",
      condition: "ANY_USABLE",
      description: "Older description without structured story answers.",
      neededBy: "2025-05-10",
      quantityPledged: 0,
      quantityReceived: 0,
      stillNeeded: 200,
      status: "LIVE",
      ngoOrganizationName: "City Library Trust",
      ngoCity: "Pune",
      verified: false,
    };

    mockGetNgoDrive.mockResolvedValue(legacyDrive);
    render(<DriveDetailPage />);

    expect(await screen.findByText("Books for Community Library")).toBeInTheDocument();
    expect(screen.getByText("Older description without structured story answers.")).toBeInTheDocument();
    expect(screen.queryByText("Who is this for?")).toBeNull();
    expect(screen.queryByText("Who is behind the drive")).toBeNull();
    expect(screen.queryByText("Track Record on CauseKind")).toBeNull();
  });

  it("private fields (contactPhone, altContact) are never rendered in document", async () => {
    const privateDrive: any = {
      id: 4,
      title: "Clothing Drive",
      category: "Clothing",
      itemName: "Jackets",
      quantityNeeded: 20,
      unit: "PIECES",
      neededBy: "2025-01-01",
      quantityPledged: 0,
      quantityReceived: 0,
      stillNeeded: 20,
      status: "LIVE",
      contactName: "Secret Person",
      contactPhone: "+91-9876543210",
      altContact: "alt@secret.org",
      adminReason: "Internal review note",
      verified: true,
      ngoOrganizationName: "Warm Hearts",
    };

    mockGetNgoDrive.mockResolvedValue(privateDrive);
    render(<DriveDetailPage />);

    expect(await screen.findByText("Clothing Drive")).toBeInTheDocument();
    expect(screen.queryByText("Secret Person")).toBeNull();
    expect(screen.queryByText("+91-9876543210")).toBeNull();
    expect(screen.queryByText("alt@secret.org")).toBeNull();
    expect(screen.queryByText("Internal review note")).toBeNull();
  });

  it("preview mode renders preview banner and disables CTA button", () => {
    const testDrive: PublicNgoDrive = {
      id: 0,
      title: "Draft NGO Drive Preview",
      category: "Furniture",
      itemName: "Desks",
      quantityNeeded: 10,
      unit: "PIECES",
      neededBy: "2025-06-01",
      quantityPledged: 0,
      quantityReceived: 0,
      stillNeeded: 10,
      status: "LIVE",
      ngoOrganizationName: "Preview Foundation",
      verified: true,
    };

    render(<DriveDetailView drive={testDrive} mode="preview" />);

    expect(screen.getByText("Preview, not published yet")).toBeInTheDocument();
    const ctaButton = screen.getByTestId("drive-cta-button");
    expect(ctaButton).toBeDisabled();
    expect(screen.getByText(/Preview only — donations are disabled until published/)).toBeInTheDocument();
  });
});
