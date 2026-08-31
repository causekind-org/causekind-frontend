import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import enMessages from "../../../messages/en.json";

/**
 * The blog mailing-list signup.
 *
 * <p>This exists because of the specific way the form used to be broken: the
 * markup was all there — an email input, a Subscribe button — with no state and
 * no handler. It looked completely functional and discarded every address typed
 * into it. Nothing failed, nothing logged, and nobody could have noticed from
 * the outside.
 *
 * <p>So the first assertion here is simply that pressing the button causes a
 * request. The rest guard the consent and disclosure rules around it.
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

// Imported after the mocks so the component picks them up.
const { NewsletterSignup } = await import("./BlogIndexClient");

const CONSENT = enMessages.blog_page.newsletterConsent;

beforeEach(() => {
  subscribeMock.mockReset();
  subscribeMock.mockResolvedValue({ status: "CHECK_YOUR_EMAIL" });
});

describe("newsletter signup", () => {
  it("actually submits — the defect it was written for", async () => {
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByRole("textbox"), "a@b.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(subscribeMock).toHaveBeenCalledTimes(1));
    expect(subscribeMock.mock.calls[0][0]).toMatchObject({
      email: "a@b.com",
      audience: "DONOR",
      source: "blog-index",
      locale: "en",
    });
  });

  it("sends the exact consent wording that was on screen", async () => {
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByRole("textbox"), "a@b.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button"));

    // Stored server-side as evidence. A boolean cannot answer "what did this
    // person agree to?" once the copy has been rewritten.
    await waitFor(() => expect(subscribeMock).toHaveBeenCalled());
    expect(subscribeMock.mock.calls[0][0].consentText).toBe(CONSENT);
  });

  it("cannot be submitted without ticking consent", async () => {
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByRole("textbox"), "a@b.com");
    await user.click(screen.getByRole("button"));

    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it("starts with consent unticked", () => {
    render(<NewsletterSignup />);
    // A pre-ticked box is not consent, and the privacy policy promises consent.
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("says to check email, and never whether the address was already known", async () => {
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByRole("textbox"), "a@b.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button"));

    // The endpoint deliberately refuses to distinguish a new address from one
    // already subscribed, so the UI must not appear to either.
    const done = await screen.findByText(enMessages.blog_page.newsletterCheckEmail);
    expect(done).toBeInTheDocument();
    expect(screen.queryByText(/already/i)).not.toBeInTheDocument();
  });

  it("surfaces a failure instead of pretending it worked", async () => {
    subscribeMock.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByRole("textbox"), "a@b.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button"));

    expect(await screen.findByText(enMessages.blog_page.newsletterError)).toBeInTheDocument();
  });
});
