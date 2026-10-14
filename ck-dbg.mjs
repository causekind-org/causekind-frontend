import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe", headless:"new", args:["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({width:1440,height:900});
await p.evaluateOnNewDocument(()=>{try{localStorage.setItem("ck_location_prompted","1");localStorage.setItem("ck_welcome_seen","1");}catch{}});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle2",timeout:90000});
const top = await p.evaluate(()=>document.querySelector(".ck-hiw").getBoundingClientRect().top+window.scrollY);
await p.evaluate(y=>window.scrollTo(0,y+2400), top);
await new Promise(r=>setTimeout(r,1200));
console.log(await p.evaluate(()=>{
  const card = document.querySelector(".ck-hiw h3")?.closest("div");
  const reel = document.querySelector(".ck-hiw .tabular-nums");
  if(!reel) return "NO REEL FOUND";
  const r = reel.getBoundingClientRect();
  const col = reel.querySelector("span[style*='transform'], span");
  const inner = reel.querySelectorAll("span");
  return JSON.stringify({
    reelBox:{w:Math.round(r.width),h:Math.round(r.height)},
    reelClass: reel.className.slice(0,90),
    color: getComputedStyle(reel).color,
    childCount: inner.length,
    firstChildTransform: inner[1] ? getComputedStyle(inner[1]).transform : null,
    firstChildBox: inner[1] ? JSON.stringify(inner[1].getBoundingClientRect().toJSON()).slice(0,110) : null,
    text: reel.textContent.slice(0,30),
  },null,1);
}));
await b.close();
