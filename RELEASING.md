# Releasing a new version

1. **Version and notes.** Bump `version` in `manifest.json` and add a `CHANGELOG.md` entry.
2. **Build.** `pwsh scripts/package.ps1` writes `dist\ITSM-Banner-Toggle-<version>.zip`
   (GitHub release) and `dist\ITSM-Banner-Toggle-<version>-store.zip` (both stores).
3. **Firefox: sign it.** On the [Add-on Developer Hub](https://addons.mozilla.org/developers/),
   open **ITSM Banner Toggle**, click **Upload New Version**, upload the `-store.zip` and keep
   it self-distributed (**On your own**). Once the version shows **Approved**, download the
   signed `.xpi` and save it as `dist\itsm-banner-toggle-<version>.xpi`.
4. **Firefox: point updates at it.** Add an entry to `updates.json`, newest last:

   ```json
   { "version": "<version>",
     "update_link": "https://github.com/wsimps6i/itsm-banner-toggle/releases/download/v<version>/itsm-banner-toggle-<version>.xpi" }
   ```

5. **GitHub.** Commit and push, then create release `v<version>` with the release zip and the
   signed `.xpi` attached. The `.xpi` must be uploaded before or with the `updates.json` push
   reaching `main`, or Firefox's daily check would find a dead link.
6. **Chrome Web Store.** In the Developer Dashboard, open the item, go to **Package**, upload
   the `-store.zip` and submit for review. Users get it automatically once it's approved.

Never commit real company ServiceNow addresses, banner text or work screenshots: the repo is
public.
