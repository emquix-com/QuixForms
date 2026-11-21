import {
  mkdtempSync,
  mkdirSync,
  cpSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, basename } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const stage = mkdtempSync(join(tmpdir(), "quixforms-kit-"));
const root = join(stage, "quixforms-0.1.2-manual-test");
try {
  mkdirSync(join(root, "artifacts"), { recursive: true });
  const artifacts = JSON.parse(
    readFileSync("artifacts/checksums.json", "utf8"),
  );
  for (const item of artifacts)
    cpSync(join("artifacts", item.file), join(root, "artifacts", item.file));
  const bundle = "quixforms-0.1.2.tar.gz";
  cpSync(join("artifacts", bundle), join(root, "artifacts", bundle));
  artifacts.push({
    package: "@emquix.com/quixforms (registry bundle)",
    version: "0.1.2",
    file: bundle,
    sha256: createHash("sha256")
      .update(readFileSync(join("artifacts", bundle)))
      .digest("hex"),
  });
  writeFileSync(
    join(root, "artifacts/checksums.json"),
    JSON.stringify(artifacts, null, 2) + "\n",
  );
  for (const file of ["README.md", "LICENSE", "SECURITY.md", "CHANGELOG.md"])
    cpSync(file, join(root, file));
  cpSync("docs", join(root, "docs"), { recursive: true });
  cpSync("examples/node-test-site", join(root, "examples/node-test-site"), {
    recursive: true,
    filter: (path) =>
      !["node_modules", "uploads", "dist", ".astro"].includes(basename(path)) && !basename(path).startsWith("data.db") && !basename(path).startsWith(".env"),
  });
  cpSync(
    "examples/companion-page.astro",
    join(root, "examples/companion-page.astro"),
  );
  writeFileSync(
    join(root, "BUILD-INFO.json"),
    JSON.stringify(
      {
        version: "0.1.2",
        stage: "manual acceptance artifact; see release report for registry status",
        commit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        dirty: !!execFileSync("git", ["status", "--porcelain"], {
          encoding: "utf8",
        }).trim(),
        builtAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  const destination = resolve("artifacts/quixforms-0.1.2-manual-test.tar.gz");
  execFileSync("tar", [
    "-czf",
    destination,
    "-C",
    stage,
    "quixforms-0.1.2-manual-test",
  ]);
  console.log(destination);
  console.log(
    "SHA-256 " +
      createHash("sha256").update(readFileSync(destination)).digest("hex"),
  );
} finally {
  rmSync(stage, { recursive: true, force: true });
}
