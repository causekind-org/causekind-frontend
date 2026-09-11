const puppeteer = require('puppeteer-core');

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1050, deviceScaleFactor: 1 });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    await page.addStyleTag({
      content: `
        nextjs-portal, [role="dialog"], [data-radix-portal], [aria-labelledby="location-gate-title"], [aria-label="Dismiss location request"] {
          display: none !important;
        }
      `
    });
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    // Find the Audience Pathways section
    const sectionHandle = await page.waitForSelector('section[aria-labelledby="audience-pathways-heading"]', { timeout: 15000 });

    // Scroll into view
    await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), sectionHandle);
    await new Promise(r => setTimeout(r, 1000));

    // 1. Capture DEFAULT STATE
    const defaultPath = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\audience_pathways_default.png';
    await sectionHandle.screenshot({ path: defaultPath });
    console.log('DEFAULT_CAPTURED:' + defaultPath);

    // 2. Hover the donor side panel
    // Find the donor link or donor area
    const donorCta = await page.$('a[href="/register?role=DONOR"]');
    if (donorCta) {
      await donorCta.hover();
    } else {
      // Hover left side of the slab
      const box = await sectionHandle.boundingBox();
      await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.55);
    }
    await new Promise(r => setTimeout(r, 800));

    // Capture HOVER STATE
    const hoverPath = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\audience_pathways_donor_hover.png';
    await sectionHandle.screenshot({ path: hoverPath });
    console.log('HOVER_CAPTURED:' + hoverPath);

    // 3. Mobile 375px capture
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    await page.addStyleTag({
      content: `
        nextjs-portal, [role="dialog"], [data-radix-portal], [aria-labelledby="location-gate-title"], [aria-label="Dismiss location request"] {
          display: none !important;
        }
      `
    });
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    const sections = await page.$$('section[aria-labelledby="audience-pathways-heading"]');
    for (const sec of sections) {
      const box = await sec.boundingBox();
      if (box && box.height > 50) {
        await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), sec);
        await new Promise(r => setTimeout(r, 1000));
        const mobilePath = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\audience_pathways_mobile_375.png';
        await sec.screenshot({ path: mobilePath });
        console.log('MOBILE_CAPTURED:' + mobilePath);
        break;
      }
    }

  } finally {
    await browser.close();
  }
}

capture().catch(err => {
  console.error('CAPTURE_ERROR:', err);
  process.exit(1);
});
