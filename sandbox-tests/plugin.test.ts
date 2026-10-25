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
    const initial = (await host.invokeRoute("read", { id: "contact" })) as {
      revision: string;
    };
    expect(
      await host.invokeRoute("save", {
        form: { ...form, title: "Changed" },
        revision: initial.revision,
      }),
    ).toMatchObject({ ok: true });
    const current = (await host.invokeRoute("read", { id: "contact" })) as {
      revision: string;
    };
    expect(
      await host.invokeRoute("revisions/restore", {
        id: "contact",
        revision: initial.revision,
        index: 0,
      }),
    ).toMatchObject({ ok: false, error: "CONFLICT" });
    expect(
      await host.invokeRoute("revisions/restore", {
        id: "contact",
        revision: current.revision,
        index: 0,
      }),
    ).toMatchObject({ ok: true });
    expect(await host.invokeRoute("read", { id: "contact" })).toMatchObject({
      value: { current: { title: "Contact", status: "draft" } },
    });
    expect(
      await host.invokeRoute("definition", { id: "contact" }),
    ).toMatchObject({ ok: false });
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
    for (const route of ["read", "entries", "entries/read", "export"]) {
      expect(
        (
          await host.actions.routes.request(route, {
            method: "GET",
            headers: { "X-EmDash-Request": "1" },
          })
        ).status,
      ).toBe(401);
      expect(
        (
          await host.actions.routes.request(route, {
            method: "GET",
            user: subscriber,
            headers: { "X-EmDash-Request": "1" },
          })
        ).status,
      ).toBe(403);
    }
    for (const route of [
      "save",
      "duplicate",
      "revisions/restore",
      "entries/update",
      "entries/erase",
    ]) {
      expect(
        (
          await host.actions.routes.request(route, {
            method: "POST",
            body: {},
            headers: { "X-EmDash-Request": "1" },
          })
        ).status,
      ).toBe(401);
      expect(
        (
          await host.actions.routes.request(route, {
            method: "POST",
            user: subscriber,
            body: {},
            headers: { "X-EmDash-Request": "1" },
          })
        ).status,
      ).toBe(403);
    }
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
      notifications: [
        {
          to: "support@example.com",
          subject: "Accepted request",
          when: {
            op: "and",
            rules: [{ field: "email", op: "contains", value: "@example.com" }],
          },
        },
        { to: "disabled@example.com", subject: "Disabled", enabled: false },
        {
          to: "other@example.com",
          subject: "Unmatched",
          when: { field: "email", op: "eq", value: "other@example.com" },
        },
      ],
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
    expect(await host.inspect.email()).toHaveLength(1);
    expect((await host.inspect.email())[0]).toMatchObject({
      to: "support@example.com",
      subject: "Accepted request",
    });
    await host.http.respond(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      Response.json({ success: false }),
    );
    expect(
      await (await host.actions.routes.request("submit", request)).json(),
    ).toMatchObject({ data: { ok: true } });
    expect(await host.inspect.storage.list("entries")).toHaveLength(1);
    expect(await host.inspect.email()).toHaveLength(1);
    expect((await host.inspect.email())[0]).toMatchObject({
      to: "support@example.com",
      subject: "Accepted request",
    });
    expect(
      await (
        await host.actions.routes.request("submit", {
          ...request,
          body: { ...request.body, values: { email: "different@example.com" } },
        })
      ).json(),
    ).toMatchObject({ data: { ok: false, error: "IDEMPOTENCY_CONFLICT" } });
    const entryKey = "contact_" + request.body.key;
    const row = (await host.transport.invokeRoute("entries/read", {
      id: "contact",
      key: entryKey,
    })) as { revision: string };
    expect(
      await host.transport.invokeRoute("entries/update", {
        id: "contact",
        key: entryKey,
        revision: row.revision,
        patch: { status: "spam", starred: true },
        note: "Reviewed by support",
      }),
    ).toMatchObject({ ok: true });
    expect(
      await host.transport.invokeRoute("entries/update", {
        id: "contact",
        key: entryKey,
        revision: row.revision,
        patch: { read: true },
      }),
    ).toMatchObject({ ok: false, error: "CONFLICT" });
    expect(
      await host.transport.invokeRoute("entries/read", {
        id: "other",
        key: entryKey,
      }),
    ).toBeNull();
    expect(
      await host.transport.invokeRoute("entries", {
        id: "contact",
        status: "spam",
        starred: "yes",
      }),
    ).toMatchObject({ items: [{ id: entryKey }] });
    const detail = await host.admin.act("/forms", "entry:contact:" + entryKey, {
      user,
    });
    expect(detail.blocks.length).toBeGreaterThan(0);
    const inbox = await host.admin.act("/forms", "inbox:contact", { user });
    expect(inbox.blocks.length).toBeGreaterThan(0);
    expect(
      (await host.admin.act("/forms", "notifications:contact", { user })).blocks
        .length,
    ).toBeGreaterThan(0);
    const originalForCopy = (await host.transport.invokeRoute("read", {
      id: "contact",
    })) as { revision: string };
    const copy = (await host.transport.invokeRoute("duplicate", {
      id: "contact",
      revision: originalForCopy.revision,
    })) as { ok: boolean; id: string };
    expect(copy.ok).toBe(true);
    expect(
      await host.transport.invokeRoute("read", { id: copy.id }),
    ).toMatchObject({
      value: {
        current: { status: "draft", notifications: form.notifications },
        history: [],
      },
    });
    expect(
      await host.transport.invokeRoute("entries", { id: copy.id }),
    ).toMatchObject({ items: [] });
    const currentForm = (await host.transport.invokeRoute("read", {
      id: "contact",
    })) as { revision: string };
    const conditionAction = [
      "logicupdate",
      "contact",
      encodeURIComponent(currentForm.revision),
      "n_0",
      "when.0",
      "leaf",
    ].join(":");
    expect(
      (
        await host.admin.submit(
          "/forms",
          conditionAction,
          { source: "email", operator: "contains", value: "example.com" },
          { user },
        )
      ).blocks.length,
    ).toBeGreaterThan(0);
    expect(
      await host.transport.invokeRoute("read", { id: "contact" }),
    ).toMatchObject({
      value: {
        current: {
          notifications: [
            {
              when: {
                op: "and",
                rules: [
                  { field: "email", op: "contains", value: "example.com" },
                ],
              },
            },
            { enabled: false },
            { to: "other@example.com" },
          ],
        },
      },
    });

    const latest = (await host.transport.invokeRoute("entries/read", {
      id: "contact",
      key: entryKey,
    })) as { revision: string };
    expect(
      await host.transport.invokeRoute("entries/erase", {
        id: "contact",
        key: entryKey,
        revision: latest.revision,
      }),
    ).toMatchObject({ ok: false });
    expect(
      await host.transport.invokeRoute("entries/update", {
        id: "contact",
        key: entryKey,
        revision: latest.revision,
        patch: { status: "trash" },
      }),
    ).toMatchObject({ ok: true });
    const trashed = (await host.transport.invokeRoute("entries/read", {
      id: "contact",
      key: entryKey,
    })) as { revision: string };
    expect(
      await host.transport.invokeRoute("entries/erase", {
        id: "contact",
        key: entryKey,
        revision: trashed.revision,
      }),
    ).toMatchObject({ ok: true });
    expect(
      await host.transport.invokeRoute("entries/read", {
        id: "contact",
        key: entryKey,
      }),
    ).toBeNull();
  } finally {
    await host.dispose();
  }
});
