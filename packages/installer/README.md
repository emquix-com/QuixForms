# QuixForms installer

Private test candidate; not published. Use the packed CLI with Node.js:

```
node node_modules/@emquix/quixforms-cli/src/cli.mjs install --artifacts /absolute/path/artifacts --dry-run
node node_modules/@emquix/quixforms-cli/src/cli.mjs install --artifacts /absolute/path/artifacts
```

Core already installed from registry: omit `--with-core`. For local sandbox Core plus native companion add `--with-core`. For Core alone use `--core-only`. A sandbox runner must already be configured when installing Core.

Supported automatic edits: one `emdash({ ... })` call, literal plugins/sandboxed arrays, default `emdash/astro` import. Dynamic config gets an actionable manual fallback without writes. npm and pnpm are supported. Existing files are backed up under `.quixforms`. Failed builds restore configuration and dependency manifests; node_modules may require reinstalling. `remove` restores an unchanged managed config, retains dependencies and Core data, and refuses to overwrite later customizations. No shell interpolation, remote deployment or secrets are used.
