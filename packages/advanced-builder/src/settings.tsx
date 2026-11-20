import React, { useEffect, useState } from "react";
import type { Form } from "@emquix/quixforms-engine";
import { Logic } from "./logic";
import { api } from "./api";
import { useSetupStatus } from "./setup";
const sections = [
  "General",
  "Notifications",
  "Confirmations",
  "Appearance",
  "Spam Protection",
  "Revisions",
] as const;
type SettingsSection = (typeof sections)[number];
function ProtectionSettings() {
  const { status, error } = useSetupStatus();
  return (
    <div className="qf-settings-card">
      <h2>Spam protection</h2>
      <span className="qf-status-badge">
        {error
          ? "Not checked"
          : !status
            ? "Checking…"
            : status.turnstileConfigured
              ? "Keys configured"
              : "CAPTCHA off"}
      </span>
      <p>
        {error ||
          "Cloudflare Turnstile is optional. Without both keys, forms accept submissions without CAPTCHA. Rate limits and server validation still apply."}
      </p>
      <a
        className="qf-action-link"
        href="/_emdash/admin/plugins-manager/quixforms/settings"
        target="_blank"
        rel="noreferrer"
      >
        Configure Turnstile in Core ↗
      </a>
      <p className="qf-muted">
        Keys are shared by your forms and managed securely in Core. Test the
        public page to verify that they work. CAPTCHA is enabled only when both
        keys are configured.
      </p>
    </div>
  );
}
export function Settings({
  form,
  revision,
  onChange,
  onRestored,
  onClose,
  busy,
  onRestoringChange,
}: {
  form: Form;
  revision: string | null;
  onChange: (f: Form) => void;
  onRestored: (f: Form, revision: string) => void;
  onClose: () => void;
  busy: boolean;
  onRestoringChange: (value: boolean) => void;
}) {
  const [section, setSection] = useState<SettingsSection>("General"),
    [history, setHistory] = useState<Form[]>([]),
    [message, setMessage] = useState(""),
    [restoring, setRestoring] = useState(false),
    [historyLoading, setHistoryLoading] = useState(false);
  useEffect(() => {
    if (section !== "Revisions" || !revision) return;
    let active = true;
    setHistoryLoading(true);
    api("read?id=" + form.id)
      .then((row) => {
        if (active) setHistory(row.value.history);
      })
      .catch(() => {
        if (active) setMessage("Could not load revisions.");
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [form.id, revision, section]);
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
    <div className="qf-settings-view">
      <nav aria-label="Settings sections">
        {sections.map((name) => (
          <button
            key={name}
            aria-label={name}
            aria-current={section === name ? "page" : undefined}
            disabled={restoring}
            onClick={() => {
              setSection(name);
              setMessage("");
            }}
          >
            {name}
          </button>
        ))}
      </nav>
      <section className="qf-settings-content">
        <header className="qf-section-header">
          <div>
            <span className="qf-eyebrow">FORM SETTINGS</span>
            <h1>{section}</h1>
          </div>
          <button disabled={restoring} onClick={onClose}>
            Back to builder
          </button>
        </header>
        {message && <p role="alert">{message}</p>}
        {section === "General" && (
          <div className="qf-settings-card">
            <h2>Form details</h2>
            <label>
              Form title
              <input
                value={form.title}
                maxLength={200}
                onChange={(e) => onChange({ ...form, title: e.target.value })}
              />
            </label>
            <div className="qf-setting-info">
              <strong>
                {form.status === "published"
                  ? "Your form is published"
                  : "Your form is a draft"}
              </strong>
              <p>
                {form.status === "published"
                  ? "Saving updates the live form immediately. Unpublish before making changes you want to keep private."
                  : "Drafts are private. Use Publish when you are ready to make the form available."}
              </p>
            </div>
            <p className="qf-muted">
              {form.fields.length} fields ·{" "}
              {form.notifications.filter((n) => n.enabled !== false).length}{" "}
              enabled notifications
            </p>
          </div>
        )}
        {section === "Confirmations" && (
          <div className="qf-settings-card">
            <h2>After submission</h2>
            <p>Show visitors a message when their entry is accepted.</p>
            <label>
              Confirmation message
              <textarea
                rows={5}
                maxLength={1000}
                value={form.confirmation}
                onChange={(e) =>
                  onChange({ ...form, confirmation: e.target.value })
                }
              />
            </label>
            <div className="qf-confirmation-preview">
              <span className="qf-eyebrow">MESSAGE PREVIEW</span>
              <p>{form.confirmation}</p>
            </div>
          </div>
        )}
        {section === "Appearance" && (
          <div className="qf-settings-card">
            <h2>Choose a form style</h2>
            <label>
              Appearance
              <select
                aria-label="Appearance"
                value={form.appearance}
                onChange={(e) =>
                  onChange({
                    ...form,
                    appearance: e.target.value as Form["appearance"],
                  })
                }
              >
                {["minimal", "modern", "classic", "boxed"].map((style) => (
                  <option key={style}>{style}</option>
                ))}
              </select>
            </label>
            <div className="qf-style-grid">
              {(["minimal", "modern", "classic", "boxed"] as const).map(
                (style) => (
                  <button
                    key={style}
                    aria-label={"Use " + style + " style"}
                    aria-pressed={form.appearance === style}
                    onClick={() => onChange({ ...form, appearance: style })}
                  >
                    <span
                      className={"qf-style-sample qf-style-" + style}
                      aria-hidden="true"
                    >
                      <i />
                      <i />
                      <b />
                    </span>
                    <strong>{style}</strong>
                    {form.appearance === style && (
                      <small aria-hidden="true">✓</small>
                    )}
                  </button>
                ),
              )}
            </div>
            <p className="qf-muted">
              Preview uses the same renderer as your public Astro form.
            </p>
          </div>
        )}
        {section === "Notifications" && (
          <>
            <div className="qf-section-intro">
              <h2>Email notifications</h2>
              <p>
                Send each accepted entry to your team. Use conditions to route
                messages to the right recipient.
              </p>
              <p className="qf-muted">
                Your site needs a configured EmDash email provider. A stored
                entry does not guarantee email delivery.
              </p>
            </div>
            {form.notifications.map((n, i) => (
              <fieldset
                className="qf-settings-card qf-notification-card"
                key={i}
              >
                <legend>Notification {i + 1}</legend>
                <label className="qf-toggle-label">
                  <input
                    type="checkbox"
                    checked={n.enabled !== false}
                    onChange={(e) =>
                      editNotification(i, { enabled: e.target.checked })
                    }
                  />
                  Enabled
                </label>
                <label>
                  Recipient
                  <input
                    type="email"
                    value={n.to}
                    placeholder="team@example.com"
                    onChange={(e) =>
                      editNotification(i, { to: e.target.value })
                    }
                  />
                </label>
                <label>
                  Subject
                  <input
                    value={n.subject}
                    maxLength={200}
                    onChange={(e) =>
                      editNotification(i, { subject: e.target.value })
                    }
                  />
                </label>
                <div className="qf-notification-logic">
                  <label>
                    Message body
                    <textarea
                      rows={7}
                      maxLength={10000}
                      value={n.body ?? ""}
                      placeholder="{all_fields}"
                      onChange={(e) =>
                        editNotification(i, { body: e.target.value })
                      }
                    />
                  </label>
                  <p className="qf-muted">
                    Plain text. Use {"{all_fields}"} for answers,{" "}
                    {"{form_title}"} for the form name, and{" "}
                    {"{entry_reference}"} for the entry reference. Leave blank
                    to send all answers.
                  </p>
                  <h3>Send this notification when</h3>
                  <Logic
                    rule={n.when}
                    fields={form.fields}
                    onChange={(when) => editNotification(i, { when })}
                  />
                </div>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "Remove this notification? Existing entries are retained.",
                      )
                    )
                      onChange({
                        ...form,
                        notifications: form.notifications.filter(
                          (_, j) => i !== j,
                        ),
                      });
                  }}
                >
                  Remove notification
                </button>
              </fieldset>
            ))}
            {form.notifications.length < 5 && (
              <button
                className="qf-primary"
                onClick={() =>
                  onChange({
                    ...form,
                    notifications: [
                      ...form.notifications,
                      {
                        to: "",
                        subject: "New QuixForms submission",
                        enabled: false,
                      },
                    ],
                  })
                }
              >
                Add notification
              </button>
            )}
            {!form.notifications.length && (
              <p className="qf-muted">
                No notifications yet. Add one to choose who hears from your
                form.
              </p>
            )}
          </>
        )}
        {section === "Spam Protection" && <ProtectionSettings />}
        {section === "Revisions" && (
          <div className="qf-settings-card">
            <h2>Saved revisions</h2>
            <p>
              Restore an earlier definition as a draft. This unpublishes the
              form; existing entries are retained.
            </p>
            {historyLoading ? (
              <p>Loading revisions…</p>
            ) : (
              !history.length && (
                <p className="qf-muted">No earlier revisions available.</p>
              )
            )}
            {history.map((snapshot, index) => (
              <div className="qf-revision-row" key={index}>
                <div>
                  <strong>{snapshot.title}</strong>
                  <small>
                    Revision {index + 1} · {snapshot.fields.length} fields
                  </small>
                </div>
                <button
                  disabled={busy || restoring}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        "Restore this revision as a draft? Current unsaved changes will be discarded and the form unpublished.",
                      )
                    )
                      return;
                    setRestoring(true);
                    onRestoringChange(true);
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
                    } catch (error) {
                      setMessage(
                        error instanceof Error
                          ? error.message
                          : "Restore failed.",
                      );
                    } finally {
                      setRestoring(false);
                      onRestoringChange(false);
                    }
                  }}
                >
                  Restore draft
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
