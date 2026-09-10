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

  it("renders toast after modal is dismissed and auto-dismisses after 4 seconds", () => {
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

    // After 1200ms delay, toast appears
    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(screen.getByText("Complete your profile")).toBeInTheDocument();
    expect(screen.getByText("Unlock verification and campaigns")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Complete Now/i });
    expect(link).toHaveAttribute("href", "/dashboard/ngo/profile");

    // After 4000ms + 380ms exit animation, toast auto-dismisses
    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();
  });

  it("clicking dismiss button immediately hides the toast", () => {
    render(<NgoProfileToast isProfileComplete={false} isModalOpen={false} userId="102" />);

    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(screen.getByText("Complete your profile")).toBeInTheDocument();

    const dismissBtn = screen.getByRole("button", { name: /Dismiss/i });
    act(() => {
      dismissBtn.click();
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();
  });
});
