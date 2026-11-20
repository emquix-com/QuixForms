import { it, expect } from "vitest";
import type {
  PluginContext,
  SandboxedPlugin,
  SandboxedRouteContext,
} from "emdash/plugin";
import plugin from "../packages/sandboxed/src/plugin";
type Handler = Extract<
  NonNullable<SandboxedPlugin["routes"]>[string],
  { handler: unknown }
>["handler"];
it("exposes only protection readiness through an administrator-only GET route", async () => {
  const route = plugin.routes!.setup as {
    methods: string[];
    permission: string;
    handler: Handler;
  };
  expect(route.methods).toEqual(["GET"]);
  expect(route.permission).toBe("plugins:manage");
  for (const [site, secret, expected] of [
    [null, null, false],
    ["site-key", null, false],
    [" ", "private-secret", false],
    ["site-key", "private-secret", true],
  ] as const) {
    const context = {
      settings: {
        get: async (key: string) =>
          key === "turnstileSiteKey" ? site : secret,
      },
    } as unknown as PluginContext;
    const response = await route.handler(
      { input: {} } as SandboxedRouteContext,
      context,
    );
    expect(response).toEqual({ turnstileConfigured: expected });
    expect(JSON.stringify(response)).not.toContain("private-secret");
    expect(JSON.stringify(response)).not.toContain("site-key");
  }
});
