import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { GlobalSearch } from "./GlobalSearch";
import { getItemRequests } from "@/lib/api";

vi.mock("@/lib/api", () => ({ getItemRequests: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "DONOR" } }) }));
vi.mock("@/hooks/useAppRouter", () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => vi.mocked(getItemRequests).mockReset());
const open = () => fireEvent.keyDown(document, { key: "k", ctrlKey: true });
const close = () => fireEvent.keyDown(document, { key: "Escape" });
const request = (id: number, title: string) => ({ id, title, city: "Virar", category: "Education", quantity: 1 });

it("keeps one slow request and filters its response using the latest typed query", async () => {
  let resolve!: (items: unknown[]) => void;
  vi.mocked(getItemRequests).mockReturnValue(new Promise(r => { resolve = r as typeof resolve; }) as never);
  render(<GlobalSearch />);
  open();
  const input = screen.getByRole("textbox", { name: "Search requests" });
  fireEvent.change(input, { target: { value: "b" } });
  fireEvent.change(input, { target: { value: "books" } });
  expect(getItemRequests).toHaveBeenCalledTimes(1);
  await act(async () => resolve([request(1, "Books for school"), request(2, "Winter clothing")]));
  expect(await screen.findByRole("button", { name: /Books for school/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Winter clothing/ })).toBeNull();
  close(); open();
  expect(getItemRequests).toHaveBeenCalledTimes(1);
});

it("retries a failed fetch on the next open instead of caching the failure", async () => {
  vi.mocked(getItemRequests).mockRejectedValueOnce(new Error("offline"));
  render(<GlobalSearch />);
  open();
  await waitFor(() => expect(document.querySelector(".animate-spin")).toBeNull());
  close();
  vi.mocked(getItemRequests).mockResolvedValueOnce([request(1, "Books for school")] as never);
  open();
  expect(await screen.findByRole("button", { name: /Books for school/ })).toBeInTheDocument();
  expect(getItemRequests).toHaveBeenCalledTimes(2);
});
