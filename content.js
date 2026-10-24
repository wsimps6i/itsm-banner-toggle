// ITSM Banner Toggle - content script.
// Finds ServiceNow announcement banners (including ones inside the Next Experience
// shadow DOM) and hides or shows them according to the stored settings.
// Banners the user has already hidden stay hidden, but a banner with new text is
// shown until the user hides it too (unless "Show new announcements" is off).

(() => {
  // On an added site the script can be injected into an open tab and then
  // registered for it too; only run once per frame.
  if (window.__itsmBannerToggle) return;
  window.__itsmBannerToggle = true;

  // The extension API: `browser` in Firefox (and Chrome/Edge 148+), `chrome` in older
  // Chrome and Edge. All calls use promises, which both support.
  const ext = globalThis.browser ?? chrome;

  const MARK = 'data-itsm-banner-toggle';
  // Anything whose tag, id or class mentions "announcement" is treated as a banner.
  const PATTERN = /announcement/i;
  // Guard so a page-sized wrapper is never hidden by mistake.
  const MAX_BANNER_HEIGHT = 400;
  // How many hidden banners to remember.
  const MAX_SEEN = 300;
  // On first run, banners already on screen during this window count as seen,
  // so upgrading from 1.0 doesn't suddenly show every banner as new. (A site
  // added from the popup gets the same treatment; see background.js.)
  // ServiceNow can take over 10 seconds to render its banners.
  const SEED_WINDOW_MS = 30000;
  const SKIP_TEXT = new Set(['STYLE', 'SCRIPT', 'TEMPLATE', 'NOSCRIPT']);
  const IS_TOP = window === window.top;

  let hidden = true;
  let showNew = true;
  let customSelectors = [];
  let seen = new Set();
  let seedUntil = 0;
  let settingsLoaded = false;
  let scanQueued = false;
  let present = [];
  let counts = { hiddenCount: 0, newCount: 0 };
  let lastReport = '';
  const lastFingerprint = new WeakMap();
  const observedRoots = new WeakSet();

  const observer = new MutationObserver(queueScan);

  function observe(root) {
    if (observedRoots.has(root)) return;
    observedRoots.add(root);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    setTimeout(() => {
      scanQueued = false;
      scan();
    }, 150);
  }

  function looksLikeBanner(el) {
    if (PATTERN.test(el.tagName)) return true;
    if (el.id && PATTERN.test(el.id)) return true;
    const cls = typeof el.className === 'string' ? el.className : el.getAttribute('class');
    return !!cls && PATTERN.test(cls);
  }

  function matchesCustom(el) {
    for (const sel of customSelectors) {
      try {
        if (el.matches(sel)) return true;
      } catch {
        // Invalid selector typed by the user - ignore it.
      }
    }
    return false;
  }

  function isBanner(el) {
    return el.hasAttribute(MARK) || looksLikeBanner(el) || matchesCustom(el);
  }

  // Returns the outermost banner elements under root, descending into open
  // shadow roots. Children of a match are not searched.
  function outermostMatches(root, accept) {
    const found = [];
    const walk = (node) => {
      if (node instanceof ShadowRoot) observe(node);
      const stack = [...node.children];
      while (stack.length) {
        const el = stack.pop();
        if (isBanner(el) && accept(el)) {
          found.push(el);
          continue;
        }
        if (el.shadowRoot) walk(el.shadowRoot);
        stack.push(...el.children);
      }
    };
    if (root.shadowRoot) walk(root.shadowRoot);
    walk(root);
    return found;
  }

  function isSafeToHide(el) {
    if (el.hasAttribute(MARK)) return true;
    if (el === document.body || el === document.documentElement) return false;
    if (el.querySelector('iframe, main, form')) return false;
    return el.getBoundingClientRect().height <= MAX_BANNER_HEIGHT;
  }

  // A banner area (e.g. sn-banner-announcement-list) can hold several banners.
  // Each one is handled on its own so a new banner can show while old ones stay hidden.
  function itemsOf(unit) {
    const items = outermostMatches(unit, () => true);
    return items.length ? items : [unit];
  }

  function deepText(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
    if (node.nodeType === Node.ELEMENT_NODE && SKIP_TEXT.has(node.tagName)) return '';
    let text = '';
    if (node.shadowRoot) {
      observe(node.shadowRoot);
      text += deepText(node.shadowRoot);
    }
    for (const child of node.childNodes) text += ' ' + deepText(child);
    return text;
  }

  // Identifies a banner by its text, so the same announcement is recognised again.
  function fingerprint(el) {
    const text = deepText(el).replace(/\s+/g, ' ').trim();
    if (!text) return null;
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36) + '-' + text.length.toString(36);
  }

  function setVisible(el, show) {
    if (!el.hasAttribute(MARK)) {
      el.setAttribute(MARK, '');
      el.dataset.itsmOrigDisplay = el.style.getPropertyValue('display');
      el.dataset.itsmOrigPriority = el.style.getPropertyPriority('display');
    }
    if (!show) {
      el.style.setProperty('display', 'none', 'important');
    } else {
      const orig = el.dataset.itsmOrigDisplay;
      if (orig) el.style.setProperty('display', orig, el.dataset.itsmOrigPriority);
      else el.style.removeProperty('display');
    }
  }

  function scan() {
    if (!settingsLoaded) return;
    const now = Date.now();
    const fingerprints = [];
    let hiddenCount = 0;
    let newCount = 0;
    let seeded = false;

    for (const unit of outermostMatches(document, isSafeToHide)) {
      const items = itemsOf(unit);
      let anyShown = false;
      for (const item of items) {
        const fp = fingerprint(item);
        // Text can render in stages; only trust a fingerprint seen on two scans in a row.
        const stable = fp !== null && lastFingerprint.get(item) === fp;
        lastFingerprint.set(item, fp);
        if (fp) {
          fingerprints.push(fp);
          if (now < seedUntil && !seen.has(fp)) {
            seen.add(fp);
            seeded = true;
          }
        }
        const isNew = stable && !seen.has(fp);
        const show = !hidden || (showNew && isNew);
        if (hidden && show) newCount++;
        if (!show) hiddenCount++;
        setVisible(item, show);
        anyShown = anyShown || show;
      }
      if (items[0] !== unit) setVisible(unit, anyShown);
    }

    present = fingerprints;
    counts = { hiddenCount, newCount };
    if (seeded) saveSeen();
    report();
  }

  // Marks every banner currently on the page as seen, which hides any new ones.
  function ack() {
    let changed = false;
    for (const fp of present) {
      if (!seen.has(fp)) {
        seen.add(fp);
        changed = true;
      }
    }
    if (changed) saveSeen();
    scan();
  }

  function saveSeen() {
    const list = [...seen].slice(-MAX_SEEN);
    seen = new Set(list);
    ext.storage.local.set({ seen: list });
  }

  // Tells the background worker the state, for the toolbar badge.
  function report() {
    if (!IS_TOP) return;
    const state = { type: 'itsm-banner-state', hidden, ...counts };
    const key = JSON.stringify(state);
    if (key === lastReport) return;
    lastReport = key;
    ext.runtime.sendMessage(state).catch(() => {}); // e.g. the background is restarting
  }

  function parseSelectors(text) {
    return (text || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
  }

  function loadSettings() {
    Promise.all([
      ext.storage.sync.get({ hidden: true, showNew: true, customSelectors: '' }),
      ext.storage.local.get(['seen', 'seedSites']),
    ]).then(([s, l]) => {
      hidden = s.hidden;
      showNew = s.showNew;
      customSelectors = parseSelectors(s.customSelectors);
      if (Array.isArray(l.seen)) seen = new Set(l.seen);
      else seedUntil = Date.now() + SEED_WINDOW_MS;
      // A site just added from the popup: its current banners count as seen.
      const siteSeed = (l.seedSites || {})[`${location.origin}/*`] || 0;
      seedUntil = Math.max(seedUntil, siteSeed);
      settingsLoaded = true;
      scan();
    });
  }

  ext.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.seen) {
      seen = new Set(changes.seen.newValue || []);
      scan();
      return;
    }
    if (area !== 'sync') return;
    if (changes.showNew) showNew = changes.showNew.newValue;
    if (changes.customSelectors) customSelectors = parseSelectors(changes.customSelectors.newValue);
    if (changes.hidden) {
      hidden = changes.hidden.newValue;
      // Turning hiding on counts as hiding everything on screen now.
      if (hidden) {
        ack();
        return;
      }
    }
    scan();
  });

  // The popup asks for the current state, or asks to hide new banners.
  ext.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg?.type === 'itsm-banner-status') scan();
    else if (msg?.type === 'itsm-banner-ack') ack();
    else return;
    reply({ hidden, ...counts });
  });

  observe(document);
  loadSettings();
  // Shadow DOM content that renders without a mutation the observer can see is
  // picked up by a slow safety-net scan. This also confirms new banners' text.
  const timer = setInterval(() => {
    // After the extension is reloaded or updated, this copy of the script is orphaned.
    if (!ext.runtime?.id) {
      clearInterval(timer);
      observer.disconnect();
      return;
    }
    scan();
  }, 3000);
})();
