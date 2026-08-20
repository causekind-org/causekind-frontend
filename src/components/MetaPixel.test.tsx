import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MetaPixel from "./MetaPixel";
import { CONSENT_KEY, writeConsent } from "@/lib/cookieConsent";

// next/navigation and next/script have no App Router context under jsdom.
// Script renders its payload into a plain <script> so the assertions below can
// look for the pixel the way a browser would actually receive it.
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/script", () => ({
  default: ({ id, dangerouslySetInnerHTML }: {
    id?: string;
    dangerouslySetInnerHTML?: { __html: string };
  }) => (
    <script data-testid={id} dangerouslySetInnerHTML={dangerouslySetInnerHTML} />
  ),
}));

const pixel = () => screen.queryByTestId("fb-pixel");

/**
 * The regression guard for the consent bug.
 *
 * `CookieConsent` recorded the visitor's answer and `MetaPixel` never read it, so
 * Decline stored a preference and the Facebook pixel initialised anyway. These
 * tests assert the absence of a script tag, which is the only thing that
 * distinguishes "we honoured the decline" from "we stored it and ignored it".
 */
describe("MetaPixel consent gate", () => {
  beforeEach(() => localStorage.clear());

  it("does not load the pixel before the visitor has answered", async () => {
    render(<MetaPixel />);
    // Wait a tick: consent resolves in an effect, so "still absent afterwards"
    // is the real claim, not "absent on the very first frame".
    await waitFor(() => expect(pixel()).not.toBeInTheDocument());
  });

  it("does not load the pixel after a decline", async () => {
    writeConsent("declined");
    render(<MetaPixel />);
    await waitFor(() => expect(pixel()).not.toBeInTheDocument());
  });

  it("loads the pixel after an accept", async () => {
    writeConsent("accepted");
    render(<MetaPixel />);
    await waitFor(() => expect(pixel()).toBeInTheDocument());
    expect(pixel()?.innerHTML).toContain("fbq(");
  });

  it("does not load the pixel for an unreadable stored answer", async () => {
    localStorage.setItem(CONSENT_KEY, '{"consent":"yes"}');
    render(<MetaPixel />);
    await waitFor(() => expect(pixel()).not.toBeInTheDocument());
  });

  it("starts tracking as soon as the visitor accepts, without a reload", async () => {
    render(<MetaPixel />);
    await waitFor(() => expect(pixel()).not.toBeInTheDocument());

    // What clicking Accept on the banner does. Wrapped because the resulting
    // event synchronously re-renders every subscriber.
    act(() => writeConsent("accepted"));

    await waitFor(() => expect(pixel()).toBeInTheDocument());
  });
});
