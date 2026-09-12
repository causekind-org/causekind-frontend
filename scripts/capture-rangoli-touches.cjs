const puppeteer = require('puppeteer-core');

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    // 1. Desktop capture (1440x1050)
    await page.setViewport({ width: 1440, height: 1050, deviceScaleFactor: 1 });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    await page.addStyleTag({
      content: `
        nextjs-portal, [role="dialog"], [data-radix-portal], [aria-labelledby="location-gate-title"], [aria-label="Dismiss location request"], .fixed.bottom-0.z-50, .fixed.bottom-4 {
          display: none !important;
        }
      `
    });
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    // Section 1: "Verified · Local · In your hands" stats section (BeTheChangeSection)
    const statsHeading = await page.evaluateHandle(() => {
      const headings = Array.from(document.querySelectorAll('h2'));
      return headings.find(h => h.textContent.includes('Verified') && h.textContent.includes('Local'));
    });

    if (statsHeading) {
      const statsSection = await page.evaluateHandle(h => h.closest('section'), statsHeading);
      if (statsSection) {
        await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), statsSection);
        await new Promise(r => setTimeout(r, 1000));
        const pathStatsDesktop = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\stats_rangoli_desktop.png';
        await statsSection.screenshot({ path: pathStatsDesktop });
        console.log('STATS_DESKTOP_CAPTURED:' + pathStatsDesktop);
      }
    }

    // Section 2: Step-strip section (ItemDonationScrolly #how) - top border
    const scrollySection = await page.$('#how');
    if (scrollySection) {
      await page.evaluate(el => {
        const top = el.offsetTop + window.innerHeight * 0.5;
        window.scrollTo(0, top);
      }, scrollySection);
      await new Promise(r => setTimeout(r, 1500));
      const pathScrollyDesktop = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\scrolly_borders_desktop.png';
      await page.screenshot({ path: pathScrollyDesktop });
      console.log('SCROLLY_DESKTOP_CAPTURED:' + pathScrollyDesktop);

      // Scroll near bottom of scrolly section to see bottom border
      await page.evaluate(el => {
        const top = el.offsetTop + el.offsetHeight - window.innerHeight;
        window.scrollTo(0, top);
      }, scrollySection);
      await new Promise(r => setTimeout(r, 1500));
      const pathScrollyBottomDesktop = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\scrolly_bottom_border_desktop.png';
      await page.screenshot({ path: pathScrollyBottomDesktop });
      console.log('SCROLLY_BOTTOM_DESKTOP_CAPTURED:' + pathScrollyBottomDesktop);
    }

    // 2. Mobile 375px capture
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

    // Find visible stats section on mobile
    const mobileStatsHeading = await page.evaluateHandle(() => {
      const headings = Array.from(document.querySelectorAll('h2'));
      return headings.find(h => {
        const rect = h.getBoundingClientRect();
        return rect.height > 0 && h.textContent.includes('Verified') && h.textContent.includes('Local');
      });
    });

    if (mobileStatsHeading) {
      const mobileStatsSection = await page.evaluateHandle(h => h.closest('section'), mobileStatsHeading);
      if (mobileStatsSection) {
        await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), mobileStatsSection);
        await new Promise(r => setTimeout(r, 1000));
        const pathStatsMobile = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\stats_rangoli_mobile_375.png';
        await mobileStatsSection.screenshot({ path: pathStatsMobile });
        console.log('STATS_MOBILE_CAPTURED:' + pathStatsMobile);
      }
    }

    // Mobile Step-strip section (#how)
    const mobileScrolly = await page.$('#how');
    if (mobileScrolly) {
      await page.evaluate(el => {
        const top = el.offsetTop + window.innerHeight * 0.3;
        window.scrollTo(0, top);
      }, mobileScrolly);
      await new Promise(r => setTimeout(r, 1500));
      const pathScrollyMobile = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\scrolly_borders_mobile_375.png';
      await page.screenshot({ path: pathScrollyMobile });
      console.log('SCROLLY_MOBILE_CAPTURED:' + pathScrollyMobile);
    }

  } finally {
    await browser.close();
  }
}

capture().catch(err => {
  console.error('CAPTURE_ERROR:', err);
  process.exit(1);
});
