import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import NgoDrivePage, { ROLE_PATTERN, SHOW_HANDOVER_MODE, hoursError, istDatePlus, neededByError, stepFromSlug } from "./page";
import { categoryDetailRows } from "@/features/ngo-drives/driveCategoryDetails";
import { adaptNgoOffer } from "@/features/handover/adapters";

const mockPush = vi.fn();
const mockUseNgoStatus = vi.fn();
let mockSearch = "";
const api = vi.hoisted(() => ({
  getNgoDriveDetail: vi.fn(),
  updateNgoDrive: vi.fn(),
  createNgoDrive: vi.fn(),
  getNgoDriveDraft: vi.fn(),
  saveNgoDriveDraft: vi.fn(),
  deleteNgoDriveDraft: vi.fn(),
  deleteUnusedNgoDrivePhoto: vi.fn(),
  uploadNgoDriveReferencePhoto: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: mockPush }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 7, email: "ngo@example.test", role: "NGO_PARTNER" }, isLoading: false }),
}));
vi.mock("@/components/ngo-landing/useNgoStatus", () => ({ useNgoStatus: () => mockUseNgoStatus() }));
vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    status: number; data?: unknown;
    constructor(status: number, message: string, data?: unknown) { super(message); this.status = status; this.data = data; }
  }
  return { ApiError, getMyNgoApplication: vi.fn().mockResolvedValue(null), ...api };
});
vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const verified = {
  isVerified: true, isPhotosDue: false, lockReason: "", photosDueRequestName: "",
  isLoading: false, error: null, refresh: vi.fn(), canStartDrive: true, driveLockReason: "",
};

function drive(overrides: Record<string, unknown> = {}) {
  return {
    id: 42, status: "CHANGES_REQUESTED", title: "Winter clothes for the shelter", category: "Clothing",
    locationCountry: "IN", locationState: "MH", locationCity: "Mumbai", locationArea: "Andheri", locationPincode: "400053",
    locationLatitude: 19.1, locationLongitude: 72.85, pickupRadiusKm: 20,
    itemName: "Sweaters", quantityNeeded: 40, unit: "PIECES", itemCondition: "NEW_ONLY", details: "Warm sweaters",
    whoFor: "Elders at our shelter", whyNow: "Winter is coming soon", whatChanges: "They stay warm all season",
    urgency: "NORMAL", beneficiaryGroup: "Elderly, Women", beneficiaryGroups: ["Elderly", "Women"], beneficiaryCount: 30,
    beneficiaryDescription: "Residents of the shelter",
    neededBy: istDatePlus(10), availableDays: "MON,TUE", availableFrom: "10:00:00", availableTo: "17:00:00",
    handoverMode: "PICKUP", changemakerName: "Priya Nair", changemakerRole: "Coordinator",
    changemakerPhotoUrl: "https://bucket/ngo-drives/7/photos/p.jpg", changemakerWhy: "x".repeat(40),
    requireClean: true, categoryDetails: { sizes: ["M", "KIDS_3_5"], fits: ["MEN", "WOMEN"] },
    contactName: "Rahul", contactPhone: "+919876543210",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearch = "";
  mockUseNgoStatus.mockReturnValue(verified);
  api.getNgoDriveDraft.mockResolvedValue(null);
  api.saveNgoDriveDraft.mockResolvedValue(undefined);
  api.deleteNgoDriveDraft.mockResolvedValue(undefined);
  api.deleteUnusedNgoDrivePhoto.mockResolvedValue(undefined);
  api.updateNgoDrive.mockResolvedValue({});
  localStorage.clear();
  window.history.replaceState(null, "", "/ngo/drives/new");
});

describe("drive wizard rules", () => {
  it("rejects a needed-by date 2 days out and accepts 3 to 90 days (IST)", () => {
    const now = Date.UTC(2030, 0, 10, 12);
    expect(neededByError(istDatePlus(2, now), now)).toMatch(/3-90 days/);
    expect(neededByError(istDatePlus(3, now), now)).toBe("");
    expect(neededByError(istDatePlus(90, now), now)).toBe("");
    expect(neededByError(istDatePlus(91, now), now)).toMatch(/3-90 days/);
    // 20:00 UTC is already the next day in India.
    expect(istDatePlus(0, Date.UTC(2030, 0, 10, 20))).toBe("2030-01-11");
  });

  it("role must be letters, not numbers", () => {
    expect(ROLE_PATTERN.test("Program Coordinator")).toBe(true);
    expect(ROLE_PATTERN.test("Head, Ops & Relief-Team.")).toBe(true);
    expect(ROLE_PATTERN.test("12345")).toBe(false);
    expect(ROLE_PATTERN.test("A")).toBe(false);
    expect(ROLE_PATTERN.test("A".repeat(61))).toBe(false);
  });

  it("hours: to must be after from", () => {
    expect(hoursError("10:00", "09:00")).toMatch(/after start/);
    expect(hoursError("10:00", "10:00")).toMatch(/after start/);
    expect(hoursError("10:00", "17:00")).toBe("");
  });

  it("maps ?step= slugs", () => {
    expect(stepFromSlug("details")).toBe("drive-details");
    expect(stepFromSlug("bogus")).toBeNull();
  });

  it("formats category details for review, drive page and admin", () => {
    expect(categoryDetailRows("Clothing", { sizes: ["M", "KIDS_0_2"], fits: ["GIRLS", "BOYS"] })).toEqual([
      { label: "Sizes", value: "M, 0–2 yrs" }, { label: "For", value: "Girls, Boys" },
    ]);
    expect(categoryDetailRows("Furniture", { lengthCm: 120, breadthCm: 60, heightCm: 75, needsAssembly: true })[0].value).toMatch(/120 × 60 × 75/);
    expect(categoryDetailRows("Books", { sizes: ["M"] })).toEqual([]);
  });

  it("the handover page's Call button dials the drive's handover contact number", () => {
    const vm = adaptNgoOffer({ id: 1, status: "ACCEPTED", ngoName: "NGO", handoverDetails: { contactName: "Rahul", contactPhone: "+919876543210" }, ngoAllowsDonorCall: true, items: [] }, null, "d@test", "DONOR")!;
    expect(vm.counterpart.phone).toBe("+919876543210");
  });
});

describe("drive wizard", () => {
  it("shows Clothing sizing on edit and saves category fields, washed-and-clean, groups and BOTH", async () => {
    mockSearch = "edit=42&step=review";
    api.getNgoDriveDetail.mockResolvedValue(drive());
    render(<NgoDrivePage />);
    await waitFor(() => expect(screen.getAllByTestId("review-category-detail").length).toBe(2));
    expect(screen.getByText("M, 3–5 yrs")).toBeInTheDocument();
    expect(screen.queryByTestId("review-handover-mode")).not.toBeInTheDocument();
    expect(SHOW_HANDOVER_MODE).toBe(false);

    fireEvent.click(screen.getByText("Tick all declarations"));
    fireEvent.click(screen.getByRole("button", { name: "Submit for verification" }));
    await waitFor(() => expect(api.updateNgoDrive).toHaveBeenCalled());
    const payload = api.updateNgoDrive.mock.calls[0][1];
    expect(payload.requireClean).toBe(true);
    expect(payload.categoryDetails).toEqual({ sizes: ["M", "KIDS_3_5"], fits: ["MEN", "WOMEN"] });
    expect(payload.beneficiaryGroups).toEqual(["Elderly", "Women"]);
    expect(payload.handoverMode).toBe("BOTH");
    expect(payload.contactPhone).toBe("+919876543210");
  });

  it("hides Clothing sizing and Furniture dimensions for other categories", async () => {
    mockSearch = "edit=42&step=details";
    api.getNgoDriveDetail.mockResolvedValue(drive({ category: "Electronics", categoryDetails: null, requireClean: false }));
    render(<NgoDrivePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Winter clothes for the shelter")).toBeInTheDocument());
    expect(screen.queryByTestId("clothing-sizing")).not.toBeInTheDocument();
    expect(screen.queryByTestId("furniture-dimensions")).not.toBeInTheDocument();
    expect(screen.getByText("Items must be in working order")).toBeInTheDocument();
    expect(screen.queryByText("Items must be washed and clean")).not.toBeInTheDocument();
  });

  it("shows Furniture dimensions for Furniture", async () => {
    mockSearch = "edit=42&step=details";
    api.getNgoDriveDetail.mockResolvedValue(drive({ category: "Furniture", categoryDetails: { lengthCm: 120, breadthCm: 60, heightCm: 75 } }));
    render(<NgoDrivePage />);
    await waitFor(() => expect(screen.getByTestId("furniture-dimensions")).toBeInTheDocument());
    expect(screen.getByDisplayValue("120")).toBeInTheDocument();
    expect(screen.queryByTestId("clothing-sizing")).not.toBeInTheDocument();
  });

  it("refresh keeps the step from the URL, and Back goes to the previous step", async () => {
    mockSearch = "edit=42&step=beneficiaries";
    api.getNgoDriveDetail.mockResolvedValue(drive());
    render(<NgoDrivePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Residents of the shelter")).toBeInTheDocument());
    expect(screen.queryByText(/Handover mode\*/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Back to Step 2/ }));
    expect(window.location.search).toContain("step=details");
    await waitFor(() => expect(screen.getByDisplayValue("Winter clothes for the shelter")).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("Back on the first step leaves to the NGO dashboard", async () => {
    render(<NgoDrivePage />);
    expect(screen.getByText("What kind of drive?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/ngo");
  });

  it("flags handover hours instantly and disables Next", async () => {
    mockSearch = "edit=42&step=beneficiaries";
    api.getNgoDriveDetail.mockResolvedValue(drive());
    render(<NgoDrivePage />);
    const to = await screen.findByDisplayValue("17:00");
    fireEvent.change(to, { target: { value: "09:00" } });
    expect(screen.getByText("End time must be after start time")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save & Continue/ })).toBeDisabled();
  });

  it("strips digits from the role as it is typed", async () => {
    mockSearch = "edit=42&step=beneficiaries";
    api.getNgoDriveDetail.mockResolvedValue(drive());
    render(<NgoDrivePage />);
    const role = await screen.findByDisplayValue("Coordinator");
    fireEvent.change(role, { target: { value: "12345" } });
    expect((role as HTMLInputElement).value).toBe("");
  });

  it("restores a server draft (another device)", async () => {
    mockSearch = "type=items&step=details";
    api.getNgoDriveDraft.mockResolvedValue({ payload: { title: "Books for the village library", savedAt: 5, beneficiaryGroups: ["Children"] }, updatedAt: "2030-01-01T00:00:00" });
    render(<NgoDrivePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Books for the village library")).toBeInTheDocument());
  });

  it("Discard draft asks first, then deletes the server draft", async () => {
    mockSearch = "type=items&step=details";
    render(<NgoDrivePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Discard draft" }));
    expect(api.deleteNgoDriveDraft).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Discard" }));
    await waitFor(() => expect(api.deleteNgoDriveDraft).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith("/dashboard/ngo");
  });

  it("removing the cover photo asks the server to delete the unused file", async () => {
    mockSearch = "edit=42&step=details";
    api.getNgoDriveDetail.mockResolvedValue(drive({ coverPhotoUrl: "https://bucket/ngo-drives/7/photos/cover.jpg?X-Amz-Signature=x" }));
    render(<NgoDrivePage />);
    const cover = await screen.findByTestId("drive-cover-field");
    fireEvent.click(within(cover).getByRole("button", { name: "Remove cover photo" }));
    expect(api.deleteUnusedNgoDrivePhoto).toHaveBeenCalledWith("https://bucket/ngo-drives/7/photos/cover.jpg?X-Amz-Signature=x");
  });
});
