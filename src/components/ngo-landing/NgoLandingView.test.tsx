import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NgoLandingView } from "./NgoLandingView";
import { useAuth } from "@/hooks/useAuth";
import { getMyNgoApplication } from "@/lib/api";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 101, email: "ngo@causekind.org", role: "NGO" },
    isLoading: false,
    isRestoring: false,
    setUser: vi.fn(),
    logout: vi.fn(),
    setAuth: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: vi.fn().mockReturnValue("/"),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams() as any),
}));

vi.mock("@/lib/api", () => ({
  getMyNgoApplication: vi.fn().mockResolvedValue(null),
}));

describe("NgoLandingView Component Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "ngo@causekind.org", role: "NGO" } as never,
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
  });

  it("State 1 (incomplete - zero state): renders hero with locked Post a Request, Start your application CTA, Category Pill Bar, Trust Card, Problem/Solution, and locked Scorecard preview", () => {
    render(<NgoLandingView />);

    // 1. Hero zero state
    expect(screen.getByText("Post what you need.")).toBeInTheDocument();
    expect(screen.getByText("Givers nearby will bring it.")).toBeInTheDocument();
    expect(screen.getByText(/Once CauseKind verifies you, your drives reach donors within 10 km/i)).toBeInTheDocument();
    expect(screen.getByText("Available once CauseKind verifies your NGO.")).toBeInTheDocument();
    expect(screen.queryByText("✓ Verified by CauseKind")).toBeNull();
    expect(screen.queryByText("Your application")).toBeNull();

    // Locked Start a Drive button (cannot navigate)
    const postReqBtn = screen.getByRole("button", { name: /Start a Drive/i });
    expect(postReqBtn).toHaveAttribute("aria-disabled", "true");

    // Secondary CTA
    expect(screen.getByRole("link", { name: /Start your application →/i })).toHaveAttribute("href", "/profile/ngo-details");


    // Category Pill Bar in Hero (9 categories)
    expect(screen.getByRole("link", { name: /Category Medical aid/i })).toHaveAttribute("href", "/requests/category/medical-aid");
    expect(screen.getByRole("link", { name: /Category Education/i })).toHaveAttribute("href", "/requests/category/education");
    expect(screen.getByRole("link", { name: /Category Livelihood/i })).toHaveAttribute("href", "/requests/category/livelihood");
    expect(screen.getByRole("link", { name: /Category Clothing/i })).toHaveAttribute("href", "/requests/category/clothing");
    expect(screen.getByRole("link", { name: /Category Household/i })).toHaveAttribute("href", "/requests/category/household");
    expect(screen.getByRole("link", { name: /Category Relief/i })).toHaveAttribute("href", "/requests/category/relief");
    expect(screen.getByRole("link", { name: /Category Electronics/i })).toHaveAttribute("href", "/requests/category/electronics");
    expect(screen.getByRole("link", { name: /Category Furniture/i })).toHaveAttribute("href", "/requests/category/furniture");
    expect(screen.getByRole("link", { name: /Category Sports/i })).toHaveAttribute("href", "/requests/category/sports");

    // Restyled Hero Trust Card
    expect(screen.getByText("Legally Verified NGOs")).toBeInTheDocument();
    expect(screen.getByText("Documents checked before they post.")).toBeInTheDocument();
    expect(screen.getByText("Verified Drop-off Points")).toBeInTheDocument();
    expect(screen.getByText("Confirmed by the NGO itself.")).toBeInTheDocument();
    expect(screen.getByText("Photo Proof on Every Delivery")).toBeInTheDocument();
    expect(screen.getByText("Every handover, photographed.")).toBeInTheDocument();
    expect(screen.getByText("Matched Near You")).toBeInTheDocument();
    expect(screen.getByText("Givers within 10 km.")).toBeInTheDocument();

    // 2. Problem / Solution section visible before verification
    expect(screen.getByText("Sound familiar?")).toBeInTheDocument();
    expect(screen.getByText("You post your needs.")).toBeInTheDocument();
    expect(screen.getByText("Post on WhatsApp groups and hope")).toBeInTheDocument();
    expect(screen.getByText("Donors within 10 km see your request")).toBeInTheDocument();
    expect(screen.getByText("Donors aren't sure you're real")).toBeInTheDocument();
    expect(screen.getByText("Your Verified badge proves it")).toBeInTheDocument();
    expect(screen.getByText("You get things you didn't ask for")).toBeInTheDocument();
    expect(screen.getByText("Donors give exactly what you listed")).toBeInTheDocument();
    expect(screen.getByText("No record of who gave what")).toBeInTheDocument();
    expect(screen.getByText("Every handover logged, with a certificate")).toBeInTheDocument();

    // 3. Gift Journey Tracker — NGO view
    expect(screen.getByText("After you post")).toBeInTheDocument();
    expect(screen.getByText("What happens after you post")).toBeInTheDocument();
    expect(screen.getByText(/1\. You start a drive/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Donors nearby pledge them/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. They drop off, and you confirm receipt/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. You upload a handover photo/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Every donor gets the photo and their certificate/i)).toBeInTheDocument();
    expect(screen.getByText("What great proof looks like")).toBeInTheDocument();

    // 4. Trust Grid & Scorecard Preview
    expect(screen.getByText("How verification works")).toBeInTheDocument();
    expect(screen.getByText("This is how donors will see you")).toBeInTheDocument();
    expect(screen.getByText(/Preview Mode · Verification Pending/i)).toBeInTheDocument();

    // 5. How It Works — Step 1 highlighted
    expect(screen.getByText("For NGOs and trusts")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Get verified. Post. Deliver." })).toBeInTheDocument();
    expect(screen.getByText("Current Step")).toBeInTheDocument();

    // 6. Community Reviews (standalone last section)
    expect(screen.getByText("Trusted by Givers and NGOs")).toBeInTheDocument();

    // 7. Confirms old standalone Section 6 is GONE
    expect(screen.queryByText("Browse Needs by Category")).toBeNull();
    expect(screen.queryByText("VERIFIED CATEGORIES")).toBeNull();
  });

  it("State 1b (incomplete - in progress with draft): renders Continue application CTA without status pill", () => {
    localStorage.setItem(
      "ngo-demo-draft-101",
      JSON.stringify({
        organizationName: "Helping Hands Trust",
        legalStructure: "trust",
        registrationNumber: "REG-12345",
        registeredOfficeAddress: "123 MG Road, Pune",
      })
    );
    render(<NgoLandingView />);

    expect(screen.queryByText("✓ Verified by CauseKind")).toBeNull();
    expect(screen.queryByText("Your application")).toBeNull();
    expect(screen.getByRole("link", { name: /Continue application →/i })).toHaveAttribute(
      "href",
      "/profile/ngo-details?step=legal-documents"
    );
  });


  it("State 2 (under_review): renders hero with View application status CTA without status pill", () => {
    localStorage.setItem(
      "ngo-application-101",
      JSON.stringify({ status: "UNDER_REVIEW", organizationName: "Hope Foundation" })
    );
    render(<NgoLandingView />);

    expect(screen.getByText("Post what you need.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View application status/i })).toHaveAttribute("href", "/profile");
    expect(screen.queryByText("✓ Verified by CauseKind")).toBeNull();
    expect(screen.queryByText("Your application")).toBeNull();
  });

  it("State 3 (changes_requested): renders hero with Fix documents CTA without status pill", () => {
    localStorage.setItem(
      "ngo-application-101",
      JSON.stringify({ status: "NEEDS_INFORMATION", organizationName: "Hope Foundation" })
    );
    render(<NgoLandingView />);

    expect(screen.getByRole("link", { name: /Fix documents →/i })).toHaveAttribute("href", "/profile/ngo-details");
    expect(screen.queryByText("✓ Verified by CauseKind")).toBeNull();
    expect(screen.queryByText("Your application")).toBeNull();
  });

  it("State 4 (verified - empty): renders verified hero, category pill bar links to /ngo/drives/new, glance strip, hides problem/solution and trust grid, unlocks real scorecard", () => {
    localStorage.setItem(
      "ngo-application-101",
      JSON.stringify({ status: "APPROVED", organizationName: "Asha Foundation" })
    );
    render(<NgoLandingView />);

    // 1. Hero
    expect(screen.getByText("✓ Verified by CauseKind")).toBeInTheDocument();
    expect(screen.getByText("You're verified.")).toBeInTheDocument();
    expect(screen.getByText("Let givers nearby find you.")).toBeInTheDocument();
    expect(screen.getByText(/Post exactly what you need\. Donors within 10 km see it/i)).toBeInTheDocument();

    // Active Start a Drive CTA link
    const postReqLink = screen.getByRole("link", { name: /Start a Drive/i });
    expect(postReqLink).toHaveAttribute("href", "/ngo/drives/new");

    expect(screen.getByRole("link", { name: /View my public profile/i })).toHaveAttribute("href", "/profile");

    // Category Pill Bar links to /ngo/drives/new with category pre-selection
    expect(screen.getByRole("link", { name: /Category Medical aid/i })).toHaveAttribute("href", "/ngo/drives/new?category=Medical%20aid");
    expect(screen.getByRole("link", { name: /Category Education/i })).toHaveAttribute("href", "/ngo/drives/new?category=Education");

    // 2. Glance Strip
    expect(screen.getByText("At a glance")).toBeInTheDocument();
    expect(screen.getByText("Live drives")).toBeInTheDocument();
    expect(screen.getByText("Items pledged")).toBeInTheDocument();
    expect(screen.getByText("Drop-offs to confirm")).toBeInTheDocument();
    expect(screen.getByText("Photos due")).toBeInTheDocument();
    expect(screen.getByText(/Nothing posted yet\. Your first request takes 2 minutes\./i)).toBeInTheDocument();

    // 3. Problem / Solution is HIDDEN
    expect(screen.queryByText("Sound familiar?")).toBeNull();

    // 4. Trust Grid is HIDDEN
    expect(screen.queryByText("How verification works")).toBeNull();

    // 5. Real Scorecard
    expect(screen.getByText("Your Verified CauseKind Scorecard")).toBeInTheDocument();
    expect(screen.getByText("New — builds after your first fulfilled request")).toBeInTheDocument();
    expect(screen.getByText("0 requests fulfilled")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Share on WhatsApp/i })).toBeInTheDocument();

    // 6. How It Works — Step 1 completed, Steps 2 & 3 unlocked
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getAllByText("Unlocked ✓").length).toBe(2);

    // 7. Community Reviews (standalone last section)
    expect(screen.getByText("Trusted by Givers and NGOs")).toBeInTheDocument();
  });

  it("Proof Gallery: clicking a proof card opens the detail view with full proof content, timeline, donors, and checklist", () => {
    const { fireEvent } = require("@testing-library/react");
    render(<NgoLandingView />);

    // Check updated caption
    expect(
      screen.getByText(/Every fulfilled request ends the same way — a real photo, sent to everyone who helped make it happen\./i)
    ).toBeInTheDocument();

    // Find card button for Blankets
    const blanketsCard = screen.getByRole("button", {
      name: /View proof details for 50 Thermal Blankets for elderly shelter before peak winter/i,
    });
    expect(blanketsCard).toBeInTheDocument();

    // Click card to open modal
    fireEvent.click(blanketsCard);

    // Verify dialog content renders
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Needed: 50 thermal blankets")).toBeInTheDocument();
    expect(screen.getByText("Delivered: 50 of 50")).toBeInTheDocument();
    expect(screen.getByText("Handed to 50 residents of Kandivali Elder Shelter")).toBeInTheDocument();
    expect(screen.getByText("Asha Foundation")).toBeInTheDocument();
    expect(screen.getByText("14 donors confirmed")).toBeInTheDocument();
    expect(
      screen.getByText(/Our residents slept warm the night the blankets arrived/i)
    ).toBeInTheDocument();

    // 5-step timeline items
    expect(screen.getByText("Posted")).toBeInTheDocument();
    expect(screen.getByText("Fully pledged")).toBeInTheDocument();
    expect(screen.getByText("Items received")).toBeInTheDocument();
    expect(screen.getByText("Handed over")).toBeInTheDocument();
    expect(screen.getByText("Proof uploaded")).toBeInTheDocument();

    // Why this is great proof guidance criteria
    expect(screen.getByText("Why this is great proof")).toBeInTheDocument();
    expect(screen.getByText("The items are clearly visible being handed over")).toBeInTheDocument();
    expect(screen.getByText("Uploaded within 48 hours of the handover")).toBeInTheDocument();

    // Close button
    const closeBtn = screen.getByRole("button", { name: /Close proof detail dialog/i });
    fireEvent.click(closeBtn);
  });

  it("How It Works: all 3 cards highlight with border-ngo-700 when their headline group is focused", () => {
    const { fireEvent } = require("@testing-library/react");
    render(<NgoLandingView />);

    const card1 = document.querySelector('[data-step="1"]');
    const card2 = document.querySelector('[data-step="2"]');
    const card3 = document.querySelector('[data-step="3"]');

    expect(card1).toBeInTheDocument();
    expect(card2).toBeInTheDocument();
    expect(card3).toBeInTheDocument();

    // 1. Initial state (Focus on "Get verified." / Step 1)
    // Card 1 is BOTH current and focused
    expect(card1).toHaveAttribute("data-focused", "true");
    expect(card1).toHaveAttribute("data-current", "true");
    expect(card1).toHaveClass("border-ngo-700");
    expect(screen.getByText("Current Step")).toBeInTheDocument();

    // 2. Hover "Post." -> Card 2 becomes focused, Card 1 returns to current but not focused
    const postGroup = screen.getByText("Post.");
    fireEvent.mouseEnter(postGroup);

    expect(card2).toHaveAttribute("data-focused", "true");
    expect(card2).toHaveClass("border-ngo-700");
    expect(card1).toHaveAttribute("data-focused", "false");
    expect(card1).toHaveAttribute("data-current", "true");
    expect(card1).toHaveClass("border-ngo-500/50");

    // 3. Hover "Deliver." -> Card 3 becomes focused
    const deliverGroup = screen.getByText("Deliver.");
    fireEvent.mouseEnter(deliverGroup);

    expect(card3).toHaveAttribute("data-focused", "true");
    expect(card3).toHaveClass("border-ngo-700");
    expect(card2).toHaveAttribute("data-focused", "false");
  });

  it("Trust Grid: renders 5 chronological flip cards in one row with step numbers and short lines on back", () => {
    const { fireEvent } = require("@testing-library/react");
    render(<NgoLandingView />);

    // Headline updated
    expect(screen.getByText("at every step.")).toBeInTheDocument();

    // 5 Step numbers on front
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByText("04")).toBeInTheDocument();
    expect(screen.getByText("05")).toBeInTheDocument();

    // 5 Titles rendered on front (in chronological order)
    expect(screen.getByText("AI Screening")).toBeInTheDocument();
    expect(screen.getByText("Legal Checks")).toBeInTheDocument();
    expect(screen.getByText("Local Matching")).toBeInTheDocument();
    expect(screen.getByText("Safe Drop-offs")).toBeInTheDocument();
    expect(screen.getByText("Proof Required")).toBeInTheDocument();
    expect(screen.queryByText("Malware Scans")).toBeNull();

    // 5 Short lines rendered on back
    expect(screen.getByText("Every upload screened for fraud first.")).toBeInTheDocument();
    expect(screen.getByText("Registration and ID checked before any drive.")).toBeInTheDocument();
    expect(screen.getByText("Matched within 10 km, down to the neighbourhood.")).toBeInTheDocument();
    expect(screen.getByText("Donors get the address only after pledging.")).toBeInTheDocument();
    expect(screen.getByText("No proof, no next drive.")).toBeInTheDocument();

    // 1. Flip Card 1 (AI Screening)
    const card1Btn = screen.getByRole("button", { name: /Step 01: AI Screening\. Every upload screened for fraud first\./i });
    expect(card1Btn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(card1Btn);
    expect(card1Btn).toHaveAttribute("aria-pressed", "true");

    // 2. Flip Card 2 (Legal Checks) -> Card 1 flips back, Card 2 flips
    const card2Btn = screen.getByRole("button", { name: /Step 02: Legal Checks\. Registration and ID checked before any drive\./i });
    expect(card2Btn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(card2Btn);
    expect(card2Btn).toHaveAttribute("aria-pressed", "true");
    expect(card1Btn).toHaveAttribute("aria-pressed", "false");

    // 3. Click Card 2 again -> Flips back
    fireEvent.click(card2Btn);
    expect(card2Btn).toHaveAttribute("aria-pressed", "false");
  });

  it("Live Activity Ticker: renders directly below What's been given so far stats block across all states", () => {
    render(<NgoLandingView />);

    expect(screen.getByText("Live activity")).toBeInTheDocument();
    expect(screen.getByText("Happening right now, near you.")).toBeInTheDocument();
    expect(screen.getAllByText("Ramesh just gave 5 blankets to Winter Relief Drive").length).toBeGreaterThan(0);
  });

  it("CRITICAL: Confirms NO 'Start Giving' or 'I Need Support' exists anywhere in any state", () => {
    const statuses = ["incomplete", "UNDER_REVIEW", "NEEDS_INFORMATION", "APPROVED"];

    statuses.forEach((st) => {
      localStorage.clear();
      if (st !== "incomplete") {
        localStorage.setItem(
          "ngo-application-101",
          JSON.stringify({ status: st, organizationName: "Hope Foundation" })
        );
      }
      const { unmount } = render(<NgoLandingView />);

      expect(screen.queryByText(/Start Giving/i)).toBeNull();
      expect(screen.queryByText(/I Need Support/i)).toBeNull();

      unmount();
    });
  });
});
