// ITSM Banner Toggle - background service worker.
// Keeps the toolbar badge in step with each tab and handles the keyboard shortcut.

const BADGE = {
  off: { text: 'OFF', color: '#6e7781' },
  new: { text: 'NEW', color: '#bc4c00' },
  hidden: { color: '#1f6feb' },
};

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== 'itsm-banner-state' || !sender.tab || sender.frameId !== 0) return;
  let badge;
  if (!msg.hidden) badge = BADGE.off;
  else if (msg.newCount) badge = BADGE.new;
  else badge = { text: msg.hiddenCount ? String(msg.hiddenCount) : '', color: BADGE.hidden.color };

  const tabId = sender.tab.id;
  chrome.action.setBadgeText({ tabId, text: badge.text });
  chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color });
  chrome.action.setBadgeTextColor?.({ tabId, color: '#ffffff' });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-banners') return;
  const { hidden } = await chrome.storage.sync.get({ hidden: true });
  await chrome.storage.sync.set({ hidden: !hidden });
});

// --- Sites -------------------------------------------------------------------
// No site is built in. The popup asks the browser for access to a site; the
// sites the user has granted are the list. Each granted site gets the content
// script registered for future page loads and injected into tabs already open on it.

const SCRIPT_ID = 'extra-sites';

async function registerSites() {
  const { origins: matches = [] } = await chrome.permissions.getAll();
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  if (!matches.length) return;
  await chrome.scripting.registerContentScripts([{
    id: SCRIPT_ID,
    matches,
    js: ['content.js'],
    runAt: 'document_start',
    allFrames: true,
  }]);
}

// Registration calls must not overlap, so they run one after another.
let queue = Promise.resolve();
function syncSites() {
  queue = queue.then(registerSites).catch((e) => console.error('Registering sites failed', e));
  return queue;
}

async function injectIntoOpenTabs(origins) {
  const tabs = await chrome.tabs.query({ url: origins });
  for (const tab of tabs) {
    chrome.scripting
      .executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content.js'] })
      .catch(() => {}); // e.g. the tab is still loading; the registered script covers it.
  }
}

// Adding a site means its banners should go, so for a short while after it's
// added, the banners on it count as already hidden instead of new.
// content.js reads seedSites when it starts.
const SEED_WINDOW_MS = 30000;

async function markNewSites(origins) {
  const now = Date.now();
  const { seedSites = {} } = await chrome.storage.local.get('seedSites');
  for (const [pattern, until] of Object.entries(seedSites)) {
    if (until < now) delete seedSites[pattern];
  }
  for (const pattern of origins) seedSites[pattern] = now + SEED_WINDOW_MS;
  await chrome.storage.local.set({ seedSites });
}

chrome.permissions.onAdded.addListener(async ({ origins = [] }) => {
  if (origins.length) await markNewSites(origins);
  await syncSites();
  if (origins.length) injectIntoOpenTabs(origins);
});
chrome.permissions.onRemoved.addListener(syncSites);
chrome.runtime.onInstalled.addListener(syncSites);
chrome.runtime.onStartup.addListener(syncSites);
