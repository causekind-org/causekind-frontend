const puppeteer = require('puppeteer-core');

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1.5 });
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    await page.addStyleTag({
      content: `
        nextjs-portal, [role="dialog"], [data-radix-portal],
        [aria-labelledby="location-gate-title"],
        [aria-label="Dismiss location request"],
        .fixed.bottom-0.z-50, .fixed.bottom-4, aside {
          display: none !important;
        }
      `
    });
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    const section = await page.$('section[aria-label*="community needs"]');
    if (section) {
      await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }), section);
      await new Promise(r => setTimeout(r, 1200));
      const p = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\live_needs_updated.png';
      await section.screenshot({ path: p });
      console.log('CAPTURED:' + p);
    } else {
      console.log('SECTION_NOT_FOUND');
    }
  } finally {
    await browser.close();
  }
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
