import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MobileBottomNav } from "./MobileUI";

const state = vi.hoisted(() => ({ user: { email: "demo@example.test", role: "DONOR" } as {email: string; role: string} | null, path: "/", prefetch: vi.fn(), push: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("next/navigation", () => ({ usePathname: () => state.path }));
vi.mock("@/hooks/useAppRouter", () => ({ useRouter: () => ({ prefetch: state.prefetch, push: state.push }) }));
vi.mock("@/hooks/useNearFooter", () => ({ useNearFooter: () => false }));
vi.mock("@/hooks/useImmersiveNav", () => ({ useImmersiveNav: () => false }));
vi.mock("@/components/GlassSurface", () => ({ default: () => null }));
vi.mock("@/components/RequestNudge", () => ({ RequestNudge: () => null }));

beforeEach(() => { state.user = { email: "demo@example.test", role: "DONOR" }; state.path = "/"; vi.clearAllMocks(); });

it("does not prefetch on mount and warms only the member target the user touches", () => {
  render(<MobileBottomNav />);
  expect(state.prefetch).not.toHaveBeenCalled();
  const profile = screen.getByRole("link", { name: "Profile" });
  fireEvent.pointerDown(profile);
  fireEvent.focus(profile);
  expect(state.prefetch).toHaveBeenCalledExactlyOnceWith("/profile");
  expect(state.push).not.toHaveBeenCalled();
});

it("warms only the public login destination for a guest", () => {
  state.user = null;
  render(<MobileBottomNav />);
  fireEvent.pointerDown(screen.getByRole("link", { name: "Profile" }));
  expect(state.prefetch).toHaveBeenCalledExactlyOnceWith("/login");
});

it("does not refetch the current member page", () => {
  state.path = "/en/profile";
  render(<MobileBottomNav />);
  fireEvent.pointerDown(screen.getByRole("link", { name: "Profile" }));
  expect(state.prefetch).not.toHaveBeenCalled();
});
