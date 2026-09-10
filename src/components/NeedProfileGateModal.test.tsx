import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/en.json";
import { NeedProfileGateProvider } from "@/hooks/useNeedProfileGate";
import { NewRequestLink } from "@/components/NewRequestLink";
import { getDoneeNeedProfile } from "@/lib/api";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api", () => ({ getDoneeNeedProfile: vi.fn() }));

const mockUser = { user: { email: "d@example.com", role: "DONEE" }, isLoading: false };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockUser }));

function renderGate() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <NeedProfileGateProvider>
        <NewRequestLink href="/requests/new">Post a need</NewRequestLink>
      </NeedProfileGateProvider>
    </NextIntlClientProvider>
  );
}

describe("need-profile gate", () => {
  beforeEach(() => { push.mockClear(); vi.mocked(getDoneeNeedProfile).mockReset(); });

  it("navigates without a modal when the profile is complete", async () => {
    vi.mocked(getDoneeNeedProfile).mockResolvedValue({ complete: true, missing: [], details: {}, documents: [] } as never);
    renderGate();
    await userEvent.click(screen.getByText("Post a need"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/requests/new"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the modal with readable labels when the profile is incomplete", async () => {
    vi.mocked(getDoneeNeedProfile).mockResolvedValue({
      complete: false, missing: ["GOVT_ID_ANY", "SELFIE_WITH_ID"], details: {}, documents: [],
    } as never);
    renderGate();
    await userEvent.click(screen.getByText("Post a need"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Finish your profile first");
    expect(dialog).toHaveTextContent("Government ID");
    expect(dialog).toHaveTextContent("A clear photo of yourself");
    expect(push).not.toHaveBeenCalled();
    // The CTA must carry the wizard back as ?next= so the donee returns here.
    expect(screen.getByText("Complete my profile").closest("a"))
      .toHaveAttribute("href", "/profile/need-details?next=%2Frequests%2Fnew");
  });

  it("shows the error mode, not the incomplete wording, when the check itself fails", async () => {
    vi.mocked(getDoneeNeedProfile).mockRejectedValue(new Error("Failed to fetch"));
    renderGate();
    await userEvent.click(screen.getByText("Post a need"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("We could not check your profile");
    expect(dialog).not.toHaveTextContent("Finish your profile first");
    // The raw browser message must never reach the donee.
    expect(dialog).not.toHaveTextContent("Failed to fetch");
    expect(screen.getByText("Try again")).toBeInTheDocument();
    expect(screen.getByText("Continue anyway")).toBeInTheDocument();
  });
});
