import type { SandboxedPlugin, PluginContext } from "emdash/plugin";
import type { Block, BlockResponse } from "@emdash-cms/blocks";
import * as z from "@emquix/quixforms-engine/schema";
import { digest } from "./abuse";
import { logicAction } from "./logic-ui";
import {
  editor,
  overview,
  settings,
  outline,
  embed,
  button,
  input,
  token,
  labels,
} from "./builder-ui";
import { forms, save, duplicateForm } from "./plugin";
import {
  createTemplate,
  templateCatalog,
} from "@emquix/quixforms-engine/templates";
import { entryAction } from "./entries-ui";
import { fieldTypes, registry, type Form } from "@emquix/quixforms-engine";
const interaction = z.object({
  type: z.enum(["page_load", "block_action", "form_submit"]),
  action_id: z.optional(z.string().check(z.maxLength(2000))),
  value: z.optional(z.unknown()),
  values: z.optional(z.record(z.string(), z.unknown())),
});
const renderAdmin: Extract<
  NonNullable<SandboxedPlugin["routes"]>[string],
  {
    handler: unknown;
  }
>["handler"] = async (r, c) => {
  const p = interaction.safeParse(r.input);
  if (!p.success)
    return { blocks: [], toast: { type: "error", message: "Invalid action" } };
  const a = p.data;
  const [op, id, rev, field, pg] = a.action_id?.split(":") ?? [];
  const page = Math.max(0, Math.min(99, Math.trunc(Number(pg) || 0)));
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
        z.string().check(z.minLength(1)).check(z.maxLength(200)).parse(v.title),
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
    if (op === "select") return editor(c, id, page, undefined, field);
    if (op === "formsettings") return settings(c, id);
    if (op === "preview") return outline(c, id, page);
    if (op === "embed") return embed(c, id);
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
            text: "Recipients are set by administrators. Message bodies are plain text. Use {all_fields}, {form_title} and {entry_reference}; leave blank to send all answers. Send conditions route messages based on validated answers.",
          },
          ...f.notifications.flatMap((n, index): Block[] => [
            {
              type: "form" as const,
              block_id: "notification:" + id + ":" + index,
              fields: [
                input("to", "Recipient", n.to),
                input("subject", "Subject", n.subject),
                {
                  type: "text_input",
                  multiline: true,
                  action_id: "body",
                  label: "Message body",
                  initial_value: n.body ?? "",
                },
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
    if (
      ![
        "duplicateform",
        "restore",
        "notification",
        "deletenotification",
        "addnotification",
        "createnotification",
        "publish",
        "settings",
        "add",
        "field",
        "rule",
        "delete",
        "duplicate",
        "up",
        "down",
      ].includes(op)
    )
      return editor(
        c,
        id,
        page,
        "Unknown action. No changes were saved.",
        field,
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
    let selectedField = field;
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
      if ("body" in v) n.body = z.string().parse(v.body);
      n.enabled = z.boolean().parse(v.enabled);
    } else if (op === "deletenotification") {
      const index = z.coerce
        .number()
        .check(z.refine(Number.isSafeInteger))
        .check(z.minimum(0))
        .check(z.maximum(4))
        .parse(field);
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
              {
                type: "text_input",
                multiline: true,
                action_id: "body",
                label: "Message body",
                initial_value: "{all_fields}",
              },
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
        ...(typeof v.body === "string" ? { body: v.body } : {}),
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
      const next = registry[type].create(
        "f_" + crypto.randomUUID().replaceAll("-", ""),
      );
      next.label = labels[type];
      f.fields.push(next);
      selectedField = next.id;
    } else if (index >= 0) {
      const x = f.fields[index];
      if (op === "field") {
        x.label = z.string().parse(v.label);
        x.description = z.string().parse(v.description);
        if ("placeholder" in v) x.placeholder = z.string().parse(v.placeholder);
        x.width = z.enum(["full", "half", "third"]).parse(v.width);
        if ("required" in v) x.required = z.boolean().parse(v.required);
        if ("options" in v)
          x.options = z.string().parse(v.options).split("\n").filter(Boolean);
        if (x.type === "number") {
          for (const bound of ["min", "max"] as const) {
            if (!(bound in v)) continue;
            const value = z.string().parse(v[bound]).trim();
            if (!value) delete x[bound];
            else x[bound] = z.number().parse(Number(value));
          }
        }
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
    } else throw new Error("Missing field");
    const result = await save(c, { form: f, revision: row.revision });
    return editor(
      c,
      id,
      page,
      result.ok ? "Saved" : "Conflict: reload and try again",
      selectedField,
    );
  } catch {
    return id
      ? editor(
          c,
          id,
          page,
          "Could not save. Check values, number ranges and conditional references.",
          field,
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
    blocks: await identifyForms(response.blocks),
  };
};
async function identifyForms(blocks: Block[]): Promise<Block[]> {
  return Promise.all(
    blocks.map(async (block) => {
      if (block.type === "form")
        return {
          ...block,
          block_id:
            (block.block_id ?? block.submit.action_id) +
            ":" +
            (await digest(JSON.stringify(block.fields))).slice(0, 16),
        };
      if (block.type === "columns")
        return {
          ...block,
          columns: await Promise.all(block.columns.map(identifyForms)),
        };
      if (block.type === "tab")
        return {
          ...block,
          panels: await Promise.all(
            block.panels.map(async (panel) => ({
              ...panel,
              blocks: await identifyForms(panel.blocks),
            })),
          ),
        };
      if (block.type === "accordion")
        return { ...block, blocks: await identifyForms(block.blocks) };
      return block;
    }),
  );
}
