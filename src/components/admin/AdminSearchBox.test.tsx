import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { AdminSearchBox, matchesQuery } from "./AdminSearchBox";
import { AdminStatusTabs } from "./AdminStatusTabs";

afterEach(() => vi.useRealTimers());

describe("AdminSearchBox", () => {
  it("debounces 300 ms and trims", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<AdminSearchBox value="" onChange={onChange} placeholder="Search" />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "  Hope " } });
    act(() => { vi.advanceTimersByTime(299); });
    expect(onChange).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onChange).toHaveBeenCalledWith("Hope");
  });

  it("clears with the x button and with Escape, immediately", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<AdminSearchBox value="" onChange={onChange} placeholder="Search" />);
    const box = screen.getByRole("searchbox");
    fireEvent.change(box, { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(box).toHaveValue("");
    fireEvent.change(box, { target: { value: "xyz" } });
    fireEvent.keyDown(box, { key: "Escape" });
    expect(box).toHaveValue("");
    act(() => { vi.advanceTimersByTime(500); });
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("matches case-insensitively and partially across fields", () => {
    expect(matchesQuery(" hoPE ", "Hope Welfare", null)).toBe(true);
    expect(matchesQuery("42", "x", 1423)).toBe(true);
    expect(matchesQuery("zzz", "Hope")).toBe(false);
    expect(matchesQuery("", "anything")).toBe(true);
  });
});

describe("AdminStatusTabs", () => {
  it("is a tablist with arrow-key navigation", () => {
    const onSelect = vi.fn();
    render(<AdminStatusTabs label="Status" options={[{ label: "A" }, { label: "B" }, { label: "C" }]} selected={0} onSelect={onSelect} />);
    expect(screen.getByRole("tablist", { name: "Status" })).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(onSelect).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(tabs[0], { key: "ArrowLeft" });
    expect(onSelect).toHaveBeenLastCalledWith(2);
  });
});
