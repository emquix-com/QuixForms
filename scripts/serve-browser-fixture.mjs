import { build, preview } from "astro";
import { fileURLToPath } from "node:url";

process.env.ASTRO_TELEMETRY_DISABLED = "1";
const root = fileURLToPath(new URL("../examples/astro/", import.meta.url));
await build({ root });
const server = await preview({ root, server: { host: "127.0.0.1", port: 4321 } });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await server.stop();
    process.exit(0);
  });
}
