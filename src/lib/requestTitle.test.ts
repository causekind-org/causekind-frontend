import { describe, expect, it } from "vitest";
import { capTitle } from "./requestTitle";

const full = (t: string) => `${capTitle(t)} | CauseKind`;

describe("capTitle", () => {
  it("keeps the full <title> at 60 characters or fewer", () => {
    const samples = [
      "A used laptop for learning and building my career", // /requests/53 (was 61)
      "Need a sewing machine to restart my tailoring work at home",
      "Supercalifragilisticexpialidociousandevenlongerwithoutanyspaces",
      "Short title",
    ];
    for (const s of samples) expect(full(s).length).toBeLessThanOrEqual(60);
  });

  it("leaves short titles alone and collapses whitespace", () => {
    expect(capTitle("  Winter   blankets  ")).toBe("Winter blankets");
  });

  it("cuts at a word boundary with an ellipsis", () => {
    expect(capTitle("A used laptop for learning and building my career")).toBe("A used laptop for learning and building my…");
  });
});
