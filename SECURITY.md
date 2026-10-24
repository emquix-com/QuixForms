# Security

This development version is not approved for production personal data. Do not deploy public collection forms until the release blockers in docs/release-report.md are resolved.

Enable private GitHub vulnerability reporting before publishing. The manifest's proposed security URL is not yet an operational reporting channel. Do not post secrets or submission records in public issues.

The current design uses host RBAC and CSRF enforcement, strict schemas, bounded requests, atomic revision writes, hidden-value stripping, Turnstile checks, and fixed administrator-controlled mail recipients. React escapes text; no HTML rendering, eval, raw SQL, arbitrary webhook URLs, payments, or file uploads are exposed.

The official runtime harness tests permission/CSRF enforcement and entry access boundaries. Outstanding review includes rate-limit load testing, interrupted delivery, retention, live provider verification, accessibility and complete browser-to-submission workflows. Both editors can permanently erase trashed entries with a revision check; no automatic retention scheduler is implemented. This is not a claim of GDPR compliance. Collect only necessary data and supply an appropriate privacy notice.
