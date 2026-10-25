import type { SandboxedPlugin, PluginContext } from "emdash/plugin";
import type {
  Block,
  BlockResponse,
  ButtonElement,
  FormField,
} from "@emdash-cms/blocks";
import { z } from "zod";
import { digest } from "./abuse";
import { logicAction } from "./logic-ui";
import { forms, save, duplicateForm } from "./plugin";
import {
  createTemplate,
  templateCatalog,
  type TemplateId,
} from "@emquix/quixforms-engine/templates";
import { entryAction } from "./entries-ui";
import {
  fieldTypes,
  registry,
  template,
  type Form,
} from "@emquix/quixforms-engine";
const button = (
  label: string,
  action_id: string,
  value?: unknown,
): ButtonElement => ({ type: "button", label, action_id, value });
const input = (
  action_id: string,
  label: string,
  initial_value = "",
): Extract<FormField, { type: "text_input" }> => ({
  type: "text_input",
  action_id,
  label,
  initial_value,
});
const interaction = z.object({
  type: z.enum(["page_load", "block_action", "form_submit"]),
  action_id: z.string().max(2000).optional(),
  value: z.unknown().optional(),
  values: z.record(z.string(), z.unknown()).optional(),
});
const token = (
  op: string,
  id: string,
  revision: string,
  field = "",
  page = 0,
) => [op, id, encodeURIComponent(revision), field, page].join(":");
async function editor(
  c: PluginContext,
  id: string,
  page = 0,
  notice?: string,
): Promise<BlockResponse> {
  const row = await forms(c).getVersioned(id);
  if (!row) return overview(c);
  const f = row.value.current;
  const maxFieldBytes = Math.max(
    1,
    ...f.fields.map(
      (field) => new TextEncoder().encode(JSON.stringify(field)).byteLength,
    ),
  );
  const perPage = Math.max(1, Math.min(8, Math.floor(120000 / maxFieldBytes)));
  const t = (op: string, field = "") =>
    token(op, id, row.revision, field, page);
  const blocks: Block[] = [
    { type: "header", text: f.title },
    {
      type: "section",
      text: `${f.status} · ${f.fields.length} fields · Page ${page + 1}`,
    },
    {
      type: "actions",
      elements: [
        button("All forms", "home"),
        button("Duplicate saved form", t("duplicateform")),
        button(f.status === "draft" ? "Publish" : "Unpublish", t("publish")),
        button("Entries", t("entries")),
        button("Embed", t("embed")),
        button("Notifications", t("notifications")),
        button("Revisions", t("revisions")),
      ],
    },
    {
      type: "form",
      block_id: "settings:" + id,
      fields: [
        input("title", "Form title", f.title),
        input("confirmation", "Confirmation", f.confirmation),
        {
          type: "select",
          action_id: "appearance",
          label: "Appearance",
          initial_value: f.appearance,
          options: ["minimal", "modern", "classic", "boxed"].map((value) => ({
            value,
            label: value,
          })),
        },
      ],
      submit: { label: "Save settings", action_id: t("settings") },
    },
  ];
  for (const field of f.fields.slice(page * perPage, page * perPage + perPage))
    blocks.push(
      {
        type: "form",
        block_id: "field:" + id + ":" + field.id,
        fields: [
          input("label", "Label", field.label),
          input("description", "Description", field.description),
          input("placeholder", "Placeholder", field.placeholder),
          {
            type: "select",
            action_id: "width",
            label: "Width",
            initial_value: field.width,
            options: ["full", "half", "third"].map((value) => ({
              value,
              label: value,
            })),
          },
          {
            type: "toggle",
            action_id: "required",
            label: "Required",
            initial_value: field.required,
          },
          {
            ...input(
              "options",
              "Choices (one per line)",
              field.options.join("\n"),
            ),
            multiline: true,
          },
        ],
        submit: { label: "Save field", action_id: t("field", field.id) },
      },
      {
        type: "actions",
        elements: [
          button("Move up", t("up", field.id)),
          button("Move down", t("down", field.id)),
          button("Duplicate", t("duplicate", field.id)),
          button("Delete", t("delete", field.id)),
          button("Visibility", t("logic", field.id)),
        ],
      },
    );
  blocks.push(
    {
      type: "form",
      block_id: "add-field:" + id,
      fields: [
        {
          type: "select",
          action_id: "type",
          label: "Add a field",
          options: fieldTypes.map((x) => ({ label: x, value: x })),
          initial_value: "text",
        },
      ],
      submit: { label: "Add field", action_id: t("add") },
    },
    {
      type: "actions",
      elements: [
        ...(page > 0
          ? [button("Previous", token("open", id, row.revision, "", page - 1))]
          : []),
        ...((page + 1) * perPage < f.fields.length
          ? [button("Next", token("open", id, row.revision, "", page + 1))]
          : []),
      ],
    },
  );
  return {
    blocks,
    ...(notice ? { toast: { type: "info" as const, message: notice } } : {}),
  };
}
async function overview(
  c: PluginContext,
  cursor?: string,
): Promise<BlockResponse> {
  const page = await forms(c).query({ limit: 15, cursor });
  return {
    blocks: [
      { type: "header", text: "QuixForms" },
      { type: "section", text: "Powerful Forms. Effortless Building." },
      {
        type: "form",
        block_id: "create-form",
        fields: [
          input("title", "New form name"),
          {
            type: "select",
            action_id: "template",
            label: "Template",
            initial_value: "contact",
            options: templateCatalog.map((t) => ({
              label: t.name,
              value: t.id,
            })),
          },
        ],
        submit: { label: "Create form", action_id: "create" },
      },
      ...page.items.map(
        ({ id, data }): Block => ({
          type: "section",
          text: data.current.title,
          accessory: button("Edit", "open:" + id),
        }),
      ),
      ...(page.cursor
        ? [
            {
              type: "actions" as const,
              elements: [button("Next forms", "home", page.cursor)],
            },
          ]
        : []),
    ],
  };
}
const renderAdmin: Extract<
  NonNullable<SandboxedPlugin["routes"]>[string],
  { handler: unknown }
>["handler"] = async (r, c) => {
  const p = interaction.safeParse(r.input);
  if (!p.success)
    return { blocks: [], toast: { type: "error", message: "Invalid action" } };
  const a = p.data;
  const [op, id, rev, field, pg] = a.action_id?.split(":") ?? [];
  const page = Math.max(0, Math.min(99, Number(pg) || 0));
  const v = a.values ?? {};
  try {
    if (!op || op === "home")
      return overview(c, typeof a.value === "string" ? a.value : undefined);
    if (op === "create") {
      const chosen =
        templateCatalog.find((t) => t.id === v.template)?.id ?? "contact";
      const f = createTemplate(
        chosen,
        "f_" + crypto.randomUUID().replaceAll("-", ""),
        z.string().min(1).max(200).parse(v.title),
      );
      await save(c, { form: f, revision: null });
      return editor(c, f.id);
    }
    if (
      ["entries", "inbox", "entry", "entryupdate", "entryexport"].includes(op)
    )
      return await entryAction(
        c,
        a.action_id!,
        v,
        a.value,
        r.user?.id ?? "machine",
      );
    if (op === "logicview" || op === "logicupdate")
      return await logicAction(c, a.action_id!, v);
    const row = await forms(c).getVersioned(id);
    if (!row) return overview(c);
    const f: Form = structuredClone(row.value.current);
    if (op === "open") return editor(c, id, page);
    if (op === "embed")
      return {
        blocks: [
          { type: "header", text: "Embed your form" },
          {
            type: "section",
            text: `Install the optional Astro companion and render <QuixForm id="${id}" client:load /> on a server-rendered page. Registry installation alone cannot inject forms into your theme. Public definition: /_emdash/api/plugins/quixforms/definition?id=${id}`,
          },
          { type: "actions", elements: [button("Back", "open:" + id)] },
        ],
      };
    if (op === "revisions")
      return {
        blocks: [
          { type: "header", text: "Saved revisions" },
          {
            type: "section",
            text: "Restore creates a draft and unpublishes the form. Existing submissions are retained.",
          },
          ...row.value.history.map((snapshot, index) => ({
            type: "section" as const,
            text: `${index + 1}. ${snapshot.title} · ${snapshot.fields.length} fields`,
            accessory: {
              ...button(
                "Restore draft",
                token("restore", id, row.revision, String(index)),
              ),
              confirm: {
                title: "Restore revision?",
                text: "The current form will become a draft. Publish it again when ready.",
                confirm: "Restore",
                deny: "Cancel",
              },
            },
          })),
          { type: "actions", elements: [button("Back", "open:" + id)] },
        ],
      };
    if (op === "notifications")
      return {
        blocks: [
          { type: "header", text: "Email notifications" },
          {
            type: "section",
            text: "Recipients are set by administrators. Use Send conditions to route messages based on validated form answers.",
          },
          ...f.notifications.flatMap((n, index): Block[] => [
            {
              type: "form" as const,
              block_id: "notification:" + id + ":" + index,
              fields: [
                input("to", "Recipient", n.to),
                input("subject", "Subject", n.subject),
                {
                  type: "toggle",
                  action_id: "enabled",
                  label: "Enabled",
                  initial_value: n.enabled !== false,
                },
              ],
              submit: {
                label: "Save notification",
                action_id: token(
                  "notification",
                  id,
                  row.revision,
                  String(index),
                ),
              },
            },
            {
              type: "actions",
              elements: [
                button(
                  "Send conditions",
                  [
                    "logicview",
                    id,
                    encodeURIComponent(row.revision),
                    `n_${index}`,
                    "when",
                  ].join(":"),
                ),
                {
                  ...button(
                    "Remove notification",
                    token(
                      "deletenotification",
                      id,
                      row.revision,
                      String(index),
                    ),
                  ),
                  confirm: {
                    title: "Remove notification?",
                    text: "This stops future delivery for this notification. Other notifications and entries remain.",
                    confirm: "Remove",
                    deny: "Cancel",
                  },
                },
              ],
            },
          ]),
          {
            type: "actions",
            elements: [
              ...(f.notifications.length < 5
                ? [
                    button(
                      "Add notification",
                      token("addnotification", id, row.revision),
                    ),
                  ]
                : []),
              button("Back", "open:" + id),
            ],
          },
        ],
      };
    if (op === "logic")
      return logicAction(
        c,
        [
          "logicview",
          id,
          encodeURIComponent(row.revision),
          field,
          "showWhen",
        ].join(":"),
        {},
      );
    if (decodeURIComponent(rev ?? "") !== row.revision)
      return editor(
        c,
        id,
        page,
        "Another editor saved changes. Reloaded; your action was not applied.",
      );
    if (op === "duplicateform") {
      const result = await duplicateForm(c, { id, revision: row.revision });
      return result.ok
        ? editor(
            c,
            result.id,
            0,
            "Draft copy created. Entries remain on the original form.",
          )
        : editor(
            c,
            id,
            0,
            "Could not duplicate. Reopen the form and try again.",
          );
    }
    const index = f.fields.findIndex((x) => x.id === field);
    if (op === "restore") {
      const restored = row.value.history[Number(field)];
      if (!restored) throw new Error("Missing revision");
      const result = await save(c, {
        form: { ...restored, status: "draft" },
        revision: row.revision,
      });
      return editor(
        c,
        id,
        0,
        result.ok ? "Revision restored as draft" : "Conflict",
      );
    }
    if (op === "notification") {
      const n = f.notifications[Number(field)];
      if (!n) throw new Error("Missing notification");
      n.to = z.email().parse(v.to);
      n.subject = z.string().parse(v.subject);
      n.enabled = z.boolean().parse(v.enabled);
    } else if (op === "deletenotification") {
      const index = z.coerce.number().int().min(0).max(4).parse(field);
      if (!f.notifications[index]) throw new Error("Missing notification");
      f.notifications.splice(index, 1);
    } else if (op === "addnotification")
      return {
        blocks: [
          {
            type: "form",
            block_id: "new-notification:" + id,
            fields: [
              input("to", "Recipient"),
              input("subject", "Subject", "New QuixForms submission"),
            ],
            submit: {
              label: "Add",
              action_id: token("createnotification", id, row.revision),
            },
          },
        ],
      };
    else if (op === "createnotification")
      f.notifications.push({
        to: z.email().parse(v.to),
        subject: z.string().parse(v.subject),
      });
    else if (op === "publish")
      f.status = f.status === "draft" ? "published" : "draft";
    else if (op === "settings") {
      f.title = z.string().parse(v.title);
      f.confirmation = z.string().parse(v.confirmation);
      f.appearance = z
        .enum(["minimal", "modern", "classic", "boxed"])
        .parse(v.appearance);
    } else if (op === "add") {
      const type = z.enum(fieldTypes).parse(v.type);
      f.fields.push(
        registry[type].create("f_" + crypto.randomUUID().replaceAll("-", "")),
      );
    } else if (index >= 0) {
      const x = f.fields[index];
      if (op === "field") {
        x.label = z.string().parse(v.label);
        x.description = z.string().parse(v.description);
        x.placeholder = z.string().parse(v.placeholder);
        x.width = z.enum(["full", "half", "third"]).parse(v.width);
        x.required = z.boolean().parse(v.required);
        x.options = z.string().parse(v.options).split("\n").filter(Boolean);
      } else if (op === "rule") {
        const source = z.string().parse(v.source);
        if (source)
          x.showWhen = {
            field: source,
            op: "eq",
            value: z.string().parse(v.equals),
          };
        else delete x.showWhen;
      } else if (op === "delete") f.fields.splice(index, 1);
      else if (op === "duplicate")
        f.fields.splice(index + 1, 0, {
          ...x,
          id: "f_" + crypto.randomUUID().replaceAll("-", ""),
        });
      else if (op === "up" || op === "down") {
        const target = index + (op === "up" ? -1 : 1);
        if (target >= 0 && target < f.fields.length)
          [f.fields[index], f.fields[target]] = [f.fields[target], x];
      }
    }
    const result = await save(c, { form: f, revision: row.revision });
    return editor(
      c,
      id,
      page,
      result.ok ? "Saved" : "Conflict: reload and try again",
    );
  } catch {
    return id
      ? editor(
          c,
          id,
          page,
          "Could not save. Check values and conditional references.",
        )
      : overview(c);
  }
};

// Block Kit initializes form values only on mount. Screen identity avoids state
// leaking between forms; the fields fingerprint refreshes changed saved values
// while preserving in-progress edits in other unchanged sections.
export const admin: typeof renderAdmin = async (request, context) => {
  const response = (await renderAdmin(request, context)) as BlockResponse;
  return {
    ...response,
    blocks: await Promise.all(
      response.blocks.map(async (block) =>
        block.type === "form"
          ? {
              ...block,
              block_id:
                (block.block_id ?? block.submit.action_id) +
                ":" +
                (await digest(JSON.stringify(block.fields))).slice(0, 16),
            }
          : block,
      ),
    ),
  };
};
