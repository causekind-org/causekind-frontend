import { describe, expect, it, vi } from "vitest";
import NgoDashboardPage from "./page";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("NgoDashboardPage - Consolidated Route", () => {
  it("redirects immediately to root '/'", () => {
    NgoDashboardPage();
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
