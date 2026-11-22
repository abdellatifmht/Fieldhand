# Implementation and verification record

Verified locally on 13 November 2026 using Node 22.19 and Playwright Chromium 158 on Windows. This is a local build, not a published store release.

## Delivered

| Milestone | Included                                                                                                                          | Verification                                                                                                                                                                                                                                                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0        | Strict TypeScript, esbuild, lint/format/test scripts, MV3 build                                                                   | Typecheck, ESLint, Prettier and unpacked Chromium load pass. No prototype was present; implementation started from the supplied specification.                                                                                                                                                                                                          |
| M1        | Pure matching engine, FR/EN synonyms, normalization, sensitive exclusions, date and select helpers, diagnostic reasons            | 736 unit tests across five files; the matching matrix exceeds 150 FR/EN cases. Engine coverage: 100% statements, branches, functions and lines.                                                                                                                                                                                                         |
| M2        | Multiple profiles, create/rename/duplicate/delete/default, active selection, domain preferences, versioned local storage          | Unit tests verify persistence, validation, migration and domain boundaries. Browser tests save, duplicate, set default and delete profiles.                                                                                                                                                                                                             |
| M3        | Native setters/events, text/textarea/date/number/select/radio, overwrite, undo, open shadow roots, same-origin frames, highlights | Actual React 19 controlled input, Vue 3 v-model and Angular 21 reactive FormControl state update; Angular validation changes to valid. Undo resets their state. Country/date/radio fixtures pass; foreign-origin frame is skipped.                                                                                                                      |
| M4        | FR/EN catalogs, light/dark styles, labeled keyboard-accessible native controls, backup preview/merge/replace                      | Catalog/placeholder parity and JSON roundtrip tests pass. Browser tests verify invalid import rejection, valid preview, merge and export. Manual screen-reader, complete keyboard and measured contrast review remain pending.                                                                                                                          |
| M5        | Security, network and performance checks                                                                                          | Seven Playwright scenarios pass. Sensitive/invisible controls and checkboxes remain unchanged; HTTP requires acknowledgement; overwritten radio selections restore; no-op fills preserve undo. 100 visible fields fill within the asserted 200 ms budget. No extension-originated HTTP(S) requests or uncaught page errors observed in these scenarios. |
| M6        | PNG icons (16/32/48/128), EN/FR guides, privacy policy, draft store description, ZIP, screenshots                                 | Manifest is at archive root. Browser screenshots are included under `docs/screenshots`. Store publication, public privacy-policy hosting and store-sized marketing screenshots remain pending.                                                                                                                                                          |

## Commands passed

```text
npm run typecheck
npm run lint
npm test                  # 736 passed; engine coverage 100%
npm run test:e2e          # 7 passed in loaded-extension Chromium
npm run format:check
npm run package
git diff --check
```

The browser suite activates the actual toolbar action through Chrome’s test-only DevTools Extensions domain, preserving the production manifest and its temporary activeTab permissions. It clicks the real popup Fill/Undo controls, not a test-only permission bypass. Shortcut **handler behavior** is unit tested, including HTTP refusal; an OS-level physical Alt+Shift+F keypress is not automated by Playwright and needs a manual check.

Hidden-control fixtures cover display:none, transparent ancestors, visibility:hidden, zero-size controls, clipped ancestors, offscreen controls, disabled fields and fieldsets, readonly and hidden input types. Framework libraries are local development dependencies and are excluded from every extension bundle. The network observation applies to the deterministic fixtures; third-party sites can transmit any details deliberately filled into their forms.

`npm audit` reports **0 high / 0 critical**, with 10 moderate development-tool findings related to minimatch/ESLint/typescript-eslint. The extension has zero runtime package dependencies. Dependencies are exactly pinned in `package.json` and locked in `package-lock.json`.

## Remaining acceptance checks and limits

- The 20 live-site worksheet is not executed, so the ≥90% real-site target is unverified. Candidate sites and observed-result slots are in `test-sites.md`; no accounts were created, purchases made or forms submitted.
- Manually validate keyboard navigation, screen readers and WCAG AA contrast in both UI languages and themes. English UI and dark popup / light options screenshots were observed; catalog completeness is automated. No claim of full accessibility certification is made.
- Chrome 120 minimum, Edge and Brave have not been separately run; Chromium 158 is the automated target. On Chrome before 127, HTTP shortcut errors may require manually opening the popup because programmatic openPopup is restricted.
- Standard native DOM events work on the tested frameworks but are not trusted keyboard input. A site can replace nodes or reject synthetic events. Undo applies to retained connected nodes of the latest successful fill, not data a site has already transmitted.
- Only visible controls intersecting their viewport are eligible. Scroll a long form and fill again. Closed shadow roots, foreign-origin frames, browser pages and extension stores remain inaccessible. Country aliases are the explicit table in `src/engine/synonyms.ts`; unknown names need matching option text/value or a custom rule. Ambiguous options are skipped.
- Firefox, Safari, passphrase encryption and the context-menu permission were not included. Fieldhand is a working project name; final branding/publisher/support contact must be confirmed for publication.
