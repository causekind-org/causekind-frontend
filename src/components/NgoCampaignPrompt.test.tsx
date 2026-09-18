import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { NgoCampaignPrompt } from "./NgoCampaignPrompt";

const mockUseAuth = vi.fn();
const mockUseIsDesktop = vi.fn();
const mockUsePathname = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useIsDesktop", () => ({
  useIsDesktop: () => mockUseIsDesktop(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("NgoCampaignPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUseIsDesktop.mockReturnValue(true);
    mockUsePathname.mockReturnValue("/");
    mockUseAuth.mockReturnValue({
      user: { id: "ngo-1", email: "ngo@example.com", role: "NGO" },
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render when user is not NGO (e.g. DONOR or DONEE)", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "donor-1", email: "donor@example.com", role: "DONOR" },
      isLoading: false,
    });

    render(<NgoCampaignPrompt />);
    act(() => {
      vi.advanceTimersByTime(20000);
    });

    expect(screen.queryByText(/NGO Portal/i)).not.toBeInTheDocument();
  });

  it("does not render when isDesktop is false", () => {
    mockUseIsDesktop.mockReturnValue(false);

    render(<NgoCampaignPrompt />);
    act(() => {
      vi.advanceTimersByTime(20000);
    });

    expect(screen.queryByText(/NGO Portal/i)).not.toBeInTheDocument();
  });

  it("appears after 10s, stays 10s, disappears, and repeats after 10s for NGO", () => {
    render(<NgoCampaignPrompt />);

    // Initially not visible
    expect(screen.queryByText(/NGO Portal/i)).not.toBeInTheDocument();

    // Advance 10s -> prompt appears
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText(/NGO Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Post a campaign \/ request/i)).toBeInTheDocument();
    expect(screen.getByText(/Tell donors what you need/i)).toBeInTheDocument();

    const ctaLink = screen.getByRole("link", { name: /Post/i });
    expect(ctaLink).toHaveAttribute("href", "/requests/new");

    // Advance 9.5s -> still visible
    act(() => {
      vi.advanceTimersByTime(9500);
    });
    expect(screen.getByText(/NGO Portal/i)).toBeInTheDocument();

    // Advance 500ms + EXIT_MS (500ms) -> disappears
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText(/NGO Portal/i)).not.toBeInTheDocument();

    // Advance 10s (REPEAT_DELAY_MS) -> reappears
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText(/NGO Portal/i)).toBeInTheDocument();
  });

  it("renders for NGO_PARTNER role as well", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "ngo-partner-1", email: "ngo@example.com", role: "NGO_PARTNER" },
      isLoading: false,
    });

    render(<NgoCampaignPrompt />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText(/NGO Portal/i)).toBeInTheDocument();
  });

  it("dismisses cleanly on close button click", () => {
    render(<NgoCampaignPrompt />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText(/NGO Portal/i)).toBeInTheDocument();

    const dismissBtn = screen.getByRole("button", { name: /Dismiss/i });
    act(() => {
      dismissBtn.click();
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByText(/NGO Portal/i)).not.toBeInTheDocument();

    // Should stay dismissed
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(screen.queryByText(/NGO Portal/i)).not.toBeInTheDocument();
  });
});
