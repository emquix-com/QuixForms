import React, { useEffect, useState, useRef, useId } from "react";
import { loadTurnstile, type Turnstile } from "./turnstile";
import {
  evaluate,
  validate,
  visibleValues,
  visibility,
  type Form,
  type Values,
  type Field,
} from "../../core/src/index";
export function FieldInput({
  field: f,
  value,
  onChange,
  error,
  prefix = "",
}: {
  prefix?: string;
  field: Field;
  value: Values[string] | undefined;
  onChange: (v: Values[string]) => void;
  error?: string;
}) {
  const props = {
    id: prefix + f.id,
    "aria-describedby": prefix + f.id + "-help",
    "aria-invalid": !!error,
  };
  if (["section", "page"].includes(f.type)) return <h3>{f.label}</h3>;
  if (f.type === "content") return <p>{f.description || f.label}</p>;
  if (f.type === "hidden") return null;
  return (
    <div className={"qf-field qf-" + f.width}>
      <label htmlFor={prefix + f.id}>
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
                name={prefix + f.id}
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
      <small id={prefix + f.id + "-help"}>{error || f.description}</small>
    </div>
  );
}
export function FormView({
  form,
  onSubmit,
  children,
}: {
  children?: React.ReactNode;
  form: Form;
  onSubmit?: (values: Values) => Promise<string>;
}) {
  const prefix = useId();
  const submitting = useRef(false);
  const [values, setValues] = useState<Values>({}),
    [page, setPage] = useState(0),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [complete, setComplete] = useState(false);
  const { values: normalized, visible } = visibility(form, values);
  const pages: Field[][] = [[]];
  for (const f of form.fields) {
    if (f.type === "page") {
      if (visible.has(f.id)) pages.push([]);
    } else if (visible.has(f.id)) pages[pages.length - 1].push(f);
  }
  for (let i = pages.length - 1; i >= 0; i--)
    if (pages.length > 1 && !pages[i].length) pages.splice(i, 1);
  const active = Math.min(page, pages.length - 1);
  return (
    <form
      className="quixforms"
      onSubmit={async (e) => {
        e.preventDefault();
        if (submitting.current || complete) return;
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
        submitting.current = true;
        setBusy(true);
        try {
          setMessage(await onSubmit(checked.values));
          setComplete(true);
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to submit. Please try again.",
          );
        } finally {
          submitting.current = false;
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
            prefix={prefix}
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
      {children}
      <button disabled={busy || complete}>
        {complete
          ? "Submitted"
          : busy
            ? "Sending…"
            : active < pages.length - 1
              ? "Next"
              : "Submit"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
export function QuixForm({
  id,
  siteKey: providedSiteKey,
}: {
  id: string;
  siteKey?: string;
}) {
  const [form, setForm] = useState<Form>(),
    [siteKey, setSiteKey] = useState(providedSiteKey ?? ""),
    [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null),
    widget = useRef<{ api: Turnstile; id: string } | undefined>(undefined),
    token = useRef(""),
    attempt = useRef<{ key: string; body: string } | undefined>(undefined);
  useEffect(() => {
    const abort = new AbortController();
    setForm(undefined);
    setError("");
    attempt.current = undefined;
    fetch(
      "/_emdash/api/plugins/quixforms/definition?id=" + encodeURIComponent(id),
      { signal: abort.signal },
    )
      .then((r) => r.json())
      .then((r) => {
        if (!r.data?.ok) throw new Error();
        setForm({ ...r.data.form, notifications: [] });
        setSiteKey(providedSiteKey ?? r.data.siteKey ?? "");
      })
      .catch(() => {
        if (!abort.signal.aborted) setError("Form unavailable");
      });
    return () => abort.abort();
  }, [id, providedSiteKey]);
  useEffect(() => {
    if (!form || !siteKey || !container.current) return;
    let disposed = false;
    let current: { api: Turnstile; id: string } | undefined;
    loadTurnstile()
      .then((api) => {
        if (disposed || !container.current) return;
        current = {
          api,
          id: api.render(container.current, {
            sitekey: siteKey,
            action: "quixforms",
            callback: (value) => {
              token.current = value;
              setError("");
            },
            "expired-callback": () => {
              token.current = "";
            },
            "error-callback": () => {
              token.current = "";
              setError("Bot check failed. Please retry.");
            },
          }),
        };
        widget.current = current;
      })
      .catch((e) => {
        if (!disposed) setError(e.message);
      });
    return () => {
      disposed = true;
      token.current = "";
      if (current) current.api.remove(current.id);
      widget.current = undefined;
    };
  }, [form, siteKey]);
  if (!form) return <p role="status">{error || "Loading form…"}</p>;
  return (
    <FormView
      key={id}
      form={form}
      onSubmit={async (values) => {
        if (!token.current) throw new Error("Please complete the bot check.");
        const body = JSON.stringify(values);
        if (!attempt.current || attempt.current.body !== body)
          attempt.current = { body, key: crypto.randomUUID() };
        try {
          const response = await fetch(
            "/_emdash/api/plugins/quixforms/submit",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-EmDash-Request": "1",
              },
              body: JSON.stringify({
                id,
                values,
                key: attempt.current.key,
                token: token.current,
                website: "",
              }),
            },
          );
          const result = await response.json();
          if (!response.ok || !result.data?.ok) {
            const code = result.data?.error;
            throw new Error(
              code === "RATE_LIMIT"
                ? "Too many attempts. Please wait a minute."
                : code === "VALIDATION"
                  ? "Please check your answers. The form may have changed."
                  : code === "BOT_CHECK"
                    ? "Please complete a new bot check."
                    : "Unable to submit. Please try again.",
            );
          }
          return result.data.message;
        } finally {
          token.current = "";
          if (widget.current) widget.current.api.reset(widget.current.id);
        }
      }}
    >
      <div ref={container} />
      <p role="status">
        {error ||
          (!siteKey ? "This form needs bot protection configured." : "")}
      </p>
    </FormView>
  );
}
