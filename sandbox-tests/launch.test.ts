import { it, expect } from "vitest";
import { createPluginRuntimeTestHost } from "@emdash-cms/plugin-test";

const origin = "https://forms.example.com";
const headers = { "X-EmDash-Request": "1" };
const verification =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

it("roundtrips every supported field through submission, stored snapshots and safe exports", async () => {
  const host = await createPluginRuntimeTestHost({ site: { url: origin } });
  try {
    const user = await host.fixtures.user({
      email: "owner@example.com",
      role: "admin",
    });
    const form = {
      schemaVersion: 1,
      id: "all_fields",
      title: "All supported fields",
      status: "published",
      confirmation: "Received",
      fields: [
        { id: "name", type: "name", label: "Name", required: true },
        { id: "text", type: "text", label: "Text", required: true },
        {
          id: "paragraph",
          type: "paragraph",
          label: "Paragraph",
          required: true,
        },
        { id: "email", type: "email", label: "Email", required: true },
        { id: "phone", type: "phone", label: "Phone", required: true },
        { id: "url", type: "url", label: "URL", required: true },
        {
          id: "number",
          type: "number",
          label: "Number",
          required: true,
          min: 1.5,
          max: 10,
        },
        {
          id: "select",
          type: "select",
          label: "Select",
          required: true,
          options: ["Business", "Personal"],
        },
        {
          id: "radio",
          type: "radio",
          label: "Radio",
          required: true,
          options: ["Yes", "No"],
        },
        {
          id: "checkboxes",
          type: "checkboxes",
          label: "Checkboxes",
          required: true,
          options: ["A", "B"],
        },
        { id: "consent", type: "consent", label: "Consent", required: true },
        { id: "hidden", type: "hidden", label: "Hidden" },
        { id: "content", type: "content", label: "Information" },
        {
          id: "page",
          type: "page",
          label: "Business page",
          showWhen: { field: "select", op: "eq", value: "Business" },
        },
        { id: "section", type: "section", label: "Business details" },
        {
          id: "company",
          type: "text",
          label: "Company",
          requiredWhen: { field: "radio", op: "eq", value: "Yes" },
        },
      ],
      notifications: [
        {
          to: "support@example.com",
          subject: "Business request",
          when: {
            op: "and",
            rules: [
              { field: "select", op: "eq", value: "Business" },
              { field: "consent", op: "eq", value: true },
            ],
          },
        },
      ],
    };
    const request = async (route: string, body: unknown) =>
      (
        await host.actions.routes.request(route, { user, headers, body })
      ).json();
    expect(await request("save", { form, revision: null })).toMatchObject({
      data: { ok: true },
    });
    await host.fixtures.plugin.setting(
      "turnstileSecret",
      "isolated-test-secret",
    );
    await host.fixtures.plugin.setting("turnstileSiteKey", "test-site-key");
    await host.http.respond(
      verification,
      Response.json({
        success: true,
        action: "quixforms",
        hostname: "forms.example.com",
      }),
    );
    const values = {
      name: "Synthetic Person",
      text: "=SUM(1,2)",
      paragraph: '<script>alert("test")</script>\nsecond line',
      email: "synthetic@example.com",
      phone: "+40 000 000",
      url: "https://example.com/path",
      number: 1.5,
      select: "Business",
      radio: "Yes",
      checkboxes: ["A", "B"],
      consent: true,
      hidden: "campaign",
      company: "Synthetic Ltd",
      content: "forged content",
      page: "forged page",
      section: "forged section",
      unknown: "forged field",
    };
    const submit = async (key: string, answers: Record<string, unknown>) =>
      (
        await host.actions.routes.request("submit", {
          url: origin + "/_emdash/api/plugins/quixforms/submit",
          headers,
          body: { id: form.id, values: answers, key, token: "stubbed" },
        })
      ).json();
    for (const patch of [
      { number: 11 },
      { select: "Forged" },
      { consent: false },
      { checkboxes: ["A", "A"] },
      { company: "" },
    ]) {
      expect(
        await submit(crypto.randomUUID(), { ...values, ...patch }),
      ).toMatchObject({ data: { ok: false, error: "VALIDATION" } });
    }
    expect(await host.inspect.storage.list("entries")).toHaveLength(0);
    const key = crypto.randomUUID();
    expect(await submit(key, values)).toMatchObject({
      data: { ok: true, message: "Received" },
    });
    const stored = (await host.transport.invokeRoute("entries/read", {
      id: form.id,
      key: form.id + "_" + key,
    })) as { value: { values: Record<string, unknown>; form: typeof form } };
    const { content, page, section, unknown, ...expectedValues } = values;
    expect(stored.value.values).toEqual(expectedValues);
    expect(stored.value.form.fields).toHaveLength(16);
    expect(await host.inspect.email()).toHaveLength(1);
    const exported = (await host.transport.invokeRoute("export", {
      id: form.id,
    })) as { csv: string; json: unknown[] };
    expect(exported.csv).toContain('"\'=SUM(1,2)"');
    expect(exported.csv).toContain('"A; B"');
    expect(exported.json).toHaveLength(1);
    // A hidden page removes its required children and forged answers on the server.
    await host.http.respond(
      verification,
      Response.json({
        success: true,
        action: "quixforms",
        hostname: "forms.example.com",
      }),
    );
    const personalResult = await submit(crypto.randomUUID(), {
      ...values,
      select: "Personal",
      company: "forged hidden answer",
    });
    expect(personalResult.data).toEqual(expect.objectContaining({ ok: true }));
    expect(await host.inspect.email()).toHaveLength(1);
    const entries = (await host.transport.invokeRoute("entries", {
      id: form.id,
    })) as { items: Array<{ data: { values: Record<string, unknown> } }> };
    const personal = entries.items.find(
      (row) => row.data.values.select === "Personal",
    )!;
    expect(personal.data.values).not.toHaveProperty("company");
    // Editing a form must not rewrite the historical submission schema.
    const row = (await host.transport.invokeRoute("read", { id: form.id })) as {
      revision: string;
    };
    expect(
      await request("save", {
        form: {
          ...form,
          title: "Renamed",
          fields: form.fields.map((f) =>
            f.id === "text" ? { ...f, label: "Renamed text" } : f,
          ),
        },
        revision: row.revision,
      }),
    ).toMatchObject({ data: { ok: true } });
    const historical = (await host.transport.invokeRoute("export", {
      id: form.id,
    })) as { csv: string };
    expect(historical.csv).toContain("Text [text]");
    expect(historical.csv).not.toContain("Renamed text");
  } finally {
    await host.dispose();
  }
});

it("fails closed for configured CAPTCHA with missing tokens, rejected or mismatched verification", async () => {
  const host = await createPluginRuntimeTestHost({ site: { url: origin } });
  try {
    const user = await host.fixtures.user({
      email: "owner@example.com",
      role: "admin",
    });
    const form = {
      schemaVersion: 1,
      id: "protected",
      title: "Protected",
      status: "published",
      fields: [{ id: "email", type: "email", label: "Email", required: true }],
      confirmation: "Received",
      notifications: [{ to: "support@example.com", subject: "Request" }],
    };
    await host.actions.routes.request("save", {
      user,
      headers,
      body: { form, revision: null },
    });
    const submit = async (extra = {}) =>
      (
        await host.actions.routes.request("submit", {
          url: origin + "/_emdash/api/plugins/quixforms/submit",
          headers,
          body: {
            id: form.id,
            values: { email: "test@example.com" },
            token: "stubbed",
            key: crypto.randomUUID(),
            ...extra,
          },
        })
      ).json();
    await host.fixtures.plugin.setting(
      "turnstileSecret",
      "isolated-test-secret",
    );
    await host.fixtures.plugin.setting("turnstileSiteKey", "test-site-key");
    expect(await submit({ token: "" })).toMatchObject({
      data: { ok: false, error: "BOT_CHECK" },
    });
    for (const result of [
      { success: false },
      { success: true, action: "other", hostname: "forms.example.com" },
      { success: true, action: "quixforms", hostname: "attacker.example.com" },
    ]) {
      await host.http.respond(verification, Response.json(result));
      expect(await submit()).toMatchObject({
        data: { ok: false, error: "BOT_CHECK" },
      });
    }
    await host.http.respond(
      verification,
      new Response("upstream failure", { status: 503 }),
    );
    expect(await submit()).toMatchObject({
      data: { ok: false, error: "BOT_CHECK" },
    });
    expect(await submit({ website: "spam.example" })).toMatchObject({
      data: { ok: false, error: "INVALID_SUBMISSION" },
    });
    const row = (await host.transport.invokeRoute("read", { id: form.id })) as {
      revision: string;
    };
    await host.actions.routes.request("save", {
      user,
      headers,
      body: { form: { ...form, status: "draft" }, revision: row.revision },
    });
    expect(await submit()).toMatchObject({
      data: { ok: false, error: "UNAVAILABLE" },
    });
    expect(
      await host.transport.invokeRoute("definition", { id: form.id }),
    ).toEqual({ ok: false });
    expect(await host.inspect.storage.list("entries")).toHaveLength(0);
    expect(await host.inspect.email()).toHaveLength(0);
  } finally {
    await host.dispose();
  }
});

it("rejects unsupported definitions and stale writes through production routes without changing stored data", async () => {
  const host = await createPluginRuntimeTestHost();
  try {
    const user = await host.fixtures.user({
      email: "owner@example.com",
      role: "admin",
    });
    const form = {
      schemaVersion: 1,
      id: "safe_edits",
      title: "Original",
      status: "draft",
      fields: [],
      confirmation: "Received",
    };
    const save = async (definition: unknown, revision: string | null) =>
      (
        await host.actions.routes.request("save", {
          user,
          headers,
          body: { form: definition, revision },
        })
      ).json();
    expect(await save(form, null)).toMatchObject({ data: { ok: true } });
    const row = (await host.transport.invokeRoute("read", { id: form.id })) as {
      revision: string;
    };
    for (const invalid of [
      { ...form, schemaVersion: 2, futureFeature: true },
      { ...form, fields: [{ id: "upload", type: "upload", label: "Upload" }] },
    ])
      expect(await save(invalid, row.revision)).toMatchObject({
        data: { ok: false, error: "INVALID_DEFINITION" },
      });
    expect(
      await host.transport.invokeRoute("read", { id: form.id }),
    ).toMatchObject({
      revision: row.revision,
      value: { current: { title: "Original" } },
    });
    expect(await save({ ...form, title: "Newer" }, row.revision)).toMatchObject(
      { data: { ok: true } },
    );
    expect(await save({ ...form, title: "Stale" }, row.revision)).toMatchObject(
      { data: { ok: false, error: "CONFLICT" } },
    );
    expect(
      await host.transport.invokeRoute("read", { id: form.id }),
    ).toMatchObject({ value: { current: { title: "Newer" } } });
  } finally {
    await host.dispose();
  }
});
