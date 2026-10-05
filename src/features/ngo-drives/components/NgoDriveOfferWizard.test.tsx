import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NgoDriveOfferWizard } from "./NgoDriveOfferWizard";
import * as api from "@/lib/api";

// Mock global scrollIntoView for jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock("@/lib/api", () => ({
  updateNgoDriveOfferItem: vi.fn().mockResolvedValue({ id: 1 }),
  submitNgoDriveOffer: vi.fn().mockResolvedValue({ id: 1 }),
}));

vi.mock("@/app/actions/locations", () => ({
  detectLocationFromServer: vi.fn(),
}));

const mockRouter = { push: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => ((key: string) => key),
}));

describe("NgoDriveOfferWizard", () => {
  it("walks to review, submits, and asserts DTO shapes, also tests Back and Save & exit", async () => {
    const user = userEvent.setup();
    render(<NgoDriveOfferWizard 
      driveId={5} 
      offerId={1} 
      ngoName="Helping Hands"
      driveUnit="blankets"
      initialQuantityReceived={0}
      initialQuantityPledged={0}
      requestTitle="Winter"
      requestedQuantity={10}
      stillNeededQuantity={10} 
      flowType="NGO_DRIVE" 
      onSubmitted={vi.fn()}
      onExit={vi.fn()}
      onSaveExit={vi.fn()}
      offer={{ quantity: "", media: [{ status: "APPROVED", mediaType: "IMAGE", mediaUrl: "foo" }, { status: "APPROVED", mediaType: "IMAGE", mediaUrl: "bar" }] } as any}
    />);

    // Step 2: Details (Step 1 bypassed because we have photos)
    await waitFor(() => expect(screen.getAllByText(/How many are you donating/i)[0]).toBeInTheDocument());
    const qtyInput = screen.getByRole("spinbutton");
    await user.clear(qtyInput);
    await user.type(qtyInput, "2");
    let continues = screen.getAllByRole("button", { name: /Continue/i });
    await user.click(continues[continues.length - 1]);

    // Step 3: Condition
    const conditionSelect = await screen.findByDisplayValue("Select…");
    await user.selectOptions(conditionSelect, "Good");
    
    // Test Back button
    const backButtons = screen.getAllByRole("button", { name: /Back/i });
    await user.click(backButtons[backButtons.length - 1]);
    await waitFor(() => expect(screen.getByRole("spinbutton")).toBeInTheDocument());
    
    continues = screen.getAllByRole("button", { name: /Continue/i });
    await user.click(continues[continues.length - 1]);
    
    // Back to Condition, proceed
    await waitFor(() => expect(screen.getByRole("combobox")).toBeInTheDocument());
    continues = screen.getAllByRole("button", { name: /Continue/i });
    await user.click(continues[continues.length - 1]);

    // Step 4: Pickup
    await waitFor(() => expect(screen.getAllByText(/Pickup city/i)[0]).toBeInTheDocument());
    await user.type(screen.getByRole("textbox", { name: /Pickup city/i }), "Mumbai");
    await user.click(screen.getByRole("checkbox", { name: /I can drop this off myself/i }));
    continues = screen.getAllByRole("button", { name: /Continue/i });
    await user.click(continues[continues.length - 1]);

    // Step 5: Review
    const declarationsCheckbox = await screen.findByRole("checkbox", { name: /I accept all the above declarations/i });
    await user.click(declarationsCheckbox);
    
    // Test Save & exit
    await user.click(screen.getAllByRole("button", { name: /Save & exit/i })[0]);
    await waitFor(() => expect(api.updateNgoDriveOfferItem).toHaveBeenCalled());
    
    expect(api.updateNgoDriveOfferItem).toHaveBeenCalledWith(1, expect.objectContaining({
      quantity: 2,
      condition: "Good",
      knownDefects: "None",
      matchesRequirements: true, // From declarationsConfirmed
      handoverMethod: "DROP_OFF", // From donorDropOffAvailable
      pickupCity: "Mumbai",
    }));
    
    // api.updateNgoDriveOfferItem.mockClear();

    // Now submit
    await user.click(screen.getAllByRole("button", { name: /Send offer to the NGO/i })[0]);
    expect(api.submitNgoDriveOffer).toHaveBeenCalledWith(1);
  }, 20000);
});
