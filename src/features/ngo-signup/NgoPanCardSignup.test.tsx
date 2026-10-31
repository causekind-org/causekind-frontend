import { describe, expect, it, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, renderHook, waitFor } from "@testing-library/react";
import {
  NgoLegalStructureField, NgoPanCardUpload, NgoDateOfFormationField, CardNote, PanWarnings, usePanCheck,
  panCardFileError, dateOfFormationError, isValidPastDate, NGO_SIGNUP_MESSAGES,
} from "./NgoPanCardSignup";
import { ngoPanCheck } from "@/lib/api";

/**
 * PAN card feature: kept but not used yet; will be moved to another place later.
 * Unit tests of the kept components and helpers, rendered directly (no page uses them).
 */

vi.mock("@/lib/api", () => ({ ngoPanCheck: vi.fn(), ngoWizardPanCheck: vi.fn() }));

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:pan-preview");
  URL.revokeObjectURL = vi.fn();
});

describe("PAN card signup components (kept, unused)", () => {
  it("checks the card file type and size", () => {
    expect(panCardFileError(new File(["x"], "pan.png", { type: "image/png" }))).toBeNull();
    expect(panCardFileError(new File(["x"], "pan.pdf", { type: "application/pdf" }))).toBeNull();
    expect(panCardFileError(new File(["x"], "pan.gif", { type: "image/gif" }))).toBe(NGO_SIGNUP_MESSAGES.panCardType);
    const big = new File(["x"], "pan.jpg", { type: "image/jpeg" });
    Object.defineProperty(big, "size", { value: 10 * 1024 * 1024 + 1 });
    expect(panCardFileError(big)).toBe(NGO_SIGNUP_MESSAGES.panCardSize);
  });

  it("accepts only real past dates", () => {
    expect(isValidPastDate("2011-06-15")).toBe(true);
    expect(isValidPastDate("2011-02-30")).toBe(false);
    expect(isValidPastDate("2999-01-01")).toBe(false);
    expect(dateOfFormationError("")).toBe(NGO_SIGNUP_MESSAGES.dateRequired);
  });

  it("renders the structure field with its options, error and structure warning", () => {
    const onChange = vi.fn();
    render(<NgoLegalStructureField value="" onChange={onChange} error="Pick one"
      warnings={[{ code: "STRUCTURE_MISMATCH", severity: "WARNING", field: "legalStructure", message: "Not a Trust PAN" }]} />);
    expect(screen.getByRole("option", { name: "Section 8 Company" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Pick one");
    expect(screen.getByTestId("pan-warning-STRUCTURE_MISMATCH")).toHaveTextContent("Not a Trust PAN");
    fireEvent.change(screen.getByLabelText(/Legal structure/), { target: { value: "trust" } });
    expect(onChange).toHaveBeenCalledWith("trust");
  });

  it("renders the card upload with preview, camera button and spinner", () => {
    const onFile = vi.fn();
    render(<NgoPanCardUpload file={new File(["x"], "pan.png", { type: "image/png" })} onFile={onFile} reading error={null} />);
    expect(screen.getByAltText("PAN card preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Take a photo/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Reading your PAN card");
    const f = new File(["y"], "other.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/Upload your PAN card/), { target: { files: [f] } });
    expect(onFile).toHaveBeenCalledWith(f);
  });

  it("renders the date field, the card notes and red / amber warnings", () => {
    render(<>
      <NgoDateOfFormationField value="2011-06-15" onChange={vi.fn()} error="Bad date" />
      <CardNote id="n1" kind="card" />
      <CardNote id="n2" kind="unreadable" />
      <PanWarnings field="panNumber" warnings={[
        { code: "PERSONAL_PAN", severity: "DANGER", field: "panNumber", message: "This is a personal PAN." },
        { code: "OTHER", severity: "WARNING", field: "legalStructure", message: "elsewhere" },
      ]} />
    </>);
    expect(screen.getByLabelText(/Date of formation/)).toHaveValue("2011-06-15");
    expect(screen.getByTestId("n1")).toHaveTextContent(NGO_SIGNUP_MESSAGES.readFromCard);
    expect(screen.getByTestId("n2")).toHaveTextContent(NGO_SIGNUP_MESSAGES.couldNotRead);
    expect(screen.getByTestId("pan-warning-PERSONAL_PAN")).toHaveAttribute("data-severity", "DANGER");
    expect(screen.queryByText("elsewhere")).toBeNull();
  });

  it("usePanCheck asks the backend helper once the PAN is valid", async () => {
    vi.mocked(ngoPanCheck).mockResolvedValue({ warnings: [] } as never);
    const { rerender } = renderHook(({ pan }) => usePanCheck(true, pan, "trust", "Hope", 0), { initialProps: { pan: "AAATH" } });
    expect(ngoPanCheck).not.toHaveBeenCalled();
    rerender({ pan: "AAATH1234K" });
    await waitFor(() => expect(ngoPanCheck).toHaveBeenCalledWith({ panNumber: "AAATH1234K", legalStructure: "trust", organizationName: "Hope" }));
  });
});
