# Competitive assessment and research limits

Requests to the six specified WPForms, Gravity Forms, and plugin registry URLs returned HTTP 403 on 2026-10-24. Their current pricing, live workflows, Freeform and netdollar source links could not be verified. The requested feature list is a product target, not evidence of a current competitor feature. No proprietary assets or GPL implementation were copied.

EmDash's first-party forms source was inspected at c238da2931b12ab58f6228a5a4d79551d05f6d3b (packages/plugins/forms). It uses a trusted native plugin, React admin and Astro components, public definition/submission routes, scoped form/submission collections, email, Turnstile, media upload capability, Portable Text registration, and network permission. These are observed source features, not runtime test results. QuixForms deliberately puts storage and processing in a separately installable sandboxed Core.

| Target capability (WPForms Pro / Gravity Forms reference requirements) | QuixForms evidence/status |
|---|---|
| Structured forms, standard field editing | Available in Core and React source; shared engine tests |
| Drag/drop and keyboard alternative | React implementation; Chromium drag/drop and move-button tests passed |
| Conditional visibility | Nested shared engine; React visual groups; Core equality editor preserves existing groups |
| Conditional required | Engine/API only; UI planned |
| Multi-step rendering | Astro companion shared renderer; full deployed-site journey outstanding |
| Templates | 16 shared choices including blank; 15 editable templates tested |
| Entry management | Core and React inbox/detail, notes, read/star, spam/trash/restore, reference search and page exports; full-text search and bulk operations planned |
| Notifications | Core fixed recipients and conditional engine; live transport test outstanding |
| Advanced integrations and webhooks | Planned, not implemented |
| Surveys and calculations | Planned, not implemented |
| Payments | Planned, not implemented; no card collection |
| Uploads, signatures, resume links | Planned, not implemented |
| Sandbox arbitrary theme injection | Technically unavailable through verified sandbox APIs; use companion |
| Registry and npm installation | Packaging validation required; not published |

No parity claim with WPForms Pro or Gravity Forms is made. A reliable current competitor feature-by-feature comparison requires access to the blocked sources and workflow testing.
