import React, { useEffect, useState } from "react";
import type { Form } from "@emquix/quixforms-engine";
import { api } from "./api";
export function Settings({
  form,
  revision,
  onChange,
  onRestored,
  onClose,
  onSave,
  saveMessage,
  busy,
}: {
  form: Form;
  revision: string | null;
  onChange: (f: Form) => void;
  onRestored: (f: Form, revision: string) => void;
  onClose: () => void;
  onSave: () => void;
  saveMessage: string;
  busy: boolean;
}) {
  const [history, setHistory] = useState<Form[]>([]),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (revision)
      api("read?id=" + form.id)
        .then((r) => setHistory(r.value.history))
        .catch(() => setMessage("Could not load revisions."));
  }, [form.id, revision]);
  const editNotification = (
    i: number,
    patch: Partial<Form["notifications"][number]>,
  ) =>
    onChange({
      ...form,
      notifications: form.notifications.map((n, j) =>
        i === j ? { ...n, ...patch } : n,
      ),
    });
  return (
    <section className="qf-builder">
      <header>
        <h1>Form settings</h1>
        <button onClick={onClose}>Back to builder</button>
        <button disabled={busy} onClick={onSave}>
          Save settings
        </button>
      </header>
      <p role="status">{message || saveMessage}</p>
      <label>
        Confirmation message
        <textarea
          value={form.confirmation}
          onChange={(e) => onChange({ ...form, confirmation: e.target.value })}
        />
      </label>
      <label>
        Appearance
        <select
          value={form.appearance}
          onChange={(e) =>
            onChange({
              ...form,
              appearance: e.target.value as Form["appearance"],
            })
          }
        >
          {["minimal", "modern", "classic", "boxed"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <h2>Email notifications</h2>
      <p>
        Use your configured EmDash email provider. Recipients are fixed
        administrator-approved addresses. Existing conditional rules are
        preserved.
      </p>
      {form.notifications.map((n, i) => (
        <fieldset key={i}>
          <legend>Notification {i + 1}</legend>
          <label>
            Recipient
            <input
              type="email"
              value={n.to}
              onChange={(e) => editNotification(i, { to: e.target.value })}
            />
          </label>
          <label>
            Subject
            <input
              value={n.subject}
              onChange={(e) => editNotification(i, { subject: e.target.value })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={n.enabled !== false}
              onChange={(e) =>
                editNotification(i, { enabled: e.target.checked })
              }
            />
            Enabled
          </label>
          <button
            onClick={() =>
              onChange({
                ...form,
                notifications: form.notifications.filter((_, j) => i !== j),
              })
            }
          >
            Remove notification
          </button>
        </fieldset>
      ))}
      {form.notifications.length < 5 && (
        <button
          onClick={() =>
            onChange({
              ...form,
              notifications: [
                ...form.notifications,
                { to: "", subject: "New QuixForms submission", enabled: false },
              ],
            })
          }
        >
          Add notification
        </button>
      )}
      <h2>Saved revisions</h2>
      <p>
        Restoring makes the form a draft and unpublishes it. Existing entries
        are retained.
      </p>
      {history.map((snapshot, index) => (
        <p key={index}>
          {index + 1}. {snapshot.title} · {snapshot.fields.length} fields{" "}
          <button
            onClick={async () => {
              if (
                !window.confirm(
                  "Restore this revision as a draft? Current unsaved changes will be discarded and the form unpublished.",
                )
              )
                return;
              try {
                const result = await api("revisions/restore", {
                  id: form.id,
                  revision,
                  index,
                });
                if (!result.ok)
                  throw new Error(
                    "Revision conflict. Reload before restoring.",
                  );
                const row = await api("read?id=" + form.id);
                onRestored(row.value.current, row.revision);
                onClose();
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Restore failed");
              }
            }}
          >
            Restore draft
          </button>
        </p>
      ))}
    </section>
  );
}
