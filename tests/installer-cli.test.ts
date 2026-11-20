import { it, expect } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, delimiter } from "node:path";
import { spawnSync } from "node:child_process";
const cli = resolve("packages/installer/src/cli.mjs");
function fixture(fail = false) {
  const dir = mkdtempSync(join(tmpdir(), "qf-installer-"));
  mkdirSync(join(dir, "bin"));
  for (const [name, version] of [
    ["emdash", "1.3.1"],
    ["astro", "7.4.2"],
  ]) {
    const path = join(dir, "node_modules", name);
    mkdirSync(path, { recursive: true });
    writeFileSync(
      join(path, "package.json"),
      JSON.stringify({ name, version, main: "index.js" }),
    );
    writeFileSync(join(path, "index.js"), "");
  }
  const source =
    "import emdash from 'emdash/astro';\nexport default {integrations:[emdash({sandboxRunner:'official-runner'})]};\n";
  const manifest = JSON.stringify({ scripts: { build: "astro build" } });
  writeFileSync(join(dir, "package.json"), manifest);
  writeFileSync(join(dir, "astro.config.mjs"), source);
  writeFileSync(
    join(dir, "bin/npm"),
    `#!/bin/sh\nprintf changed > package-lock.json\n${fail ? "exit 1" : "exit 0"}\n`,
  );
  chmodSync(join(dir, "bin/npm"), 0o755);
  const npmStub = join(dir, "bin/npm.cjs");
  writeFileSync(npmStub, `require('node:fs').writeFileSync('package-lock.json', 'changed'); process.exit(${fail ? 1 : 0});`);
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [cli, ...args, "--project", dir], {
      encoding: "utf8",
      timeout: 10_000,
      env: {
        ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(path|npm_execpath)$/i.test(key))),
        PATH: join(dir, "bin") + delimiter + process.env.PATH,
        npm_execpath: npmStub,
      },
    });
  return {
    dir,
    source,
    manifest,
    run,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
it("dry run performs no command or writes", () => {
  const f = fixture();
  try {
    expect(f.run("install", "--with-core", "--dry-run").status).toBe(0);
    expect(readFileSync(join(f.dir, "astro.config.mjs"), "utf8")).toBe(
      f.source,
    );
    expect(existsSync(join(f.dir, ".quixforms"))).toBe(false);
    expect(existsSync(join(f.dir, "package-lock.json"))).toBe(false);
  } finally {
    f.cleanup();
  }
});
it("failed package installation restores files including absence of the original lockfile", () => {
  const f = fixture(true);
  try {
    expect(f.run("install", "--with-core").status).toBe(1);
    expect(readFileSync(join(f.dir, "astro.config.mjs"), "utf8")).toBe(
      f.source,
    );
    expect(readFileSync(join(f.dir, "package.json"), "utf8")).toBe(f.manifest);
    expect(existsSync(join(f.dir, "package-lock.json"))).toBe(false);
    expect(existsSync(join(f.dir, ".quixforms/installation.json"))).toBe(false);
  } finally {
    f.cleanup();
  }
});
it("successful managed config is idempotent and removal restores the original", () => {
  const f = fixture();
  try {
    expect(f.run("install", "--with-core").status).toBe(0);
    const after = readFileSync(join(f.dir, "astro.config.mjs"), "utf8");
    expect(f.run("install", "--with-core").status).toBe(0);
    expect(readFileSync(join(f.dir, "astro.config.mjs"), "utf8")).toBe(after);
    expect(f.run("remove").status).toBe(0);
    expect(readFileSync(join(f.dir, "astro.config.mjs"), "utf8")).toBe(
      f.source,
    );
  } finally {
    f.cleanup();
  }
});
it("removal refuses to replace subsequent custom changes", () => {
  const f = fixture();
  try {
    expect(f.run("install", "--with-core").status).toBe(0);
    const custom =
      readFileSync(join(f.dir, "astro.config.mjs"), "utf8") + "// customized\n";
    writeFileSync(join(f.dir, "astro.config.mjs"), custom);
    expect(f.run("remove").status).toBe(1);
    expect(readFileSync(join(f.dir, "astro.config.mjs"), "utf8")).toBe(custom);
  } finally {
    f.cleanup();
  }
});
