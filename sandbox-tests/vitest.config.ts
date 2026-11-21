import { emdashPluginTest } from "@emdash-cms/plugin-test/config";
import { defineConfig } from "vitest/config";
export default defineConfig({
  plugins: [emdashPluginTest({ dir: "../packages/sandboxed" })],
  // These integration cases start workerd and exercise multiple D1 requests.
  // The five-second unit-test default can interrupt host disposal on busy CI.
  // The upstream plugin rebuilds the same dist/manifest.json for each worker.
  // Serial files prevent one worker reading another worker's partial output.
  test: { testTimeout: 30_000, fileParallelism: false },
});
