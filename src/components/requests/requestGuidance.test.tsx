import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { RequestGuidance } from "./RequestGuidance";

/**
 * Guidance for someone writing a request.
 *
 * <p>The assertions here are mostly about what the copy must <b>not</b> say. This
 * is shown to people asking for help, and the failure mode is not a bug — it is
 * copy that quietly pressures them, which reads as perfectly reasonable marketing
 * to whoever writes it.
 */
describe("request guidance", () => {
  it("tells a tier 1-2 donee the fast path exists", () => {
    render(<RequestGuidance autoApprovalPossible />);
    expect(screen.getByText(/approved without waiting/i)).toBeInTheDocument();
  });

  it("does not promise a fast path where there is none", () => {
    // Tiers 3 and 4 always reach a human. Implying otherwise sets up a
    // disappointment at the worst possible moment.
    render(<RequestGuidance autoApprovalPossible={false} />);
    expect(screen.queryByText(/approved without waiting/i)).not.toBeInTheDocument();
    expect(screen.getByText(/always reviewed by a person/i)).toBeInTheDocument();
  });

  it("says a failed check is not a rejection", () => {
    // Being told a document "doesn't look valid" is alarming if nobody explains
    // that a person still reviews it either way.
    render(<RequestGuidance autoApprovalPossible />);
    expect(screen.getByText(/not a rejection/i)).toBeInTheDocument();
  });

  it("never suggests uploading more documents improves the outcome", () => {
    // The backend calls this anti-coercion in as many words: optional evidence is
    // a fact and never a penalty. Auto-approval gates on the MANDATORY documents
    // only, so "more documents means faster" is both untrue and pressure applied
    // to people in difficulty. This is the assertion most likely to be deleted
    // later to improve conversion, so it is spelled out.
    const { container } = render(<RequestGuidance autoApprovalPossible />);
    const text = (container.textContent ?? "").toLowerCase();

    expect(text).not.toMatch(/more documents/);
    expect(text).not.toMatch(/strengthen/);
    expect(text).not.toMatch(/improve your chances/);
    expect(text).not.toMatch(/helps.*approve.*faster/);
  });

  it("blames the photo, not the person", () => {
    // Someone whose request stalls should not read it as a judgement on their
    // need. The common cause really is an unreadable scan.
    render(<RequestGuidance autoApprovalPossible />);
    expect(screen.getByText(/not a problem with the request itself/i)).toBeInTheDocument();
  });
});
