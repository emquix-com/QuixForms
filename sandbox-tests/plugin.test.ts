import { it, expect } from "vitest";
import { createPluginTestHost } from "@emdash-cms/plugin-test";
it("creates, publishes, reads and rejects invalid submissions across the sandbox boundary", async () => {
  const host = await createPluginTestHost();
  try {
    const form = {
      schemaVersion: 1,
      id: "contact",
      title: "Contact",
      status: "published",
      fields: [{ id: "email", type: "email", label: "Email", required: true }],
      confirmation: "Thank you",
    };
    expect(
      await host.invokeRoute("save", { form, revision: null }),
    ).toMatchObject({ ok: true });
    expect(
      await host.invokeRoute("definition", { id: "contact" }),
    ).toMatchObject({ ok: true, form: { id: "contact" } });
    expect(
      await host.invokeRoute("submit", {
        id: "contact",
        values: { email: "bad" },
        key: "00000000-0000-4000-8000-000000000000",
        token: "test",
      }),
    ).toMatchObject({ ok: false, error: "VALIDATION" });
    expect(await host.storage("entries").list()).toHaveLength(0);
    const ui = await host.invokeRoute("admin", {
      type: "page_load",
      page: "/forms",
    });
    expect(ui).toHaveProperty("blocks");
  } finally {
    await host.dispose();
  }
});

import { createPluginRuntimeTestHost } from "@emdash-cms/plugin-test";
it("enforces authentication, permission and CSRF at the production dispatcher", async () => {
  const host = await createPluginRuntimeTestHost();
  try {
    expect(
      (await host.actions.routes.request("list", { method: "GET" })).status,
    ).toBe(401);
    const user = await host.fixtures.user({
      email: "admin@example.com",
      role: "admin",
    });
    expect(
      (await host.actions.routes.request("list", { method: "GET", user }))
        .status,
    ).toBe(403);
    const subscriber = await host.fixtures.user({
      email: "subscriber@example.com",
      role: "subscriber",
    });
    expect(
      (
        await host.actions.routes.request("list", {
          method: "GET",
          user: subscriber,
          headers: { "X-EmDash-Request": "1" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await host.actions.routes.request("list", {
          method: "GET",
          user,
          headers: { "X-EmDash-Request": "1" },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await host.actions.routes.request("save", {
          method: "GET",
          user,
          headers: { "X-EmDash-Request": "1" },
        })
      ).status,
    ).toBe(405);
  } finally {
    await host.dispose();
  }
});
it("stores one accepted submission through runtime routes with a stubbed CAPTCHA provider", async () => {
  const host = await createPluginRuntimeTestHost({
    site: { url: "https://forms.example.com" },
  });
  try {
    const user = await host.fixtures.user({
      email: "owner@example.com",
      role: "admin",
    });
    const form = {
      schemaVersion: 1,
      id: "contact",
      title: "Contact",
      status: "published",
      fields: [{ id: "email", type: "email", label: "Email", required: true }],
      confirmation: "Thank you",
    };
    const saved = await host.actions.routes.request("save", {
      user,
      headers: { "X-EmDash-Request": "1" },
      body: { form, revision: null },
    });
    expect(await saved.json()).toMatchObject({ data: { ok: true } });
    await host.fixtures.plugin.setting("turnstileSecret", "test-only-secret");
    await host.http.respond(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      Response.json({
        success: true,
        action: "quixforms",
        hostname: "forms.example.com",
      }),
    );
    const request = {
      url: "https://forms.example.com/_emdash/api/plugins/quixforms/submit",
      headers: { "X-EmDash-Request": "1" },
      body: {
        id: "contact",
        values: { email: "visitor@example.com" },
        key: "00000000-0000-4000-8000-000000000000",
        token: "stubbed",
      },
    };
    const response = await host.actions.routes.request("submit", request);
    expect(await response.json()).toMatchObject({
      data: { ok: true, message: "Thank you" },
    });
    expect(await host.inspect.storage.list("entries")).toHaveLength(1);
  } finally {
    await host.dispose();
  }
});
