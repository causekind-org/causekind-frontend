import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { TrueFocus } from "./TrueFocus";

describe("TrueFocus Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("renders with full accessible label and the 3 focus groups", () => {
    render(<TrueFocus items={["Get verified.", "Post.", "Deliver."]} />);

    const heading = screen.getByRole("heading", { name: "Get verified. Post. Deliver." });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText("Get verified.")).toBeInTheDocument();
    expect(screen.getByText("Post.")).toBeInTheDocument();
    expect(screen.getByText("Deliver.")).toBeInTheDocument();
  });

  it("advances focus index over time and notifies onFocusChange callback", () => {
    const handleFocusChange = vi.fn();
    render(
      <TrueFocus
        items={["Get verified.", "Post.", "Deliver."]}
        isVerified={true}
        onFocusChange={handleFocusChange}
      />
    );

    expect(handleFocusChange).toHaveBeenCalledWith(0);

    // Advance 1500ms -> should move to index 1 ("Post.")
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(handleFocusChange).toHaveBeenCalledWith(1);

    // Advance 1500ms -> should move to index 2 ("Deliver.")
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(handleFocusChange).toHaveBeenCalledWith(2);

    // Advance 1500ms -> should cycle back to index 0 ("Get verified.")
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(handleFocusChange).toHaveBeenCalledWith(0);
  });

  it("holds index 0 for longer when unverified (2500ms vs 1500ms)", () => {
    const handleFocusChange = vi.fn();
    render(
      <TrueFocus
        items={["Get verified.", "Post.", "Deliver."]}
        isVerified={false}
        onFocusChange={handleFocusChange}
      />
    );

    expect(handleFocusChange).toHaveBeenCalledWith(0);

    // Advance 1500ms -> should still be at index 0 because unverified holds 2500ms
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(handleFocusChange).toHaveBeenLastCalledWith(0);

    // Advance another 1000ms (total 2500ms) -> should advance to index 1
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(handleFocusChange).toHaveBeenCalledWith(1);
  });

  it("allows mouse hover to take focus on desktop", () => {
    const handleFocusChange = vi.fn();
    render(
      <TrueFocus
        items={["Get verified.", "Post.", "Deliver."]}
        isVerified={true}
        onFocusChange={handleFocusChange}
      />
    );

    const postSpan = screen.getByText("Post.");
    fireEvent.mouseEnter(postSpan);

    expect(handleFocusChange).toHaveBeenCalledWith(1);
  });
});
