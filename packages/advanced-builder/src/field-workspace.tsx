import React, { useState } from "react";
import { fieldTypes, type Form, type Field } from "@emquix/quixforms-engine";
import { FormView } from "@emquix/quixforms-astro";
import { FieldOptions, FieldShape, fieldLabels } from "./field-options";
const groups: Array<{ name: string; types: Field["type"][] }> = [
  {
    name: "Standard Fields",
    types: [
      "text",
      "paragraph",
      "name",
      "email",
      "number",
      "select",
      "radio",
      "checkboxes",
    ],
  },
  { name: "Advanced Fields", types: ["phone", "url", "consent", "hidden"] },
  { name: "Layout Fields", types: ["content", "section", "page"] },
];
const symbols: Record<Field["type"], string> = {
  text: "T",
  paragraph: "¶",
  name: "Aa",
  email: "@",
  number: "#",
  select: "⌄",
  radio: "◉",
  checkboxes: "☑",
  phone: "☎",
  url: "↗",
  consent: "✓",
  hidden: "◌",
  content: "≡",
  section: "—",
  page: "↵",
};
export function FieldWorkspace({
  form,
  selected,
  onSelect,
  preview,
  busy,
  onChange,
  onAdd,
  onMove,
  onDuplicate,
  onDelete,
}: {
  form: Form;
  selected: string;
  onSelect: (id: string) => void;
  preview: boolean;
  busy: boolean;
  onChange: (form: Form) => void;
  onAdd: (type: Field["type"], index?: number) => void;
  onMove: (from: number, to: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [sidebar, setSidebar] = useState<"fields" | "options">(
      selected ? "options" : "fields",
    ),
    [search, setSearch] = useState(""),
    [mobile, setMobile] = useState(false),
    [previewKey, setPreviewKey] = useState(0);
  const field = form.fields.find((f) => f.id === selected);
  const matches = (type: Field["type"]) =>
    `${type} ${fieldLabels[type]}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
  function select(id: string) {
    onSelect(id);
    setSidebar("options");
  }
  function add(type: Field["type"], index?: number) {
    onAdd(type, index);
    setSidebar("options");
  }
  function drop(e: React.DragEvent, index: number) {
    if (preview) return;
    e.preventDefault();
    e.stopPropagation();
    const [kind, value] = e.dataTransfer.getData("text/plain").split(":");
    if (kind === "new" && fieldTypes.includes(value as Field["type"]))
      add(value as Field["type"], index);
    if (
      kind === "move" &&
      /^\d+$/.test(value) &&
      Number(value) < form.fields.length
    )
      onMove(Number(value), Math.min(index, form.fields.length - 1));
  }
  if (preview)
    return (
      <div className="qf-preview-view">
        <div className="qf-preview-controls">
          <div>
            <h1>Form preview</h1>
            <p>
              Try validation, Smart Logic and page navigation. No entries or
              emails are created here.
            </p>
          </div>
          <div role="group" aria-label="Preview device">
            <button aria-pressed={!mobile} onClick={() => setMobile(false)}>
              Desktop
            </button>
            <button aria-pressed={mobile} onClick={() => setMobile(true)}>
              Mobile
            </button>
            <button onClick={() => setPreviewKey((key) => key + 1)}>
              Reset preview
            </button>
          </div>
        </div>
        <div
          className={"qf-preview-sheet" + (mobile ? " qf-preview-mobile" : "")}
        >
          <FormView
            key={form.id + ":" + previewKey}
            form={form}
            onSubmit={async () => form.confirmation}
          />
        </div>
      </div>
    );
  return (
    <div className="qf-workspace">
      <div
        className="qf-sidebar-tabs"
        role="group"
        aria-label="Builder sidebar"
      >
        <button
          aria-pressed={sidebar === "fields"}
          onClick={() => setSidebar("fields")}
        >
          Add Fields
        </button>
        <button
          aria-pressed={sidebar === "options"}
          onClick={() => setSidebar("options")}
        >
          Field Options
        </button>
      </div>
      <div className="qf-panels">
        <aside className="qf-palette" hidden={sidebar !== "fields"}>
          <input
            type="search"
            aria-label="Search fields"
            placeholder="Search fields…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {groups.map((group) => {
            const types = group.types.filter(matches);
            return types.length ? (
              <div className="qf-palette-group" key={group.name}>
                <h2>{group.name}</h2>
                <div className="qf-field-library">
                  {types.map((type) => (
                    <button
                      key={type}
                      disabled={busy || form.fields.length >= 100}
                      draggable={form.fields.length < 100}
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", "new:" + type)
                      }
                      onClick={() => add(type)}
                    >
                      <span className="qf-field-symbol" aria-hidden="true">
                        {symbols[type]}
                      </span>
                      {fieldLabels[type]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null;
          })}
          {!fieldTypes.some(matches) && (
            <p className="qf-library-help">
              No matching fields. Try a different search.
            </p>
          )}
          <p className="qf-library-help">
            {form.fields.length}/100 fields. Click to add, or drag a field onto
            the form.
          </p>
        </aside>
        <main
          className="qf-form-canvas"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => drop(e, form.fields.length)}
        >
          <h2>{form.title}</h2>
          {!form.fields.length && (
            <div className="qf-canvas-empty">
              <span aria-hidden="true">+</span>
              <h3>Your form starts here</h3>
              <p>Click or drag a field from the left panel.</p>
            </div>
          )}
          {form.fields.map((f, index) => (
            <article
              key={f.id}
              className={
                (selected === f.id ? "qf-field-selected " : "") +
                "qf-editor-field qf-editor-" +
                f.width
              }
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData("text/plain", "move:" + index)
              }
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => drop(e, index)}
            >
              <button
                className="qf-select"
                draggable
                aria-pressed={selected === f.id}
                onClick={() => select(f.id)}
              >
                <span className="qf-field-label">
                  {f.label}
                  {f.required && <span className="qf-required"> *</span>}
                </span>
                <FieldShape field={f} />
                {f.description && f.type !== "content" && (
                  <span className="qf-field-description">{f.description}</span>
                )}
                <small>
                  {fieldLabels[f.type]}
                  {f.showWhen ? " · Conditional" : ""}
                </small>
              </button>
              <div className="qf-field-actions">
                <span aria-hidden="true" className="qf-drag-grip">
                  ⠿
                </span>
                <button
                  aria-label={"Move " + f.label + " up"}
                  disabled={index === 0}
                  onClick={() => onMove(index, index - 1)}
                >
                  ↑
                </button>
                <button
                  aria-label={"Move " + f.label + " down"}
                  disabled={index === form.fields.length - 1}
                  onClick={() => onMove(index, index + 1)}
                >
                  ↓
                </button>
                <button
                  disabled={form.fields.length >= 100}
                  aria-label={"Duplicate " + f.label}
                  onClick={() => {
                    onDuplicate(f.id);
                    setSidebar("options");
                  }}
                >
                  Duplicate
                </button>
                <button
                  aria-label={"Delete " + f.label}
                  onClick={() => onDelete(f.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          <div className="qf-canvas-footer">
            <span className="qf-submit-shape">Submit</span>
            <small>
              Drag fields to reorder. Select a field to edit its options.
            </small>
          </div>
        </main>
        <aside className="qf-inspector" hidden={sidebar !== "options"}>
          {field ? (
            <FieldOptions
              key={field.id}
              field={field}
              fields={form.fields}
              onChange={(patch) =>
                onChange({
                  ...form,
                  fields: form.fields.map((f) =>
                    f.id === field.id ? { ...f, ...patch } : f,
                  ),
                })
              }
            />
          ) : (
            <div className="qf-option-body">
              <h2>Field Options</h2>
              <p>Select a field in the form to customize it.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
