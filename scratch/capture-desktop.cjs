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
    '--window-size=1440,2400',
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
  await send('Runtime.enable');

  await send('Page.navigate', { url: 'http://localhost:3000' });
  await new Promise(r => setTimeout(r, 2000));

  // Dismiss modal if present or set sessionStorage
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        sessionStorage.setItem('ganpati_welcome_shown', 'true');
        const modalBtn = document.querySelector('button[aria-label="Close"], button:has-text("Morya")');
        if (modalBtn) modalBtn.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  // Capture full desktop page
  const shot1440 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'ganpati_page_verified_1440.png'), Buffer.from(shot1440.result.data, 'base64'));
  console.log('Saved ganpati_page_verified_1440.png');

  // Activate Donee side
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

  const shotDonee = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'ganpati_page_donee_active_1440.png'), Buffer.from(shotDonee.result.data, 'base64'));
  console.log('Saved ganpati_page_donee_active_1440.png');

  ws.close();
  edge.kill();
  console.log('Finished capturing screenshots.');
}

main().catch(console.error);
