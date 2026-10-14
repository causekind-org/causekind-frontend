import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/hooks/useAuth";

const mockMarkAllRead = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    unread: 1,
    notifications: [
      {
        id: "notif-1",
        type: "info",
        title: "Test Notification",
        body: "This is a test notification with no link.",
        link: null,
        receivedAt: Date.now(),
      },
    ],
    markAllRead: mockMarkAllRead,
  }),
}));

vi.mock("@/hooks/useTilt", () => ({
  useTilt: () => ({}),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({}),
  usePathname: () => "/",
}));

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a div instead of a link when notification link is null", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, email: "test@example.com", role: "DONOR" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });

    render(<NotificationBell />);

    // Click the bell to open the dropdown
    const bellBtn = screen.getByRole("button", { name: /Notifications/i });
    act(() => {
      bellBtn.click();
    });

    const notifTitle = screen.getByText("Test Notification");
    const container = notifTitle.closest("div.flex-1")?.parentElement;
    
    // Check that it's a div, not an a tag
    expect(container?.tagName.toLowerCase()).toBe("div");
    // Ensure the link is not present
    expect(container).not.toHaveAttribute("href");
  });
});
