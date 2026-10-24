# Security

This development version is not approved for production personal data. Do not deploy public collection forms until the release blockers in docs/release-report.md are resolved.

Once a repository is established, enable private GitHub vulnerability reporting before publishing. The manifest's proposed security URL is not yet an operational reporting channel. Do not post secrets or submission records in public issues.

The current design uses host RBAC and CSRF enforcement, strict schemas, bounded requests, atomic revision writes, hidden-value stripping, Turnstile checks, and fixed administrator-controlled mail recipients. React escapes text; no HTML rendering, eval, raw SQL, arbitrary webhook URLs, payments, or file uploads are exposed.

Outstanding review includes live permission/CSRF behavior, rate-limit load testing, storage failures, retention, PII exports, accessibility and complete browser-to-live-host workflows. Entries currently persist until administratively removed through an approved host workflow; no retention scheduler or erasure UI is implemented. This is not a claim of GDPR compliance. Collect only necessary data and supply an appropriate privacy notice.
