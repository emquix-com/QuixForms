import React, { useState } from "react";
import type { Field } from "@emquix/quixforms-engine";
import { Logic } from "./logic";

export const fieldLabels: Record<Field["type"], string> = {
  text: "Single Line Text",
  paragraph: "Paragraph Text",
  email: "Email",
  name: "Name",
  phone: "Phone",
  url: "Website / URL",
  number: "Numbers",
  select: "Dropdown",
  radio: "Multiple Choice",
  checkboxes: "Checkboxes",
  consent: "Consent",
  hidden: "Hidden Field",
  content: "Content",
  section: "Section Divider",
  page: "Page Break",
};

export function FieldOptions({
  field,
  fields,
  onChange,
}: {
  field: Field;
  fields: Field[];
  onChange: (patch: Partial<Field>) => void;
}) {
  const [tab, setTab] = useState("General");
  const valueField = !["content", "section", "page", "hidden"].includes(
    field.type,
  );
  const placeholderField = [
    "text",
    "paragraph",
    "name",
    "email",
    "phone",
    "url",
    "number",
    "select",
  ].includes(field.type);
  function moveChoice(from: number, to: number) {
    const options = [...field.options];
    options.splice(to, 0, options.splice(from, 1)[0]);
    onChange({ options });
  }
  return (
    <div className="qf-options">
      <div className="qf-inspector-title">
        <strong>{fieldLabels[field.type]}</strong>
        <small>Customize this field</small>
      </div>
      <div
        className="qf-option-tabs"
        role="group"
        aria-label="Field option sections"
      >
        {["General", "Advanced", "Smart Logic"].map((name) => (
          <button
            key={name}
            aria-pressed={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "General" && (
        <div className="qf-option-body">
          <label>
            Label
            <input
              maxLength={200}
              value={field.label}
              onChange={(e) => onChange({ label: e.target.value })}
            />
          </label>
          {["select", "radio", "checkboxes"].includes(field.type) && (
            <fieldset className="qf-choice-editor">
              <legend>Choices</legend>
              {field.options.map((option, index) => (
                <div className="qf-choice-row" key={index}>
                  <input
                    aria-label={"Choice " + (index + 1)}
                    maxLength={200}
                    value={option}
                    onChange={(e) =>
                      onChange({
                        options: field.options.map((old, i) =>
                          i === index ? e.target.value : old,
                        ),
                      })
                    }
                  />
                  <button
                    aria-label={"Move choice " + (index + 1) + " up"}
                    disabled={index === 0}
                    onClick={() => moveChoice(index, index - 1)}
                  >
                    ↑
                  </button>
                  <button
                    aria-label={"Move choice " + (index + 1) + " down"}
                    disabled={index === field.options.length - 1}
                    onClick={() => moveChoice(index, index + 1)}
                  >
                    ↓
                  </button>
                  <button
                    aria-label={"Remove choice " + (index + 1)}
                    disabled={field.options.length <= 1}
                    onClick={() =>
                      onChange({
                        options: field.options.filter((_, i) => i !== index),
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                disabled={field.options.length >= 100}
                onClick={() => {
                  let count = field.options.length + 1;
                  while (field.options.includes("Option " + count)) count++;
                  onChange({ options: [...field.options, "Option " + count] });
                }}
              >
                Add choice
              </button>
              <details className="qf-bulk-choices">
                <summary>Bulk edit choices</summary>
                <label>
                  Choices, one per line
                  <textarea
                    rows={5}
                    value={field.options.join("\n")}
                    onChange={(e) =>
                      onChange({ options: e.target.value.split("\n") })
                    }
                  />
                </label>
              </details>
            </fieldset>
          )}
          <label>
            Description
            <textarea
              maxLength={1000}
              rows={3}
              value={field.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </label>
          {valueField && (
            <label className="qf-toggle-label">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => onChange({ required: e.target.checked })}
              />
              Required
            </label>
          )}
        </div>
      )}
      {tab === "Advanced" && (
        <div className="qf-option-body">
          {field.type === "number" &&
            (["min", "max"] as const).map((bound) => (
              <label key={bound}>
                {bound === "min"
                  ? "Minimum value (optional)"
                  : "Maximum value (optional)"}
                <input
                  type="number"
                  step="any"
                  value={field[bound] ?? ""}
                  onChange={(e) =>
                    onChange({
                      [bound]:
                        e.target.value === ""
                          ? undefined
                          : e.target.valueAsNumber,
                    })
                  }
                />
              </label>
            ))}
          {placeholderField && (
            <label>
              Placeholder
              <input
                maxLength={200}
                value={field.placeholder}
                onChange={(e) => onChange({ placeholder: e.target.value })}
              />
            </label>
          )}
          {valueField && (
            <label>
              Width
              <select
                aria-label="Width"
                value={field.width}
                onChange={(e) =>
                  onChange({ width: e.target.value as Field["width"] })
                }
              >
                <option value="full">Full width</option>
                <option value="half">Half width</option>
                <option value="third">One third</option>
              </select>
            </label>
          )}
          {!valueField && (
            <p className="qf-muted">
              {field.type === "hidden"
                ? "Hidden fields have no visible input. Supply their values from your custom front end."
                : "Layout fields organize your content. Configure their visibility under Smart Logic."}
            </p>
          )}
        </div>
      )}
      {tab === "Smart Logic" && (
        <div className="qf-option-body">
          <h3>Show this field when</h3>
          <Logic
            rule={field.showWhen}
            fields={fields.filter((f) => f.id !== field.id)}
            onChange={(rule) => onChange({ showWhen: rule })}
          />
          {valueField && (
            <>
              <h3>Require this field when</h3>
              <Logic
                rule={field.requiredWhen}
                fields={fields.filter((f) => f.id !== field.id)}
                onChange={(rule) => onChange({ requiredWhen: rule })}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Noninteractive field shapes keep the editor selectable without nesting real
// inputs inside buttons. Preview uses the actual shared public renderer.
export function FieldShape({ field }: { field: Field }) {
  if (["section", "page"].includes(field.type))
    return (
      <span className="qf-shape-divider" aria-hidden="true">
        {field.type === "page" ? "Next page" : ""}
      </span>
    );
  if (field.type === "hidden")
    return <span className="qf-shape-note">Hidden from visitors</span>;
  if (field.type === "content")
    return (
      <span className="qf-shape-note">
        {field.description || "Add text to your form."}
      </span>
    );
  if (["radio", "checkboxes", "consent"].includes(field.type))
    return (
      <span className="qf-shape-choices" aria-hidden="true">
        {(field.type === "consent" ? ["I agree"] : field.options).map(
          (option, i) => (
            <span key={i}>
              <i className={field.type === "radio" ? "qf-shape-radio" : ""} />
              {option}
            </span>
          ),
        )}
      </span>
    );
  return (
    <span
      aria-hidden="true"
      className={
        "qf-shape-input" +
        (field.type === "paragraph" ? " qf-shape-textarea" : "")
      }
    >
      <span>
        {field.placeholder ||
          (field.type === "select" ? "Select an option" : " ")}
      </span>
      {field.type === "select" && <span>⌄</span>}
    </span>
  );
}
