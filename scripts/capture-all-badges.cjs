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
        nextjs-portal, [role="dialog"], [data-radix-portal], [aria-labelledby="location-gate-title"], [aria-label="Dismiss location request"], .fixed.bottom-0.z-50, .fixed.bottom-4, aside {
          display: none !important;
        }
      `
    });
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    // 1. Hero Section
    const heroSection = await page.$('.ck-hero-frame');
    if (heroSection) {
      await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), heroSection);
      await new Promise(r => setTimeout(r, 1000));
      const p = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\hero_badge_section.png';
      await heroSection.screenshot({ path: p });
      console.log('HERO_CAPTURED:' + p);
    }

    // 2. Audience Pathways ("This Ganeshotsav, Whichever Side You're On")
    const pathwaysEl = await page.$('#audience-pathways-heading');
    if (pathwaysEl) {
      const pathwaysSection = await page.evaluateHandle(el => el.closest('section') || el.closest('div.relative.isolate') || el.parentElement.parentElement, pathwaysEl);
      await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), pathwaysSection);
      await new Promise(r => setTimeout(r, 1200));
      const p = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\pathways_badge_section.png';
      await pathwaysSection.screenshot({ path: p });
      console.log('PATHWAYS_CAPTURED:' + p);
    } else {
      console.log('PATHWAYS_NOT_FOUND');
    }

    // 3. Live Needs ("Real people, real needs")
    const liveNeedsSection = await page.$('section[aria-label*="community needs"]');
    if (liveNeedsSection) {
      await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }), liveNeedsSection);
      await new Promise(r => setTimeout(r, 1200));
      const p = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\live_needs_badge_section.png';
      await liveNeedsSection.screenshot({ path: p });
      console.log('LIVE_NEEDS_CAPTURED:' + p);
    } else {
      console.log('LIVE_NEEDS_NOT_FOUND');
    }

    // 4. Be The Change ("Verified. Local. In your hands.")
    const btcHeading = await page.evaluateHandle(() => {
      const headings = Array.from(document.querySelectorAll('h2'));
      return headings.find(h => h.textContent.includes('Verified.'));
    });
    if (btcHeading && (await btcHeading.asElement())) {
      const btcSection = await page.evaluateHandle(h => h.closest('section') || h.closest('div.relative') || h.parentElement.parentElement, btcHeading);
      await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), btcSection);
      await new Promise(r => setTimeout(r, 1200));
      const p = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\be_the_change_badge_section.png';
      await btcSection.screenshot({ path: p });
      console.log('BTC_CAPTURED:' + p);
    } else {
      console.log('BTC_NOT_FOUND');
    }

    // 5. CTA Section ("Remove obstacles for someone today")
    const ctaHeading = await page.evaluateHandle(() => {
      const headings = Array.from(document.querySelectorAll('h2'));
      return headings.find(h => h.textContent.includes('Remove obstacles'));
    });
    if (ctaHeading && (await ctaHeading.asElement())) {
      const ctaSection = await page.evaluateHandle(h => h.closest('section'), ctaHeading);
      await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), ctaSection);
      await new Promise(r => setTimeout(r, 1200));
      const p = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\cta_badge_section.png';
      await ctaSection.screenshot({ path: p });
      console.log('CTA_CAPTURED:' + p);
    } else {
      console.log('CTA_NOT_FOUND');
    }

    console.log('ALL_BADGE_SCREENSHOTS_COMPLETED');
  } finally {
    await browser.close();
  }
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
