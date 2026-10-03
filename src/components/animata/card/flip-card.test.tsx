import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlipCard } from "./flip-card";

describe("FlipCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders front and back contents with accessibility attributes", () => {
    render(
      <FlipCard
        front={<div>Front Content</div>}
        back={<div>Back Content</div>}
        ariaLabel="Test Card Description"
      />
    );

    const card = screen.getByRole("button", { name: "Test Card Description" });
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Front Content")).toBeInTheDocument();
    expect(screen.getByText("Back Content")).toBeInTheDocument();
  });

  it("toggles flipped state on click", () => {
    const handleFlipChange = vi.fn();
    render(
      <FlipCard
        front={<div>Front Content</div>}
        back={<div>Back Content</div>}
        onFlipChange={handleFlipChange}
      />
    );

    const card = screen.getByRole("button");
    fireEvent.click(card);
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(handleFlipChange).toHaveBeenCalledWith(true);

    fireEvent.click(card);
    expect(card).toHaveAttribute("aria-pressed", "false");
    expect(handleFlipChange).toHaveBeenCalledWith(false);
  });

  it("toggles flipped state on keyboard Enter and Space", () => {
    const handleFlipChange = vi.fn();
    render(
      <FlipCard
        front={<div>Front Content</div>}
        back={<div>Back Content</div>}
        onFlipChange={handleFlipChange}
      />
    );

    const card = screen.getByRole("button");

    // Press Enter
    fireEvent.keyDown(card, { key: "Enter" });
    expect(card).toHaveAttribute("aria-pressed", "true");

    // Press Space
    fireEvent.keyDown(card, { key: " " });
    expect(card).toHaveAttribute("aria-pressed", "false");
  });

  it("flips on mouse hover and flips back on mouse leave", () => {
    render(
      <FlipCard
        front={<div>Front Content</div>}
        back={<div>Back Content</div>}
      />
    );

    const card = screen.getByRole("button");
    fireEvent.mouseEnter(card);
    expect(card).toHaveAttribute("aria-pressed", "true");

    fireEvent.mouseLeave(card);
    expect(card).toHaveAttribute("aria-pressed", "false");
  });
});
