import { it, expect, vi } from "vitest";
import type {
  PluginContext,
  SandboxedPlugin,
  SandboxedRouteContext,
} from "emdash/plugin";
import plugin from "../packages/sandboxed/src/plugin";
import { template } from "../packages/core/src/index";
import { parseForm } from "../packages/core/src/index";
import { notificationMessage } from "../packages/core/src/submissions";
import type { Entry } from "../packages/core/src/submissions";
type Handler = Extract<
  NonNullable<SandboxedPlugin["routes"]>[string],
  { handler: unknown }
>["handler"];
const submit = (plugin.routes!.submit as { handler: Handler }).handler;
function fixture(failure = false) {
  const form = template("contact");
  form.status = "published";
  form.notifications = [
    {
      to: "ignored@example.com",
      subject: "Wrong condition",
      when: { field: "name", op: "eq", value: "Other" },
    },
    { to: "disabled@example.com", subject: "Disabled", enabled: false },
    {
      to: "support@example.com",
      subject: "Support request",
      when: {
        op: "and",
        rules: [
          { field: "name", op: "eq", value: "Jane" },
          { field: "email", op: "contains", value: "@example.com" },
        ],
      },
    },
  ];
  const rows = new Map<string, Entry>();
  const send = vi.fn(async () => {
    if (failure) throw new Error("Transport unavailable");
  });
  const ctx = {
    storage: {
      forms: { get: async () => ({ current: form }) },
      entries: {
        get: async (key: string) => rows.get(key) ?? null,
        compareAndSet: async (key: string, _rev: unknown, value: Entry) => {
          if (rows.has(key)) return { applied: false };
          rows.set(key, value);
          return { applied: true, revision: "1" };
        },
        updateIf: async (key: string, options: { set: Partial<Entry> }) => {
          rows.set(key, { ...rows.get(key)!, ...options.set });
          return { applied: true };
        },
      },
    },
    kv: {
      getVersioned: async () => null,
      compareAndSet: async () => ({ applied: true, revision: "1" }),
    },
    settings: { get: async () => "test-only" },
    http: {
      fetch: vi.fn(async () =>
        Response.json({
          success: true,
          action: "quixforms",
          hostname: "forms.example.com",
        }),
      ),
    },
    email: { send },
  } as unknown as PluginContext;
  const request = {
    request: {
      url: "https://forms.example.com/_emdash/api/plugins/quixforms/submit",
      method: "POST",
      headers: {},
    },
    input: {
      id: "contact",
      values: {
        name: "Jane",
        email: "jane@example.com",
        message: "Help",
        recipient: "attacker@example.net",
      },
      token: "test",
      key: "00000000-0000-4000-8000-000000000001",
    },
  } as unknown as SandboxedRouteContext;
  return { ctx, request, rows, send, form };
}
it("routes notifications using accepted answers and only fixed enabled recipients", async () => {
  const f = fixture();
  expect(await submit(f.request, f.ctx)).toMatchObject({ ok: true });
  expect(f.send).toHaveBeenCalledTimes(1);
  expect(f.send).toHaveBeenCalledWith(
    expect.objectContaining({
      to: "support@example.com",
      subject: "Support request",
    }),
  );
  expect([...f.rows.values()][0]).toMatchObject({ notification: "sent" });
  expect([...f.rows.values()][0].values).not.toHaveProperty("recipient");
});
it("retains an accepted submission on email failure and does not resend on replay", async () => {
  const f = fixture(true);
  expect(await submit(f.request, f.ctx)).toMatchObject({ ok: true });
  expect([...f.rows.values()][0].notification).toBe("failed");
  expect(await submit(f.request, f.ctx)).toMatchObject({ ok: true });
  expect(f.rows.size).toBe(1);
  expect(f.send).toHaveBeenCalledTimes(1);
});
it("records skipped when no enabled notification condition matches", async () => {
  const f = fixture();
  f.form.notifications[2].enabled = false;
  expect(await submit(f.request, f.ctx)).toMatchObject({ ok: true });
  expect([...f.rows.values()][0].notification).toBe("skipped");
  expect(f.send).not.toHaveBeenCalled();
});
it("delivers the administrator's plain-text body with accepted answers and entry metadata", async () => {
  const f = fixture();
  f.form.notifications[2].body =
    "New entry for {form_title}\nReference: {entry_reference}\n\n{all_fields}\nThank you.";
  expect(await submit(f.request, f.ctx)).toMatchObject({ ok: true });
  expect(f.send).toHaveBeenCalledWith(
    expect.objectContaining({
      text: "New entry for Contact us\nReference: contact_00000000-0000-4000-8000-000000000001\n\nYour name: Jane\nEmail address: jane@example.com\nHow can we help?: Help\nThank you.",
    }),
  );
  expect(f.send.mock.calls[0]).not.toContain("attacker@example.net");
});
it("preserves legacy notification bodies and does not interpret tags inside visitor answers", () => {
  const form = template("contact");
  const answers = {
    name: "{entry_reference}",
    email: "a@example.com",
    message: "<b>Plain text</b>",
  };
  const expected =
    "Your name: {entry_reference}\nEmail address: a@example.com\nHow can we help?: <b>Plain text</b>";
  expect(
    notificationMessage(form, undefined, answers, "private-reference"),
  ).toBe(expected);
  expect(notificationMessage(form, "  ", answers, "private-reference")).toBe(
    expected,
  );
  expect(
    notificationMessage(form, "{all_fields}", answers, "private-reference"),
  ).toBe(expected);
  expect(
    notificationMessage(form, "A fixed message", answers, "private-reference"),
  ).toBe("A fixed message");
});
it("bounds message templates and expanded output without losing an accepted entry", async () => {
  const f = fixture();
  f.form.notifications[2].body = "x".repeat(10001);
  expect(() => parseForm(f.form)).toThrow();
  f.form.notifications[2].body = "{all_fields}".repeat(700);
  (f.request.input as { values: Record<string, string> }).values.message =
    "Answer".repeat(1000);
  expect(() =>
    notificationMessage(
      f.form,
      f.form.notifications[2].body,
      { message: "Answer".repeat(1000) },
      "ref",
    ),
  ).toThrow("too large");
  expect(await submit(f.request, f.ctx)).toMatchObject({ ok: true });
  expect([...f.rows.values()][0].notification).toBe("failed");
  expect(f.send).not.toHaveBeenCalled();
});
