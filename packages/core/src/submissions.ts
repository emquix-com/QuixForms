import { csvCell } from "./index";
import type { Form, Values } from "./index";
/** Plain-text templates; replacement values are never interpreted as templates. */
export function notificationMessage(
  form: Form,
  body: string | undefined,
  values: Values,
  reference: string,
) {
  const answers = form.fields
    .filter((f) => Object.hasOwn(values, f.id))
    .map(
      (f) =>
        `${f.label}: ${Array.isArray(values[f.id]) ? (values[f.id] as string[]).join(", ") : values[f.id]}`,
    )
    .join("\n");
  const replacements: Record<string, string> = {
    all_fields: answers,
    form_title: form.title,
    entry_reference: reference,
  };
  const template = body?.trim() ? body : "{all_fields}";
  let length = 0;
  // Bound expanded output before concatenating repeated answer lists.
  const parts = template
    .split(/(\{(?:all_fields|form_title|entry_reference)\})/g)
    .map((part) => {
      const value =
        replacements[part.slice(1, -1)] !== undefined &&
        part.startsWith("{") &&
        part.endsWith("}")
          ? replacements[part.slice(1, -1)]
          : part;
      length += value.length;
      if (length > 100000) throw new Error("Notification body is too large");
      return value;
    });
  return parts.join("");
}
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
