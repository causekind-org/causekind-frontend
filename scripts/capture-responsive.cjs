const puppeteer = require('puppeteer-core');
const path = require('path');

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    
    // 1. Desktop capture (1440x950)
    await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1 });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    const desktopPath = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\hero_desktop.png';
    await page.screenshot({
      path: desktopPath,
      clip: { x: 0, y: 0, width: 1440, height: 960 }
    });
    console.log('DESKTOP_SUCCESS:' + desktopPath);

    // 2. Mobile 375px capture (iPhone SE / standard 375px)
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    const mobileHeroPath = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\mobile_hero_375.png';
    await page.screenshot({
      path: mobileHeroPath,
      clip: { x: 0, y: 0, width: 375, height: 900 }
    });
    console.log('MOBILE_HERO_SUCCESS:' + mobileHeroPath);

    // Full page mobile capture
    const mobileFullPath = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\mobile_full_375.png';
    await page.screenshot({
      path: mobileFullPath,
      fullPage: true
    });
    console.log('MOBILE_FULL_SUCCESS:' + mobileFullPath);

  } finally {
    await browser.close();
  }
}

capture().catch(err => {
  console.error('CAPTURE_ERROR:', err);
  process.exit(1);
});
