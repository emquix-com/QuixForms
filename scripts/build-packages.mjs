import { build } from "tsdown";
import { fileURLToPath } from "node:url";
for (const [folder, entry] of [
  [
    "core",
    ["src/index.ts", "src/templates.ts", "src/submissions.ts", "src/schema.ts"],
  ],
  ["advanced-builder", ["src/index.ts"]],
]) {
  await build({
    cwd: fileURLToPath(new URL("../packages/" + folder + "/", import.meta.url)),
    entry,
    outDir: "dist",
    format: "esm",
    dts: false,
    clean: true,
    external: ["zod", "emdash", "emdash/plugin", "react", "react/jsx-runtime"],
    noExternal: ["zod/mini"],
    inlineOnly: false,
  });
}
