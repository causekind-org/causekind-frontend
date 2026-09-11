const puppeteer = require('puppeteer-core');

async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 950 });
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
    
    for (let i = 0; i < 6; i++) {
      const state = await page.evaluate(() => {
        const el = document.querySelector('section[aria-labelledby="audience-pathways-heading"]');
        return {
          hasSection: !!el,
          localStorageKeys: Object.keys(localStorage),
          ck_user: localStorage.getItem('ck_user'),
        };
      });
      console.log(`Check at ${i * 1.5}s:`, JSON.stringify(state));
      if (state.hasSection) break;
      await new Promise(r => setTimeout(r, 1500));
    }
  } finally {
    await browser.close();
  }
}

test().catch(console.error);
