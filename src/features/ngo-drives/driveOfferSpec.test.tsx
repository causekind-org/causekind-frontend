import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  DRIVE_OFFER_AGE_RANGES,
  mapLegacyAgeToAgeRange,
  formatAgeRange,
} from "./driveOfferAge";
import { DriveOfferDetailsStep as OfferDetailsStep } from "@/features/ngo-drives/components/DriveOfferDetailsStep";
import { OfferReviewStep } from "@/features/donation-offer-wizard/steps/OfferReviewStep";
import { emptyOfferModel, type OfferModel } from "@/features/donation-offer-wizard/offerModel";
import { serializeDriveOffer, driveOfferModelFrom } from "./driveOfferSerializer";
import { REQUIRE_CLEAN_CATEGORIES } from "@/app/ngo/drives/new/page";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (k: string) => k,
}));

describe("1. driveOfferAge utilities", () => {
  it("formats age range codes into human-readable text", () => {
    expect(formatAgeRange("LT_1")).toBe("Less than 1 year");
    expect(formatAgeRange("Y1_2")).toBe("1-2 years");
    expect(formatAgeRange("Y2_3")).toBe("2-3 years");
    expect(formatAgeRange("Y3_5")).toBe("3-5 years");
    expect(formatAgeRange("GT_5")).toBe("5+ years");
    expect(formatAgeRange(null)).toBe("");
    expect(formatAgeRange(undefined)).toBe("");
    expect(formatAgeRange("UNKNOWN")).toBe("UNKNOWN");
  });

  it("maps legacy numerical and textual ages correctly", () => {
    expect(mapLegacyAgeToAgeRange("0")).toBe("LT_1");
    expect(mapLegacyAgeToAgeRange("6 months")).toBe("LT_1");
    expect(mapLegacyAgeToAgeRange("1")).toBe("Y1_2");
    expect(mapLegacyAgeToAgeRange("1 year")).toBe("Y1_2");
    expect(mapLegacyAgeToAgeRange("2")).toBe("Y2_3");
    expect(mapLegacyAgeToAgeRange("2 years")).toBe("Y2_3");
    expect(mapLegacyAgeToAgeRange("3")).toBe("Y3_5");
    expect(mapLegacyAgeToAgeRange("4 years")).toBe("Y3_5");
    expect(mapLegacyAgeToAgeRange("5")).toBe("GT_5");
    expect(mapLegacyAgeToAgeRange("10 years")).toBe("GT_5");
    expect(mapLegacyAgeToAgeRange("5+ years")).toBe("GT_5");
  });

  it("defaults to LT_1 when condition is Unused/Brand New/New with tags", () => {
    expect(mapLegacyAgeToAgeRange(null, "Unused")).toBe("LT_1");
    expect(mapLegacyAgeToAgeRange(undefined, "Brand New")).toBe("LT_1");
    expect(mapLegacyAgeToAgeRange("", "New with tags")).toBe("LT_1");
    expect(mapLegacyAgeToAgeRange("", "Good")).toBe("");
  });
});

describe("2. REQUIRE_CLEAN_CATEGORIES", () => {
  it("includes clothing, household and furniture but excludes electronics", () => {
    expect(REQUIRE_CLEAN_CATEGORIES).toContain("Clothing");
    expect(REQUIRE_CLEAN_CATEGORIES).toContain("Household");
    expect(REQUIRE_CLEAN_CATEGORIES).toContain("Furniture");
    expect(REQUIRE_CLEAN_CATEGORIES).not.toContain("Electronics");
    expect(REQUIRE_CLEAN_CATEGORIES).not.toContain("Books");
  });
});

describe("3. OfferDetailsStep presentation & dynamic fields", () => {
  it("shows required indicator for clothing and dynamic placeholder", () => {
    const model: OfferModel = { ...emptyOfferModel, quantity: "2" };
    const onChange = vi.fn();
    const { rerender } = render(
      <OfferDetailsStep
        model={model}
        errors={{}}
        onChange={onChange}
        showSpecNotes={true}
        driveCategory="Clothing"
      />
    );

    const sizeInput = screen.getByLabelText(/Size \/ specification/);
    expect(sizeInput).toBeInTheDocument();
    expect(sizeInput).toHaveAttribute("placeholder", "e.g. Age 6-8 years, size M");

    rerender(
      <OfferDetailsStep
        model={model}
        errors={{}}
        onChange={onChange}
        showSpecNotes={true}
        driveCategory="Electronics"
      />
    );
    expect(screen.getByLabelText(/Size \/ specification/)).toHaveAttribute(
      "placeholder",
      "e.g. Model / brand and specs"
    );
  });

  it("shows conditional checkboxes only when drive requires them", () => {
    const model: OfferModel = { ...emptyOfferModel, quantity: "2" };
    const onChange = vi.fn();

    // Drive with neither requirement
    const { rerender } = render(
      <OfferDetailsStep
        model={model}
        errors={{}}
        onChange={onChange}
        showSpecNotes={true}
        mustBeWorking={false}
        requireClean={false}
      />
    );
    expect(screen.queryByLabelText(/I've tested it and it works/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Washed and clean/i)).not.toBeInTheDocument();

    // Drive with mustBeWorking and requireClean
    rerender(
      <OfferDetailsStep
        model={model}
        errors={{}}
        onChange={onChange}
        showSpecNotes={true}
        mustBeWorking={true}
        requireClean={true}
      />
    );
    expect(screen.getByLabelText(/I've tested it and it works/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Washed and clean/i)).toBeInTheDocument();

    // Ticking checkboxes calls onChange
    fireEvent.click(screen.getByLabelText(/I've tested it and it works/i));
    expect(onChange).toHaveBeenCalledWith("confirmedWorking", true);

    fireEvent.click(screen.getByLabelText(/Washed and clean/i));
    expect(onChange).toHaveBeenCalledWith("confirmedClean", true);
  });
});

describe("4. driveOfferSerializer serialization and hydration", () => {
  it("serializes new fields to the drive offer patch", () => {
    const model: OfferModel = {
      ...emptyOfferModel,
      quantity: "4",
      condition: "Good",
      ageRange: "Y2_3",
      sizeSpec: "Size XL / 42",
      confirmedWorking: true,
      confirmedClean: true,
      declarationsConfirmed: true,
    };

    const patch = serializeDriveOffer(model, { maxQuantity: 10 });
    expect(patch.quantity).toBe(4);
    expect(patch.condition).toBe("Good");
    expect(patch.ageRange).toBe("Y2_3");
    expect(patch.approximateAge).toBe("2-3 years");
    expect(patch.sizeSpec).toBe("Size XL / 42");
    expect(patch.confirmedWorking).toBe(true);
    expect(patch.confirmedClean).toBe(true);
  });

  it("hydrates legacy drive offers gracefully without crashing", () => {
    const legacyOffer = {
      id: 11,
      driveId: 5,
      quantity: 2,
      condition: "Like New",
      approximateAge: "2 years", // legacy string
      // sizeSpec, ageRange, confirmedWorking, confirmedClean are undefined
    };

    const model = driveOfferModelFrom(legacyOffer as never);
    expect(model.quantity).toBe("2");
    expect(model.condition).toBe("Like New");
    expect(model.approximateAge).toBe("2 years");
    expect(model.ageRange).toBe("Y2_3"); // auto-mapped from legacy age
    expect(model.confirmedWorking).toBe(false);
    expect(model.confirmedClean).toBe(false);
  });
});

describe("5. OfferReviewStep display of item specifications", () => {
  it("renders size/spec, age range and confirmations in review step", () => {
    const model: OfferModel = {
      ...emptyOfferModel,
      quantity: "3",
      condition: "Gently Used",
      sizeSpec: "Medium (Chest 38-40)",
      ageRange: "Y1_2",
      confirmedWorking: true,
      confirmedClean: true,
      declarationsConfirmed: true,
    };

    render(
      <OfferReviewStep
        model={model}
        errors={{}}
        requestTitle={null}
        compat={null}
        declarationsInvalidated={false}
        onEdit={vi.fn()}
        onChange={vi.fn()}
        driveDetails
      />
    );

    expect(screen.getByText("Medium (Chest 38-40)")).toBeInTheDocument();
    expect(screen.getByText("1-2 years")).toBeInTheDocument();
    expect(screen.getByText(/Tested and works/)).toBeInTheDocument();
    expect(screen.getByText(/Washed and clean/)).toBeInTheDocument();
  });
});

describe("6. DriveHandover item details display", () => {
  it("renders item specifications and confirmations with emerald dot indicators and no check glyph", async () => {
    const { DriveHandover } = await import("./components/DriveHandover");
    const testOffer = {
      id: 99,
      driveId: 5,
      status: "NGO_ACCEPTED",
      quantity: 5,
      driveTitle: "Warm Winter Wear",
      driveUnit: "PIECES",
      sizeSpec: "Adult Large",
      ageRange: "LT_1",
      condition: "Brand New",
      confirmedWorking: true,
      confirmedClean: true,
    } as never;

    render(
      <DriveHandover
        role="NGO"
        offer={testOffer}
        handover={null}
        onChanged={vi.fn()}
      />
    );

    expect(screen.getByText("Adult Large")).toBeInTheDocument();
    expect(screen.getByText("Less than 1 year")).toBeInTheDocument();
    expect(screen.getByText("Tested and works")).toBeInTheDocument();
    expect(screen.getByText("Washed and clean")).toBeInTheDocument();
    expect(screen.queryByText(/✓/)).not.toBeInTheDocument();
  });
});
