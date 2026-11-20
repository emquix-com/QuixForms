# Security

This development version is not approved for production personal data. Do not deploy public collection forms until the release blockers in docs/release-report.md are resolved.

Private GitHub vulnerability reporting is enabled for this repository (verified 2026-11-20). Report sensitive issues through [Report a vulnerability](https://github.com/emquix-com/QuixForms/security/advisories/new). Do not post secrets or submission records in public issues.

The current design uses host RBAC and CSRF enforcement, strict schemas, bounded requests, atomic revision writes, hidden-value stripping, Turnstile checks, and fixed administrator-controlled mail recipients. React escapes text; no HTML rendering, eval, raw SQL, arbitrary webhook URLs, payments, or file uploads are exposed.

The official runtime harness tests permission/CSRF enforcement and entry access boundaries. Outstanding review includes rate-limit load testing, interrupted delivery, retention, live provider verification, accessibility and complete browser-to-submission workflows. Both editors can permanently erase trashed entries with a revision check; no automatic retention scheduler is implemented. This is not a claim of GDPR compliance. Collect only necessary data and supply an appropriate privacy notice.
