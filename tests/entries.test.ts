import { it, expect } from "vitest";
import {
  entriesCsv,
  entryUpdate,
  updateEntry,
  type Entry,
} from "../packages/sandboxed/src/entries";
import { inbox, entryDetail } from "../packages/sandboxed/src/entries-ui";
import { template } from "../packages/core/src/index";
import type { PluginContext } from "emdash/plugin";
import { validateBlocks } from "@emdash-cms/blocks/server";
const key = "contact_00000000-0000-4000-8000-000000000000";
const record: Entry = {
  formId: "contact",
  form: template("contact"),
  values: { name: "=danger", email: "a@example.com", message: "Hello" },
  createdAt: "2026-10-24T00:00:00Z",
  notification: "sent",
  status: "inbox",
};
function context() {
  let value = structuredClone(record),
    revision = "1";
  return {
    storage: {
      entries: {
        getVersioned: async () => ({ value, revision }),
        query: async () => ({
          items: [{ id: key, data: value }],
          hasMore: false,
        }),
        compareAndSet: async (_key: string, expected: string, next: Entry) => {
          if (revision !== expected) return { applied: false };
          value = next;
          revision = String(Number(revision) + 1);
          return { applied: true, revision };
        },
      },
    },
  } as unknown as PluginContext;
}
it("retains snapshot fields and neutralizes CSV formulas", () => {
  const csv = entriesCsv([{ id: key, data: record }]);
  expect(csv).toContain("Your name [name]");
  expect(csv).toContain("'=danger");
});
it("restricts update fields and rejects cross-form access and stale revisions", async () => {
  expect(() =>
    entryUpdate.parse({
      id: "contact",
      key,
      revision: "1",
      patch: { formId: "other" },
    }),
  ).toThrow();
  const ctx = context();
  expect(
    await updateEntry(
      ctx,
      { id: "other", key, revision: "1", patch: { read: true } },
      "admin",
    ),
  ).toMatchObject({ error: "NOT_FOUND" });
  expect(
    await updateEntry(
      ctx,
      { id: "contact", key, revision: "1", note: "Internal" },
      "admin",
    ),
  ).toMatchObject({ ok: true });
  expect(
    await updateEntry(
      ctx,
      { id: "contact", key, revision: "1", patch: { status: "trash" } },
      "admin",
    ),
  ).toMatchObject({ error: "CONFLICT" });
});
it("renders valid inbox and bounded entry details", async () => {
  for (const result of [
    await inbox(context(), "contact"),
    await entryDetail(context(), "contact", key),
  ]) {
    expect(validateBlocks(result.blocks)).toEqual({ valid: true, errors: [] });
    expect(JSON.stringify(result).length).toBeLessThan(256 * 1024);
  }
});
