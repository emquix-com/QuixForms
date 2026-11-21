# Changelog

## 0.1.2 — registry artwork

Added the EmQuix Forms family icon and a wide QuixForms banner as declared release artifacts. No runtime behavior, permission or host compatibility changes. Renderer remains 0.1.1; other native companions remain 0.1.0.

## 0.1.1 — sandboxed registry release, 2026-11-20

The first clean registry installation revealed EmDash assigns an installation ID rather than the local `quixforms` ID. The Astro renderer accepts `pluginId` for definition and submission requests, and Core's embed instructions provide the actual ID. Added browser regression coverage and verified a real registry-backed public submission, inbox, CSV export and restart persistence. The signed update retained the form and entry. Core and renderer are 0.1.1; other native companions remain 0.1.0.

## 0.1.0 — sandboxed registry release, 2026-11-20

Published sandboxed Core as `@emquix.com/quixforms`; profile and release passed registry assessment. The public PDS archive's SHA-256 and byte count were verified. Native companions remain free, separately source-installed packages. See the release report for verification and deployment scope.

### 2026-11-20 release preparation

Transferred public source to `emquix-com/QuixForms`. Prepared the sandboxed registry release under the verified `@emquix.com` publisher with full listing documentation. Core and Advanced remain free and MIT licensed. Added the focused sandboxed builder, Advanced workspace, optional CAPTCHA, embedded contact example, notification message templates and a Zod Mini runtime below the registry size limit. The local release gate passes 110 tests and official bundle validation; registry publication and clean registry installation remain pending.

Initial shared schema and validation engine, nested conditions, revision-protected sandbox storage, paginated Block Kit editing, native React builder, shared Astro renderer, restricted submission and CSV APIs, Turnstile verification and configured EmDash email transport integration. Release acceptance is incomplete.

### Continued development

Added Core/React submissions inboxes, entry notes and moderation, snapshot-preserving CSV/JSON exports, rate limiting, payload-bound submission retries, isolated CAPTCHA widgets, shared template library, autosave concurrency protection, hidden section/page handling, byte-bounded revision history, and Chromium workflow tests. Synced the private GitHub repository.

### Manual acceptance candidate

Added independent package exports, checksum-verified local artifacts, a TypeScript-AST installer with backups/dry-run/build rollback/removal, a clean Node example, nested Core logic and conditional-required editing, native conditional-required controls, notification/appearance settings, saved revision restore, permanent entry erasure, native overview pagination and manual acceptance instructions. Executed real passkey-authenticated Core → React → Core editing on a Node production build with the official workerd sandbox runner. Registry bundle validation passes; publication remains unapproved.

### 2026-10-25 acceptance hardening

Added conditional notification editors in both interfaces, whole-form draft duplication, complete React CSV/JSON exports with bounded memory, paginated Core JSON exports, readable rule operators and automated WCAG checks. Fixed Block Kit input-state reuse across screens using contextual form identities and saved-configuration fingerprints. Real installed Core → React notification editing now passes; host transport capture verifies conditional routing, and failure tests verify accepted entries survive email errors without duplicate resend.
