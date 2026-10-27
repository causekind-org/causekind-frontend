import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, configure } from "@testing-library/react";
import NgoRequestCreationPage from "./page";

configure({ asyncUtilTimeout: 5000 });
import {
  DRIVE_CONDITIONS,
  WIZARD_DRIVE_CONDITIONS,
  wizardConditionHelper,
  normalizeLegacyCondition,
  driveAcceptedConditions,
  driveConditionRule,
} from "@/features/ngo-drives/driveConditions";

const mockGetNgoDriveDetail = vi.fn();
const mockUpdateNgoDrive = vi.fn().mockResolvedValue({ id: 42 });
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("edit=42"),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 7, email: "ngo@example.test", role: "NGO_PARTNER" }, isLoading: false }) }));
vi.mock("@/components/ngo-landing/useNgoStatus", () => ({
  useNgoStatus: () => ({
    isVerified: true, isPhotosDue: false, lockReason: "", photosDueRequestName: "",
    isLoading: false, error: null, refresh: vi.fn(), canStartDrive: true, driveLockReason: "",
  }),
}));
vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    status: number; data?: unknown;
    constructor(status: number, message: string, data?: unknown) { super(message); this.status = status; this.data = data; }
  }
  return {
    ApiError,
    getMyNgoApplication: vi.fn().mockResolvedValue(null),
    createNgoDrive: vi.fn(),
    updateNgoDrive: (...args: unknown[]) => mockUpdateNgoDrive(...args),
    getNgoDriveDetail: (...args: unknown[]) => mockGetNgoDriveDetail(...args),
    uploadNgoDriveReferencePhoto: vi.fn(),
    getNgoDriveDraft: vi.fn().mockResolvedValue(null),
    saveNgoDriveDraft: vi.fn().mockResolvedValue(undefined),
    deleteNgoDriveDraft: vi.fn().mockResolvedValue(undefined),
    deleteUnusedNgoDrivePhoto: vi.fn().mockResolvedValue(undefined),
  };
});
vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const sentBack = (overrides: Record<string, unknown> = {}) => {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  const validNeededBy = d.toISOString().slice(0, 10);
  return {
    id: 42, status: "CHANGES_REQUESTED", title: "Winter blankets for the shelter", category: "Household",
    itemName: "Blankets", quantityNeeded: 40, unit: "PIECES", itemCondition: "NEW_ONLY",
    details: "Single or double, washed, no tears.",
    photos: [{ url: "https://example.test/blanket.jpg" }],
    whoFor: "Elders in the community center",
    whyNow: "Winter is beginning this month",
    whatChanges: "They stay warm through the night",
    locationArea: "Kandivali East",
    locationCity: "Mumbai", locationCountry: "IN", locationState: "MH", locationPincode: "400101", locationLatitude: 19.2, locationLongitude: 72.87, pickupRadiusKm: 20,
    urgency: "NORMAL", beneficiaryGroup: "Elderly", beneficiaryCount: 30,
    beneficiaryDescription: "Senior citizens living in the shelter",
    handoverMode: "BOTH",
    neededBy: validNeededBy, availableDays: "MON,TUE", availableFrom: "10:00:00", availableTo: "17:00:00",
    changemakerName: "Priya Nair", changemakerRole: "Coordinator",
    changemakerPhotoUrl: "https://example.test/priya.jpg",
    changemakerWhy: "Serving elders has been my mission for over five years.",
    contactName: "Rep", contactPhone: "9999999999", ...overrides,
  };
};

async function openForm(overrides: Record<string, unknown> = {}) {
  mockGetNgoDriveDetail.mockResolvedValue(sentBack(overrides));
  render(<NgoRequestCreationPage />);
  await waitFor(() => expect(screen.getByDisplayValue("Winter blankets for the shelter")).toBeInTheDocument());
}

describe("drive form fields", { timeout: 20000 }, () => {
  beforeEach(() => { mockGetNgoDriveDetail.mockReset(); mockUpdateNgoDrive.mockClear(); localStorage.clear(); });

  it("puts a required Details box above the three story textareas, with helper text", async () => {
    await openForm();
    const details = screen.getByRole("textbox", { name: /^Details/ });
    const whoFor = screen.getByRole("textbox", { name: /^Who is this for\?/ });
    expect(details.compareDocumentPosition(whoFor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(details.closest("div")!.parentElement!.textContent).toMatch(/Details\*/);
    expect(screen.getByText(/^Include sizes, condition, colours, brands or anything else donors should know\./)).toBeInTheDocument();
    expect(details.getAttribute("placeholder")).toBeNull();
    expect(details).toHaveValue("Single or double, washed, no tears.");
    expect(screen.queryByText(/Details \(optional\)/)).not.toBeInTheDocument();

    expect(screen.getByRole("textbox", { name: /^Why now\?/ })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^What will change after donors give\?/ })).toBeInTheDocument();
  });

  it("shows previous description note when editing a legacy drive without the 3 story fields", async () => {
    await openForm({ whoFor: null, whyNow: null, whatChanges: null, description: "Old description before v2" });
    expect(screen.getByText(/Previous description/)).toBeInTheDocument();
    expect(screen.getByText("Old description before v2")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^Who is this for\?/ })).toHaveValue("");
  });

  it("an older drive without details must add them before continuing", async () => {
    await openForm({ details: null });
    fireEvent.click(screen.getByRole("button", { name: /Continue to Step 3/ }));
    expect((await screen.findAllByText("Add the details donors need")).length).toBeGreaterThan(0);
    expect(screen.getByRole("textbox", { name: /^Details/ })).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("spinbutton", { name: /How many people will benefit/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: /^Details/ }), { target: { value: "Warm blankets, any colour." } });
    fireEvent.click(screen.getByRole("button", { name: /Continue to Step 3/ }));
    expect(await screen.findByRole("spinbutton", { name: /How many people will benefit/ })).toBeInTheDocument();
  });

  it("step 2 asks how many people will benefit and about the beneficiaries", async () => {
    await openForm();
    fireEvent.click(screen.getByRole("button", { name: /Continue to Step 3/ }));
    const people = await screen.findByRole("spinbutton", { name: /How many people will benefit\?/ });
    expect(people).toHaveValue(30);
    expect(people.getAttribute("placeholder")).toBeNull();
    expect(screen.getByText("People or families helped, not the number of items.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /About the beneficiaries/ })).toHaveValue("Senior citizens living in the shelter");
  });

  it("normalizes legacy conditions and displays helper text for the selected condition", async () => {
    expect(normalizeLegacyCondition("SEALED_ONLY")).toBe("NEW_ONLY");
    expect(normalizeLegacyCondition("USED_WORKING")).toBe("ANY_USABLE");
    expect(normalizeLegacyCondition("NEW_OR_GENTLY_USED")).toBe("NEW_OR_GENTLY_USED");

    expect(wizardConditionHelper("NEW_ONLY")).toBe("Unused, with tags or in original packaging");
    expect(wizardConditionHelper("NEW_OR_GENTLY_USED")).toBe("Like-new, no visible wear");
    expect(wizardConditionHelper("ANY_USABLE")).toBe("Clean and working, minor wear is fine");

    await openForm({ itemCondition: "SEALED_ONLY" });
    expect(screen.getByText("Unused, with tags or in original packaging")).toBeInTheDocument();
  });

  it("opening /ngo/drives/new?edit=ID loads all photos (cover first, in sort order) and V2 fields, and saving updates correctly", async () => {
    await openForm({
      photos: [
        { url: "https://example.test/photo1.jpg", storageKey: "keys/p1.jpg", sortOrder: 0 },
        { url: "https://example.test/photo2.jpg", storageKey: "keys/p2.jpg", sortOrder: 1 },
        { url: "https://example.test/photo3.jpg", storageKey: "keys/p3.jpg", sortOrder: 2 },
      ],
      tagline: "Helping elders stay warm",
      whoFor: "Elders in Kandivali",
      whyNow: "Sudden cold wave",
      whatChanges: "No illness this winter",
      locationArea: "Kandivali East",
      locationCity: "Mumbai", locationCountry: "IN", locationState: "MH", locationPincode: "400101", locationLatitude: 19.2, locationLongitude: 72.87, pickupRadiusKm: 20,
      handoverMode: "BOTH",
      changemakerName: "Priya Nair",
      changemakerRole: "Coordinator",
      changemakerPhotoUrl: "https://example.test/priya.jpg",
      changemakerWhy: "Serving elders has been my mission for over five years.",
      altContact: "alt@example.test",
      pastWorkUrl: "https://example.test/past-work",
    });

    // 1. Photos loaded into uploader (cover first, in sort order)
    const img1 = screen.getByAltText("Drive photo 1");
    const img2 = screen.getByAltText("Drive photo 2");
    const img3 = screen.getByAltText("Drive photo 3");
    expect(img1).toHaveAttribute("src", "https://example.test/photo1.jpg");
    expect(img2).toHaveAttribute("src", "https://example.test/photo2.jpg");
    expect(img3).toHaveAttribute("src", "https://example.test/photo3.jpg");
    expect(screen.getByText("Cover")).toBeInTheDocument();
    expect(screen.getByText(/3\/5\)/)).toBeInTheDocument();

    // 2. V2 fields loaded in Step 1
    expect(screen.getByDisplayValue("Helping elders stay warm")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Elders in Kandivali")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Sudden cold wave")).toBeInTheDocument();
    expect(screen.getByDisplayValue("No illness this winter")).toBeInTheDocument();
    // The read-only registered office address block was removed from this step.
    expect(screen.queryByText("Registered office address")).not.toBeInTheDocument();

    // Navigate to Step 2
    fireEvent.click(screen.getByRole("button", { name: /Continue to Step 3/ }));
    expect(await screen.findByDisplayValue("Priya Nair")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Coordinator")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Serving elders has been my mission for over five years.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("alt@example.test")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.test/past-work")).toBeInTheDocument();

    // Navigate to Step 3
    fireEvent.click(screen.getByRole("button", { name: /Save & Continue/ }));
    expect(await screen.findByText("Drive summary")).toBeInTheDocument();

    // Tick declarations and submit
    fireEvent.click(screen.getByLabelText(/Tick all declarations/i));
    fireEvent.click(screen.getByRole("button", { name: /Submit for verification/ }));

    await waitFor(() => expect(mockUpdateNgoDrive).toHaveBeenCalledTimes(1));
    expect(mockUpdateNgoDrive).toHaveBeenCalledWith(42, expect.objectContaining({
      photos: [
        { url: "https://example.test/photo1.jpg", storageKey: "keys/p1.jpg", sortOrder: 0 },
        { url: "https://example.test/photo2.jpg", storageKey: "keys/p2.jpg", sortOrder: 1 },
        { url: "https://example.test/photo3.jpg", storageKey: "keys/p3.jpg", sortOrder: 2 },
      ],
      referencePhotoUrl: "https://example.test/photo1.jpg",
      tagline: "Helping elders stay warm",
      whoFor: "Elders in Kandivali",
      whyNow: "Sudden cold wave",
      whatChanges: "No illness this winter",
      locationArea: "Kandivali East",
      locationCity: "Mumbai", locationCountry: "IN", locationState: "MH", locationPincode: "400101", locationLatitude: 19.2, locationLongitude: 72.87, pickupRadiusKm: 20,
      handoverMode: "BOTH",
      changemakerName: "Priya Nair",
      changemakerRole: "Coordinator",
      changemakerPhotoUrl: "https://example.test/priya.jpg",
      changemakerWhy: "Serving elders has been my mission for over five years.",
      altContact: "alt@example.test",
      pastWorkUrl: "https://example.test/past-work",
    }));
  });

  it("legacy drive without photos rows loads reference_photo_url as photo 1, and resubmitting saves correctly", async () => {
    await openForm({
      photos: [],
      referencePhotoUrl: "https://example.test/legacy-photo.jpg",
      referencePhotoKey: "keys/legacy.jpg",
    });

    // Loaded as photo 1 with Cover badge
    const img1 = screen.getByAltText("Drive photo 1");
    expect(img1).toHaveAttribute("src", "https://example.test/legacy-photo.jpg");
    expect(screen.getByText("Cover")).toBeInTheDocument();
    expect(screen.getByText(/1\/5\)/)).toBeInTheDocument();

    // Navigate to Step 2 and Step 3
    fireEvent.click(screen.getByRole("button", { name: /Continue to Step 3/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Save & Continue/ }));
    expect(await screen.findByText("Drive summary")).toBeInTheDocument();

    // Tick declarations and submit
    fireEvent.click(screen.getByLabelText(/Tick all declarations/i));
    fireEvent.click(screen.getByRole("button", { name: /Submit for verification/ }));

    await waitFor(() => expect(mockUpdateNgoDrive).toHaveBeenCalledTimes(1));
    expect(mockUpdateNgoDrive).toHaveBeenCalledWith(42, expect.objectContaining({
      photos: [
        { url: "https://example.test/legacy-photo.jpg", storageKey: "keys/legacy.jpg", sortOrder: 0 },
      ],
      referencePhotoUrl: "https://example.test/legacy-photo.jpg",
    }));
  });
});

describe("drive condition rules", () => {
  it("lists the five options, keeping the two existing ones", () => {
    expect(DRIVE_CONDITIONS.map(c => c.value)).toEqual(["NEW_ONLY", "NEW_OR_GENTLY_USED", "SEALED_ONLY", "USED_WORKING", "ANY_USABLE"]);
    expect(driveAcceptedConditions("NEW_ONLY")).toEqual(["Unused", "Like New"]);
    expect(driveAcceptedConditions("NEW_OR_GENTLY_USED")).toEqual(["Unused", "Like New", "Good"]);
    expect(driveAcceptedConditions("SEALED_ONLY")).toEqual(["Unused"]);
    expect(driveAcceptedConditions("USED_WORKING")).toEqual(["Unused", "Like New", "Good", "Fair"]);
    expect(driveAcceptedConditions("ANY_USABLE")).toEqual(["Unused", "Like New", "Good", "Fair", "Needs Minor Repair"]);
    for (const c of DRIVE_CONDITIONS) expect(c.accepts).not.toContain("Not Working");
    expect(driveAcceptedConditions("SOMETHING_ELSE")).toBeNull();
  });

  it("wizard dropdown options has exactly 3 options", () => {
    expect(WIZARD_DRIVE_CONDITIONS.map(c => c.value)).toEqual(["NEW_ONLY", "NEW_OR_GENTLY_USED", "ANY_USABLE"]);
  });
});
