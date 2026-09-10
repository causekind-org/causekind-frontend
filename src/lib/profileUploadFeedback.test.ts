import { afterEach, expect, it, vi } from "vitest";
import { uploadNeedProfileDocument } from "./api";
afterEach(()=>vi.unstubAllGlobals());
it("translates the real API's face rejection code into helpful feedback", async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({code:"NO_FACE",detail:"Content rejected"}),{status:422,headers:{"Content-Type":"application/problem+json"}})));
  await expect(uploadNeedProfileDocument("SELFIE_WITH_ID",new File(["image"],"photo.jpg"))).rejects.toThrow("face visible");
});
it("distinguishes a screening outage from a rejected photo", async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({code:"SCREENING_UNAVAILABLE"}),{status:503})));
  await expect(uploadNeedProfileDocument("SELFIE_WITH_ID",new File(["image"],"photo.jpg"))).rejects.toThrow("saved photo has not changed");
});
