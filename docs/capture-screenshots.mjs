// Captures the README screenshots from a throwaway headless Chrome profile (in the
// temp folder) with the extension loaded unpacked. Nothing touches your real Chrome profile.
// Usage: node docs/capture-screenshots.mjs <output folder>, e.g. docs/images
// Popup and Options show sample content (two banners hidden, two sites) set by the script.
// Talks to Chrome over --remote-debugging-pipe, the only transport that allows
// Extensions.loadUnpacked (Chrome 137+ ignores --load-extension).
import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EXT = join(import.meta.dirname, '..');
const OUT = process.argv[2];
const PROFILE = join(tmpdir(), 'itsm-banner-toggle-screenshots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(PROFILE, { recursive: true, force: true });
mkdirSync(PROFILE, { recursive: true });
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', `--user-data-dir=${PROFILE}`, '--remote-debugging-pipe', '--enable-unsafe-extension-debugging',
  '--force-dark-mode', '--hide-scrollbars', '--window-size=1280,800', 'about:blank',
], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
const toChrome = chrome.stdio[3];
const fromChrome = chrome.stdio[4];

// CDP over the pipe: JSON messages separated by NUL bytes.
let id = 0;
const pending = new Map();
let buffer = '';
fromChrome.on('data', (chunk) => {
  buffer += chunk.toString('utf8');
  let end;
  while ((end = buffer.indexOf('\0')) >= 0) {
    const msg = JSON.parse(buffer.slice(0, end));
    buffer = buffer.slice(end + 1);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  }
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const n = ++id;
  pending.set(n, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  toChrome.write(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
});

const { id: extId } = await send('Extensions.loadUnpacked', { path: EXT });
console.log('extension id', extId);
const base = `chrome-extension://${extId}`;

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId: s } = await send('Target.attachToTarget', { targetId, flatten: true });
const page = (method, params) => send(method, params, s);
const evaluate = async (expression) =>
  (await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;

async function open(url, width, height) {
  await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1.5, mobile: false });
  await page('Page.navigate', { url });
  await sleep(1500);
}

async function shot(name, clip) {
  const { data } = await page('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
  writeFileSync(join(OUT, name), Buffer.from(data, 'base64'));
  console.log('saved', name);
}

await page('Page.enable');
await page('Runtime.enable');

// 1. Extensions page: Developer mode switched on, with it and Load unpacked outlined.
await open('chrome://extensions/', 1100, 560);
console.log(await evaluate(`(async () => {
  const mgr = document.querySelector('extensions-manager');
  const toolbar = mgr.shadowRoot.querySelector('extensions-toolbar').shadowRoot;
  const dev = toolbar.querySelector('#devMode');
  if (!dev.checked) dev.click();
  await new Promise((r) => setTimeout(r, 800));
  for (const sel of ['#devMode', '#loadUnpacked']) {
    const el = toolbar.querySelector(sel);
    el.style.outline = '3px solid #ff4d4f';
    el.style.outlineOffset = '4px';
    el.style.borderRadius = '8px';
  }
  // Drop the focus ring the search box gets on load.
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  active?.blur();
  return 'developer mode: ' + dev.checked;
})()`));
await shot('chrome-extensions-page.png');

// 2. Popup, as it looks on a ServiceNow tab with two banners hidden.
await open(`${base}/popup.html`, 400, 300);
const popupBox = await evaluate(`(() => {
  render({ hidden: true, hiddenCount: 2, newCount: 0 });
  const r = document.body.getBoundingClientRect();
  return { x: 0, y: 0, width: Math.ceil(r.width), height: Math.ceil(r.height) };
})()`);
await shot('popup.png', popupBox);

// 2b. Popup on a site that hasn't been turned on yet: the first step after installing.
await open(`${base}/popup.html`, 400, 300);
const firstRunBox = await evaluate(`(() => {
  status.textContent = 'Not turned on for yourcompany.service-now.com.';
  enableSite.hidden = false;
  const r = document.body.getBoundingClientRect();
  return { x: 0, y: 0, width: Math.ceil(r.width), height: Math.ceil(r.height) };
})()`);
await shot('popup-turn-on.png', firstRunBox);

// 3. Options page, with two sample sites in the list.
await open(`${base}/options.html`, 760, 900);
const optionsBox = await evaluate(`(() => {
  const list = document.getElementById('sites');
  list.replaceChildren(new Option('yourcompany.service-now.com'), new Option('yourcompany-test.service-now.com'));
  document.getElementById('shortcut').textContent = 'Alt+Shift+B';
  const r = document.body.getBoundingClientRect();
  return { x: 0, y: 0, width: 760, height: Math.ceil(r.bottom + 8) };
})()`);
await shot('options.png', optionsBox);

await send('Browser.close').catch(() => {});
chrome.kill();
rmSync(PROFILE, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
