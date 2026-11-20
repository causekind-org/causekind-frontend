import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommandPalette } from "./CommandPalette";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), superAdminSearch: vi.fn().mockResolvedValue({ groups: [] }) }));

describe("CommandPalette open signal (top-bar search field)", () => {
  it("stays closed at 0 and opens with a focused search box when the signal is bumped", () => {
    const props = { onOpenUser: vi.fn(), onOpenIntervention: vi.fn(), isDark: false };
    const { rerender } = render(<CommandPalette {...props} openSignal={0} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    rerender(<CommandPalette {...props} openSignal={1} />);
    const box = screen.getByRole("textbox");
    expect(box).toBeInTheDocument();
    expect(document.activeElement).toBe(box);
  });
});
