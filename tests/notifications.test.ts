import { it, expect, vi } from "vitest";
import type {
  PluginContext,
  SandboxedPlugin,
  SandboxedRouteContext,
} from "emdash/plugin";
import plugin from "../packages/sandboxed/src/plugin";
import { template } from "../packages/core/src/index";
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
