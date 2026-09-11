const puppeteer = require('puppeteer-core');

async function check() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 860 });
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  const info = await page.evaluate(() => {
    const img = document.querySelector('.ck-showcase-hero img');
    if (!img) return 'No img found';
    const r = img.getBoundingClientRect();
    return {
      src: img.src,
      left: r.left,
      right: r.right,
      width: r.width,
      height: r.height,
      currentSrc: img.currentSrc
    };
  });
  console.log('Image info:', info);
  await browser.close();
}

check().catch(console.error);
