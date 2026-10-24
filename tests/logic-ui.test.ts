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
