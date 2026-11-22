# Fieldhand · English guide

## Install locally

Requires Node 22.19+ for development and Chrome, Edge or Brave 120+ for use.

1. Run `npm ci` and `npm run build` in the project directory.
2. Open your browser’s extensions page (`chrome://extensions` / `edge://extensions`). Enable Developer mode.
3. Select **Load unpacked** and choose this project’s `dist` directory.
4. Pin Fieldhand to the toolbar. Open it and select **Manage profiles**.
5. Enter your details and **Save profile**. Stored details are not encrypted.

## Daily use

On a regular HTTP(S) website, open Fieldhand, choose a profile and click **Fill this form**. Existing values are preserved by default. The badge and popup show the number filled. **Undo** restores the most recent fill on the current document, including radio selection. Undo data lives only in that page’s isolated extension context; navigation or reloading clears it. A second click that changes nothing preserves the previous undo operation.

`Alt+Shift+F` fills with the domain-preferred profile, otherwise the active profile (initially the default). A domain association includes subdomains on a label boundary. Choose another profile in the popup to override for the current action. Change the shortcut at `chrome://extensions/shortcuts` or the equivalent in your browser. On HTTP the shortcut does not fill; open the popup and explicitly acknowledge the warning. Opening the popup alone never fills anything.

Options include overwrite, brief highlighting, diagnostic reasons (no values), creating, renaming, duplicating, deleting and setting default profiles. Changes in the profile editor require **Save profile**. Preference checkboxes save immediately. Avoid simultaneously editing the same data in multiple options tabs.

Custom keywords are comma-separated. Contains matching uses normalized text; exact matching compares the complete normalized attribute/label source. Custom rules precede autocomplete, field type and FR/EN synonyms, but never override safety exclusions. Birth dates use ISO `YYYY-MM-DD` in storage. Use `JJ/MM/AAAA`, `DD/MM/YYYY`, `MM/DD/YYYY`, or `YYYY-MM-DD` hints for text dates. Supported country aliases are listed in `src/engine/synonyms.ts`; ambiguous select choices are skipped.

## Backup

Export downloads an unencrypted JSON file containing **saved** profiles and preferences. Keep it private. Import accepts version 1 files under 2 MB, validates all fields and previews names and field counts before writing anything. **Merge** adds independent copies with new identifiers and retains current preferences/default. **Replace all** replaces all profiles and preferences. Cancelling the preview changes nothing. At least one profile must remain; up to 100 profiles and 100 rules per profile are supported.

## Boundaries

- No passwords, usernames, payment details, OTPs, checkboxes or invisible/uneditable fields. Safety skips can also exclude legitimate fields with sensitive names.
- Only controls intersecting their viewport are filled. Scroll to another part of a long form and fill again. Each successful fill replaces the previous undo transaction.
- Open shadow roots and accessible same-origin frames are supported, including nested frames. Closed shadow roots and cross-origin frames are skipped. A blocked embedded frame cannot abort the main form.
- No automatic submission, synthetic trusted input, CAPTCHA bypass or guarantee that every site accepts synthetic DOM events. Sites remain in control of validation and submission.
- Browser internals, extension stores, PDFs and restricted pages may reject injection. Use regular website pages. Frameworks that replace DOM nodes can invalidate undo references.
- English/French UI follows browser UI language. Theme follows the OS. Firefox, Safari, encryption, context menus and publication are deferred.

## Develop and package

Use `npm run check`, `npm run test:e2e`, and `npm run format:check`. Playwright requires `npx playwright install chromium`. Real React, Vue and Angular packages are used only in test fixtures, never in `dist`. The extension uses the three permissions `storage`, `activeTab`, `scripting`; no host permissions or persistent content scripts.

`npm run package` builds a ZIP using PowerShell. On another OS, zip the **contents** of `dist` with `manifest.json` at the archive root. The generated PNG icons have 16/32/48/128 pixel sizes. Review the privacy policy, store copy, validation worksheet and final name before publishing. No store listing has been submitted.

Engine modules have no DOM or Chrome API access. Storage version 1 is validated at every write and import. The documented legacy version 0 shape is `{ version: 0, profile: { firstName: "…", email: "…" } }` (partial standard fields); migration fills missing fields and assigns IDs. Unknown versions are rejected without wiping existing data. The absent prototype’s undocumented formats cannot be reliably migrated.

The injection architecture follows [Chrome’s activeTab documentation](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) and [scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting). Browser tests use [Playwright’s Chromium extension support](https://playwright.dev/docs/chrome-extensions).
