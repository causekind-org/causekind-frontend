import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("./DriveProofPanel", () => ({ DriveProofPanel: ({ drive }: { drive: { id: number } }) => <input aria-label={`proof-${drive.id}`} /> }));
import { ProofDuePanel } from "./ProofDuePanel";

const drive = (id: number) => ({ id, title: `Drive ${id}`, status: "COLLECTION_COMPLETE", proofDueAt: null, quantityReceived: 2 }) as never;

describe("ProofDuePanel deep link (?drive=)", () => {
  it("scrolls to and focuses the linked drive's proof form", () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const { getByLabelText } = render(<ProofDuePanel drives={[drive(1), drive(2)]} onSubmitted={() => {}} focusDriveId={2} />);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.contexts[0]).toBe(document.getElementById("proof-drive-2"));
    expect(getByLabelText("proof-2")).toHaveFocus();
  });
  it("does nothing without a focused drive", () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(<ProofDuePanel drives={[drive(1)]} onSubmitted={() => {}} />);
    expect(scroll).not.toHaveBeenCalled();
  });
});
