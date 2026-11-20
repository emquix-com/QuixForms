import * as z from "@emquix/quixforms-engine/schema";
import type { PluginContext } from "emdash/plugin";
import type { StorageCollection } from "emdash";
import { idSchema, type Form, type Values } from "@emquix/quixforms-engine";
import type { Entry } from "@emquix/quixforms-engine/submissions";
export type { Entry } from "@emquix/quixforms-engine/submissions";
export const entries = (c: PluginContext) =>
  c.storage.entries as StorageCollection<Entry>;
export const entryKey = z
  .string()
  .check(z.regex(/^[a-z][a-z0-9_]{0,63}_[0-9a-f-]{36}$/))
  .check(z.maxLength(101));
export const entryQuery = z.strictObject({
  id: idSchema,
  cursor: z.optional(z.string().check(z.maxLength(2000))),
  status: z._default(z.enum(["all", "inbox", "spam", "trash"]), "all"),
  starred: z._default(z.enum(["all", "yes"]), "all"),
  reference: z._default(
    z
      .string()
      .check(z.maxLength(101))
      .check(z.regex(/^[a-z0-9_-]*$/)),
    "",
  ),
});
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
export const entryRead = z.strictObject({ id: idSchema, key: entryKey });
export async function readEntry(c: PluginContext, input: unknown) {
  const q = entryRead.parse(input),
    row = await entries(c).getVersioned(q.key);
  return row?.value.formId === q.id ? row : null;
}
export const entryUpdate = z
  .strictObject({
    id: idSchema,
    key: entryKey,
    revision: z.string().check(z.minLength(1)).check(z.maxLength(128)),
    patch: z.optional(
      z.strictObject({
        status: z.optional(z.enum(["inbox", "spam", "trash"])),
        read: z.optional(z.boolean()),
        starred: z.optional(z.boolean()),
      }),
    ),
    note: z.optional(
      z.string().check(z.trim()).check(z.minLength(1)).check(z.maxLength(2000)),
    ),
  })
  .check(
    z.refine(
      (q) => q.note !== undefined || Object.keys(q.patch ?? {}).length > 0,
    ),
  );
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
  const q = z
      .strictObject(
        z.extend(entryRead, {
          revision: z.string().check(z.minLength(1)).check(z.maxLength(128)),
        }).shape,
      )
      .parse(input),
    row = await readEntry(c, { id: q.id, key: q.key });
  if (!row) return { ok: false, error: "NOT_FOUND" };
  if (row.value.status !== "trash")
    return { ok: false, error: "TRASH_REQUIRED" };
  const result = await entries(c).compareAndDelete(q.key, q.revision);
  return result.applied ? { ok: true } : { ok: false, error: "CONFLICT" };
}
