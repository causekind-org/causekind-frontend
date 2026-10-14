import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Footer, getSupportLinks, FOOTER_LEGAL_LINKS } from "./Footer";
import { useAuth } from "@/hooks/useAuth";
import { DONATE_HREF } from "@/lib/donateScroll";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/components/Navbar", () => ({
  CareNestLogo: () => <div data-testid="carenest-logo">CauseKind</div>,
}));

vi.mock("@/components/LandingTranslation", () => ({
  LandingText: ({ children }: any) => <>{children}</>,
  LandingAttributes: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

// Mock FEATURES to false (production default) to test the Coming Soon state
vi.mock("@/lib/features", () => ({
  FEATURES: {
    ngoRegistration: false,
    money: false,
    bottomBlur: false,
    cinematicLanding: true,
  },
}));

describe("Footer Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
  });

  describe("getSupportLinks helper", () => {
    it("returns guest links with non-clickable Coming Soon for unauthenticated visitor when NGO signup is not live", () => {
      const links = getSupportLinks(null);
      const labels = links.map((l) => l.label);
      expect(labels).toEqual([
        "Create an account",
        "My dashboard",
        "Register your NGO · Coming soon",
        "Safety guidelines",
        "Help & FAQ",
        "Read our Blog",
      ]);
      expect(links[0].href).toBe("/register");
      expect(links[1].href).toBe("/login");
      expect(links[2].href).toBe("");
      expect(links[2].disabled).toBe(true);
    });

    it("returns donor links with 'In-kind requests' at the top", () => {
      const links = getSupportLinks("DONOR");
      expect(links[0]).toEqual({ href: "/requests", label: "In-kind requests" });
      expect(links.map((l) => l.label)).toEqual([
        "In-kind requests",
        "My dashboard",
        "Safety guidelines",
        "Help & FAQ",
        "Read our Blog",
      ]);
      expect(links[1].href).toBe("/dashboard");
    });

    it("returns donee links identical to donor links", () => {
      const links = getSupportLinks("DONEE");
      expect(links[0]).toEqual({ href: "/requests", label: "In-kind requests" });
      expect(links.map((l) => l.label)).toEqual([
        "In-kind requests",
        "My dashboard",
        "Safety guidelines",
        "Help & FAQ",
        "Read our Blog",
      ]);
      expect(links[1].href).toBe("/dashboard");
    });
  });

  describe("Guest (not logged in)", () => {
    it("renders the 4 columns and non-clickable NGO Coming soon text", () => {
      render(<Footer role={null} />);

      // Column 1: Tagline & Brand
      expect(
        screen.getByText(/India's verified giving platform connecting donors directly with verified recipients/i)
      ).toBeInTheDocument();

      // Column 2: Get Support
      expect(screen.getByText("Get Support")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
      expect(screen.getByRole("link", { name: "My dashboard" })).toHaveAttribute("href", "/login");

      // "Register your NGO · Coming soon" must be plain non-clickable text (not a link)
      const ngoComingSoon = screen.getByText("Register your NGO · Coming soon");
      expect(ngoComingSoon).toBeInTheDocument();
      expect(ngoComingSoon.closest("a")).toBeNull();
      const disabledSpan = ngoComingSoon.closest("span")!;
      expect(disabledSpan).toHaveAttribute("aria-disabled", "true");
      expect(disabledSpan).toHaveAttribute("tabindex", "-1");
      expect(disabledSpan).toHaveClass("text-[#A8957F]");
      expect(disabledSpan).toHaveClass("cursor-not-allowed");

      expect(screen.getByRole("link", { name: "Safety guidelines" })).toHaveAttribute("href", "/give-safely");
      expect(screen.getByRole("link", { name: "Help & FAQ" })).toHaveAttribute("href", "/faq");
      expect(screen.getByRole("link", { name: "Read our Blog" })).toHaveAttribute("href", "/blog");

      // Donate button in brand column for Guest
      const donateButton = screen.getByRole("link", { name: "Donate" });
      expect(donateButton).toBeInTheDocument();
      expect(donateButton).toHaveAttribute("href", DONATE_HREF);
      expect(donateButton).toHaveAttribute("data-donate-cta", "sm");

      // Verify removals: No "Invite a friend", No "WhatsApp Support" text link, No "Give Back" column
      expect(screen.queryByText(/Invite a friend/i)).toBeNull();
      expect(screen.queryByText(/WhatsApp Support/i)).toBeNull();
      expect(screen.queryByText(/Give Back/i)).toBeNull();
      expect(screen.queryByText(/In-kind requests/i)).toBeNull();
    });
  });

  describe("Logged-in Donor", () => {
    it("renders 'In-kind requests' at the top of Get Support and points My dashboard to /dashboard", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 101, email: "donor@causekind.com", role: "DONOR" } as never,
        isLoading: false,
        isRestoring: false,
        setUser: vi.fn(),
        logout: vi.fn(),
        setAuth: vi.fn(),
      });

      render(<Footer />);

      const supportColumn = screen.getByText("Get Support").parentElement!;
      const links = within(supportColumn).getAllByRole("link");

      expect(links[0]).toHaveTextContent("In-kind requests");
      expect(links[0]).toHaveAttribute("href", "/requests");
      expect(links[1]).toHaveTextContent("My dashboard");
      expect(links[1]).toHaveAttribute("href", "/dashboard");

      // Donate button is visible for Donor
      const donateButton = screen.getByRole("link", { name: "Donate" });
      expect(donateButton).toBeInTheDocument();
      expect(donateButton).toHaveAttribute("href", DONATE_HREF);
      expect(donateButton).toHaveAttribute("data-donate-cta", "sm");

      // No guest-only links
      expect(screen.queryByText("Create an account")).toBeNull();
      expect(screen.queryByText(/Register your NGO/i)).toBeNull();
      // No removed links
      expect(screen.queryByText(/Invite a friend/i)).toBeNull();
      expect(screen.queryByText(/Give Back/i)).toBeNull();
    });
  });

  describe("Logged-in Donee", () => {
    it("renders identical Get Support structure as donor", () => {
      render(<Footer role="DONEE" />);

      const supportColumn = screen.getByText("Get Support").parentElement!;
      const links = within(supportColumn).getAllByRole("link");

      expect(links[0]).toHaveTextContent("In-kind requests");
      expect(links[0]).toHaveAttribute("href", "/requests");
      expect(links[1]).toHaveTextContent("My dashboard");
      expect(links[1]).toHaveAttribute("href", "/dashboard");

      // Donate button must NOT be rendered for Donee
      expect(screen.queryByRole("link", { name: "Donate" })).toBeNull();

      expect(screen.queryByText("Create an account")).toBeNull();
      expect(screen.queryByText(/Invite a friend/i)).toBeNull();
      expect(screen.queryByText(/Give Back/i)).toBeNull();
    });
  });

  describe("Donate button", () => {
    it("renders in the brand column between tagline and social icon grid for Guest and Donor", () => {
      const { container } = render(<Footer role={null} />);
      const brandColumn = container.querySelector(".col-span-2.md\\:col-span-1")!;
      const donateLink = within(brandColumn as HTMLElement).getByRole("link", { name: "Donate" });

      expect(donateLink).toBeInTheDocument();
      expect(donateLink).toHaveAttribute("href", DONATE_HREF);
      expect(donateLink).toHaveAttribute("data-donate-cta", "sm");

      // Verify brand column centering on mobile and left-align on desktop
      expect(brandColumn).toHaveClass("flex");
      expect(brandColumn).toHaveClass("flex-col");
      expect(brandColumn).toHaveClass("items-center");
      expect(brandColumn).toHaveClass("text-center");
      expect(brandColumn).toHaveClass("md:items-start");
      expect(brandColumn).toHaveClass("md:text-left");

      // Verify placement order in brand column: Logo -> Tagline -> Donate Button -> Social Icons
      const tagline = within(brandColumn as HTMLElement).getByText(/India's verified giving platform/i);
      expect(tagline).toHaveClass("max-w-xs");
      expect(tagline).toHaveClass("mx-auto");
      expect(tagline).toHaveClass("md:mx-0");

      const socialGrid = within(brandColumn as HTMLElement).getByLabelText("Social media links");

      expect(tagline.compareDocumentPosition(donateLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(donateLink.compareDocumentPosition(socialGrid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("has the Warm Sand copper styling classes, hover, focus ring, and heart icon", () => {
      render(<Footer role={null} />);
      const donateLink = screen.getByRole("link", { name: "Donate" });

      expect(donateLink).toHaveClass("rounded-full");
      expect(donateLink).toHaveClass("font-semibold");
      expect(donateLink).toHaveClass("w-fit");
      expect(donateLink.className).toContain("!bg-[#B4541A]");
      expect(donateLink.className).toContain("hover:!bg-[#9A4616]");
      expect(donateLink.className).toContain("!text-white");
      expect(donateLink.className).toContain("focus-visible:!ring-[#B4541A]");

      // Contains decorative heart icon svg
      const heartIcon = donateLink.querySelector(".ck-donate-heart svg");
      expect(heartIcon).toBeInTheDocument();
    });

    it("triggers the exact same route and data-donate-cta as Navbar", () => {
      render(<Footer role="DONOR" />);
      const donateLink = screen.getByRole("link", { name: "Donate" });
      expect(donateLink).toHaveAttribute("href", DONATE_HREF);
      expect(donateLink).toHaveAttribute("data-donate-cta", "sm");
    });

    it("is not rendered when user role is DONEE", () => {
      render(<Footer role="DONEE" />);
      expect(screen.queryByRole("link", { name: "Donate" })).toBeNull();
    });

    it("maintains consistent layout classes at mobile (360px, 390px, 414px), tablet (768px), and desktop (1280px) across all three login states", () => {
      const states = [
        { role: null, expectDonate: true, desc: "Guest" },
        { role: "DONOR", expectDonate: true, desc: "Donor" },
        { role: "DONEE", expectDonate: false, desc: "Donee" },
      ];

      states.forEach(({ role, expectDonate }) => {
        const { container, unmount } = render(<Footer role={role} />);

        // Brand Column: Centered on mobile (<768px), left-aligned on desktop (>=768px)
        const brandCol = container.querySelector(".col-span-2.md\\:col-span-1")!;
        expect(brandCol).toBeInTheDocument();
        expect(brandCol).toHaveClass("flex", "flex-col", "items-center", "text-center", "md:items-start", "md:text-left");

        // Tagline: max-w-xs mx-auto on mobile for neat wrapping, md:mx-0 on desktop
        const tagline = within(brandCol as HTMLElement).getByText(/India's verified giving platform/i);
        expect(tagline).toHaveClass("max-w-xs", "mx-auto", "md:mx-0");

        // Donate Button visibility per login state
        const donateButton = within(brandCol as HTMLElement).queryByRole("link", { name: "Donate" });
        if (expectDonate) {
          expect(donateButton).toBeInTheDocument();
          expect(donateButton).toHaveClass("w-fit");
        } else {
          expect(donateButton).toBeNull();
        }

        // Social Icons: One-line flex-nowrap row (w-9 h-9) on mobile; 3x2 grid (md:w-10 md:h-10) on desktop
        const socialGrid = within(brandCol as HTMLElement).getByLabelText("Social media links");
        expect(socialGrid).toHaveClass("flex", "flex-nowrap", "justify-center", "gap-2", "md:grid", "md:grid-cols-3", "md:gap-3", "md:w-fit");

        // Contact Column: Centered on mobile with 20px gap (space-y-5) and 44px tap targets; left-aligned on desktop
        const contactHeading = screen.getByText("Contact");
        expect(contactHeading).toHaveClass("text-center", "md:text-left");

        const phoneLink = screen.getByRole("link", { name: "+91 7719938619" });
        expect(phoneLink).toHaveClass("min-h-[44px]", "md:min-h-0");

        const emailLink = screen.getByRole("link", { name: "support@causekind.com" });
        expect(emailLink).toHaveClass("min-h-[44px]", "md:min-h-0");

        unmount();
      });
    });
  });

  describe("Our Trust Promise column", () => {
    it("renders all three promise items with uniform copper #B4541A dots and no teal or blue dots", () => {
      render(<Footer />);
      expect(screen.getByText("Our Trust Promise")).toBeInTheDocument();
      expect(screen.getByText("Admin-verified listings")).toBeInTheDocument();
      expect(screen.getByText("OTP-confirmed handovers")).toBeInTheDocument();
      expect(screen.getByText("Verified delivery certificates")).toBeInTheDocument();

      const promiseColumn = screen.getByText("Our Trust Promise").parentElement!;
      const dots = promiseColumn.querySelectorAll("span.rounded-full");
      expect(dots).toHaveLength(3);
      dots.forEach((dot) => {
        expect(dot).toHaveClass("bg-[#B4541A]");
        expect(dot).not.toHaveClass("bg-[#0F7A6C]");
        expect(dot).not.toHaveClass("bg-[#4a7fba]");
      });
    });
  });

  describe("Contact column", () => {
    it("renders address, phone link, and email link with proper hrefs, centering on mobile and left-aligned on desktop", () => {
      render(<Footer />);
      const heading = screen.getByText("Contact");
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass("text-center");
      expect(heading).toHaveClass("md:text-left");

      const address = screen.getByText(/3rd Floor, Apoorva Bldg/i);
      expect(address).toBeInTheDocument();
      expect(address).toHaveClass("max-w-xs");
      expect(address).toHaveClass("mx-auto");
      expect(address).toHaveClass("md:mx-0");
      expect(screen.getByText(/Vasai West, Vasai-Virar, Maharashtra 401202/i)).toBeInTheDocument();

      const phoneLink = screen.getByRole("link", { name: "+91 7719938619" });
      expect(phoneLink).toHaveAttribute("href", "tel:+917719938619");
      expect(phoneLink).toHaveClass("min-h-[44px]");
      expect(phoneLink).toHaveClass("md:min-h-0");

      const emailLink = screen.getByRole("link", { name: "support@causekind.com" });
      expect(emailLink).toHaveAttribute("href", "mailto:support@causekind.com");
      expect(emailLink).toHaveClass("min-h-[44px]");
      expect(emailLink).toHaveClass("md:min-h-0");
    });
  });

  describe("Social Icons", () => {
    it("renders single row on mobile and 3-column grid on desktop with exactly 6 platforms", () => {
      render(<Footer />);

      const socialContainer = screen.getByLabelText("Social media links");
      // Mobile: single line flex-nowrap row with 8px gap
      expect(socialContainer).toHaveClass("flex");
      expect(socialContainer).toHaveClass("flex-nowrap");
      expect(socialContainer).toHaveClass("justify-center");
      expect(socialContainer).toHaveClass("gap-2");
      // Desktop: 3-column grid
      expect(socialContainer).toHaveClass("md:grid");
      expect(socialContainer).toHaveClass("md:grid-cols-3");
      expect(socialContainer).toHaveClass("md:gap-3");
      expect(socialContainer).toHaveClass("md:w-fit");

      const socialLinks = within(socialContainer).getAllByRole("link");
      expect(socialLinks).toHaveLength(6);

      // Verify button sizes: 36px (w-9 h-9) on mobile, 40px (md:w-10 md:h-10) on desktop
      socialLinks.forEach((link) => {
        expect(link).toHaveClass("w-9");
        expect(link).toHaveClass("h-9");
        expect(link).toHaveClass("md:w-10");
        expect(link).toHaveClass("md:h-10");
      });

      const expected = [
        // Row 1
        { label: "CauseKind on Instagram", href: "https://instagram.com/causekind" },
        { label: "CauseKind on LinkedIn", href: "https://www.linkedin.com/company/causekind/" },
        { label: "CauseKind on YouTube", href: "https://www.youtube.com/@causekind_org" },
        // Row 2
        { label: "CauseKind on WhatsApp", href: "https://api.whatsapp.com/send/?phone=917719938619" },
        { label: "CauseKind on Facebook", href: "https://www.facebook.com/people/CauseKind/61590465683967/" },
        { label: "CauseKind on X", href: "https://x.com/causekind_" },
      ];

      expected.forEach((item, index) => {
        expect(socialLinks[index]).toHaveAttribute("aria-label", item.label);
        expect(socialLinks[index]).toHaveAttribute("href", item.href);
        expect(socialLinks[index]).toHaveAttribute("target", "_blank");
        expect(socialLinks[index]).toHaveAttribute("rel", "noopener noreferrer");
      });
    });
  });

  describe("Bottom Bar & Legal Links", () => {
    it("renders copyright with CauseKind branding and all 7 legal links", () => {
      render(<Footer />);

      expect(screen.getByText(/Made with care in India/i)).toBeInTheDocument();
      expect(screen.getByText("Cause")).toBeInTheDocument();
      expect(screen.getByText("Kind")).toBeInTheDocument();

      FOOTER_LEGAL_LINKS.forEach((item) => {
        const link = screen.getByRole("link", { name: item.label });
        expect(link).toHaveAttribute("href", item.href);
      });
    });
  });

  describe("Visibility and Layout classes", () => {
    it("renders the warm sand background and 80px mobile padding (pb-20)", () => {
      const { container } = render(<Footer />);
      const footerElement = container.querySelector("#footer");
      expect(footerElement).toBeInTheDocument();
      expect(footerElement).toHaveClass("bg-[#F1E6D3]");
      expect(footerElement).toHaveClass("pb-20");
      expect(footerElement).toHaveClass("md:pb-0");
    });

    it("hides the footer on admin and wizard paths", () => {
      mockPathname = "/super-admin";
      const { container: c1 } = render(<Footer />);
      expect(c1.querySelector("#footer")).toBeNull();

      mockPathname = "/admin/dashboard";
      const { container: c2 } = render(<Footer />);
      expect(c2.querySelector("#footer")).toBeNull();

      mockPathname = "/items/new";
      const { container: c3 } = render(<Footer />);
      expect(c3.querySelector("#footer")).toBeNull();

      mockPathname = "/items/123/edit";
      const { container: c4 } = render(<Footer />);
      expect(c4.querySelector("#footer")).toBeNull();
    });
  });
});
