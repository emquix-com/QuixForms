import { it, expect } from "vitest";
import { save } from "../packages/sandboxed/src/plugin";
import { template } from "../packages/core/src/index";
import type { PluginContext } from "emdash/plugin";
it("atomic storage rejects competing edits and retains revisions", async () => {
  let record: unknown = null,
    revision = 0;
  const ctx = {
    storage: {
      forms: {
        getVersioned: async () =>
          record ? { value: record, revision: String(revision) } : null,
        compareAndSet: async (
          _id: string,
          expected: string | null,
          data: unknown,
        ) => {
          if (expected !== (record ? String(revision) : null))
            return { applied: false };
          record = data;
          return { applied: true, revision: String(++revision) };
        },
      },
    },
  } as unknown as PluginContext;
  const form = template("contact");
  const initial = await save(ctx, { form, revision: null });
  expect(initial.ok).toBe(true);
  const results = await Promise.all([
    save(ctx, { form: { ...form, title: "First" }, revision: "1" }),
    save(ctx, { form: { ...form, title: "Second" }, revision: "1" }),
  ]);
  expect(results.filter((r) => r.ok)).toHaveLength(1);
  expect(record).toMatchObject({ history: [form] });
});
