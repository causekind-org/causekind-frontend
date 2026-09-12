const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d';

async function verify() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Set sessionStorage to bypass welcome modal so page is clean
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      sessionStorage.setItem('ganpati_welcome_shown', 'true');
    });
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    // 1. Hero screenshot with petals
    const heroEl = await page.$('section[data-tour="guest-hero"]');
    if (heroEl) {
      await heroEl.screenshot({ path: path.join(ARTIFACT_DIR, 'hero_falling_petals.png') });
      console.log('Saved hero_falling_petals.png');
    }

    // 2. Pathways section screenshot (Desktop 1440)
    const pathwaysSection = await page.$('section[aria-labelledby="audience-pathways-heading"]');
    if (pathwaysSection) {
      await pathwaysSection.scrollIntoView();
      await new Promise(r => setTimeout(r, 800));
      await pathwaysSection.screenshot({ path: path.join(ARTIFACT_DIR, 'pathways_four_fixes_1440.png') });
      console.log('Saved pathways_four_fixes_1440.png');
    }

    // 3. Test Donee active state to see Ganpati unclipped & orange button
    const doneePanel = await page.$('a[href="/register?role=DONEE"]');
    if (doneePanel) {
      const parentCard = await page.evaluateHandle(el => el.closest('.relative.overflow-hidden.bg-white\\/80, .relative.overflow-hidden'), doneePanel);
      if (parentCard) {
        await parentCard.hover();
        await new Promise(r => setTimeout(r, 600));
        await pathwaysSection.screenshot({ path: path.join(ARTIFACT_DIR, 'pathways_donee_active_1440.png') });
        console.log('Saved pathways_donee_active_1440.png');
      }
    }

    // 4. Test Tablet width (768px)
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(r => setTimeout(r, 600));
    const tabletOverflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth
    }));
    console.log('Tablet 768 overflow check:', tabletOverflow);
    if (pathwaysSection) {
      await pathwaysSection.screenshot({ path: path.join(ARTIFACT_DIR, 'pathways_four_fixes_768.png') });
      console.log('Saved pathways_four_fixes_768.png');
    }

    // 5. Desktop (1440px) overflow check
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise(r => setTimeout(r, 400));
    const desktopOverflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth
    }));
    console.log('Desktop 1440 overflow check:', desktopOverflow);

    // 6. Check Donee CTA button computed styles
    const doneeCtaStyle = await page.evaluate(() => {
      const btn = document.querySelector('a[href="/register?role=DONEE"]');
      const donorBtn = document.querySelector('a[href="/register?role=DONOR"]');
      return {
        doneeClass: btn?.className,
        donorClass: donorBtn?.className,
        doneeBg: btn ? window.getComputedStyle(btn).backgroundImage : null,
        donorBg: donorBtn ? window.getComputedStyle(donorBtn).backgroundImage : null
      };
    });
    console.log('CTA Button comparison:', doneeCtaStyle);

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

verify();
