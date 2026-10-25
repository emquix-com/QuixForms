import { z } from "zod";
import type { PluginContext } from "emdash/plugin";
import type { StorageCollection } from "emdash";
import { idSchema, type Form, type Values } from "@emquix/quixforms-engine";
import type { Entry } from "@emquix/quixforms-engine/submissions";
export type { Entry } from "@emquix/quixforms-engine/submissions";
export const entries = (c: PluginContext) =>
  c.storage.entries as StorageCollection<Entry>;
export const entryKey = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,63}_[0-9a-f-]{36}$/)
  .max(101);
export const entryQuery = z
  .object({
    id: idSchema,
    cursor: z.string().max(2000).optional(),
    status: z.enum(["all", "inbox", "spam", "trash"]).default("all"),
    starred: z.enum(["all", "yes"]).default("all"),
    reference: z
      .string()
      .max(101)
      .regex(/^[a-z0-9_-]*$/)
      .default(""),
  })
  .strict();
export async function listEntries(
  c: PluginContext,
  input: unknown,
  limit = 10,
) {
  const q = entryQuery.parse(input);
  return entries(c).query({
    where: {
      formId: q.id,
      ...(q.status !== "all" ? { status: q.status } : {}),
      ...(q.starred === "yes" ? { starred: true } : {}),
      ...(q.reference ? { reference: { startsWith: q.reference } } : {}),
    },
    orderBy: { createdAt: "desc" },
    limit,
    cursor: q.cursor,
  });
}
export const entryRead = z.object({ id: idSchema, key: entryKey }).strict();
export async function readEntry(c: PluginContext, input: unknown) {
  const q = entryRead.parse(input),
    row = await entries(c).getVersioned(q.key);
  return row?.value.formId === q.id ? row : null;
}
export const entryUpdate = z
  .object({
    id: idSchema,
    key: entryKey,
    revision: z.string().min(1).max(128),
    patch: z
      .object({
        status: z.enum(["inbox", "spam", "trash"]).optional(),
        read: z.boolean().optional(),
        starred: z.boolean().optional(),
      })
      .strict()
      .optional(),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .strict()
  .refine((q) => q.note !== undefined || Object.keys(q.patch ?? {}).length > 0);
export async function updateEntry(
  c: PluginContext,
  input: unknown,
  authorId: string,
) {
  const q = entryUpdate.parse(input),
    row = await readEntry(c, { id: q.id, key: q.key });
  if (!row) return { ok: false, error: "NOT_FOUND" };
  if (row.revision !== q.revision) return { ok: false, error: "CONFLICT" };
  const notes = row.value.notes ?? [];
  if (q.note && notes.length >= 50) return { ok: false, error: "NOTE_LIMIT" };
  const value = {
    status: "inbox" as const,
    read: false,
    starred: false,
    reference: q.key,
    ...row.value,
    ...q.patch,
    ...(q.note
      ? {
          notes: [
            ...notes,
            {
              id: crypto.randomUUID(),
              text: q.note,
              createdAt: new Date().toISOString(),
              authorId,
            },
          ],
        }
      : {}),
  };
  const result = await entries(c).compareAndSet(q.key, q.revision, value);
  return result.applied
    ? { ok: true, revision: result.revision }
    : { ok: false, error: "CONFLICT" };
}
export { entriesCsv } from "@emquix/quixforms-engine/submissions";
export async function eraseEntry(c: PluginContext, input: unknown) {
  const q = entryRead
      .extend({ revision: z.string().min(1).max(128) })
      .strict()
      .parse(input),
    row = await readEntry(c, { id: q.id, key: q.key });
  if (!row) return { ok: false, error: "NOT_FOUND" };
  if (row.value.status !== "trash")
    return { ok: false, error: "TRASH_REQUIRED" };
  const result = await entries(c).compareAndDelete(q.key, q.revision);
  return result.applied ? { ok: true } : { ok: false, error: "CONFLICT" };
}
