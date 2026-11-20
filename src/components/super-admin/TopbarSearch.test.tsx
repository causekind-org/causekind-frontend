import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopbarSearch } from "./TopbarSearch";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  superAdminSearch: vi.fn().mockResolvedValue({
    groups: [{ type: "USER", hits: [{ type: "USER", id: 42, title: "Ravi Kumar", subtitle: "ravi@example.com", status: null, at: null }] }],
  }),
}));

describe("TopbarSearch (inline search in the Super Admin top bar)", () => {
  it("shows suggestions under the field and opens a user on click", async () => {
    const onOpenUser = vi.fn();
    render(<TopbarSearch onOpenUser={onOpenUser} onOpenIntervention={vi.fn()} />);
    const box = screen.getByRole("combobox");
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "ravi" } });
    const hit = await screen.findByText("Ravi Kumar", {}, { timeout: 2000 });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.click(hit);
    expect(onOpenUser).toHaveBeenCalledWith(42);
  });

  it("asks for two characters before searching", () => {
    render(<TopbarSearch onOpenUser={vi.fn()} onOpenIntervention={vi.fn()} />);
    const box = screen.getByRole("combobox");
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "r" } });
    expect(screen.getByText(/at least two characters/i)).toBeInTheDocument();
  });

  it("offers matching console sections, so typing 'users' finds the Users screens", async () => {
    const onOpenSection = vi.fn();
    render(<TopbarSearch onOpenUser={vi.fn()} onOpenIntervention={vi.fn()} onOpenSection={onOpenSection}
      sections={[{ key: "users", label: "Users (raw)", hint: "Raw user table" }, { key: "directory", label: "User 360", hint: "Everything about one user" }, { key: "sql", label: "SQL Console" }]} />);
    const box = screen.getByRole("combobox");
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "users" } });
    const sec = await screen.findByText("Users (raw)");
    expect(screen.queryByText("SQL Console")).toBeNull();
    fireEvent.click(sec);
    expect(onOpenSection).toHaveBeenCalledWith("users");
  });
});
