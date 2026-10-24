import { it, expect } from "vitest";
import { allowSubmission } from "../packages/sandboxed/src/abuse";
import type { PluginContext } from "emdash/plugin";
it("limits parallel attempts atomically without storing IP addresses and resets each minute", async () => {
  let value: unknown = null,
    revision = 0;
  const ctx = {
    kv: {
      getVersioned: async () =>
        value ? { value, revision: String(revision) } : null,
      compareAndSet: async (
        _key: string,
        expected: string | null,
        next: unknown,
      ) => {
        if (expected !== (value ? String(revision) : null))
          return { applied: false };
        value = next;
        return { applied: true, revision: String(++revision) };
      },
    },
  } as unknown as PluginContext;
  const results = [];
  for (let i = 0; i < 25; i++)
    results.push(await allowSubmission(ctx, "contact", "192.0.2.1", 60000));
  expect(results.filter(Boolean)).toHaveLength(20);
  expect(JSON.stringify(value)).not.toContain("192.0.2.1");
  expect(await allowSubmission(ctx, "contact", "192.0.2.1", 120000)).toBe(true);
});
