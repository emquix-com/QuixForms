import type {
  Block,
  BlockResponse,
  ButtonElement,
  FormField,
} from "@emdash-cms/blocks";
import type { PluginContext } from "emdash/plugin";
import { fieldTypes, type Field, type Form } from "@emquix/quixforms-engine";
import { templateCatalog } from "@emquix/quixforms-engine/templates";
import { forms } from "./plugin";

export const labels: Record<Field["type"], string> = {
  text: "Single line text",
  paragraph: "Paragraph text",
  email: "Email",
  name: "Name",
  phone: "Phone",
  url: "Website / URL",
  number: "Number",
  select: "Dropdown",
  radio: "Multiple choice",
  checkboxes: "Checkboxes",
  consent: "Consent",
  hidden: "Hidden field",
  content: "Content",
  section: "Section divider",
  page: "Page break",
};
export const button = (
  label: string,
  action_id: string,
  value?: unknown,
): ButtonElement => ({ type: "button", label, action_id, value });
export const input = (
  action_id: string,
  label: string,
  initial_value = "",
): Extract<FormField, { type: "text_input" }> => ({
  type: "text_input",
  action_id,
  label,
  initial_value,
});
export const token = (
  op: string,
  id: string,
  revision: string,
  field = "",
  page = 0,
) => [op, id, encodeURIComponent(revision), field, page].join(":");
const pageSize = 8;
const valueText = (text: string, max = 180) =>
  text.length > max ? text.slice(0, max) + "…" : text;

async function spamStatus(c: PluginContext): Promise<boolean | undefined> {
  if (!c.settings) return undefined;
  const [site, secret] = await Promise.all([
    c.settings.get<string>("turnstileSiteKey"),
    c.settings.get<string>("turnstileSecret"),
  ]);
  return (
    typeof site === "string" &&
    !!site.trim() &&
    typeof secret === "string" &&
    !!secret.trim()
  );
}
function navigation(id: string, revision: string, page = 0): Block {
  return {
    type: "actions",
    elements: [
      button("All forms", "home"),
      button("Build form", token("open", id, revision, "", page)),
      button("Settings", token("formsettings", id, revision)),
      button("Notifications", token("notifications", id, revision)),
      button("Form outline", token("preview", id, revision)),
      button("Entries", token("entries", id, revision)),
      button("Embed & setup", token("embed", id, revision)),
      button("Revisions", token("revisions", id, revision)),
    ],
  };
}
export async function overview(
  c: PluginContext,
  cursor?: string,
): Promise<BlockResponse> {
  const [page, protectedForm] = await Promise.all([
    forms(c).query({ limit: 15, cursor }),
    spamStatus(c),
  ]);
  const published = page.items.filter(
    (x) => x.data.current.status === "published",
  ).length;
  return {
    blocks: [
      { type: "header", text: "QuixForms" },
      {
        type: "section",
        text: "Build forms, manage responses and publish with confidence.",
      },
      {
        type: "stats",
        items: [
          { label: "Forms on this page", value: page.items.length },
          { label: "Published on this page", value: published },
          {
            label: "Spam protection",
            value:
              protectedForm === undefined
                ? "Not checked"
                : protectedForm
                  ? "Keys configured"
                  : "CAPTCHA off",
          },
        ],
      },
      ...(!protectedForm
        ? [
            {
              type: "banner" as const,
              variant: "alert" as const,
              title: "Check spam protection before sharing a form",
              description:
                "CAPTCHA is off. Forms accept submissions without a bot check. Configure both Turnstile keys to enable it; email setup is separate.",
            },
            {
              type: "actions" as const,
              elements: [
                {
                  type: "link" as const,
                  label: "Open plugin settings",
                  target: { kind: "plugin-settings" as const },
                },
              ],
            },
          ]
        : []),
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
      ...(!page.items.length
        ? [
            {
              type: "empty" as const,
              title: "Your first form starts here",
              description:
                "Choose a template above or start blank. Forms begin as drafts; entries stay in your own site.",
            },
          ]
        : [
            {
              type: "table" as const,
              page_action_id: "home",
              columns: [
                { key: "title", label: "Form" },
                { key: "status", label: "Status", format: "badge" as const },
                { key: "fields", label: "Fields", format: "number" as const },
                {
                  key: "notifications",
                  label: "Active notifications",
                  format: "number" as const,
                },
                { key: "edit", label: "Builder", format: "element" as const },
              ],
              rows: page.items.map(({ id, data }) => ({
                title: data.current.title,
                status: data.current.status,
                fields: data.current.fields.length,
                notifications: data.current.notifications.filter(
                  (n) => n.enabled !== false,
                ).length,
                edit: button("Edit", "open:" + id),
              })),
            },
          ]),
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
export async function editor(
  c: PluginContext,
  id: string,
  requestedPage = 0,
  notice?: string,
  selectedId?: string,
): Promise<BlockResponse> {
  const row = await forms(c).getVersioned(id);
  if (!row) return overview(c);
  const f = row.value.current;
  const index = selectedId
    ? f.fields.findIndex((x) => x.id === selectedId)
    : -1;
  const page = Math.min(
    Math.floor(Math.max(0, f.fields.length - 1) / pageSize),
    index >= 0 ? Math.floor(index / pageSize) : requestedPage,
  );
  const field = f.fields[index >= 0 ? index : page * pageSize];
  const t = (op: string, key = "") => token(op, id, row.revision, key, page);
  const controls: Block[] = [];
  if (field) {
    const fields: FormField[] = [
      input("label", "Label", field.label),
      {
        ...input("description", "Description", field.description),
        multiline: true,
      },
    ];
    if (!["content", "section", "page", "hidden"].includes(field.type))
      fields.push(input("placeholder", "Placeholder", field.placeholder));
    fields.push({
      type: "select",
      action_id: "width",
      label: "Width",
      initial_value: field.width,
      options: [
        { value: "full", label: "Full width" },
        { value: "half", label: "Half width" },
        { value: "third", label: "One third" },
      ],
    });
    if (!["content", "section", "page"].includes(field.type))
      fields.push({
        type: "toggle",
        action_id: "required",
        label: "Required",
        initial_value: field.required,
      });
    if (["select", "radio", "checkboxes"].includes(field.type))
      fields.push({
        ...input("options", "Choices (one per line)", field.options.join("\n")),
        multiline: true,
      });
    if (field.type === "number")
      fields.push(
        input(
          "min",
          "Minimum value (optional)",
          field.min === undefined ? "" : String(field.min),
        ),
        input(
          "max",
          "Maximum value (optional)",
          field.max === undefined ? "" : String(field.max),
        ),
      );
    controls.push(
      { type: "header", text: labels[field.type] + " options" },
      {
        type: "context",
        text: `Field ${f.fields.indexOf(field) + 1} of ${f.fields.length} · ${valueText(field.label)}`,
      },
      {
        type: "form",
        block_id: "field:" + id + ":" + field.id,
        fields,
        submit: { label: "Save field", action_id: t("field", field.id) },
      },
      {
        type: "actions",
        elements: [
          ...(f.fields.indexOf(field) > 0
            ? [button("Move up", t("up", field.id))]
            : []),
          ...(f.fields.indexOf(field) < f.fields.length - 1
            ? [button("Move down", t("down", field.id))]
            : []),
          ...(f.fields.length < 100
            ? [button("Duplicate", t("duplicate", field.id))]
            : []),
          button("Visibility & required rules", t("logic", field.id)),
          {
            ...button("Delete field", t("delete", field.id)),
            style: "danger",
            confirm: {
              title: "Delete this field?",
              text: "Saved entries keep their original answers. A field referenced by conditional rules cannot be removed until those references are updated.",
              confirm: "Delete field",
              deny: "Keep field",
              style: "danger",
            },
          },
        ],
      },
    );
  } else
    controls.push({
      type: "empty",
      title: "Add your first field",
      description: "Choose a field type in the form builder to get started.",
    });
  return {
    blocks: [
      { type: "header", text: f.title },
      navigation(id, row.revision, page),
      {
        type: "context",
        text: `${f.status === "published" ? "Published" : "Draft"} · ${f.fields.length}/100 fields · Field page ${page + 1} of ${Math.max(1, Math.ceil(f.fields.length / pageSize))}`,
      },
      ...(f.status === "published"
        ? [
            {
              type: "banner" as const,
              variant: "alert" as const,
              title: "You are editing a published form",
              description:
                "Each saved change updates the visitor form immediately. Unpublish first if you want to edit privately.",
            },
          ]
        : []),
      {
        type: "actions",
        elements: [
          {
            ...button(
              f.status === "draft" ? "Publish" : "Unpublish",
              t("publish"),
            ),
            style: "primary",
          },
          button("Duplicate saved form", t("duplicateform")),
        ],
      },
      {
        type: "columns",
        columns: [
          [
            { type: "header", text: "Form fields" },
            {
              type: "table",
              page_action_id: t("open"),
              empty_text: "No fields yet.",
              columns: [
                { key: "label", label: "Field" },
                { key: "type", label: "Type" },
                { key: "rules", label: "Rules" },
                { key: "edit", label: "Options", format: "element" },
              ],
              rows: f.fields
                .slice(page * pageSize, (page + 1) * pageSize)
                .map((x, i) => ({
                  label: `${page * pageSize + i + 1}. ${x.label}`,
                  type: labels[x.type],
                  rules: [
                    x.required ? "Required" : "Optional",
                    ...(x.showWhen ? ["Conditional visibility"] : []),
                    ...(x.requiredWhen ? ["Conditional required"] : []),
                  ].join(" · "),
                  edit: button(
                    x.id === field?.id ? "Editing" : "Edit field",
                    t("select", x.id),
                  ),
                })),
            },
            ...(f.fields.length < 100
              ? [
                  {
                    type: "form" as const,
                    block_id: "add-field:" + id,
                    fields: [
                      {
                        type: "select" as const,
                        action_id: "type",
                        label: "Add a field",
                        options: fieldTypes.map((type) => ({
                          value: type,
                          label: labels[type],
                        })),
                        initial_value: "text",
                      },
                    ],
                    submit: { label: "Add field", action_id: t("add") },
                  },
                ]
              : [
                  {
                    type: "context" as const,
                    text: "This form has reached the 100-field limit.",
                  },
                ]),
            {
              type: "actions",
              elements: [
                ...(page > 0
                  ? [
                      button(
                        "Previous fields",
                        token("open", id, row.revision, "", page - 1),
                      ),
                    ]
                  : []),
                ...((page + 1) * pageSize < f.fields.length
                  ? [
                      button(
                        "Next fields",
                        token("open", id, row.revision, "", page + 1),
                      ),
                    ]
                  : []),
              ],
            },
          ],
          controls,
        ],
      },
    ],
    ...(notice ? { toast: { type: "info", message: notice } } : {}),
  };
}
export async function settings(
  c: PluginContext,
  id: string,
): Promise<BlockResponse> {
  const row = await forms(c).getVersioned(id);
  if (!row) return overview(c);
  const f = row.value.current;
  return {
    blocks: [
      { type: "header", text: "Form settings" },
      navigation(id, row.revision),
      {
        type: "form",
        block_id: "settings:" + id,
        fields: [
          input("title", "Form title", f.title),
          {
            ...input("confirmation", "Confirmation", f.confirmation),
            multiline: true,
          },
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
        submit: {
          label: "Save settings",
          action_id: token("settings", id, row.revision),
        },
      },
    ],
  };
}
export async function outline(
  c: PluginContext,
  id: string,
  requestedPage = 0,
): Promise<BlockResponse> {
  const row = await forms(c).getVersioned(id);
  if (!row) return overview(c);
  const f = row.value.current;
  const page = Math.min(
    requestedPage,
    Math.floor(Math.max(0, f.fields.length - 1) / pageSize),
  );
  return {
    blocks: [
      { type: "header", text: "Form outline: " + f.title },
      navigation(id, row.revision),
      {
        type: "banner",
        description:
          "This is an admin outline, not a submission page. Check public styling, conditional visibility and Back/Next behavior on your Astro form page.",
      },
      ...f.fields.slice(page * pageSize, (page + 1) * pageSize).map(
        (field): Block => ({
          type: "fields",
          fields: [
            {
              label: `${labels[field.type]}${field.required ? " · Required" : ""}`,
              value: field.label,
            },
            ...(field.description
              ? [
                  {
                    label: "Description",
                    value: valueText(field.description, 350),
                  },
                ]
              : []),
            ...(field.placeholder
              ? [{ label: "Placeholder", value: field.placeholder }]
              : []),
            ...(field.options.length
              ? [
                  {
                    label: "Choices",
                    value:
                      field.options
                        .slice(0, 6)
                        .map((x) => valueText(x, 70))
                        .join(" · ") +
                      (field.options.length > 6
                        ? ` · +${field.options.length - 6} more`
                        : ""),
                  },
                ]
              : []),
            {
              label: "Layout & rules",
              value: `${field.width} width${field.showWhen ? " · conditional visibility" : ""}${field.requiredWhen ? " · conditional required" : ""}`,
            },
            ...(field.type === "number"
              ? [
                  {
                    label: "Allowed range",
                    value: `${field.min ?? "No minimum"} to ${field.max ?? "no maximum"}`,
                  },
                ]
              : []),
          ],
        }),
      ),
      {
        type: "fields",
        fields: [
          { label: "Confirmation", value: f.confirmation },
          { label: "Appearance", value: f.appearance },
        ],
      },
      {
        type: "actions",
        elements: [
          ...(page > 0
            ? [
                button(
                  "Previous fields",
                  token("preview", id, row.revision, "", page - 1),
                ),
              ]
            : []),
          ...((page + 1) * pageSize < f.fields.length
            ? [
                button(
                  "Next fields",
                  token("preview", id, row.revision, "", page + 1),
                ),
              ]
            : []),
        ],
      },
    ],
  };
}
export async function embed(
  c: PluginContext,
  id: string,
): Promise<BlockResponse> {
  const row = await forms(c).getVersioned(id);
  if (!row) return overview(c);
  const [protectedForm] = await Promise.all([spamStatus(c)]);
  const f = row.value.current;
  return {
    blocks: [
      { type: "header", text: "Embed & setup" },
      navigation(id, row.revision),
      {
        type: "fields",
        fields: [
          { label: "Form", value: f.title },
          { label: "Form ID", value: id },
          {
            label: "Publishing",
            value:
              f.status === "published"
                ? "Published — definition is available"
                : "Draft — publish before sharing",
          },
          {
            label: "Spam protection",
            value:
              protectedForm === undefined
                ? "Not checked"
                : protectedForm
                  ? "Keys configured — verify a real submission"
                  : "Not configured — forms work without CAPTCHA",
          },
          {
            label: "Email notifications",
            value: `${f.notifications.filter((n) => n.enabled !== false).length} enabled. Configure the site's email provider and verify delivery separately.`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "link",
            label: "Open spam protection settings",
            target: { kind: "plugin-settings" },
          },
        ],
      },
      {
        type: "section",
        text: "Install the Astro companion once, then add this component to a server-rendered page and rebuild. Core manages forms and entries without the Advanced editor. The public page renderer still needs the Astro companion.",
      },
      {
        type: "code",
        language: "tsx",
        code: `---\nimport Form from '@emquix/quixforms-astro/Form.astro';\n---\n<Form id="${id}" />`,
      },
      {
        type: "section",
        text: `If your site has the dynamic companion route installed, open /forms/${id}. Publishing a form does not install that route. Public definition API: /_emdash/api/plugins/quixforms/definition?id=${id}`,
      },
      {
        type: "banner",
        title: "Before you share",
        description:
          "Submit through the real public page, confirm the entry is stored, check the notification and export, and test on a phone. Configured keys do not prove CAPTCHA or email delivery.",
      },
    ],
  };
}
