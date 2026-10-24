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
    const forms = await api("list");
    assert(
      forms.items.some((x) =>
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
    const list = await api("list");
    const id = list.items.find((x) => x.data.current.title === title).id;
    const original = await api("read?id=" + id);
    await page.goto(base + "/_emdash/admin/plugins/quixforms-advanced");
    await page.getByRole("button", { name: title, exact: true }).click();
    await page.locator(".qf-select").first().click();
    await page
      .getByLabel("Label", { exact: true })
      .fill("Name changed in Advanced");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
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
    await page.goto(base + "/_emdash/admin/plugins/quixforms/forms");
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
