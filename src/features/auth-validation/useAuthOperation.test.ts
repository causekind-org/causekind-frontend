import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAuthOperation } from "./useAuthOperation";

describe("useAuthOperation", () => {
  it("refuses a second operation synchronously, before any re-render", () => {
    const { result } = renderHook(() => useAuthOperation());
    let first: number | null = null;
    let second: number | null = null;
    act(() => {
      // Both calls land in the same tick — the double-click case.
      first = result.current.begin("password");
      second = result.current.begin("google");
    });
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(result.current.op).toBe("password");
  });

  it("releases after a recoverable failure so the user can retry", () => {
    const { result } = renderHook(() => useAuthOperation());
    let id = 0;
    act(() => { id = result.current.begin("google")!; });
    act(() => result.current.release(id));
    expect(result.current.busy).toBe(false);
    let again: number | null = null;
    act(() => { again = result.current.begin("password"); });
    expect(again).not.toBeNull();
  });

  it("stays locked after success; release cannot undo it", () => {
    const { result } = renderHook(() => useAuthOperation());
    let id = 0;
    act(() => { id = result.current.begin("password")!; });
    act(() => { result.current.succeed(id); });
    act(() => result.current.release(id));
    expect(result.current.op).toBe("authenticated");
    let next: number | null = 1;
    act(() => { next = result.current.begin("google"); });
    expect(next).toBeNull();
  });

  it("ignores a stale callback from an earlier attempt", () => {
    const { result } = renderHook(() => useAuthOperation());
    let stale = 0;
    let fresh = 0;
    act(() => { stale = result.current.begin("google")!; });
    act(() => result.current.release(stale)); // popup closed
    act(() => { fresh = result.current.begin("password")!; });

    // The old Google attempt resolves late: it must not unlock or claim success.
    act(() => result.current.release(stale));
    expect(result.current.op).toBe("password");
    let claimed = true;
    act(() => { claimed = result.current.succeed(stale); });
    expect(claimed).toBe(false);
    expect(result.current.isCurrent(fresh)).toBe(true);
  });
});
