# QuixForms engineering rules

Verify EmDash APIs against source and pinned package types. Do not invent contracts or access another plugin's storage. Core owns all durable form data. Native clients must use authenticated Core routes. Preserve unknown future schema versions by rejecting unsupported edits, never stripping them. Keep packages private until release approval. Do not report unexecuted tests as passing. Update docs/release-report.md when evidence changes.
