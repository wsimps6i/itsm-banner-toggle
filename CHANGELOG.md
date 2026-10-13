# Changelog

## 1.3.1 - 2026-10-10

- The hide/show keyboard shortcut has moved from the popup footer to its own **Keyboard
  shortcut** section on the Options page, with a **Change shortcut** button and a note on
  which row to set. The shown key refreshes when you come back from the browser's
  shortcuts page. The popup footer now shows just the version.

## 1.3.0 - 2026-10-09

- New Options page, opened from the gear icon in the popup (or **Extension options** on the
  extensions page). The **Sites** list and the **Advanced** custom selectors have moved
  there, so the popup only holds what you use day to day.
- **Turn on here** stays in the popup, since it acts on the site you're on.
- The Sites list is now a compact, scrolling list box sorted A to Z, with **+ Add site** and
  **− Remove selected** beside it. Several sites can be selected and removed at once.
- Scrollbars, list boxes and checkboxes now follow dark mode.

## 1.2.2 - 2026-10-06

- The popup is wider (340px instead of 260px), so ServiceNow addresses in the **Sites**
  list fit on one line.

## 1.2.1 - 2026-10-06

- The popup footer now reads **Hide/show shortcut**, to make clear it's the key that hides
  or shows the banners, not the browser's separate "Activate the extension" shortcut that
  opens the popup.
- The popup shows the extension's version number at the bottom.

## 1.2.0 - 2026-10-06

- No site is built in any more. The original site is now an ordinary entry
  in the site list, added and removed like any other, so a changed address can be swapped
  out. The extension asks for no site access at install.
- The site list has moved out of **Advanced** into its own **Sites** section, which opens
  automatically when no sites have been added.
- After upgrading from 1.1, the browser may drop access to the site that used to be built in.
  If so, open the popup there and click **Turn on here**. Banners you've already hidden
  stay hidden.

## 1.1.0 - 2026-10-05

- New announcements are shown even while banners are hidden, until you click **Hide it**
  in the popup. Untick **Show new announcements** to hide everything regardless.
- Banners are now hidden one by one rather than as a whole block, so the popup counts
  each banner.
- Toolbar badge shows the state on each tab: a count of hidden banners, **NEW** or **OFF**.
- **Alt+Shift+B** keyboard shortcut toggles the banners. It can be changed from the popup.
- Other ServiceNow sites can be added: **Turn on here** in the popup, or type the address
  under Advanced. The browser asks for access to each site; nothing extra is granted at
  install. Banners already on a site when you add it are hidden straight away rather
  than shown as new.

## 1.0.0 - 2026-10-05

- First release: popup switch to hide or show the ServiceNow announcement banners, with
  optional custom CSS selectors. Tested on the live site in Chrome and Edge.
