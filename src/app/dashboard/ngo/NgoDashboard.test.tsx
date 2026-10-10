import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import NgoDashboardPage from "./page";

const replace = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("@/hooks/useNgoDashboardData", () => ({
  useNgoDashboardData: () => ({ status: "loading", isVerified: false, requests: [], documents: [] }),
}));
vi.mock("@/lib/api", () => ({ getMyMatches: vi.fn().mockResolvedValue([]) }));

// /dashboard/ngo is the NGO's own dashboard (links point to #live-drives); it no longer
// redirects to "/". It only sends visitors who may not see it elsewhere.
describe("NgoDashboardPage - access redirects", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("sends signed-out visitors to /login", async () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<NgoDashboardPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("sends non-NGO accounts to their own dashboard", async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, email: "d@example.test", role: "DONOR" }, isLoading: false });
    render(<NgoDashboardPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("keeps NGO accounts on the page", async () => {
    mockUseAuth.mockReturnValue({ user: { id: 2, email: "n@example.test", role: "NGO_PARTNER" }, isLoading: false });
    render(<NgoDashboardPage />);
    await new Promise((r) => setTimeout(r, 0));
    expect(replace).not.toHaveBeenCalled();
  });
});
