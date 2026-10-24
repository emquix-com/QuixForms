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
ASTRO_TELEMETRY_DISABLED=1 npx astro build --root examples/astro
```

The official sandbox harness is isolated because it requires Vite 8 / Vitest 4 and is maintained as a separate runtime fixture:

```sh
cd sandbox-tests
npm ci
npm test
```

## Installation status

Core produces `packages/sandboxed/dist/{plugin.mjs,manifest.json,index.mjs}` using the official EmDash plugin CLI. Registry identity `@webtaculos.com/quixforms` is a proposed publisher identity, not verified ownership. No registry installation is available yet. Do not present the proposed npm package names as installable published packages.

For development, use the generated local sandbox descriptor according to EmDash's local plugin installation documentation. The Core admin page is `/forms`. Configure Turnstile keys through plugin settings and configure EmDash's email transport. Public submissions fail closed without bot protection.

The native descriptor factory is `quixFormsAdvanced` in `packages/advanced-builder/src/index.ts`; register it in an EmDash `live.config.ts` plugins array after making its package exports resolvable. It calls Core with the administrator's existing session. It needs a rebuild/redeployment. Package distribution and a one-command installer are not ready.

For frontend development, import `packages/astro/src/Form.astro` and render `<Form id="YOUR_FORM_ID" siteKey="YOUR_TURNSTILE_SITE_KEY" />`. The host must include `@astrojs/react`. It must serve Core's same-origin routes. The wrapper loads definitions dynamically, so publishing a new form does not require rebuilding the frontend. The example is a renderer-only demo, explicitly without submission transport. Multiple embedded Turnstile forms on one page need further work.

Core is the only data owner. Removing Advanced does not delete forms or entries. A Core registry installation cannot inject forms into an arbitrary Astro theme.

## Documentation

- [Architecture and verified host contracts](docs/architecture.md)
- [Competitor assessment and research gaps](docs/comparison.md)
- [Release report and remaining acceptance work](docs/release-report.md)
- [Security policy](SECURITY.md)

Original code is MIT licensed. Dependency license inventory is provided separately; an inventory is not legal certification.
