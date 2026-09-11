const puppeteer = require('puppeteer-core');

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const viewports = [
      { name: '375', width: 375, height: 812 },
      { name: '1280', width: 1280, height: 800 },
      { name: '1440', width: 1440, height: 900 },
      { name: '1920', width: 1920, height: 1080 }
    ];

    for (const vp of viewports) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
      await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));

      // Remove overlays
      await page.evaluate(() => {
        const overlays = document.querySelectorAll('[role="dialog"], [data-state="open"], .fixed.inset-0');
        overlays.forEach(el => {
          if (!el.contains(document.querySelector('section[data-tour="guest-hero"]'))) {
            el.remove();
          }
        });
        document.body.style.filter = 'none';
        document.documentElement.style.filter = 'none';
      });

      await new Promise(r => setTimeout(r, 500));

      const hero = await page.$('section[data-tour="guest-hero"]');
      if (hero) {
        await hero.screenshot({
          path: `C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\hero_ganpati_${vp.name}.png`
        });
        console.log(`Hero screenshot at ${vp.width}px saved!`);
      }
      await page.close();
    }
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    await browser.close();
  }
}

capture();
