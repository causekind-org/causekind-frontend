import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import NgoProfilePage from "./page";
import { NgoProfileView } from "@/app/profile/ngo-view";
import { useAuth } from "@/hooks/useAuth";
import { getProfile, updateProfile, updateLocation, getMyNgoApplication, getNgoDraft, saveNgoDraft } from "@/lib/api";
import { redirect } from "next/navigation";

const mockReplace = vi.fn();
const mockPush = vi.fn();
const mockRedirect = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("@/lib/api", () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  updateLocation: vi.fn(),
  getMyNgoApplication: vi.fn(),
  getNgoDraft: vi.fn(),
  submitNgoApplication: vi.fn(),
  saveNgoDraft: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useLocations", () => ({
  useLocations: () => ({
    countries: [
      { value: "IN", label: "India" },
      { value: "US", label: "United States" },
    ],
    states: [
      { value: "MH", label: "Maharashtra" },
      { value: "DL", label: "Delhi" },
    ],
    cities: [
      { value: "Mumbai", label: "Mumbai" },
      { value: "Pune", label: "Pune" },
    ],
    dialCodes: [
      { value: "IN", label: "India (+91)", phonecode: "91" },
      { value: "US", label: "United States (+1)", phonecode: "1" },
    ],
  }),
}));

vi.mock("@/app/actions/locations", () => ({
  resolveLocationFromGPS: vi.fn().mockResolvedValue({ stateIso: "MH", cityValue: "Mumbai" }),
  getDialCodes: vi.fn().mockResolvedValue([{ value: "IN", label: "India (+91)", phonecode: "91" }]),
}));

describe("NgoProfilePage (URL Redirect)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects /dashboard/ngo/profile to /profile", () => {
    NgoProfilePage();
    expect(mockRedirect).toHaveBeenCalledWith("/profile");
  });
});

describe("NgoProfileView (Consolidated at /profile)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.reject(new Error("fetch mock")),
        })
      )
    );
  });

  it("renders NGO profile card with organization name, role 'NGO', and 'CAUSEKIND NGO PARTNER' label", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO_PARTNER" },
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
      organizationName: "Smile Foundation",
      role: "NGO_PARTNER",
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

    render(<NgoProfileView />);

    await waitFor(
      () => {
        expect(screen.getByText("CAUSEKIND NGO PARTNER")).toBeInTheDocument();
      },
      { timeout: 8000 }
    );

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
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO_PARTNER" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getProfile).mockRejectedValue(new Error("Not found"));
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);
    vi.mocked(getNgoDraft).mockResolvedValue(null);

    render(<NgoProfileView />);

    await waitFor(
      () => {
        expect(screen.getByText(/items requested/i)).toBeInTheDocument();
        expect(screen.getByText(/active campaigns/i)).toBeInTheDocument();
        expect(screen.getByText(/donations matched/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("renders NgoReadinessRail in hero band with progress, next step, and link to /profile/ngo-details", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO_PARTNER" },
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

    render(<NgoProfileView />);

    await waitFor(
      () => {
        expect(screen.getByTestId("ngo-readiness-rail")).toBeInTheDocument();
      },
      { timeout: 8000 }
    );

    expect(screen.getByText("Complete your profile")).toBeInTheDocument();
    const finishSetupLink = screen.getByRole("link", { name: /Finish setup/i });
    expect(finishSetupLink).toHaveAttribute("href", "/profile/ngo-details");
  });

  it("renders 2-column layout with 'Your Journey' empty state and 'Milestones' sidebar when not submitted", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "fresh@smilefoundation.org", role: "NGO_PARTNER" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getProfile).mockResolvedValue(null as any);
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);
    vi.mocked(getNgoDraft).mockResolvedValue(null);

    render(<NgoProfileView />);

    await waitFor(
      () => {
        expect(screen.getByText("Your Journey")).toBeInTheDocument();
        expect(screen.getByText("Your story starts here")).toBeInTheDocument();
      },
      { timeout: 8000 }
    );

    // Complete Profile CTA button inside Your Journey
    const completeProfileBtn = screen.getByRole("button", { name: /Complete Profile/i });
    expect(completeProfileBtn).toBeInTheDocument();

    // Milestones sidebar
    expect(screen.getByText("Milestones")).toBeInTheDocument();
    expect(screen.getByText("Profile Submitted")).toBeInTheDocument();
    expect(screen.getByText("Verified Partner")).toBeInTheDocument();
    expect(screen.getByText("First Campaign")).toBeInTheDocument();
  });

  it("renders Application Status card and earned milestones when application is submitted", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO_PARTNER" },
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
      organizationName: "Smile Foundation",
      role: "NGO_PARTNER",
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

    render(<NgoProfileView />);

    await waitFor(
      () => {
        expect(screen.getAllByText("Application Submitted").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Under Review")).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    expect(screen.getByText("CK-NGO-2026-TESTAPP")).toBeInTheDocument();
    expect(screen.getByText(/Verification Process & Next Steps/i)).toBeInTheDocument();

    // NgoReadinessRail shows submitted status
    expect(screen.getByTestId("ngo-readiness-rail")).toBeInTheDocument();
    expect(screen.getByText(/Application submitted · Verification in progress/i)).toBeInTheDocument();

    // Milestones show "Profile Submitted"
    expect(screen.getByText("Profile Submitted")).toBeInTheDocument();
  }, 15000);

  describe("Expanded 'Edit Account Details' Modal & Field Mapping", () => {
    it("opens modal with Donee-matching field set and maps Organization Name to organizationName on save", async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 101, email: "contact@smilefoundation.org", role: "NGO_PARTNER" },
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
        organizationName: "Smile Foundation",
        role: "NGO_PARTNER",
        phone: "+919876543210",
        city: "Mumbai, Maharashtra",
        latitude: 19.076,
        longitude: 72.8777,
      });
      vi.mocked(getMyNgoApplication).mockResolvedValue(null);
      vi.mocked(getNgoDraft).mockResolvedValue(null);
      vi.mocked(saveNgoDraft).mockResolvedValue({} as any);
      vi.mocked(updateProfile).mockResolvedValue({
        id: 101,
        email: "contact@smilefoundation.org",
        fullName: "Smile Foundation Global",
        organizationName: "Smile Foundation Global",
        role: "NGO_PARTNER",
        phone: "+919876543210",
        city: "Mumbai, Maharashtra",
        latitude: 19.076,
        longitude: 72.8777,
      });

      render(<NgoProfileView />);

      await waitFor(
        () => {
          expect(screen.getByRole("button", { name: /Edit account details/i })).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      // Click Edit account details button to open modal
      fireEvent.click(screen.getByRole("button", { name: /Edit account details/i }));

      // 1. Verify modal opens with full Donee-matching field layout
      await waitFor(
        () => {
          expect(screen.getByText(/Account settings/i)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      // Organization Name input in modal
      const orgNameInput = screen.getByPlaceholderText("e.g. Hope Welfare Foundation");
      expect(orgNameInput).toBeInTheDocument();
      expect(orgNameInput).toHaveValue("Smile Foundation");

      // Email Address (read-only/disabled)
      const emailInput = screen.getByLabelText(/Email Address/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toBeDisabled();

      // Phone Number input & label
      expect(screen.getAllByText(/Official Phone Number/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByPlaceholderText(/Phone number/i)).toBeInTheDocument();

      // Country, State/Province, City
      expect(screen.getAllByText(/Country/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/State \/ Province/i)).toBeInTheDocument();
      expect(screen.getAllByText(/City/i).length).toBeGreaterThanOrEqual(1);

      // GPS Coordinates section
      expect(screen.getByText(/GPS Location/i)).toBeInTheDocument();
      expect(screen.getByText(/Location saved/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Use GPS/i })).toBeInTheDocument();

      // 2. CRITICAL FIELD-MAPPING CHECK:
      // Edit the Organization Name input in modal
      fireEvent.change(orgNameInput, { target: { value: "Smile Foundation Global" } });

      // Save changes
      const saveBtn = screen.getByRole("button", { name: /Save Profile Changes/i });
      fireEvent.click(saveBtn);

      // Verify updateProfile is called with organizationName explicitly mapped
      await waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationName: "Smile Foundation Global",
            phone: "+919876543210",
          })
        );
      });

      // Also verify saveNgoDraft syncs organizationName
      expect(saveNgoDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationName: "Smile Foundation Global",
        })
      );
    });
  });
});
