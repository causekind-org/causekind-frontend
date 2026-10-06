import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NgoRequestCreationPage from "./page";
import { DRIVE_CONDITIONS, driveAcceptedConditions, driveConditionRule } from "@/features/ngo-drives/driveConditions";

const mockGetNgoDriveDetail = vi.fn();
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
    createNgoDrive: vi.fn(), updateNgoDrive: vi.fn(),
    getNgoDriveDetail: (...args: unknown[]) => mockGetNgoDriveDetail(...args),
    uploadNgoDriveReferencePhoto: vi.fn(),
  };
});
vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const sentBack = (overrides: Record<string, unknown> = {}) => ({
  id: 42, status: "CHANGES_REQUESTED", title: "Winter blankets for the shelter", category: "Household",
  itemName: "Blankets", quantityNeeded: 40, unit: "PIECES", itemCondition: "NEW_ONLY",
  details: "Single or double, washed, no tears.",
  description: "x".repeat(40), urgency: "NORMAL", beneficiaryGroup: "Elderly", beneficiaryCount: 30,
  neededBy: "2030-01-01", availableDays: "MON,TUE", availableFrom: "10:00:00", availableTo: "17:00:00",
  contactName: "Rep", contactPhone: "9999999999", ...overrides,
});

async function openForm(overrides: Record<string, unknown> = {}) {
  mockGetNgoDriveDetail.mockResolvedValue(sentBack(overrides));
  render(<NgoRequestCreationPage />);
  await waitFor(() => expect(screen.getByDisplayValue("Winter blankets for the shelter")).toBeInTheDocument());
}

describe("drive form fields", () => {
  beforeEach(() => { mockGetNgoDriveDetail.mockReset(); localStorage.clear(); });

  it("puts a required Details box above 'Why it's needed', with helper text and no example placeholder", async () => {
    await openForm();
    const details = screen.getByRole("textbox", { name: /^Details/ });
    const why = screen.getByRole("textbox", { name: /Why it's needed/ });
    expect(details.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(details.closest("div")!.parentElement!.textContent).toMatch(/Details\*/);
    expect(screen.getByText(/^Include sizes, condition, colours, brands or anything else donors should know\./)).toBeInTheDocument();
    expect(details.getAttribute("placeholder")).toBeNull();
    expect(details).toHaveValue("Single or double, washed, no tears.");
    expect(screen.queryByText(/Details \(optional\)/)).not.toBeInTheDocument();
  });

  it("an older drive without details must add them before continuing", async () => {
    await openForm({ details: null });
    fireEvent.click(screen.getByRole("button", { name: /Continue to Step 2/ }));
    expect((await screen.findAllByText("Add the details donors need")).length).toBeGreaterThan(0);
    expect(screen.getByRole("textbox", { name: /^Details/ })).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("spinbutton", { name: /How many people will benefit/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: /^Details/ }), { target: { value: "Warm blankets, any colour." } });
    fireEvent.click(screen.getByRole("button", { name: /Continue to Step 2/ }));
    expect(await screen.findByRole("spinbutton", { name: /How many people will benefit/ })).toBeInTheDocument();
  });

  it("step 2 asks how many people will benefit, not an 'approximate number'", async () => {
    await openForm();
    fireEvent.click(screen.getByRole("button", { name: /Continue to Step 2/ }));
    const people = await screen.findByRole("spinbutton", { name: /How many people will benefit\?/ });
    expect(people).toHaveValue(30);
    expect(people.getAttribute("placeholder")).toBeNull();
    expect(screen.getByText("People or families helped, not the number of items.")).toBeInTheDocument();
    expect(screen.queryByText(/Approximate number/)).not.toBeInTheDocument();
  });

  it.each(DRIVE_CONDITIONS.map(c => [c.value, c.label] as const))("shows condition %s with its label and plain rule", async (value, label) => {
    await openForm({ itemCondition: value });
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(screen.getByText(driveConditionRule(value)!)).toBeInTheDocument();
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
});
