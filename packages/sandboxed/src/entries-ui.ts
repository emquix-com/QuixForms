import type { PluginContext } from "emdash/plugin";
import type { Block, BlockResponse, ButtonElement } from "@emdash-cms/blocks";
import {
  entryQuery,
  listEntries,
  readEntry,
  updateEntry,
  entriesCsv,
} from "./entries";
const button = (
  label: string,
  action_id: string,
  value?: unknown,
): ButtonElement => ({ type: "button", label, action_id, value });
export async function inbox(
  c: PluginContext,
  id: string,
  filter: unknown = {},
): Promise<BlockResponse> {
  const q = entryQuery.parse({
    ...(filter && typeof filter === "object" ? filter : {}),
    id,
  });
  const page = await listEntries(c, q, 10);
  return {
    blocks: [
      { type: "header", text: "Submissions" },
      {
        type: "form",
        fields: [
          {
            type: "select",
            action_id: "status",
            label: "Folder",
            initial_value: q.status,
            options: ["all", "inbox", "spam", "trash"].map((value) => ({
              value,
              label: value,
            })),
          },
          {
            type: "select",
            action_id: "starred",
            label: "Starred entries",
            initial_value: q.starred,
            options: [
              { value: "all", label: "All entries" },
              { value: "yes", label: "Starred only" },
            ],
          },
          {
            type: "text_input",
            action_id: "reference",
            label: "Search reference prefix",
            initial_value: q.reference,
          },
        ],
        submit: { label: "Apply filters", action_id: "inbox:" + id },
      },
      {
        type: "table",
        page_action_id: "inbox:" + id,
        columns: [
          { key: "submitted", label: "Submitted" },
          { key: "status", label: "Folder" },
          { key: "read", label: "Read" },
          { key: "starred", label: "Starred" },
          { key: "notification", label: "Notification" },
          { key: "action", label: "Entry", format: "element" },
        ],
        rows: page.items.map(({ id: key, data }) => ({
          submitted: data.createdAt,
          status: data.status ?? "inbox",
          read: data.read ? "Yes" : "No",
          starred: data.starred ? "Yes" : "No",
          notification: data.notification,
          action: button("Open", "entry:" + id + ":" + key),
        })),
      },
      ...(!page.items.length
        ? [
            {
              type: "section" as const,
              text: "No entries match these filters.",
            },
          ]
        : []),
      {
        type: "actions",
        elements: [
          button("Back to form", "open:" + id),
          button("Export this page", "entryexport:" + id, q),
          ...(page.cursor
            ? [
                button("Next page", "inbox:" + id, {
                  ...q,
                  cursor: page.cursor,
                }),
              ]
            : []),
        ],
      },
    ],
  };
}
export async function entryDetail(
  c: PluginContext,
  id: string,
  key: string,
  page = 0,
  notice?: string,
): Promise<BlockResponse> {
  const row = await readEntry(c, { id, key });
  if (!row)
    return {
      blocks: [
        { type: "section", text: "Entry not found." },
        { type: "actions", elements: [button("Back", "inbox:" + id)] },
      ],
    };
  const e = row.value;
  const action = (kind: string) =>
    ["entryupdate", id, key, encodeURIComponent(row.revision), kind].join(":");
  const blocks: Block[] = [
    { type: "header", text: e.form.title + " — submission" },
    {
      type: "fields",
      fields: [
        { label: "Reference", value: key },
        { label: "Submitted", value: e.createdAt },
        { label: "Folder", value: e.status ?? "inbox" },
        { label: "Notification", value: e.notification },
      ],
    },
    {
      type: "actions",
      elements: [
        button(
          e.read ? "Mark unread" : "Mark read",
          action(e.read ? "unread" : "read"),
        ),
        button(
          e.starred ? "Remove star" : "Star",
          action(e.starred ? "unstar" : "star"),
        ),
        button("Spam", action("spam")),
        button("Trash", action("trash")),
        button("Restore to inbox", action("inbox")),
      ],
    },
    {
      type: "fields",
      fields: e.form.fields
        .slice(page * 8, page * 8 + 8)
        .map((f) => ({
          label: f.label,
          value: (Array.isArray(e.values[f.id])
            ? (e.values[f.id] as string[]).join(", ")
            : String(e.values[f.id] ?? "—")
          ).slice(0, 4000),
        })),
    },
    { type: "section", text: "Internal notes" },
    ...(e.notes ?? [])
      .slice(-5)
      .map((n) => ({
        type: "section" as const,
        text: `${n.createdAt} · ${n.authorId}\n${n.text}`,
      })),
    {
      type: "form",
      fields: [
        {
          type: "text_input",
          action_id: "note",
          label: "Add internal note",
          multiline: true,
        },
      ],
      submit: { label: "Save note", action_id: action("note") },
    },
    {
      type: "actions",
      elements: [
        button("Back to inbox", "inbox:" + id),
        ...(page > 0
          ? [button("Previous fields", `entry:${id}:${key}:${page - 1}`)]
          : []),
        ...((page + 1) * 8 < e.form.fields.length
          ? [button("More fields", `entry:${id}:${key}:${page + 1}`)]
          : []),
      ],
    },
  ];
  return {
    blocks,
    ...(notice ? { toast: { type: "info" as const, message: notice } } : {}),
  };
}
export async function entryAction(
  c: PluginContext,
  action: string,
  values: Record<string, unknown>,
  value: unknown,
  authorId: string,
): Promise<BlockResponse> {
  const [op, id, key, revision, kind] = action.split(":");
  if (op === "entries" || op === "inbox")
    return inbox(
      c,
      id,
      Object.keys(values).length
        ? values
        : typeof value === "string"
          ? { cursor: value }
          : value,
    );
  if (op === "entry")
    return entryDetail(
      c,
      id,
      key,
      Math.min(12, Math.max(0, Number(revision) || 0)),
    );
  if (op === "entryexport") {
    const rows = await listEntries(
      c,
      { ...(value && typeof value === "object" ? value : {}), id },
      10,
    );
    const csv = entriesCsv(rows.items);
    // Large export pages use the authenticated API, avoiding Block Kit response overflow.
    return {
      blocks: [
        { type: "header", text: "Export submissions" },
        {
          type: "section",
          text: "CSV export uses each entry’s saved field definitions. Copy the CSV below. For complete JSON or cursor-paginated CSV use the authenticated /export API.",
        },
        ...(csv.length < 50000
          ? [{ type: "code" as const, code: csv }]
          : [
              {
                type: "section" as const,
                text: "This page is too large to display safely. Use the authenticated export API.",
              },
            ]),
        { type: "actions", elements: [button("Back", "inbox:" + id)] },
      ],
    };
  }
  const patch =
    kind === "read" || kind === "unread"
      ? { read: kind === "read" }
      : kind === "star" || kind === "unstar"
        ? { starred: kind === "star" }
        : { status: kind };
  const result = await updateEntry(
    c,
    {
      id,
      key,
      revision: decodeURIComponent(revision),
      ...(kind === "note" ? { note: values.note } : { patch }),
    },
    authorId,
  );
  return entryDetail(
    c,
    id,
    key,
    0,
    result.ok
      ? "Saved"
      : result.error === "CONFLICT"
        ? "Another administrator changed this entry. Reloaded; please retry."
        : "Could not update this entry.",
  );
}
