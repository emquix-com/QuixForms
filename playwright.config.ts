import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  use: { baseURL: "http://127.0.0.1:4321" },
  webServer: {
    command:
      "ASTRO_TELEMETRY_DISABLED=1 npx astro build --root examples/astro && python3 -m http.server 4321 --bind 127.0.0.1 --directory examples/astro/dist",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: false,
  },
  reporter: "list",
});
