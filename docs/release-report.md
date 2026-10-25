# QuixForms 0.1.0 manual acceptance candidate

Updated 2026-10-25. **Prepared for controlled manual testing; not approved for public production release.** No npm package, signed registry release or GitHub release has been published. Use synthetic data until the gates below are closed. Target release remains November 30, 2026, subject to testing.

## Repository, versions and architecture

Repository: https://github.com/alexandru-b/QuixForms (private). Earlier pushed milestones: `39518b5d3da4977d4d7f70fbff49c8bf68700beb` and `54b0c51caa3224a4e863d23357615e2e68455d43`. Use Git history for the exact candidate commit; the test archive records artifact checksums and the exact source commit in BUILD-INFO.json.

All five QuixForms packages are version **0.1.0**: engine, core-plugin, advanced, astro and cli under the proposed `@emquix` scope. They remain private. Host target: **EmDash 1.3.1**, official plugin CLI **0.13.4**, Block Kit **1.3.1**, official test host **0.2.10**. Source reference: `c238da2931b12ab58f6228a5a4d79551d05f6d3b`. Tested Node runtime: **24**; Astro **7.4.2**, React **19.2.0**, @astrojs/react **7.1.1**. Node sandbox runner **0.9.5**, workerd **1.20261024.1**. Broader version compatibility is not certified.

Core owns all plugin-scoped forms, history and entries. Native React calls Core's authenticated same-origin routes using the existing administrator session and host CSRF header. There is no shared database access, second form store, private API secret or native permission bypass. One schema/registry/validation/conditions implementation supports both editors. React preview and Astro rendering use the same FormView. [ADR](architecture.md).

## Implemented scope

| Capability | Implementation and limits |
|---|---|
| Definitions | Core and React; strict schema, stable IDs, atomic optimistic concurrency; whole-form duplication creates a draft with fresh history and leaves entries on the original |
| Revisions | Up to ten snapshots in a byte-bounded document; restore UI in both editors, restored form becomes a draft |
| Templates | 16 shared choices including blank; 15 genuine editable templates validated with representative submissions |
| Core field editing | Paginated field forms; labels/descriptions/placeholders, required flags, choices, widths, duplicate/delete/move; draft/publish |
| Core logic | Code-free nested AND/OR groups and condition editing for visibility and conditional required; progressive navigation |
| Advanced editor | Three panels, search, actual drag/drop, move buttons, field options, nested logic, undo/redo, responsive shared preview; paginated form overview |
| Autosave | Drafts only, revision-protected; retains edits during in-flight saves; pauses after error/conflict |
| Conditions | Twelve operators, nested groups, section/page descendant visibility, server stripping of hidden values, rejected cycles/dangling references |
| Public rendering | Astro component, dynamic definition fetch, isolated styling/IDs, multi-step navigation, four appearance presets |
| Spam controls | Required server Turnstile action/hostname verification, honeypot API field, 64 KiB submit cap, bounded atomic rate limiting |
| Retry identity | Browser UUID retained for unchanged answers; server payload hash; accepted replays do not resend notifications |
| Entries | Both interfaces: detail, read/star, notes, spam/trash/restore, pagination, reference-prefix search, filters, permanent erasure from Trash |
| Export | Private paginated CSV/JSON using submission snapshots; spreadsheet-formula neutralization. React downloads a page or aggregates all matching pages (10,000-entry / 32 MiB browser limit); Core displays bounded CSV/JSON with next-page controls |
| Notifications | Both editors configure up to five fixed recipients, subject and enable/disable. Nested conditional routing is editable in both interfaces. EmDash transport; email failure does not undo an entry |
| Confirmations | Configurable inline plain text; no redirect/conditional confirmation UI |
| MCP | Authorized read-form tool only |
| Installation | Independently packed tarballs, local official registry bundle validation, npm installer with dry-run/checksums/AST edits/backups/build verification/removal |

Fields implemented: text, paragraph, email, single-input name, unformatted phone, HTTP(S) URL, number, select, radio, checkbox group, consent, hidden, plain-text content, section and page break. These 15 types have schema/render coverage; a complete browser-submit-store-export journey for every type is still a release gate. No advanced field is advertised as supported.

Templates: simple/advanced contact, newsletter, quote, job application without upload, event registration without payment, appointment request with textual dates, customer feedback using choices, support request, product inquiry, lead generation, multi-step inquiry, business registration, service request and volunteer application. Blank is a starting choice, not counted as a finished template.

## Executed evidence

- `npm run typecheck`: passes.
- `npm test`: **76 tests passed** across ten files. Covers strict schemas, conditions, hidden values, XSS escaping, CSV injection, concurrency, rate limits, templates, entry erasure, Block Kit bounds, nested rule preservation and installer AST/filesystem behavior, notification delivery failures/replays and Block Kit form-state identities. CLI rollback tests use a controlled package-manager stub; they do not substitute for the real install test.
- `npm run build`: builds the shared/native server packages and official sandbox runtime/manifest/descriptor. Upstream declaration-generation warnings occur in the official plugin CLI; runtime bundle build and host loading succeed. TypeScript source checking passes separately.
- `npm run test:browser`: **7 Chromium tests passed**. Real built Astro pages with explicitly mocked Core/CAPTCHA routes cover independent widgets, retry identity, drag/drop, keyboard reordering, previews, autosave in-flight edits, entries, settings/notification condition persistence, complete CSV exports across historical schemas and axe-core checks for WCAG 2/2.1 A/AA on the tested public controls and builder state. Automated accessibility scans do not replace keyboard/screen-reader/mobile assessment.
- `cd sandbox-tests && npm test`: **3 official runtime tests passed**, including Worker/D1 serialization/storage, host authentication/CSRF/RBAC/method checks, accepted submission with a stubbed CAPTCHA provider, replay behavior, entry notes/status/filter/conflict, host-rendered Block Kit pages, revision restore/unpublish, whole-form copying, permanent erasure, conditional delivery through the host’s capturing email transport and private entry/export route denial for unauthenticated/subscriber users. The CAPTCHA provider remains stubbed.
- Official `emdash-plugin bundle` validates and produces the local registry tarball. No signed registry installation is claimed.
- The packed CLI was installed separately and its executable successfully ran `doctor`. Five independent npm tarballs were built; the runtime packages were installed into a separate Node EmDash project; its **production Astro build passed**. Installer dry-run, repeat/idempotence, actual removal and reinstall were executed. A subsequent Core-only production build passed; the native navigation disappeared and the previously edited form remained accessible through Core.
- A **real local Node production server** loaded Core through the official workerd runner and both admin pages through EmDash. Chromium completed EmDash setup with a virtual test passkey. A form and notification condition created through actual Core controls were edited through native React and reopened with the changes and conditional rule preserved. The checked-in `scripts/test-installed.mjs` repeats this test using a private test session file. No Core API mock is used for this journey.
- The independently installed Astro package compiled into a real dynamic `/forms/[id]` route and rendered a published definition from the live sandbox backend. The missing-CAPTCHA state was visible; this was not an accepted live-provider submission test.
- Screenshot `screenshots/core-installed.png` is from the real installed Core; `screenshots/builder.png` is from the browser fixture; `screenshots/astro-installed.png` shows the real installed renderer.

Live external Turnstile and email delivery, deployed Cloudflare, exhaustive accessibility, all-field submission journeys and signed registry installation have **not** passed. Local Worker/D1 tests and the real Node editor test are separate evidence, not a claim of a complete live-provider public submission journey.

Both dependency audits currently report **zero advisories**; evidence is recorded in `root-audit.json` and `harness-audit.json`. The isolated harness pins patched Vitest 4.1.12 / Vite 8.3.5, Zod 4.6.6 and Miniflare’s Undici 7.30.1. Audit results do not prove application security. Dependency license inventory comes from lockfile declarations, not a completed legal certification. See SECURITY.md for threat controls and remaining review.

## Release blockers and known limitations

1. Complete real browser → public renderer → live CAPTCHA → sandbox storage → configured email → entries/export journeys, including every supported field and multi-step branching.
2. Validate a real Cloudflare deployment and signed registry installation; confirm publisher identity and operational private vulnerability reporting.
3. Complete cross-interface roundtrips for nested conditions, multi-step and all advanced metadata after upgrades. Current real-site roundtrip proves the standard form and conditional-notification path; automated engine tests cover more configurations separately.
4. Registry/npm publication remains unapproved. CLI supports a narrow AST shape; pnpm is not end-to-end verified. No automated upgrade/version rollback exists. Initial native install/removal needs rebuilding and redeploying. The host must already configure React and an official sandbox runner.
5. Full-text entries search, bulk operations and automatic retention are pending. Search is reference prefix. React can aggregate exports within its memory/entry limits, and reports an error instead of silently truncating larger exports. Exports are not a transactional snapshot of concurrent moderation/deletion; export during a quiet period when consistency matters. The current Block Kit interface displays bounded export pages; aggregate file downloads use React or the authenticated API. Core shows latest five notes, React all notes; entries cap notes at 50. Legacy entries without newer indexed metadata remain visible under All; bulk migration is pending.
6. Email is attempted inline once; process interruption can leave pending status. Durable jobs/retry queues and per-notification delivery logs remain pending. Conditional notification editors are implemented in both levels; dynamic recipients, customizable message bodies and autoresponders remain pending.
7. Published forms change on explicit save; there is no separate unpublished working copy of a published form. Conflicts pause rather than merge. Revision history is bounded, not an audit log.
8. Core's nested editor has a navigation depth limit; deeper valid definitions remain preserved and may require API editing. Default values, input masks, advanced validation controls and comprehensive appearance customization remain pending.
9. Rate limits are 120/form/minute and 20/hashed client bucket/minute across 64 buckets. No IP is stored, but bucket collisions can conservatively throttle unrelated users; clients without IP metadata share a bucket. Load testing and deployment-specific edge controls remain pending.
10. Finish accessibility and small-screen entry-table review, interruption/failure testing, dependency/security review and support documentation before production approval.

Payments, uploads, signatures, dedicated surveys/reporting, calculations, webhooks, marketing integrations, save/resume, conversational presentation, analytics and AI generation remain **planned but unimplemented**. QuixMail compatibility follows the standard transport but has not been tested separately. No automatic GDPR-compliance claim is made.

## Manual handoff

Use [manual-testing.md](manual-testing.md) for both installation levels and a checkbox acceptance list. [comparison.md](comparison.md) classifies feature coverage against the requested WPForms Pro/Gravity Forms target. Their current pages were inaccessible during research, so no unverified competitor pricing/plan claim or full parity claim is made.


## 2026-10-25 hardening evidence

Real browser testing exposed a Block Kit integration bug: forms at the same list position reused local input state across screens. Core now supplies per-form identities plus fingerprints of saved field configuration. This resets changed configuration while preserving unrelated unsaved sections. The regression has a unit test and the real installed notification workflow now passes.

Core rule groups show concise summaries and open one condition at a time. This bounds responses even with 100 long Unicode field labels; the response-size and official Block Kit validator tests pass. Shared CSV serialization now lives with the shared submission model, so single-page and complete React exports use identical escaping and historical field mapping.

The final packed candidate was installed in Core-only mode after removing the companion. Its production build and `scripts/test-installed.mjs --core-only --conditions` passed: native navigation was absent, Core rendered successfully, and forms plus notification conditions previously edited in Advanced remained intact.

The previous candidate commit `657229ed354b1c6b95441926449394c9ac36ba2d` passed the complete GitHub Actions workflow, including archive creation. Later candidate commits must be assessed against their own CI run.
