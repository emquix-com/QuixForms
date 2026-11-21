# Sandboxed QuixForms 0.1.0 publishing plan

Prepared 2026-11-20 after reviewing the successful QuixSEO publishing chat and its public manifest. This plan covers the sandboxed Core release, not native npm publication.

## Executed status — 2026-11-20

**Screenshot gallery:** 0.1.3 and both real screenshots are uploaded and verified,
with full CI passing. Public visibility is blocked by the registry's
`required-coverage-unavailable` assessment error, not a local test or upload
failure. Version 0.1.2 is still the approved public release. An EmDash operator
rerun is needed; [request details](registry-gallery-handoff.md) are prepared.

**2026-11-21 update:** artwork-only 0.1.2 is published and passed registry
assessment. Its featured banner and Forms icon render on the public listing;
the public backend checksum is identical to 0.1.1. Full CI passed before upload.
See the release report for image dimensions, blob IDs and checksum verification.

Sandboxed 0.1.0 and the registry-ID integration correction **0.1.1 are published**.
Both releases passed registry assessment. The public listing is
[QuixForms by @emquix.com](https://plugins.emdashcms.com/plugins/@emquix.com/quixforms).
The actual public archives were downloaded and their sizes/checksums verified.
Private vulnerability reporting is enabled. The correction passed 111 checks
locally and the full [CI workflow](https://github.com/emquix-com/QuixForms/actions/runs/44758980559).
A clean signed registry installation, public submission, inbox, CSV export and
restart persistence were verified. Core was then updated normally to 0.1.1.
See [release-report.md](release-report.md) for immutable record identities and
verification scope. The numbered sections below remain the release procedure;
delegated-release automation and native npm distribution are separate follow-ups.

## Release identity and scope

| Item | Value |
|---|---|
| Public source | https://github.com/emquix-com/QuixForms |
| Publisher handle | `emquix.com` |
| Pinned publisher DID | `did:plc:6clqzka76ueshbureaecbrfj` |
| Registry slug/version | `quixforms` / `0.1.0` |
| Author | EmQuix — https://emquix.com |
| CLI | `@emdash-cms/plugin-cli` pinned to `0.13.4` |
| Initial host constraint | `>=1.3.1 <1.4.0`, tested on EmDash 1.3.1 |
| License and price | MIT; free |
| Capabilities | `email:send`; `network:request` restricted to `challenges.cloudflare.com` |

Keep Core, Advanced, the renderer, shared engine and installer in this public monorepo. Advanced remains a separate free native package. Registry installation grants no native execution and installs neither Advanced nor the public renderer. npm packages remain marked private until their own publication step; this does not prevent sandbox registry publication.

## Prepared and verified

- GitHub reports this repository is public under `emquix-com`; local `origin` points to that URL.
- The active official CLI session is `emquix.com` with the pinned DID above; no credential files were copied or committed.
- A read-only registry check for that DID and slug returned `public: false`, `profile: null`; no public listing was observed. Recheck authoritative records before publication if the namespace state changes.
- Manifest author, canonical repository, security URL, host constraint and five Markdown listing sections are prepared. The offline CLI validator checks their section-size limits.
- The latest implementation passed the full local release command: build/typecheck, 87 unit tests, 15 browser tests, 8 official sandbox tests and official bundle validation. See the release report for exact artifact evidence. Rebuild after metadata changes; do not reuse a historical tarball hash.
- The runtime size blocker is fixed. Databases, local keys, sessions, generated artifacts and local QA output are excluded from Git.

## 1. Commit, push and check the public build

Commit all reviewed implementation, tests, source examples, metadata, listing documentation and this plan. Push normally to `main`; do not force-push. Wait for `.github/workflows/ci.yml` to pass on that exact SHA. Its workflow builds the example, runs both test suites and Chromium, validates the registry bundle and assembles the manual-test artifact.

Review the uploaded candidate's manifest and archive contents. The registry tarball must contain sandbox runtime/metadata assets, without Advanced, React, environment files or local data. The initial listing intentionally states that the renderer requires a separate source/tarball integration because its npm packages are not yet published.

## 2. Close the initial release checks

- Confirm that the repository's private vulnerability-reporting channel is enabled and usable; update the security listing if a different private contact is needed. Never request sensitive reports in public issues.
- Run the packed candidate on a clean, disposable site with the official sandbox runner. Do not install a registry copy over the config-managed Core in the existing development site.
- Verify create/edit/publish, a public submission without CAPTCHA, inbox/detail, notification body, export and restart persistence. Existing local tests cover these pieces but do not substitute for a registry-installed journey.
- Verify a configured real email transport using an explicitly approved test recipient. If advertising configured Turnstile operation, complete a real-provider acceptance check. CAPTCHA remains optional; missing keys are not a release failure.
- Optionally add a QuixForms-specific icon/screenshots before first publication. Do not reuse the QuixSEO icon. Missing imagery does not prevent the currently validated bundle.

## 3. First publish using the existing EmQuix account

For this first release, use the direct official CLI route already used for QuixSEO. It creates the package profile from the manifest, uploads to the publisher PDS and writes the immutable release record. A separate download host is unnecessary. Run from the repository root:

```powershell
npm run test:release
node node_modules/@emdash-cms/plugin-cli/dist/index.mjs whoami
node node_modules/@emdash-cms/plugin-cli/dist/index.mjs validate packages/sandboxed/emdash-plugin.jsonc
Push-Location packages/sandboxed
node ../../node_modules/@emdash-cms/plugin-cli/dist/index.mjs publish
Pop-Location
```

The publish command is the live external action, not a validation preview. Confirm its session matches the pinned DID. If the existing signed profile requires provenance, use step 6 instead; do not weaken that policy. Do not use `--allow-overwrite`: versions are immutable. If 0.1.0 is already taken, inspect its authoritative records and choose a new version deliberately.

## 4. Verify records and listing approval

```powershell
node node_modules/@emdash-cms/plugin-cli/dist/index.mjs info did:plc:6clqzka76ueshbureaecbrfj quixforms --version 0.1.0 --watch
```

Record the profile/release record URIs and CIDs, tarball hash, actual bytes downloaded from the published source, version, permissions and host constraint. Confirm the five documentation sections appear and checks pass. The expected listing is `https://plugins.emdashcms.com/plugins/@emquix.com/quixforms`, but do not describe it as live until observed. A successful publish does not itself establish listing approval or installation success.

If the listing needs metadata corrections, follow the exact installed CLI's supported profile-update flow; do not republish unchanged runtime bytes over the same version. QuixSEO's historical `update-package` command is a precedent, not a reason to assume that command exists in this pinned CLI.

## 5. Test a fresh installation from the registry

Use another clean site without a configured `quixforms` descriptor. Search for QuixForms by `@emquix.com`, review and accept the permissions, install 0.1.0 and test the admin controls. Add the renderer companion separately, then complete public submission → stored entry → notification/export and restart checks. Capture evidence without user data. Verify the registry's profile/release CIDs match the publisher's current signed records; QuixSEO previously encountered stale verification-dialog metadata.

Only after this check should the README/changelog and release report say the registry version is published and installable. Keep known limitations visible. If a failure affects data or acceptance, stop rollout and prepare a new version; do not overwrite immutable records or delete site data to hide a failed test.

## 6. Automate later releases

After the first release, prepare delegated GitHub releases against this final public repository with the official `release setup` flow. Review the generated workflow and signed profile settings before enabling it. Require provenance and publisher confirmation for permission escalation. Repository/workflow/ref scopes require browser authorization; GitHub ownership alone does not grant publisher authority.

Choose manual dispatch initially or deliberate `quixforms@VERSION` tags; avoid automatic releases on ordinary pushes. Keep the full test/size gate before publication. Use GitHub OIDC rather than storing Atmosphere credentials in repository secrets. Private repository provenance is not supported by the current release verifier.

## Separate npm follow-up

To remove source-based renderer setup for users, publish the free shared engine and Astro renderer first, then Advanced and the installer in dependency order. Confirm ownership of the npm `@emquix` scope independently from GitHub and Atmosphere. Remove `private: true` only from packages being published; keep the workspace private. Test the exact public npm packages on a clean site before changing the registry installation docs to recommend their install commands.

## References

- [Official sandbox publishing](https://docs.emdashcms.com/plugins/creating-plugins/publishing/)
- [Delegated releases and public provenance](https://docs.emdashcms.com/plugins/creating-plugins/delegated-releases/)
- [Native distribution boundary](https://docs.emdashcms.com/plugins/creating-native-plugins/distributing/)
- [Listing source sections](../packages/sandboxed/docs/registry/description.md)
- [Executed release evidence](release-report.md)

Publishing, moderation, registry installation and npm publication are separate milestones. The executed status above records completion; the procedure alone is not execution evidence.
