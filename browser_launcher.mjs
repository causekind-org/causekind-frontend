import { chromium } from "playwright";

(async () => {
  try {
    const browser = await chromium.launch({ 
      headless: false, 
      channel: "chrome",
      args: ["--remote-debugging-port=9222"]
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("http://localhost:3000/login");
    console.log("READY");

    // Keep alive
    await new Promise(() => {});
  } catch (e) {
    console.error("FAILED TO LAUNCH:", e);
    process.exit(1);
  }
})();
