import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import enMessages from "../../messages/en.json";

/**
 * The donor/donee signup pathways are guest-only.
 *
 * <p>The bug this guards: `HomeClient` rendered `AudiencePathwaysSection`
 * unconditionally, so a signed-in donor was shown "Join as a donor" on the home
 * page. It also has to hold in two places at once — the page keeps a
 * `hidden lg:block` tree and an `lg:hidden` tree, and a component placed in one
 * is simply absent from the other, so fixing one occurrence leaves the other
 * broken on the layout nobody happened to be testing in.
 *
 * <p><b>Rendered rather than source-scanned.</b> `HomeClient` pulls in a dozen
 * sibling sections, next-intl, and two API calls, so the sibling sections are
 * stubbed — but the component under test is the real
 * `AudiencePathwaysSection`, and `useTranslations` resolves against the real
 * `messages/en.json`. The assertions are therefore on copy a visitor actually
 * reads, not on an identifier a stub happened to carry.
 *
 * <p>The loading case is the one worth keeping. `useAuth` begins at
 * `{ user: null, isLoading: true }` and only then restores the session, so a
 * `!user` check passes during hydration and flashes guest signup CTAs at
 * someone who is already signed in.
 */

// ── Auth, the thing actually under test ──────────────────────────────────────

const authState = {
  user: null as { email: string; role: string } | null,
  isLoading: true,
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

// ── next-intl, resolved against the real message catalogue ───────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const t = (key: string) => {
      const path = `${namespace}.${key}`.split(".");
      let node: unknown = enMessages;
      for (const segment of path) {
        node = (node as Record<string, unknown>)?.[segment];
      }
      return typeof node === "string" ? node : path.join(".");
    };
    t.rich = (key: string) => t(key);
    return t;
  },
}));

vi.mock("@/hooks/useDynamicTranslation", () => ({
  useDynamicTranslation: (value: string | null) => value,
  TranslatedText: ({ text }: { text?: string }) => <>{text ?? ""}</>,
}));

// ── The landing page's other sections ────────────────────────────────────────
// Stubbed because they are siblings of the subject, not the subject. Each one
// would otherwise drag in carousels, WebGL and its own data.

vi.mock("@/lib/api", () => ({
  getMyProfile: vi.fn().mockResolvedValue(null),
  getItemRequests: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/components/Reveal", () => ({
  Reveal: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/CampaignCarousel", () => ({ LatestActiveCampaignsSection: () => null }));
vi.mock("@/components/BeTheChangeSection", () => ({ BeTheChangeSection: () => null }));
vi.mock("@/components/home/DoneeRequestsSection", () => ({ DoneeRequestsSection: () => null }));
vi.mock("@/components/ComingSoonMagnets", () => ({ ComingSoonMagnets: () => null }));
vi.mock("@/components/IndependenceDayStrip", () => ({ IndependenceDayStrip: () => null }));
vi.mock("@/components/home/HeroSection", () => ({ HeroSection: () => null }));
vi.mock("@/components/home/StatsBars", () => ({
  DesktopStatsBar: () => null,
  LiveTicker: () => null,
}));
vi.mock("@/components/home/WhatWeProvideSection", () => ({ WhatWeProvideSection: () => null }));
vi.mock("@/components/home/CTASection", () => ({ CTASection: () => null }));
// WebGL: `ogl` touches window on import and the section loads it through
// next/dynamic with ssr:false. Nothing here depends on what it draws.
vi.mock("@/components/LightRays", () => ({ default: () => null }));

import HomeClient from "./HomeClient";

/**
 * Renders and lets the page's own effects settle.
 *
 * <p>The signed-in branch fetches the profile on mount, so its `setState`
 * lands a microtask after `render` returns. Without the flush every
 * authenticated case logs an act(...) warning — noise that would sit in the
 * suite output forever and train everyone to ignore the next real one.
 */
async function renderHome() {
  const result = render(
    <HomeClient
      initialCampaigns={[]}
      initialStats={null}
      initialActivity={[]}
      initialItemRequests={[]}
    />,
  );
  await act(async () => {});
  return result;
}

const donorCtas = () => screen.queryAllByText(/join as a donor/i);
const doneeCtas = () => screen.queryAllByText(/join as a donee/i);
const guestJoinAnchors = () => document.querySelectorAll('[data-tour="guest-join"]');
const headings = () => screen.queryAllByText(/whichever side you're on/i);

beforeEach(() => {
  authState.user = null;
  authState.isLoading = true;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("while auth is still resolving", () => {
  it("renders no guest signup pathway at all", async () => {
    authState.isLoading = true;
    authState.user = null;

    await renderHome();

    // Fails closed. `user` is null here too, so a `!user` check would pass and
    // show a signed-in visitor "Join as a donor" for the length of hydration.
    expect(headings()).toHaveLength(0);
    expect(donorCtas()).toHaveLength(0);
    expect(doneeCtas()).toHaveLength(0);
    expect(guestJoinAnchors()).toHaveLength(0);
  });
});

describe("a guest, once auth has resolved", () => {
  beforeEach(() => {
    authState.isLoading = false;
    authState.user = null;
  });

  it("sees both pathways", async () => {
    await renderHome();

    expect(headings().length).toBeGreaterThan(0);
    expect(donorCtas().length).toBeGreaterThan(0);
    expect(doneeCtas().length).toBeGreaterThan(0);
  });

  it("gets the section in both responsive trees", async () => {
    await renderHome();

    // One copy per tree. The desktop tree is `hidden lg:block` and the mobile
    // one `lg:hidden`, so both exist in the DOM at every viewport and CSS picks
    // — which is exactly why gating only one of them leaves the bug alive.
    expect(headings()).toHaveLength(2);
  });

  it("puts the guest tour anchor on the mobile instance only", async () => {
    await renderHome();

    // `document.querySelector` returns the first match, and the desktop copy
    // reports a zero rect while hidden — two anchors would collapse the tour
    // spotlight onto the invisible one.
    expect(guestJoinAnchors()).toHaveLength(1);
  });
});

describe("an authenticated user", () => {
  const roles = ["DONOR", "DONEE", "ADMIN", "SUPER_ADMIN", "ROLE_DONOR"];

  for (const role of roles) {
    it(`sees no guest signup pathway as ${role}`, async () => {
      authState.isLoading = false;
      authState.user = { email: "someone@example.invalid", role };

      await renderHome();

      expect(headings()).toHaveLength(0);
      expect(donorCtas()).toHaveLength(0);
      expect(doneeCtas()).toHaveLength(0);
      expect(guestJoinAnchors()).toHaveLength(0);
    });
  }

  it("hides it for a role nobody has thought of yet", async () => {
    // The condition is "authenticated at all", not a list of role strings —
    // roles circulate both bare and `ROLE_`-prefixed, and a per-role check
    // would start leaking signup CTAs the day a new one is added.
    authState.isLoading = false;
    authState.user = { email: "someone@example.invalid", role: "PARTNER_LIAISON" };

    await renderHome();

    expect(headings()).toHaveLength(0);
    expect(donorCtas()).toHaveLength(0);
  });

  it("removes it from the DOM rather than hiding it visually", async () => {
    authState.isLoading = false;
    authState.user = { email: "someone@example.invalid", role: "DONOR" };

    const { container } = await renderHome();

    // A CSS/aria-hidden approach would leave the CTAs reachable by anything
    // that reads the DOM directly — including the tour's querySelector.
    expect(container.textContent).not.toMatch(/join as a donor/i);
    expect(container.querySelector('[data-tour="guest-join"]')).toBeNull();
  });
});
