import { it, expect } from "vitest";
import {
  createTemplate,
  templateCatalog,
} from "../packages/core/src/templates";
import { parseForm, validate, type Values } from "../packages/core/src/index";
it.each(templateCatalog)(
  "$name creates a valid editable form and accepts appropriate input",
  (t) => {
    const form = createTemplate(t.id, "test");
    expect(parseForm(JSON.parse(JSON.stringify(form)))).toEqual(form);
    const values: Values = {};
    for (const f of form.fields) {
      values[f.id] =
        f.type === "email"
          ? "test@example.com"
          : f.type === "url"
            ? "https://example.com"
            : f.type === "consent"
              ? true
              : f.type === "number"
                ? 100
                : f.type === "checkboxes"
                  ? [f.options[0]]
                  : ["select", "radio"].includes(f.type)
                    ? f.options[0]
                    : "Sample";
    }
    expect(validate(form, values).errors).toEqual({});
  },
);
