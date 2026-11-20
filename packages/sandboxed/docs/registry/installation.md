# Installation

## Sandboxed Core

Use a compatible EmDash 1.3.x site (tested on 1.3.1) with its official plugin sandbox enabled. In EmDash's Registry, locate **QuixForms** by **@emquix.com**, review its permissions, and install the published version once the listing is approved.

Open **QuixForms** in the admin sidebar. Create a form, edit its fields, configure notifications if needed, and publish it when ready. Core administration does not require the Advanced editor.

## Public forms require a renderer

Core's registry installation alone does not display forms on public pages. Install the separate renderer into your Astro site, register the official React integration, add the form component to a server-rendered page, and rebuild/redeploy the site:

```astro
---
import Form from '@emquix/quixforms-astro/Form.astro';
---
<Form id="YOUR_PUBLISHED_FORM_ID" pluginId="YOUR_INSTALLED_PLUGIN_ID" />
```

The renderer npm packages are not published yet. For the initial Core release, use the versioned local tarballs and instructions from the [source installation guide](https://github.com/emquix-com/QuixForms/blob/main/docs/manual-testing.md). Do not run an npm install command for an unavailable package. The repository includes a dynamic form route and a contact-page example.

Copy both values from **Embed & setup** in Core. Registry installations receive a generated plugin ID; it is different from the package slug. Use renderer 0.1.1 or later to pass `pluginId`. Config-managed local installations default to `quixforms`.

## Email and CAPTCHA

Notifications use your site's configured EmDash email transport. Add an enabled notification with a fixed recipient, subject and optional plain-text message body. A stored entry does not guarantee email delivery; verify your provider before launch.

Turnstile is optional. Without both keys, forms accept submissions without CAPTCHA. With both keys configured, successful verification is required. Server validation and rate limits remain active in both modes. reCAPTCHA is not included.

Before sharing a form, test the public page, stored entry, email delivery and export on the intended deployment. Back up your database and retain the previous deployment before upgrading.
