import React, { useEffect, useState, useRef } from "react";
import {
  fieldTypes,
  registry,
  parseForm,
  template,
  type Form,
  type Field,
  type Rule,
} from "../../core/src/index";
import {
  createTemplate,
  templateCatalog,
  type TemplateId,
} from "../../core/src/templates";
import { FormView } from "../../astro/src/index";
import "../../astro/src/style.css";
import "./style.css";
import { api } from "./api";
import { Entries } from "./entries";
function Logic({
  rule,
  onChange,
  fields,
  depth = 0,
}: {
  rule?: Rule;
  onChange: (r: Rule | undefined) => void;
  fields: Field[];
  depth?: number;
}) {
  if (!rule)
    return (
      <button
        onClick={() =>
          onChange({
            op: "and",
            rules: [{ field: fields[0]?.id ?? "", op: "eq", value: "" }],
          })
        }
      >
        Add visibility rule
      </button>
    );
  if ("rules" in rule)
    return (
      <fieldset>
        <legend>Smart logic</legend>
        <select
          aria-label="Rule combination"
          value={rule.op}
          onChange={(e) =>
            onChange({ ...rule, op: e.target.value as "and" | "or" })
          }
        >
          <option value="and">All conditions</option>
          <option value="or">Any condition</option>
        </select>
        {rule.rules.map((r, i) => (
          <Logic
            key={i}
            depth={depth + 1}
            rule={r}
            fields={fields}
            onChange={(next) =>
              onChange({
                ...rule,
                rules: next
                  ? rule.rules.map((old, j) => (j === i ? next : old))
                  : rule.rules.filter((_, j) => j !== i),
              })
            }
          />
        ))}
        <button
          onClick={() =>
            onChange({
              ...rule,
              rules: [
                ...rule.rules,
                { field: fields[0]?.id ?? "", op: "eq", value: "" },
              ],
            })
          }
        >
          Add condition
        </button>
        {depth < 3 && (
          <button
            onClick={() =>
              onChange({
                ...rule,
                rules: [
                  ...rule.rules,
                  {
                    op: "or",
                    rules: [
                      { field: fields[0]?.id ?? "", op: "eq", value: "" },
                    ],
                  },
                ],
              })
            }
          >
            Add group
          </button>
        )}
        <button onClick={() => onChange(undefined)}>Remove group</button>
      </fieldset>
    );
  return (
    <div>
      <select
        aria-label="Condition field"
        value={rule.field}
        onChange={(e) => onChange({ ...rule, field: e.target.value })}
      >
        {fields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Operator"
        value={rule.op}
        onChange={(e) =>
          onChange({ ...rule, op: e.target.value as typeof rule.op })
        }
      >
        {[
          "eq",
          "ne",
          "contains",
          "notContains",
          "gt",
          "lt",
          "empty",
          "notEmpty",
          "startsWith",
          "endsWith",
          "selected",
          "notSelected",
        ].map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <input
        aria-label="Comparison value"
        value={String(rule.value ?? "")}
        onChange={(e) =>
          onChange({
            ...rule,
            value: ["gt", "lt"].includes(rule.op)
              ? Number(e.target.value)
              : e.target.value,
          })
        }
      />
      <button onClick={() => onChange(undefined)}>Remove condition</button>
    </div>
  );
}
export function Builder() {
  const [list, setList] = useState<
      Array<{ id: string; data: { current: Form } }>
    >([]),
    [form, setForm] = useState<Form>(),
    [revision, setRevision] = useState<string | null>(null),
    [selected, setSelected] = useState(""),
    [search, setSearch] = useState(""),
    [templateId, setTemplateId] = useState<TemplateId>("contact"),
    [message, setMessage] = useState(""),
    [past, setPast] = useState<Form[]>([]),
    [future, setFuture] = useState<Form[]>([]),
    [mobile, setMobile] = useState(false),
    [preview, setPreview] = useState(false),
    [showEntries, setShowEntries] = useState(false),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [autoPaused, setAutoPaused] = useState(false);
  const latest = useRef(form);
  latest.current = form;
  const saving = useRef(false);
  useEffect(() => {
    if (!form || form.status !== "draft" || !dirty || busy || autoPaused) return;
    const timer = setTimeout(() => {
      void persist();
    }, 1500);
    return () => clearTimeout(timer);
  }, [form, dirty, busy, revision, autoPaused]);
  useEffect(() => {
    api("list")
      .then((r) => setList(r.items))
      .catch((e) => setMessage(e.message));
  }, []);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function change(next: Form) {
    if (!form) return;
    setPast([...past.slice(-49), form]);
    setFuture([]);
    setForm(next);
    setDirty(true);
  }
  async function persist() {
    if (!form || saving.current) return;
    const snapshot = form;
    saving.current = true;
    setBusy(true);
    try {
      parseForm(form);
      const r = await api("save", { form, revision });
      if (!r.ok)
        throw new Error(
          r.error === "CONFLICT"
            ? "Another editor changed this form. Reopen it before saving."
            : "Check the form configuration.",
        );
      setRevision(r.revision);
      setDirty(latest.current !== snapshot);
      setAutoPaused(false);
      setMessage("Saved");
    } catch (e) {
      setAutoPaused(true);
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function move(from: number, to: number) {
    if (!form || from === to) return;
    const fields = [...form.fields];
    fields.splice(to, 0, fields.splice(from, 1)[0]);
    change({ ...form, fields });
  }
  if (!form)
    return (
      <div className="qf-builder">
        <h1>QuixForms</h1>
        <p>Powerful Forms. Effortless Building.</p>
        <label>
          Template
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value as TemplateId)}
          >
            {templateCatalog.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <p>{templateCatalog.find((t) => t.id === templateId)?.description}</p>
        <button
          onClick={() => {
            setForm(
              createTemplate(
                templateId,
                "f_" + crypto.randomUUID().replaceAll("-", ""),
              ),
            );
            setRevision(null);
            setDirty(true);
          }}
        >
          Create form
        </button>
        {list.map((x) => (
          <button
            key={x.id}
            onClick={async () => {
              try {
                const r = await api("read?id=" + x.id);
                setForm(r.value.current);
                setRevision(r.revision);
              } catch {
                setMessage("Could not open form");
              }
            }}
          >
            {x.data.current.title}
          </button>
        ))}
        <p role="status">{message}</p>
      </div>
    );
  if (showEntries)
    return <Entries formId={form.id} onBack={() => setShowEntries(false)} />;
  const field = form.fields.find((f) => f.id === selected);
  const patch = (v: Partial<Field>) =>
    change({
      ...form,
      fields: form.fields.map((f) => (f.id === selected ? { ...f, ...v } : f)),
    });
  return (
    <div className="qf-builder">
      <header>
        <input
          aria-label="Form name"
          value={form.title}
          disabled={busy}
          onChange={(e) => change({ ...form, title: e.target.value })}
        />
        <span>{dirty ? "Unsaved changes" : "Saved"}</span>
        <button
          disabled={busy || !past.length}
          onClick={() => {
            setFuture([form, ...future]);
            setForm(past.at(-1));
            setPast(past.slice(0, -1));
            setDirty(true);
          }}
        >
          Undo
        </button>
        <button
          disabled={busy || !future.length}
          onClick={() => {
            setPast([...past, form]);
            setForm(future[0]);
            setFuture(future.slice(1));
            setDirty(true);
          }}
        >
          Redo
        </button>
        <button disabled={dirty || busy} onClick={() => setShowEntries(true)}>
          Entries
        </button>
        <button onClick={() => setPreview(!preview)}>
          {preview ? "Edit" : "Preview"}
        </button>
        <button onClick={() => setMobile(!mobile)}>
          {mobile ? "Desktop" : "Mobile"}
        </button>
        <button
          disabled={busy}
          onClick={() =>
            change({
              ...form,
              status: form.status === "draft" ? "published" : "draft",
            })
          }
        >
          {form.status === "draft" ? "Mark published" : "Mark draft"}
        </button>
        <button disabled={busy} onClick={persist}>
          {busy ? "Saving…" : "Save " + form.status}
        </button>
      </header>
      <p role="status">{message}</p>
      {autoPaused && (
        <p>
          Autosave paused. Your edits are still here. Resolve the error, then
          choose Save to retry.
        </p>
      )}
      <div className="qf-panels">
        <aside>
          <h2>Fields</h2>
          <input
            aria-label="Search fields"
            placeholder="Search fields"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {fieldTypes
            .filter((t) => t.includes(search.toLowerCase()))
            .map((t) => (
              <button
                key={t}
                disabled={busy}
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/plain", "new:" + t)
                }
                onClick={() =>
                  change({
                    ...form,
                    fields: [
                      ...form.fields,
                      registry[t].create(
                        "f_" + crypto.randomUUID().replaceAll("-", ""),
                      ),
                    ],
                  })
                }
              >
                {t}
              </button>
            ))}
        </aside>
        <main style={{ maxWidth: mobile ? 390 : 800 }}>
          {preview ? (
            <FormView key={form.id} form={form} />
          ) : (
            <>
              <h2>{form.title}</h2>
              {!form.fields.length && (
                <p>Add your first field from the library.</p>
              )}
              {form.fields.map((f, i) => (
                <article
                  key={f.id}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", "move:" + i)
                  }
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const [kind, value] = e.dataTransfer
                      .getData("text/plain")
                      .split(":");
                    if (
                      kind === "move" &&
                      /^\d+$/.test(value) &&
                      Number(value) < form.fields.length
                    )
                      move(Number(value), i);
                    if (
                      kind === "new" &&
                      fieldTypes.includes(value as (typeof fieldTypes)[number])
                    ) {
                      const fields = [...form.fields];
                      fields.splice(
                        i,
                        0,
                        registry[value as (typeof fieldTypes)[number]].create(
                          "f_" + crypto.randomUUID().replaceAll("-", ""),
                        ),
                      );
                      change({ ...form, fields });
                    }
                  }}
                >
                  <button
                    className="qf-select"
                    onClick={() => setSelected(f.id)}
                  >
                    {f.label}
                    {f.required ? " *" : ""}
                    <small>{f.type}</small>
                  </button>
                  <button
                    aria-label={"Move " + f.label + " up"}
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                  >
                    ↑
                  </button>
                  <button
                    aria-label={"Move " + f.label + " down"}
                    disabled={i === form.fields.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() =>
                      change({
                        ...form,
                        fields: [
                          ...form.fields.slice(0, i + 1),
                          {
                            ...f,
                            id: "f_" + crypto.randomUUID().replaceAll("-", ""),
                          },
                          ...form.fields.slice(i + 1),
                        ],
                      })
                    }
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() =>
                      change({
                        ...form,
                        fields: form.fields.filter((x) => x.id !== f.id),
                      })
                    }
                  >
                    Delete
                  </button>
                </article>
              ))}
            </>
          )}
        </main>
        <aside>
          <h2>Field options</h2>
          {field ? (
            <>
              <label>
                Label
                <input
                  value={field.label}
                  onChange={(e) => patch({ label: e.target.value })}
                />
              </label>
              <label>
                Description
                <textarea
                  value={field.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </label>
              <label>
                Placeholder
                <input
                  value={field.placeholder}
                  onChange={(e) => patch({ placeholder: e.target.value })}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => patch({ required: e.target.checked })}
                />
                Required
              </label>
              {["select", "radio", "checkboxes"].includes(field.type) && (
                <label>
                  Choices, one per line
                  <textarea
                    value={field.options.join("\n")}
                    onChange={(e) =>
                      patch({ options: e.target.value.split("\n") })
                    }
                  />
                </label>
              )}
              <label>
                Width
                <select
                  value={field.width}
                  onChange={(e) =>
                    patch({ width: e.target.value as Field["width"] })
                  }
                >
                  <option>full</option>
                  <option>half</option>
                  <option>third</option>
                </select>
              </label>
              <Logic
                rule={field.showWhen}
                fields={form.fields.filter((f) => f.id !== field.id)}
                onChange={(r) => patch({ showWhen: r })}
              />
            </>
          ) : (
            <p>Select a field to configure it.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
export const pages = { "/": Builder };
