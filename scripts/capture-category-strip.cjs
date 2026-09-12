const puppeteer = require('puppeteer-core');

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 }
  });

  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Remove any backdrop or modal overlay from DOM
    await page.evaluate(() => {
      // Remove cookie banners, dialogs, overlays
      const overlays = document.querySelectorAll('[role="dialog"], [data-state="open"], .fixed.inset-0');
      overlays.forEach(el => {
        if (!el.contains(document.querySelector('nav[aria-label*="Category"]'))) {
          el.remove();
        }
      });
      document.body.style.filter = 'none';
      document.documentElement.style.filter = 'none';
    });

    await new Promise(r => setTimeout(r, 1000));

    // Find the category strip nav element
    const categoryNav = await page.$('nav[aria-label*="Category"]');
    if (categoryNav) {
      await categoryNav.screenshot({
        path: 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\category_strip_updated.png'
      });
      console.log('High-res Category strip screenshot saved successfully!');
    }
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    await browser.close();
  }
}

capture();
