import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { markInternalTraffic } from "@/lib/internalTraffic";
import { useInternalTraffic } from "./useInternalTraffic";

afterEach(() => {
  document.cookie = "ck_internal_traffic=; path=/; max-age=0";
});

describe("tracker traffic classification", () => {
  it("uses the same unknown server snapshot even when the browser has an internal cookie", () => {
    function Snapshot() { return <span>{String(useInternalTraffic())}</span>; }
    document.cookie = "ck_internal_traffic=1; path=/";
    expect(renderToString(<Snapshot />)).toBe("<span>null</span>");
  });

  it("stops treating a visitor as external as soon as a staff route marks the browser", () => {
    const { result } = renderHook(() => useInternalTraffic());
    expect(result.current).toBe(false);
    act(() => markInternalTraffic());
    expect(result.current).toBe(true);
  });
});
