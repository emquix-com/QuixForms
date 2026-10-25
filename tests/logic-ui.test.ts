import { it, expect } from "vitest";
import { validateBlocks } from "@emdash-cms/blocks/server";
import type { PluginContext } from "emdash/plugin";
import { template } from "../packages/core/src/index";
import { logicAction } from "../packages/sandboxed/src/logic-ui";
it("renders nested rule controls and preserves the other condition mode on save", async () => {
  const form = template("contact");
  form.fields[2].showWhen = {
    op: "and",
    rules: [
      { field: "name", op: "notEmpty" },
      {
        op: "or",
        rules: [{ field: "email", op: "contains", value: "example" }],
      },
    ],
  };
  form.fields[2].requiredWhen = { field: "name", op: "eq", value: "Alice" };
  let record = { current: form, history: [] as (typeof form)[] };
  let rev = "1";
  const ctx = {
    storage: {
      forms: {
        getVersioned: async () => ({ value: record, revision: rev }),
        compareAndSet: async (
          _id: string,
          expected: string,
          data: typeof record,
        ) => {
          if (expected !== rev) return { applied: false };
          record = data;
          rev = String(Number(rev) + 1);
          return { applied: true, revision: rev };
        },
      },
    },
  } as unknown as PluginContext;
  const ui = await logicAction(ctx, "logicview:contact:1:message:showWhen", {});
  expect(validateBlocks(ui.blocks)).toEqual({ valid: true, errors: [] });
  const saved = await logicAction(
    ctx,
    "logicupdate:contact:1:message:showWhen.0:leaf",
    { source: "name", operator: "eq", value: "Bob" },
  );
  expect(validateBlocks(saved.blocks).valid).toBe(true);
  expect(record.current.fields[2].requiredWhen).toEqual(
    form.fields[2].requiredWhen,
  );
  expect(record.current.fields[2].showWhen).toMatchObject({
    rules: [{ value: "Bob" }, { op: "or" }],
  });
});
it("edits notification conditions without changing field rules or another notification", async () => {
  const form = template("contact");
  form.fields[2].showWhen = { field: "name", op: "notEmpty" };
  form.notifications = [
    { to: "support@example.com", subject: "Support" },
    { to: "archive@example.com", subject: "Archive", enabled: false },
  ];
  let value = { current: form, history: [] as (typeof form)[] },
    revision = "1";
  const ctx = {
    storage: {
      forms: {
        getVersioned: async () => ({ value, revision }),
        compareAndSet: async (
          _id: string,
          expected: string,
          next: typeof value,
        ) => {
          if (revision !== expected) return { applied: false };
          value = next;
          revision = String(Number(revision) + 1);
          return { applied: true, revision };
        },
      },
    },
  } as unknown as PluginContext;
  const created = await logicAction(
    ctx,
    "logicupdate:contact:1:n_0:when:create",
    {},
  );
  expect(validateBlocks(created.blocks).valid).toBe(true);
  const edited = await logicAction(
    ctx,
    "logicupdate:contact:2:n_0:when.0:leaf",
    { source: "email", operator: "contains", value: "@example.com" },
  );
  expect(validateBlocks(edited.blocks).valid).toBe(true);
  expect(value.current.notifications[0].when).toEqual({
    op: "and",
    rules: [{ field: "email", op: "contains", value: "@example.com" }],
  });
  expect(value.current.fields).toEqual(form.fields);
  expect(value.current.notifications[1]).toEqual(form.notifications[1]);
  const stale = await logicAction(
    ctx,
    "logicupdate:contact:2:n_0:when:remove",
    {},
  );
  expect(JSON.stringify(stale)).toContain("Another editor");
  expect(value.current.notifications[0].when).toBeDefined();
  await logicAction(ctx, "logicupdate:contact:3:n_0:when:remove", {});
  expect(value.current.notifications[0].when).toBeUndefined();
});
it("keeps large Unicode rule groups within Block Kit limits by editing one condition at a time", async () => {
  const form = template("large");
  form.fields = Array.from({ length: 100 }, (_, i) => ({
    ...form.fields[0],
    id: "field_" + i,
    label: "界".repeat(200),
  }));
  form.fields[99].showWhen = {
    op: "and",
    rules: Array.from({ length: 10 }, (_, i) => ({
      field: "field_" + i,
      op: "notEmpty" as const,
    })),
  };
  const ctx = {
    storage: {
      forms: {
        getVersioned: async () => ({
          value: { current: form, history: [] },
          revision: "1",
        }),
      },
    },
  } as unknown as PluginContext;
  for (const location of ["showWhen", "showWhen.0"]) {
    const response = await logicAction(
      ctx,
      "logicview:large:1:field_99:" + location,
      {},
    );
    expect(validateBlocks(response.blocks)).toEqual({
      valid: true,
      errors: [],
    });
    expect(
      new TextEncoder().encode(JSON.stringify(response)).byteLength,
    ).toBeLessThan(256 * 1024);
  }
});
