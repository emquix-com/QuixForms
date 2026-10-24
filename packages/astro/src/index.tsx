import React, { useEffect, useState } from "react";
import {
  evaluate,
  validate,
  visibleValues,
  type Form,
  type Values,
  type Field,
} from "../../core/src/index";
export function FieldInput({
  field: f,
  value,
  onChange,
  error,
}: {
  field: Field;
  value: Values[string] | undefined;
  onChange: (v: Values[string]) => void;
  error?: string;
}) {
  const props = {
    id: f.id,
    "aria-describedby": f.id + "-help",
    "aria-invalid": !!error,
  };
  if (["section", "page"].includes(f.type)) return <h3>{f.label}</h3>;
  if (f.type === "content") return <p>{f.description || f.label}</p>;
  if (f.type === "hidden") return null;
  return (
    <div className={"qf-field qf-" + f.width}>
      <label htmlFor={f.id}>
        {f.label}
        {f.required ? " *" : ""}
      </label>
      {f.type === "paragraph" ? (
        <textarea
          {...props}
          placeholder={f.placeholder}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : f.type === "select" ? (
        <select
          {...props}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Choose…</option>
          {f.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : ["radio", "checkboxes"].includes(f.type) ? (
        <fieldset {...props}>
          <legend>{f.label}</legend>
          {f.options.map((o) => (
            <label key={o}>
              <input
                type={f.type === "radio" ? "radio" : "checkbox"}
                name={f.id}
                checked={
                  f.type === "radio"
                    ? value === o
                    : Array.isArray(value) && value.includes(o)
                }
                onChange={(e) =>
                  onChange(
                    f.type === "radio"
                      ? o
                      : e.target.checked
                        ? [...(Array.isArray(value) ? value : []), o]
                        : (Array.isArray(value) ? value : []).filter(
                            (x) => x !== o,
                          ),
                  )
                }
              />
              {o}
            </label>
          ))}
        </fieldset>
      ) : f.type === "consent" ? (
        <input
          {...props}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
      ) : (
        <input
          {...props}
          type={
            (
              {
                email: "email",
                url: "url",
                number: "number",
                phone: "tel",
              } as Record<string, string>
            )[f.type] ?? "text"
          }
          placeholder={f.placeholder}
          value={String(value ?? "")}
          onChange={(e) =>
            onChange(
              f.type === "number" && e.target.value !== ""
                ? Number(e.target.value)
                : e.target.value,
            )
          }
        />
      )}
      <small id={f.id + "-help"}>{error || f.description}</small>
    </div>
  );
}
export function FormView({
  form,
  onSubmit,
}: {
  form: Form;
  onSubmit?: (values: Values) => Promise<string>;
}) {
  const [values, setValues] = useState<Values>({}),
    [page, setPage] = useState(0),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const normalized = visibleValues(form, values);
  const pages: Field[][] = [[]];
  for (const f of form.fields) {
    if (f.type === "page") {
      if (evaluate(f.showWhen, normalized)) pages.push([]);
    } else if (evaluate(f.showWhen, normalized))
      pages[pages.length - 1].push(f);
  }
  const active = Math.min(page, pages.length - 1);
  return (
    <form
      className="quixforms"
      onSubmit={async (e) => {
        e.preventDefault();
        const checked = validate(form, values);
        const relevant =
          active === pages.length - 1
            ? checked.errors
            : Object.fromEntries(
                Object.entries(checked.errors).filter(([id]) =>
                  pages[active].some((f) => f.id === id),
                ),
              );
        setErrors(relevant);
        if (Object.keys(relevant).length) return;
        if (active < pages.length - 1) {
          setPage(active + 1);
          return;
        }
        if (!onSubmit) return;
        setBusy(true);
        try {
          setMessage(await onSubmit(checked.values));
        } catch {
          setMessage("Unable to submit. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
      noValidate
    >
      <h2>{form.title}</h2>
      {pages.length > 1 && (
        <p>
          Step {active + 1} of {pages.length}
        </p>
      )}
      <div className="qf-grid">
        {pages[active].map((f) => (
          <FieldInput
            key={f.id}
            field={f}
            value={values[f.id]}
            error={errors[f.id]}
            onChange={(v) => setValues({ ...values, [f.id]: v })}
          />
        ))}
      </div>
      {active > 0 && (
        <button type="button" onClick={() => setPage(active - 1)}>
          Back
        </button>
      )}
      <button disabled={busy}>
        {busy ? "Sending…" : active < pages.length - 1 ? "Next" : "Submit"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
export function QuixForm({ id }: { id: string }) {
  const [form, setForm] = useState<Form>(),
    [error, setError] = useState("");
  useEffect(() => {
    fetch(
      "/_emdash/api/plugins/quixforms/definition?id=" + encodeURIComponent(id),
    )
      .then((r) => r.json())
      .then((r) => {
        if (!r.data?.ok) throw 0;
        setForm({ ...r.data.form, notifications: [] });
      })
      .catch(() => setError("Form unavailable"));
  }, [id]);
  if (!form) return <p role="status">{error || "Loading form…"}</p>;
  return (
    <FormView
      form={form}
      onSubmit={async (values) => {
        const token = (
          document.querySelector(
            '[name="cf-turnstile-response"]',
          ) as HTMLInputElement | null
        )?.value;
        if (!token) throw new Error("Complete the bot check");
        const r = await fetch("/_emdash/api/plugins/quixforms/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-EmDash-Request": "1",
          },
          body: JSON.stringify({
            id,
            values,
            key: crypto.randomUUID(),
            token,
            website: "",
          }),
        });
        const result = await r.json();
        if (!result.data?.ok) throw 0;
        return result.data.message;
      }}
    />
  );
}
