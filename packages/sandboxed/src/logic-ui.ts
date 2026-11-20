import type { PluginContext } from "emdash/plugin";
import type { Block, BlockResponse, ButtonElement } from "@emdash-cms/blocks";
import * as z from "@emquix/quixforms-engine/schema";
import type { Rule } from "@emquix/quixforms-engine";
import { forms, save } from "./plugin";
const button = (label: string, action_id: string): ButtonElement => ({
  type: "button",
  label,
  action_id,
});
const operators = [
  "eq",
  "ne",
  "contains",
  "notContains",
  "gt",
  "lt",
  "empty",
  "notEmpty",
  "startsWith",
  "endsWith",
  "selected",
  "notSelected",
] as const;
const labels: Record<string, string> = {
  eq: "Equals",
  ne: "Does not equal",
  contains: "Contains",
  notContains: "Does not contain",
  gt: "Greater than",
  lt: "Less than",
  empty: "Is empty",
  notEmpty: "Is not empty",
  startsWith: "Starts with",
  endsWith: "Ends with",
  selected: "Is selected",
  notSelected: "Is not selected",
};
function get(root: Rule | undefined, path: number[]): Rule | undefined {
  let node = root;
  for (const i of path) {
    if (!node || !("rules" in node)) return;
    node = node.rules[i];
  }
  return node;
}
function replace(
  root: Rule | undefined,
  path: number[],
  next: Rule | undefined,
): Rule | undefined {
  if (!path.length) return next;
  if (!root || !("rules" in root)) throw new Error("Invalid rule path");
  const [i, ...rest] = path;
  if (!root.rules[i]) throw new Error("Invalid rule index");
  const child = replace(root.rules[i], rest, next);
  const rules = root.rules.flatMap((r, j) =>
    j === i ? (child ? [child] : []) : [r],
  );
  return rules.length ? { ...root, rules } : undefined;
}
export async function logicAction(
  c: PluginContext,
  action: string,
  values: Record<string, unknown>,
): Promise<BlockResponse> {
  const [op, id, revision, fieldId, location = "showWhen", operation] =
    action.split(":");
  const [rawMode, ...parts] = location.split(".");
  const mode = z.enum(["showWhen", "requiredWhen", "when"]).parse(rawMode);
  const path = parts.map((n) =>
    z.coerce
      .number()
      .check(z.refine(Number.isSafeInteger))
      .check(z.minimum(0))
      .check(z.maximum(9))
      .parse(n),
  );
  if (path.length > 4) throw new Error("Rule editor depth exceeded");
  const row = await forms(c).getVersioned(id);
  if (!row) throw new Error("Missing form");
  const form = structuredClone(row.value.current);
  const notificationIndex =
    mode === "when"
      ? z.coerce
          .number()
          .check(z.refine(Number.isSafeInteger))
          .check(z.minimum(0))
          .check(z.maximum(4))
          .parse(/^n_(\d)$/.exec(fieldId)?.[1])
      : undefined;
  const field =
    mode === "when" ? undefined : form.fields.find((f) => f.id === fieldId);
  const notification =
    notificationIndex === undefined
      ? undefined
      : form.notifications[notificationIndex];
  const target:
    | {
        showWhen?: Rule;
        requiredWhen?: Rule;
        when?: Rule;
      }
    | undefined = notification ?? field;
  if (!target) throw new Error("Missing condition target");
  const title = notification
    ? `Notification ${notificationIndex! + 1}`
    : field!.label;
  let root = target[mode],
    node = get(root, path);
  const availableFields = form.fields.filter(
    (f) =>
      f.id !== field?.id && !["page", "section", "content"].includes(f.type),
  );
  const source = availableFields[0];
  const fresh = (): Rule => {
    if (!source) throw new Error("Add an input field first");
    return { field: source.id, op: "notEmpty" };
  };
  if (op === "logicupdate") {
    if (decodeURIComponent(revision) !== row.revision)
      return {
        blocks: [
          {
            type: "section",
            text: "Another editor changed this form. Reopen conditions to retry.",
          },
          { type: "actions", elements: [button("Back", "open:" + id)] },
        ],
      };
    let next = node;
    if (operation === "create") next = { op: "and", rules: [fresh()] };
    else if (operation === "remove") next = undefined;
    else if (operation === "join") {
      if (!node || !("rules" in node)) throw new Error("Invalid group");
      next = { ...node, op: z.enum(["and", "or"]).parse(values.join) };
    } else if (operation === "add" || operation === "group") {
      if (!node || !("rules" in node) || node.rules.length >= 10)
        throw new Error("Group limit");
      next = {
        ...node,
        rules: [
          ...node.rules,
          operation === "add" ? fresh() : { op: "and", rules: [fresh()] },
        ],
      };
    } else if (operation === "leaf") {
      const ref = z.string().parse(values.source),
        operator = z.enum(operators).parse(values.operator),
        comparison = z
          .string()
          .check(z.maxLength(500))
          .parse(values.value ?? "");
      const sourceField = form.fields.find((f) => f.id === ref);
      if (!sourceField) throw new Error("Unknown field");
      let value: string | number | boolean = comparison;
      if (
        sourceField.type === "number" &&
        !["empty", "notEmpty"].includes(operator)
      ) {
        value = Number(comparison);
        if (!Number.isFinite(value) || !comparison.trim())
          throw new Error("Enter a number");
      } else if (
        sourceField.type === "consent" &&
        !["empty", "notEmpty"].includes(operator)
      )
        value = z.enum(["true", "false"]).parse(comparison) === "true";
      next = {
        field: ref,
        op: operator,
        ...(["empty", "notEmpty"].includes(operator) ? {} : { value }),
      };
    }
    root = replace(root, path, next);
    if (root) target[mode] = root;
    else delete target[mode];
    const result = await save(c, { form, revision: row.revision });
    if (!result.ok) throw new Error("Conflict");
    return logicAction(
      c,
      [
        "logicview",
        id,
        encodeURIComponent(result.revision),
        fieldId,
        mode,
      ].join(":"),
      {},
    );
  }
  const make = (operation?: string, childPath = path) =>
    [
      operation ? "logicupdate" : "logicview",
      id,
      encodeURIComponent(row.revision),
      fieldId,
      [mode, ...childPath].join("."),
      ...(operation ? [operation] : []),
    ].join(":");
  const blocks: Block[] = [
    {
      type: "header",
      text:
        title +
        " — " +
        (mode === "when"
          ? "send conditions"
          : mode === "showWhen"
            ? "visibility"
            : "conditional required"),
    },
    {
      type: "section",
      text: "Configure nested conditions. Changes are validated and saved together with the form. Numerical comparisons use numerical field values; consent comparisons use true or false.",
    },
    {
      type: "actions",
      elements: [
        button(
          mode === "when" ? "Back to notifications" : "Back to form",
          (mode === "when" ? "notifications:" : "open:") + id,
        ),
        ...(mode === "when"
          ? []
          : [
              button(
                mode === "showWhen"
                  ? "Edit conditional required"
                  : "Edit visibility",
                [
                  "logicview",
                  id,
                  encodeURIComponent(row.revision),
                  fieldId,
                  mode === "showWhen" ? "requiredWhen" : "showWhen",
                ].join(":"),
              ),
            ]),
        ...(path.length
          ? [button("Parent group", make(undefined, path.slice(0, -1)))]
          : []),
      ],
    },
  ];
  if (!node) {
    blocks.push(
      {
        type: "section",
        text:
          mode === "when"
            ? "Send for every accepted submission when enabled"
            : mode === "showWhen"
              ? "Always visible"
              : "Only the standard Required setting applies",
      },
      {
        type: "actions",
        elements: source ? [button("Add conditions", make("create"))] : [],
      },
    );
    return { blocks };
  }
  function leaf(
    rule: Extract<
      Rule,
      {
        field: string;
      }
    >,
    at: number[],
  ) {
    blocks.push(
      {
        type: "form",
        block_id: ["condition", id, fieldId, mode, ...at].join(":"),
        fields: [
          {
            type: "select",
            action_id: "source",
            label: "Field",
            initial_value: rule.field,
            options: availableFields.map((f) => ({
              label: f.label,
              value: f.id,
            })),
          },
          {
            type: "select",
            action_id: "operator",
            label: "Operator",
            initial_value: rule.op,
            options: operators.map((value) => ({
              value,
              label: labels[value],
            })),
          },
          {
            type: "text_input",
            action_id: "value",
            label: "Comparison value",
            initial_value: String(rule.value ?? ""),
          },
        ],
        submit: { label: "Save condition", action_id: make("leaf", at) },
      },
      {
        type: "actions",
        elements: [button("Remove condition", make("remove", at))],
      },
    );
  }
  if ("rules" in node) {
    blocks.push({
      type: "form",
      block_id: ["condition-group", id, fieldId, mode, ...path].join(":"),
      fields: [
        {
          type: "select",
          action_id: "join",
          label: "Match",
          initial_value: node.op,
          options: [
            { value: "and", label: "All conditions (AND)" },
            { value: "or", label: "Any condition (OR)" },
          ],
        },
      ],
      submit: { label: "Save group", action_id: make("join") },
    });
    node.rules.forEach((r, i) => {
      const at = [...path, i];
      if ("rules" in r)
        blocks.push({
          type: "section",
          text: `${r.op === "and" ? "All" : "Any"} of ${r.rules.length} nested conditions`,
          accessory: button("Edit group", make(undefined, at)),
        });
      else
        blocks.push({
          type: "section",
          text: `${form.fields.find((f) => f.id === r.field)?.label ?? r.field} · ${labels[r.op]}${r.value === undefined ? "" : ": " + String(r.value)}`,
          accessory: button("Edit condition", make(undefined, at)),
        });
    });
    blocks.push({
      type: "actions",
      elements: [
        ...(node.rules.length < 10
          ? [
              button("Add condition", make("add")),
              ...(path.length < 3
                ? [button("Add nested group", make("group"))]
                : []),
            ]
          : []),
        button("Remove this group", make("remove")),
      ],
    });
  } else leaf(node, path);
  return { blocks };
}
