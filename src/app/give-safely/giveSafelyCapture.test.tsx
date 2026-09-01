import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import enMessages from "../../../messages/en.json";

/**
 * The donor magnet's capture.
 *
 * <p>The assertion that matters is the <b>source string</b>. It is the contract
 * with the server's MagnetCatalog: this page promises the checklist, and the
 * catalogue decides what actually gets sent by looking that string up. If they
 * stop matching, the page still works, the signup still succeeds, and the thing
 * someone gave their address for silently never arrives.
 */

const subscribeMock = vi.fn();

vi.mock("@/lib/api", () => ({
  subscribe: (...args: unknown[]) => subscribeMock(...args),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: (namespace: string) => {
    const t = (key: string) => {
      let node: unknown = enMessages;
      for (const part of `${namespace}.${key}`.split(".")) {
        node = (node as Record<string, unknown>)?.[part];
      }
      return typeof node === "string" ? node : key;
    };
    return t;
  },
}));

const { default: GiveSafelyClient } = await import("./GiveSafelyClient");

beforeEach(() => {
  subscribeMock.mockReset();
  subscribeMock.mockResolvedValue({ status: "CHECK_YOUR_EMAIL" });
});

async function submit() {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox"), "someone@example.com");
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button"));
}

describe("give-safely capture", () => {
  it("posts the source the magnet catalogue is keyed on", async () => {
    render(<GiveSafelyClient />);
    await submit();

    await waitFor(() => expect(subscribeMock).toHaveBeenCalledTimes(1));
    expect(subscribeMock.mock.calls[0][0]).toMatchObject({
      email: "someone@example.com",
      audience: "DONOR",
      // Must match MagnetCatalog.SOURCE_NGO_CHECKLIST on the server.
      source: "ngo-checklist",
    });
  });

  it("stores the wording that was actually on screen", async () => {
    render(<GiveSafelyClient />);
    await submit();

    await waitFor(() => expect(subscribeMock).toHaveBeenCalled());
    expect(subscribeMock.mock.calls[0][0].consentText).toBe(enMessages.giveSafely.form.consent);
  });

  it("cannot be submitted without ticking consent", async () => {
    render(<GiveSafelyClient />);
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox"), "someone@example.com");
    await user.click(screen.getByRole("button"));

    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it("is useful before it asks for anything", () => {
    render(<GiveSafelyClient />);
    // The checks are on the page, not withheld behind the form. A page that only
    // says "give us your email for a checklist" is asking for trust it has not
    // shown, and this is the thing most likely to be quietly removed later to
    // "improve conversion".
    for (const key of ["registration", "destination", "proof", "urgency"] as const) {
      expect(screen.getByText(enMessages.giveSafely.points[key].body)).toBeInTheDocument();
    }
  });

  it("lets someone give without subscribing at all", () => {
    render(<GiveSafelyClient />);
    // Someone who came to check a charity may simply want to give now. Routing
    // that through the form would make the checklist a toll gate.
    const link = screen.getByRole("link", { name: enMessages.giveSafely.browse.link });
    expect(link).toHaveAttribute("href", "/requests");
  });
});
