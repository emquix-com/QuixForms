# QuixForms

**Powerful Forms. Effortless Building.** By Webtaculos · Future ecosystem: EmQuix.

Version 0.1.0 development source. **Not production-ready or published.** This repository contains an original implementation of a sandboxed EmDash forms backend, Block Kit editor, optional native React editor and Astro renderer. It does not yet meet the full 0.1.0 acceptance targets. See [release report](docs/release-report.md).

## Develop

Node 24 is the tested toolchain.

```sh
npm ci
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
ASTRO_TELEMETRY_DISABLED=1 npx astro build --root examples/astro
```

The official sandbox harness is isolated because it requires Vite 8 / Vitest 4 and is maintained as a separate runtime fixture:

```sh
cd sandbox-tests
npm ci
npm test
```

## Manual acceptance installations

Build `npm run build && npm run pack:candidate` to produce independently installable local npm tarballs. Build the official registry bundle with `npx emdash-plugin bundle --dir packages/sandboxed --out-dir artifacts`. No artifacts have been published.

Follow the [manual installation and acceptance guide](docs/manual-testing.md) for:

- **Core alone:** local sandboxed installation using `install --core-only`; no React admin required.
- **Core + Advanced:** `install --with-core`, the native React admin and Astro components.
- Safe dry runs, config backups, removal, and testing the same forms in both editors.

The CLI is `node packages/installer/src/cli.mjs`. It accepts `--project` and `--artifacts` absolute paths, verifies checksums and runs the site's production build. npm is tested; a full pnpm journey is pending. Complex config receives a manual fallback. Registration belongs in `astro.config.mjs`'s EmDash integration.

Core's admin path is `/_emdash/admin/plugins/quixforms/forms`; Advanced is `/_emdash/admin/plugins/quixforms-advanced`. Configure Turnstile through plugin settings and EmDash's email transport. Public submissions fail closed without bot protection. Core's eventual registry install will require no npm, but signed registry publication/installation is not yet verified.

For public rendering, use `import Form from '@emquix/quixforms-astro/Form.astro'` and `<Form id="YOUR_FORM_ID" />` on a host with `@astrojs/react`. The component loads published definitions dynamically. See `examples/companion-page.astro` for a dynamic route. Initial native/renderer integration requires rebuilding and redeploying. Core cannot inject forms into an arbitrary theme.

Core is the only data owner. Removing Advanced retains forms and entries. All packages remain private until publication approval.

## Documentation

- [Architecture and verified host contracts](docs/architecture.md)
- [Competitor assessment and research gaps](docs/comparison.md)
- [Release report and remaining acceptance work](docs/release-report.md)
- [Security policy](SECURITY.md)

Original code is MIT licensed. Dependency license inventory is provided separately; an inventory is not legal certification.

Development repository: https://github.com/alexandru-b/QuixForms (private). Browser fixture screenshots are in `docs/screenshots`. See the release report for the current verified feature set and remaining gates.
