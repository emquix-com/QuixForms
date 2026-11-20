import { it, expect } from "vitest";
import { validateBlocks } from "@emdash-cms/blocks/server";
import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { admin } from "../packages/sandboxed/src/ui";
import { template, registry } from "../packages/core/src/index";
import type { Block, BlockResponse, FormBlock } from "@emdash-cms/blocks";
function nestedForms(blocks: Block[]): FormBlock[] {
  return blocks.flatMap((block) =>
    block.type === "form"
      ? [block]
      : block.type === "columns"
        ? block.columns.flatMap(nestedForms)
        : block.type === "tab"
          ? block.panels.flatMap((panel) => nestedForms(panel.blocks))
          : block.type === "accordion"
            ? nestedForms(block.blocks)
            : [],
  );
}
it("validates overview and bounded 100-field editor with official Block Kit validator", async () => {
  const form = template("large");
  form.fields = Array.from({ length: 100 }, (_, i) =>
    registry.text.create("field_" + i),
  );
  const ctx = {
    storage: {
      forms: {
        query: async () => ({
          items: [{ id: "large", data: { current: form } }],
          hasMore: false,
        }),
        getVersioned: async () => ({
          value: { current: form, history: [] },
          revision: "rev",
        }),
      },
    },
  } as unknown as PluginContext;
  for (const input of [
    { type: "page_load", page: "/forms" },
    { type: "block_action", action_id: "open:large" },
  ]) {
    const result = (await admin({ input } as SandboxedRouteContext, ctx)) as {
      blocks: unknown[];
    };
    expect(validateBlocks(result.blocks)).toEqual({ valid: true, errors: [] });
    expect(JSON.stringify(result).length).toBeLessThan(256 * 1024);
    expect(result.blocks.length).toBeLessThan(30);
  }
});
it("reduces page size for large Unicode choice configurations", async () => {
  const form = template("large");
  form.fields = Array.from({ length: 4 }, (_, i) => ({
    ...registry.select.create("field_" + i),
    options: Array.from(
      { length: 100 },
      (_, j) => String(j) + "界".repeat(190),
    ),
  }));
  const ctx = {
    storage: {
      forms: {
        getVersioned: async () => ({
          value: { current: form, history: [] },
          revision: "rev",
        }),
      },
    },
  } as unknown as PluginContext;
  const result = (await admin(
    {
      input: { type: "block_action", action_id: "open:large" },
    } as SandboxedRouteContext,
    ctx,
  )) as { blocks: unknown[] };
  expect(validateBlocks(result.blocks)).toEqual({ valid: true, errors: [] });
  expect(
    new TextEncoder().encode(JSON.stringify(result)).byteLength,
  ).toBeLessThan(256 * 1024);
});
it("gives Block Kit forms stable identity and refreshes state only when their saved fields change", async () => {
  let form = template("identity"),
    revision = "1";
  const ctx = {
    storage: {
      forms: {
        getVersioned: async () => ({
          value: { current: form, history: [] },
          revision,
        }),
      },
    },
  } as unknown as PluginContext;
  const render = async () =>
    (await admin(
      {
        input: { type: "block_action", action_id: "open:identity" },
      } as SandboxedRouteContext,
      ctx,
    )) as BlockResponse;
  const original = await render();
  revision = "2";
  const unchanged = await render();
  expect(unchanged.blocks.map((b) => b.block_id)).toEqual(
    original.blocks.map((b) => b.block_id),
  );
  form = {
    ...form,
    fields: form.fields.map((f, i) =>
      i === 0 ? { ...f, label: "Changed saved label" } : f,
    ),
  };
  const changed = await render();
  const before = nestedForms(original.blocks),
    after = nestedForms(changed.blocks);
  const selectedForm = (rows: FormBlock[]) =>
    rows.find((block) => block.block_id?.startsWith("field:identity:name:"))!;
  const addForm = (rows: FormBlock[]) =>
    rows.find((block) => block.block_id?.startsWith("add-field:identity:"))!;
  expect(selectedForm(after).block_id).not.toBe(selectedForm(before).block_id);
  expect(addForm(after).block_id).toBe(addForm(before).block_id);
  expect(new Set(after.map((b) => b.block_id)).size).toBe(after.length);
});
