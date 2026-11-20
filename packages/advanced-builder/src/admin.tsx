import React, { useEffect, useRef, useState } from "react";
import {
  parseForm,
  registry,
  type Form,
  type Field,
} from "@emquix/quixforms-engine";
import {
  createTemplate,
  type TemplateId,
} from "@emquix/quixforms-engine/templates";
import "@emquix/quixforms-astro/style.css";
import "./style.css";
import "./advanced.css";
import { api } from "./api";
import { fieldLabels } from "./field-options";
import { Settings } from "./settings";
import { Entries } from "./entries";
import { FormLibrary, type LibraryForm } from "./form-library";
import { FieldWorkspace } from "./field-workspace";
import { EmbedDialog } from "./embed-dialog";
import { Modal } from "./modal";
type View = "fields" | "settings" | "entries";
export function Builder() {
  const [list, setList] = useState<LibraryForm[]>([]),
    [listCursor, setListCursor] = useState<string>(),
    [form, setForm] = useState<Form>(),
    [revision, setRevision] = useState<string | null>(null);
  const [selected, setSelected] = useState(""),
    [view, setView] = useState<View>("fields"),
    [preview, setPreview] = useState(false),
    [embed, setEmbed] = useState(false),
    [help, setHelp] = useState(false),
    [fullscreen, setFullscreen] = useState(false);
  const [past, setPast] = useState<Form[]>([]),
    [future, setFuture] = useState<Form[]>([]),
    [message, setMessage] = useState(""),
    [dirty, setDirty] = useState(false),
    [working, setBusy] = useState(false),
    [restoring, setRestoring] = useState(false),
    [loading, setLoading] = useState(true),
    [autoPaused, setAutoPaused] = useState(false);
  const busy = working || restoring;
  const latest = useRef(form),
    saving = useRef(false);
  latest.current = form;
  useEffect(() => {
    let active = true;
    api("list")
      .then((result) => {
        if (active) {
          setList(result.items);
          setListCursor(result.cursor);
        }
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!form || form.status !== "draft" || !dirty || busy || autoPaused)
      return;
    try {
      parseForm(form);
    } catch {
      return;
    }
    const timer = setTimeout(() => {
      void persist();
    }, 1500);
    return () => clearTimeout(timer);
  }, [form, dirty, busy, revision, autoPaused]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]"))
        setFullscreen(false);
      if (!(event.ctrlKey || event.metaKey) || !form) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (view !== "entries") void persist();
      }
      const editable = (event.target as HTMLElement).closest?.(
        "input, textarea, select, [contenteditable=true]",
      );
      if (event.key.toLowerCase() === "z" && !editable) {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [form, revision, dirty, busy, past, future, view]);
  useEffect(() => {
    if (!fullscreen || !form) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [fullscreen, form?.id]);
  function resetEditor(next: Form, rev: string | null, isDirty = false) {
    latest.current = next;
    setForm(next);
    setRevision(rev);
    setSelected("");
    setPast([]);
    setFuture([]);
    setDirty(isDirty);
    setAutoPaused(false);
    setView("fields");
    setPreview(false);
    setMessage("");
  }
  function change(next: Form) {
    if (!form || restoring) return;
    setPast((rows) => [...rows.slice(-49), form]);
    setFuture([]);
    latest.current = next;
    setForm(next);
    setDirty(true);
  }
  function undo() {
    if (!form || busy || !past.length) return;
    const next = { ...past.at(-1)!, status: form.status };
    setFuture((rows) => [form, ...rows]);
    setPast((rows) => rows.slice(0, -1));
    latest.current = next;
    setForm(next);
    setDirty(true);
  }
  function redo() {
    if (!form || busy || !future.length) return;
    const next = { ...future[0], status: form.status };
    setPast((rows) => [...rows.slice(-49), form]);
    setFuture((rows) => rows.slice(1));
    latest.current = next;
    setForm(next);
    setDirty(true);
  }
  async function persist(status?: Form["status"]): Promise<boolean> {
    if (!form || saving.current || restoring) return false;
    const original = form,
      snapshot = status ? { ...form, status } : form;
    saving.current = true;
    setBusy(true);
    try {
      parseForm(snapshot);
      const result = await api("save", { form: snapshot, revision });
      if (!result.ok)
        throw new Error(
          result.error === "CONFLICT"
            ? "Another editor changed this form. Reopen it before saving."
            : "Check the form configuration.",
        );
      setRevision(result.revision);
      const newerEdits = latest.current !== original;
      if (status) {
        const next = newerEdits ? { ...latest.current!, status } : snapshot;
        latest.current = next;
        setForm(next);
      }
      setDirty(newerEdits);
      setAutoPaused(false);
      setMessage(
        status
          ? (status === "published" ? "Form published." : "Form unpublished.") +
              (newerEdits ? " Newer edits are still unsaved." : "")
          : "Saved",
      );
      return true;
    } catch (error) {
      setAutoPaused(true);
      setMessage(
        error && typeof error === "object" && "issues" in error
          ? "Check field labels, choices, number ranges and conditions before saving."
          : error instanceof Error
            ? error.message
            : "Save failed.",
      );
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function openForm(id: string, entries = false) {
    setBusy(true);
    try {
      const row = await api("read?id=" + encodeURIComponent(id));
      const next = parseForm(row.value.current);
      resetEditor(next, row.revision);
      if (entries) setView("entries");
      return true;
    } catch {
      setMessage(
        "Could not open the form. Check permissions and the supported definition version.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function allForms() {
    if (
      busy ||
      (dirty &&
        !window.confirm("Discard unsaved changes and return to all forms?"))
    )
      return;
    setBusy(true);
    try {
      const result = await api("list");
      setList(result.items);
      setListCursor(result.cursor);
      latest.current = undefined;
      setForm(undefined);
      setRevision(null);
      setDirty(false);
      setEmbed(false);
      setFullscreen(false);
      setMessage("");
    } catch {
      setMessage("Could not load forms.");
    } finally {
      setBusy(false);
    }
  }
  async function loadMore() {
    setBusy(true);
    try {
      const result = await api(
        "list?cursor=" + encodeURIComponent(listCursor!),
      );
      setList((rows) => [...rows, ...result.items]);
      setListCursor(result.cursor);
    } catch {
      setMessage("Could not load more forms.");
    } finally {
      setBusy(false);
    }
  }
  function create(id: TemplateId, title?: string) {
    resetEditor(
      createTemplate(id, "f_" + crypto.randomUUID().replaceAll("-", ""), title),
      null,
      true,
    );
  }
  function addField(type: Field["type"], index?: number) {
    if (!form || form.fields.length >= 100) return;
    const next = registry[type].create(
      "f_" + crypto.randomUUID().replaceAll("-", ""),
    );
    next.label = fieldLabels[type];
    const fields = [...form.fields];
    fields.splice(index ?? fields.length, 0, next);
    change({ ...form, fields });
    setSelected(next.id);
  }
  function move(from: number, to: number) {
    if (!form || from === to) return;
    const fields = [...form.fields];
    fields.splice(to, 0, fields.splice(from, 1)[0]);
    change({ ...form, fields });
  }
  function duplicateField(id: string) {
    if (!form || form.fields.length >= 100) return;
    const index = form.fields.findIndex((field) => field.id === id);
    if (index < 0) return;
    const copy = {
      ...structuredClone(form.fields[index]),
      id: "f_" + crypto.randomUUID().replaceAll("-", ""),
    };
    const fields = [...form.fields];
    fields.splice(index + 1, 0, copy);
    change({ ...form, fields });
    setSelected(copy.id);
  }
  function deleteField(id: string) {
    if (!form) return;
    const field = form.fields.find((f) => f.id === id);
    if (!field) return;
    const next = { ...form, fields: form.fields.filter((f) => f.id !== id) };
    try {
      parseForm(next);
    } catch {
      setMessage(
        "This field is used by Smart Logic. Update its references before deleting it.",
      );
      return;
    }
    if (
      !window.confirm("Delete “" + field.label + "”? You can undo this change.")
    )
      return;
    change(next);
    if (selected === id) setSelected("");
  }
  async function duplicateForm() {
    if (!form || dirty || !revision || busy) return;
    setBusy(true);
    try {
      const result = await api("duplicate", { id: form.id, revision });
      if (!result.ok)
        throw new Error(
          "Could not duplicate. Reopen the saved form and try again.",
        );
      if (await openForm(result.id))
        setMessage("Draft copy created. Entries remain on the original form.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not duplicate.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!form)
    return (
      <FormLibrary
        forms={list}
        cursor={listCursor}
        busy={busy || loading}
        message={message}
        onOpen={(id, entries) => void openForm(id, entries)}
        onCreate={create}
        onMore={() => void loadMore()}
      />
    );
  return (
    <div
      className={
        "qf-builder qf-advanced" + (fullscreen ? " qf-fullscreen" : "")
      }
    >
      <header className="qf-pro-toolbar">
        <button
          className="qf-back"
          disabled={busy}
          onClick={() => void allForms()}
          aria-label="All forms"
        >
          ←
        </button>
        <span className="qf-brand">
          QuixForms<span>ADVANCED BUILDER</span>
        </span>
        <div className="qf-editing-title">
          <label htmlFor="qf-form-name">NOW EDITING</label>
          <input
            id="qf-form-name"
            aria-label="Form name"
            value={form.title}
            maxLength={200}
            disabled={busy}
            onChange={(e) => change({ ...form, title: e.target.value })}
          />
        </div>
        <div className="qf-toolbar-actions">
          <button disabled={busy || !past.length} onClick={undo}>
            Undo
          </button>
          <button disabled={busy || !future.length} onClick={redo}>
            Redo
          </button>
          <button
            disabled={restoring}
            onClick={() => {
              setView("fields");
              setPreview(!preview);
            }}
          >
            {preview && view === "fields" ? "Edit" : "Preview"}
          </button>
          <button onClick={() => setEmbed(true)}>Embed</button>
          <button onClick={() => setHelp(true)}>Help</button>
          <button
            aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
            onClick={() => setFullscreen(!fullscreen)}
          >
            ⤢
          </button>
          <details className="qf-more-menu">
            <summary>More</summary>
            <button
              disabled={busy || dirty || !revision}
              onClick={() => void duplicateForm()}
            >
              Duplicate saved form
            </button>
          </details>
          <button
            disabled={busy || view === "entries"}
            onClick={() =>
              void persist(form.status === "draft" ? "published" : "draft")
            }
          >
            {form.status === "draft" ? "Publish" : "Unpublish"}
          </button>
          <button
            className="qf-primary"
            disabled={busy || view === "entries"}
            onClick={() => void persist()}
          >
            {restoring
              ? "Restoring…"
              : busy
                ? "Saving…"
              : view === "settings"
                ? "Save settings"
                : "Save " + form.status}
          </button>
        </div>
      </header>
      <div className="qf-workspace-status">
        <span className="qf-status-badge">{form.status}</span>
        <span>
          {restoring ? "Restoring…" : busy ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <p role={view === "entries" ? undefined : "status"}>{message}</p>
      </div>
      {autoPaused && (
        <div className="qf-editor-alert">
          Autosave paused. Your edits are still here. Resolve the error, then
          choose Save to retry.
        </div>
      )}
      {form.status === "published" && (
        <div className="qf-published-note">
          Published form: saved changes update the live form immediately.
        </div>
      )}
      <div className="qf-pro-layout">
        <nav className="qf-stage-nav" aria-label="Form workspace">
          <button
            aria-current={view === "fields" ? "page" : undefined}
            disabled={restoring}
            onClick={() => {
              setView("fields");
              setPreview(false);
            }}
          >
            <span aria-hidden="true">▤</span>Fields
          </button>
          <button
            aria-current={view === "settings" ? "page" : undefined}
            disabled={restoring}
            onClick={() => setView("settings")}
          >
            <span aria-hidden="true">⚙</span>Settings
          </button>
          <button
            aria-current={view === "entries" ? "page" : undefined}
            disabled={dirty || busy || !revision}
            onClick={() => setView("entries")}
          >
            <span aria-hidden="true">▣</span>Entries
          </button>
        </nav>
        <div className="qf-stage-content">
          {view === "fields" && (
            <FieldWorkspace
              key={form.id}
              form={form}
              selected={selected}
              onSelect={setSelected}
              preview={preview}
              busy={busy}
              onChange={change}
              onAdd={addField}
              onMove={move}
              onDuplicate={duplicateField}
              onDelete={deleteField}
            />
          )}
          {view === "settings" && (
            <Settings
              form={form}
              revision={revision}
              busy={busy}
              onChange={change}
              onClose={() => setView("fields")}
              onRestored={(next, rev) => resetEditor(next, rev)}
              onRestoringChange={setRestoring}
            />
          )}
          {view === "entries" && (
            <Entries
              embedded
              formId={form.id}
              onBack={() => setView("fields")}
            />
          )}
        </div>
      </div>
      {embed && (
        <EmbedDialog
          form={form}
          dirty={dirty}
          busy={busy}
          onPublish={() => persist("published")}
          onClose={() => setEmbed(false)}
        />
      )}
      {help && (
        <Modal title="Builder help" onClose={() => setHelp(false)}>
          <h3>Build your form</h3>
          <p>
            Add a field from the library, select it on the canvas, then edit its
            General, Advanced or Smart Logic options. Drag fields to reorder
            them, or use their move buttons.
          </p>
          <h3>Save and publish</h3>
          <p>
            Drafts autosave after valid changes. Published forms update only
            when you save. Publishing saves the current definition and makes it
            available to your public renderer.
          </p>
          <h3>Keyboard shortcuts</h3>
          <dl>
            <dt>Ctrl / ⌘ + S</dt>
            <dd>Save the form</dd>
            <dt>Ctrl / ⌘ + Z</dt>
            <dd>Undo a builder change outside text inputs</dd>
            <dt>Ctrl / ⌘ + Shift + Z</dt>
            <dd>Redo a builder change</dd>
            <dt>Escape</dt>
            <dd>Close a dialog or leave full screen</dd>
          </dl>
          <p>Use Embed for the Astro component and launch checklist.</p>
        </Modal>
      )}
    </div>
  );
}
export const pages = { "/": Builder };
