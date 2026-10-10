import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HandoverChatPanel } from "./HandoverChatPanel";
import type { HandoverViewModel } from "./model";

// The real windows fetch their thread; here they only report how they were framed.
vi.mock("@/components/MatchChatWindow", () => ({
  default: (p: { embedded?: boolean; emptyText?: string }) => <div data-testid="thread" data-embedded={String(!!p.embedded)}>{p.emptyText}</div>,
}));
vi.mock("@/components/ChatWindow", () => ({
  default: (p: { embedded?: boolean }) => <div data-testid="thread" data-embedded={String(!!p.embedded)} />,
}));

function vm(over: Partial<HandoverViewModel>): HandoverViewModel {
  return { id: 10, flow: "MATCH", role: "DONOR", closed: false, counterpart: { name: "Asha Devi", phone: null }, ...over } as unknown as HandoverViewModel;
}

/** The handover hub's chat card: one header naming the other person, the thread embedded under it. */
describe("handover chat card", () => {
  it("names who you are talking to, once", () => {
    render(<HandoverChatPanel vm={vm({})} currentUserEmail="donor@example.com" />);
    expect(screen.getByRole("heading", { name: "Chat with Asha Devi" })).toBeInTheDocument();
    expect(screen.getByText(/^Recipient ·/)).toBeInTheDocument();
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getByTestId("thread").dataset.embedded).toBe("true");
    expect(screen.getByText(/Say hello/)).toBeInTheDocument();
  });

  it("from the donee's side the other person is the donor; closed handovers say so", () => {
    render(<HandoverChatPanel vm={vm({ role: "DONEE", closed: true, counterpart: { name: null, phone: null } })} currentUserEmail="d@example.com" />);
    expect(screen.getByRole("heading", { name: "Chat with the donor" })).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });
});
