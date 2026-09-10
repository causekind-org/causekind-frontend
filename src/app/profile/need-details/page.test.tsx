import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Page from "./page";

const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(), upload: vi.fn(), push: vi.fn(), replace: vi.fn(), user: {role:"DONEE"} }));
vi.mock("@/hooks/useAuth", () => ({useAuth: () => ({user:mocks.user,isLoading:false})}));
vi.mock("next/navigation", () => ({useRouter: () => ({push:mocks.push,replace:mocks.replace}),useSearchParams: () => new URLSearchParams("next=%2Frequests%2Fnew%3FdraftId%3D42")}));
vi.mock("@/lib/api", () => ({getDoneeNeedProfile:mocks.get,saveDoneeNeedProfile:mocks.save,uploadNeedProfileDocument:mocks.upload,importPreviousNeedProfile:vi.fn(),deleteNeedProfileDocument:vi.fn()}));
vi.mock("@/lib/toast", () => ({toast:{success:vi.fn(),error:vi.fn()}}));
vi.mock("@/components/CameraCaptureDialog", () => ({CameraCaptureDialog: (props: {open:boolean;onCapture:(file:File)=>void}) => props.open ? <button onClick={()=>props.onCapture(new File(["photo"],"live-photo.jpg",{type:"image/jpeg"}))}>Use captured photo</button> : null}));
const incomplete = {details:{householdSize:3},documents:[],complete:false,missing:["Government ID"]};
beforeEach(() => {vi.clearAllMocks();mocks.get.mockResolvedValue(incomplete);});

/**
 * "Save & continue to request" only appears on the last section, so an
 * incomplete donee cannot click it into a toast that tells them to go back.
 * Both the rail and the mobile chip row carry this control; either will do.
 */
async function goToLastSection() {
  fireEvent.click((await screen.findAllByRole("button",{name:"Identity documents"}))[0]);
}

it("keeps an incomplete account in the profile after saving", async () => {
  mocks.save.mockResolvedValue(incomplete);
  render(<Page/>);
  await goToLastSection();
  fireEvent.click(screen.getByRole("button",{name:/Save & continue/}));
  await waitFor(() => expect(mocks.save).toHaveBeenCalled());
  expect(mocks.push).not.toHaveBeenCalled();
});

it("saves edits before returning to the original draft", async () => {
  mocks.save.mockResolvedValue({...incomplete,complete:true,missing:[]});
  render(<Page/>);
  fireEvent.change(await screen.findByLabelText(/People in home/),{target:{value:"5"}});
  await goToLastSection();
  fireEvent.click(screen.getByRole("button",{name:/Save & continue/}));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/requests/new?draftId=42"));
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({householdSize:5}));
});

it("document uploads preserve unsaved household edits", async () => {
  mocks.upload.mockResolvedValue({id:1});
  render(<Page/>);
  fireEvent.change(await screen.findByLabelText(/People in home/),{target:{value:"8"}});
  fireEvent.change(screen.getByLabelText(/^Government ID/),{target:{files:[new File(["image"],"id.jpg",{type:"image/jpeg"})]}});
  await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText(/People in home/)).toHaveValue(8);
});

it("sends a live camera photo through the profile screening upload", async () => {
  mocks.upload.mockResolvedValue({id:1,aiVerified:true});
  render(<Page/>);
  fireEvent.click(await screen.findByRole("button",{name:/Take live photo/}));
  fireEvent.click(screen.getByRole("button",{name:"Use captured photo"}));
  await waitFor(()=>expect(mocks.upload).toHaveBeenCalledWith("SELFIE_WITH_ID",expect.any(File)));
});

it("shows the face rejection reason inline", async () => {
  mocks.upload.mockRejectedValue(new Error("We couldn't clearly see your face."));
  render(<Page/>);
  fireEvent.click(await screen.findByRole("button",{name:/Take live photo/}));
  fireEvent.click(screen.getByRole("button",{name:"Use captured photo"}));
  expect(await screen.findByText("We couldn't clearly see your face.")).toBeInTheDocument();
});
