import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import RequestsClient from "./RequestsClient";
import NewRequestPage from "./new/page";
import DoneeOffersPage from "../donee/offers/page";
import NgoRequestsRedirect from "../ngo/requests/page";
import NgoNewRequestRedirect from "../ngo/requests/new/page";

const mockRedirect = vi.fn();
const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams("draftId=7"),
  usePathname: () => "/",
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

const mockUser = vi.fn(() => ({ role: "NGO_PARTNER" }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser(), isLoading: false, isRestoring: false }),
}));
vi.mock("@/hooks/useEntityUpdates", () => ({ useEntityUpdates: () => {} }));
vi.mock("@/hooks/useLocations", () => ({ useLocations: () => ({ states: [], cities: [], countries: [], dialCodes: [], loading: false }) }));
vi.mock("@/hooks/useDynamicTranslation", () => ({
  useDynamicTranslation: (text: string | null) => text,
  TranslatedText: ({ text }: { text?: string }) => <>{text}</>,
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(Object.entries(real).map(([key, value]) =>
    [key, typeof value === "function" && /^[a-z]/.test(key) ? vi.fn().mockResolvedValue([]) : value]));
});

const LIVE_DRIVES = "/dashboard/ngo#live-drives";

/** NGOs only have drives: every old request/offer entry point sends them to their drives. */
describe("NGO redirects away from request pages", () => {
  beforeEach(() => { vi.clearAllMocks(); mockUser.mockReturnValue({ role: "NGO_PARTNER" }); });

  it("/requests sends an NGO to its live drives", async () => {
    render(<RequestsClient />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(LIVE_DRIVES));
  });

  it("/requests/new sends an NGO straight to the drive form, dropping old drafts", async () => {
    render(<NewRequestPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/ngo/drives/new"));
    expect(mockReplace.mock.calls.flat().some((url) => String(url).startsWith("/ngo/requests"))).toBe(false);
  });

  it("/donee/offers sends an NGO to its live drives", async () => {
    render(<DoneeOffersPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(LIVE_DRIVES));
  });

  it("/donee/offers still loads for a donee", async () => {
    mockUser.mockReturnValue({ role: "DONEE" });
    const api = await import("@/lib/api");
    render(<DoneeOffersPage />);
    await waitFor(() => expect(api.getOffersForMyRequests).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("/ngo/requests redirects to live drives", () => {
    NgoRequestsRedirect();
    expect(mockRedirect).toHaveBeenCalledWith(LIVE_DRIVES);
  });

  it("/ngo/requests/new redirects to the drive form", () => {
    NgoNewRequestRedirect();
    expect(mockRedirect).toHaveBeenCalledWith("/ngo/drives/new");
  });
});
