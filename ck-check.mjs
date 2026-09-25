import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new", args: ["--no-sandbox", "--hide-scrollbars"],
});
const widths = [360, 390, 430, 768, 1024, 1440];
for (const w of widths) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: 800, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => {
    try { localStorage.setItem("ck_location_prompted","1"); localStorage.setItem("ck_welcome_seen","1"); } catch {}
  });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 90000 });
  const r = await p.evaluate(() => {
    const de = document.documentElement;
    const overflow = de.scrollWidth - de.clientWidth;
    // Which elements actually stick out past the viewport.
    const guilty = [];
    if (overflow > 0) {
      for (const el of document.querySelectorAll("body *")) {
        const b = el.getBoundingClientRect();
        if (b.width === 0) continue;
        if (b.right > de.clientWidth + 1 || b.left < -1) {
          const cs = getComputedStyle(el);
          if (cs.position === "fixed") continue;
          guilty.push(`${el.tagName.toLowerCase()}.${(el.className||"").toString().slice(0,50)} right=${Math.round(b.right)}`);
        }
      }
    }
    return { overflow, guilty: guilty.slice(0, 4) };
  });
  console.log(`${String(w).padStart(4)}px  overflow=${r.overflow}px ${r.guilty.length ? "\n        " + r.guilty.join("\n        ") : ""}`);
  await p.close();
}
await b.close();
