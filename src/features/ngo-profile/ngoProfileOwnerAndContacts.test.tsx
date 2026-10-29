import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const api = vi.hoisted(() => ({
  getPublicNgo: vi.fn(),
  getMyNgoProfileManage: vi.fn(),
  updateNgoProfileCosmetic: vi.fn(),
  requestNgoProfileChange: vi.fn(),
  uploadNgoProfilePhoto: vi.fn(),
  removeNgoProfilePhoto: vi.fn(),
  adminGetNgoProfileChanges: vi.fn(),
  adminApproveNgoProfileChange: vi.fn(),
  adminRejectNgoProfileChange: vi.fn(),
}));
const auth = vi.hoisted(() => ({ user: null as null | { id: number; email: string; role: string } }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: auth.user, isLoading: false }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }), usePathname: () => "/ngos/hope", useSearchParams: () => new URLSearchParams() }));

import { NgoPublicPage } from "./NgoPublicPage";
import { NgoProfileChangesPanel } from "@/app/admin/ngos/NgoProfileChangesPanel";
import { HandoverContactsCall } from "@/features/handover/HandoverContactPanel";

const ngo = {
  slug: "hope", organizationName: "Hope Trust", aboutUs: "We run reading classes.", registrationNumber: "REG/1",
  registeredOfficeAddress: "12 Shanti Nagar, Pune", organizationPhone: "+919876543210", officialEmail: "info@hope.test",
  links: ["https://hope.example"], representatives: [{ fullName: "Asha Rao", designation: "Secretary" }], photoUrls: [],
};
const manage = {
  slug: "hope", organizationName: "Hope Trust", panNumber: "AABCT1234C", registrationNumber: "REG/1", officialEmail: "info@hope.test",
  aboutUs: "We run reading classes.", organizationPhone: "+919876543210", registeredOfficeAddress: "12 Shanti Nagar, Pune",
  links: ["https://hope.example"], representatives: [{ fullName: "Asha Rao", designation: "Secretary" }], photos: [], requests: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = null;
  api.getPublicNgo.mockResolvedValue(ngo);
  api.getMyNgoProfileManage.mockResolvedValue(manage);
});

describe("the NGO editing its own public page", () => {
  it("donors never see Edit buttons (and the page never asks for the NGO's own data)", async () => {
    auth.user = { id: 7, email: "donor@test", role: "DONOR" };
    render(<NgoPublicPage slug="hope" />);
    expect(await screen.findByRole("heading", { name: "Hope Trust", level: 1 })).toBeInTheDocument();
    expect(screen.queryAllByTestId("owner-edit")).toHaveLength(0);
    expect(api.getMyNgoProfileManage).not.toHaveBeenCalled();
  });

  it("another NGO sees no Edit buttons on this page", async () => {
    auth.user = { id: 8, email: "other@ngo.test", role: "NGO_PARTNER" };
    api.getMyNgoProfileManage.mockResolvedValue({ ...manage, slug: "someone-else" });
    render(<NgoPublicPage slug="hope" />);
    await screen.findByRole("heading", { name: "Hope Trust", level: 1 });
    await waitFor(() => expect(api.getMyNgoProfileManage).toHaveBeenCalled());
    expect(screen.queryAllByTestId("owner-edit")).toHaveLength(0);
  });

  it("the owner edits About us: saved at once and the page reloads what donors see", async () => {
    auth.user = { id: 1, email: "info@hope.test", role: "NGO_PARTNER" };
    render(<NgoPublicPage slug="hope" />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit about us" }));
    const box = screen.getByLabelText("About us");
    fireEvent.change(box, { target: { value: "too short" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/100 to 2000 characters/)).toBeInTheDocument();
    expect(api.updateNgoProfileCosmetic).not.toHaveBeenCalled();
    const text = "We run weekend reading classes and collect school bags for children in rural Pune every single month.";
    api.updateNgoProfileCosmetic.mockResolvedValue({ ...manage, aboutUs: text });
    fireEvent.change(box, { target: { value: text } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.updateNgoProfileCosmetic).toHaveBeenCalledWith({ aboutUs: text }));
    await waitFor(() => expect(api.getPublicNgo).toHaveBeenCalledTimes(2));
  });

  it("a verified field becomes a change request, and donors keep seeing the current value", async () => {
    auth.user = { id: 1, email: "info@hope.test", role: "NGO_PARTNER" };
    api.requestNgoProfileChange.mockResolvedValue({ id: 3, field: "organizationName", status: "PENDING" });
    api.getMyNgoProfileManage
      .mockResolvedValueOnce(manage)
      .mockResolvedValue({ ...manage, requests: [{ id: 3, field: "organizationName", newValue: "Hope Foundation", status: "PENDING", createdAt: "2026-10-29T10:00:00" }] });
    render(<NgoPublicPage slug="hope" />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit legal details" }));
    fireEvent.change(screen.getByLabelText("Legal name"), { target: { value: "Hope Foundation" } });
    fireEvent.click(within(screen.getByLabelText("Legal name").parentElement!).getByRole("button", { name: "Send for review" }));
    await waitFor(() => expect(api.requestNgoProfileChange).toHaveBeenCalledWith("organizationName", "Hope Foundation", undefined));
    expect(await screen.findByText(/keeps the current value/)).toBeInTheDocument();
    // Nothing donors see changes until approval: the public page is not reloaded (only the first load).
    expect(api.getPublicNgo).toHaveBeenCalledTimes(1);
  });

  it("the card shows the reason when a change was not approved", async () => {
    auth.user = { id: 1, email: "info@hope.test", role: "NGO_PARTNER" };
    api.getMyNgoProfileManage.mockResolvedValue({ ...manage, requests: [{ id: 4, field: "panNumber", newValue: "ABCPK1234Q", status: "REJECTED", adminReason: "PAN card does not match", createdAt: "2026-10-29T10:00:00" }] });
    render(<NgoPublicPage slug="hope" />);
    expect(await screen.findByTestId("change-rejected")).toHaveTextContent("PAN card does not match");
  });
});

describe("admin: Profile changes tab", () => {
  it("shows old vs new, approves, and needs a reason to reject", async () => {
    api.adminGetNgoProfileChanges.mockResolvedValue([{ ngoUserId: 1, organizationName: "Hope Trust", slug: "hope",
      request: { id: 9, field: "organizationName", oldValue: "Hope Trust", newValue: "Hope Foundation", status: "PENDING", createdAt: "2026-10-29T10:00:00" } }]);
    api.adminApproveNgoProfileChange.mockResolvedValue({});
    api.adminRejectNgoProfileChange.mockResolvedValue({});
    render(<NgoProfileChangesPanel />);
    const item = await screen.findByTestId("admin-profile-change");
    expect(item).toHaveTextContent("Hope Foundation");
    fireEvent.click(within(item).getByRole("button", { name: "Reject" }));
    expect(await screen.findByText(/Tell the NGO why/)).toBeInTheDocument();
    expect(api.adminRejectNgoProfileChange).not.toHaveBeenCalled();
    fireEvent.click(within(item).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(api.adminApproveNgoProfileChange).toHaveBeenCalledWith(9));
  });
});

describe("handover contacts", () => {
  const lockedMessage = "Not yet";
  it("Call dials the primary; a picker lets the donor call someone else", () => {
    render(<HandoverContactsCall label="Call NGO" lockedMessage={lockedMessage} phone="+919876543210" contacts={[
      { name: "Rahul", phone: "+919876543210" }, { name: "Asha", phone: "+918123456789", role: "Volunteer lead" }]} />);
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Call Rahul/ })).toHaveAttribute("href", "tel:+919876543210");
    fireEvent.change(screen.getByLabelText("Who to call"), { target: { value: "1" } });
    expect(screen.getByRole("link", { name: /Call Asha/ })).toHaveAttribute("href", "tel:+918123456789");
  });

  it("an older drive (no list) still calls its single contact; no phone yet → locked", () => {
    const { rerender } = render(<HandoverContactsCall label="Call NGO" lockedMessage={lockedMessage} phone="+919876543210" contacts={null} />);
    expect(screen.getByRole("link", { name: /Call NGO/ })).toHaveAttribute("href", "tel:+919876543210");
    rerender(<HandoverContactsCall label="Call NGO" lockedMessage={lockedMessage} phone={null} contacts={[{ name: "Rahul", phone: null }, { name: "Asha", phone: null }]} />);
    expect(screen.queryByRole("link", { name: /Call/ })).toBeNull();
    expect(screen.getByText("Asha")).toBeInTheDocument();
  });
});
