import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestDirectory } from "./RequestDirectory";
import { readUrlAudience } from "@/lib/requestAudience";
import type { ItemRequest, PublicNgoDrive } from "@/lib/api";
import { filterNgoDrives } from "@/features/ngo-drives/ngoDriveFilters";

vi.mock("@/hooks/useDynamicTranslation", () => ({
  useDynamicTranslation: (value: string | null) => value,
  TranslatedText: ({ text }: { text?: string }) => <>{text ?? ""}</>,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const SAMPLE_REQUEST: ItemRequest = {
  id: 11,
  title: "School Textbooks Class 10",
  category: "Education",
  quantity: 5,
  urgency: "NORMAL",
  city: "Mumbai, MH",
  description: "Required for board exams.",
  createdAt: "2026-08-20T10:00:00.000Z",
  imageUrl: null,
  isEmergency: false,
  requesterType: "PERSON",
  organizationName: null,
  doneeName: "Sanjay",
  pincode: null,
  status: "OPEN",
  rejectionReason: null,
  doneeId: 1,
  pickupRadiusKm: null,
  latitude: null,
  longitude: null,
  verificationTier: null,
  emergencyNature: null,
  incidentDate: null,
  verificationDueAt: null,
};

const SAMPLE_DRIVE: PublicNgoDrive = {
  id: 22,
  title: "Vasai Monsoon Medical Aid",
  category: "Medical aid",
  urgency: "CRITICAL",
  status: "LIVE",
  quantityNeeded: 100,
  quantityReceived: 30,
  quantityPledged: 20,
  stillNeeded: 50,
  unit: "KITS",
  itemName: "Medical Kits",
  beneficiaryCount: 100,
  beneficiaryGroup: "Families",
  ngoOrganizationName: "Vasai Relief Trust",
  ngoCity: "Vasai, MH",
  referencePhotoUrl: null,
  driveType: "ITEMS",
  donorCount: 3,
  neededBy: "2026-11-01T00:00:00Z",
  verified: true,
};

describe("RequestDirectory filters and drive support", () => {
  const defaultProps = {
    items: [
      { kind: "request" as const, data: SAMPLE_REQUEST },
      { kind: "drive" as const, data: SAMPLE_DRIVE },
    ],
    total: 2,
    counts: { Education: 1, "Medical aid": 1 },
    typeCounts: { PERSON: 1, NGO: 1 },
    categories: [],
    toggleCategory: vi.fn(),
    clearCategories: vi.fn(),
    audience: "all" as const,
    setAudience: vi.fn(),
    urgencies: [],
    toggleUrgency: vi.fn(),
    search: "",
    setSearch: vi.fn(),
    sort: "newest" as const,
    setSort: vi.fn(),
    location: "off" as const,
    onUseLocation: vi.fn(),
    reset: vi.fn(),
    loading: false,
    failed: false,
    onRetry: vi.fn(),
    page: 1,
    totalPages: 1,
    onPage: vi.fn(),
    canOffer: true,
    onOffer: vi.fn(),
    guest: true,
  };

  it("does NOT render the lower Source / Urgency strip under All local needs", () => {
    render(<RequestDirectory {...defaultProps} />);

    expect(screen.queryByRole("group", { name: "Filter by source" })).toBeNull();
    expect(screen.queryByText(/^Source:$/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "NGO" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Normal" })).toBeNull();
  });

  it("renders both donee requests and NGO drives when audience is 'all' (Everyone)", () => {
    render(<RequestDirectory {...defaultProps} audience="all" total={2} />);

    expect(screen.getByText("School Textbooks Class 10")).toBeInTheDocument();
    expect(screen.getByText("Vasai Monsoon Medical Aid")).toBeInTheDocument();
    expect(screen.getByText("2 needs")).toBeInTheDocument();
  });

  it("shows donee requests only and '{n} requests' counter when audience is 'people' (Donee)", () => {
    render(
      <RequestDirectory
        {...defaultProps}
        audience="people"
        items={[{ kind: "request", data: SAMPLE_REQUEST }]}
        total={1}
      />
    );

    expect(screen.getByText("School Textbooks Class 10")).toBeInTheDocument();
    expect(screen.queryByText("Vasai Monsoon Medical Aid")).toBeNull();
    expect(screen.getByText("1 request")).toBeInTheDocument();
  });

  it("shows NGO drives only and '{n} drives' counter when audience is 'ngos' (NGOs)", () => {
    render(
      <RequestDirectory
        {...defaultProps}
        audience="ngos"
        items={[{ kind: "drive", data: SAMPLE_DRIVE }]}
        total={1}
      />
    );

    expect(screen.getByText("Vasai Monsoon Medical Aid")).toBeInTheDocument();
    expect(screen.queryByText("School Textbooks Class 10")).toBeNull();
    expect(screen.getByText("1 drive")).toBeInTheDocument();
  });

  it("displays correct counts on top toolbar chips: Everyone = reqs + drives, Donee = reqs, NGOs = drives", () => {
    render(
      <RequestDirectory
        {...defaultProps}
        typeCounts={{ PERSON: 5, NGO: 3 }}
      />
    );

    const everyoneBtn = screen.getByRole("button", { name: /^Everyone/i });
    const doneeBtn = screen.getByRole("button", { name: /^Donee/i });
    const ngosBtn = screen.getByRole("button", { name: /^NGOs/i });

    expect(everyoneBtn).toHaveTextContent("8");
    expect(doneeBtn).toHaveTextContent("5");
    expect(ngosBtn).toHaveTextContent("3");
  });

  it("triggers setAudience when top toolbar chips are clicked", async () => {
    const user = userEvent.setup();
    const setAudienceMock = vi.fn();
    render(<RequestDirectory {...defaultProps} setAudience={setAudienceMock} />);

    const doneeBtn = screen.getByRole("button", { name: /^Donee/i });
    await user.click(doneeBtn);
    expect(setAudienceMock).toHaveBeenCalledWith("people");

    const ngosBtn = screen.getByRole("button", { name: /^NGOs/i });
    await user.click(ngosBtn);
    expect(setAudienceMock).toHaveBeenCalledWith("ngos");
  });

  it("preselects NGOs when ?source=ngo is in the URL", () => {
    window.history.pushState({}, "", "/requests?source=ngo");
    expect(readUrlAudience()).toBe("ngos");

    window.history.pushState({}, "", "/requests?type=ngos");
    expect(readUrlAudience()).toBe("ngos");

    window.history.pushState({}, "", "/requests?type=people");
    expect(readUrlAudience()).toBe("people");

    window.history.pushState({}, "", "/requests");
    expect(readUrlAudience()).toBe("all");
  });

  it("filters drives by urgency (CRITICAL labelled Urgent) and toggles top urgency control", async () => {
    const user = userEvent.setup();
    const toggleUrgencyMock = vi.fn();
    render(<RequestDirectory {...defaultProps} toggleUrgency={toggleUrgencyMock} />);

    // Top Urgency dropdown button
    const urgencyToggleBtn = screen.getByRole("button", { name: /Urgency/i });
    await user.click(urgencyToggleBtn);

    // Urgent chip inside the filters panel (labelled Urgent, value CRITICAL)
    const urgentBtn = screen.getByRole("button", { name: "Urgent" });
    expect(urgentBtn).toBeInTheDocument();
    await user.click(urgentBtn);
    expect(toggleUrgencyMock).toHaveBeenCalledWith("CRITICAL");

    // Verify filterNgoDrives filters by urgency
    const drives: PublicNgoDrive[] = [
      SAMPLE_DRIVE, // CRITICAL
      { ...SAMPLE_DRIVE, id: 99, urgency: "NORMAL", title: "Normal Drive" },
    ];
    const filteredUrgent = filterNgoDrives(drives, { urgency: "urgent" });
    expect(filteredUrgent).toHaveLength(1);
    expect(filteredUrgent[0].id).toBe(22);
  });

  it("renders empty state 'No needs match your filters' + 'Clear filters' when items is empty", async () => {
    const user = userEvent.setup();
    const resetMock = vi.fn();
    render(
      <RequestDirectory
        {...defaultProps}
        items={[]}
        total={0}
        reset={resetMock}
      />
    );

    expect(screen.getByText("No needs match your filters")).toBeInTheDocument();
    const clearBtn = screen.getByRole("button", { name: /Clear filters/i });
    await user.click(clearBtn);
    expect(resetMock).toHaveBeenCalled();
  });
});

