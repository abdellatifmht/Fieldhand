# Fieldhand

A local, user-triggered form-filling extension for Chromium 120+. No runtime dependencies, account, telemetry, or remote services.

**Load it:** build with `npm ci && npm run build`, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist`. Pin Fieldhand, open **Manage profiles**, save your details, then use **Fill this form** on a website. `Alt+Shift+F` fills using the preferred/active profile.

- [English guide](docs/README.en.md)
- [Guide en français](docs/README.fr.md)
- [Privacy policy](docs/PRIVACY.md)
- [Verification and limits](docs/VALIDATION.md)
- [Manual test worksheet](docs/test-sites.md)

Profiles and JSON backups are **not encrypted**. Filling deliberately gives your chosen data to the website; website scripts may transmit it even without submission. Never store passwords or financial details.

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
npm run format:check
npm run package
```

The package command creates `fieldhand-1.0.0.zip` (PowerShell). Only `dist` is shipped; frameworks are development-only test fixtures. See the guides for other platforms.
