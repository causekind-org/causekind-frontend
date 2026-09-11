import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import NgoProfilePage from "./page";
import { useAuth } from "@/hooks/useAuth";
import { getProfile, getMyNgoApplication, getNgoDraft } from "@/lib/api";

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

vi.mock("@/lib/api", () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  getMyNgoApplication: vi.fn(),
  getNgoDraft: vi.fn(),
  submitNgoApplication: vi.fn(),
  saveNgoDraft: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("NgoProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders NGO profile card with organization name, role 'NGO', and 'CAUSEKIND NGO PARTNER' label", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });

    vi.mocked(getProfile).mockResolvedValue({
      id: 101,
      email: "contact@smilefoundation.org",
      fullName: "Smile Foundation",
      role: "NGO",
      phone: "+919876543210",
      city: "Mumbai, Maharashtra",
      latitude: null,
      longitude: null,
    });

    vi.mocked(getMyNgoApplication).mockResolvedValue(null);
    vi.mocked(getNgoDraft).mockResolvedValue({
      organizationName: "Smile Foundation",
      officialEmail: "contact@smilefoundation.org",
      mobileNumber: "+919876543210",
      registeredOfficeAddress: "Mumbai, Maharashtra",
      currentStep: "org-details",
      status: "DRAFT",
    } as any);

    render(<NgoProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("CAUSEKIND NGO PARTNER")).toBeInTheDocument();
    });

    // Organization name rendered in card and heading
    expect(screen.getAllByText("Smile Foundation").length).toBeGreaterThanOrEqual(1);

    // Initials SF
    expect(screen.getByText("SF")).toBeInTheDocument();

    // Role NGO
    expect(screen.getByText("NGO")).toBeInTheDocument();

    // Email, phone, city
    expect(screen.getByText("contact@smilefoundation.org")).toBeInTheDocument();
    expect(screen.getByText("+919876543210")).toBeInTheDocument();
    expect(screen.getAllByText("Mumbai, Maharashtra").length).toBeGreaterThanOrEqual(1);

    // "Edit account details" button
    expect(screen.getByRole("button", { name: /Edit account details/i })).toBeInTheDocument();
  });

  it("renders three-stat counter row adapted to NGO stats", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getProfile).mockRejectedValue(new Error("Not found"));
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);
    vi.mocked(getNgoDraft).mockResolvedValue(null);

    render(<NgoProfilePage />);

    await waitFor(() => {
      expect(screen.getByText(/items requested/i)).toBeInTheDocument();
      expect(screen.getByText(/active campaigns/i)).toBeInTheDocument();
      expect(screen.getByText(/donations matched/i)).toBeInTheDocument();
    });
  });

  it("renders completion percentage indicator and embedded 6-step registration wizard", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getProfile).mockRejectedValue(new Error("Not found"));
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);
    vi.mocked(getNgoDraft).mockResolvedValue({
      organizationName: "Smile Foundation",
      currentStep: "authorized-rep",
    } as any);

    render(<NgoProfilePage />);

    // Check completion progress indicator is displayed
    await waitFor(() => {
      expect(screen.getByText(/NGO Profile Completion/i)).toBeInTheDocument();
    });

    // Check embedded wizard Step 3 (authorized-rep) is loaded from draft
    await waitFor(() => {
      expect(screen.getByText(/Authorized Representative/i)).toBeInTheDocument();
    });
  });

  it("renders edit account details action button", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getProfile).mockResolvedValue({
      id: 101,
      email: "contact@smilefoundation.org",
      fullName: "Smile Foundation",
      role: "NGO",
      phone: "+919876543210",
      city: "Mumbai, Maharashtra",
      latitude: null,
      longitude: null,
    });
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);
    vi.mocked(getNgoDraft).mockResolvedValue(null);

    render(<NgoProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Edit account details/i })).toBeInTheDocument();
    });
  });

  it("renders Application Status card instead of wizard when application is submitted", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getProfile).mockResolvedValue({
      id: 101,
      email: "contact@smilefoundation.org",
      fullName: "Smile Foundation",
      role: "NGO",
      phone: "+919876543210",
      city: "Mumbai, Maharashtra",
      latitude: null,
      longitude: null,
    });
    vi.mocked(getMyNgoApplication).mockResolvedValue({
      applicationId: "CK-NGO-2026-TESTAPP",
      organizationName: "Smile Foundation",
      status: "UNDER_REVIEW",
      submittedAt: "2026-09-09T10:00:00",
      verifiedAt: null,
      updatedAt: "2026-09-09T10:00:00",
      rejectionReason: null,
      needsInformationDetails: null,
    });
    vi.mocked(getNgoDraft).mockResolvedValue(null);

    render(<NgoProfilePage />);

    // Application Status card should be rendered
    await waitFor(() => {
      expect(screen.getByText("Application Submitted")).toBeInTheDocument();
      expect(screen.getByText("Under Review")).toBeInTheDocument();
    });

    expect(screen.getByText("CK-NGO-2026-TESTAPP")).toBeInTheDocument();
    expect(screen.getByText(/Verification Process & Next Steps/i)).toBeInTheDocument();

    // Wizard and completion bar must NOT be displayed
    expect(screen.queryByText(/NGO Profile Completion/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Step 1 of 6: Organization Details")).not.toBeInTheDocument();
  });

  it("shows 0% complete on Step 1 when no steps have been completed yet", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "fresh@smilefoundation.org", role: "NGO" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getProfile).mockResolvedValue(null as any);
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);
    vi.mocked(getNgoDraft).mockResolvedValue(null);

    render(<NgoProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("0% Complete")).toBeInTheDocument();
      expect(screen.getByText("0 of 6 registration steps completed")).toBeInTheDocument();
    });
  });
});

