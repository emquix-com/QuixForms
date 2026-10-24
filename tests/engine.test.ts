import { describe, it, expect } from "vitest";
import {
  parseForm,
  template,
  validate,
  evaluate,
  csvCell,
  registry,
  fieldTypes,
} from "../packages/core/src/index";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { FormView } from "../packages/astro/src/index";
describe("shared engine", () => {
  it("roundtrips the template without data loss", () => {
    const f = template("contact");
    expect(parseForm(JSON.parse(JSON.stringify(f)))).toEqual(f);
  });
  it("rejects unexpected configuration", () =>
    expect(() => parseForm({ ...template("contact"), admin: true })).toThrow());
  it("rejects unknown schema versions", () =>
    expect(() =>
      parseForm({ ...template("contact"), schemaVersion: 2 }),
    ).toThrow());
  it("rejects duplicate IDs", () => {
    const f = template("contact");
    f.fields.push(f.fields[0]);
    expect(() => parseForm(f)).toThrow();
  });
  it("rejects cycles and dangling references", () => {
    const f = template("contact");
    f.fields[0].showWhen = { field: "name", op: "eq", value: "x" };
    expect(() => parseForm(f)).toThrow("Circular");
    f.fields[0].showWhen.field = "missing";
    expect(() => parseForm(f)).toThrow("Unknown");
  });
  it("does not enforce required or store spoofed values on hidden fields", () => {
    const f = template("contact");
    f.fields[2].showWhen = { field: "name", op: "eq", value: "Alice" };
    const r = validate(parseForm(f), {
      name: "Bob",
      email: "bob@example.com",
      message: "spoofed",
      admin: true,
    });
    expect(r.errors).toEqual({});
    expect(r.values).toEqual({ name: "Bob", email: "bob@example.com" });
  });
  it("strips transitive hidden values regardless of field order", () => {
    const f = template("contact");
    f.fields[0].showWhen = {
      field: "email",
      op: "eq",
      value: "alice@example.com",
    };
    f.fields[2].showWhen = { field: "name", op: "eq", value: "Alice" };
    expect(
      validate(parseForm(f), {
        name: "Alice",
        email: "bob@example.com",
        message: "secret",
      }).values,
    ).toEqual({ email: "bob@example.com" });
  });
  it("rejects malformed field values", () => {
    expect(
      validate(template("contact"), { name: 42, email: "bad", message: [] })
        .errors,
    ).toHaveProperty("email");
  });
  it("evaluates nested conditions without coercing numeric types", () => {
    expect(
      evaluate(
        {
          op: "and",
          rules: [
            { field: "n", op: "gt", value: 2 },
            {
              op: "or",
              rules: [
                { field: "x", op: "selected", value: "a" },
                { field: "y", op: "empty" },
              ],
            },
          ],
        },
        { n: 3, x: ["a"] },
      ),
    ).toBe(true);
    expect(evaluate({ field: "n", op: "gt", value: 2 }, { n: "3" })).toBe(
      false,
    );
  });
  it.each(["=SUM(A1)", " +cmd", "@x", "-1", "\tformula"])(
    "neutralizes CSV formula %s",
    (v) => expect(csvCell(v)).toMatch(/^"'/),
  );
  it("quotes CSV quotes and newlines", () =>
    expect(csvCell('a"b\nc')).toBe('"a""b\nc"'));
  it("escapes stored HTML in the shared renderer", () => {
    const f = template("contact", "<script>alert(1)</script>");
    const html = renderToStaticMarkup(createElement(FormView, { form: f }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
  it.each(fieldTypes)(
    "renders and accepts the configuration for %s",
    (type) => {
      const f = template("contact");
      f.fields = [registry[type].create("field")];
      expect(() => parseForm(f)).not.toThrow();
      expect(() =>
        renderToStaticMarkup(createElement(FormView, { form: f })),
      ).not.toThrow();
    },
  );
});
it("skips hidden page and section descendants on the server", () => {
  const f = template("contact");
  f.fields = [
    f.fields[0],
    {
      ...registry.page.create("page_two"),
      showWhen: { field: "name", op: "eq", value: "Alice" },
    },
    { ...registry.text.create("private_answer"), required: true },
    registry.page.create("page_three"),
    registry.text.create("public_answer"),
  ];
  const result = validate(parseForm(f), {
    name: "Bob",
    private_answer: "spoof",
    public_answer: "kept",
  });
  expect(result.errors).toEqual({});
  expect(result.values).toEqual({ name: "Bob", public_answer: "kept" });
  f.fields[1].type = "section";
  f.fields[3].type = "section";
  expect(
    validate(parseForm(f), { name: "Bob", private_answer: "spoof" }).values,
  ).toEqual({ name: "Bob" });
});
it("rejects a group whose visibility depends on its own descendants", () => {
  const f = template("contact");
  f.fields = [
    {
      ...registry.page.create("page"),
      showWhen: { field: "name", op: "notEmpty" },
    },
    f.fields[0],
  ];
  expect(() => parseForm(f)).toThrow("Circular");
});
