import { it, expect } from "vitest";
import { validateBlocks } from "@emdash-cms/blocks/server";
import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { admin } from "../packages/sandboxed/src/ui";
import { template, registry } from "../packages/core/src/index";
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
