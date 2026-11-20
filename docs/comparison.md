# Competitive assessment and research limits

## EmDash sandboxed competitors — 2026-11-20

These are publisher claims from the linked sources, not independent runtime or
security certifications. Four registry listings were readable. The Mason James
registry URL timed out; its publisher's own product page supplied that row.

| Competitor | Verified published positioning | Implication for QuixForms |
|---|---|---|
| [Netdollar Forms](https://plugins.emdashcms.com/plugins/@netdollar.dev/forms), [publisher repository](https://github.com/charl-kruger/emdash-forms) | Multi-step forms, conditional logic, response management and a renderer companion. The README also advertises calculations, ratings/NPS, signatures, separate published drafts, scheduling and a dashboard widget. | Keep our shared engine and nested conditions; close the separate draft/published revision gap before adding more advanced field types. |
| [Mason James Contact Forms](https://masonjames.com/plugins/emdash-contact-forms/) | Single-page builder, inbox, CSV, provider-based notifications, honeypot/rate limiting, scheduled retention and an optional content-block companion. Publisher page describes sandboxed 0.2.0. | Improve first-run guidance and embedding; retention and a content-editor block remain gaps. The inaccessible registry listing was not independently verified. |
| [AgenticEcom Contact Form Builder](https://plugins.emdashcms.com/plugins/@agenticecom.net/form-builder) | Private enquiry inbox, notes, draft editing, renderer companion, notification status/retries and paged CSV; explicitly excludes conditional logic, multi-step and CAPTCHA in this release. | Preserve our richer rules and entry controls while adding meaningful delivery diagnostics and carefully designed retry behavior. |
| [AlpineUX Forms](https://plugins.emdashcms.com/plugins/@alpineux.bsky.social/forms) | Admin-built or developer-provided forms, inbox, notification/thank-you mail, activity overview and guided mandatory Turnstile setup. | Show protection setup accurately and improve onboarding. Safe autoresponders and submission trends remain future work. |
| [Bitdoze Contact Forms](https://plugins.emdashcms.com/plugins/@bitdoze.com/emdashhq-contact-forms) | Inbox filtering, notification resend and attempt log, dashboard, passive spam defenses, optional Turnstile, retention and idempotent submissions. | Delivery attempt visibility, guarded retries, retention and content-block embedding are priorities. Keep verification mandatory when CAPTCHA is configured, plus hidden-value stripping and payload-bound retries. |

### Implemented in this sandboxed UI pass

- Dashboard table with draft/published state, field and enabled-notification
  counts; counts explicitly describe only the displayed page.
- Turnstile setup guidance that reports key presence without exposing keys or
  implying successful provider verification. Email delivery remains a separate
  setup/acceptance step.
- Focused field editing alongside a paginated outline, readable type labels,
  type-specific controls, numeric bounds, selected-field continuity after saves
  and movement, and deletion confirmation with dependency protection.
- Dedicated settings, read-only form outline, and corrected Astro component
  examples. The outline makes its public-renderer limitations explicit.
- Existing authenticated Core routes, revision checks, shared definitions,
  conditional rules and entry snapshots are retained. Native number-field
  options expose the same existing numeric limits.

### Next competitive priorities

1. Separate working drafts from the live published definition. Current saved
   edits to a published form take effect immediately; the sandboxed editor now
   warns clearly before editing.
2. Per-notification attempt records and guarded retries, with explicit treatment
   of ambiguous provider outcomes and concurrent requests. Do not equate a send
   call with inbox delivery.
3. A documented content-editor companion block and verified signed-registry
   installation, including registry-assigned plugin IDs.
4. Retention controls, tested backups/export guidance and bounded scheduled
   cleanup. Entries are not erased automatically by the current implementation.
5. Efficient unread/activity trends, richer field validation, safe autoresponders
   and the remaining advanced-field/integration roadmap.

No claim that QuixForms is already best-in-class or has full competitor parity
is supported by this review. The linked products have not been installed or
benchmarked in this workspace.

## WPForms workflow reference — 2026-11-20

WPForms' official [first-form guide](https://wpforms.com/docs/creating-first-form/)
and [field-options guide](https://wpforms.com/docs/how-to-customize-form-field-options/)
were accessible on this date. They describe a left field palette/options panel,
an editable preview on the right, click/drag field insertion, selection to edit,
and General/Advanced field options. These verified interactions guide the native
QuixForms builder. The historical access failures below still describe the
earlier research attempt.

The native Advanced workspace now includes a searchable form library and template
gallery, template previews, a shared Add Fields / Field Options sidebar,
General / Advanced / Smart Logic controls, editable choice rows, drag insertion,
keyboard reordering, undo/redo and fullscreen editing. Fields, Settings and
Entries share one workspace. Settings provides General, Notifications,
Confirmations, Appearance, Spam Protection and Revisions sections. Desktop/mobile
previews complete locally without creating entries or sending notifications.

Explicit Publish/Unpublish and Save controls use Core's revision checks. Drafts
autosave; published changes require an explicit save. Embed guidance supplies the
Astro component code and reports configured Turnstile credentials without exposing
secrets. This indicates configuration presence, not verified external delivery.
The browser suite checks creation/reopening, in-flight publication edits,
conflicts, revision restoration, modal focus and accessibility of tested states.

This aligns the implemented authoring workflow with the documented reference.
Payments, uploads, advanced field validation, integrations, surveys, calculations
and other unimplemented capabilities remain separate product work. No full
WPForms parity claim is made.

Requests to the six specified WPForms, Gravity Forms, and plugin registry URLs returned HTTP 403 on 2026-10-24. Their current pricing, live workflows, Freeform and netdollar source links could not be verified. The requested feature list is a product target, not evidence of a current competitor feature. No proprietary assets or GPL implementation were copied.

EmDash's first-party forms source was inspected at c238da2931b12ab58f6228a5a4d79551d05f6d3b (packages/plugins/forms). It uses a trusted native plugin, React admin and Astro components, public definition/submission routes, scoped form/submission collections, email, Turnstile, media upload capability, Portable Text registration, and network permission. These are observed source features, not runtime test results. QuixForms deliberately puts storage and processing in a separately installable sandboxed Core.

| Target capability (WPForms Pro / Gravity Forms reference requirements) | QuixForms evidence/status |
|---|---|
| Structured forms, standard field editing | Available in Core and React source; shared engine tests |
| Drag/drop and keyboard alternative | React implementation; Chromium drag/drop and move-button tests passed |
| Conditional visibility | Available in both Core and React: nested groups and leaf editors using one engine |
| Conditional required | Available in both Core and React: shared engine and visual controls |
| Multi-step rendering | Astro companion shared renderer; full deployed-site journey outstanding |
| Templates | 16 shared choices including blank; 15 editable templates tested |
| Entry management | Core and React inbox/detail, notes, read/star, spam/trash/restore, reference search and paginated exports; React also offers complete exports within documented limits; full-text search and bulk operations planned |
| Notifications | Available in both Core and React: fixed recipients, subject, customizable plain-text bodies with answer/form/reference tags, enable/disable, nested conditional routing; host capturing transport tested, external live transport outstanding |
| Advanced integrations and webhooks | Planned, not implemented |
| Surveys and calculations | Planned, not implemented |
| Payments | Planned, not implemented; no card collection |
| Uploads, signatures, resume links | Planned, not implemented |
| Sandbox arbitrary theme injection | Technically unavailable through verified sandbox APIs; use companion |
| Registry and npm installation | Independently packed npm artifacts and locally validated official registry bundle; signed registry installation/publication pending |

No parity claim with WPForms Pro or Gravity Forms is made. A reliable current competitor feature-by-feature comparison requires access to the blocked sources and workflow testing.


| Additional target | QuixForms classification |
|---|---|
| Revision restoration | Available in both Core and React; restored form becomes a draft |
| Conditional notification editor | Available in both Core and React; nested AND/OR rules, shared server evaluation |
| Permanent entry erasure | Available in both Core and React for trashed entries with revision checks |
| Appearance presets | Configured in Core and React; applied through Astro companion |
| Arbitrary public active HTML from sandbox routes | Technically impossible through verified sandbox response restrictions |
| Installer and removal | Native deployment tooling; npm local package install/build tested; publication pending |

“Available” describes implemented behavior with the test evidence in the release report; it is not a claim of parity or completed production certification. WPForms/Gravity Forms pricing and current plan packaging remain unverified because their requested URLs were blocked.

Whole-form duplication is available in both editors: the copy is a draft, retains field IDs/rules/options and has no copied submissions or revision history.
