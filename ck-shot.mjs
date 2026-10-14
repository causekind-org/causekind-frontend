import puppeteer from "puppeteer-core";
const OUT = process.argv[2];
const b = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new", args: ["--no-sandbox", "--hide-scrollbars"],
});
const shots = [
  { name: "desktop", w: 1440, h: 900, scale: 1 },
  { name: "mobile", w: 390, h: 844, scale: 2 },
];
for (const s of shots) {
  const p = await b.newPage();
  await p.setViewport({ width: s.w, height: s.h, deviceScaleFactor: s.scale, isMobile: s.name === "mobile", hasTouch: s.name === "mobile" });
  // Suppress the first-visit overlays (location gate, welcome, tour) so the
  // capture shows the page rather than a blurred backdrop behind a modal.
  await p.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem("ck_location_prompted", "1");
      localStorage.setItem("ck_welcome_seen", "1");
      localStorage.setItem("ck_tour_done", "1");
      localStorage.setItem("ck_cookie_consent", "declined");
    } catch {}
  });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 90000 });
  // Belt and braces: dismiss anything still up.
  await p.evaluate(() => {
    document.querySelectorAll("button").forEach(b => {
      if (/maybe later|not now|dismiss|skip/i.test(b.textContent || "")) b.click();
    });
  });
  await new Promise(r => setTimeout(r, 400));
  // Walk the page so scroll-triggered sections settle.
  await p.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 500));
  });
  const h = await p.evaluate(() => document.body.scrollHeight);
  console.log(`${s.name}: pageHeight=${h}px`);
  // Section-by-section captures of the new work.
  for (const label of ["gap", "journey", "proof"]) {
    // Both responsive trees are in the DOM; pick the one actually rendered.
    const sec = await p.evaluateHandle((lbl) => {
      const texts = { gap: "The problem isn", journey: "doesn", proof: "Three numbers" };
      const all = [...document.querySelectorAll("section")];
      return all.find(s => s.offsetParent !== null && s.textContent.includes(texts[lbl])) || null;
    }, label);
    if (!sec.asElement()) { console.log(`  ${label}: ABSENT/hidden`); continue; }
    const id = label;
    await p.evaluate((e) => e.scrollIntoView({ block: "center" }), sec);
    await new Promise(r => setTimeout(r, 700));
    try {
      await sec.asElement().screenshot({ path: `${OUT}/${s.name}-${id}.png` });
      console.log(`  ${id}: captured`);
    } catch (err) { console.log(`  ${id}: ${err.message.slice(0,60)}`); }
  }
  await p.close();
}
await b.close();
