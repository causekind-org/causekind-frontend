import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NGORegistration } from "./NGORegistration";
import { submitNgoApplication, uploadNgoDocument, verifyNgoOtp, getNgoDraft, getMyNgoApplication, resendNgoOtp } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: null,
  }),
}));

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
  getMyNgoApplication: vi.fn().mockResolvedValue(null),
  getNgoDraft: vi.fn().mockResolvedValue(null),
  saveNgoDraft: vi.fn().mockResolvedValue({ status: "SAVED" }),
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

  it("disables the Continue button and shows missing fields on Step 1", async () => {
    render(<NGORegistration />);
    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    
    expect(continueBtn).toBeDisabled();
    const stillNeeded = screen.getByText(/Still needed:/i);
    expect(stillNeeded).toBeInTheDocument();
    expect(stillNeeded).toHaveTextContent(/Organization name/i);
    expect(stillNeeded).toHaveTextContent(/Legal structure/i);
    expect(stillNeeded).toHaveTextContent(/Registration number/i);
    expect(stillNeeded).toHaveTextContent(/Registered office address/i);
    expect(stillNeeded).toHaveTextContent(/year of establishment/i);
  });

  it("advances to Step 2 when Step 1 is valid", async () => {
    const user = userEvent.setup();
    render(<NGORegistration />);

    await user.type(screen.getByLabelText(/Organization Name/i), "Helping Hearts Foundation");
    await user.click(screen.getByRole("button", { name: /Trust/i }));
    await user.type(screen.getByLabelText(/Registration Number/i), "TRU/2020/001");
    await user.type(screen.getByLabelText(/Registered Office Address/i), "123 Charity Lane, Mumbai");
    await user.type(screen.getByLabelText(/Year of Establishment/i), "2018");

    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    expect(continueBtn).not.toBeDisabled();
    await user.click(continueBtn);

    // Should now be on Step 2: Legal Documents
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Legal Documents/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Showing documents for:/i)).toBeInTheDocument();
    expect(screen.getByText(/Trust Registration Certificate/i)).toBeInTheDocument();
  }, 20000);

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
    await user.upload(docInputs[2], dummyPdf); // Trust PAN Card
    await user.upload(docInputs[3], dummyPdf); // Trustee Info
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
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, dummyPdf);
    await waitFor(() => expect(screen.queryByText(/Uploading.../i)).not.toBeInTheDocument());
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
    // Every file in the payload is a reference to a backend upload record.
    const payload = vi.mocked(submitNgoApplication).mock.calls[0][0];
    expect(payload.authorizationLetter?.documentId).toBe(101);
    expect(payload.documents["trust-reg-cert"]?.documentId).toBe(101);
    expect(payload.logo?.photoId).toBe(201);
    expect(verifyNgoOtp).toHaveBeenCalledWith("CK-NGO-2026-ABCD1234", "123456");
  }, 60000);

  it("pre-fills fields from signup data if no draft exists, but keeps draft data if present", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, email: "signup@ngo.org", fullName: "Signup Foundation", phone: "9876543210", role: "NGO" },
      isLoading: false,
      isRestoring: false,
      logout: vi.fn(),
      setUser: vi.fn(),
      setAuth: vi.fn(),
    });

    // Test 1: No draft - should use signup data
    vi.mocked(getNgoDraft).mockResolvedValueOnce(null);
    const { unmount } = render(<NGORegistration />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Organization Name/i)).toHaveValue("Signup Foundation");
    });
    
    // Test 2: Has draft - should keep draft data
    unmount();
    vi.mocked(getNgoDraft).mockResolvedValueOnce({
      organizationName: "Saved Draft Foundation",
      mobileNumber: "1112223333",
      officialEmail: "draft@ngo.org",
    } as any);
    
    render(<NGORegistration />);
    await waitFor(() => {
      expect(screen.getByLabelText(/Organization Name/i)).toHaveValue("Saved Draft Foundation");
    });
  });

  // Finding #9: a reload between submit and OTP must not strand the applicant. The
  // backend refuses a resubmit while PENDING_VERIFICATION, so the OTP step is restored.
  it("restores the OTP step after a reload with a PENDING_VERIFICATION application, and Resend works there", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 7, email: "rep@helpinghearts.org", role: "NGO_PARTNER" } } as never);
    vi.mocked(getMyNgoApplication).mockResolvedValueOnce({
      applicationId: "CK-NGO-2026-PEND0001",
      organizationName: "Helping Hearts Trust",
      status: "PENDING_VERIFICATION",
    } as never);

    render(<NGORegistration />);

    const resend = await screen.findByRole("button", { name: "Resend code" });
    // Already submitted: no way back to Review & Submit, and no cooldown on Resend.
    expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument();
    expect(resend).not.toBeDisabled();
    expect(getNgoDraft).not.toHaveBeenCalled();

    fireEvent.click(resend);
    await waitFor(() => expect(resendNgoOtp).toHaveBeenCalledWith("CK-NGO-2026-PEND0001"));
    expect(await screen.findByRole("button", { name: /Resend code in \d+s/ })).toBeDisabled();
    expect(submitNgoApplication).not.toHaveBeenCalled();
  });
});
