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
} from "@emquix/quixforms-engine";
import { eraseEntry } from "./entries";
import { admin } from "./ui";
import { digest, allowSubmission } from "./abuse";
import type { Entry } from "./entries";
import { listEntries, readEntry, updateEntry, entriesCsv } from "./entries";
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
  const history = [
    ...(old?.value.history ?? []),
    ...(old ? [old.value.current] : []),
  ].slice(-10);
  // Host conditional writes cap the complete document at 1 MiB, including history.
  while (
    history.length &&
    new TextEncoder().encode(JSON.stringify({ current: form, history }))
      .byteLength >
      900 * 1024
  )
    history.shift();
  const result = await forms(ctx).compareAndSet(form.id, p.revision, {
    current: form,
    history,
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
    "revisions/restore": {
      methods: ["POST"],
      permission: "plugins:manage",
      handler: async (r, c) => {
        const q = z
          .object({
            id: idSchema,
            revision: z.string().min(1).max(128),
            index: z.number().int().min(0).max(9),
          })
          .strict()
          .parse(r.input);
        const row = await forms(c).getVersioned(q.id);
        if (!row || row.revision !== q.revision)
          return { ok: false, error: "CONFLICT" };
        const snapshot = row.value.history[q.index];
        if (!snapshot) return { ok: false, error: "NOT_FOUND" };
        return save(c, {
          form: { ...snapshot, status: "draft" },
          revision: q.revision,
        });
      },
    },
    "entries/erase": {
      methods: ["POST"],
      permission: "plugins:manage",
      handler: async (r, c) => {
        try {
          return await eraseEntry(c, r.input);
        } catch {
          return { ok: false, error: "INVALID_REQUEST" };
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
        if (
          !(await allowSubmission(
            c,
            x.id,
            z
              .object({ ip: z.string().nullable().optional() })
              .passthrough()
              .safeParse(r.requestMeta).data?.ip ?? null,
          ))
        )
          return { ok: false, error: "RATE_LIMIT" };
        const form = stored.current;
        const checked = validate(form, x.values);
        if (Object.keys(checked.errors).length)
          return { ok: false, error: "VALIDATION", errors: checked.errors };
        const key = x.id + "_" + x.key;
        const fingerprint = await digest(
          JSON.stringify(
            Object.fromEntries(
              Object.entries(checked.values).sort(([a], [b]) =>
                a.localeCompare(b),
              ),
            ),
          ),
        );
        const existing = (await c.storage.entries.get(key)) as Entry | null;
        if (existing)
          return existing.fingerprint === fingerprint
            ? { ok: true, reference: key, message: existing.form.confirmation }
            : { ok: false, error: "IDEMPOTENCY_CONFLICT" };
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
        const created = await c.storage.entries.compareAndSet(key, null, {
          fingerprint,
          formId: x.id,
          form,
          values: checked.values,
          createdAt: new Date().toISOString(),
          notification: "pending",
          status: "inbox",
          read: false,
          starred: false,
          reference: key,
          notes: [],
        });
        if (!created.applied) {
          const winner = (await c.storage.entries.get(key)) as Entry | null;
          return winner?.fingerprint === fingerprint
            ? { ok: true, reference: key, message: winner.form.confirmation }
            : { ok: false, error: "IDEMPOTENCY_CONFLICT" };
        }
        let failed = false,
          attempted = 0;
        for (const n of form.notifications) {
          if (n.enabled === false || !evaluate(n.when, checked.values))
            continue;
          attempted++;
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
            set: {
              notification: failed ? "failed" : attempted ? "sent" : "skipped",
            },
          });
        } catch {}
        return { ok: true, reference: key, message: form.confirmation };
      },
    },
    entries: {
      methods: ["GET"],
      permission: "plugins:manage",
      handler: (r, c) => listEntries(c, r.input),
    },
    "entries/read": {
      methods: ["GET"],
      permission: "plugins:manage",
      handler: (r, c) => readEntry(c, r.input),
    },
    "entries/update": {
      methods: ["POST"],
      permission: "plugins:manage",
      request: { body: "json", maxBytes: 8192 },
      handler: async (r, c) => {
        try {
          return await updateEntry(c, r.input, r.user?.id ?? "machine");
        } catch {
          return { ok: false, error: "INVALID_UPDATE" };
        }
      },
    },
    export: {
      methods: ["GET"],
      permission: "plugins:manage",
      handler: async (r, c) => {
        const page = await listEntries(c, r.input, 10);
        return {
          ok: true,
          csv: entriesCsv(page.items),
          json: page.items,
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
