import { csvCell } from "./index";
import type { Form, Values } from "./index";
export interface Entry {
  formId: string;
  form: Form;
  values: Values;
  createdAt: string;
  notification: "pending" | "sent" | "failed" | "skipped";
  status?: "inbox" | "spam" | "trash";
  read?: boolean;
  starred?: boolean;
  reference?: string;
  notes?: Array<{
    id: string;
    text: string;
    createdAt: string;
    authorId: string;
  }>;
  fingerprint?: string;
}

// Each page includes its own header. Snapshot columns retain deleted/renamed fields.
export function entriesCsv(rows: Array<{ id: string; data: Entry }>) {
  const columns = new Map<string, string>();
  for (const row of rows)
    for (const f of row.data.form.fields)
      columns.set(f.id, `${f.label} [${f.id}]`);
  const keys = [...columns.keys()];
  const header = [
    "Reference",
    "Submitted",
    "Status",
    "Notification",
    ...columns.values(),
  ];
  return [
    header,
    ...rows.map(({ id, data }) => [
      id,
      data.createdAt,
      data.status ?? "inbox",
      data.notification,
      ...keys.map((k) => data.values[k] ?? ""),
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}
