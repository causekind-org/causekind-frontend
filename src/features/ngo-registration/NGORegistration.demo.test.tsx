import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NGORegistration } from "./NGORegistration";
import { submitNgoApplication, verifyNgoOtp, resendNgoOtp } from "@/lib/api";

// Force demo mode to true for this test suite
vi.mock("@/features/ngo-registration/ngoRegistrationModel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/ngo-registration/ngoRegistrationModel")>();
  return {
    ...actual,
    IS_NGO_DEMO_MODE: true,
  };
});

vi.mock("@/lib/api", () => ({
  uploadNgoDocument: vi.fn(),
  uploadNgoPhoto: vi.fn(),
  submitNgoApplication: vi.fn(),
  verifyNgoOtp: vi.fn(),
  resendNgoOtp: vi.fn(),
}));

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.scrollTo = vi.fn();
});

describe("NGORegistration Component - Demo Mode ON", () => {
  it("completes full 6-step walkthrough end-to-end with demo mode ON without calling real backend", async () => {
    const user = userEvent.setup();
    render(<NGORegistration />);

    // Step 1: Organization Details
    await user.type(screen.getByLabelText(/Organization Name/i), "Helping Hearts Demo Trust");
    await user.click(screen.getByRole("button", { name: /Trust/i }));
    await user.type(screen.getByLabelText(/Registration Number/i), "MH/TRU/2026/DEMO");
    await user.type(screen.getByLabelText(/Registered Office Address/i), "Demo Street, Mumbai");
    await user.type(screen.getByLabelText(/Year of Establishment/i), "2020");
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 2: Legal Documents - use demo "Mark as uploaded ✓" buttons
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Legal Documents/i })).toBeInTheDocument();
    });
    const markButtonsStep2 = screen.getAllByRole("button", { name: /Mark as uploaded ✓/i });
    for (const btn of markButtonsStep2) {
      await user.click(btn);
    }
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 3: Authorized Representative - use demo "Mark as uploaded ✓" for authorization letter
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Authorized Representative/i })).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Full Name/i), "Demo Representative");
    await user.selectOptions(screen.getByLabelText(/Designation/i), "Managing Trustee");
    await user.type(screen.getByLabelText(/Mobile Number/i), "+91 99999 88888");
    await user.type(screen.getByLabelText(/Official Email Address/i), "demo@helpinghearts.org");
    const markLetterBtn = screen.getByRole("button", { name: /Mark as uploaded ✓/i });
    await user.click(markLetterBtn);
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 4: Organization Photos - use demo buttons
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Organization Photos/i })).toBeInTheDocument();
    });
    const markButtonsStep4 = screen.getAllByRole("button", { name: /Mark demo ✓|Mark as uploaded ✓/i });
    for (const btn of markButtonsStep4) {
      await user.click(btn);
    }
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 5: Review & Submit
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Review & Submit/i })).toBeInTheDocument();
    });
    expect(screen.getByText("Helping Hearts Demo Trust")).toBeInTheDocument();
    expect(screen.getByText("MH/TRU/2026/DEMO")).toBeInTheDocument();
    expect(screen.getByText("demo@helpinghearts.org")).toBeInTheDocument();

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    const submitBtn = screen.getByRole("button", { name: /Submit Application/i });
    await user.click(submitBtn);

    // Step 6: Email Verification (Stubbed)
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Verify Official Email/i })).toBeInTheDocument();
    }, { timeout: 5000 });
    expect(screen.getByText(/Demo Mode Active: Enter any 6 digits/i)).toBeInTheDocument();
    expect(screen.getByText("demo@helpinghearts.org")).toBeInTheDocument();

    // Type 6-digit OTP code
    const otpInput = screen.getByRole("textbox");
    await user.type(otpInput, "123456");

    // Final Success: Application Submitted Screen
    await waitFor(
      () => {
        expect(screen.getByRole("heading", { name: /Application Submitted!/i })).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Assert fake demo application ID is displayed
    expect(screen.getByText(/CK-NGO-DEMO-/i)).toBeInTheDocument();
    expect(screen.getByText(/What Happens Next/i)).toBeInTheDocument();
    expect(screen.getByText(/Under Verification/i)).toBeInTheDocument();

    // Verify that NO real API calls were made to backend
    expect(submitNgoApplication).not.toHaveBeenCalled();
    expect(verifyNgoOtp).not.toHaveBeenCalled();
    expect(resendNgoOtp).not.toHaveBeenCalled();
  }, 25000);
});
