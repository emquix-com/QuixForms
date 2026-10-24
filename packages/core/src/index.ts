import { z } from "zod";
export const idSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,63}$/)
  .refine((s) => !["__proto__", "constructor", "prototype"].includes(s));
export const fieldTypes = [
  "text",
  "paragraph",
  "email",
  "name",
  "phone",
  "url",
  "number",
  "select",
  "radio",
  "checkboxes",
  "consent",
  "hidden",
  "content",
  "section",
  "page",
] as const;
export type Values = Record<string, string | number | boolean | string[]>;
export type Rule =
  | { op: "and" | "or"; rules: Rule[] }
  | {
      field: string;
      op:
        | "eq"
        | "ne"
        | "contains"
        | "notContains"
        | "gt"
        | "lt"
        | "empty"
        | "notEmpty"
        | "startsWith"
        | "endsWith"
        | "selected"
        | "notSelected";
      value?: string | number | boolean;
    };
const rule: z.ZodType<Rule> = z.lazy(() =>
  z.union([
    z
      .object({
        op: z.enum(["and", "or"]),
        rules: z.array(rule).min(1).max(10),
      })
      .strict(),
    z
      .object({
        field: idSchema,
        op: z.enum([
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
        ]),
        value: z
          .union([z.string().max(500), z.number().finite(), z.boolean()])
          .optional(),
      })
      .strict(),
  ]),
);
export const fieldSchema = z
  .object({
    id: idSchema,
    type: z.enum(fieldTypes),
    label: z.string().min(1).max(200),
    description: z.string().max(1000).default(""),
    placeholder: z.string().max(200).default(""),
    required: z.boolean().default(false),
    options: z.array(z.string().min(1).max(200)).max(100).default([]),
    width: z.enum(["full", "half", "third"]).default("full"),
    showWhen: rule.optional(),
    requiredWhen: rule.optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  })
  .strict();
export const formSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    title: z.string().min(1).max(200),
    status: z.enum(["draft", "published"]),
    fields: z.array(fieldSchema).max(100),
    confirmation: z.string().min(1).max(1000),
    notifications: z
      .array(
        z
          .object({
            to: z.email(),
            enabled: z.boolean().optional(),
            subject: z
              .string()
              .min(1)
              .max(200)
              .refine((s) => !/[\r\n]/.test(s)),
            when: rule.optional(),
          })
          .strict(),
      )
      .max(5)
      .default([]),
    appearance: z
      .enum(["minimal", "modern", "classic", "boxed"])
      .default("modern"),
  })
  .strict();
export type Form = z.infer<typeof formSchema>;
export type Field = Form["fields"][number];
export function dependencies(r?: Rule): string[] {
  return !r ? [] : "rules" in r ? r.rules.flatMap(dependencies) : [r.field];
}
export function parseForm(input: unknown): Form {
  // Bound work before recursive schema parsing.
  const serialized = JSON.stringify(input);
  if (!serialized || serialized.length > 100000)
    throw new Error("Definition too large");
  const walk = (v: unknown, d = 0): void => {
    if (d > 16) throw new Error("Definition too deep");
    if (v && typeof v === "object")
      Object.values(v).forEach((x) => walk(x, d + 1));
  };
  walk(input);
  const f = formSchema.parse(input);
  const ids = new Set(f.fields.map((x) => x.id));
  if (ids.size !== f.fields.length) throw new Error("Duplicate field ID");
  const parents = fieldParents(f);
  const graph = new Map(
    f.fields.map((x) => [
      x.id,
      [
        ...dependencies(x.showWhen),
        ...dependencies(x.requiredWhen),
        ...(parents.get(x.id) ?? []),
      ],
    ]),
  );
  const visited = new Set<string>();
  const visit = (id: string, path: Set<string>) => {
    if (visited.has(id)) return;
    if (path.has(id)) throw new Error("Circular condition");
    if (!ids.has(id)) throw new Error("Unknown field reference");
    for (const ref of graph.get(id) ?? []) visit(ref, new Set([...path, id]));
    visited.add(id);
  };
  f.fields.forEach((x) => visit(x.id, new Set()));
  f.notifications.forEach((n) =>
    dependencies(n.when).forEach((id) => {
      if (!ids.has(id)) throw new Error("Unknown notification reference");
    }),
  );
  for (const x of f.fields) {
    if (
      ["select", "radio", "checkboxes"].includes(x.type) &&
      (!x.options.length || new Set(x.options).size !== x.options.length)
    )
      throw new Error("Choices must be unique and nonempty");
    if (x.min !== undefined && x.max !== undefined && x.min > x.max)
      throw new Error("Invalid range");
  }
  return f;
}
export function evaluate(r: Rule | undefined, v: Values): boolean {
  if (!r) return true;
  if ("rules" in r)
    return r.op === "and"
      ? r.rules.every((x) => evaluate(x, v))
      : r.rules.some((x) => evaluate(x, v));
  const a = v[r.field],
    b = r.value,
    empty =
      a === undefined ||
      a === "" ||
      a === false ||
      (Array.isArray(a) && !a.length);
  switch (r.op) {
    case "empty":
      return empty;
    case "notEmpty":
      return !empty;
    case "eq":
      return a === b;
    case "ne":
      return a !== b;
    case "gt":
      return typeof a === "number" && typeof b === "number" && a > b;
    case "lt":
      return typeof a === "number" && typeof b === "number" && a < b;
    case "selected":
      return Array.isArray(a) && a.includes(String(b));
    case "notSelected":
      return Array.isArray(a) && !a.includes(String(b));
    case "contains":
      return typeof a === "string" && a.includes(String(b));
    case "notContains":
      return typeof a === "string" && !a.includes(String(b));
    case "startsWith":
      return typeof a === "string" && a.startsWith(String(b));
    case "endsWith":
      return typeof a === "string" && a.endsWith(String(b));
  }
}
/** Sections span until the next section/page; pages span until the next page. */
export function fieldParents(form: Form) {
  const parents = new Map<string, string[]>();
  let page: string | undefined, section: string | undefined;
  for (const f of form.fields) {
    if (f.type === "page") {
      parents.set(f.id, []);
      page = f.id;
      section = undefined;
    } else if (f.type === "section") {
      parents.set(f.id, page ? [page] : []);
      section = f.id;
    } else
      parents.set(f.id, [
        ...(page ? [page] : []),
        ...(section ? [section] : []),
      ]);
  }
  return parents;
}
export function visibility(form: Form, raw: Values) {
  const values: Values = {},
    visible = new Set<string>(),
    done = new Set<string>(),
    active = new Set<string>();
  const fields = new Map(form.fields.map((f) => [f.id, f])),
    parents = fieldParents(form);
  const resolve = (id: string): boolean => {
    if (done.has(id)) return visible.has(id);
    if (active.has(id)) return false;
    const f = fields.get(id);
    if (!f) return false;
    active.add(id);
    let valid = true;
    for (const dep of dependencies(f.showWhen)) {
      if (active.has(dep)) {
        valid = false;
        continue;
      }
      resolve(dep);
    }
    for (const parent of parents.get(id) ?? [])
      if (!resolve(parent)) valid = false;
    active.delete(id);
    done.add(id);
    if (valid && evaluate(f.showWhen, values)) {
      visible.add(id);
      if (
        !["section", "page", "content"].includes(f.type) &&
        Object.hasOwn(raw, id)
      )
        values[id] = raw[id];
    }
    return visible.has(id);
  };
  form.fields.forEach((f) => resolve(f.id));
  return { values, visible };
}
export function visibleValues(form: Form, raw: Values): Values {
  return visibility(form, raw).values;
}
export function validate(form: Form, input: unknown) {
  const parsed = z
    .record(
      z.string(),
      z.union([
        z.string().max(10000),
        z.number().finite(),
        z.boolean(),
        z.array(z.string().max(200)).max(100),
      ]),
    )
    .safeParse(input);
  if (!parsed.success)
    return { values: {} as Values, errors: { _form: "Invalid submission" } };
  const { values, visible } = visibility(form, parsed.data),
    errors: Record<string, string> = {};
  for (const f of form.fields) {
    if (!visible.has(f.id) || ["content", "section", "page"].includes(f.type)) {
      delete values[f.id];
      continue;
    }
    const v = values[f.id];
    const empty =
      v === undefined ||
      v === "" ||
      v === false ||
      (Array.isArray(v) && !v.length);
    if (empty) {
      if (f.required || (f.requiredWhen && evaluate(f.requiredWhen, values)))
        errors[f.id] = "This field is required";
      continue;
    }
    if (f.type === "number") {
      if (
        typeof v !== "number" ||
        (f.min !== undefined && v < f.min) ||
        (f.max !== undefined && v > f.max)
      )
        errors[f.id] = "Enter a number within the allowed range";
    } else if (f.type === "consent") {
      if (v !== true) errors[f.id] = "Consent must be checked";
    } else if (f.type === "checkboxes") {
      if (
        !Array.isArray(v) ||
        v.some((x) => !f.options.includes(x)) ||
        new Set(v).size !== v.length
      )
        errors[f.id] = "Choose valid options";
    } else if (typeof v !== "string") errors[f.id] = "Enter text";
    else if (f.type === "email" && !z.email().safeParse(v).success)
      errors[f.id] = "Enter a valid email";
    else if (f.type === "url") {
      try {
        if (!["http:", "https:"].includes(new URL(v).protocol)) throw 0;
      } catch {
        errors[f.id] = "Enter an HTTP or HTTPS URL";
      }
    } else if (["select", "radio"].includes(f.type) && !f.options.includes(v))
      errors[f.id] = "Choose a valid option";
  }
  return { values, errors };
}
export function csvCell(value: unknown) {
  let s = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  if (/^[\s]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function exportCsv(form: Form, rows: Values[]) {
  return [
    form.fields.map((x) => csvCell(x.label)).join(","),
    ...rows.map((r) => form.fields.map((f) => csvCell(r[f.id])).join(",")),
  ].join("\r\n");
}
export const registry = Object.fromEntries(
  fieldTypes.map((type) => [
    type,
    {
      type,
      create: (id: string) =>
        fieldSchema.parse({
          id,
          type,
          label: type === "page" ? "Next page" : type,
          options: ["select", "radio", "checkboxes"].includes(type)
            ? ["Option 1", "Option 2"]
            : [],
        }),
    },
  ]),
) as Record<
  (typeof fieldTypes)[number],
  { type: string; create: (id: string) => Field }
>;
export function template(id: string, title = "Contact us"): Form {
  return parseForm({
    schemaVersion: 1,
    id,
    title,
    status: "draft",
    fields: [
      { id: "name", type: "name", label: "Your name", required: true },
      { id: "email", type: "email", label: "Email address", required: true },
      {
        id: "message",
        type: "paragraph",
        label: "How can we help?",
        required: true,
      },
    ],
    confirmation: "Thank you. Your response has been received.",
  });
}
