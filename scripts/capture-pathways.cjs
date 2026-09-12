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
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4500));
    
    await page.addStyleTag({
      content: `
        nextjs-portal, [role="dialog"], [data-radix-portal], [aria-labelledby="location-gate-title"], [aria-label="Dismiss location request"], .fixed.bottom-0.z-50, .fixed.bottom-4, aside {
          display: none !important;
        }
      `
    });

    const hasHeading = await page.evaluate(() => !!document.getElementById('audience-pathways-heading'));
    console.log('HAS_AUDIENCE_HEADING:', hasHeading);
    if (hasHeading) {
      const el = await page.$('#audience-pathways-heading');
      const container = await page.evaluateHandle(h => h.closest('section') || h.parentElement.parentElement, el);
      await page.evaluate(c => c.scrollIntoView({ behavior: 'instant', block: 'center' }), container);
      await new Promise(r => setTimeout(r, 1000));
      const p = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\pathways_badge_section.png';
      await container.screenshot({ path: p });
      console.log('PATHWAYS_CAPTURED:' + p);
    }
  } finally {
    await browser.close();
  }
}

capture().catch(console.error);
