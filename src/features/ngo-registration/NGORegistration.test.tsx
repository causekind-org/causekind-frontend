import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NGORegistration } from "./NGORegistration";
import { submitNgoApplication, verifyNgoOtp } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  uploadNgoDocument: vi.fn().mockImplementation(async (file, category) => ({
    documentId: 101,
    category,
    fileName: file.name,
    s3Url: `https://causekind.s3.amazonaws.com/ngo-documents/${file.name}`,
    s3Key: `ngo-documents/${file.name}`,
    fileSize: file.size,
    mimeType: file.type || "application/pdf",
  })),
  uploadNgoPhoto: vi.fn().mockImplementation(async (file, photoType) => ({
    photoId: 201,
    photoType,
    s3Url: `https://causekind.s3.amazonaws.com/ngo-photos/${file.name}`,
    s3Key: `ngo-photos/${file.name}`,
    fileSize: file.size,
    mimeType: file.type || "image/png",
  })),
  submitNgoApplication: vi.fn().mockResolvedValue({
    applicationId: "CK-NGO-2026-ABCD1234",
    organizationName: "Helping Hearts Trust",
    status: "PENDING_VERIFICATION",
    createdAt: new Date().toISOString(),
  }),
  verifyNgoOtp: vi.fn().mockResolvedValue({
    applicationId: "CK-NGO-2026-ABCD1234",
    organizationName: "Helping Hearts Trust",
    status: "UNDER_REVIEW",
  }),
  resendNgoOtp: vi.fn().mockResolvedValue({
    applicationId: "CK-NGO-2026-ABCD1234",
    message: "OTP resent successfully",
  }),
}));

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.scrollTo = vi.fn();
});

describe("NGORegistration Component", () => {
  it("renders Step 1 (Organization Details) initially", () => {
    render(<NGORegistration />);
    expect(screen.getByRole("heading", { name: /Organization Details/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization Name/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Step 1 of 6/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows validation errors when continuing with empty fields on Step 1", async () => {
    render(<NGORegistration />);
    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueBtn);

    expect(screen.getByText(/Organization name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Please select a legal structure/i)).toBeInTheDocument();
    expect(screen.getByText(/Registration number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Registered office address is required/i)).toBeInTheDocument();
  });

  it("advances to Step 2 when Step 1 is valid", async () => {
    const user = userEvent.setup();
    render(<NGORegistration />);

    await user.type(screen.getByLabelText(/Organization Name/i), "Helping Hearts Foundation");
    await user.click(screen.getByRole("button", { name: /Trust/i }));
    await user.type(screen.getByLabelText(/Registration Number/i), "TRU/2020/001");
    await user.type(screen.getByLabelText(/Registered Office Address/i), "123 Charity Lane, Mumbai");

    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    await user.click(continueBtn);

    // Should now be on Step 2: Legal Documents
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Legal Documents/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Showing documents for:/i)).toBeInTheDocument();
    expect(screen.getByText(/Trust Registration Certificate/i)).toBeInTheDocument();
  });

  it("completes full end-to-end flow from Step 1 to Application Submitted with state preserved", async () => {
    const user = userEvent.setup();
    render(<NGORegistration />);

    // Step 1: Organization Details
    await user.type(screen.getByLabelText(/Organization Name/i), "Helping Hearts Trust");
    await user.click(screen.getByRole("button", { name: /Trust/i }));
    await user.type(screen.getByLabelText(/Registration Number/i), "MH/TRU/2026/9876");
    await user.type(screen.getByLabelText(/Registered Office Address/i), "Bandra West, Mumbai 400050");
    await user.type(screen.getByLabelText(/Year of Establishment/i), "2018");
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 2: Legal Documents
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Legal Documents/i })).toBeInTheDocument();
    });
    const docInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
    const dummyPdf = new File(["%PDF-1.4 dummy"], "cert.pdf", { type: "application/pdf" });
    await user.upload(docInputs[0], dummyPdf); // Trust Registration Certificate
    await user.upload(docInputs[1], dummyPdf); // Registered Trust Deed
    await waitFor(() => {
      expect(screen.queryByText(/Uploading.../i)).not.toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 3: Authorized Representative
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Authorized Representative/i })).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Full Name/i), "Priya Sharma");
    await user.selectOptions(screen.getByLabelText(/Designation/i), "Managing Trustee");
    await user.type(screen.getByLabelText(/Mobile Number/i), "+91 98765 43210");
    await user.type(screen.getByLabelText(/Official Email Address/i), "priya@helpinghearts.org");
    const markLetterBtn = screen.getByRole("button", { name: /Mark as uploaded ✓/i });
    await user.click(markLetterBtn);
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 4: Organization Photos
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Organization Photos/i })).toBeInTheDocument();
    });
    const logoInput = document.getElementById("ngo-logo-upload") as HTMLInputElement;
    const officeInput = document.getElementById("ngo-office-upload") as HTMLInputElement;
    const dummyImg = new File(["fake-image-bytes"], "photo.png", { type: "image/png" });
    await user.upload(logoInput, dummyImg);
    await user.upload(officeInput, dummyImg);
    await waitFor(() => {
      expect(screen.queryByText(/Uploading.../i)).not.toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 5: Review & Submit
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Review & Submit/i })).toBeInTheDocument();
    });
    // Check summarized information
    expect(screen.getByText("Helping Hearts Trust")).toBeInTheDocument();
    expect(screen.getByText("MH/TRU/2026/9876")).toBeInTheDocument();
    expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("priya@helpinghearts.org")).toBeInTheDocument();

    // Checkbox declaration
    const submitBtn = screen.getByRole("button", { name: /Submit Application/i });
    expect(submitBtn).toBeDisabled();

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    expect(submitBtn).not.toBeDisabled();
    await user.click(submitBtn);

    // Step 6: Email Verification
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Verify Official Email/i })).toBeInTheDocument();
    });
    expect(screen.getByText("priya@helpinghearts.org")).toBeInTheDocument();

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
    expect(screen.getByText("CK-NGO-2026-ABCD1234")).toBeInTheDocument();
    expect(screen.getByText(/What Happens Next/i)).toBeInTheDocument();
    expect(screen.getByText(/Under Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/Download Application Summary \(PDF\)/i)).toBeInTheDocument();

    // Confirm that with demo mode OFF, real API calls are invoked normally
    expect(submitNgoApplication).toHaveBeenCalledTimes(1);
    expect(verifyNgoOtp).toHaveBeenCalledWith("CK-NGO-2026-ABCD1234", "123456");
  }, 25000);
});
