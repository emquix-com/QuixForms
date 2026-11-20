# QuixForms

**Powerful Forms. Effortless Building.** By [EmQuix](https://emquix.com). Free and MIT licensed.

The sandboxed **[QuixForms 0.1.1](https://plugins.emdashcms.com/plugins/@emquix.com/quixforms)** is published in the EmDash registry. This repository contains the sandboxed backend and Block Kit editor, the optional free Advanced React editor, and the Astro renderer. Advanced and the renderer are separate source-installed packages. See the [release report](docs/release-report.md) for executed checks and remaining deployment limitations.

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

Install sandboxed Core from EmDash's Registry by searching for `@emquix.com/quixforms`. Build `npm run build && npm run pack:candidate` to produce the separate renderer, Advanced and installer tarballs; these npm packages are not yet published. Build the official registry bundle with `npm run bundle:candidate`.

Follow the [manual installation and acceptance guide](docs/manual-testing.md) for:

- **Core alone:** local sandboxed installation using `install --core-only`; no React admin required.
- **Core + Advanced:** `install --with-core`, the native React admin and Astro components.
- Safe dry runs, config backups, removal, and testing the same forms in both editors.

The CLI is `node packages/installer/src/cli.mjs`. It accepts `--project` and `--artifacts` absolute paths, verifies checksums and runs the site's production build. npm is tested; a full pnpm journey is pending. Complex config receives a manual fallback. Registration belongs in `astro.config.mjs`'s EmDash integration.

Core's admin path is `/_emdash/admin/plugins/quixforms/forms`; Advanced is `/_emdash/admin/plugins/quixforms-advanced`. Turnstile is optional: without both keys, forms accept submissions without CAPTCHA. With both keys configured, submissions require successful verification. Configure it through plugin settings and configure EmDash's email transport separately. Core's eventual registry install will require no npm, but signed registry publication/installation is not yet verified.

For public rendering, use `import Form from '@emquix/quixforms-astro/Form.astro'` and `<Form id="YOUR_FORM_ID" />` on a host with `@astrojs/react`. The component loads published definitions dynamically. See `examples/companion-page.astro` for a dynamic route. Initial native/renderer integration requires rebuilding and redeploying. Core cannot inject forms into an arbitrary theme.

Core is the only data owner. Removing Advanced retains forms and entries. All packages remain private until publication approval.

Both editors support plain-text notification message bodies with `{all_fields}`,
`{form_title}` and `{entry_reference}` tags. Leave the body blank to send all
accepted answers automatically.

## Documentation

- [Architecture and verified host contracts](docs/architecture.md)
- [Competitor assessment and research gaps](docs/comparison.md)
- [Release report and remaining acceptance work](docs/release-report.md)
- [Sandboxed 0.1.0 publishing plan](docs/publishing-plan.md)
- [Security policy](SECURITY.md)

Original code is MIT licensed. Dependency license inventory is provided separately; an inventory is not legal certification.

Public source repository: https://github.com/emquix-com/QuixForms. Browser fixture screenshots are in `docs/screenshots`. See the release report for the current verified feature set and remaining gates.
