# Frequently asked questions

## Is QuixForms free?

Yes. Core, the Astro renderer and the optional Advanced editor are free and MIT licensed. No activation key is required.

## Does installing Core put a form on my website?

No. Core provides the sandboxed backend, admin builder and inbox. Your site needs the separate Astro/React renderer integration to display a public form. The setup screen provides the form ID and component code.

## Do I need Advanced?

No. The sandboxed editor can manage forms, conditions, notifications and entries. Advanced is an optional native visual editor. Both use the same Core records; removing Advanced retains those records.

## Do forms work without CAPTCHA?

Yes. Turnstile is optional and is enabled only when both keys are configured. Configured verification failures block acceptance. reCAPTCHA is not implemented.

## Can I customize notification messages?

Yes. Plain-text bodies support `{all_fields}`, `{form_title}` and `{entry_reference}`. Leave blank for an answer summary. Recipients are fixed; dynamic recipients and autoresponders are not included.

## Why was an entry stored but no email arrived?

An accepted entry is retained even if notification delivery fails. Check the notification's enabled state, conditions, recipient and your site's email provider. Delivery retries and detailed attempt logs are not included. Replaying the same accepted request does not resend its email.

## What happens when I edit a published form?

Saved changes update the live definition immediately. Unpublish before editing privately. Restoring a revision creates a draft; existing submissions keep their original form snapshot.

## What is not included?

Payments, file uploads, signatures, calculations, marketing integrations, webhooks, save/resume, automatic retention, full-text entry search and bulk moderation. Exports are paginated in Core; complete bounded downloads are available through Advanced.
