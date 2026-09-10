import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { NgoProfileToast } from "./NgoProfileToast";

describe("NgoProfileToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render when profile is complete", () => {
    render(<NgoProfileToast isProfileComplete={true} isModalOpen={false} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText(/Complete your profile/i)).not.toBeInTheDocument();
  });

  it("does not render while welcome modal is open", () => {
    render(<NgoProfileToast isProfileComplete={false} isModalOpen={true} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText(/Complete your profile/i)).not.toBeInTheDocument();
  });

  it("renders toast immediately after modal is dismissed, stays 5s, disappears, reappears every 15s", () => {
    const { rerender } = render(
      <NgoProfileToast isProfileComplete={false} isModalOpen={true} userId="101" />
    );

    // Modal is open -> no toast
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();

    // Modal is dismissed -> isModalOpen becomes false
    rerender(<NgoProfileToast isProfileComplete={false} isModalOpen={false} userId="101" />);

    // Immediately appears (no delay)
    expect(screen.getByText("Complete your profile")).toBeInTheDocument();
    expect(screen.getByText("Unlock verification and campaigns")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Complete Now/i });
    expect(link).toHaveAttribute("href", "/dashboard/ngo/profile");

    // After 4900ms, it is still visible
    act(() => {
      vi.advanceTimersByTime(4900);
    });
    expect(screen.getByText("Complete your profile")).toBeInTheDocument();

    // After 5000ms + 380ms exit animation, toast disappears
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();

    // After 14.5s since disappearing, still not reappeared yet
    act(() => {
      vi.advanceTimersByTime(14500);
    });
    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();

    // At 15s mark (advance 600ms), it reappears!
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByText("Complete your profile")).toBeInTheDocument();

    // Stays for 5s, then disappears again
    act(() => {
      vi.advanceTimersByTime(5400);
    });
    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();

    // If profile becomes complete, loop stops permanently
    rerender(<NgoProfileToast isProfileComplete={true} isModalOpen={false} userId="101" />);
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();
  });

  it("clicking dismiss button hides the toast and restarts the 15s interval", () => {
    render(<NgoProfileToast isProfileComplete={false} isModalOpen={false} userId="102" />);

    expect(screen.getByText("Complete your profile")).toBeInTheDocument();

    const dismissBtn = screen.getByRole("button", { name: /Dismiss/i });
    act(() => {
      dismissBtn.click();
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();

    // After 15 seconds, it reappears
    act(() => {
      vi.advanceTimersByTime(15100);
    });
    expect(screen.getByText("Complete your profile")).toBeInTheDocument();
  });
});
