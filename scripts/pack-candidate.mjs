import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve, dirname, join } from "node:path";
const npmCli = process.env.npm_execpath ?? join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
const target = resolve("artifacts");
mkdirSync(target, { recursive: true });
const files = [];
for (const name of [
  "core",
  "sandboxed",
  "astro",
  "advanced-builder",
  "installer",
]) {
  const result = JSON.parse(
    execFileSync(process.execPath, [npmCli, "pack", "--json", "--pack-destination", target], {
      cwd: "packages/" + name,
      encoding: "utf8",
    }),
  )[0];
  files.push({
    package: result.name,
    version: result.version,
    file: result.filename,
    sha256: createHash("sha256")
      .update(readFileSync(resolve(target, result.filename)))
      .digest("hex"),
  });
}
writeFileSync(
  resolve(target, "checksums.json"),
  JSON.stringify(files, null, 2) + "\n",
);
console.log(files);
