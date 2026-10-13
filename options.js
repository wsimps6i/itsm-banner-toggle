const sitesList = document.getElementById('sites');
const siteUrl = document.getElementById('siteUrl');
const siteMsg = document.getElementById('siteMsg');
const selectors = document.getElementById('customSelectors');
const saved = document.getElementById('saved');

function showSiteMsg(text) {
  siteMsg.textContent = text;
  siteMsg.hidden = !text;
}

const removeButton = document.getElementById('removeSites');

async function renderSites() {
  const patterns = (await Sites.list()).sort((a, b) => Sites.host(a).localeCompare(Sites.host(b)));
  const keep = new Set([...sitesList.selectedOptions].map((o) => o.value));
  sitesList.replaceChildren();
  if (!patterns.length) {
    const empty = new Option('No sites yet. Add one above, or use Turn on here in the popup.');
    empty.disabled = true;
    sitesList.append(empty);
  }
  for (const pattern of patterns) {
    const option = new Option(Sites.host(pattern), pattern);
    option.selected = keep.has(pattern);
    sitesList.append(option);
  }
  updateRemoveButton();
}

function updateRemoveButton() {
  removeButton.disabled = sitesList.selectedOptions.length === 0;
}

sitesList.addEventListener('change', updateRemoveButton);

removeButton.addEventListener('click', async () => {
  const patterns = [...sitesList.selectedOptions].map((o) => o.value);
  if (!patterns.length) return;
  await Sites.remove(patterns);
  const names = patterns.map(Sites.host).join(', ');
  showSiteMsg(`Removed ${names}. Reload any open tabs on ${patterns.length === 1 ? 'that site' : 'those sites'} to bring their banners back.`);
});

document.getElementById('addSite').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pattern = Sites.pattern(siteUrl.value);
  if (!pattern) {
    showSiteMsg('Enter an https:// address, such as https://yoursite.service-now.com');
    return;
  }
  const granted = await Sites.add(pattern);
  if (!granted) {
    showSiteMsg(`Access to ${Sites.host(pattern)} wasn't allowed, so it wasn't added.`);
    return;
  }
  showSiteMsg('');
  siteUrl.value = '';
});

// Keeps the list current, including sites added or removed from the popup
// while this page is open.
chrome.permissions.onAdded.addListener(renderSites);
chrome.permissions.onRemoved.addListener(renderSites);

chrome.storage.sync.get({ customSelectors: '' }, (s) => {
  selectors.value = s.customSelectors;
});

document.getElementById('save').addEventListener('click', () => {
  chrome.storage.sync.set({ customSelectors: selectors.value }, () => {
    saved.hidden = false;
    setTimeout(() => (saved.hidden = true), 2000);
  });
});

// Shows the current keyboard shortcut. It's changed on the browser's own
// shortcuts page, so look again whenever the user comes back to this tab.
function renderShortcut() {
  chrome.commands.getAll((commands) => {
    const cmd = commands.find((c) => c.name === 'toggle-banners');
    document.getElementById('shortcut').textContent = cmd?.shortcut || 'Not set';
  });
}

document.getElementById('changeShortcut').addEventListener('click', () => {
  const isEdge = navigator.userAgent.includes('Edg/');
  chrome.tabs.create({ url: isEdge ? 'edge://extensions/shortcuts' : 'chrome://extensions/shortcuts' });
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) renderShortcut();
});

renderSites();
renderShortcut();
