#!/usr/bin/env node
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  unlinkSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { transformConfig } from "./config.mjs";
const args = process.argv.slice(2),
  command = args[0] ?? "help";
const flag = (name) => args.includes(name),
  value = (name) => {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args[i + 1];
  };
const root = resolve(value("--project") ?? "."),
  stateDir = join(root, ".quixforms"),
  stateFile = join(stateDir, "installation.json");
const hash = (s) => createHash("sha256").update(s).digest("hex");
function read(path) {
  return readFileSync(path, "utf8");
}
function run(binary, parameters) {
  execFileSync(binary, parameters, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
}
try {
  if (!["install", "remove", "doctor"].includes(command)) {
    console.log(
      "QuixForms installer\n  install [--project DIR] [--artifacts DIR] [--with-core | --core-only] [--dry-run]\n  remove [--project DIR] [--dry-run]\n  doctor [--project DIR]\nRequires EmDash 1.3.1 and Astro 7.4.2 or later in major 7. Does not publish or deploy.",
    );
    process.exit(0);
  }
  if (command === "remove") {
    if (!existsSync(stateFile))
      throw new Error("No QuixForms installation record found.");
    const state = JSON.parse(read(stateFile)),
      config = join(root, state.config);
    if (hash(read(config)) !== state.afterHash)
      throw new Error(
        "Configuration changed after installation. Restore only the QuixForms declarations manually; backup: " +
          join(stateDir, "astro.config.before"),
      );
    if (flag("--dry-run")) {
      console.log(
        "Would restore " +
          config +
          " from the saved configuration backup. Installed dependencies and all Core data remain.",
      );
      process.exit(0);
    }
    writeFileSync(config, read(join(stateDir, "astro.config.before")));
    unlinkSync(stateFile);
    console.log(
      "Configuration restored. Dependencies and Core data were retained. Rebuild and redeploy; use your package manager to remove unused packages.",
    );
    process.exit(0);
  }
  const manifestPath = join(root, "package.json");
  if (!existsSync(manifestPath))
    throw new Error("No package.json found. Run inside an EmDash project.");
  const pkg = JSON.parse(read(manifestPath));
  const require = createRequire(manifestPath);
  function installed(name) {
    let dir = dirname(require.resolve(name));
    for (let i = 0; i < 8; i++) {
      const path = join(dir, "package.json");
      if (existsSync(path)) {
        const metadata = JSON.parse(read(path));
        if (metadata.name === name) return metadata;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    throw new Error("Package not found: " + name);
  }
  let emdash;
  try {
    emdash = installed("emdash");
  } catch {
    throw new Error(
      "EmDash is not installed. Install the project dependencies first.",
    );
  }
  if (emdash.version !== "1.3.1")
    throw new Error(
      "This candidate targets EmDash 1.3.1; found " +
        emdash.version +
        ". No changes made.",
    );
  const astro = installed("astro");
  if (
    !/^7\./.test(astro.version) ||
    astro.version.split(".").slice(1).map(Number).some(Number.isNaN) ||
    Number(astro.version.split(".")[1]) < 4 ||
    (Number(astro.version.split(".")[1]) === 4 &&
      Number(astro.version.split(".")[2]) < 2)
  )
    throw new Error(
      "This candidate requires Astro 7.4.2 or later in major 7. Found " +
        astro.version,
    );
  const configs = [
    "astro.config.mjs",
    "astro.config.ts",
    "astro.config.js",
  ].filter((p) => existsSync(join(root, p)));
  if (configs.length !== 1)
    throw new Error(
      "Expected exactly one Astro config; use manual installation.",
    );
  if (command === "doctor") {
    console.log(
      JSON.stringify(
        {
          project: root,
          emdash: emdash.version,
          astro: astro.version,
          config: configs[0],
          managedInstallation: existsSync(stateFile),
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }
  if (existsSync(stateFile)) {
    const state = JSON.parse(read(stateFile));
    if (hash(read(join(root, state.config))) !== state.afterHash)
      throw new Error(
        "An installation exists but its configuration changed. Review the saved backup before upgrading.",
      );
    console.log(
      "QuixForms configuration is already installed. No files changed.",
    );
    process.exit(0);
  }
  if (
    existsSync(join(root, "yarn.lock")) ||
    existsSync(join(root, "bun.lock")) ||
    existsSync(join(root, "bun.lockb"))
  )
    throw new Error(
      "Automatic installation currently supports npm or pnpm. Use the manual guide for this package manager.",
    );
  const manager = existsSync(join(root, "pnpm-lock.yaml")) ? "pnpm" : "npm";
  if (manager === "pnpm" && existsSync(join(root, "package-lock.json")))
    throw new Error(
      "Multiple package-manager lockfiles found. Resolve this before installation.",
    );
  const original = read(join(root, configs[0])),
    coreOnly = flag("--core-only"),
    withCore = flag("--with-core") || coreOnly;
  const next = transformConfig(original, { withCore, coreOnly });
  const wanted = coreOnly
    ? ["@emquix/quixforms-engine", "@emquix/quixforms-core-plugin"]
    : [
        "@emquix/quixforms-engine",
        "@emquix/quixforms-astro",
        "@emquix/quixforms-advanced",
        ...(withCore ? ["@emquix/quixforms-core-plugin"] : []),
      ];
  let specs = wanted.map((n) => n + "@0.1.0");
  const artifactDir = value("--artifacts");
  if (artifactDir) {
    const dir = resolve(artifactDir),
      artifacts = JSON.parse(read(join(dir, "checksums.json")));
    specs = wanted.map((name) => {
      const item = artifacts.find(
        (a) => a.package === name && a.version === "0.1.0",
      );
      if (!item || item.file.includes("/") || item.file.includes("\\"))
        throw new Error("Missing or unsafe artifact for " + name);
      const path = join(dir, item.file);
      if (hash(readFileSync(path)) !== item.sha256)
        throw new Error("Checksum mismatch for " + name);
      return path;
    });
  }
  if (!pkg.scripts?.build)
    throw new Error(
      "A package.json build script is required to verify installation.",
    );
  console.log(
    "Package manager: " +
      manager +
      "\nPackages: " +
      wanted.join(", ") +
      "\nConfiguration preview:\n" +
      next,
  );
  if (flag("--dry-run")) {
    console.log("Dry run: no files modified and no commands executed.");
    process.exit(0);
  }
  mkdirSync(stateDir, { recursive: true });
  const tracked = [
    configs[0],
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ];
  const before = new Map(
    tracked.map((p) => [
      p,
      existsSync(join(root, p)) ? readFileSync(join(root, p)) : null,
    ]),
  );
  for (const [name, data] of before)
    if (data)
      writeFileSync(
        join(stateDir, name.replaceAll("/", "_") + ".before"),
        data,
      );
  writeFileSync(join(stateDir, "astro.config.before"), original);
  try {
    run(
      manager,
      manager === "npm"
        ? ["install", "--save-exact", ...specs]
        : ["add", "--save-exact", ...specs],
    );
    writeFileSync(join(root, configs[0]), next);
    run(manager, ["run", "build"]);
    writeFileSync(
      stateFile,
      JSON.stringify(
        {
          version: 1,
          config: configs[0],
          afterHash: hash(next),
          packages: wanted,
          manager,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    for (const [name, data] of before) {
      if (data) writeFileSync(join(root, name), data);
      else if (existsSync(join(root, name))) unlinkSync(join(root, name));
    }
    throw new Error(
      "Installation/build failed. Configuration and manifests restored. node_modules may have changed; rerun your package manager install. " +
        error.message,
    );
  }
  console.log(
    "QuixForms installed and build verified. Configure Core Turnstile/email settings, add the Astro Form component to your theme, then redeploy. No deployment was performed.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
