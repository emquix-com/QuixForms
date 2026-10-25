# QuixForms 0.1.0 manual acceptance kit

This is an **unpublished test candidate**, not a production approval. Test with synthetic data in a separate site. The release report lists unresolved gates. Both interfaces use the same sandboxed Core; “installed/native” adds a React authoring interface, not a second backend.

## Tested versions and prerequisites

Node 24; EmDash 1.3.1; Astro 7.4.2; React 19.2.0; @astrojs/react 7.1.1. The Node example uses @astrojs/node 11.1.9, @emdash-cms/sandbox-workerd 0.9.5 and workerd 1.20261024.1. Use localhost for local passkeys, or HTTPS with your real hostname. Set `EMDASH_SITE_URL` to that origin. Configure EmDash's persistent encryption key according to its deployment guide before saving secret plugin settings.

Cloudflare requires EmDash's official sandbox integration, Worker Loader `LOADER` binding, PluginBridge export and a compatible paid Workers plan. A deployed Cloudflare acceptance run is still outstanding; the local official Worker/D1 harness is not that deployment test.

## Build the unpublished artifacts

From a checkout of this repository:

```sh
npm ci
npm run build
npm run pack:candidate
npm run bundle:candidate
```

`artifacts/` contains five npm tarballs, `checksums.json`, and the official `quixforms-0.1.0.tar.gz` registry bundle. The CLI verifies the npm artifact checksums before installation. The registry bundle is locally validated but unsigned/unpublished; it cannot be searched for and installed from the official registry yet. Publisher ownership and publication require a separate approved step. Do not try to replace EmDash's registry verification with an arbitrary upload endpoint.

If you received the assembled test archive, extract it and install its local CLI into your test site:

```sh
npm install /absolute/path/quixforms-0.1.0-manual-test/artifacts/emquix-quixforms-cli-0.1.0.tgz
npx quixforms install --artifacts /absolute/path/quixforms-0.1.0-manual-test/artifacts --core-only --dry-run
```

Remove `--dry-run` to install; substitute `--with-core` for the full installation. These commands use the local CLI package, not an unpublished npm registry name. `npm run kit:candidate` assembles the archive from a source checkout. CI also attaches it as a private workflow artifact after checks pass.

## A. Sandboxed Core alone

For an existing EmDash 1.3.1 site, configure its official sandbox runner first. The provided `examples/node-test-site` has a Node runner and SQLite configuration. Copy that example outside the monorepo, then run `npm install` there.

Use absolute paths in these commands, replacing the example paths:

```sh
node /path/to/QuixForms/packages/installer/src/cli.mjs install \
  --project /path/to/test-site --artifacts /path/to/QuixForms/artifacts \
  --core-only --dry-run
node /path/to/QuixForms/packages/installer/src/cli.mjs install \
  --project /path/to/test-site --artifacts /path/to/QuixForms/artifacts \
  --core-only
```

This local config-managed installation runs Core inside the official sandbox. The terminal is needed for this pre-publication test; it is not the eventual registry installation experience. Once Core is installed, ordinary administration needs no terminal and no React companion.

Start the example from its directory:

```sh
HOST=127.0.0.1 PORT=4333 EMDASH_SITE_URL=http://localhost:4333 npm start
```

Open `http://localhost:4333/_emdash/admin/`, finish EmDash setup, dismiss its welcome dialog and select **QuixForms**. Direct Core URL: `/_emdash/admin/plugins/quixforms/forms`. Configure Turnstile in EmDash's plugin settings. Core provides administration and JSON APIs; it cannot inject HTML/JavaScript into an arbitrary theme.

## B. Core plus Advanced Builder and Astro

On a fresh test site, use the same commands with `--with-core` instead of `--core-only`. If Core is already registry-managed, omit both flags; do not register a second Core descriptor. The native admin URL is `/_emdash/admin/plugins/quixforms-advanced`.

The installer requires an existing `@astrojs/react` integration for frontend rendering; the example includes it. Registering the native extension does not place public forms in the theme. Copy `examples/companion-page.astro` into the installed site's `src/pages/forms/[id].astro`, then rebuild and restart. The site must use server output for this dynamic route. Visit `/forms/FORM_ID`; obtain the ID from Core's Embed screen. The page fetches the current published definition at runtime. Publishing another form does not require rebuilding this route.

Alternatively, place this in any Astro page:

```astro
---
import Form from '@emquix/quixforms-astro/Form.astro';
---
<Form id="YOUR_FORM_ID" />
```

The wrapper includes scoped CSS and the React hydration directive. It reads the site key from Core. Use a real Turnstile site key/secret pair allowing your test hostname and configure EmDash's normal email transport. QuixMail is optional. Missing or failed bot verification deliberately rejects submissions. No test-mode bypass is shipped.

For manual configuration, add the following to the existing **astro.config.mjs** EmDash integration, preserving its database, storage, runner and other plugin declarations:

```js
import quixFormsCore from '@emquix/quixforms-core-plugin';
import {quixFormsAdvanced} from '@emquix/quixforms-advanced';
// inside emdash({ ... }):
// sandboxed: [quixFormsCore],
// plugins: [quixFormsAdvanced()],
```

The native registration belongs in Astro config, not live.config.ts. The packages remain private/unpublished; install the local tarballs together. `npx @emquix/quixforms-cli install` is a future published command, not currently available from npm.

## Installer safety and removal

Automatic edits support one literal `emdash({...})` call and literal plugin arrays. Dynamic expressions, spreads, ambiguous config or unsupported versions receive an error with no edits. npm is tested; pnpm command selection exists but a complete pnpm installation has not been executed.

The CLI backs up config, package manifest and locks under `.quixforms/`, installs dependencies and runs the site's build. Failure restores those files; node_modules may need a package-manager reinstall. It never deploys. `doctor --project DIR` reports versions. `remove --project DIR --dry-run` previews removal; `remove` restores the unchanged managed config and keeps dependencies and Core data. It refuses to overwrite later config customizations. Rebuild/redeploy afterward.

To test switching a managed full installation to Core alone: stop the server, run `remove`, run `install --core-only`, then restart. Core data must remain. To remove only Advanced in a customized site, remove its native descriptor from the plugins array, keeping the sandboxed Core descriptor. There is no automated upgrade/version rollback command yet; keep backups and prior tarballs.

## Acceptance checklist — record pass/fail and evidence

- [ ] Core only: create a blank and template form; configure labels, choices, required flags, placeholder, widths, add/duplicate/delete/reorder fields. Test enough fields to cross editor pagination.
- [ ] Configure nested AND/OR visibility and conditional-required rules. Test empty, numerical and choice conditions; confirm hidden required answers are not demanded or stored.
- [ ] Draft is unavailable publicly; publish makes the form available; unpublish hides it. Duplicate a saved form and verify the copy is a draft, rules/options are retained and no entries were copied.
- [ ] Configure multiple notifications, disable one, add nested Send conditions, change confirmation and appearance. Verify actual delivery using your configured transport; verify delivery failure does not lose the accepted entry.
- [ ] Restore a revision. The restored form must be a draft and existing entries must remain.
- [ ] Native: add fields by click and drag, reorder with mouse and keyboard buttons, undo/redo, preview desktop/mobile, edit Smart Logic, save settings and publish.
- [ ] Edit in Core → React → Core, including nested rules, multi-step fields, notifications and appearance. Compare data before/after. Repeat after removing Advanced.
- [ ] Open a second editor, save different changes, then save the stale editor. It must report a conflict instead of overwriting newer changes.
- [ ] Public Astro form: correct responsive rendering, keyboard labels and errors, multi-step Back/Next, conditional fields, server rejection of invalid input and successful stored submission with real CAPTCHA.
- [ ] Retry after a lost response; exactly one stored entry and one notification attempt. Different answers must not reuse an accepted submission key.
- [ ] Entries: read/unread, star, reference-prefix search, filters, pagination, notes, spam/trash/restore, page CSV/JSON and React’s Export all CSV/JSON. Export values beginning with `=`, `+`, `-`, `@` must not run spreadsheet formulas.
- [ ] Permanent erasure requires Trash and confirmation. Verify the entry and notes are absent afterward.
- [ ] Signed-out/non-admin users cannot read forms' private configuration, entries or exports. Public definitions must omit notification recipients.
- [ ] Repeat installer; no duplicate declarations. Customize config after install; removal must refuse to replace it. Test failing build rollback on a disposable site.

A script for an authenticated disposable site is available: `QF_TEST_URL=http://localhost:4333 QF_TEST_SESSION=/private/session.json node scripts/test-installed.mjs`. It creates a synthetic form and checks Core → React → Core; `--conditions` adds a real Block Kit notification-rule creation and React settings roundtrip; `--core-only` checks removal of Advanced and persistence of that form. With the example dynamic route installed, `--renderer` also publishes the synthetic form and verifies its public Astro rendering. The Playwright storage-state file contains a live admin cookie: keep it outside the repository and delete it after testing.

## Scope exclusions

No payments, file uploads, calculations, dedicated survey fields/reporting, conversational mode, webhooks, save/resume, marketing connectors or AI creation. HTML content is plain text. Search is by reference prefix, Core exports are paginated; React also aggregates up to 10,000 entries / 32 MiB into one file. Larger exports need the cursor API. Exports are not a transactionally frozen snapshot while entries change. Email attempts are inline without durable retry jobs. Do not attempt acceptance tests for these unimplemented features as though they were available.
