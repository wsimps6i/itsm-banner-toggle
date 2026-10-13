const toggle = document.getElementById('hidden');
const showNew = document.getElementById('showNew');
const status = document.getElementById('status');
const hideNew = document.getElementById('hideNew');
const enableSite = document.getElementById('enableSite');
const siteMsg = document.getElementById('siteMsg');

// The active tab, looked up once. activeTab lets the popup see its address.
let currentTab = null;
const tabReady = chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  currentTab = tab || null;
});

chrome.storage.sync.get({ hidden: true, showNew: true }, (s) => {
  toggle.checked = s.hidden;
  showNew.checked = s.showNew;
  refreshStatus();
});

toggle.addEventListener('change', () => {
  chrome.storage.sync.set({ hidden: toggle.checked }, () => setTimeout(refreshStatus, 200));
});

showNew.addEventListener('change', () => {
  chrome.storage.sync.set({ showNew: showNew.checked }, () => setTimeout(refreshStatus, 200));
});

hideNew.addEventListener('click', async () => {
  render(await sendToPage('itsm-banner-ack'));
});

document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

async function sendToPage(type) {
  await tabReady;
  if (!currentTab) return null;
  try {
    return await chrome.tabs.sendMessage(currentTab.id, { type }, { frameId: 0 });
  } catch {
    return null; // Not a site the extension runs on, or the page loaded before it was turned on.
  }
}

async function refreshStatus() {
  render(await sendToPage('itsm-banner-status'));
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function render(res) {
  hideNew.hidden = true;
  enableSite.hidden = true;
  if (!res) {
    renderNotRunning();
    return;
  }
  if (!res.hidden) {
    status.textContent = 'Banners are showing.';
    return;
  }
  const parts = [];
  if (res.newCount) parts.push(`${plural(res.newCount, 'new banner')} showing.`);
  if (res.hiddenCount) parts.push(`${plural(res.hiddenCount, 'banner')} hidden.`);
  status.textContent = parts.join('\n') || 'No banners on this page.';
  if (res.newCount) {
    hideNew.hidden = false;
    hideNew.textContent = res.newCount === 1 ? 'Hide it' : 'Hide them';
  }
}

// Explains why the popup can't reach the page, and offers to turn it on there.
async function renderNotRunning() {
  await tabReady;
  const pattern = currentTab && Sites.pattern(currentTab.url);
  if (!pattern) {
    status.textContent = 'Open a ServiceNow site to use this, or add one in Options.';
    return;
  }
  if (await Sites.has(pattern)) {
    status.textContent = 'Reload the page to start hiding banners here.';
    return;
  }
  status.textContent = `Not turned on for ${Sites.host(pattern)}.`;
  enableSite.hidden = false;
}

enableSite.addEventListener('click', async () => {
  const pattern = currentTab && Sites.pattern(currentTab.url);
  if (!pattern) return;
  const granted = await Sites.add(pattern);
  siteMsg.hidden = granted;
  siteMsg.textContent = granted ? '' : `Access to ${Sites.host(pattern)} wasn't allowed, so it wasn't turned on.`;
  if (granted) setTimeout(refreshStatus, 600);
});

document.getElementById('version').textContent = `Version ${chrome.runtime.getManifest().version}`;
