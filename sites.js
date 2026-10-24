// Shared by the popup and the options page.
// The sites the extension runs on are the https origins the user has granted it;
// background.js starts the content script on each one.

// The extension API: `browser` in Firefox (and Chrome/Edge 148+), `chrome` in older
// Chrome and Edge. All calls use promises, which both support.
// Declared here once; popup.js and options.js use it too.
const ext = globalThis.browser ?? chrome;

const Sites = {
  // Turns what the user typed (or a tab's URL) into a match pattern such as
  // "https://example.service-now.com/*", or null if it isn't an https address.
  pattern(text) {
    const value = (text || '').trim();
    if (!value) return null;
    try {
      const url = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`);
      return url.protocol === 'https:' ? `${url.origin}/*` : null;
    } catch {
      return null;
    }
  },

  host(pattern) {
    return pattern.replace(/^https:\/\//, '').replace(/\/\*$/, '');
  },

  async list() {
    const { origins = [] } = await ext.permissions.getAll();
    return origins;
  },

  // Must be called straight from a click, before any await, or the browser
  // refuses the request. Resolves to true if the user allowed it.
  add(pattern) {
    return ext.permissions.request({ origins: [pattern] });
  },

  // Takes one pattern or a list of them.
  remove(patterns) {
    return ext.permissions.remove({ origins: [].concat(patterns) });
  },

  has(pattern) {
    return ext.permissions.contains({ origins: [pattern] });
  },
};
