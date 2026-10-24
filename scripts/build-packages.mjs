import { build } from "tsdown";
for (const [folder, entry] of [
  ["core", ["src/index.ts", "src/templates.ts", "src/submissions.ts"]],
  ["advanced-builder", ["src/index.ts"]],
]) {
  await build({
    cwd: new URL("../packages/" + folder + "/", import.meta.url).pathname,
    entry,
    outDir: "dist",
    format: "esm",
    dts: false,
    clean: true,
    external: ["zod", "emdash", "emdash/plugin", "react", "react/jsx-runtime"],
  });
}
