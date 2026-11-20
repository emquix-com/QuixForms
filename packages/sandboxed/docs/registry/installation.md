# Installation

## Sandboxed Core

On EmDash 1.3.x (tested on 1.3.1) with the official sandbox enabled, open Registry, find **QuixForms** by **@emquix.com**, review permissions and install.

Open **QuixForms** in the sidebar to create, edit and publish forms. Advanced is optional.

## Public forms require a renderer

Core alone does not display public forms. Install the separate renderer into your Astro site, register React, add this component to a server-rendered page, then rebuild/redeploy:

```astro
---
import Form from '@emquix/quixforms-astro/Form.astro';
---
<Form id="YOUR_PUBLISHED_FORM_ID" pluginId="YOUR_INSTALLED_PLUGIN_ID" />
```

The renderer is not on npm yet. Build its local tarballs using the [source installation guide](https://github.com/emquix-com/QuixForms/blob/main/docs/manual-testing.md), which includes dynamic-route and contact-page examples.

Copy both IDs from Core's **Embed & setup**. Registry installs receive a generated plugin ID, different from the slug. Renderer 0.1.1 supports `pluginId`; config-managed installs default to `quixforms`.

## Email and CAPTCHA

Notifications use your site's configured EmDash email transport. Add an enabled notification with a fixed recipient, subject and optional plain-text message body. A stored entry does not guarantee email delivery; verify your provider before launch.

Turnstile is optional. Without both keys, forms accept submissions without CAPTCHA. With both keys configured, successful verification is required. Server validation and rate limits remain active in both modes. reCAPTCHA is not included.

Before sharing a form, test the public page, stored entry, email delivery and export on the intended deployment. Back up your database and retain the previous deployment before upgrading.
