const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function testPositions() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });

  const positions = [
    { name: 'pos1_72_top', pos: '72% 0%' },
    { name: 'pos2_75_15', pos: '75% 15%' },
    { name: 'pos3_72_25', pos: '72% 25%' },
    { name: 'pos4_78_top', pos: '78% 0%' },
    { name: 'pos5_78_15', pos: '78% 15%' },
    { name: 'pos6_68_top', pos: '68% 0%' },
  ];

  for (const p of positions) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));

    await page.evaluate((objPos) => {
      const img = document.querySelector('.ck-lead-hero-stage img');
      if (img) {
        img.style.objectPosition = objPos;
      }
      const overlays = document.querySelectorAll('[role="dialog"], [data-state="open"]');
      overlays.forEach(el => el.remove());
    }, p.pos);

    await new Promise(r => setTimeout(r, 400));
    const hero = await page.$('section[data-tour="guest-hero"]');
    if (hero) {
      await hero.screenshot({
        path: `C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\hero_test_${p.name}.png`
      });
    }
    await page.close();
  }

  await browser.close();
  console.log('Finished testing positions');
}

testPositions().catch(console.error);
