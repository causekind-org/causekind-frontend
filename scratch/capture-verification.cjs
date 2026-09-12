const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const ARTIFACT_DIR = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\6a6a7e0b-7b3c-4cec-985c-47e782f1833d';

async function main() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--window-size=1440,1000',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  const pageTarget = await new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json/list', (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        const list = JSON.parse(d);
        const p = list.find(t => t.type === 'page') || list[0];
        resolve(p);
      });
    }).on('error', reject);
  });

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let id = 1;
  const callbacks = new Map();

  ws.on('message', (msg) => {
    const res = JSON.parse(msg);
    if (res.id && callbacks.has(res.id)) {
      callbacks.get(res.id)(res);
      callbacks.delete(res.id);
    }
  });

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await new Promise(r => ws.on('open', r));

  await send('Page.enable');
  await send('DOM.enable');
  await send('Runtime.enable');

  await send('Page.navigate', { url: 'http://localhost:3000' });
  await new Promise(r => setTimeout(r, 2000));

  // Disable welcome modal via sessionStorage
  await send('Runtime.evaluate', {
    expression: "sessionStorage.setItem('ganpati_welcome_shown', 'true');"
  });

  await send('Page.reload');
  await new Promise(r => setTimeout(r, 2500));

  // 1. Capture Hero Section
  const evalHero = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const el = document.querySelector('section[data-tour="guest-hero"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      })()
    `,
    returnByValue: true
  });
  console.log('Hero eval:', JSON.stringify(evalHero));
  const heroClip = evalHero.result && evalHero.result.result && evalHero.result.result.value;
  if (heroClip) {
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: Math.max(0, heroClip.x), y: Math.max(0, heroClip.y), width: heroClip.width, height: heroClip.height, scale: 1 }
    });
    if (shot.result && shot.result.data) {
      fs.writeFileSync(path.join(ARTIFACT_DIR, 'hero_petals_fixed.png'), Buffer.from(shot.result.data, 'base64'));
      console.log('Saved hero_petals_fixed.png');
    }
  }

  // 2. Scroll to Pathways section & capture rest state
  await send('Runtime.evaluate', {
    expression: "document.querySelector('section[aria-labelledby=\"audience-pathways-heading\"]').scrollIntoView({ behavior: 'instant', block: 'center' });"
  });
  await new Promise(r => setTimeout(r, 1000));

  const evalPathways = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const el = document.querySelector('section[aria-labelledby="audience-pathways-heading"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      })()
    `,
    returnByValue: true
  });
  const pathwaysClip = evalPathways.result && evalPathways.result.result && evalPathways.result.result.value;
  if (pathwaysClip) {
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: Math.max(0, pathwaysClip.x), y: Math.max(0, pathwaysClip.y), width: pathwaysClip.width, height: pathwaysClip.height, scale: 1 }
    });
    if (shot.result && shot.result.data) {
      fs.writeFileSync(path.join(ARTIFACT_DIR, 'pathways_four_fixes_rest.png'), Buffer.from(shot.result.data, 'base64'));
      console.log('Saved pathways_four_fixes_rest.png');
    }
  }

  // 3. Hover / Focus Donee panel
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const doneeLink = document.querySelector('a[href="/register?role=DONEE"]');
        const doneeCard = doneeLink ? doneeLink.closest('.relative.overflow-hidden') : null;
        if (doneeCard) {
          doneeCard.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 800));

  if (pathwaysClip) {
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: Math.max(0, pathwaysClip.x), y: Math.max(0, pathwaysClip.y), width: pathwaysClip.width, height: pathwaysClip.height, scale: 1 }
    });
    if (shot.result && shot.result.data) {
      fs.writeFileSync(path.join(ARTIFACT_DIR, 'pathways_donee_active_fixed.png'), Buffer.from(shot.result.data, 'base64'));
      console.log('Saved pathways_donee_active_fixed.png');
    }
  }

  // 4. Check horizontal overflow on 1440 and 768
  const overflow1440 = await send('Runtime.evaluate', {
    expression: `({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })`,
    returnByValue: true
  });
  console.log('Overflow at 1440:', overflow1440.result?.result?.value);

  // Resize to tablet 768
  await send('Emulation.setDeviceMetricsOverride', {
    width: 768,
    height: 1024,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 600));

  const overflow768 = await send('Runtime.evaluate', {
    expression: `({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })`,
    returnByValue: true
  });
  console.log('Overflow at 768:', overflow768.result?.result?.value);

  // 5. Verify CTA button colors
  const btnStyles = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const donor = document.querySelector('a[href="/register?role=DONOR"]');
        const donee = document.querySelector('a[href="/register?role=DONEE"]');
        return {
          donorBg: donor ? window.getComputedStyle(donor).backgroundImage : null,
          doneeBg: donee ? window.getComputedStyle(donee).backgroundImage : null,
          donorClass: donor ? donor.className : null,
          doneeClass: donee ? donee.className : null
        };
      })()
    `,
    returnByValue: true
  });
  console.log('CTA Button Styles:', btnStyles.result?.result?.value);

  ws.close();
  edge.kill();
  console.log('Verification completed successfully.');
}

main().catch(console.error);
