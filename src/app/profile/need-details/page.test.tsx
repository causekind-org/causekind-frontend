import { beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Page from "./page";

const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(), upload: vi.fn(), push: vi.fn(), replace: vi.fn(), user: {role:"DONEE"} }));
vi.mock("@/hooks/useAuth", () => ({useAuth: () => ({user:mocks.user,isLoading:false})}));
vi.mock("next/navigation", () => ({useRouter: () => ({push:mocks.push,replace:mocks.replace}),useSearchParams: () => new URLSearchParams("next=%2Frequests%2Fnew%3FdraftId%3D42")}));
vi.mock("@/lib/api", () => ({getDoneeNeedProfile:mocks.get,saveDoneeNeedProfile:mocks.save,uploadNeedProfileDocument:mocks.upload,deleteNeedProfileDocument:vi.fn()}));
vi.mock("@/lib/toast", () => ({toast:{success:vi.fn(),error:vi.fn()}}));
vi.mock("@/components/CameraCaptureDialog", () => ({CameraCaptureDialog: (props: {open:boolean;onCapture:(file:File)=>void}) => props.open ? <button onClick={()=>props.onCapture(new File(["photo"],"live-photo.jpg",{type:"image/jpeg"}))}>Use captured photo</button> : null}));

/** Everything filled except "People in home"; the server still wants one document. */
const almost = {householdSize:null,dependents:1,age:40,housingType:"RENTED",monthlyIncome:5000,incomeSource:"Daily wages",reasonCannotBuy:"Lost my job"};
const incomplete = {details:{householdSize:3},documents:[],complete:false,missing:["GOVT_ID_ANY"]};
beforeEach(() => {vi.clearAllMocks();mocks.get.mockResolvedValue(incomplete);});

/** Both the rail and the mobile chip row carry this control; either will do. */
async function goToLastSection() {
  fireEvent.click((await screen.findAllByRole("button",{name:"Identity documents"}))[0]);
}

it("has no Save profile button and no import-from-previous block", async () => {
  render(<Page/>);
  await screen.findByLabelText(/People in home/);
  expect(screen.queryByRole("button",{name:/Save profile/})).toBeNull();
  expect(screen.queryByText(/Filled this in before\?/)).toBeNull();
  expect(screen.queryByRole("button",{name:/Import from my previous requests/})).toBeNull();
});

it("updates readiness live while typing, before any save", async () => {
  mocks.get.mockResolvedValue({details:almost,documents:[],complete:false,missing:["People in home","GOVT_ID_ANY"]});
  render(<Page/>);
  expect((await screen.findAllByText("2 left")).length).toBeGreaterThan(0);
  fireEvent.change(screen.getByLabelText(/People in home/),{target:{value:"4"}});
  expect(screen.getAllByText("1 left").length).toBeGreaterThan(0);
  expect(screen.queryByText("People in home",{selector:"li"})).toBeNull();
  expect(mocks.save).not.toHaveBeenCalled();
});

it("autosaves quietly after the donee stops typing", async () => {
  vi.useFakeTimers({shouldAdvanceTime:true});
  mocks.save.mockResolvedValue(incomplete);
  render(<Page/>);
  fireEvent.change(await screen.findByLabelText(/People in home/),{target:{value:"6"}});
  expect(mocks.save).not.toHaveBeenCalled();
  await act(async () => { vi.advanceTimersByTime(1600); });
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({householdSize:6})));
  expect(await screen.findByText("Saved")).toBeInTheDocument();
  vi.useRealTimers();
});

it("Next is blocked by an empty required field, and saves before moving on", async () => {
  mocks.save.mockResolvedValue(incomplete);
  render(<Page/>);
  fireEvent.click(await screen.findByRole("button",{name:"Next section"}));
  expect(await screen.findAllByText("This is required.")).not.toHaveLength(0);
  expect(mocks.save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(/People who cannot earn/),{target:{value:"1"}});
  fireEvent.change(screen.getByLabelText(/Your age/),{target:{value:"30"}});
  fireEvent.change(screen.getByLabelText(/Housing type/),{target:{value:"OWNED"}});
  fireEvent.click(screen.getByRole("button",{name:"Next section"}));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({dependents:1,age:30,housingType:"OWNED"})));
  expect(await screen.findByRole("heading",{name:"Financial situation"})).toBeVisible();
});

it("Finish keeps an incomplete profile on the form", async () => {
  render(<Page/>);
  await goToLastSection();
  fireEvent.click(screen.getByRole("button",{name:"Finish"}));
  await waitFor(() => expect(mocks.push).not.toHaveBeenCalled());
});

it("Finish saves edits, then returns to the original draft", async () => {
  mocks.get.mockResolvedValue({details:almost,documents:[],complete:false,missing:["People in home"]});
  mocks.save.mockResolvedValue({details:{...almost,householdSize:5},documents:[],complete:true,missing:[]});
  render(<Page/>);
  fireEvent.change(await screen.findByLabelText(/People in home/),{target:{value:"5"}});
  await goToLastSection();
  fireEvent.click(screen.getByRole("button",{name:"Finish"}));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/requests/new?draftId=42"));
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({householdSize:5}));
});

it("document uploads preserve unsaved household edits", async () => {
  mocks.upload.mockResolvedValue({id:1});
  mocks.save.mockResolvedValue(incomplete);
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
