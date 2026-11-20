import { test, expect, type Page } from "@playwright/test";
async function chooseTemplate(page: Page, name = "Simple Contact Form") {
  await page.getByRole("button", { name: "Add New", exact: true }).click();
  await page
    .getByRole("button", { name: "Use template " + name, exact: true })
    .click();
}
import { template } from "../../packages/core/src/index";
test("registry-assigned plugin IDs connect definition and accepted submission", async ({page}) => {
  await page.route("**/_emdash/api/plugins/r_registry_install/definition?*", r => r.fulfill({json:{success:true,data:{ok:true,form:template('contact'),captchaRequired:false}}}));
  let submitted = false;
  await page.route("**/_emdash/api/plugins/r_registry_install/submit", r => {
    submitted = true;
    expect(r.request().postDataJSON()).toMatchObject({id:'contact',token:''});
    return r.fulfill({json:{success:true,data:{ok:true,message:'Registry accepted'}}});
  });
  await page.goto('/registry-form');
  await page.getByLabel('Your name').fill('Registry Visitor');
  await page.getByLabel('Email address').fill('registry@example.com');
  await page.getByLabel('How can we help?').fill('Registry route check');
  await page.getByRole('button',{name:'Submit',exact:true}).click();
  await expect(page.getByText('Registry accepted')).toBeVisible();
  expect(submitted).toBe(true);
});
test("forms submit without loading CAPTCHA when the server reports it is off", async ({
  page,
}) => {
  let captchaRequests = 0;
  await page.route("https://challenges.cloudflare.com/**", (r) => {
    captchaRequests++;
    return r.abort();
  });
  await page.route("**/definition?*", (r) => {
    const id = new URL(r.request().url()).searchParams.get("id")!;
    return r.fulfill({
      json: {
        success: true,
        data: {
          ok: true,
          form: template(id),
          captchaRequired: false,
          siteKey: "",
        },
      },
    });
  });
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/quixforms/submit", (r) => {
    submitted = r.request().postDataJSON();
    return r.fulfill({
      json: {
        success: true,
        data: { ok: true, message: "Accepted without CAPTCHA" },
      },
    });
  });
  await page.goto("/forms");
  const form = page.locator("form").first();
  await form.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(form.getByText("This field is required").first()).toBeVisible();
  expect(submitted).toBeUndefined();
  await form.getByLabel("Your name").fill("Synthetic Visitor");
  await form.getByLabel("Email address").fill("synthetic@example.com");
  await form.getByLabel("How can we help?").fill("No CAPTCHA configured");
  await form.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(form.getByText("Accepted without CAPTCHA")).toBeVisible();
  expect(submitted).toMatchObject({ token: "", id: "contact" });
  expect(captchaRequests).toBe(0);
});
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
}, testInfo) => {
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
  await chooseTemplate(page);
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
    path: testInfo.outputPath("builder.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByLabel("Full name")).toBeVisible();
});
test("field sidebar edits survive switching sections and adding fields to a blank canvas", async ({
  page,
}) => {
  await page.route("**/quixforms/list", (r) =>
    r.fulfill({ json: { success: true, data: { items: [] } } }),
  );
  const saves: any[] = [];
  await page.route("**/quixforms/save", (r) => {
    saves.push(r.request().postDataJSON());
    return r.fulfill({
      json: {
        success: true,
        data: { ok: true, revision: String(saves.length) },
      },
    });
  });
  await page.goto("/builder");
  await chooseTemplate(page, "Blank form");
  await page
    .getByRole("button", { name: "Dropdown", exact: true })
    .dragTo(page.locator("main"));
  await page.getByText("Bulk edit choices", { exact: true }).click();
  await page.getByLabel("Choices, one per line").fill("Sales\nSupport");
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  await page.getByLabel("Placeholder", { exact: true }).fill("Choose a team");
  await page.getByLabel("Width", { exact: true }).selectOption("half");
  await page.getByRole("button", { name: "Add Fields", exact: true }).click();
  await page.getByLabel("Search fields").fill("single line");
  await page
    .getByRole("button", { name: "Single Line Text", exact: true })
    .click();
  await page.getByLabel("Label", { exact: true }).fill("Topic");
  await page.locator(".qf-select").first().click();
  await page.getByRole("button", { name: "Smart Logic", exact: true }).click();
  await page
    .getByRole("button", { name: "Add condition group" })
    .first()
    .click();
  await page.getByRole("button", { name: "General", exact: true }).click();
  await expect(page.getByLabel("Choices, one per line")).toHaveValue(
    "Sales\nSupport",
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  expect(saves.at(-1).form.fields).toMatchObject([
    {
      type: "select",
      options: ["Sales", "Support"],
      placeholder: "Choose a team",
      width: "half",
      showWhen: { op: "and" },
    },
    { type: "text", label: "Topic" },
  ]);
  await page.getByRole("button", { name: "Add Fields", exact: true }).click();
  await page.getByLabel("Search fields").fill("number");
  await page.getByRole("button", { name: "Numbers", exact: true }).click();
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  await page
    .getByLabel("Minimum value (optional)", { exact: true })
    .fill("1.5");
  await page.getByLabel("Maximum value (optional)", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  expect(saves.at(-1).form.fields[2]).toMatchObject({
    type: "number",
    min: 1.5,
    max: 10,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
test("drag and drop changes field order and autosave preserves edits made during a save", async ({
  page,
}) => {
  // Keep both cards visible for the native browser drag gesture.
  await page.setViewportSize({ width: 1280, height: 1100 });
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
  await chooseTemplate(page);
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
    .getByRole("button", { name: "Confirmations", exact: true })
    .click();
  await page
    .getByLabel("Confirmation message")
    .fill("Your request is recorded.");
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Appearance", exact: true })
    .selectOption("boxed");
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add notification", exact: true })
    .click();
  await page
    .getByLabel("Recipient", { exact: true })
    .fill("support@example.com");
  await page.getByLabel("Enabled", { exact: true }).check();
  await page
    .getByLabel("Message body", { exact: true })
    .fill(
      "New request for {form_title}\n\n{all_fields}\nReference: {entry_reference}",
    );
  await page
    .getByRole("button", { name: "Add condition group", exact: true })
    .click();
  await page
    .getByLabel("Condition field", { exact: true })
    .selectOption("email");
  await page.getByLabel("Operator", { exact: true }).selectOption("contains");
  await page
    .getByLabel("Comparison value", { exact: true })
    .fill("@example.com");

  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  expect(current.appearance).toBe("boxed");
  expect(current.confirmation).toBe("Your request is recorded.");
  expect(current.notifications).toMatchObject([
    {
      to: "support@example.com",
      enabled: true,
      body: "New request for {form_title}\n\n{all_fields}\nReference: {entry_reference}",
    },
  ]);
  expect(current.fields[2].showWhen).toEqual(form.fields[2].showWhen);
  expect(current.notifications[0].when).toEqual({
    op: "and",
    rules: [{ field: "email", op: "contains", value: "@example.com" }],
  });
  await page
    .getByRole("button", { name: "Remove condition", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  expect(current.notifications[0].when).toBeUndefined();

  await page
    .getByRole("button", { name: "Back to builder", exact: true })
    .click();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator(".quixforms")).toBeVisible();
});
test("export all follows cursors and aligns fields from historical submission schemas", async ({
  page,
}) => {
  const form = template("contact");
  const newer = {
    ...form,
    fields: [
      ...form.fields,
      { ...form.fields[0], id: "new_field", label: "New field" },
    ],
  };
  const one = {
    id: "contact_00000000-0000-4000-8000-000000000001",
    data: {
      formId: "contact",
      form,
      values: { name: "=danger", email: "first@example.com", message: "First" },
      createdAt: "2026-10-25",
      notification: "sent",
    },
  };
  const two = {
    id: "contact_00000000-0000-4000-8000-000000000002",
    data: {
      formId: "contact",
      form: newer,
      values: {
        name: "Second",
        email: "second@example.com",
        message: "Second message",
        new_field: "Historical value",
      },
      createdAt: "2026-10-25",
      notification: "skipped",
    },
  };
  await page.route("**/quixforms/list", (r) =>
    r.fulfill({
      json: {
        success: true,
        data: { items: [{ id: form.id, data: { current: form } }] },
      },
    }),
  );
  await page.route("**/quixforms/read?*", (r) =>
    r.fulfill({
      json: {
        success: true,
        data: { value: { current: form }, revision: "1" },
      },
    }),
  );
  await page.route("**/quixforms/entries?*", (r) =>
    r.fulfill({ json: { success: true, data: { items: [one] } } }),
  );
  const cursors: Array<string | null> = [];
  await page.route("**/quixforms/export?*", (r) => {
    const cursor = new URL(r.request().url()).searchParams.get("cursor");
    cursors.push(cursor);
    return r.fulfill({
      json: {
        success: true,
        data: {
          ok: true,
          json: cursor ? [two] : [one],
          cursor: cursor ? undefined : "next-export",
        },
      },
    });
  });
  await page.goto("/builder");
  await page.getByRole("button", { name: "Contact us", exact: true }).click();
  await page.getByRole("button", { name: "Entries", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export all CSV", exact: true })
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("quixforms-contact-all.csv");
  const stream = await download.createReadStream();
  let content = "";
  for await (const chunk of stream!) content += chunk.toString();
  expect(cursors).toEqual([null, "next-export"]);
  expect(content).toContain("'=danger");
  expect(content).toContain("New field [new_field]");
  expect(content).toContain("Historical value");
  expect(content.split("\r\n")).toHaveLength(3);
  await expect(page.getByRole("status")).toContainText("Exported 2 entries");
});
test("public controls and builder pass automated WCAG A/AA checks", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const { registry, fieldTypes } = await import(
    "../../packages/core/src/index"
  );
  const form = template("accessible");
  form.fields = fieldTypes
    .filter((t) => t !== "page")
    .map((t) => registry[t].create("field_" + t));
  await page.route("https://challenges.cloudflare.com/**", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: `window.turnstile={render(el,options){options.callback('test');return '1'},remove(){},reset(){}};`,
    }),
  );
  await page.route("**/quixforms/definition?*", (r) =>
    r.fulfill({
      json: { success: true, data: { ok: true, form, siteKey: "test" } },
    }),
  );
  await page.goto("/forms");
  await page
    .getByRole("button", { name: "Submit", exact: true })
    .first()
    .waitFor();
  const publicResult = await new AxeBuilder({ page })
    .include(".quixforms")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(publicResult.violations).toEqual([]);
  await page.route("**/quixforms/list", (r) =>
    r.fulfill({ json: { success: true, data: { items: [] } } }),
  );
  await page.route("**/quixforms/save", (r) =>
    r.fulfill({ json: { success: true, data: { ok: true, revision: "1" } } }),
  );
  await page.goto("/builder");
  await chooseTemplate(page);
  await page.locator(".qf-select").first().click();
  const builderResult = await new AxeBuilder({ page })
    .include(".qf-builder")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(builderResult.violations).toEqual([]);
});
