import React, { useState } from "react";
import type { Form } from "@emquix/quixforms-engine";
import {
  createTemplate,
  templateCatalog,
  type TemplateId,
} from "@emquix/quixforms-engine/templates";
import { FormView } from "@emquix/quixforms-astro";
import { Modal } from "./modal";

export type LibraryForm = { id: string; data: { current: Form } };
const categories: Record<TemplateId, string> = {
  blank: "Essentials",
  contact: "Essentials",
  advanced_contact: "Essentials",
  newsletter: "Marketing",
  quote: "Business",
  job: "Applications",
  event: "Events",
  appointment: "Business",
  feedback: "Feedback",
  support: "Business",
  product: "Business",
  lead: "Marketing",
  multistep: "Essentials",
  business: "Applications",
  service: "Business",
  volunteer: "Applications",
};
export function FormLibrary({
  forms,
  cursor,
  busy,
  message,
  onOpen,
  onCreate,
  onMore,
}: {
  forms: LibraryForm[];
  cursor?: string;
  busy: boolean;
  message: string;
  onOpen: (id: string, entries?: boolean) => void;
  onCreate: (id: TemplateId, title?: string) => void;
  onMore: () => void;
}) {
  const [setup, setSetup] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const [templateQuery, setTemplateQuery] = useState(""),
    [category, setCategory] = useState("All templates"),
    [title, setTitle] = useState("");
  const [preview, setPreview] = useState<TemplateId>();
  const results = forms.filter(
    (row) =>
      (filter === "all" || row.data.current.status === filter) &&
      row.data.current.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const templates = templateCatalog.filter(
    (t) =>
      (category === "All templates" || categories[t.id] === category) &&
      `${t.name} ${t.description}`
        .toLowerCase()
        .includes(templateQuery.trim().toLowerCase()),
  );
  return (
    <div className="qf-builder qf-library">
      <header className="qf-library-header">
        <div>
          <span className="qf-eyebrow">QUIXFORMS ADVANCED</span>
          <h1>{setup ? "Create your form" : "All forms"}</h1>
          <p>
            {setup
              ? "Start with a template and make it your own."
              : "Build, publish and manage your forms in one place."}
          </p>
        </div>
        <button
          className={setup ? "" : "qf-primary"}
          disabled={busy}
          onClick={() => setSetup(!setup)}
        >
          {setup ? "Back to all forms" : "Add New"}
        </button>
      </header>
      <p role="status">{message || (busy ? "Loading…" : "")}</p>
      {setup ? (
        <>
          <div className="qf-name-form">
            <label>
              Name your form
              <input
                value={title}
                maxLength={200}
                placeholder="e.g. Contact our team"
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <p>Leave this blank to use the template name.</p>
          </div>
          <div className="qf-template-layout">
            <nav aria-label="Template categories">
              <h2>Select a template</h2>
              {["All templates", ...new Set(Object.values(categories))].map(
                (name) => (
                  <button
                    key={name}
                    aria-label={name}
                    aria-pressed={category === name}
                    onClick={() => setCategory(name)}
                  >
                    {name}
                  </button>
                ),
              )}
            </nav>
            <div className="qf-template-results">
              <label className="qf-search-label">
                Search templates
                <input
                  type="search"
                  value={templateQuery}
                  placeholder="Search templates…"
                  onChange={(e) => setTemplateQuery(e.target.value)}
                />
              </label>
              <p className="qf-muted">{templates.length} templates</p>
              <div className="qf-template-grid">
                {templates.map((t) => {
                  const sample = createTemplate(t.id, "template_preview");
                  return (
                    <article key={t.id} className="qf-template-card">
                      <div
                        className={
                          "qf-template-thumbnail" +
                          (t.id === "blank" ? " qf-template-blank" : "")
                        }
                        aria-hidden="true"
                      >
                        {t.id === "blank" ? (
                          <span>+</span>
                        ) : (
                          <>
                            <b>{t.name}</b>
                            {sample.fields.slice(0, 3).map((field) => (
                              <div key={field.id}>
                                <span>{field.label}</span>
                                <i
                                  className={
                                    field.type === "paragraph"
                                      ? "qf-thumbnail-paragraph"
                                      : ""
                                  }
                                />
                              </div>
                            ))}
                            <em>Submit</em>
                          </>
                        )}
                      </div>
                      <div className="qf-template-copy">
                        <span className="qf-eyebrow">{categories[t.id]}</span>
                        <h3>{t.name}</h3>
                        <p>{t.description}</p>
                        <div>
                          <button
                            className="qf-primary"
                            disabled={busy}
                            aria-label={"Use template " + t.name}
                            onClick={() =>
                              onCreate(t.id, title.trim() || undefined)
                            }
                          >
                            Use template
                          </button>
                          <button
                            aria-label={"Preview " + t.name}
                            onClick={() => setPreview(t.id)}
                          >
                            Preview
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!templates.length && (
                <div className="qf-empty-state">
                  <h3>No matching templates</h3>
                  <p>Try another search or choose All templates.</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="qf-library-body">
          <div className="qf-library-metrics">
            <div>
              <strong>{forms.length}</strong>
              <span>Forms loaded</span>
            </div>
            <div>
              <strong>
                {
                  forms.filter((row) => row.data.current.status === "published")
                    .length
                }
              </strong>
              <span>Published</span>
            </div>
            <div>
              <strong>
                {
                  forms.filter((row) => row.data.current.status === "draft")
                    .length
                }
              </strong>
              <span>Drafts</span>
            </div>
          </div>
          <div className="qf-library-filters">
            <div role="group" aria-label="Form status filters">
              {["all", "published", "draft"].map((status) => (
                <button
                  key={status}
                  aria-pressed={filter === status}
                  onClick={() => setFilter(status)}
                >
                  {status === "all"
                    ? "All forms"
                    : status === "draft"
                      ? "Drafts"
                      : "Published"}
                </button>
              ))}
            </div>
            <label>
              Search forms
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search loaded forms…"
              />
            </label>
          </div>
          {results.length ? (
            <div className="qf-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Form name</th>
                    <th>Status</th>
                    <th>Fields</th>
                    <th>Notifications</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(({ id, data }) => (
                    <tr key={id}>
                      <td>
                        <button
                          className="qf-form-name"
                          disabled={busy}
                          onClick={() => onOpen(id)}
                        >
                          {data.current.title}
                        </button>
                      </td>
                      <td>
                        <span className="qf-status-badge">
                          {data.current.status}
                        </span>
                      </td>
                      <td>{data.current.fields.length}</td>
                      <td>
                        {
                          data.current.notifications.filter(
                            (n) => n.enabled !== false,
                          ).length
                        }{" "}
                        enabled
                      </td>
                      <td>
                        <button
                          disabled={busy}
                          aria-label={"Entries for " + data.current.title}
                          onClick={() => onOpen(id, true)}
                        >
                          Entries
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !busy && (
              <div className="qf-empty-state">
                <span className="qf-empty-icon" aria-hidden="true">
                  ▤
                </span>
                <h2>
                  {forms.length
                    ? "No matching forms"
                    : "Let’s build your first form"}
                </h2>
                <p>
                  {forms.length
                    ? "Try another search or status filter."
                    : "Choose a ready-made template or start with a blank canvas."}
                </p>
                {!forms.length && (
                  <button className="qf-primary" onClick={() => setSetup(true)}>
                    Choose a template
                  </button>
                )}
              </div>
            )
          )}
          <div className="qf-library-footer">
            <p className="qf-muted">
              Search and counts cover loaded forms.
              {cursor ? " Load more to include the next page." : ""}
            </p>
            {cursor && (
              <button disabled={busy} onClick={onMore}>
                Load more forms
              </button>
            )}
          </div>
        </div>
      )}
      {preview && (
        <Modal
          title={templateCatalog.find((t) => t.id === preview)!.name}
          onClose={() => setPreview(undefined)}
        >
          <p className="qf-muted">
            Template preview. Answers here are not stored or emailed.
          </p>
          <FormView
            key={preview}
            form={createTemplate(preview, "template_preview")}
            onSubmit={async () => "Preview complete. No entry was created."}
          />
          <button
            className="qf-primary"
            onClick={() => {
              onCreate(preview, title.trim() || undefined);
              setPreview(undefined);
            }}
          >
            Use this template
          </button>
        </Modal>
      )}
    </div>
  );
}
