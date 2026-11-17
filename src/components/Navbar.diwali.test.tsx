import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { SiteHeader } from "./Navbar";
import { useAuth } from "@/hooks/useAuth";

// The phone header used to show the Diwali logo outside the campaign check, so it
// stayed on every page after 13 Nov while the desktop logo had already gone back.
// diwaliLogoEnds.test.tsx covers CauseKindLogo only, which is how this was missed.
const diwaliState = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/diwali", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/diwali")>()),
  isDiwaliCampaignActive: () => diwaliState.on,
}));
vi.mock("@/lib/raksha-bandhan", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/raksha-bandhan")>()),
  isRakshaBandhanCampaignActive: () => false,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isSlowRequestError: vi.fn().mockReturnValue(false),
  getMyNgoProfileDocuments: vi.fn().mockResolvedValue([]),
  getMyNgoApplication: vi.fn(),
  getMyProfile: vi.fn().mockResolvedValue(null),
  getMyMatches: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markAsRead: vi.fn() }),
}));

vi.mock("@/components/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock("@/components/SpecularButton", () => ({
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/StaggeredMenu", () => ({
  default: () => null,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => Object.assign((key: string) => key, { has: () => false }),
}));

async function renderPhoneHeader() {
  const { container } = render(<SiteHeader />);
  await act(async () => { await Promise.resolve(); });
  const header = container.querySelector(".ck-mobile-header");
  expect(header).not.toBeNull();
  return header as HTMLElement;
}

describe("the phone header logo", () => {
  beforeEach(() => {
    diwaliState.on = false;
    vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false, isRestoring: false, setUser: vi.fn(), logout: vi.fn(), setAuth: vi.fn() } as never);
  });

  it("is the everyday logo once Diwali has ended", async () => {
    const header = await renderPhoneHeader();
    expect(header.querySelector('img[src*="/images/diwali/"]')).toBeNull();
    expect(header.querySelector('[aria-label="CauseKind"]')).not.toBeNull();
  });

  it("is the Diwali logo during Diwali", async () => {
    diwaliState.on = true;
    const header = await renderPhoneHeader();
    expect(header.querySelector('img[src="/images/diwali/blackcause.webp"]')).not.toBeNull();
    expect(header.querySelector('img[src="/images/diwali/whitecause.webp"]')).not.toBeNull();
  });
});
