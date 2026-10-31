import { describe, expect, it } from "vitest";
import { isDriveGiveFlowPath } from "./driveFlowPaths";

describe("isDriveGiveFlowPath", () => {
  it("is the drive page and its give form only", () => {
    for (const p of ["/drives/3", "/drives/3/", "/drives/12/give"]) expect(isDriveGiveFlowPath(p), p).toBe(true);
    for (const p of ["/", "/dashboard", "/drives", "/drives/3/proof", "/ngos/hope", "/requests", null, undefined])
      expect(isDriveGiveFlowPath(p as string), String(p)).toBe(false);
  });
});
