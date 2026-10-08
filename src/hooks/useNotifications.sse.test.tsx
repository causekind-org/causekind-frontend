import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { NotificationsProvider } from "./useNotifications";
import { useAuth } from "./useAuth";
import { getMyNotifications } from "@/lib/api";

vi.mock("./useAuth", () => ({ useAuth: vi.fn() }));

vi.mock("@/lib/api", () => ({
  getMyNotifications: vi.fn(async () => []),
  markAllNotificationsRead: vi.fn(async () => {}),
  getMyMatches: vi.fn(async () => []),
  getMyItemRequests: vi.fn(async () => []),
  getMyItemListings: vi.fn(async () => []),
  getOffersForMyRequests: vi.fn(async () => []),
  getMyDonationOffers: vi.fn(async () => []),
  getMyNgoDrives: vi.fn(async () => []),
  getNgoDriveOffersForNgo: vi.fn(async () => []),
  getMyNgoDriveOffers: vi.fn(async () => []),
}));

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  closed = false;
  onerror: (() => void) | null = null;
  constructor(public url: string) { FakeEventSource.instances.push(this); }
  addEventListener() {}
  close() { this.closed = true; }
}

const open = () => FakeEventSource.instances.filter(es => !es.closed);

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event("visibilitychange"));
}

// The SSE stream is an open request that keeps a Cloud Run instance billed;
// a background tab must let go of it.
describe("notifications SSE and tab visibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, email: "donor@example.com", role: "DONOR" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("closes the stream after 5 minutes hidden and reconnects + refreshes on return", async () => {
    render(<NotificationsProvider><div /></NotificationsProvider>);
    expect(open()).toHaveLength(1);

    act(() => setHidden(true));
    act(() => { vi.advanceTimersByTime(4 * 60_000); });
    expect(open()).toHaveLength(1); // still inside the grace period

    act(() => { vi.advanceTimersByTime(60_000); });
    expect(open()).toHaveLength(0);

    vi.mocked(getMyNotifications).mockClear();
    await act(async () => setHidden(false));
    expect(open()).toHaveLength(1);
    expect(getMyNotifications).toHaveBeenCalled();
  });

  it("keeps the stream through a quick tab switch", () => {
    render(<NotificationsProvider><div /></NotificationsProvider>);
    const first = FakeEventSource.instances[0];

    act(() => setHidden(true));
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => setHidden(false));
    act(() => { vi.advanceTimersByTime(10 * 60_000); });

    expect(first.closed).toBe(false);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("does not retry a dropped stream while the tab is hidden", () => {
    render(<NotificationsProvider><div /></NotificationsProvider>);
    act(() => setHidden(true));
    act(() => { FakeEventSource.instances[0].onerror?.(); });
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(open()).toHaveLength(0);
    expect(FakeEventSource.instances).toHaveLength(1);
  });
});
