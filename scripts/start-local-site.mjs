import { existsSync, copyFileSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { parseEnv } from "node:util";

const site = new URL("../.local/site/", import.meta.url);
if (!existsSync(new URL("dist/server/entry.mjs", site))) {
  throw new Error("Local site is not built. Follow docs/manual-testing.md (Windows local checkout).");
}
// EmDash's pinned Node runner expects an executable here, while workerd's
// Windows npm package keeps it in the platform-specific optional dependency.
if (process.platform === "win32") {
  const expected = new URL("node_modules/workerd/bin/workerd.exe", site);
  if (!existsSync(expected)) {
    copyFileSync(new URL("node_modules/@cloudflare/workerd-windows-64/bin/workerd.exe", site), expected);
  }
}
const envFile = new URL(".env", site);
if (!existsSync(envFile)) {
  writeFileSync(envFile, `EMDASH_ENCRYPTION_KEY=emdash_enc_v1_${randomBytes(32).toString("base64url")}\n`, { mode: 0o600, flag: "wx" });
}
const child = spawn(process.execPath, ["dist/server/entry.mjs"], {
  cwd: fileURLToPath(site),
  stdio: "inherit",
  env: {
    ...process.env,
    ...parseEnv(readFileSync(envFile, "utf8")),
    HOST: "127.0.0.1",
    PORT: "4333",
    EMDASH_SITE_URL: "http://localhost:4333",
    ASTRO_TELEMETRY_DISABLED: "1",
  },
});
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
