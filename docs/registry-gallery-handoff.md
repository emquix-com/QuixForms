# QuixForms 0.1.3 — registry assessment rerun request

Prepared for the publisher to send to the EmDash registry maintainers. Not sent.

QuixForms 0.1.3 adds two real screenshots of the sandboxed builder and submissions
inbox. Full CI passed, and the uploaded package and media were downloaded and
verified against the source checksums and dimensions. The backend is identical
to approved 0.1.2. The assessment completed with `required-coverage-unavailable`,
despite public coverage showing text, links and media complete, with no findings.
Could an operator inspect and rerun this exact release assessment?

- Package: `@emquix.com/quixforms`
- Version: `0.1.3`
- Publisher DID: `did:plc:6clqzka76ueshbureaecbrfj`
- Release URI: `at://did:plc:6clqzka76ueshbureaecbrfj/com.emdashcms.experimental.package.release/quixforms:0.1.3`
- Release CID: `bafyreidfur6fwxro3r2qq33jjklzsns36nr37kup32wuhxsdvjqkq52qmm`
- Assessment ID: `assessment-v1-dd40e80198e572c244b1b0de3b1b42427d9782c31f02033c6adb7bc1655ea220`
- Completed: `2026-11-21T14:24:05.711Z`
- Policy: `listing-metadata-v2`
- Reason: `required-coverage-unavailable`
- [Passing CI](https://github.com/emquix-com/QuixForms/actions/runs/44913162549)
- [Public assessment endpoint](https://labels.emdashcms.com/xrpc/com.emdashcms.experimental.labeler.getCurrentAssessment?kind=release&uri=at%3A%2F%2Fdid%3Aplc%3A6clqzka76ueshbureaecbrfj%2Fcom.emdashcms.experimental.package.release%2Fquixforms%3A0.1.3&cid=bafyreidfur6fwxro3r2qq33jjklzsns36nr37kup32wuhxsdvjqkq52qmm)

Official implementation references:

- [Assessment policy](https://github.com/emdash-cms/emdash/blob/732867e9836efbd9fa9cf01f4fd086949b1bb392/apps/labeler/src/assessment/policy.ts)
- [Public status definitions](https://github.com/emdash-cms/emdash/blob/732867e9836efbd9fa9cf01f4fd086949b1bb392/apps/labeler/src/public-assessment.ts)
- [Authenticated operator rerun](https://github.com/emdash-cms/emdash/blob/732867e9836efbd9fa9cf01f4fd086949b1bb392/apps/labeler/src/operator/api.ts)
