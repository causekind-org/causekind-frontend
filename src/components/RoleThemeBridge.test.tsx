import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { RoleThemeBridge } from "./RoleThemeBridge";
import { useAuth } from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("RoleThemeBridge Component", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-ck-role-theme");
    document.documentElement.removeAttribute("data-theme-role");
    vi.clearAllMocks();
  });

  it("sets data-ck-role-theme and data-theme-role to 'ngo' when signed in as NGO", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "green@ngo.org", role: "NGO_PARTNER" } as any,
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });

    render(<RoleThemeBridge />);

    expect(document.documentElement.getAttribute("data-ck-role-theme")).toBe("ngo");
    expect(document.documentElement.getAttribute("data-theme-role")).toBe("ngo");
  });

  it("updates attributes when switching to DONOR without page refresh", () => {
    const { rerender } = render(<RoleThemeBridge />);

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 102, email: "donor@causekind.org", role: "DONOR" } as any,
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });

    rerender(<RoleThemeBridge />);

    expect(document.documentElement.getAttribute("data-ck-role-theme")).toBe("donor");
    expect(document.documentElement.getAttribute("data-theme-role")).toBe("donor");
  });

  it("removes attributes immediately upon logout", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "green@ngo.org", role: "NGO_PARTNER" } as any,
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });

    const { rerender } = render(<RoleThemeBridge />);
    expect(document.documentElement.getAttribute("data-theme-role")).toBe("ngo");

    // Simulate logout
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });

    rerender(<RoleThemeBridge />);

    expect(document.documentElement.getAttribute("data-ck-role-theme")).toBeNull();
    expect(document.documentElement.getAttribute("data-theme-role")).toBeNull();
  });
});
