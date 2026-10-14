import { chromium } from "playwright";
(async () => {
  const browser = await chromium.launch({ headless: false, channel: "chrome" });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://localhost:3000/login");
  console.log("READY_FOR_LOGIN");
  // Keep alive so user can login
  await new Promise(resolve => setTimeout(resolve, 3600000));
})();
