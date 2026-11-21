# QuixForms release verification

Updated 2026-11-21. **Sandboxed 0.1.2 is published and passed registry assessment; the featured banner and Forms icon render on the public listing.** The previous 0.1.1 passed installation/update verification. No npm package or GitHub release has been published. The historical acceptance gaps below remain separate from registry publication.

## 2026-11-21 registry artwork release

### Screenshot gallery preparation — 0.1.3

Captured the actual sandboxed builder and submissions inbox on the disposable
registry site. Created the Contact us form (`f_3d34ace32ebe451b98bd35dfb18939a7`)
and submitted three synthetic example.com enquiries through its public renderer;
the UI confirmed acceptance and the inbox retained all three. Marked one demo
entry read and starred. Existing forms and entries were preserved.

Gallery files are lossless WebP: builder 1280 × 720 (196,678 bytes), inbox
1564 × 720 (130,034 bytes). They are separate release media, not runtime imports.
No visitor data, Advanced editor or simulated controls appear in the captures.
Manifest uses the pinned CLI's `release.artifacts.screenshots` contract. This
preparation does not establish that the new gallery is published yet.

Published sandboxed 0.1.2 with the EmQuix Forms icon (256 × 256 PNG, 36,255 bytes)
and featured banner (1536 × 512 WebP, 38,116 bytes). Verified the supported
`release.artifacts.icon` and `release.artifacts.banner` contracts against the
pinned official plugin CLI 0.13.4. These are release-scoped images, so 0.1.1
must remain immutable. Form runtime source, permissions and host compatibility
are unchanged. The complete [CI workflow passed](https://github.com/emquix-com/QuixForms/actions/runs/44911391984)
on source `6f00cf8e124ec8f3e3c441030f5f1437eb0d9a5b`, including tests, bundle validation and acceptance-artifact assembly.

- Release CID: `bafyreiafkxtexpobgejvmc2czjmgwiwnhvnfuornzcnqul75rnx4nzae3e`
- Package blob CID: `bafkreihqywmfvwm2xbgmuhuojp2x2kzf5654x45j6vfmd7fbceebvimf6i`
- Package SHA-256: `f0c5985ad99ab84cca1e8e4bf57d2b25efbbcbf3a9f54ac1fca111081aa185f2` (25,469 bytes)
- Icon blob CID: `bafkreiccacgn3qtzlfux3nvehdv2zql635hljvzdvoaohgrwi6exus35im`
- Banner blob CID: `bafkreiaie66s5tgcwjweggrmcl2li4acoh3b357gpvfx4zsm7othcos4am`

Downloaded the real public package and both artwork blobs. Checksums and image
dimensions match the source files. The public 0.1.2 backend is byte-for-byte
identical to the public 0.1.1 backend: SHA-256
`977546190826275a4f2e2b77195c5668d54136d4467a0a773528326743eb1e24`.
Images are separate release blobs; the plugin package remains 24.9 KiB.
The changelog profile update uses the supported `update-package` command.
Both profile and release passed automated registry assessment. The registry
reports 0.1.2 as latest. A real browser verified the public listing's banner
image loaded and visually confirmed the featured image and Forms icon above
the product description. The earlier 0.1.1 installation checks are not claimed
as a separate 0.1.2 installation run; the public runtime checksum is identical.

## 2026-11-20 Windows local verification

### First sandboxed publication

**Latest release: 0.1.1.** Published from `57ef6af`, following the full green
[CI run for the correction](https://github.com/emquix-com/QuixForms/actions/runs/44758980559)
and offline validation of the listing-only size adjustment. Runtime is
**77,612 bytes**, below 128 KiB; Advanced and React are absent from the bundle.
The public listing and its corrected generated-ID instructions passed assessment.
No immutable release was overwritten.

- Latest profile CID: `bafyreihmhvqe3zr2xmlg7yq433ktnhe77tf5keqwpskowd7kyuuammlllm`
- Release: `at://did:plc:6clqzka76ueshbureaecbrfj/com.emdashcms.experimental.package.release/quixforms:0.1.1`
- Release CID: `bafyreiauewpk4sjpeg3cbohy6dgck5qapcnx3oq44k42v4m6jovbuk2s4a`
- Blob CID: `bafkreifuckrzdvagnweilr5dh5wlxglfdk45cz3dnhsps7yyzev6rxbt5a`
- Published archive: **25,467 bytes**, SHA-256 `b412a391d4066d8885c7a33f6cbb99651ab9d1676369e4f97f18c92be8dc33e8`

Downloaded the public 0.1.1 blob and verified its checksum and byte count.
The normal plugin-manager update flow installed 0.1.1 on the registry test site.
The updated builder showed the correct generated plugin ID in its embed snippet;
the published form and existing entry remained present after the update.
Before that update, restarting the site retained the plugin, published form and
the accepted entry. This is a real loopback Node/EmDash verification, not a
deployed Cloudflare claim. Native renderer 0.1.1 is distributed from source;
other native companions remain 0.1.0 and npm-private.

The following records describe the initial 0.1.0 release, retained unchanged.

Published `@emquix.com/quixforms@0.1.0` through the official plugin CLI after
renewing the existing publisher session. No immutable release was overwritten.
The source revision is `bfb4e0b2a584acc66baf48876093072df76940e8`, whose
[GitHub checks passed](https://github.com/emquix-com/QuixForms/actions/runs/44756151001).
GitHub private vulnerability reporting is enabled and verified.

- Profile: `at://did:plc:6clqzka76ueshbureaecbrfj/com.emdashcms.experimental.package.profile/quixforms`
- Profile CID: `bafyreifs3wffqxwsdnup46572bn2ld5al25giz3mh2nw7yfoyylsqp7v44`
- Release: `at://did:plc:6clqzka76ueshbureaecbrfj/com.emdashcms.experimental.package.release/quixforms:0.1.0`
- Release CID: `bafyreih5s4q3wb3mek3zasyghi2wmxtxags2646wu3xz6teeiawazshitu`
- Blob CID: `bafkreibxvk5wd26si4eepbziw5wvlr7lfzhkuit62p4jcki6okqzkrlsse`
- Published archive: **25,422 bytes**, SHA-256 `37aabb61ebd24708478728b76d55c7eb2e4eaa227ed3f891291e72a195457291`

Downloaded the actual public PDS blob and verified both its byte count and
SHA-256 against the published candidate. Read back the authoritative profile
and release: all five documentation sections, MIT license, canonical repository,
EmDash `>=1.3.1 <1.4.0`, and the two declared capabilities match the candidate.
Both profile and release passed automated assessment. The public listing renders
all five sections. A clean EmDash 1.3.1 site verified signed publisher records
and the artifact through the normal installation dialog, accepted the declared
permissions, and installed Core under generated ID `r_4xtayw3d6d2fhnyc`.

The registry journey exposed a renderer integration defect: source-installed
Core used the ID `quixforms`, but registry installations receive a generated ID.
Renderer 0.1.1 now accepts `pluginId` for both public API requests; Core 0.1.1's
embed instructions include the host-provided ID. The new browser regression
and the embed-context assertion cover that boundary. A real browser used the
packed corrected renderer with the signed registry Core, edited and published
`Registry release smoke`, submitted synthetic answers without CAPTCHA, and
verified the inbox and CSV export with the same answers. No API mock was used.

The correction passes 87 unit tests, 16 Chromium tests and 8 official sandbox
tests (111 total), plus typecheck/build and official bundle validation. Windows
browser-fixture teardown required ending its identified process tree after all
16 checks completed; CI independently checks normal completion on Linux.

### Public repository and sandbox publishing preparation

The repository is now public at `emquix-com/QuixForms`. Updated the canonical
Git remote, package repository URLs and EmQuix author metadata. The sandbox
manifest pins the same verified `emquix.com` publisher DID used by QuixSEO:
`did:plc:6clqzka76ueshbureaecbrfj`. The official CLI's active session matches.
Added Description, Installation, FAQ, Changelog and Security listing sections,
an explicit EmDash 1.3.x host constraint and [publishing-plan.md](publishing-plan.md).
The listing explains the separate, currently source-installed renderer and free
Advanced companion instead of claiming registry installation includes them.

The final metadata candidate passed offline manifest/section-size validation and
the complete `npm run test:release` command: build/typecheck, **110 tests** and
official registry bundle validation. Runtime remains **77,495 bytes**, below
128 KiB. Rebuilt tarball SHA-256:
`c090da16bf0be2ffd968f92b7fbe9d2ba06c0a431584cfc6cebdbe005968c2ec`.
Read-only registry lookup returned `public: false`, `profile: null` for this
publisher/slug. No release record or package profile was created or modified.
Package npm-private flags remain in place for the separate npm release step.

### Notification bodies and publishing size — latest candidate

**The publishing size blocker is resolved.** The official runtime is now
**77,495 bytes (75.7 KiB)**, below the **131,072-byte (128 KiB)** limit with
53,577 bytes of headroom. The previously rejected candidate was 136,304 bytes.
The complete validated registry bundle is 82.0 KiB across three files; its tarball
is 25,428 bytes (24.8 KiB). `npm run test:release` exited successfully, including
the production build, TypeScript check, **87 unit tests, 15 Chromium tests,
8 official sandbox tests (110 total)** and official bundle validation/creation.
Registry tarball SHA-256:
`4dcd38b0321c607bc33e7124a50688c926625999b23b490a78492f16e8e19505`.

The size fix uses Zod Mini's functional schemas with the existing limits,
defaults, strict objects, refinements, numerical checks and unknown-version
rejection retained. A narrow shared-engine schema entry bundles the dependency
before the pinned EmDash compiler, whose inliner leaves direct `zod/mini` imports
external. Classic Zod remains solely for EmDash's build-time MCP metadata contract;
the official compiler strips that metadata from the runtime. Advanced/React are
still separate packages. No publishing limits were raised or bypassed.

Both Core and Advanced now edit an optional plain-text notification `body`
(10,000-character maximum). Supported tags are `{all_fields}`, `{form_title}`
and `{entry_reference}`. Missing/blank bodies retain automatic answer emails.
Tags expand from validated accepted values; visitor text is never reinterpreted
as a template. Expanded output is bounded before concatenation. Rendering or
delivery failure records a failed notification without losing the accepted entry;
replays do not resend it. Existing notification conditions and fixed recipients
remain intact. The schema adds this optional property within version 1, preserving
existing definitions; unsupported versions/properties remain rejected.

Tests cover body rendering, default/blank fallback, literal tag-like visitor text,
output bounds, accepted-entry retention, actual captured email text, Core editing,
older-client preservation, Advanced saving and existing validation/permission/
CAPTCHA behavior. The official host uses capturing email and stubbed CAPTCHA;
external delivery is not claimed.

Packed Core/engine/Advanced updates were installed into `.local/site`; its
production Astro build passed. A synthetic draft `Notification body acceptance`
was created in real Core, a multiline body saved and reopened, edited through
Advanced, then reopened in Core with the edit retained. Its notification remains
disabled; existing forms were not modified. Screenshot:
`.local/notification-body-core.jpg`. Nothing was published externally. Signed
registry installation and deployment/live-provider acceptance remain outstanding.

### Optional CAPTCHA and embedded contact page — latest behavior

At the user's request, CAPTCHA is now optional. With an absent/incomplete
Turnstile key pair, the public definition returns `captchaRequired: false` and
an empty public key; the renderer loads no CAPTCHA script and submits without a
token. Core accepts valid submissions, retaining server validation, rate limits,
honeypot rejection and idempotency. With both trimmed keys present, verification
remains mandatory: missing tokens, provider errors and rejected/mismatched checks
fail. No reCAPTCHA provider was added. Admin setup guidance in both editors now
states that forms work with CAPTCHA off. Earlier fail-closed-without-keys evidence
below describes the previous behavior and is superseded by this change.

Executed package build/typecheck, **83 unit tests, 15 Chromium tests and 8 official
sandbox tests (106 total)**; all passed. New cases cover absent/partial keys,
tokenless acceptance/replays, no CAPTCHA script loading and required-field
validation. Existing configured verification rejection tests still pass with
complete key-pair fixtures. The public definition exposes no secret.

Installed the packed Core/Astro/Advanced updates into the real local test site;
its production build passed. Created a dedicated published `Contact us` form,
with zero notification recipients, and embedded it at
`http://localhost:4333/contact`. A browser submission without CAPTCHA displayed
the confirmation and appeared in Core's inbox with all answers intact and
notification status `skipped`. No external email was sent. The page remains open
with a fresh form. Reusable page source: `examples/contact-page.astro`; local
screenshots: `.local/contact-page.jpg` and `.local/contact-submitted.jpg`.

This does not resolve the registry bundle-size blocker or establish configured
live CAPTCHA/email delivery. Bundle validation was not rerun in this change.

### Sandboxed launch assessment — earlier size-check failure

**Historical failure, resolved by the latest candidate above.** That `npm run test:release` gate exited
with failure at official bundle validation: `backend.js` is **136,304 bytes
(133.1 KiB)** and EmDash permits **131,072 bytes (128 KiB)** per file. The current
candidate could not be published as a valid registry bundle. Earlier successful
bundle evidence below predates the expanded builder. An older tarball in
`artifacts/` is not evidence that this candidate passed. `test:release` now includes
`bundle:candidate`, so this failure is visible in the normal release command as
well as CI. Reducing the runtime below the limit and rerunning the gate is required.

A source-map diagnostic using the same minifier/tree-shaking settings attributes
approximately **88.1 KiB to Zod**, **34.1 KiB to sandbox Core**, and **9.9 KiB to
the shared form engine/templates**, with the remainder unmapped overhead. The
diagnostic includes a source-map comment (136,340 bytes versus the official
136,304-byte runtime), so attribution is approximate. Its source list contains
**no Advanced builder, React or Astro renderer modules**. Zod's JSON-schema
processors/conversion code alone accounts for about 17.1 KiB. Advanced remains a
separate optional package; removing it from the site will not reduce this backend.
Local diagnostic: `.local/bundle-size-report.json`.

Before that packaging failure, the production build, TypeScript check and all
**104 tests passed: 83 unit, 14 Chromium and 7 official sandbox tests**. The three
new official-runtime cases cover all 15 supported field types through accepted
submission, storage and export; invalid numeric/choice/consent answers;
conditional page removal; conditional notifications; immutable entry snapshots;
formula-safe CSV; unsupported definitions and stale saves; missing/rejected/
wrong-action/wrong-host/malformed CAPTCHA responses; honeypot rejection and draft
privacy. Accepted CAPTCHA responses are isolated single-use HTTP stubs, and email
is the host's capturing transport. These are not external provider tests.

Real local Core UI checks passed for creation, field label persistence,
duplication, guarded field removal, confirmation settings, notification creation
and disabling, publication, empty inbox, revision restoration and reopening after
restart. The public Astro route rendered the saved fields, rejected a complete
answer set without bot protection, created no entry, then became unavailable
after revision restoration unpublished the form. Synthetic form
`Sandbox launch acceptance` remains a draft with its synthetic notification
disabled. Existing user forms were left intact. Screenshot:
`.local/sandbox-launch-status.jpg`.

Fresh dependency audits found advisories that supersede the older audit report.
Patched the workspace Astro pin to **7.4.13**, refreshed compatible transitive
Hono dependencies in both lockfiles, and updated the reproducible Node example
and installed local host to **Astro 7.4.13 / @astrojs/node 11.1.14**, with patched
Sharp 0.35.5 and Miniflare's Undici 7.30.1 overrides. These follow the
[Astro advisory](https://github.com/withastro/astro/security/advisories/GHSA-r3h5-4585-7x3w)
and [Hono advisory](https://github.com/honojs/hono/security/advisories/GHSA-4m76-xfj5-7975).
Final root, sandbox harness and installed-site `npm audit` runs each reported
**zero advisories**. The patched site's production build and authenticated Core
reload passed; it remains available at `http://localhost:4333`.

Launch still needs the bundle-size fix, a real CAPTCHA → stored entry → configured
email → export journey on the intended deployment, and signed registry installation.
Turnstile keys remain absent locally; no real provider credentials were changed,
no external email was sent, and nothing was published. Cloudflare deployment,
full browser coverage of every field/branch, mobile/accessibility and interruption
testing remain the broader acceptance limits described below.

### Latest Advanced workspace improvement

Advanced now provides a searchable form library and categorized template gallery,
template preview/custom naming, a unified Fields/Settings/Entries workspace,
editable choice rows, undo/redo, fullscreen and keyboard shortcuts. Settings is
organized into General, Notifications, Confirmations, Appearance, Spam Protection
and Revisions. Desktop/mobile previews complete locally without storing entries
or sending email. Embed provides actual Astro code and configuration guidance.
The workflow follows the official WPForms references in [comparison.md](comparison.md);
payments, uploads, signatures, calculations and integrations remain unimplemented.

Draft autosave preserves edits made during requests. Publish/unpublish is an
atomic revision-checked Core save; failed saves retain local edits and status.
Published forms require explicit saves, and undo preserves publication status.
Revision restoration blocks competing edits/saves and reopens a draft. Native
dialog focus returns to its opener after closing. Core's new admin-only GET
`setup` route returns only a boolean indicating Turnstile credential presence;
authentication/authorization and no-secret-response checks pass. Core still owns
all persistence; the shared definition schema is unchanged.

Executed against this candidate: `npm run test:release` passed the package/runtime
build, TypeScript check, **83 unit tests, 14 Chromium tests and 4 official sandbox
tests (101 total)**. Browser tests include creation/reopening, choice editing,
local preview completion, in-flight publication edits, conflicts, restoration,
modal focus and axe WCAG 2/2.1 A/AA scans of tested gallery/settings/embed states.
Browser Core/CAPTCHA routes are mocked; official harness CAPTCHA is stubbed.
Upstream declaration-generation and installed-site chunk-size warnings remain.

Packed Core and Advanced tarballs were reinstalled in `.local/site`, whose
production Astro build passed. On the real authenticated local admin, created
`Advanced workflow acceptance` from a template preview, edited a field label,
confirmation and appearance, saved and reopened it, completed a mobile preview,
verified the inbox stayed empty, published then unpublished it, checked Embed's
missing-Turnstile status and exited fullscreen with Escape. The synthetic form
remains a draft. Existing user forms were left intact. Evidence screenshot:
`.local/advanced-installed.jpg` (ignored local artifact). Server remains available
at `http://localhost:4333`. No real CAPTCHA or external email delivery was tested.

### Latest sandboxed builder improvement

Compared publisher documentation for the five requested EmDash competitors;
see [comparison.md](comparison.md) for sources, access limitations, implemented
changes and remaining priorities. No competitor runtime benchmark was performed.

Core now has a dashboard table, page-scoped counts, non-secret Turnstile key
status, focused field selection, type-specific options, numeric bounds,
pagination that follows selected/moved/new fields, guarded deletion, dedicated
settings, a bounded read-only form outline and corrected Astro embed guidance.
Published forms warn that saved edits take effect immediately. Native Advanced
options expose the same existing numeric bounds. Definitions, permissions and
storage ownership remain unchanged. Nested Block Kit forms retain fingerprinted
identities so changed saved data refreshes without mixing up field state.

`npm run test:release` passed with **82 unit tests, eight Chromium browser tests
and four official sandbox tests**, plus the package build and TypeScript check.
The new checks cover invalid/non-finite numeric bounds, stale edits, condition
preservation, secret non-disclosure, dependency-protected deletion, response
limits, nested form identities and the real Worker/storage/admin route. Browser
coverage includes native numeric-bound saving. CAPTCHA is still stubbed in the
automated submission journeys.

The packed Core/Advanced updates were installed into the existing local test
site and its production build passed. In the real signed-in UI, a synthetic
blank form was created, a number field was added and limits `1.5` through `10`
were saved. An attempted `20` minimum with `10` maximum was rejected; the
read-only outline retained the saved range. Advanced then displayed those limits,
saved a changed label, and Core reopened the field with both the new label and
original bounds. The synthetic form remains a draft. No email was sent and no
public CAPTCHA acceptance is claimed.

Separate working/live definitions, email attempt logs/retries, retention,
content-editor embedding and signed registry acceptance remain outstanding.

Verified checkout `f31b7a8` plus the local Windows portability changes, using
Node 24.20.0 and npm 11.19.0. `npm run test:release` exited successfully:

- Production package build and TypeScript check passed.
- 76 unit tests across ten files passed.
- Seven Chromium browser tests passed, including automated accessibility scans.
- Three official sandbox/Worker/database integration tests passed.

The official plugin CLI still emits declaration-generation warnings; the sandbox
harness also emits an RPC disposal warning. Neither caused a failing check.
The browser fixture mocks Core/CAPTCHA, and the sandbox harness stubs CAPTCHA;
these results do not establish live-provider acceptance.

Five local tarballs were packed and installed into `.local/site`. Its actual
installer dependency step and production Astro build passed on Windows; repeat
installation reported no changes. The local production server is bound to
`127.0.0.1:4333`; EmDash logged successful loading of Core, and its real public
definition endpoint returned the expected missing-form response. Advanced and
the dynamic `/forms/[id]` renderer are installed. The user subsequently completed
admin/passkey setup. The signed-in session loaded the saved form list, reopened
an existing form and displayed its selected-field options in the updated editor.
Authenticated cross-editor edit roundtrips have not been rerun in this checkout.

Manual checks of the renderer demonstration confirmed visible errors for empty
required fields and invalid email input. Its missing UTF-8 charset declaration
was corrected. Real CAPTCHA, email delivery and the remaining acceptance gates
below are still outstanding.

Windows fixes cover file-URL conversion, npm CLI invocation, the installer test
stub, and browser-fixture serving without Unix shell syntax or Python. The
`local:start` script retains a private encryption key in `.local/site/.env` and
places the installed Windows workerd executable at the location expected by the
pinned EmDash Node runner. This compatibility step applies to the local test
site; broader Windows deployment support is not certified. See the Windows
instructions in [manual-testing.md](manual-testing.md).

## Repository, versions and architecture

### Subsequent local builder UX pass — 2026-11-20

The native editor now follows the documented WPForms two-panel interaction:
Add Fields and Field Options share a sidebar, with General, Advanced and Smart
Logic sections. The canvas displays selectable field shapes, readable labels,
widths, duplication/deletion and keyboard move controls. Fields can be inserted
onto an empty canvas or before an existing field. The shared schema and Core
storage contracts are unchanged.

TypeScript checking and all **eight Chromium browser tests passed** after this
change. The added regression checks blank-canvas insertion, field search,
options/conditions surviving section switches, persisted values and a 390px
viewport without horizontal overflow. The existing accessibility scan passed.
Native drag testing keeps source and target cards visible simultaneously;
automatic drag scrolling is not certified. Screenshot outputs now go into
ignored test results instead of modifying the checked-in reference screenshot.
The updated packed Advanced package passed the real site's production build,
and the restarted signed-in site displayed the new sidebar and canvas correctly.
See [comparison.md](comparison.md) for the reference and remaining product gaps.

Repository: https://github.com/emquix-com/QuixForms (public; transferred on 2026-11-20). Earlier pushed milestones: `39518b5d3da4977d4d7f70fbff49c8bf68700beb` and `54b0c51caa3224a4e863d23357615e2e68455d43`. Use Git history for the exact candidate commit; the test archive records artifact checksums and the exact source commit in BUILD-INFO.json.

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

The historical dependency audits reported **zero advisories**; evidence is recorded in `root-audit.json` and `harness-audit.json`. The isolated harness pins patched Vitest 4.1.12 / Vite 8.3.5, Zod 4.6.6 and Miniflare’s Undici 7.30.1. Audit results do not prove application security. Dependency license inventory comes from lockfile declarations, not a completed legal certification. See SECURITY.md for threat controls and remaining review.

## Historical acceptance gaps and known limitations

1. Complete real browser → public renderer → live CAPTCHA → sandbox storage → configured email → entries/export journeys, including every supported field and multi-step branching.
2. Validate a real Cloudflare deployment and signed registry installation; confirm publisher identity and operational private vulnerability reporting.
3. Complete cross-interface roundtrips for nested conditions, multi-step and all advanced metadata after upgrades. Current real-site roundtrip proves the standard form and conditional-notification path; automated engine tests cover more configurations separately.
4. Registry/npm publication remains unapproved. CLI supports a narrow AST shape; pnpm is not end-to-end verified. No automated upgrade/version rollback exists. Initial native install/removal needs rebuilding and redeploying. The host must already configure React and an official sandbox runner.
5. Full-text entries search, bulk operations and automatic retention are pending. Search is reference prefix. React can aggregate exports within its memory/entry limits, and reports an error instead of silently truncating larger exports. Exports are not a transactional snapshot of concurrent moderation/deletion; export during a quiet period when consistency matters. The current Block Kit interface displays bounded export pages; aggregate file downloads use React or the authenticated API. Core shows latest five notes, React all notes; entries cap notes at 50. Legacy entries without newer indexed metadata remain visible under All; bulk migration is pending.
6. Email is attempted inline once; process interruption can leave pending status. Durable jobs/retry queues and per-notification delivery logs remain pending. Conditional notification editors and customizable plain-text message bodies are implemented in both levels; dynamic recipients and autoresponders remain pending.
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
