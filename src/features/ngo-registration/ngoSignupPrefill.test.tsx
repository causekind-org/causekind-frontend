import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup, configure } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NGORegistration } from "./NGORegistration";
import { getNgoDraft, ngoWizardPanCheck, type NgoDraftDto } from "@/lib/api";

/**
 * The wizard opens with what NGO signup collects (the backend writes it into the NGO's
 * draft at signup, normal and Google alike): organization name, official email, phone,
 * and the location as the start of the registered office address. Values survive a
 * reload. The PAN card feature is hidden, so no structure warning is shown.
 */

configure({ asyncUtilTimeout: 8000 });

// One stable object, as the real hook returns: the wizard reloads its draft when the user changes.
const mockAuth = { user: { email: "contact@hope.test", fullName: "Hope Welfare Trust", phone: "+919876543210", role: "NGO_PARTNER" } };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockAuth }));

vi.mock("@/lib/api", () => ({
  uploadNgoDocument: vi.fn(),
  uploadNgoPhoto: vi.fn(),
  submitNgoApplication: vi.fn(),
  verifyNgoOtp: vi.fn(),
  resendNgoOtp: vi.fn(),
  getMyNgoApplication: vi.fn().mockResolvedValue(null),
  getNgoDraft: vi.fn(),
  saveNgoDraft: vi.fn().mockResolvedValue({}),
  ngoWizardPanCheck: vi.fn(),
}));

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = vi.fn();
});

/** What the backend saves at signup (AuthController.startNgoWizardDraft). */
const signupDraft = {
  currentStep: "org-details",
  organizationName: "Hope Welfare Trust",
  registeredOfficeAddress: "Pune, Maharashtra, India",
  organizationPhone: "+919876543210",
  mobileNumber: "+919876543210",
  officialEmail: "contact@hope.test",
} as unknown as NgoDraftDto;

const input = (id: string) => document.getElementById(id) as HTMLInputElement;

beforeEach(() => {
  vi.mocked(getNgoDraft).mockReset().mockResolvedValue(signupDraft);
  vi.mocked(ngoWizardPanCheck).mockReset();
});

describe("NGO wizard prefilled from signup", { timeout: 30000 }, () => {
  it("pre-fills organization name, address and phone, and keeps them after a reload", async () => {
    const { unmount } = render(<NGORegistration />);
    await waitFor(() => expect(input("ngo-org-name").value).toBe("Hope Welfare Trust"));
    expect((document.getElementById("ngo-address") as HTMLTextAreaElement).value).toBe("Pune, Maharashtra, India");
    expect(input("ngo-org-phone").value).toBe("+919876543210");
    expect(input("ngo-year").value).toBe("");
    expect(screen.queryByRole("button", { pressed: true })).toBeNull(); // no structure chosen at signup any more

    unmount();
    cleanup();
    render(<NGORegistration />);
    await waitFor(() => expect(input("ngo-org-name").value).toBe("Hope Welfare Trust"));
    expect((document.getElementById("ngo-address") as HTMLTextAreaElement).value).toBe("Pune, Maharashtra, India");
    expect(input("ngo-org-phone").value).toBe("+919876543210");
  });

  it("pre-fills the official email in Step 3, while representative mobile starts empty", async () => {
    vi.mocked(getNgoDraft).mockResolvedValue({ ...signupDraft, currentStep: "authorized-rep" } as NgoDraftDto);
    render(<NGORegistration />);
    await waitFor(() => expect(input("rep-0-email").value).toBe("contact@hope.test"));
    expect(input("rep-0-mobile").value).toBe("");
  });

  it("never replaces a value the NGO already saved in its draft", async () => {
    vi.mocked(getNgoDraft).mockResolvedValue({ ...signupDraft, organizationName: "Hope Welfare (edited)" } as NgoDraftDto);
    render(<NGORegistration />);
    await waitFor(() => expect(input("ngo-org-name").value).toBe("Hope Welfare (edited)"));
  });

  it("shows no PAN structure warning (PAN card feature hidden)", async () => {
    const user = userEvent.setup();
    render(<NGORegistration />);
    await waitFor(() => expect(input("ngo-org-name").value).toBe("Hope Welfare Trust"));
    await user.click(screen.getByRole("button", { name: /Society/ }));
    await new Promise((r) => setTimeout(r, 600));
    expect(screen.queryByTestId(/pan-warning-/)).toBeNull();
    expect(ngoWizardPanCheck).not.toHaveBeenCalled();
  });
});
