import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChangesRequestedCard } from "./ChangesRequestedCard";

describe("ChangesRequestedCard (/profile)", () => {
  it("shows the note and flagged items, and links to the first step with a flagged field", () => {
    render(<ChangesRequestedCard application={{
      status: "NEEDS_INFORMATION", overallNote: "Please fix these", needsInformationDetails: null,
      correctionItems: [{ field: "officePhoto", note: "Show the nameboard" }, { field: "documents.trust-deed", note: "Cut off" }],
    }} />);
    expect(screen.getByText("Please fix these")).toBeInTheDocument();
    expect(screen.getByText(/Show the nameboard/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Fix and resubmit/i })).toHaveAttribute("href", "/profile/ngo-details?step=legal-documents");
  });

  it("renders nothing for other statuses", () => {
    const { container } = render(<ChangesRequestedCard application={{ status: "UNDER_REVIEW", needsInformationDetails: null }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
