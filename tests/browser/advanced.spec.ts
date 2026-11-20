import { test, expect, type Page } from "@playwright/test";
import { template, type Form } from "../../packages/core/src/index";

async function mockExisting(page: Page, form = template("contact")) {
  await page.route("**/quixforms/list", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { items: [{ id: form.id, data: { current: form } }] },
      },
    }),
  );
  await page.route("**/quixforms/read?*", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { value: { current: form, history: [] }, revision: "1" },
      },
    }),
  );
  await page.route("**/quixforms/setup", (route) =>
    route.fulfill({
      json: { success: true, data: { turnstileConfigured: true } },
    }),
  );
  await page.goto("/builder");
  await page.getByRole("button", { name: form.title, exact: true }).click();
}

test("template gallery searches, previews without storing answers, creates a named form and reopens it", async ({
  page,
}, testInfo) => {
  let current: Form | undefined,
    submissions = 0;
  await page.route("**/quixforms/list", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { items: current ? [{ id: current.id, data: { current } }] : [] },
      },
    }),
  );
  await page.route("**/quixforms/read?*", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { value: { current, history: [] }, revision: "1" },
      },
    }),
  );
  await page.route("**/quixforms/save", (route) => {
    current = route.request().postDataJSON().form;
    return route.fulfill({
      json: { success: true, data: { ok: true, revision: "1" } },
    });
  });
  await page.route("**/quixforms/submit", (route) => {
    submissions++;
    return route.abort();
  });
  await page.goto("/builder");
  await page.getByRole("button", { name: "Add New", exact: true }).click();
  await page.getByLabel("Name your form").fill("Our newsletter");
  await page.getByRole("button", { name: "Marketing", exact: true }).click();
  await page.getByLabel("Search templates").fill("newsletter");
  await expect(page.locator(".qf-template-card")).toHaveCount(1);
  await page.screenshot({
    path: testInfo.outputPath("template-gallery.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Preview Newsletter Signup", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email address").fill("preview@example.com");
  await dialog.getByLabel("I want to receive the newsletter").check();
  await dialog.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(
    dialog.getByText("Preview complete. No entry was created."),
  ).toBeVisible();
  expect(current).toBeUndefined();
  expect(submissions).toBe(0);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", {
      name: "Use template Newsletter Signup",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Form name")).toHaveValue("Our newsletter");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.getByRole("button", { name: "All forms", exact: true }).click();
  await page.getByRole("button", { name: "Published", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Our newsletter", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Drafts", exact: true }).click();
  await page.getByLabel("Search forms").fill("newsletter");
  await page
    .getByRole("button", { name: "Our newsletter", exact: true })
    .click();
  await expect(page.locator(".qf-select")).toHaveCount(3);
});

test("publishing preserves edits made in flight and undo never silently unpublishes", async ({
  page,
}) => {
  await page.clock.install();
  const saves: Array<{ form: Form; revision: string }> = [];
  let release: (() => void) | undefined;
  await page.route("**/quixforms/save", async (route) => {
    saves.push(route.request().postDataJSON());
    if (saves.length === 1)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    await route.fulfill({
      json: {
        success: true,
        data: { ok: true, revision: String(saves.length + 1) },
      },
    });
  });
  await mockExisting(page);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect.poll(() => saves.length).toBe(1);
  await page.locator(".qf-select").first().click();
  await page
    .getByLabel("Label", { exact: true })
    .fill("Changed while publishing");
  release!();
  await expect(page.getByRole("status")).toContainText(
    "Newer edits are still unsaved",
  );
  await expect(
    page.getByRole("button", { name: "Save published", exact: true }),
  ).toBeEnabled();
  await page.clock.fastForward(2000);
  expect(saves).toHaveLength(1);
  expect(saves[0].form.status).toBe("published");
  expect(saves[0].form.fields[0].label).toBe("Your name");
  await page
    .getByRole("button", { name: "Save published", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  expect(saves[1]).toMatchObject({
    revision: "2",
    form: { status: "published" },
  });
  expect(saves[1].form.fields[0].label).toBe("Changed while publishing");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page
    .getByRole("button", { name: "Save published", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  expect(saves[2].form.status).toBe("published");
  expect(saves[2].form.fields[0].label).toBe("Your name");
});

test("publish conflicts retain the draft and embed dialog reports setup without trapping focus after close", async ({
  page,
}) => {
  await page.route("**/quixforms/save", (route) =>
    route.fulfill({
      json: { success: true, data: { ok: false, error: "CONFLICT" } },
    }),
  );
  await mockExisting(page);
  await page.locator(".qf-select").first().click();
  await page.getByLabel("Label", { exact: true }).fill("Unsaved local label");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Another editor changed this form",
  );
  await expect(page.getByLabel("Label", { exact: true })).toHaveValue(
    "Unsaved local label",
  );
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Embed", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Turnstile keys are configured.", { exact: false }),
  ).toBeVisible();
  await expect(dialog.locator("code")).toContainText(
    "@emquix/quixforms-astro/Form.astro",
  );
  await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Embed", exact: true }),
  ).toBeFocused();
});

test("choice rows, preview completion and full-screen mode work without submitting an entry", async ({
  page,
}) => {
  const form = template("choice_editor");
  form.fields = [
    {
      id: "team",
      type: "select",
      label: "Team",
      options: ["Sales", "Support"],
      required: true,
      description: "",
      placeholder: "",
      width: "full",
    },
  ];
  const saves: Form[] = [];
  let submissions = 0;
  await page.route("**/quixforms/save", (route) => {
    saves.push(route.request().postDataJSON().form);
    return route.fulfill({
      json: {
        success: true,
        data: { ok: true, revision: String(saves.length + 1) },
      },
    });
  });
  await page.route("**/quixforms/submit", (route) => {
    submissions++;
    return route.abort();
  });
  await mockExisting(page, form);
  await page.locator(".qf-select").first().click();
  await page.getByRole("button", { name: "Add choice", exact: true }).click();
  await page.getByLabel("Choice 3", { exact: true }).fill("Billing");
  await page
    .getByRole("button", { name: "Move choice 3 up", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove choice 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  expect(saves.at(-1)!.fields[0].options).toEqual(["Billing", "Support"]);
  await page
    .getByRole("button", { name: "Enter full screen", exact: true })
    .click();
  await expect(page.locator(".qf-fullscreen")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".qf-fullscreen")).toHaveCount(0);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await page.getByLabel("Team").selectOption("Billing");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(
    page.getByText(form.confirmation, { exact: true }),
  ).toBeVisible();
  expect(submissions).toBe(0);
  await page
    .getByRole("button", { name: "Reset preview", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Submit", exact: true }),
  ).toBeEnabled();
});

test("gallery, settings and embed dialog pass automated accessibility checks", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.route("**/quixforms/list", (route) =>
    route.fulfill({ json: { success: true, data: { items: [] } } }),
  );
  await page.route("**/quixforms/save", (route) =>
    route.fulfill({
      json: { success: true, data: { ok: true, revision: "1" } },
    }),
  );
  await page.route("**/quixforms/setup", (route) =>
    route.fulfill({
      json: { success: true, data: { turnstileConfigured: false } },
    }),
  );
  await page.goto("/builder");
  await page.getByRole("button", { name: "Add New", exact: true }).click();
  const scan = async (selector: string) =>
    expect(
      (
        await new AxeBuilder({ page })
          .include(selector)
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  await scan(".qf-library");
  await page
    .getByRole("button", {
      name: "Use template Simple Contact Form",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await scan(".qf-advanced");
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await scan(".qf-advanced");
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add notification", exact: true })
    .click();
  await scan(".qf-advanced");
  await page
    .getByRole("button", { name: "Spam Protection", exact: true })
    .click();
  await expect(page.getByText("CAPTCHA off", { exact: true })).toBeVisible();
  await scan(".qf-advanced");
  await page.getByRole("button", { name: "Embed", exact: true }).click();
  await scan(".qf-modal");
});

test("revision restore locks competing edits and reopens the saved draft", async ({
  page,
}) => {
  const current = template("restore"),
    older = { ...template("restore"), title: "Earlier definition" };
  let restored = false,
    saves = 0,
    release: (() => void) | undefined;
  await page.route("**/quixforms/list", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { items: [{ id: current.id, data: { current } }] },
      },
    }),
  );
  await page.route("**/quixforms/read?*", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          value: { current: restored ? older : current, history: [older] },
          revision: restored ? "2" : "1",
        },
      },
    }),
  );
  await page.route("**/quixforms/revisions/restore", async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    restored = true;
    await route.fulfill({
      json: { success: true, data: { ok: true, revision: "2" } },
    });
  });
  await page.route("**/quixforms/save", (route) => {
    saves++;
    return route.fulfill({
      json: { success: true, data: { ok: true, revision: "3" } },
    });
  });
  await page.goto("/builder");
  await page.getByRole("button", { name: current.title, exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Revisions", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Restore draft", exact: true })
    .click();
  await expect.poll(() => typeof release).toBe("function");
  await expect(
    page.getByRole("button", { name: "Fields", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Restoring…", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Control+s");
  expect(saves).toBe(0);
  release!();
  await expect(page.getByLabel("Form name")).toHaveValue("Earlier definition");
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeEnabled();
});
