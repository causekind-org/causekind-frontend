import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

// Diwali runs until 13 Nov 2026 00:00 IST (src/lib/diwali.ts); pinned per case.
const diwaliState = vi.hoisted(() => ({ on: true }));
vi.mock("@/lib/diwali", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/diwali")>()),
  isDiwaliCampaignActive: () => diwaliState.on,
}));
vi.mock("@/lib/raksha-bandhan", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/raksha-bandhan")>()),
  isRakshaBandhanCampaignActive: () => false,
}));

import { CauseKindLogo } from "@/components/Navbar";

describe("the header logo", () => {
  beforeEach(() => {
    diwaliState.on = true;
  });

  it("is the Diwali lockup during Diwali", () => {
    const { container } = render(<CauseKindLogo />);
    expect(container.querySelector(".ck-dlogo-cause")).not.toBeNull();
  });

  it("is the everyday logo once Diwali has ended", () => {
    diwaliState.on = false;
    const { container } = render(<CauseKindLogo />);
    expect(container.querySelector(".ck-dlogo-cause")).toBeNull();
    expect(container.querySelector('[aria-label="CauseKind"]')).not.toBeNull();
  });
});
