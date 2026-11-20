import { it, expect } from "vitest";
import { createPluginRuntimeTestHost } from "@emdash-cms/plugin-test";

it("accepts submissions without CAPTCHA when keys are absent or incomplete and exposes no secret", async () => {
  const host = await createPluginRuntimeTestHost();
  try {
    const user = await host.fixtures.user({
      email: "owner@example.com",
      role: "admin",
    });
    const headers = { "X-EmDash-Request": "1" };
    const form = {
      schemaVersion: 1,
      id: "optional_captcha",
      title: "Optional CAPTCHA",
      status: "published",
      fields: [{ id: "email", type: "email", label: "Email", required: true }],
      confirmation: "Received",
    };
    await host.actions.routes.request("save", {
      user,
      headers,
      body: { form, revision: null },
    });
    for (const [site, secret] of [
      ["", ""],
      ["site-only", ""],
      ["", "private-secret"],
    ]) {
      await host.fixtures.plugin.setting("turnstileSiteKey", site);
      await host.fixtures.plugin.setting("turnstileSecret", secret);
      const definition = await host.transport.invokeRoute("definition", {
        id: form.id,
      });
      expect(definition).toMatchObject({
        ok: true,
        captchaRequired: false,
        siteKey: "",
      });
      expect(JSON.stringify(definition)).not.toContain("private-secret");
      const key = crypto.randomUUID();
      const body = {
        id: form.id,
        values: { email: "synthetic@example.com" },
        key,
      };
      const send = () =>
        host.actions.routes.request("submit", { headers, body });
      expect(await (await send()).json()).toMatchObject({
        data: { ok: true, message: "Received" },
      });
      expect(await (await send()).json()).toMatchObject({ data: { ok: true } });
    }
    expect(await host.inspect.storage.list("entries")).toHaveLength(3);
  } finally {
    await host.dispose();
  }
});
