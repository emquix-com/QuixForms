import { test, expect } from "@playwright/test";
import { template } from "../../packages/core/src/index";
test("multiple forms isolate CAPTCHA and retain retry identity after a lost response", async ({
  page,
}) => {
  await page.route("https://challenges.cloudflare.com/**", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: `let next=0;const callbacks=new Map();window.turnstile={render(el,options){const id=String(++next);callbacks.set(id,options.callback);el.textContent='Bot check '+id;options.callback('token-'+id);return id},reset(id){callbacks.get(id)('renewed-'+id)},remove(id){callbacks.delete(id)}};`,
    }),
  );
  await page.route("**/definition?*", (r) => {
    const id = new URL(r.request().url()).searchParams.get("id")!;
    return r.fulfill({
      json: {
        success: true,
        data: { ok: true, form: template(id), siteKey: "test" },
      },
    });
  });
  const requests: Array<{ key: string; token: string; id: string }> = [];
  await page.route("**/quixforms/submit", async (r) => {
    requests.push(r.request().postDataJSON());
    if (requests.length === 1) return r.abort("failed");
    return r.fulfill({
      json: { success: true, data: { ok: true, message: "Accepted" } },
    });
  });
  await page.goto("/forms");
  const forms = page.locator("form");
  await expect(forms).toHaveCount(2);
  const first = forms.nth(0),
    second = forms.nth(1);
  for (const form of [first, second]) {
    await form.getByLabel("Your name").fill("Visitor");
    await form.getByLabel("Email address").fill("visitor@example.com");
    await form.getByLabel("How can we help?").fill("Hello");
  }
  await first.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(first.getByText("Failed to fetch")).toBeVisible();
  await first.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(first.getByText("Accepted")).toBeVisible();
  await second.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(second.getByText("Accepted")).toBeVisible();
  expect(requests[0].key).toBe(requests[1].key);
  expect(requests[0].token).not.toBe(requests[2].token);
  expect(requests[0].id).toBe("contact");
  expect(requests[2].id).toBe("quote");
  const ids = await page
    .locator("input[id],textarea[id]")
    .evaluateAll((nodes) => nodes.map((n) => n.id));
  expect(new Set(ids).size).toBe(ids.length);
});
test("builder edits, reorders with keyboard controls, previews and saves through Core API", async ({
  page,
}) => {
  await page.route("**/quixforms/list", (r) =>
    r.fulfill({ json: { success: true, data: { items: [] } } }),
  );
  let saved: unknown;
  await page.route("**/quixforms/save", (r) => {
    saved = r.request().postDataJSON();
    expect(r.request().headers()["x-emdash-request"]).toBe("1");
    return r.fulfill({
      json: { success: true, data: { ok: true, revision: "next" } },
    });
  });
  await page.goto("/builder");
  await page.getByRole("button", { name: "Create form" }).click();
  await page.getByRole("button", { name: "Move Your name down" }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.locator(".qf-select").first().click();
  await page.getByLabel("Label", { exact: true }).fill("Full name");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  expect(saved).toMatchObject({
    form: {
      fields: [{ label: "Full name" }, { id: "email" }, { id: "message" }],
    },
  });
  await page.screenshot({
    path: "docs/screenshots/builder.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByLabel("Full name")).toBeVisible();
});
test("drag and drop changes field order and autosave preserves edits made during a save", async ({
  page,
}) => {
  await page.route("**/quixforms/list", (r) =>
    r.fulfill({ json: { success: true, data: { items: [] } } }),
  );
  const saved: any[] = [];
  let release: (() => void) | undefined;
  await page.route("**/quixforms/save", async (r) => {
    saved.push(r.request().postDataJSON());
    if (saved.length === 2)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    await r.fulfill({
      json: {
        success: true,
        data: { ok: true, revision: String(saved.length) },
      },
    });
  });
  await page.goto("/builder");
  await page.getByRole("button", { name: "Create form", exact: true }).click();
  await expect.poll(() => saved.length).toBe(1);
  await page
    .locator("main article")
    .nth(0)
    .dragTo(page.locator("main article").nth(2));
  await expect.poll(() => saved.length).toBe(2);
  expect(saved[1].form.fields.map((f: any) => f.id)).toEqual([
    "email",
    "message",
    "name",
  ]);
  await page.locator(".qf-select").first().click();
  await page.getByLabel("Label", { exact: true }).fill("Updated while saving");
  release!();
  await expect.poll(() => saved.length).toBe(3);
  expect(saved[2].form.fields[0].label).toBe("Updated while saving");
  expect(saved[2].revision).toBe("2");
});
test("entries dashboard uses Core records for notes, moderation and exports", async ({
  page,
}) => {
  const form = template("contact");
  const key = "contact_00000000-0000-4000-8000-000000000000";
  let revision = 1;
  let entry: any = {
    formId: "contact",
    form,
    values: {
      name: "Visitor",
      email: "visitor@example.com",
      message: "Support please",
    },
    createdAt: "2026-10-24T12:00:00Z",
    notification: "sent",
    status: "inbox",
    notes: [],
  };
  await page.route("**/quixforms/list", (r) =>
    r.fulfill({
      json: {
        success: true,
        data: { items: [{ id: "contact", data: { current: form } }] },
      },
    }),
  );
  await page.route("**/quixforms/read?*", (r) =>
    r.fulfill({
      json: {
        success: true,
        data: { value: { current: form }, revision: "form-1" },
      },
    }),
  );
  await page.route("**/quixforms/entries?*", (r) =>
    r.fulfill({
      json: { success: true, data: { items: [{ id: key, data: entry }] } },
    }),
  );
  await page.route("**/quixforms/entries/read?*", (r) =>
    r.fulfill({
      json: {
        success: true,
        data: { value: entry, revision: String(revision) },
      },
    }),
  );
  await page.route("**/quixforms/entries/update", (r) => {
    const body = r.request().postDataJSON();
    expect(body.key).toBe(key);
    expect(body.revision).toBe(String(revision));
    revision++;
    entry = {
      ...entry,
      ...body.patch,
      ...(body.note
        ? {
            notes: [
              {
                id: "note",
                text: body.note,
                authorId: "admin",
                createdAt: "2026-10-24",
              },
            ],
          }
        : {}),
    };
    return r.fulfill({
      json: { success: true, data: { ok: true, revision: String(revision) } },
    });
  });
  await page.route("**/quixforms/export?*", (r) =>
    r.fulfill({
      json: {
        success: true,
        data: {
          ok: true,
          csv: "Reference\r\n" + key,
          json: [{ id: key, data: entry }],
        },
      },
    }),
  );
  await page.goto("/builder");
  await page.getByRole("button", { name: "Contact us", exact: true }).click();
  await page.getByRole("button", { name: "Entries", exact: true }).click();
  await page.getByRole("button", { name: "Open " + key }).click();
  await expect(page.getByText("Support please", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Move to spam" }).click();
  await expect(page.getByText("Folder: spam", { exact: false })).toBeVisible();
  await page.getByLabel("New note").fill("Follow up tomorrow");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(
    page.getByText("Follow up tomorrow", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to inbox" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export page CSV" }).click();
  expect((await download).suggestedFilename()).toBe(
    "quixforms-contact-page.csv",
  );
});
test("settings save notifications and appearance without losing nested field rules", async ({
  page,
}) => {
  const form = template("settings");
  form.fields[2].showWhen = {
    op: "and",
    rules: [{ field: "name", op: "notEmpty" }],
  };
  let current = form,
    revision = 1;
  await page.route("**/quixforms/list", (r) =>
    r.fulfill({
      json: {
        success: true,
        data: { items: [{ id: form.id, data: { current } }] },
      },
    }),
  );
  await page.route("**/quixforms/read?*", (r) =>
    r.fulfill({
      json: {
        success: true,
        data: { value: { current, history: [] }, revision: String(revision) },
      },
    }),
  );
  await page.route("**/quixforms/save", (r) => {
    const body = r.request().postDataJSON();
    expect(body.revision).toBe(String(revision));
    current = body.form;
    revision++;
    return r.fulfill({
      json: { success: true, data: { ok: true, revision: String(revision) } },
    });
  });
  await page.goto("/builder");
  await page.getByRole("button", { name: "Contact us", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByLabel("Confirmation message")
    .fill("Your request is recorded.");
  await page
    .getByRole("combobox", { name: "Appearance", exact: true })
    .selectOption("boxed");
  await page
    .getByRole("button", { name: "Add notification", exact: true })
    .click();
  await page
    .getByLabel("Recipient", { exact: true })
    .fill("support@example.com");
  await page.getByLabel("Enabled", { exact: true }).check();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  expect(current.appearance).toBe("boxed");
  expect(current.confirmation).toBe("Your request is recorded.");
  expect(current.notifications).toMatchObject([
    { to: "support@example.com", enabled: true },
  ]);
  expect(current.fields[2].showWhen).toEqual(form.fields[2].showWhen);
  await page
    .getByRole("button", { name: "Back to builder", exact: true })
    .click();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator(".quixforms")).toBeVisible();
});
