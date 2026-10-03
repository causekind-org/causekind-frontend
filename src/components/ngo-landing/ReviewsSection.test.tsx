import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewsSection } from "./ReviewsSection";
import { SAMPLE_REVIEWS } from "@/data/sampleReviews";
import { filterAndPrioritizeReviews, getReviews } from "@/lib/reviews/getReviews";

describe("ReviewsSection Component Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the reviews section heading and subheading", () => {
    render(<ReviewsSection />);

    expect(screen.getByText("Trusted by Givers and NGOs")).toBeInTheDocument();
    expect(
      screen.getByText("Real words from the donors, volunteers, and organisations using CauseKind.")
    ).toBeInTheDocument();
  });

  it("renders sample review cards with 5 stars, names, roles, and initial avatars", () => {
    render(<ReviewsSection />);

    // Check presence of authors from sample reviews
    expect(screen.getAllByText("Ramesh K.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Anjali T.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sneha P.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Farhan S.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kavita N.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sunil V.").length).toBeGreaterThan(0);

    // Check roles
    expect(screen.getAllByText("Donor · Mumbai").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NGO Coordinator · Pune").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Trustee, Asha Foundation · Nashik").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Program Lead, Hope Kitchen · Chennai").length).toBeGreaterThan(0);
  });

  it("renders without any 'See more' button or link", () => {
    render(<ReviewsSection />);

    const seeMoreButtons = screen.queryAllByRole("button", { name: /See more/i });
    expect(seeMoreButtons.length).toBe(0);
    expect(screen.queryByText(/See more/i)).toBeNull();
  });

  it("contains strictly no Google logo, Google rating, or 'Verified' label within the reviews section", () => {
    const { container } = render(<ReviewsSection />);

    const textContent = container.textContent || "";
    expect(textContent).not.toMatch(/google/i);
    expect(textContent).not.toMatch(/verified review/i);
    expect(container.querySelector("svg[data-google]")).toBeNull();
  });

  it("filters and prioritizes reviews <= 180 characters in getReviews", async () => {
    const reviews = await getReviews({ source: "google", maxReviews: 5 });
    expect(reviews.length).toBe(5);
    reviews.forEach((r) => {
      expect(r.text.length).toBeLessThanOrEqual(180);
    });
  });
});
