# QuixForms 0.1.1 manual acceptance kit

Sandboxed Core is published in the EmDash registry. Native packages are source-installed; this guide also covers local acceptance checks. Test with synthetic data in a separate site. The release report lists unresolved gates. Both interfaces use the same sandboxed Core; “installed/native” adds a React authoring interface, not a second backend.

## Tested versions and prerequisites

Node 24; EmDash 1.3.1; Astro 7.4.13; React 19.2.0; @astrojs/react 7.1.1. The Node example uses @astrojs/node 11.1.14, @emdash-cms/sandbox-workerd 0.9.5 and workerd 1.20261024.1, with security overrides for Sharp 0.35.5 and Miniflare's Undici 7.30.1. Use localhost for local passkeys, or HTTPS with your real hostname. Set `EMDASH_SITE_URL` to that origin. Configure EmDash's persistent encryption key according to its deployment guide before saving secret plugin settings.

Cloudflare requires EmDash's official sandbox integration, Worker Loader `LOADER` binding, PluginBridge export and a compatible paid Workers plan. A deployed Cloudflare acceptance run is still outstanding; the local official Worker/D1 harness is not that deployment test.

## Build the source artifacts

From a checkout of this repository:

```sh
npm ci
npm run build
npm run pack:candidate
npm run bundle:candidate
```

`artifacts/` contains five npm tarballs, `checksums.json`, and the official `quixforms-0.1.1.tar.gz` registry bundle. The CLI verifies the npm artifact checksums before installation. The locally built bundle is unsigned; for a signed registry installation, search for `@emquix.com/quixforms` in EmDash Registry. Do not replace EmDash's registry verification with an arbitrary upload endpoint.

If you received the assembled test archive, extract it and install its local CLI into your test site:

```sh
npm install /absolute/path/quixforms-0.1.1-manual-test/artifacts/emquix-quixforms-cli-0.1.0.tgz
npx quixforms install --artifacts /absolute/path/quixforms-0.1.1-manual-test/artifacts --core-only --dry-run
```

Remove `--dry-run` to install; substitute `--with-core` for the full installation. These commands use the local CLI package, not an unpublished npm registry name. `npm run kit:candidate` assembles the archive from a source checkout. CI also attaches it as a downloadable workflow artifact after checks pass.

## A. Sandboxed Core alone

### Windows local checkout

The working copy prepared on 2026-11-20 uses an isolated real EmDash site in
`.local/site`, with Core, Advanced, SQLite and `/forms/[id]` installed. From the
repository root, restart it with:

```powershell
npm run local:start
```

Open `http://localhost:4333/_emdash/admin/` and complete the initial EmDash
account/passkey setup yourself. The Core and Advanced URLs are listed below.
The startup script binds only to loopback, keeps an encryption key in the
ignored `.local/site/.env`, and supplies the Windows executable location expected
by the pinned EmDash workerd runner. Keep `.local/site` to retain test data and
settings. Never commit or share its database, encryption key or session state.

To reproduce this site in a fresh checkout after `npm ci`, `npm run build` and
`npm run pack:candidate`:

```powershell
New-Item -ItemType Directory -Path .local/site -Force
Copy-Item examples/node-test-site/* .local/site -Recurse
Push-Location .local/site
npm install
Pop-Location
node packages/installer/src/cli.mjs install --project .local/site --artifacts artifacts --with-core
New-Item -ItemType Directory -Path .local/site/src/pages/forms -Force
Copy-Item examples/companion-page.astro '.local/site/src/pages/forms/[id].astro'
npm --prefix .local/site run build
npm run local:start
```

For automated verification, install the separate harness once with
`npm --prefix sandbox-tests ci`, then install Chromium with
`npx playwright install chromium`. Run `npm run test:release` for the production
package build, typecheck, unit tests, browser tests, official sandbox tests and
registry bundle validation. The latest candidate passes all 110 tests and official
bundle validation. Its runtime is 75.7 KiB against the 128 KiB limit. See the
release report for the exact artifact hash and remaining deployment acceptance.
If browsers have already been downloaded to `.local/browsers`, the browser test
configuration uses that location automatically. Browser failures retain a trace
and screenshot under `test-results/`. Existing GitHub Actions checks run on pushes
and pull requests; local changes are not pushed automatically.

The browser fixture mocks Core and CAPTCHA. Passing it does not establish live
CAPTCHA/email delivery or replace authenticated manual acceptance of the real site.

CAPTCHA is optional. With no complete Turnstile key pair, published forms must
submit without a token or CAPTCHA script. Admin screens display **CAPTCHA off**.
With both keys configured, missing tokens or failed verification must block
acceptance; provider outages must not silently disable a configured CAPTCHA.
Server validation, rate limits and honeypot checks remain enabled in either mode.
Only Turnstile is currently implemented, not reCAPTCHA.

The prepared local site has an embedded contact form at
`http://localhost:4333/contact`. `examples/contact-page.astro` provides the reusable
page: replace `your_form_id`, copy it into the site's pages directory, then rebuild.

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
<Form id="YOUR_FORM_ID" pluginId="YOUR_INSTALLED_PLUGIN_ID" />
```

Copy the installed plugin ID from Core's Embed & setup screen for registry Core; the local config-managed default is `quixforms`. Pass it in the dynamic route too. Renderer 0.1.1 supports this property. The wrapper includes scoped CSS and the React hydration directive. It reads the site key from Core. With both Turnstile keys configured, missing or failed verification rejects submissions. Without both keys, forms work without CAPTCHA. No test-mode bypass is shipped.

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

### Notification message bodies

Core → Notifications and Advanced → Settings → Notifications both provide a
**Message body** textarea. Bodies are plain text and support `{all_fields}`,
`{form_title}` and `{entry_reference}`. Leave blank to send the accepted answers
automatically. Example:

```text
Hello team,

A new entry was received for {form_title}.

{all_fields}

Reference: {entry_reference}
```

Save in one editor and reopen in the other. Verify conditions/enabled state are
preserved. Test the rendered body with the configured email transport before
enabling real notifications. Templates are limited to 10,000 characters and
expanded bodies to 100,000 characters; an expansion/delivery failure retains the
entry and records failed notification status.

### Advanced workspace checks

Open `http://localhost:4333/_emdash/admin/plugins/quixforms-advanced`. Use
**Add New** to search/filter templates, preview one, name the form and create a
draft. Reopen it from the form library. Fields, Settings and Entries use the same
Core record. The library search and counts cover loaded forms; use Load more to
fetch additional pages.

In Fields, add by click/drag, select a field, switch General/Advanced/Smart Logic,
edit/reorder choices and use undo/redo. Test fullscreen and Escape. Ctrl/Cmd+S
saves; Ctrl/Cmd+Z and Shift+Z undo/redo outside text inputs. Desktop/mobile preview
can be completed/reset locally: this must create no entry or email.

Settings has General, Notifications, Confirmations, Appearance, Spam Protection
and Revisions sections. Verify changes survive switching sections and saving.
Drafts autosave after valid edits; published forms require explicit saves. Publish
and Unpublish must only change status after a successful Core save. A rejected
save must preserve local edits. Undo must preserve publication status. Revision
restoration blocks competing edits and reopens the restored definition as a draft.

Embed shows the actual Astro import/component and a configuration checklist.
Missing Turnstile keys must be reported accurately. Configuration presence does
not establish working CAPTCHA/email delivery. Check keyboard focus inside the
dialog and return to the opening button after Escape.

### Focused sandboxed builder checks

The Core overview now shows a forms table and counts for the current page only.
It reports whether Turnstile keys are configured, without claiming verification
or email delivery. Use **Open plugin settings** to configure the keys; no test
bypass is enabled.

Open a form, then use **Edit field** in its paginated field table. One field's
options are shown at a time. Adding a field selects it, including across page
boundaries. **Settings** contains the title, confirmation and appearance;
**Notifications** retains its existing conditional editor. **Form outline** is a
read-only admin outline, not a live visitor form or submission simulator.
**Embed & setup** supplies the correct Astro component and a setup checklist.

Test a Number field with minimum `1.5` and maximum `10`: save in Core, open its
Advanced options in native React, and verify both limits. Save a new label in
React, then reopen the field in Core. Clear an optional limit and verify that
it is removed. A minimum above the maximum, non-finite limits, and stale-editor
saves must leave the saved definition unchanged. On the public renderer,
out-of-range answers must fail validation and create no entry.

Deleting a field opens a confirmation. A field referenced by conditions cannot
be removed until those references are changed. Existing entry snapshots remain
untouched. Published forms display a warning because each saved edit affects
the public definition immediately; a separate unpublished working copy remains
an outstanding feature.

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
