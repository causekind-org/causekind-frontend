import puppeteer from "puppeteer-core";
const OUT = process.argv[2];
const b = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new", args: ["--no-sandbox","--hide-scrollbars"],
});
async function open(w, h, mobile, reduce) {
  const p = await b.newPage();
  if (reduce) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await p.setViewport({ width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  await p.evaluateOnNewDocument(() => { try {
    localStorage.setItem("ck_location_prompted","1"); localStorage.setItem("ck_welcome_seen","1");
  } catch {} });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 90000 });
  return p;
}
// Desktop: scroll into the pinned section and sample it at two progress points.
{
  const p = await open(1440, 900, false, false);
  const top = await p.evaluate(() => {
    const s = document.querySelector(".ck-hiw");
    return s ? s.getBoundingClientRect().top + window.scrollY : -1;
  });
  console.log("hiw offsetTop =", Math.round(top));
  for (const [label, extra] of [["early", 300], ["late", 2400]]) {
    await p.evaluate((y) => window.scrollTo(0, y), top + extra);
    await new Promise(r => setTimeout(r, 1200));
    await p.screenshot({ path: `${OUT}/hiw-desktop-${label}.png` });
    const lit = await p.evaluate(() => document.querySelectorAll(".ck-hiw [class*='border-\[var(--ck-home-accent']").length);
    console.log(`  ${label}: lit cards = ${lit}`);
  }
  await p.close();
}
// Reduced motion: must show everything, unpinned.
{
  const p = await open(1440, 900, false, true);
  const r = await p.evaluate(() => {
    const s = document.querySelector(".ck-hiw");
    return { h: Math.round(s.getBoundingClientRect().height), pinned: !!document.querySelector(".pin-spacer") };
  });
  console.log("reduced-motion: sectionHeight =", r.h, "| pin-spacer present =", r.pinned);
  await p.evaluate(() => document.querySelector(".ck-hiw").scrollIntoView({ block: "center" }));
  await new Promise(r => setTimeout(r, 600));
  await p.screenshot({ path: `${OUT}/hiw-desktop-reduced.png` });
  await p.close();
}
// Mobile
{
  const p = await open(390, 844, true, false);
  const r = await p.evaluate(() => {
    const de = document.documentElement;
    return { overflow: de.scrollWidth - de.clientWidth, pinned: !!document.querySelector(".pin-spacer") };
  });
  console.log("mobile: horizontal overflow =", r.overflow, "px | pin-spacer =", r.pinned);
  const top = await p.evaluate(() => document.querySelector(".ck-hiw").getBoundingClientRect().top + window.scrollY);
  await p.evaluate((y) => window.scrollTo(0, y - 60), top);
  await new Promise(r => setTimeout(r, 900));
  const el = await p.$(".ck-hiw");
  await el.screenshot({ path: `${OUT}/hiw-mobile.png` });
  await p.close();
}
await b.close();
