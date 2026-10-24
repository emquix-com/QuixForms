import type { SandboxedPlugin, PluginContext } from "emdash/plugin";
import type { StorageCollection } from "emdash";
import { z } from "zod";
import {
  parseForm,
  template,
  validate,
  evaluate,
  exportCsv,
  idSchema,
  type Form,
} from "../../core/src/index";
import { admin } from "./ui";
export type RecordForm = { current: Form; history: Form[] };
export const forms = (ctx: PluginContext) =>
  ctx.storage.forms as StorageCollection<RecordForm>;
export async function save(ctx: PluginContext, input: unknown) {
  const p = z
    .object({ form: z.unknown(), revision: z.string().max(128).nullable() })
    .strict()
    .parse(input);
  const form = parseForm(p.form);
  const old = await forms(ctx).getVersioned(form.id);
  if ((old?.revision ?? null) !== p.revision)
    return { ok: false as const, error: "CONFLICT" };
  const result = await forms(ctx).compareAndSet(form.id, p.revision, {
    current: form,
    history: [
      ...(old?.value.history ?? []),
      ...(old ? [old.value.current] : []),
    ].slice(-10),
  });
  return result.applied
    ? { ok: true as const, revision: result.revision }
    : { ok: false as const, error: "CONFLICT" };
}
const formId = z.object({ id: idSchema });
const listInput = z.object({
  id: idSchema,
  cursor: z.string().max(2000).optional(),
});
const plugin: SandboxedPlugin = {
  routes: {
    admin: { methods: ["POST"], permission: "plugins:manage", handler: admin },
    list: {
      methods: ["GET"],
      permission: "plugins:manage",
      handler: async (r, c) => {
        const p = z.object({ cursor: z.string().optional() }).parse(r.input);
        return forms(c).query({ limit: 20, cursor: p.cursor });
      },
    },
    read: {
      methods: ["GET", "POST"],
      permission: "plugins:manage",
      handler: async (r, c) => forms(c).getVersioned(formId.parse(r.input).id),
    },
    save: {
      methods: ["POST"],
      permission: "plugins:manage",
      request: { body: "json", maxBytes: 131072 },
      handler: async (r, c) => {
        try {
          return await save(c, r.input);
        } catch {
          return { ok: false, error: "INVALID_DEFINITION" };
        }
      },
    },
    definition: {
      methods: ["GET"],
      public: true,
      handler: async (r, c) => {
        const p = formId.safeParse(r.input);
        if (!p.success) return { ok: false };
        const data = await forms(c).get(p.data.id);
        if (data?.current.status !== "published") return { ok: false };
        const { notifications, ...form } = data.current;
        return {
          ok: true,
          form,
          siteKey: await c.settings.get("turnstileSiteKey"),
        };
      },
    },
    submit: {
      methods: ["POST"],
      public: true,
      request: { body: "json", maxBytes: 65536 },
      handler: async (r, c) => {
        const p = z
          .object({
            id: idSchema,
            values: z.unknown(),
            token: z.string().min(1).max(2048),
            key: z.string().uuid(),
            website: z.string().max(200).default(""),
          })
          .strict()
          .safeParse(r.input);
        if (!p.success || p.data.website)
          return { ok: false, error: "INVALID_SUBMISSION" };
        const x = p.data;
        const stored = await forms(c).get(x.id);
        if (stored?.current.status !== "published")
          return { ok: false, error: "UNAVAILABLE" };
        const form = stored.current;
        const checked = validate(form, x.values);
        if (Object.keys(checked.errors).length)
          return { ok: false, error: "VALIDATION", errors: checked.errors };
        const secret = await c.settings.get<string>("turnstileSecret");
        if (!secret || !c.http)
          return { ok: false, error: "PROTECTION_UNAVAILABLE" };
        try {
          const res = await c.http.fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                secret,
                response: x.token,
              }).toString(),
            },
          );
          const result = (await res.json()) as {
            success?: boolean;
            action?: string;
            hostname?: string;
          };
          if (
            !result.success ||
            result.action !== "quixforms" ||
            result.hostname !== new URL(r.request.url).hostname
          )
            return { ok: false, error: "BOT_CHECK" };
        } catch {
          return { ok: false, error: "BOT_CHECK" };
        }
        const key = x.id + "_" + x.key;
        const created = await c.storage.entries.compareAndSet(key, null, {
          formId: x.id,
          form,
          values: checked.values,
          createdAt: new Date().toISOString(),
          notification: "pending",
        });
        if (!created.applied)
          return { ok: true, reference: key, message: form.confirmation };
        let failed = false;
        for (const n of form.notifications) {
          if (!evaluate(n.when, checked.values)) continue;
          try {
            if (!c.email) throw 0;
            await c.email.send({
              to: n.to,
              subject: n.subject,
              text: form.fields
                .map((f) => `${f.label}: ${checked.values[f.id] ?? ""}`)
                .join("\n"),
            });
          } catch {
            failed = true;
          }
        }
        // A secondary status write must never turn an accepted entry into a failure.
        try {
          await c.storage.entries.updateIf(key, {
            where: { notification: "pending" },
            set: { notification: failed ? "failed" : "sent" },
          });
        } catch {}
        return { ok: true, reference: key, message: form.confirmation };
      },
    },
    entries: {
      methods: ["GET"],
      permission: "plugins:manage",
      handler: async (r, c) => {
        const p = listInput.parse(r.input);
        return c.storage.entries.query({
          where: { formId: p.id },
          orderBy: { createdAt: "desc" },
          limit: 20,
          cursor: p.cursor,
        });
      },
    },
    export: {
      methods: ["GET"],
      permission: "plugins:manage",
      handler: async (r, c) => {
        const p = listInput.parse(r.input);
        const f = await forms(c).get(p.id);
        if (!f) return { ok: false };
        const page = await c.storage.entries.query({
          where: { formId: p.id },
          orderBy: { createdAt: "desc" },
          limit: 100,
          cursor: p.cursor,
        });
        return {
          ok: true,
          csv: exportCsv(
            f.current,
            page.items.map(
              (x) =>
                (x.data as { values: Parameters<typeof exportCsv>[1][number] })
                  .values,
            ),
          ),
          cursor: page.cursor,
        };
      },
    },
  },
  mcp: {
    tools: {
      readForm: {
        description: "Read a form definition. Does not include submissions.",
        route: "read",
        input: formId,
        destructive: false,
      },
    },
  },
};
export default plugin;
