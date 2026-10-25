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
it("bounds UTF-8 revision history below the host single-document limit", async () => {
  let record: any = null,
    revision = 0;
  const ctx = {
    storage: {
      forms: {
        getVersioned: async () =>
          record ? { value: record, revision: String(revision) } : null,
        compareAndSet: async (
          _id: string,
          _expected: string | null,
          data: unknown,
        ) => {
          record = data;
          return { applied: true, revision: String(++revision) };
        },
      },
    },
  } as unknown as PluginContext;
  const form = template("large");
  form.fields = Array.from({ length: 40 }, (_, i) => ({
    ...form.fields[0],
    id: "field_" + i,
    description: "界".repeat(800),
  }));
  for (let i = 0; i < 15; i++)
    expect(
      await save(ctx, {
        form: { ...form, title: "Revision " + i },
        revision: i ? String(i) : null,
      }),
    ).toMatchObject({ ok: true });
  expect(
    new TextEncoder().encode(JSON.stringify(record)).byteLength,
  ).toBeLessThanOrEqual(900 * 1024);
  expect(record.history.length).toBeGreaterThan(0);
  expect(record.history.length).toBeLessThan(10);
});
import { duplicateForm } from "../packages/sandboxed/src/plugin";
it("duplicates a saved form as a draft with preserved rules and fresh history, without touching entries", async () => {
  const source = template("source");
  source.status = "published";
  source.fields[2].showWhen = {
    op: "and",
    rules: [{ field: "name", op: "notEmpty" }],
  };
  source.notifications = [
    {
      to: "admin@example.com",
      subject: "New entry",
      when: { field: "email", op: "notEmpty" },
    },
  ];
  const original = {
    current: source,
    history: [template("source", "Older title")],
  };
  const rows = new Map([["source", original]]);
  const ctx = {
    storage: {
      forms: {
        getVersioned: async (id: string) =>
          rows.has(id) ? { value: rows.get(id), revision: "source-r" } : null,
        compareAndSet: async (
          id: string,
          revision: string | null,
          data: typeof original,
        ) => {
          if (rows.has(id) || revision !== null) return { applied: false };
          rows.set(id, data);
          return { applied: true, revision: "copy-r" };
        },
      },
    },
  } as unknown as PluginContext;
  expect(
    await duplicateForm(ctx, { id: "source", revision: "stale" }),
  ).toMatchObject({ ok: false, error: "CONFLICT" });
  expect(rows.size).toBe(1);
  const result = await duplicateForm(ctx, {
    id: "source",
    revision: "source-r",
  });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.id).not.toBe("source");
  const copy = rows.get(result.id)!;
  expect(copy.current.status).toBe("draft");
  expect(copy.current.title).toBe("Contact us (copy)");
  expect(copy.current.fields).toEqual(source.fields);
  expect(copy.current.notifications).toEqual(source.notifications);
  expect(copy.history).toEqual([]);
  expect(rows.get("source")).toEqual(original);
  expect(source.status).toBe("published");
});
