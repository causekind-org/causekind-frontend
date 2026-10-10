import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { OfferConditionStep } from "@/features/donation-offer-wizard/steps/OfferConditionStep";
import { OFFER_CONDITIONS } from "@/features/donation-offer-wizard/offerModel";

/** The donor↔donee offer wizard is unchanged: without the drive-only prop it lists every condition. */
describe("OfferConditionStep options", () => {
  const base = { model: { condition: "" } as never, errors: {}, onChange: vi.fn(), compat: { kind: "incomplete" } as never };
  const options = (c: HTMLElement) => Array.from(c.querySelectorAll('select[name="condition"] option')).map(o => (o as HTMLOptionElement).value).filter(Boolean);

  it("shows every condition by default (donor↔donee offers)", () => {
    const { container } = render(<OfferConditionStep {...base} />);
    expect(options(container)).toEqual([...OFFER_CONDITIONS]);
  });

  it("shows only the given conditions for a drive", () => {
    const { container, getByText } = render(<OfferConditionStep {...base} conditions={["Unused"]} conditionHint="This drive accepts: Unused" />);
    expect(options(container)).toEqual(["Unused"]);
    expect(getByText("This drive accepts: Unused")).toBeInTheDocument();
  });
});
