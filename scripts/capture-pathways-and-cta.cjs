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
    
    // Wait for auth check to finish (timeout on localhost:8080)
    await new Promise(r => setTimeout(r, 6500));
    
    await page.addStyleTag({
      content: `
        nextjs-portal, [role="dialog"], [data-radix-portal], [aria-labelledby="location-gate-title"], [aria-label="Dismiss location request"], .fixed.bottom-0.z-50, .fixed.bottom-4, aside {
          display: none !important;
        }
        /* Ensure framer motion containers are visible */
        [style*="opacity: 0"] {
          opacity: 1 !important;
        }
      `
    });
    await page.keyboard.press('Escape');

    // 1. Audience Pathways ("This Ganeshotsav, Whichever Side You're On")
    const pathwaysEl = await page.$('#audience-pathways-heading');
    if (pathwaysEl) {
      const container = await page.evaluateHandle(el => el.closest('section') || el.parentElement.parentElement, pathwaysEl);
      await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), container);
      await new Promise(r => setTimeout(r, 1000));
      const p = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\pathways_badge_section.png';
      await container.screenshot({ path: p });
      console.log('PATHWAYS_CAPTURED:' + p);
    } else {
      console.log('PATHWAYS_NOT_FOUND_AFTER_WAIT');
    }

    // 2. CTA Section ("Remove obstacles for someone today")
    const ctaHeading = await page.evaluateHandle(() => {
      const headings = Array.from(document.querySelectorAll('h2'));
      return headings.find(h => h.textContent.includes('Remove obstacles'));
    });
    if (ctaHeading && (await ctaHeading.asElement())) {
      const ctaSection = await page.evaluateHandle(h => h.closest('section'), ctaHeading);
      await page.evaluate(el => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }, ctaSection);
      await new Promise(r => setTimeout(r, 1000));
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
