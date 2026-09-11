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
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.addStyleTag({
      content: `
        nextjs-portal, [role="dialog"], [data-radix-portal], [aria-labelledby="location-gate-title"], [aria-label="Dismiss location request"], .fixed.bottom-0.z-50, .fixed.bottom-4, aside {
          display: none !important;
        }
      `
    });
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    // 1. Audience Pathways ("This Ganeshotsav, Whichever Side You're On")
    try {
      await page.waitForSelector('#audience-pathways-heading', { timeout: 8000 });
      const pathwaysEl = await page.$('#audience-pathways-heading');
      if (pathwaysEl) {
        const pathwaysContainer = await page.evaluateHandle(el => {
          return el.closest('section') || el.closest('.ck-ganpati-active > div') || el.parentElement.parentElement;
        }, pathwaysEl);
        await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), pathwaysContainer);
        await new Promise(r => setTimeout(r, 1500));
        const p = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\pathways_badge_section.png';
        await pathwaysContainer.screenshot({ path: p });
        console.log('PATHWAYS_CAPTURED:' + p);
      }
    } catch (e) {
      console.log('Pathways wait error:', e.message);
    }

    // 2. CTA Section
    const ctaHeading = await page.evaluateHandle(() => {
      const headings = Array.from(document.querySelectorAll('h2'));
      return headings.find(h => h.textContent.includes('Remove obstacles'));
    });
    if (ctaHeading && (await ctaHeading.asElement())) {
      const ctaSection = await page.evaluateHandle(h => h.closest('section'), ctaHeading);
      // Scroll down to trigger framer motion in-view
      await page.evaluate(el => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        window.scrollBy(0, 10);
      }, ctaSection);
      await new Promise(r => setTimeout(r, 2000));
      const p = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\cta_badge_section.png';
      await ctaSection.screenshot({ path: p });
      console.log('CTA_CAPTURED:' + p);
    }

  } finally {
    await browser.close();
  }
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
