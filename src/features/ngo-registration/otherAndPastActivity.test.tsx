import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import {
  DESIGNATIONS, INITIAL_NGO_FORM, getNgoStillNeededItems, isOtherChoice, otherTextError,
} from "./ngoRegistrationModel";
import { OtherSpecifyField } from "./components/OtherSpecifyField";

const api = vi.hoisted(() => ({
  getMyNgoActivities: vi.fn(),
  createNgoActivity: vi.fn(),
  uploadNgoActivityPhoto: vi.fn(),
  deleteNgoActivity: vi.fn(),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));

import { PastActivitySection } from "@/features/ngo-profile/PastActivity";

beforeEach(() => vi.clearAllMocks());

describe('"Other" + Please specify', () => {
  it("rule: 2–60 letters (spaces . , - &), never just Other or numbers", () => {
    expect(otherTextError("")).toBe("Please specify");
    expect(otherTextError("Other")).toBe("Please specify");
    expect(otherTextError("12345")).toMatch(/2–60 letters/);
    expect(otherTextError("A")).toMatch(/2–60 letters/);
    expect(otherTextError("Field Coordinator")).toBe("");
    expect(otherTextError("Head, Ops & Relief-Team.")).toBe("");
  });

  it("a stored value outside the list is the NGO's own text (shown as Other + its text)", () => {
    expect(isOtherChoice("CEO", DESIGNATIONS)).toBe(false);
    expect(isOtherChoice("Other", DESIGNATIONS)).toBe(true);
    expect(isOtherChoice("Field Coordinator", DESIGNATIONS)).toBe(true);
    expect(isOtherChoice("", DESIGNATIONS)).toBe(false);
  });

  it("the field strips digits as typed and shows the rule's message", () => {
    function Host() {
      const [v, setV] = useState("Other");
      return <><OtherSpecifyField id="x" value={v} onChange={(t) => setV(t || "Other")} /><output data-testid="saved">{v}</output></>;
    }
    render(<Host />);
    const input = screen.getByLabelText(/Please specify/);
    expect(input).toHaveValue("");
    fireEvent.change(input, { target: { value: "A1" } });
    expect(screen.getByTestId("saved")).toHaveTextContent("A");
    expect(screen.getByRole("alert")).toHaveTextContent(/2–60 letters/);
    fireEvent.change(input, { target: { value: "Field Coordinator" } });
    expect(screen.getByTestId("saved")).toHaveTextContent("Field Coordinator");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("the wizard won't pass the representative step until an Other role is typed", () => {
    const rep = { ...INITIAL_NGO_FORM.representatives[0], fullName: "Asha", mobileNumber: "+919876543210", email: "a@x.test", emailVerified: true, panNumber: "ABCPS1234K", idProof: { name: "id.pdf", documentId: 1 } };
    const withRole = (designation: string) => getNgoStillNeededItems("authorized-rep", {
      ...INITIAL_NGO_FORM, legalStructure: "trust", authorizationLetter: { name: "l.pdf", documentId: 2 }, representatives: [{ ...rep, designation }],
    } as never);
    expect(withRole("Other").join(" ")).toMatch(/please specify/);
    expect(withRole("Field Coordinator").join(" ")).not.toMatch(/designation/);
  });
});

describe("Past activity in the wizard", () => {
  it("step 4 is incomplete without a past activity with a photo (once loaded)", () => {
    const base = { ...INITIAL_NGO_FORM, logo: { name: "l.png", photoId: 1 }, officePhoto: { name: "o.png", photoId: 2 } };
    expect(getNgoStillNeededItems("org-photos", { ...base, pastActivitiesWithPhoto: 0 } as never)).toContain("At least one past activity with a photo");
    expect(getNgoStillNeededItems("org-photos", { ...base, pastActivitiesWithPhoto: 1 } as never)).not.toContain("At least one past activity with a photo");
  });

  it("the section lists saved activities read-only (no edit pen, no Live chip), reports the count, and Add opens the form", async () => {
    api.getMyNgoActivities.mockResolvedValue([
      { id: 1, title: "Meal drive", activityDate: "2026-08-27", description: "300 meals", status: "APPROVED", sortOrder: 0,
        media: [{ id: 3, mediaType: "IMAGE", url: "https://s/1.webp", status: "APPROVED" }] },
    ]);
    const onCount = vi.fn();
    render(<PastActivitySection required onCountChange={onCount} />);
    expect(await screen.findByText("Meal drive")).toBeInTheDocument();
    await waitFor(() => expect(onCount).toHaveBeenCalledWith(1));
    expect(screen.getByText("Activity date: 27 Aug 2026")).toBeInTheDocument();
    expect(screen.queryByText("Live")).toBeNull();
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
    expect(screen.queryByText(/summary/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add activity" }));
    expect(screen.getByTestId("past-activity-form")).toBeInTheDocument();
    // A saved activity's photo opens the shared preview.
    fireEvent.click(screen.getByRole("button", { name: /Open photo 1/ }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
