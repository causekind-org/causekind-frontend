import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GiftJourneyTracker } from "./GiftJourneyTracker";

describe("GiftJourneyTracker Component Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the eyebrow, headline, and subheadline from NGO perspective", () => {
    render(<GiftJourneyTracker />);

    expect(screen.getByText("After you post")).toBeInTheDocument();
    expect(screen.getByText("What happens after you post")).toBeInTheDocument();
    expect(
      screen.getByText(
        "From listing your needs to donor handover, every step is direct, transparent, and closed with photo proof."
      )
    ).toBeInTheDocument();
  });

  it("renders NGO request lifecycle steps and allows clicking steps to view details", () => {
    render(<GiftJourneyTracker />);

    expect(screen.getByText("40 Blankets · Winter Relief Drive, Thane")).toBeInTheDocument();
    expect(screen.getByText("1. You start a drive")).toBeInTheDocument();
    expect(screen.getByText("2. Donors nearby pledge them")).toBeInTheDocument();
    expect(screen.getByText("3. They drop off, and you confirm receipt")).toBeInTheDocument();
    expect(screen.getByText("4. You upload a handover photo")).toBeInTheDocument();
    expect(screen.getByText("5. Every donor gets the photo and their certificate")).toBeInTheDocument();

    // Click step 4 (You upload a handover photo)
    const step4Button = screen.getByRole("button", { name: /4\. You upload a handover photo/i });
    fireEvent.click(step4Button);

    expect(screen.getByText("Photo Proof Uploaded")).toBeInTheDocument();
    expect(screen.getByText(/Handover Proof/i)).toBeInTheDocument();
  });

  it("restarts from step 1 when replay button is clicked", () => {
    render(<GiftJourneyTracker />);

    // Jump to step 4
    const step4Button = screen.getByRole("button", { name: /4\. You upload a handover photo/i });
    fireEvent.click(step4Button);

    // Click Replay journey
    const replayButton = screen.getByRole("button", { name: /Replay journey/i });
    fireEvent.click(replayButton);

    expect(screen.getByText("1. You start a drive")).toBeInTheDocument();
  });
});
