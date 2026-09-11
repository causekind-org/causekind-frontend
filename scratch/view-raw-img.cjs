const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage();
  const imgPath = 'd:/causekind/causekind-frontend/public/images/ganpati-hero-hd.webp';
  const data = fs.readFileSync(imgPath).toString('base64');
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0; background:#222; display:flex; align-items:center; justify-content:center;">
        <img src="data:image/webp;base64,${data}" style="max-width:100%; height:auto;" />
      </body>
    </html>
  `);
  await page.setViewport({ width: 1920, height: 1080 });
  await page.screenshot({ path: 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d\\raw_hero_image.png', fullPage: true });
  await browser.close();
  console.log('Saved raw_hero_image.png');
}

main().catch(console.error);
