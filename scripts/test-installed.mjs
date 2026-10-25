// Uses an authenticated Playwright storage state from a disposable test site.
// Never commit that state: it contains an administrator session cookie.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.QF_TEST_URL ?? "http://localhost:4333";
if (!process.env.QF_TEST_SESSION)
  throw new Error(
    "Set QF_TEST_SESSION to a private Playwright storage-state file for a disposable EmDash site.",
  );
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    storageState: process.env.QF_TEST_SESSION,
  });
  const page = await context.newPage();
  const api = async (path) => {
    const response = await context.request.get(
      base + "/_emdash/api/plugins/quixforms/" + path,
      { headers: { "X-EmDash-Request": "1" } },
    );
    assert.equal(response.status(), 200);
    const envelope = await response.json();
    assert.equal(envelope.success, true);
    return envelope.data;
  };
  await page.goto(base + "/_emdash/admin/plugins/quixforms/forms");
  const welcome = page.getByRole("button", {
    name: "Get Started",
    exact: true,
  });
  if (await welcome.isVisible()) await welcome.click();
  if (process.argv.includes("--core-only")) {
    await page
      .getByRole("button", { name: "Create form", exact: true })
      .waitFor();
    assert.equal(
      await page
        .locator('a[href="/_emdash/admin/plugins/quixforms-advanced"]')
        .count(),
      0,
    );
    let forms = await api("list");
    const retained = [...forms.items];
    while (forms.cursor) {
      forms = await api("list?cursor=" + encodeURIComponent(forms.cursor));
      retained.push(...forms.items);
    }
    if (process.argv.includes("--conditions"))
      assert(
        retained.some((x) =>
          x.data.current.notifications.some(
            (n) => n.subject === "Updated in Advanced" && n.when,
          ),
        ),
        "Conditional notification must survive removal of Advanced",
      );
    assert(
      retained.some((x) =>
        x.data.current.fields.some(
          (f) => f.label === "Name changed in Advanced",
        ),
      ),
      "Previously edited form must survive removal of Advanced",
    );
    console.log(
      "PASS: Core operates alone and previously edited forms remain.",
    );
  } else {
    const title = "Acceptance " + Date.now();
    await page.getByLabel("New form name").fill(title);
    await page
      .getByRole("button", { name: "Create form", exact: true })
      .click();
    await page.getByRole("button", { name: "Publish", exact: true }).waitFor();
    if (process.argv.includes("--conditions")) {
      await page
        .getByRole("button", { name: "Notifications", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Add notification", exact: true })
        .click();
      await page
        .getByLabel("Recipient", { exact: true })
        .fill("test-inbox@example.com");
      await page
        .getByLabel("Subject", { exact: true })
        .fill("Conditional request");
      await page.getByRole("button", { name: "Add", exact: true }).click();
      await page
        .getByRole("button", { name: "Notifications", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Send conditions", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Add conditions", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Edit condition", exact: true })
        .click();
      await page
        .getByRole("combobox", { name: "Operator", exact: true })
        .click();
      await page.getByRole("option", { name: "Equals", exact: true }).click();
      await page.getByLabel("Comparison value", { exact: true }).fill("Jane");
      await page
        .getByRole("button", { name: "Save condition", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Edit condition", exact: true })
        .waitFor();
    }
    let list = await api("list");
    let item = list.items.find((x) => x.data.current.title === title);
    while (!item && list.cursor) {
      list = await api("list?cursor=" + encodeURIComponent(list.cursor));
      item = list.items.find((x) => x.data.current.title === title);
    }
    assert(item, "Created form must be listed");
    const id = item.id;
    const original = await api("read?id=" + id);
    await page.goto(base + "/_emdash/admin/plugins/quixforms-advanced");
    for (let attempts = 0; attempts < 100; attempts++) {
      try {
        await page
          .getByRole("button", { name: title, exact: true })
          .waitFor({ timeout: 1500 });
        break;
      } catch {
        const response = page.waitForResponse((r) =>
          r.url().includes("/quixforms/list"),
        );
        await page
          .getByRole("button", { name: "Load more forms", exact: true })
          .click();
        await response;
      }
    }
    await page.getByRole("button", { name: title, exact: true }).click();
    await page.locator(".qf-select").first().click();
    await page
      .getByLabel("Label", { exact: true })
      .fill("Name changed in Advanced");
    const draftSaved = page.waitForResponse(
      (response) =>
        response.url().endsWith("/quixforms/save") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await draftSaved;
    await page.getByRole("status").filter({ hasText: "Saved" }).waitFor();
    const changed = await api("read?id=" + id);
    assert.equal(
      changed.value.current.fields[0].label,
      "Name changed in Advanced",
    );
    assert.deepEqual(
      changed.value.current.fields.slice(1),
      original.value.current.fields.slice(1),
    );
    assert.deepEqual(
      changed.value.current.notifications,
      original.value.current.notifications,
    );
    if (process.argv.includes("--conditions")) {
      assert.deepEqual(changed.value.current.notifications[0].when, {
        op: "and",
        rules: [{ field: "name", op: "eq", value: "Jane" }],
      });
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page
        .getByLabel("Subject", { exact: true })
        .fill("Updated in Advanced");
      const settingsSaved = page.waitForResponse(
        (response) =>
          response.url().endsWith("/quixforms/save") &&
          response.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Save settings", exact: true })
        .click();
      await settingsSaved;
      await page.getByRole("status").filter({ hasText: "Saved" }).waitFor();
      const settings = await api("read?id=" + id);
      assert.equal(
        settings.value.current.notifications[0].subject,
        "Updated in Advanced",
      );
      assert.deepEqual(
        settings.value.current.notifications[0].when,
        original.value.current.notifications[0].when,
      );
      console.log(
        "PASS: Core-authored conditional notification survives editing in Advanced.",
      );
    }
    await page.goto(base + "/_emdash/admin/plugins/quixforms/forms");
    for (let attempts = 0; attempts < 100; attempts++) {
      try {
        await page.getByText(title, { exact: true }).waitFor({ timeout: 1500 });
        break;
      } catch {
        const response = page.waitForResponse(
          (r) =>
            r.url().includes("/quixforms/admin") &&
            r.request().method() === "POST",
        );
        await page
          .getByRole("button", { name: "Next forms", exact: true })
          .click();
        await response;
      }
    }
    await page
      .getByText(title, { exact: true })
      .locator("..")
      .getByRole("button", { name: "Edit", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Label", { exact: true }).first().inputValue(),
      "Name changed in Advanced",
    );
    if (process.argv.includes("--renderer")) {
      await page.getByRole("button", { name: "Publish", exact: true }).click();
      await page
        .getByRole("button", { name: "Unpublish", exact: true })
        .waitFor();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(base + "/forms/" + id);
      await page.getByLabel("Name changed in Advanced").waitFor();
      assert.equal(await page.getByLabel("Email address").count(), 1);
      assert.deepEqual(errors, []);
      console.log(
        "PASS: packaged Astro component dynamically renders the published Core form.",
      );
    }
    console.log(
      "PASS: Core creates → Advanced edits → Core reopens, using the installed sandbox backend.",
    );
  }
} finally {
  await browser.close();
}
