# Chrome Web Store listing

Copy and paste these into the Chrome Web Store Developer Dashboard. Images are in
[`images/`](images/) (rebuild them with `make-store-images.ps1`), and the zip to upload comes
from `scripts/package.ps1` (`dist\ITSM-Banner-Toggle-<version>-store.zip`).

## Package tab

Upload `dist\ITSM-Banner-Toggle-<version>-store.zip`.

## Store listing tab

**Name and summary** come from the manifest:
ITSM Banner Toggle — "Show or hide the announcement banners on ServiceNow ITSM sites."

**Description**

```text
Hide the announcement banners at the top of your ServiceNow ITSM site, such as notices about upcoming upgrades, hotfixes and change freezes, and bring them back with one switch.

• One switch in the toolbar popup hides or shows the banners, and a keyboard shortcut does the same.
• New announcements still show up. Banners you've hidden stay hidden, but a new or edited one appears until you click "Hide it", so you don't miss anything important. Untick "Show new announcements" if you'd rather hide everything.
• The toolbar badge shows how many banners are hidden on the tab, NEW when a new one is showing, or OFF.
• You choose the sites. It runs only on the ServiceNow sites you add, and your browser asks you to allow each one. Open your site and click "Turn on here", or add addresses on the Options page.
• Custom CSS selectors on the Options page cover banners that aren't caught automatically.

No data is collected or sent anywhere. Source code: https://github.com/wsimps6i/itsm-banner-toggle

Not affiliated with or endorsed by ServiceNow.
```

**Category:** Productivity → Tools (or Workflow & Planning)

**Language:** English

**Store icon:** `icons/icon128.png`

**Screenshots (1280×800):** `images/1-popup.png`, `images/2-turn-on.png`, `images/3-options.png`

**Small promo tile (440×280):** `images/promo-tile-440x280.png`

**Marquee promo tile (1400×560, optional):** `images/marquee-1400x560.png`. Only shown if
Google features the extension, which doesn't happen to unlisted ones, so it can be left empty.

**Homepage URL:** https://github.com/wsimps6i/itsm-banner-toggle

**Support URL:** https://github.com/wsimps6i/itsm-banner-toggle/issues

## Privacy tab

**Single purpose**

```text
Hides or shows the announcement banners on ServiceNow sites that the user adds.
```

**Permission justifications**

| Permission | Justification |
| --- | --- |
| `storage` | Saves the user's settings (whether banners are hidden, whether new announcements are shown, custom selectors) and remembers which banners the user has already hidden. |
| `scripting` | Starts the banner-hiding script on the ServiceNow sites the user adds, since no site is built in. |
| `activeTab` | Lets the popup see which site the current tab is on, so it can offer "Turn on here" for that site. |
| Host permissions (`https://*/*`, optional) | Users choose their own ServiceNow sites, whose addresses differ between companies (including custom domains), so the sites can't be listed in advance. The permission is optional and nothing is granted at install: the extension requests access for one site at a time, only when the user adds it, and only runs on those sites. |

**Are you using remote code?** No, I am not using remote code.

**Data usage:** don't tick any of the data types. Tick all three certifications (no selling
or transferring data to third parties, no use unrelated to the single purpose, no use for
creditworthiness or lending).

**Privacy policy URL:** https://github.com/wsimps6i/itsm-banner-toggle/blob/main/PRIVACY.md

## Distribution tab

**Visibility:** Unlisted

**Regions:** All regions
