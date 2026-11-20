import { it, expect } from "vitest";
import { validateBlocks } from "@emdash-cms/blocks/server";
import type {
  Block,
  BlockResponse,
  FormBlock,
  ButtonElement,
} from "@emdash-cms/blocks";
import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { admin } from "../packages/sandboxed/src/ui";
import {
  template,
  registry,
  validate,
  type Form,
} from "../packages/core/src/index";

function fixture(form = template("sample"), configured = false) {
  let record = { current: form, history: [] as Form[] },
    revision = 1;
  const secret = "private-test-secret-do-not-display";
  const context = {
    settings: {
      get: async (key: string) =>
        configured
          ? key === "turnstileSecret"
            ? secret
            : "public-test-site-key"
          : null,
    },
    storage: {
      forms: {
        query: async () => ({
          items: [{ id: form.id, data: record }],
          hasMore: false,
        }),
        getVersioned: async (id: string) =>
          id === form.id ? { value: record, revision: String(revision) } : null,
        compareAndSet: async (
          _id: string,
          expected: string,
          next: typeof record,
        ) => {
          if (expected !== String(revision)) return { applied: false };
          record = next;
          return { applied: true, revision: String(++revision) };
        },
      },
    },
  } as unknown as PluginContext;
  async function act(action_id?: string, values?: Record<string, unknown>) {
    const result = (await admin(
      {
        input: {
          type: values
            ? "form_submit"
            : action_id
              ? "block_action"
              : "page_load",
          ...(action_id ? { action_id } : {}),
          ...(values ? { values } : {}),
        },
      } as SandboxedRouteContext,
      context,
    )) as BlockResponse;
    expect(validateBlocks(result.blocks)).toEqual({ valid: true, errors: [] });
    expect(
      new TextEncoder().encode(JSON.stringify(result)).byteLength,
    ).toBeLessThan(256 * 1024);
    expect(JSON.stringify(result)).not.toContain(secret);
    return result;
  }
  return { act, record: () => record, revision: () => String(revision) };
}
function walk(blocks: Block[]): Block[] {
  return blocks.flatMap((block) => [
    block,
    ...(block.type === "columns"
      ? block.columns.flatMap(walk)
      : block.type === "tab"
        ? block.panels.flatMap((panel) => walk(panel.blocks))
        : block.type === "accordion"
          ? walk(block.blocks)
          : []),
  ]);
}
const editorForm = (response: BlockResponse) =>
  walk(response.blocks).find(
    (block) => block.type === "form" && block.submit.label === "Save field",
  ) as FormBlock;

it("edits notification message bodies without losing conditions and preserves bodies from older clients", async () => {
  const form = template("sample");
  form.notifications = [
    {
      to: "team@example.com",
      subject: "Request",
      body: "Original\n{all_fields}",
      when: { field: "email", op: "notEmpty" },
    },
  ];
  const f = fixture(form);
  const response = await f.act("notifications:sample");
  const bodyForm = walk(response.blocks).find(
    (block) => block.type === "form",
  ) as FormBlock;
  expect(bodyForm.fields).toContainEqual(
    expect.objectContaining({
      action_id: "body",
      multiline: true,
      initial_value: "Original\n{all_fields}",
    }),
  );
  await f.act("notification:sample:1:0", {
    to: "team@example.com",
    subject: "Updated",
    enabled: true,
    body: "Hello {form_title}\n{all_fields}",
  });
  expect(f.record().current.notifications[0]).toMatchObject({
    body: "Hello {form_title}\n{all_fields}",
    when: form.notifications[0].when,
  });
  await f.act("notification:sample:2:0", {
    to: "team@example.com",
    subject: "Older client",
    enabled: true,
  });
  expect(f.record().current.notifications[0].body).toBe(
    "Hello {form_title}\n{all_fields}",
  );
});

it("shows bounded dashboard counts and setup guidance without exposing credentials", async () => {
  for (const configured of [false, true]) {
    const f = fixture(undefined, configured);
    const overview = await f.act();
    const text = JSON.stringify(overview);
    expect(text).toContain(configured ? "Keys configured" : "CAPTCHA off");
    expect(text).toContain("Forms on this page");
    const launch = JSON.stringify(await f.act("embed:sample"));
    expect(launch).toContain("@emquix/quixforms-astro/Form.astro");
    expect(launch).toContain(
      configured ? "verify a real submission" : "forms work without CAPTCHA",
    );
    expect(f.revision()).toBe("1");
  }
});
it("opens one focused field, clamps pagination, and preserves saved input identity on revision-only changes", async () => {
  const form = template("sample");
  form.fields = Array.from({ length: 18 }, (_, i) =>
    registry.text.create("field_" + i),
  );
  const f = fixture(form);
  const first = await f.act("open:sample");
  expect(
    walk(first.blocks).filter(
      (block) => block.type === "form" && block.submit.label === "Save field",
    ),
  ).toHaveLength(1);
  const last = await f.act("select:sample:1:field_17:99");
  expect(editorForm(last).block_id).toContain("field_17");
  const clamped = await f.act("open:sample:1::99");
  expect(JSON.stringify(clamped)).toContain("Field page 3 of 3");
  const again = await f.act("select:sample:other:field_17:0");
  expect(editorForm(again).block_id).toEqual(editorForm(last).block_id);
  const added = await f.act("add:sample:1::0", { type: "number" });
  expect(f.record().current.fields).toHaveLength(19);
  expect(editorForm(added).block_id).toContain(
    f.record().current.fields.at(-1)!.id,
  );
  expect(JSON.stringify(added)).toContain("Field page 3 of 3");
  const moved = await f.act("up:sample:2:field_8:1");
  expect(f.record().current.fields[7].id).toBe("field_8");
  expect(editorForm(moved).block_id).toContain("field_8");
  expect(JSON.stringify(moved)).toContain("Field page 1 of 3");
});
it("saves numeric limits, rejects invalid ranges and stale edits, and clears optional limits", async () => {
  const form = template("sample");
  form.fields = [registry.number.create("quantity")];
  const f = fixture(form);
  const values = {
    label: "Quantity",
    description: "How many?",
    placeholder: "",
    width: "half",
    required: false,
    min: "-2.5",
    max: "10",
  };
  await f.act("field:sample:1:quantity:0", values);
  expect(f.record().current.fields[0]).toMatchObject({
    min: -2.5,
    max: 10,
    width: "half",
  });
  expect(
    validate(f.record().current, { quantity: 11 }).errors.quantity,
  ).toBeDefined();
  await f.act("field:sample:1:quantity:0", {
    ...values,
    label: "Stale overwrite",
  });
  expect(f.record().current.fields[0].label).toBe("Quantity");
  for (const bounds of [
    { min: "20", max: "10" },
    { min: "Infinity", max: "10" },
    { min: "abc", max: "10" },
  ]) {
    await f.act("field:sample:2:quantity:0", { ...values, ...bounds });
    expect(f.revision()).toBe("2");
  }
  await f.act("field:sample:2:quantity:0", { ...values, min: "", max: "" });
  expect(f.record().current.fields[0]).not.toHaveProperty("min");
  expect(f.record().current.fields[0]).not.toHaveProperty("max");
});
it("preserves hidden configuration and nested conditions when saving type-aware field options", async () => {
  const form = template("sample");
  form.fields[2].showWhen = {
    op: "or",
    rules: [{ field: "name", op: "notEmpty" }],
  };
  form.fields[2].requiredWhen = { field: "email", op: "notEmpty" };
  const original = structuredClone(form.fields[2]);
  const f = fixture(form);
  await f.act("field:sample:1:message:0", {
    label: "Your message",
    description: "Details",
    placeholder: "Write here",
    width: "third",
    required: false,
  });
  expect(f.record().current.fields[2]).toMatchObject({
    showWhen: original.showWhen,
    requiredWhen: original.requiredWhen,
    options: original.options,
  });
  expect(f.record().history[0].fields[2]).toEqual(original);
  const ui = await f.act("select:sample:2:message:0");
  expect(
    editorForm(ui).fields.some((field) => field.action_id === "options"),
  ).toBe(false);
});
it("keeps outline and settings navigation read-only and guards deletion of referenced fields", async () => {
  const form = template("sample");
  form.fields[2].showWhen = { field: "name", op: "notEmpty" };
  const f = fixture(form);
  for (const action of [
    "formsettings:sample",
    "preview:sample",
    "embed:sample",
    "select:sample:1:name:0",
  ])
    await f.act(action);
  expect(f.revision()).toBe("1");
  const ui = await f.act("open:sample");
  const deletion = walk(ui.blocks)
    .filter((block) => block.type === "actions")
    .flatMap((block) => block.elements)
    .find(
      (element) =>
        element.type === "button" && element.label === "Delete field",
    ) as ButtonElement;
  expect(deletion.confirm?.confirm).toBe("Delete field");
  await f.act(deletion.action_id);
  expect(f.record().current.fields).toHaveLength(3);
  expect(f.revision()).toBe("1");
  await f.act("unknown:sample:1:name:0");
  expect(f.revision()).toBe("1");
});
it("bounds Unicode-heavy field options and every new screen with the official host validator", async () => {
  const form = template("sample");
  form.fields = Array.from({ length: 4 }, (_, i) => ({
    ...registry.select.create("field_" + i),
    options: Array.from(
      { length: 100 },
      (_, j) => String(j) + "界".repeat(190),
    ),
  }));
  const f = fixture(form);
  for (const action of [
    "open:sample",
    "preview:sample",
    "formsettings:sample",
    "embed:sample",
  ])
    await f.act(action);
});
