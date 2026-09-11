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
    await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1 });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for Next.js SSR hydration and animations to settle
    await new Promise(r => setTimeout(r, 4000));

    const outputPath = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\hero_section_fixed.png';
    await page.screenshot({
      path: outputPath,
      clip: { x: 0, y: 0, width: 1440, height: 920 }
    });
    console.log('CAPTURE_SUCCESS:' + outputPath);
  } finally {
    await browser.close();
  }
}

capture().catch(err => {
  console.error('CAPTURE_ERROR:', err);
  process.exit(1);
});
