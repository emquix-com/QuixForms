# ADR 001 — One scoped backend, two clients

Decision date: 2026-10-24. Source inspected: emdash-cms/emdash commit c238da2931b12ab58f6228a5a4d79551d05f6d3b; npm EmDash 1.3.1.

Core is a sandboxed plugin with slug `quixforms`. It owns `forms` and `entries`. The native companion has a different ID and no storage declarations. Its browser code calls Core's `/_emdash/api/plugins/quixforms/*` routes with the existing same-origin session and `X-EmDash-Request: 1`. Every administrative route declares `plugins:manage`. No tokens, shared secrets, database access, or privileged native proxies connect the two levels.

The public definition is an explicit projection excluding notifications. Only published forms are served. Submit is POST-only, limited to 64 KiB, revalidates the definition's fields, strips unknown and hidden values, requires Turnstile verification with action and hostname checks, and uses an atomic create for idempotency. Notifications go to administrator-configured addresses only; public recipient routing is deliberately absent.

`getVersioned` / `compareAndSet` enforce optimistic concurrency. The current definition and up to ten historical snapshots share one byte-bounded document so history and updates commit atomically. This avoids pretending multi-record writes are transactions. Entry snapshots retain the accepted definition. Both editors can restore snapshots through Core; restoration makes the form a draft.

Both UIs use the same schema; React preview and public forms use the same FormView. Registry installation provides administration and APIs, not frontend injection. The Astro wrapper requires the host's React integration, a configured Turnstile site key, and a rebuild on initial integration. Subsequent public definition loads occur at runtime.

Verified host limits: Block Kit 256 KiB, 20 levels, 2,000 nodes, 1,000 array items, 64 KiB/string. The editor pages eight fields at a time. Forms cap at 100 fields, 100 choices, 100,000 serialized characters and 16 object levels. Storage conditional values are limited by EmDash to 1 MiB. Routes default to 1 MiB unless overridden. Raw sandbox routes cannot serve active HTML, JavaScript, SVG, CSS or WebAssembly; a standalone active same-origin renderer cannot be shipped that way.

References in the inspected source: docs/src/content/docs/plugins/creating-plugins/{api-routes,storage,block-kit,testing}.mdx; creating-native-plugins/react-admin.mdx; packages/core/src/plugin-types.ts; packages/blocks/src/validation.ts. Source verification is not deployment certification.

## Remaining security work

No release approval: retention jobs, comprehensive authenticated export runtime tests, live Turnstile integration tests, browser accessibility, and external Cloudflare deployment tests are outstanding; a real local Node production server has passed Core/React editing checks. Atomic rate limiting, payload-bound retries and widget isolation are implemented and have focused tests. No payment or upload routes exist. The plugin currently has no arbitrary outbound destination, redirect, HTML, or expression evaluation feature.


## Distribution and native integration proof

Five 0.1.0 packages are packed independently. The Core runtime bundles its shared engine. React/Astro source exports are compiled by the host's official Vite/Astro integration; native server descriptor code is prebuilt. The native entry exports the required `createPlugin`. Both descriptors register inside `emdash({...})` in Astro config. No source imports escape their package directories at runtime.

The installer uses the TypeScript parser to edit a narrowly recognized config AST, refuses dynamic/ambiguous cases, checks local artifacts, backs up configuration/manifests, builds the host and restores files after failure. It does not choose a sandbox runner or deploy. The candidate was installed in a separate Node site from tarballs; real passkey-authenticated Core → React → Core editing passed against the official workerd runner.


Block Kit form identity is part of the integration contract. EmDash 1.3.1 initializes form values on mount and keys blocks by block_id (falling back to position). QuixForms supplies contextual block IDs and fingerprints of initial field configuration to prevent state leaking between screens while preserving unrelated unsaved inputs.
