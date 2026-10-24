import { it, expect } from "vitest";
// @ts-expect-error JavaScript CLI module intentionally has no TS declaration.
import { transformConfig } from "../packages/installer/src/config.mjs";
const source = `import emdash from 'emdash/astro';\nimport {defineConfig} from 'astro/config';\nexport default defineConfig({site:'https://example.com', integrations:[emdash({sandboxRunner:'@emdash-cms/sandbox-workerd/sandbox',plugins:[existingPlugin()]})]});`;
it("adds Core and Advanced without replacing other settings and is idempotent", () => {
  const result = transformConfig(source, { withCore: true });
  expect(result).toContain("existingPlugin()");
  expect(result).toContain("site:");
  expect(result).toContain("quixFormsAdvanced()");
  expect(result).toContain("sandboxed:");
  expect(transformConfig(result, { withCore: true })).toBe(result);
});
it("can install only sandboxed Core", () => {
  const result = transformConfig(source, { coreOnly: true });
  expect(result).toContain("quixFormsCore");
  expect(result).not.toContain("quixFormsAdvanced");
});
it.each([
  source.replace("plugins:[existingPlugin()]", "plugins: configuredPlugins"),
  source.replace("plugins:[existingPlugin()]", "...defaults"),
  source.replace("sandboxRunner:'@emdash-cms/sandbox-workerd/sandbox',", ""),
])("rejects unsafe or unsupported configuration", (source) =>
  expect(() => transformConfig(source, { withCore: true })).toThrow(),
);
