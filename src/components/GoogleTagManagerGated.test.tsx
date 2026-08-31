import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import GoogleTagManagerGated from "./GoogleTagManagerGated";
import { CONSENT_KEY, writeConsent } from "@/lib/cookieConsent";

/**
 * Stubbed at the package boundary rather than at `next/script`.
 *
 * `@next/third-parties` is CJS and `require`s `next/script` internally, so a
 * `next/script` mock never reaches it — the real one runs and injects the tag
 * into `document.body` outside React's container, where it is awkward to assert
 * on and coupled to Next's private script ids. The container mounting at all is
 * the whole claim of this file, so that is what the stub reports.
 */
vi.mock("@next/third-parties/google", () => ({
  GoogleTagManager: ({ gtmId }: { gtmId: string }) => (
    <div data-testid="gtm-container" data-gtm-id={gtmId} />
  ),
}));

const container = () => screen.queryByTestId("gtm-container");

/**
 * The same regression guard `MetaPixel.test.tsx` applies, for the tracker that
 * did not have one.
 *
 * GTM was mounted unconditionally in `layout.tsx` while the pixel beside it was
 * deny-by-default, so a visitor who declined still loaded a container — and a
 * container is a loader for tags that do not exist yet, any of which may be
 * Custom HTML running arbitrary JavaScript. Asserting that nothing mounts is
 * what distinguishes "we honoured the decline" from "we stored it and loaded
 * anyway".
 */
describe("GoogleTagManagerGated consent gate", () => {
  beforeEach(() => localStorage.clear());

  it("does not load the container before the visitor has answered", async () => {
    render(<GoogleTagManagerGated />);
    // Wait a tick: consent resolves in an effect, so "still absent afterwards"
    // is the real claim, not "absent on the very first frame".
    await waitFor(() => expect(container()).not.toBeInTheDocument());
  });

  it("does not load the container after a decline", async () => {
    writeConsent("declined");
    render(<GoogleTagManagerGated />);
    await waitFor(() => expect(container()).not.toBeInTheDocument());
  });

  it("does not load the container for an unreadable stored answer", async () => {
    localStorage.setItem(CONSENT_KEY, '{"consent":"yes"}');
    render(<GoogleTagManagerGated />);
    await waitFor(() => expect(container()).not.toBeInTheDocument());
  });

  it("loads the container after an accept, with a real container id", async () => {
    writeConsent("accepted");
    render(<GoogleTagManagerGated />);
    await waitFor(() => expect(container()).toBeInTheDocument());
    // Guards the env fallback too: a missing NEXT_PUBLIC_GTM_ID must still
    // resolve to a syntactically real container, never "" or undefined.
    expect(container()?.getAttribute("data-gtm-id")).toMatch(/^GTM-\w+$/);
  });

  it("starts loading as soon as the visitor accepts, without a reload", async () => {
    render(<GoogleTagManagerGated />);
    await waitFor(() => expect(container()).not.toBeInTheDocument());

    // What clicking Accept on the banner does. Wrapped because the resulting
    // event synchronously re-renders every subscriber.
    act(() => writeConsent("accepted"));

    await waitFor(() => expect(container()).toBeInTheDocument());
  });
});
