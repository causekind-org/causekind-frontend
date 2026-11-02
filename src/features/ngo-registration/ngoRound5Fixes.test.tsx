import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { PastActivityForm, PastActivitySection } from "@/features/ngo-profile/PastActivity";
import { PastWorkSection } from "@/features/ngo-drives/components/PastWorkSection";
import { ReviewSubmit } from "./steps/ReviewSubmit";
import { INITIAL_NGO_FORM } from "./ngoRegistrationModel";
import { triggerNgoLockedToast } from "@/components/ngo-landing/useNgoStatus";
import { toast } from "sonner";
import { getMyNgoActivities } from "@/lib/api";

vi.mock("sonner", () => ({ toast: { info: vi.fn(), warning: vi.fn(), success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), getMyNgoActivities: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("Review & Submit long text", () => {
  it("About us wraps an unbroken string inside its card", async () => {
    vi.mocked(getMyNgoActivities).mockResolvedValue([] as never);
    const long = "x".repeat(600);
    render(<ReviewSubmit data={{ ...INITIAL_NGO_FORM, aboutUs: long }} onChange={() => {}} onBack={() => {}} onEditStep={() => {}} onSubmit={() => {}} />);
    const dd = await screen.findByText(long);
    expect(dd.className).toContain("[overflow-wrap:anywhere]");
    expect(dd.className).toContain("whitespace-pre-line");
  });
});

describe("NGO toast", () => {
  it("has one action, in the NGO palette", () => {
    triggerNgoLockedToast("incomplete", false, "", { push: vi.fn() } as never);
    const [message, options] = vi.mocked(toast.info).mock.calls[0] as unknown as [string, { action: { label: string }; style: { background: string } }];
    expect(message).toBe("Complete your profile to get verified.");
    expect(options.action.label).toBe("Continue");
    expect(options.style.background).toBe("#FBF7EC");
  });

  it("no NGO toast repeats its button as an inline arrow link", () => {
    for (const f of ["useNgoStatus.ts", "NgoHero.tsx", "NgoHeroRedesign.tsx"]) {
      const src = readFileSync(resolve(__dirname, "../../components/ngo-landing", f), "utf8");
      expect(src).not.toMatch(/toast\.\w+\(\s*"[^"]*→"/);
      expect(src).not.toContain('verified. Continue →"');
    }
  });
});

describe("date fields", () => {
  it("a click on the field opens the calendar, and a browser refusal is harmless", () => {
    render(<PastActivityForm onSaved={() => {}} />);
    const input = screen.getByLabelText(/Activity date/) as HTMLInputElement;
    const showPicker = vi.fn();
    input.showPicker = showPicker;
    fireEvent.click(input);
    expect(showPicker).toHaveBeenCalledTimes(1);
    input.showPicker = () => { throw new Error("not allowed"); };
    expect(() => fireEvent.click(input)).not.toThrow();
    fireEvent.change(input, { target: { value: "2026-01-02" } });
    expect(input.value).toBe("2026-01-02");
  });
});

describe("wizard step 4 Past activity", () => {
  it("shows one line and an empty card with Add activity", async () => {
    vi.mocked(getMyNgoActivities).mockResolvedValue([]);
    render(<PastActivitySection required />);
    const empty = await screen.findByTestId("past-activity-empty");
    expect(empty).toHaveTextContent("No activities yet");
    expect(screen.getAllByRole("button", { name: "Add activity" })).toHaveLength(1);
    expect(screen.getByText("Add at least one activity your NGO has done, with a photo. Our team reviews it with your application.")).toBeInTheDocument();
    expect(screen.queryByText("No past activity added yet.")).toBeNull();
  });

  it("the step no longer carries the other messages", () => {
    const src = readFileSync(resolve(__dirname, "steps/OrgPhotos.tsx"), "utf8");
    expect(src).not.toContain("Add at least one past activity with a photo to continue.");
    expect(src).not.toContain("Still needed:");
  });
});

describe("Read more modal", () => {
  it("shows the whole long text in a scrolling body, with the header outside it", async () => {
    const long = `First line.\n${"We gave blankets to families. ".repeat(40)}The very end.`;
    render(<PastWorkSection activities={[{ id: 1, title: "Drive", activityDate: "2026-01-02", description: long, status: "APPROVED", media: [{ id: 1, url: "https://x.test/1.jpg", mediaType: "IMAGE" }] }] as never} />);
    fireEvent.click(screen.getByRole("button", { name: "Read more about Drive" }));
    const dialog = await screen.findByTestId("past-work-detail");
    const body = within(dialog).getByTestId("past-work-detail-body");
    expect(body).toHaveTextContent("The very end.");
    expect(body.className).toContain("overflow-y-auto");
    expect(within(body).queryByText("Drive")).toBeNull();
    expect(within(body).getByText(/The very end/).className).toContain("whitespace-pre-line");
    expect(dialog.className).toContain("max-h-[85dvh]");
    expect(dialog.className).toContain("max-sm:h-dvh");
  });
});

describe("Review & Submit", () => {
  it("lists the past activities with date, photos and the Under review chip", async () => {
    vi.mocked(getMyNgoActivities).mockResolvedValue([{ id: 3, title: "Blanket drive", activityDate: "2026-01-02", status: "PENDING", media: [{ id: 9, mediaType: "IMAGE", url: "https://x.test/9.jpg" }] }] as never);
    const onEditStep = vi.fn();
    const { container } = render(<ReviewSubmit data={INITIAL_NGO_FORM} onChange={() => {}} onBack={() => {}} onEditStep={onEditStep} onSubmit={() => {}} />);
    const row = await screen.findByTestId("review-activity");
    expect(row).toHaveTextContent("Blanket drive");
    expect(row).toHaveTextContent("Under review");
    expect(row).toHaveTextContent("Activity date: 2 Jan 2026");
    expect(row.querySelector("img")).toHaveAttribute("src", "https://x.test/9.jpg");
    expect(container).not.toHaveTextContent("Activity Photos");
    fireEvent.click(screen.getByRole("button", { name: "Edit photos" }));
    expect(onEditStep).toHaveBeenCalled();
  });
});
