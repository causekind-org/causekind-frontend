import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NgoPanCheckBox } from "./NgoPanCheckBox";
import type { PanCheckResult } from "@/lib/api";

const check = (over: Partial<PanCheckResult>): PanCheckResult => ({
  panNumber: "AAATH1234K", validFormat: true, holderLetter: "T", holderType: "Trust", legalStructure: "trust",
  expectedHolderLetter: "T", structureMatches: true, personalPan: false, nameLetter: "H", nameLetterMatches: true,
  warnings: [], ...over,
});

// PAN card feature: kept but not used yet; will be moved to another place later (component tested directly).
describe("Admin PAN check box", () => {
  it("shows PAN, holder type vs structure, 5th letter and where values came from", () => {
    render(<NgoPanCheckBox panCheck={{ check: check({}), organizationNameSource: "card", dateOfFormationSource: "typed", panNumberSource: "card" }} />);
    const box = screen.getByRole("region", { name: "PAN check" });
    expect(box).toHaveAttribute("data-status", "ok");
    expect(box).toHaveTextContent("AAATH1234K");
    expect(screen.getByTestId("pan-check-holder")).toHaveTextContent("Trust · matches Trust");
    expect(screen.getByTestId("pan-check-name")).toHaveTextContent("Matches (H)");
    expect(screen.getByTestId("pan-check-sources")).toHaveTextContent("Name: Read from the PAN card · Date: Typed by the NGO · PAN: Read from the PAN card");
  });

  it("is red for a personal PAN", () => {
    render(<NgoPanCheckBox panCheck={{ check: check({ panNumber: "ABCPH1234K", holderType: "Individual (personal PAN)", personalPan: true, structureMatches: false }), organizationNameSource: null, dateOfFormationSource: null, panNumberSource: null }} />);
    expect(screen.getByRole("region", { name: "PAN check" })).toHaveAttribute("data-status", "problem");
    expect(screen.getByTestId("pan-check-holder")).toHaveTextContent("personal PAN");
    expect(screen.getByTestId("pan-check-holder").className).toContain("text-red-700");
    expect(screen.getByTestId("pan-check-sources")).toHaveTextContent("Name: Unknown");
  });

  it("is red for a structure or 5th-letter mismatch", () => {
    render(<NgoPanCheckBox panCheck={{ check: check({ panNumber: "AAACX1234K", holderType: "Company", structureMatches: false, nameLetterMatches: false }), organizationNameSource: "typed", dateOfFormationSource: "typed", panNumberSource: "typed" }} />);
    expect(screen.getByRole("region", { name: "PAN check" })).toHaveAttribute("data-status", "problem");
    expect(screen.getByTestId("pan-check-holder")).toHaveTextContent("Company · does not match Trust");
    expect(screen.getByTestId("pan-check-name")).toHaveTextContent("Does not match (PAN X, name H)");
  });

  it("renders nothing without a PAN check", () => {
    const { container } = render(<NgoPanCheckBox panCheck={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
