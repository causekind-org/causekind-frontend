import { beforeEach, describe, expect, it, vi } from "vitest";
import { configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

configure({ asyncUtilTimeout: 5000 });

const api = vi.hoisted(() => ({
  updateNgoAboutUs: vi.fn(),
  getPublicNgo: vi.fn(),
  getMyNgoActivities: vi.fn(),
  createNgoActivity: vi.fn(),
  getPendingNgoActivities: vi.fn(),
  rejectNgoActivity: vi.fn(),
  approveNgoActivity: vi.fn(),
  getMatchChatMessages: vi.fn(),
  getMatchChatMessagesSince: vi.fn(),
  sendMatchChatMessage: vi.fn(),
  markMatchChatMessagesRead: vi.fn(),
  getNgoActivityVideoCapability: vi.fn(),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));
vi.mock("@/lib/toast", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock("next-intl", async () => {
  const en = (await import("../../../messages/en.json")).default as Record<string, Record<string, unknown>>;
  const t = (ns?: string) => {
    const fn = (k: string) => { const v = ns ? en[ns]?.[k] : undefined; return typeof v === "string" ? v : k; };
    return Object.assign(fn, { rich: fn, has: () => true });
  };
  return { useLocale: () => "en", useTranslations: t };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { email: "donor@test", role: "DONOR" }, isLoading: false }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));

import { DriveOfferPhotosStep } from "@/features/ngo-drives/components/DriveOfferPhotosStep";
import { OfferPhotosStep } from "@/features/donation-offer-wizard/steps/OfferPhotosStep";
import { aboutUsMissing, getNgoStillNeededItems, INITIAL_NGO_FORM } from "@/features/ngo-registration/ngoRegistrationModel";
import { NgoAboutSection } from "./NgoAboutSection";
import { AboutNgoContent } from "@/features/ngo-drives/components/AboutNgoCard";
import { NgoPublicPage } from "./NgoPublicPage";
import { NgoActivitiesManager } from "./NgoActivitiesManager";
import { NgoActivityModerationPanel } from "@/app/admin/ngos/NgoActivityModerationPanel";
import { MatchSegmentControl, NgoAcceptedOffersList, acceptedDriveOffers } from "@/components/matches/NgoAcceptedOffers";
import MatchChatWindow from "@/components/MatchChatWindow";
import { DriveOfferChatPanel } from "@/features/ngo-drives/components/DriveOfferChatPanel";
import { FaqPageClient } from "@/app/faq/FaqPageClient";
import { NGO_DRIVE_FAQ_KEYS } from "@/features/ngo-drives/ngoDriveFaq";

const ABOUT = "We collect school bags and books for children in rural Pune and run weekend reading classes for them.";

beforeEach(() => {
  vi.clearAllMocks();
  api.getNgoActivityVideoCapability.mockResolvedValue({ available: false, maxBytes: 0, maxSeconds: 30 });
});

describe("1. give-wizard photo step", () => {
  const props = { photos: [], screening: { kind: "idle" as const }, onAddFiles: vi.fn(), onRetryPhoto: vi.fn(), onRemovePhoto: vi.fn(), onRescreen: vi.fn() };

  it("has a main photo slot, a required second angle, up to 3 more, the approved card and tips", () => {
    render(<DriveOfferPhotosStep {...props} />);
    expect(screen.getByTestId("drive-slot-main")).toHaveTextContent("Main photo");
    expect(screen.getByTestId("drive-slot-second")).toHaveTextContent("Second angle");
    expect(screen.getAllByText("Required")).toHaveLength(2);
    expect(screen.getByText("Photos approved")).toBeInTheDocument();
    expect(screen.getAllByText(/What makes a good photo/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Take photo/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Choose photo/ })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("✓");
  });

  it("Take photo goes through the webcam hook when given", () => {
    const onTakePhoto = vi.fn();
    render(<DriveOfferPhotosStep {...props} onTakePhoto={onTakePhoto} />);
    fireEvent.click(screen.getByRole("button", { name: /Take photo/ }));
    expect(onTakePhoto).toHaveBeenCalledTimes(1);
  });

  it("the donee offer photo step is unchanged (no slots, no approved card)", () => {
    render(<OfferPhotosStep {...props} />);
    expect(screen.queryByTestId("drive-slot-main")).not.toBeInTheDocument();
    expect(screen.queryByText("Photos approved")).not.toBeInTheDocument();
  });
});

describe("2. About us", () => {
  it("is required (100-2000) on a new application, optional on a corrections resubmission", () => {
    expect(aboutUsMissing({ aboutUs: "" })).toBe(true);
    expect(aboutUsMissing({ aboutUs: "x".repeat(99) })).toBe(true);
    expect(aboutUsMissing({ aboutUs: ABOUT })).toBe(false);
    expect(aboutUsMissing({ aboutUs: "", aboutUsOptional: true })).toBe(false);
    expect(aboutUsMissing({ aboutUs: "short", aboutUsOptional: true })).toBe(true);
    expect(getNgoStillNeededItems("org-details", { ...INITIAL_NGO_FORM })).toContain("About us (100 to 2000 characters)");
  });

  it("an approved NGO without About us sees a gentle prompt and can save it", async () => {
    api.updateNgoAboutUs.mockResolvedValue({ aboutUs: ABOUT });
    render(<NgoAboutSection ngo={{ organizationName: "Hope Trust", verified: true }} />);
    expect(screen.getByTestId("about-us-prompt")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add About us" }));
    fireEvent.change(screen.getByLabelText("About us"), { target: { value: "Too short" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("100 to 2000");
    expect(api.updateNgoAboutUs).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("About us"), { target: { value: ABOUT } });
    expect(screen.getByText(`${ABOUT.length} / 2000`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.updateNgoAboutUs).toHaveBeenCalledWith(ABOUT));
    expect(await screen.findByText(ABOUT)).toBeInTheDocument();
  });
});

describe("3. About the NGO card and public page", () => {
  it("shows founder, formation year, verified dot (no tick), About us and the public page link", () => {
    render(<AboutNgoContent ngo={{ organizationName: "Hope Trust", founderName: "Asha Rao", founderDesignation: "Trustee",
      yearOfEstablishment: "2005", verified: true, aboutUs: ABOUT, slug: "hope-trust" }} />);
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Trustee")).toBeInTheDocument();
    expect(screen.getByText("2005")).toBeInTheDocument();
    expect(screen.getByText("Verified by CauseKind")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Know more about the organization/ })).toHaveAttribute("href", "/ngos/hope-trust");
    expect(document.body.textContent).not.toContain("✓");
  });

  it("the public page shows email, phone, representatives (name + designation) and approved activity", async () => {
    api.getPublicNgo.mockResolvedValue({
      slug: "hope-trust", organizationName: "Hope Trust", verifiedAt: "2024-01-15T10:00:00", city: "Pune", state: "MH",
      yearOfEstablishment: "2005", aboutUs: ABOUT, legalStructure: "TRUST", registrationNumber: "REG/1",
      organizationPhone: "+919822222222", officialEmail: "hope@ngo.test",
      representatives: [{ fullName: "Asha Rao", designation: "Trustee" }],
      documents: [{ label: "80G certificate", url: "https://x.test/80g?sig=1" }],
      trackRecord: { completedDrives: 2, itemsReceived: 40, drivesWithApprovedProof: 2 },
      activities: [{ id: 1, title: "Meal drive", activityDate: "2026-09-01", media: [{ mediaType: "IMAGE", url: "https://x.test/a.png" }] }],
      liveDrives: [],
    });
    render(<NgoPublicPage slug="hope-trust" />);
    expect(await screen.findByRole("heading", { name: "Hope Trust", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /hope@ngo.test/ })).toHaveAttribute("href", "mailto:hope@ngo.test");
    expect(screen.getByRole("link", { name: /\+919822222222/ })).toBeInTheDocument();
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /80G certificate/ })).toHaveAttribute("href", "https://x.test/80g?sig=1");
    expect(screen.getAllByTestId("public-activity")).toHaveLength(1);
    expect(screen.getByTestId("activity-carousel")).toBeInTheDocument();
  });

  it("an NGO that is not public shows the friendly not-found page", async () => {
    const { ApiError } = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
    api.getPublicNgo.mockRejectedValue(new ApiError(404, "Not found"));
    render(<NgoPublicPage slug="nope" />);
    expect(await screen.findByTestId("ngo-not-found")).toHaveTextContent("NGO not found");
  });
});

describe("4. past activity", () => {
  it("cannot be saved without the consent tick", async () => {
    api.getMyNgoActivities.mockResolvedValue([]);
    render(<NgoActivitiesManager />);
    fireEvent.click(await screen.findByRole("button", { name: "Add activity" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Meal drive" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Confirm that people shown have given consent.")).toBeInTheDocument();
    expect(api.createNgoActivity).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    api.createNgoActivity.mockResolvedValue({ id: 5, title: "Meal drive", activityDate: "2026-09-01", consentGiven: true, status: "PENDING", sortOrder: 0, media: [] });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.createNgoActivity).toHaveBeenCalledWith(expect.objectContaining({ consentGiven: true, title: "Meal drive" })));
  });

  it("the admin must give a reason to send an entry back", async () => {
    api.getPendingNgoActivities.mockResolvedValue([{ ngoUserId: 1, organizationName: "Hope Trust",
      activity: { id: 9, title: "Meal drive", activityDate: "2026-09-01", consentGiven: true, status: "PENDING", sortOrder: 0, media: [] } }]);
    api.rejectNgoActivity.mockResolvedValue({});
    render(<NgoActivityModerationPanel />);
    const item = await screen.findByTestId("admin-activity");
    fireEvent.click(within(item).getByRole("button", { name: "Send back" }));
    expect(api.rejectNgoActivity).not.toHaveBeenCalled();
    fireEvent.change(within(item).getByLabelText(/Reason/), { target: { value: "Blur faces" } });
    fireEvent.click(within(item).getByRole("button", { name: "Send back" }));
    await waitFor(() => expect(api.rejectNgoActivity).toHaveBeenCalledWith(9, "Blur faces"));
  });
});

describe("5. Matches tab NGO segment", () => {
  it("lists only accepted, unfinished drive offers, with a link to the handover", () => {
    const offers = [
      { _type: "DRIVE_OFFER", id: 1, status: "NGO_ACCEPTED", driveTitle: "Winter blankets", ngoName: "Hope Trust", quantity: 3, driveUnit: "PIECES", driveItemName: "Blankets" },
      { _type: "DRIVE_OFFER", id: 2, status: "PENDING_NGO_REVIEW" },
      { _type: "DRIVE_OFFER", id: 3, status: "COMPLETED" },
      { id: 4, status: "NGO_ACCEPTED" },
    ];
    const accepted = acceptedDriveOffers(offers);
    expect(accepted.map(o => o.id)).toEqual([1]);
    render(<NgoAcceptedOffersList offers={accepted as never} />);
    expect(screen.getByText("Winter blankets")).toBeInTheDocument();
    expect(screen.getByText("Accepted, plan the handover")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open handover/ })).toHaveAttribute("href", "/ngo-drive-offers/1/handover");
  });

  it("empty state, and a segmented control that defaults to Donee", () => {
    const onChange = vi.fn();
    render(<><MatchSegmentControl value="donee" onChange={onChange} doneeCount={2} ngoCount={0} /><NgoAcceptedOffersList offers={[]} /></>);
    expect(screen.getByRole("radio", { name: /Donee/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: /NGO/ }));
    expect(onChange).toHaveBeenCalledWith("ngo");
    expect(screen.getByTestId("ngo-matches-empty")).toHaveTextContent("No accepted drive offers yet.");
    expect(screen.getByRole("link", { name: "Browse NGO drives" })).toBeInTheDocument();
  });
});

describe("6. chat", () => {
  it("without endpoints the donor↔donee match chat uses the match API exactly as before", async () => {
    api.getMatchChatMessages.mockResolvedValue([]);
    api.markMatchChatMessagesRead.mockResolvedValue(undefined);
    render(<MatchChatWindow matchId={7} currentUserEmail="donor@test" />);
    await waitFor(() => expect(api.getMatchChatMessages).toHaveBeenCalledWith(7));
  });

  it("the drive chat is locked until the NGO accepts, and uses its own endpoints once open", async () => {
    const { rerender } = render(<DriveOfferChatPanel offerId={5} status="PENDING_NGO_REVIEW" role="DONOR" />);
    expect(screen.getByTestId("drive-chat-locked")).toHaveTextContent("Chat opens once the NGO accepts the offer.");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }));
    rerender(<DriveOfferChatPanel offerId={5} status="NGO_ACCEPTED" role="DONOR" />);
    fireEvent.click(screen.getByRole("button", { name: /Chat with NGO/ }));
    await waitFor(() => expect(fetchSpy.mock.calls.some(c => String(c[0]).includes("/api/v1/drive-offers/5/chat/messages"))).toBe(true));
    expect(api.getMatchChatMessages).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("7. FAQ", () => {
  it("/faq has an NGO drives category from the shared keys; the drive page links to it", async () => {
    render(<FaqPageClient />);
    fireEvent.click(screen.getByRole("button", { name: /NGO drives/ }));
    expect(await screen.findByText("Can I see the NGO's phone number?")).toBeInTheDocument();
    expect(NGO_DRIVE_FAQ_KEYS).toHaveLength(6);
    const drivePage = readFileSync(resolve(__dirname, "../ngo-drives/components/DriveDetailView.tsx"), "utf8");
    // The drive page no longer repeats the FAQ: it links to this category.
    expect(drivePage).not.toContain("Frequently Asked Questions");
    expect(drivePage).toContain('href="/faq?category=ngo-drives"');
  });
});

describe("8. Tick all declarations", () => {
  it("comes after the last declaration and before the submit hint", () => {
    const src = readFileSync(resolve(__dirname, "../../app/ngo/drives/new/page.tsx"), "utf8");
    const list = src.indexOf("{DECLARATIONS.map(d => (");
    const tickAll = src.indexOf(">Tick all declarations</span>");
    const hint = src.indexOf("Tick all declarations to submit.");
    expect(list).toBeGreaterThan(0);
    expect(tickAll).toBeGreaterThan(list);
    expect(hint).toBeGreaterThan(tickAll);
  });
});
