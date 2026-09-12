const puppeteer = require('puppeteer-core');
const path = require('path');

async function capture() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const brainDir = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\e6211fd5-91f8-4818-851d-795d1ac6275b';

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // 1. Desktop View (1440 x 860)
    console.log('Capturing Desktop...');
    await page.setViewport({ width: 1440, height: 860, deviceScaleFactor: 1 });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => {
      localStorage.setItem('causekind_location_prompted', 'true');
      localStorage.setItem('causekind_cookie_consent', 'accepted');
      document.querySelectorAll('[data-cookie-banner], [role="dialog"]').forEach(el => el.remove());
    });
    await new Promise(r => setTimeout(r, 2000));

    const desktopPath = path.join(brainDir, 'ganpati_hero_desktop.png');
    await page.screenshot({ path: desktopPath });
    console.log('DESKTOP_CAPTURED:' + desktopPath);

    // 1b. Desktop 1920 View (1920 x 960)
    console.log('Capturing Desktop 1920...');
    await page.setViewport({ width: 1920, height: 960, deviceScaleFactor: 1 });
    await new Promise(r => setTimeout(r, 1500));
    const desktop1920Path = path.join(brainDir, 'ganpati_hero_desktop_1920.png');
    await page.screenshot({ path: desktop1920Path });
    console.log('DESKTOP_1920_CAPTURED:' + desktop1920Path);

    // 2. Mobile View (390 x 980)
    console.log('Capturing Mobile...');
    await page.setViewport({ width: 390, height: 980, isMobile: true, hasTouch: true, deviceScaleFactor: 1.5 });
    await new Promise(r => setTimeout(r, 2000));

    const mobilePath = path.join(brainDir, 'ganpati_hero_mobile.png');
    await page.screenshot({ path: mobilePath });
    console.log('MOBILE_CAPTURED:' + mobilePath);

  } finally {
    await browser.close();
  }
}

capture().catch(err => {
  console.error('CAPTURE_ERROR:', err);
  process.exit(1);
});
