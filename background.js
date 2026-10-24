// ITSM Banner Toggle - background script. A service worker in Chrome and Edge, an
// event page in Firefox. Keeps the toolbar badge in step with each tab, handles the
// keyboard shortcut, and starts the content script on the sites the user has added.

// The extension API: `browser` in Firefox (and Chrome/Edge 148+), `chrome` in older
// Chrome and Edge. All calls use promises, which both support.
const ext = globalThis.browser ?? chrome;

const BADGE = {
  off: { text: 'OFF', color: '#6e7781' },
  new: { text: 'NEW', color: '#bc4c00' },
  hidden: { color: '#1f6feb' },
};

ext.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== 'itsm-banner-state' || !sender.tab || sender.frameId !== 0) return;
  let badge;
  if (!msg.hidden) badge = BADGE.off;
  else if (msg.newCount) badge = BADGE.new;
  else badge = { text: msg.hiddenCount ? String(msg.hiddenCount) : '', color: BADGE.hidden.color };

  const tabId = sender.tab.id;
  ext.action.setBadgeText({ tabId, text: badge.text });
  ext.action.setBadgeBackgroundColor({ tabId, color: badge.color });
  ext.action.setBadgeTextColor?.({ tabId, color: '#ffffff' });
});

ext.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-banners') return;
  const { hidden } = await ext.storage.sync.get({ hidden: true });
  await ext.storage.sync.set({ hidden: !hidden });
});

// --- Sites -------------------------------------------------------------------
// No site is built in. The popup asks the browser for access to a site; the
// sites the user has granted are the list. Each granted site gets the content
// script registered for future page loads and injected into tabs already open on it.

const SCRIPT_ID = 'extra-sites';

async function registerSites() {
  const { origins: matches = [] } = await ext.permissions.getAll();
  const existing = await ext.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (existing.length) await ext.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  if (!matches.length) return;
  await ext.scripting.registerContentScripts([{
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
  const tabs = await ext.tabs.query({ url: origins });
  for (const tab of tabs) {
    ext.scripting
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
  const { seedSites = {} } = await ext.storage.local.get('seedSites');
  for (const [pattern, until] of Object.entries(seedSites)) {
    if (until < now) delete seedSites[pattern];
  }
  for (const pattern of origins) seedSites[pattern] = now + SEED_WINDOW_MS;
  await ext.storage.local.set({ seedSites });
}

ext.permissions.onAdded.addListener(async ({ origins = [] }) => {
  if (origins.length) await markNewSites(origins);
  await syncSites();
  if (origins.length) injectIntoOpenTabs(origins);
});
ext.permissions.onRemoved.addListener(syncSites);
ext.runtime.onInstalled.addListener(syncSites);
ext.runtime.onStartup.addListener(syncSites);
