# QuixForms 0.1.0 development report

Updated 2026-10-24. **Not ready for npm or registry publication.** This is implemented development software; the full release acceptance targets remain incomplete.

## Repository and architecture

Repository: https://github.com/alexandru-b/QuixForms (private). Initial commit `39518b5d3da4977d4d7f70fbff49c8bf68700beb` is synced to `main`; subsequent development commits are listed in Git history. No package or public release has been published.

Development API target: EmDash 1.3.1. Source reference: `c238da2931b12ab58f6228a5a4d79551d05f6d3b`. No deployed production support matrix is certified. Core owns scoped storage; the React companion uses authenticated Core routes and has no separate database. Both editors use one schema, validation engine, templates and conditional rules. React preview and Astro rendering share FormView.

## Implemented capabilities

| Capability | Implementation and limits |
|---|---|
| Definition editing | Core and React; strict schema, stable IDs, atomic optimistic concurrency |
| History | Up to ten snapshots, pruned to keep the entire record under 900 KiB; restore UI pending |
| Templates | 16 shared choices including blank; 15 actual form templates; all parse and accept representative valid submissions in tests |
| Core editor | Up to eight fields per page, reduced for large UTF-8 configurations, labels, descriptions, required flags, choices, duplicate/delete/reorder, draft/publish, equality visibility editor |
| Advanced editor | Three panels, search, drag/drop, accessible move buttons, field options, nested logic, undo/redo, responsive preview |
| Autosave | Debounced for drafts, revision-protected; preserves edits during an in-flight save; pauses after conflicts/errors |
| Conditional visibility | Nested engine; sections span to next section/page, pages span to next page; hidden descendants stripped server-side; cycles rejected |
| Conditional required | Shared engine/API; full editing UI pending |
| Rendering | Dynamic definitions; isolated styles and input IDs, multi-step navigation; no theme injection by Core |
| Spam protection | Server Turnstile action/hostname verification, honeypot request field, 64 KiB body cap, bounded atomic rate limiter |
| Retries | Stable browser UUID for unchanged answers; server binds UUID to normalized payload hash; duplicate accepted submissions do not resend notifications |
| Submissions | Core and React inboxes, detail views, read/star controls, notes, spam/trash/restore, pagination, reference-prefix search |
| Exports | Authenticated cursor-paginated CSV/JSON; snapshot-based columns preserve deleted fields; CSV formula neutralization. React downloads one page, Core displays bounded CSV |
| Notifications | Fixed administrator recipients, conditional engine, EmDash transport; failed email does not undo accepted entries; zero matched notifications are marked skipped |
| MCP | Authorized read-form tool only |

Fields: text, paragraph, email, single-input name, unformatted phone, HTTP(S) URL, number, select, radio, checkbox group, consent, hidden, plain-text content, section and page break. All 15 field configurations have schema/render coverage, but not every field has a complete browser-submit-store-export journey. No field is certified production-ready yet.

Templates: simple/advanced contact, newsletter, quote, job application without uploads, event registration without payments, appointment request with textual dates, customer feedback using choices, support request, product inquiry, lead generation, multi-step inquiry, business registration, service request, volunteer application, plus blank. No specialized survey, payment or file template is advertised.

## Executed validation

Commands: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:browser`, and `cd sandbox-tests && npm test`.

- Unit/render/storage tests cover strict schemas, cycles, hidden values, CSV injection, stored text escaping, optimistic concurrency, rate limiting, entry updates, cross-form rejection, Block Kit validity, templates and UTF-8 history bounds. Final counts are recorded in the commit summary below.
- Official CLI 0.13.4 builds Core runtime, descriptor and manifest.
- Official local Worker Loader/D1 harness exercises real sandbox serialization and storage, host authentication/CSRF/permissions/method checks, successful submission, replay after CAPTCHA consumption, changed-payload replay rejection, entry status/notes/conflicts, indexed filters and host-validated inbox/detail pages. Three tests contain these assertions.
- Chromium tests use actual built Astro pages with explicitly mocked Core and CAPTCHA endpoints. They cover CAPTCHA isolation, input IDs, lost-response retries, builder editing, preview, API CSRF header, keyboard reordering, real drag/drop and autosave during in-flight requests. These browser tests and the real sandbox tests are separate boundaries, not one fully integrated deployed-site journey.
- Screenshot: `docs/screenshots/builder.png`, captured from the real browser fixture.
- Root npm audit evidence: `docs/root-audit.json`. The separately installed official test harness still has the advisories recorded in `docs/harness-audit.json`; it requires remediation/assessment. Audit counts are not proof of application security.

No live email or live Turnstile integration test, deployed Cloudflare test, deployed Node EmDash site, complete accessibility audit, or installer/upgrade/removal test has passed yet.

## Material limits and remaining work

1. Finish combined browser-to-real-EmDash journeys, including cross-interface roundtrips and platform deployment tests. Browser fixtures currently mock API transport.
2. Package workspace dependencies independently; current imports cross source directories. All npm packages remain private. The safe installer does not yet exist.
3. Complete Core nested rule editor, field settings, notifications/confirmations screens, revisions UI and form overview pagination in React. Existing advanced settings are preserved during unrelated Core changes.
4. Published forms change only after explicit Save published; autosave applies to drafts. A separate working draft/published snapshot workflow is not implemented. Autosave conflict handling pauses safely; a polished merge/reload experience remains pending.
5. Finish full-text entry search, bulk actions, retention/erasure and complete export aggregation. Search currently means reference-prefix search only. Existing pre-inbox entries without status/reference metadata remain visible under All; updating an entry normalizes metadata. A bulk migration is pending.
6. Rate limits are 120 attempts per form per minute and 20 per hashed client bucket. The fixed 64-bucket scheme stores no IP addresses and bounds storage, but collisions can conservatively throttle unrelated clients; missing IPs share an unknown bucket. Host edge rate limiting is still recommended.
7. Email delivery is inline and attempted once. Interruption can leave notification status pending; durable delivery jobs and retries are not implemented.
8. Finish narrow-screen entry tables, automated accessibility checks and deeper UI review. Core shows the latest five notes; React shows all notes. Notes are limited to 50 per entry.
9. Verify publisher identity/security reporting, license inventory, remaining harness advisories, and registry/npm installation before release.

Payments, uploads, signatures, dedicated surveys, calculations, webhooks, marketing integrations, save/resume, conversational presentation, conversion analytics and AI generation remain unimplemented. QuixMail is optional and not separately tested. No automatic GDPR compliance claim is made.

Target public release remains November 30, 2026 subject to the above gates.

Final local unit count for this continuation: **57 tests passed**, plus TypeScript and the official Core build. Browser/runtime results are documented above and in their checked-in suites.

Final browser count: **4 Chromium tests passed**. Final official sandbox count: **3 tests passed**, with the workflow assertions described above. The first GitHub Actions run for the initial commit also passed; later runs should be checked against their exact commit.
