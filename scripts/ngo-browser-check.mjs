import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const origin = "http://127.0.0.1:3107";
const user = { id: 901, email: "ngo-browser@example.test", role: "NGO_PARTNER", fullName: "Browser Test NGO" };
const app = { applicationId: "NGO-BROWSER", status: "APPROVED", organizationName: "Browser Test NGO" };
const handover = { kind: "MATCH", id: 77, requestId: 42, title: "School bags", status: "COMPLETED", quantity: 10, scheduledAt: "2026-09-30T10:00:00", received: true, dualConfirmed: true, photoDue: true, href: "/matches/77/handover" };
const output = "ngo-browser-artifacts";
mkdirSync(output, { recursive: true });
const outcomes = [];
try {
 for (const width of [390, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
  let photoDue = false, failOverview = false;
  let request = { id: 42, title: "School bags", category: "Education", quantity: 10, urgency: "NORMAL", city: "Pune", description: "For our learning centre", latitude: 18.5, longitude: 73.8, status: "DRAFT" };
  await context.addInitScript(user => { localStorage.setItem("ck_user", JSON.stringify(user)); localStorage.setItem("ngo-verified-welcome-shown-901", "true"); sessionStorage.setItem("ngo-profile-toast-session-dismissed", "true"); }, user);
  await context.route("**/api/**", async route => {
   const url = new URL(route.request().url()), path = url.pathname;
   const json = data => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
   if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204 });
   if (path.endsWith("/users/me") || path.endsWith("/auth/me")) return json(user);
   if (path.endsWith("/ngo-registration/my-application")) return json(app);
   if (path.endsWith("/ngo-registration/draft")) return route.fulfill({ status: 204 });
   if (path.endsWith("/ngo/overview")) return failOverview ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({message:"Activity temporarily unavailable"}) }) : json({ activeRequests: 1, itemsPledged: 0, dropoffsToConfirm: 0, photosDue: photoDue ? 1 : 0, photosDueRequestName: "School bags", verifiedDeliveries: 1, handovers: [{ ...handover, photoDue }] });
   if (path.endsWith("/ngo/handovers/MATCH/77/proof")) { photoDue = false; return json({ message: "Photo saved" }); }
   if (path.endsWith("/item-requests/mine")) return json([request]);
   if (path.endsWith("/item-requests/draft")) return json(request);
   if (path.includes("/item-requests/42")) { if (path.endsWith("/submit")) request.status = "PENDING_VERIFICATION"; else if (route.request().postData()) request = { ...request, ...route.request().postDataJSON() }; return json(request); }
   return json([]);
  });
  // Block all external non-API traffic during the synthetic browser check.
  await context.route(url => !url.href.startsWith(origin) && !url.pathname.startsWith("/api/"), route => route.abort());
  const page = await context.newPage();
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(origin + "/ngo/requests/new?draft=42");
  await page.getByRole("heading", { name: "What does your organization need?" }).waitFor();
  await page.getByRole("link", { name: "NGO Approved", exact: true }).waitFor({ state: width < 768 ? "attached" : "visible" });
  const colors = await page.getByRole("button", { name: "Submit for review" }).evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
  assert.notEqual(colors.background, "rgba(0, 0, 0, 0)");
  assert.notEqual(colors.background, colors.color);
  await page.getByLabel("Item needed").fill("School bags for children");
  await page.screenshot({ path: `${output}/request-${width}.png`, fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.getByRole("button", { name: "Submit for review" }).click();
  await page.waitForURL("**/ngo/requests");
  await page.getByText("pending verification", { exact: true }).waitFor();
  photoDue = true;
  await page.goto(origin + "/ngo/handovers?request=42");
  await page.getByText("School bags", { exact: true }).waitFor();
  await page.locator('input[type="file"]').waitFor();
  await page.screenshot({ path: `${output}/handover-${width}.png`, fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.locator('input[type="file"]').setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: Buffer.from("synthetic-browser-fixture") });
  await page.getByText("Thank you! Your handover photo has been saved.", {exact:true}).waitFor();
  await page.getByText("Handover photo saved. Thank you!", {exact:true}).waitFor();
  failOverview = true;
  await page.reload();
  await page.getByRole("button", { name: "Retry" }).waitFor();
  assert.equal(await page.getByText("No handovers to show yet", { exact: false }).count(), 0);
  await page.screenshot({ path: `${output}/error-${width}.png`, fullPage: true });
  assert.deepEqual(errors, []);
  outcomes.push({ width, draftSubmit: true, proofUpload: true, errorRecovery: true, horizontalOverflow: false, pageErrors: errors });
  await context.close();
 }
 console.log(JSON.stringify({ syntheticApiFixtures: true, outcomes }, null, 2));
} finally { await browser.close(); }
