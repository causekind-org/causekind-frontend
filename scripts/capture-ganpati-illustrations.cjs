const puppeteer = require('puppeteer-core');

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    // 1. Desktop capture (1440x950)
    await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1.5 });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
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

    // Capture 1: Hero section
    const heroSection = await page.$('.ck-hero-frame');
    if (heroSection) {
      await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), heroSection);
      await new Promise(r => setTimeout(r, 1000));
      const pathHeroDesktop = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\hero_section_without_illustration.png';
      await heroSection.screenshot({ path: pathHeroDesktop });
      console.log('HERO_DESKTOP_CAPTURED:' + pathHeroDesktop);
    }

    // Capture 2: CTA section
    const ctaHeading = await page.evaluateHandle(() => {
      const headings = Array.from(document.querySelectorAll('h2'));
      return headings.find(h => h.textContent.includes('Remove obstacles'));
    });

    if (ctaHeading) {
      const ctaSection = await page.evaluateHandle(h => h.closest('section'), ctaHeading);
      if (ctaSection) {
        await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), ctaSection);
        await new Promise(r => setTimeout(r, 1200));
        const pathCtaDesktop = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\cta_section_without_illustration.png';
        await ctaSection.screenshot({ path: pathCtaDesktop });
        console.log('CTA_DESKTOP_CAPTURED:' + pathCtaDesktop);
      }
    }

    // Capture 3: Mobile 375px
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
    await page.reload({ waitUntil: 'domcontentloaded' });
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

    const mobileHeroSection = await page.$('.ck-hero-frame');
    if (mobileHeroSection) {
      await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), mobileHeroSection);
      await new Promise(r => setTimeout(r, 1000));
      const pathMobileHero = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\hero_mobile_without_illustration.png';
      await mobileHeroSection.screenshot({ path: pathMobileHero });
      console.log('MOBILE_HERO_CAPTURED:' + pathMobileHero);
    }

  } finally {
    await browser.close();
  }
}

capture().catch(err => {
  console.error('CAPTURE_ERROR:', err);
  process.exit(1);
});
