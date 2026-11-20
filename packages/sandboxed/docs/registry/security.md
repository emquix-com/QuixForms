# Security

QuixForms requests two sandbox capabilities:

- `email:send` sends enabled notifications through EmDash's configured transport to administrator-defined recipients.
- `network:request` is restricted to `challenges.cloudflare.com` for configured Turnstile verification.

Core owns scoped `forms` and `entries` storage. Administrative routes require EmDash's plugin-management permission. Public definitions exclude notifications and secrets; public submissions are validated server-side and bounded. Unknown fields and answers belonging to invisible conditional fields are not stored. CSV output neutralizes spreadsheet-formula prefixes.

CAPTCHA is optional. Without both Turnstile keys, submissions do not require a bot check. With both keys configured, verification checks the action and hostname and does not silently fall back during provider errors. Rate limits and honeypot rejection remain active.

The separate renderer and Advanced editor run as native site dependencies and have a different trust boundary; they are not installed by this registry bundle.

Collect only necessary information, provide your own privacy notice, protect exports and configure retention appropriate to your site. No automatic retention or compliance certification is included. Notification delivery is attempted once; stored entries survive delivery failures.

See the [security policy](https://github.com/emquix-com/QuixForms/security/policy) and [report vulnerabilities privately](https://github.com/emquix-com/QuixForms/security/advisories/new). Do not put secrets, credentials or submission records in public issues.
