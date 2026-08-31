import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import enMessages from "../../../messages/en.json";

/**
 * The corporate capture.
 *
 * <p>The assertion that matters is the <b>source string</b>. It is the contract
 * between this page and the server's MagnetCatalog: the page promises the office
 * pack, and the catalogue decides what actually gets sent by looking that string
 * up. If they stop matching, the page keeps working, the signup keeps succeeding,
 * and the thing someone gave their address for silently never arrives.
 *
 * <p>Nothing else about this page is worth pinning in a test — the copy is copy.
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

const { default: CorporateClient } = await import("./CorporateClient");

beforeEach(() => {
  subscribeMock.mockReset();
  subscribeMock.mockResolvedValue({ status: "CHECK_YOUR_EMAIL" });
});

async function submit() {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox"), "ops@company.com");
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button"));
}

describe("corporate capture", () => {
  it("posts the source the magnet catalogue is keyed on", async () => {
    render(<CorporateClient />);
    await submit();

    await waitFor(() => expect(subscribeMock).toHaveBeenCalledTimes(1));
    expect(subscribeMock.mock.calls[0][0]).toMatchObject({
      email: "ops@company.com",
      audience: "CORPORATE",
      // Must match MagnetCatalog.SOURCE_OFFICE_PACK on the server.
      source: "office-pack",
    });
  });

  it("stores the wording that was actually on screen", async () => {
    render(<CorporateClient />);
    await submit();

    await waitFor(() => expect(subscribeMock).toHaveBeenCalled());
    expect(subscribeMock.mock.calls[0][0].consentText).toBe(enMessages.corporate.form.consent);
  });

  it("cannot be submitted without ticking consent", async () => {
    render(<CorporateClient />);
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox"), "ops@company.com");
    await user.click(screen.getByRole("button"));

    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it("leads with the certificate, which is the whole reason this page converts", () => {
    render(<CorporateClient />);
    // Not styling: a generic "donate your old laptops" pitch is replaceable, and
    // verifiable proof of a specific handover is not. If this disappears, the
    // page has lost its argument.
    expect(screen.getByText(enMessages.corporate.points.certificate.body)).toBeInTheDocument();
  });

  it("makes no claim about tax treatment", () => {
    // It varies by entity, and being wrong about it to a finance team is worse
    // than staying quiet.
    const { container } = render(<CorporateClient />);
    expect(container.textContent?.toLowerCase()).not.toMatch(/tax|80g|deduct/);
  });
});
