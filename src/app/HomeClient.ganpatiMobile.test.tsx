import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import HomeClient from "./HomeClient";
import enMessages from "../../messages/en.json";
import * as isGanpatiActiveModule from "@/lib/isGanpatiActive";

/**
 * The mobile tree's two guest-only surfaces, under the festive skin.
 *
 * <p>The doors spine and the donee door's evidence exist only below `lg` — the
 * desktop tree renders `AudiencePathwaysSection` instead and never mounts
 * either. That is why they were the two surfaces still in plain terracotta and
 * teal after the rest of the page had been given a Ganeshotsav skin: nothing
 * that only appears on a phone shows up when the festival is checked on a
 * desktop, and `HomeClient.ganpati.test.tsx` asserts only on the shared
 * surfaces.
 *
 * <p>Both trees are in the DOM at once here — jsdom has no viewport and
 * `lg:hidden` is a stylesheet rule it never applies — so these tests assert on
 * markers unique to each mobile component rather than on what is visible.
 */

const authState = {
  user: null as { email: string; role: string } | null,
  isLoading: false,
};

// HeroSection pulls Anton from next/font/google, which has no jsdom
// implementation. Same stub the sibling Ganpati and hero tests use.
vi.mock("next/font/google", () => ({ Anton: () => ({ style: { fontFamily: "Anton" } }) }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

vi.mock("@/hooks/useNeedProfileGate", () => ({
  useNeedProfileGate: () => ({ requestAccess: async () => true, checking: false }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const resolve = (key: string) => {
      let node: unknown = enMessages;
      for (const segment of `${namespace}.${key}`.split(".")) {
        node = (node as Record<string, unknown>)?.[segment];
      }
      return node;
    };
    const t = (key: string) => {
      const node = resolve(key);
      return typeof node === "string" ? node : `${namespace}.${key}`;
    };
    t.rich = (key: string) => t(key);
    t.has = (key: string) => typeof resolve(key) === "string";
    return t;
  },
}));

function renderHome() {
  return render(
    <HomeClient
      initialCampaigns={[]}
      initialStats={null}
      initialActivity={[]}
      initialItemRequests={[]}
      initialPublicRequests={[]}
    />
  );
}

/**
 * The one accent that separates the festive donee surfaces from the plain ones:
 * temple maroon, one step below `GANPATI_CONFIG.colors.maroon`, in place of
 * teal.
 *
 * <p>It was banana-leaf green until the donee half was brought back onto the
 * theme's warm palette. Green stayed in the skin — there are 134 green values
 * in it — but every one of them is now foliage: toran leaves, garland
 * gradients, the rangoli strips. That is exactly why `LEAF_GREEN` made a bad
 * marker and this constant is asserted against *scoped* elements below rather
 * than against `container.innerHTML`: a page-wide search for #15803d used to
 * pass on a mango leaf whether or not the donee accent was there at all.
 */
const DONEE_MAROON = "#6b1717";
const LEAF_GREEN = "#15803d";

/**
 * Sindoor, carried by the two "Join as a donee" buttons and nothing else.
 *
 * <p>They are the only donee controls with a donor counterpart beside them, and
 * the section's maroon sits 21° of hue from the donor's saffron — close enough
 * that the pair read as one button in two shades. Sindoor puts 37° between
 * them. The rest of the donee stays `DONEE_MAROON`, which is why both constants
 * are asserted here rather than one: the split is deliberate, and a later
 * refactor that "tidies" the button back to the section colour would quietly
 * undo the thing this pair exists to fix.
 */
const DONEE_SINDOOR = "#9f1239";

describe("Ganpati mobile surfaces", () => {
  beforeEach(() => {
    authState.user = null;
    // The door choice is remembered in localStorage, so one test's pick would
    // otherwise decide the next test's starting door.
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dresses the mobile doors spine when the festival is on", () => {
    vi.spyOn(isGanpatiActiveModule, "isGanpatiActive").mockReturnValue(true);
    const { container } = renderHome();

    // The festive spine's own eyebrow — the plain build has no eyebrow at all.
    expect(screen.getByText("Two doors, one festival")).toBeDefined();

    // Both builds carry this heading; it proves the swap kept the copy.
    expect(screen.getByText("Which side of this are you on?")).toBeDefined();

    // The plain build's donee accent must be gone from the doors, and so must
    // the leaf green that briefly replaced it — no control on this spine is
    // green any more, only the foliage.
    const doors = container.querySelector("#ck-doors-heading")?.closest("section");
    expect(doors).toBeTruthy();
    expect(doors!.innerHTML).toContain(DONEE_MAROON);
    expect(doors!.innerHTML).not.toContain("border-teal-700");

    // Scoped to the controls, not to the section's whole markup, and the
    // distinction is the point rather than a detail. "Only the foliage" above
    // used to be true of this section by accident — there was none in it — so
    // searching all of its HTML for #15803d was the same question as searching
    // its buttons. A garland now hangs under the two doors, inside this
    // section, and every mango leaf on it is a #15803d gradient stop. Asserting
    // on innerHTML from here on would fail on the decoration while a genuinely
    // green *button* went on passing everywhere the garland was absent, which
    // is the same inversion the page-wide version of this check once had.
    const controls = doors!.querySelectorAll("a, button");
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      expect(control.className).not.toContain(LEAF_GREEN);
    }
  }, 15000);

  it("leaves the plain doors spine alone when the festival is off", () => {
    vi.spyOn(isGanpatiActiveModule, "isGanpatiActive").mockReturnValue(false);
    const { container } = renderHome();

    expect(screen.queryByText("Two doors, one festival")).toBeNull();
    expect(screen.getByText("Which side of this are you on?")).toBeDefined();

    const doors = container.querySelector("#ck-doors-heading")?.closest("section");
    expect(doors).toBeTruthy();
    expect(doors!.innerHTML).toContain("teal-700");
    expect(doors!.innerHTML).not.toContain(DONEE_MAROON);
  }, 15000);

  it("dresses the donee door's evidence once that door is picked", () => {
    vi.spyOn(isGanpatiActiveModule, "isGanpatiActive").mockReturnValue(true);
    const { container } = renderHome();

    // Donor is the default door, so the evidence is not mounted yet.
    expect(screen.queryByText("What happens after you post a need")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Switch" }));

    // Same lifecycle copy as the plain build — a festival does not change what
    // actually happens to a request.
    expect(screen.getByText("What happens after you post a need")).toBeDefined();
    expect(screen.getByText("A person checks it")).toBeDefined();

    // …dressed in the festive accent rather than teal.
    //
    // Asserted on the controls themselves, not on the page's HTML, and split in
    // two because the donee's colours are split in two.
    //
    // Every "Join as a donee" button — the door card's outlined one and the
    // desktop panel's filled one, since both trees are in this DOM — carries
    // sindoor, because each has a "Join as a donor" beside it to be told apart
    // from. Selected by accessible name rather than href: "Post a need" points
    // at the same route and deliberately does not follow them.
    const joinCtas = screen.getAllByRole("link", {
      name: enMessages.audiencePathways.donee.cta,
    });
    expect(joinCtas.length).toBeGreaterThanOrEqual(2);
    for (const cta of joinCtas) {
      expect(cta.className).toContain(DONEE_SINDOOR);
      expect(cta.className).not.toContain(LEAF_GREEN);
    }

    // "Post a need" has no donor counterpart next to it, so it keeps the
    // section's own maroon. If this ever starts matching the join buttons, the
    // reason above stopped being true and the split should go with it.
    //
    // Matched on href as well as name: the live board further down this column
    // offers the same words pointing at /login?next=/requests/new, so the name
    // alone is ambiguous.
    const postNeed = screen
      .getAllByRole("link", { name: enMessages.doneeDoor.cta })
      .find((a) => a.getAttribute("href") === "/register?role=DONEE");
    expect(postNeed).toBeTruthy();
    expect(postNeed!.className).toContain(DONEE_MAROON);
    expect(postNeed!.className).not.toContain(LEAF_GREEN);
  }, 15000);

  it("leans Bappa on the donor card, and only on the phone tree", () => {
    vi.spyOn(isGanpatiActiveModule, "isGanpatiActive").mockReturnValue(true);
    const { container } = renderHome();

    // One only. Both trees are in this DOM at once, and the desktop tree's
    // AudiencePathwaysSectionGanpati must never pick the clip up.
    const clips = container.querySelectorAll<HTMLVideoElement>('video[src*="bappa-peek"]');
    expect(clips.length).toBe(1);
    const clip = clips[0];

    // It is decoration over a CTA, so it must be unreadable and untappable.
    const niche = clip.closest('[aria-hidden="true"]') as HTMLElement | null;
    expect(niche).toBeTruthy();
    expect(niche!.className).toContain("pointer-events-none");

    // `screen` is what drops the clip's black ground away on both sides of the
    // seam. Without it the card wears a black rectangle.
    expect(clip.style.mixBlendMode).toBe("screen");

    // The clip carries an audio track, and a phone will not autoplay an unmuted
    // one at all — so this is both a courtesy and the thing that makes it run.
    expect(clip.muted).toBe(true);
    expect(clip.hasAttribute("loop")).toBe(true);
    expect(clip.hasAttribute("playsinline")).toBe(true);

    // A still of the same frame ships alongside it, hidden, as the
    // prefers-reduced-motion stand-in — and as the clip's poster, so a phone
    // that refuses to autoplay lands on the same picture rather than on a dark
    // rectangle. The swap is CSS, so jsdom can only be asked whether the pieces
    // are wired up; it never applies the media query.
    const still = niche!.querySelector<HTMLImageElement>('img[src*="bappa-peek-still"]');
    expect(still).toBeTruthy();
    expect(still!.className).toContain("ckm-bappa-still");
    expect(clip.getAttribute("poster")).toBe(still!.getAttribute("src"));
    expect(clip.getAttribute("preload")).toBe("none");

    // The alignment that makes the hands read as hands: the niche is the donor
    // card's immediately preceding sibling, so its base and the card's gold top
    // edge are the same line. Any wrapper or gap slipped between them drops the
    // fingers into mid-air.
    const card = niche!.nextElementSibling;
    expect(card).toBeTruthy();
    expect(card!.querySelector('a[data-tour="guest-join"]')).toBeTruthy();
  }, 15000);

  it("leaves Bappa off the plain doors spine", () => {
    vi.spyOn(isGanpatiActiveModule, "isGanpatiActive").mockReturnValue(false);
    const { container } = renderHome();

    expect(container.querySelector('video[src*="bappa-peek"]')).toBeNull();
  }, 15000);

  it("perches the mushak on the donee card, with no ground of his own", () => {
    vi.spyOn(isGanpatiActiveModule, "isGanpatiActive").mockReturnValue(true);
    const { container } = renderHome();

    // One only, for the same reason as Bappa: both trees are in this DOM at
    // once and the desktop one must never pick the clip up.
    const clips = container.querySelectorAll<HTMLVideoElement>('video[src*="mushak-peek"]');
    expect(clips.length).toBe(1);
    const clip = clips[0];

    // Decoration over a CTA, so it must be unreadable and untappable.
    const niche = clip.closest('[aria-hidden="true"]') as HTMLElement | null;
    expect(niche).toBeTruthy();
    expect(niche!.className).toContain("pointer-events-none");

    // The one line that separates him from Bappa, and the reason he can sit on
    // parchment at all: his clip carries real alpha (VP9/WebM), so he is
    // composited normally rather than screened out of a black matte. Screen
    // would need a dark ground under him — the niche Bappa gets — and this card
    // has none. If this ever starts asserting a blend mode, the asset was
    // swapped back to something without an alpha channel and the donee card is
    // about to wear a box.
    expect(clip.style.mixBlendMode).toBe("");
    expect(clip.getAttribute("src")).toMatch(/\.webm$/);

    // The clip must not autoplay with sound, and on a phone `muted` is also the
    // condition under which it plays at all.
    expect(clip.muted).toBe(true);
    expect(clip.hasAttribute("loop")).toBe(true);
    expect(clip.hasAttribute("playsinline")).toBe(true);
    expect(clip.getAttribute("preload")).toBe("none");

    // A still of the same frame ships alongside it, hidden, as the
    // prefers-reduced-motion stand-in — and as the clip's poster, so a browser
    // that refuses to autoplay, or decodes VP9 without alpha, lands on the same
    // picture. The swap is CSS, so jsdom can only be asked whether the pieces
    // are wired up; it never applies the media query.
    const still = niche!.querySelector<HTMLImageElement>('img[src*="mushak-peek-still"]');
    expect(still).toBeTruthy();
    expect(still!.className).toContain("ckm-mushak-still");
    expect(clip.getAttribute("poster")).toBe(still!.getAttribute("src"));

    // The alignment that makes the paws read as paws: the wrapper is the donee
    // card's immediately preceding sibling, so its base and the card's top edge
    // are the same line. The doors sit in a `gap-3.5` grid, so anything slipped
    // between them — or promoting the wrapper to a grid child of its own — puts
    // 14px of cream under him and he grips nothing.
    const card = niche!.nextElementSibling;
    expect(card).toBeTruthy();
    expect(card!.querySelector('a[href="/register?role=DONEE"]')).toBeTruthy();
  }, 15000);

  it("leaves the mushak off the plain doors spine", () => {
    vi.spyOn(isGanpatiActiveModule, "isGanpatiActive").mockReturnValue(false);
    const { container } = renderHome();

    expect(container.querySelector('video[src*="mushak-peek"]')).toBeNull();
  }, 15000);

  it("keeps the mobile column on one gutter by dropping the board's own", () => {
    vi.spyOn(isGanpatiActiveModule, "isGanpatiActive").mockReturnValue(true);
    const { container } = renderHome();

    // The festive board used to carry px-4 at every width, which put it on a
    // 36px gutter inside a column that already pads px-5 while every other
    // section sat on 20px. Below lg it must bring no horizontal padding.
    const board = container.querySelector('section[aria-label^="Verified community needs"]');
    expect(board).toBeTruthy();
    expect(board!.className).toContain("px-0");
    expect(board!.className).not.toMatch(/(^|\s)px-4(\s|$)/);
    expect(board!.className).not.toMatch(/(^|\s)sm:px-6(\s|$)/);
    // The desktop tree still gets its own gutter and ground at lg and above.
    expect(board!.className).toContain("lg:px-8");
  }, 15000);
});
