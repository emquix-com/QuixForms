# QuixForms

**Powerful Forms. Effortless Building.** A free, MIT-licensed forms plugin for EmDash by [EmQuix](https://emquix.com).

Build and manage forms from EmDash's native admin controls. Start from 15 ready-made templates or a blank form, configure fields and conditional rules, then manage responses in one inbox.

- 15 field types, including contact details, choices, consent, sections and page breaks.
- Nested visibility, conditional-required and notification routing rules.
- Draft/published status, duplication and revision restoration.
- Plain-text email notifications with customizable bodies and answer, form-name and reference tags.
- Entry notes, read/star controls, spam/trash/restore and CSV/JSON export.
- Optional Cloudflare Turnstile, server validation, honeypot rejection and rate limits.

## Display forms on your website

The registry plugin provides the builder, backend and inbox. Displaying a form on your public site requires the separate Astro/React renderer companion. Installing Core does not inject a form into your theme or install native code automatically. See Installation for the current source-based renderer setup.

The optional Advanced visual editor is also free and developed in the same public repository. It is separate from this sandboxed registry package.

Payments, uploads, signatures, autoresponders, integrations and automatic retention are not included. Published form edits take effect when saved; there is no separate unpublished copy of a published form.
