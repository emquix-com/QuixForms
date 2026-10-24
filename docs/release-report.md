# QuixForms 0.1.0 development delivery

**Release decision: blocked. Neither npm nor registry publication is approved or ready.** The full requested product has not been completed. This is executable development source with tests, not a production release.

## Architecture and implementation

Sandboxed Core owns definitions, ten atomic historical snapshots and entries. Native React has no storage and uses authenticated Core HTTP APIs. The same schema, validation and nested rule evaluator power both. Astro and React preview share a renderer. See architecture.md for verified contracts.

Core source implements form creation from one contact template, field editing, pagination at eight fields, duplication, reordering, deletion with reference validation, simple visibility editing, draft/publication state, fixed-recipient notifications, confirmations, paginated entries and CSV API. Notification rules and conditional-required rules exist in the schema/engine. Advanced existing rules are preserved during unrelated Core edits. One permission-controlled read-form MCP tool is declared.

Advanced source implements a three-panel editor, searchable catalog, native HTML drag/drop reorder and insertion, click-to-add, move buttons, field settings, nested visual rules, undo/redo, responsive preview, explicit save/publication and unsaved-change browser protection. It does not implement autosave, revisions UI, reusable groups, row resizing or a full entries dashboard.

Field configurations: text, paragraph, email, name (single input), phone (unformatted text), HTTP(S) URL, number, select, radio, checkbox group, consent, hidden, plain-text content, section and page break. Renderer/schema tests cover all 15 catalog types, but full browser-submit-store-export coverage for every type is outstanding. Consequently none is certified production-ready. Rich HTML is intentionally absent.

Integrations implemented in source: EmDash email, Turnstile and read-form MCP. Live email/Turnstile transport testing remains outstanding. QuixMail is neither required nor separately tested.

## Verification evidence

- TypeScript checking passed against EmDash 1.3.1.
- 32 unit/render/storage-adapter tests passed (initial toolchain Vitest 3.2.4); these include conditional stripping, cycles, schema versions, invalid values, CSV injection, text escaping and concurrent revision rejection.
- Official plugin CLI 0.13.4 built the runtime, manifest and descriptor, including MCP route validation.
- Actual Astro 6.0.8 demo build completed, producing one static renderer-demo page. This is not a real EmDash end-to-end submission test.
- Official local Worker Loader/D1 sandbox: form save/publication/read/invalid-submit test passed. Production dispatcher test passed for unauthenticated access (401), missing CSRF (403), subscriber denial (403), administrator access (200), and forbidden method (405). These are local runtime tests, not deployed Cloudflare tests.
- No deployed Node EmDash site, deployed Cloudflare Worker, live email delivery or actual Turnstile submission has been validated. No real browser drag/drop/accessibility or install/remove/upgrade test has passed yet.

## Required before release

1. Complete successful live submission and cross-level/browser journeys, using the production sandbox and authenticated route dispatcher. Cover RBAC, CSRF, cross-tenant access, private exports and failure recovery.
2. Repair CAPTCHA instance isolation and retries; implement bounded rate limiting, retention and idempotent delivery recovery. Current inline email has at-most-one attempt with possible pending status on process interruption.
3. Build a usable searchable inbox with entry detail, notes, spam/trash, bulk operations, export UI and erasure tools. Current entries table uses raw JSON text and is not the target UX.
4. Complete template library, Core nested logic editing, configuration screens, React autosave/conflict resolution, navigation and revision restore.
5. Test and package standalone workspace dependencies: current source imports cross package directories. All packages are private to prevent accidental publication. CLI installer and safe config transform do not exist.
6. Verify publisher ownership and actual security contact, dependency licenses and advisories, registry install/uninstall and npm packaging. The proposed security URL is not yet operational.
7. Add real screenshots, accessibility audit, browser test suite and supported platform matrix.

Payments, private uploads, surveys, calculations, webhook delivery, direct marketing integrations, save/resume, conversational mode, analytics and AI generation are deferred and not advertised as working.

## Repository and versions

Local repository: /workspace/QuixForms. GitHub metadata lookup for alexandru-b/QuixForms returned 404; this does not establish availability or permissions. No remote repository was created or pushed. EmDash source reference: c238da2931b12ab58f6228a5a4d79551d05f6d3b. Package versions and integrity hashes are captured in package-lock.json; harness dependencies have a separate lockfile. No supported production EmDash version is claimed, only a 1.3.1 development API target.

Public release by November 30, 2026 remains a target subject to completing these gates. Recommended next work is a real authenticated EmDash end-to-end harness, followed by the inbox and installer, before adding more field types.

## Final toolchain verification

TypeScript and 33 tests pass on Vitest 5.0.5, including official Block Kit validation of the paginated 100-field editor. The Astro demo builds on Astro 7.4.2 with @astrojs/react 7.1.1. Zod is pinned and overridden throughout the root tree to 4.6.6 to address GHSA-mrhx-c7xc-m3w5. Root npm audit reports zero advisories after upgrades; this is not a security certification. The isolated harness has its own dependency tree and must be audited separately.

The isolated official sandbox harness audit reports 19 advisories: 12 high, 6 moderate, 1 low, zero critical. See harness-audit.json. These are development-runtime dependencies, not bundled into Core. They still require remediation/assessment before public release. Root audit evidence is root-audit.json.

## Successful local submission regression

All three official sandbox/runtime tests now pass, including a POST through the real dispatcher, Worker Loader and D1 storage with a stubbed successful Turnstile response. This test exposed and fixed null-prototype object serialization at the sandbox boundary. The CAPTCHA provider was stubbed; this is not a live CAPTCHA verification or a browser end-to-end test. The accepted entry was inspected in real local plugin storage. Notifications were not enabled in this fixture.
