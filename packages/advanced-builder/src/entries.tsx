import React, { useEffect, useState } from "react";
import { entriesCsv } from "@emquix/quixforms-engine/submissions";
import type { Entry } from "@emquix/quixforms-engine/submissions";
import { api } from "./api";
export function Entries({
  formId,
  onBack,
}: {
  formId: string;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<Array<{ id: string; data: Entry }>>([]),
    [cursor, setCursor] = useState<string>(),
    [currentCursor, setCurrentCursor] = useState<string>(),
    [status, setStatus] = useState("all"),
    [reference, setReference] = useState(""),
    [starred, setStarred] = useState("all"),
    [selected, setSelected] = useState<{
      key: string;
      value: Entry;
      revision: string;
    }>(),
    [note, setNote] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const query = (next?: string) =>
    new URLSearchParams({
      id: formId,
      status,
      reference,
      starred,
      ...(next ? { cursor: next } : {}),
    }).toString();
  async function load(next?: string) {
    setBusy(true);
    try {
      const result = await api("entries?" + query(next));
      setRows(result.items);
      setCursor(result.cursor);
      setCurrentCursor(next);
      setMessage(result.items.length ? "" : "No entries match these filters.");
    } catch {
      setMessage("Could not load entries. Try again.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [formId]);
  async function open(key: string) {
    setBusy(true);
    try {
      const row = await api(
        "entries/read?" + new URLSearchParams({ id: formId, key }),
      );
      if (!row) throw 0;
      setSelected({ key, ...row });
      setNote("");
      setMessage("");
    } catch {
      setMessage("Could not open this entry.");
    } finally {
      setBusy(false);
    }
  }
  async function update(patch?: Record<string, unknown>) {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await api("entries/update", {
        id: formId,
        key: selected.key,
        revision: selected.revision,
        ...(patch ? { patch } : { note }),
      });
      if (!result.ok) {
        await open(selected.key);
        setMessage(
          result.error === "CONFLICT"
            ? "Another administrator changed this entry. Reloaded; please retry."
            : "Could not save this change.",
        );
        return;
      }
      await open(selected.key);
      setMessage("Saved");
    } catch {
      setMessage("Could not save this change.");
    } finally {
      setBusy(false);
    }
  }
  async function download(format: "csv" | "json", all = false) {
    setBusy(true);
    try {
      let result = await api(
        "export?" + query(all ? undefined : currentCursor),
      );
      if (!result.ok) throw new Error("Export failed.");
      let exported: Array<{ id: string; data: Entry }> = result.json;
      if (all) {
        const cursors = new Set<string>();
        let bytes = new TextEncoder().encode(
          JSON.stringify(exported),
        ).byteLength;
        while (result.cursor) {
          if (cursors.has(result.cursor))
            throw new Error(
              "Export pagination did not advance. Try page exports.",
            );
          cursors.add(result.cursor);
          result = await api("export?" + query(result.cursor));
          if (!result.ok) throw new Error("Export failed.");
          bytes += new TextEncoder().encode(
            JSON.stringify(result.json),
          ).byteLength;
          if (
            bytes > 32 * 1024 * 1024 ||
            exported.length + result.json.length > 10000
          )
            throw new Error(
              "Export exceeds the browser limit (10,000 entries or 32 MiB). Use page exports or the authenticated API.",
            );
          exported.push(...result.json);
        }
        exported = [...new Map(exported.map((row) => [row.id, row])).values()];
      }
      const csv = all ? entriesCsv(exported) : result.csv;
      const url = URL.createObjectURL(
        new Blob([format === "csv" ? csv : JSON.stringify(exported, null, 2)], {
          type:
            format === "csv" ? "text/csv;charset=utf-8" : "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `quixforms-${formId}-${all ? "all" : "page"}.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        `Exported ${exported.length} entries${all ? " matching the filters" : " from this page"}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="qf-builder">
      <header>
        <h1>Submissions</h1>
        <button disabled={busy} onClick={onBack}>
          Back to builder
        </button>
      </header>
      <p role="status">{busy ? "Working…" : message}</p>
      {selected ? (
        <section>
          <button
            disabled={busy}
            onClick={() => {
              setSelected(undefined);
              void load(currentCursor);
            }}
          >
            Back to inbox
          </button>
          <h2>{selected.value.form.title}</h2>
          <p>
            {selected.key} · {selected.value.createdAt}
          </p>
          <p>
            Folder: {selected.value.status ?? "inbox"} · Notification:{" "}
            {selected.value.notification}
          </p>
          <div>
            <button
              disabled={busy}
              onClick={() => update({ read: !selected.value.read })}
            >
              {selected.value.read ? "Mark unread" : "Mark read"}
            </button>
            <button
              disabled={busy}
              onClick={() => update({ starred: !selected.value.starred })}
            >
              {selected.value.starred ? "Remove star" : "Star"}
            </button>
            {["inbox", "spam", "trash"].map((folder) => (
              <button
                key={folder}
                disabled={busy}
                onClick={() => update({ status: folder })}
              >
                {folder === "inbox" ? "Restore to inbox" : "Move to " + folder}
              </button>
            ))}
          </div>
          <dl>
            {selected.value.form.fields.map((f) => (
              <React.Fragment key={f.id}>
                <dt>{f.label}</dt>
                <dd>
                  {Array.isArray(selected.value.values[f.id])
                    ? (selected.value.values[f.id] as string[]).join(", ")
                    : String(selected.value.values[f.id] ?? "—")}
                </dd>
              </React.Fragment>
            ))}
          </dl>
          {selected.value.status === "trash" && (
            <button
              disabled={busy}
              onClick={async () => {
                if (
                  !window.confirm(
                    "Permanently erase this entry and its notes? This cannot be undone.",
                  )
                )
                  return;
                setBusy(true);
                try {
                  const result = await api("entries/erase", {
                    id: formId,
                    key: selected.key,
                    revision: selected.revision,
                  });
                  if (!result.ok) throw 0;
                  setSelected(undefined);
                  await load();
                  setMessage("Entry permanently erased.");
                } catch {
                  setMessage(
                    "Could not erase. Reload and check the entry is still in Trash.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Permanently erase entry
            </button>
          )}
          <h3>Internal notes</h3>
          {selected.value.notes?.map((n) => (
            <article key={n.id}>
              <small>
                {n.createdAt} · {n.authorId}
              </small>
              <p>{n.text}</p>
            </article>
          ))}
          <label>
            New note
            <textarea
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button disabled={busy || !note.trim()} onClick={() => update()}>
            Add note
          </button>
        </section>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <label>
              Folder
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {["all", "inbox", "spam", "trash"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Starred
              <select
                value={starred}
                onChange={(e) => setStarred(e.target.value)}
              >
                <option value="all">All</option>
                <option value="yes">Starred only</option>
              </select>
            </label>
            <label>
              Reference prefix
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                pattern="[a-z0-9_-]*"
              />
            </label>
            <button disabled={busy}>Apply filters</button>
          </form>
          <button disabled={busy} onClick={() => download("csv")}>
            Export page CSV
          </button>
          <button disabled={busy} onClick={() => download("json")}>
            Export page JSON
          </button>
          <button disabled={busy} onClick={() => download("csv", true)}>
            Export all CSV
          </button>
          <button disabled={busy} onClick={() => download("json", true)}>
            Export all JSON
          </button>
          <table>
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Folder</th>
                <th>Read</th>
                <th>Starred</th>
                <th>Entry</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.data.createdAt}</td>
                  <td>{r.data.status ?? "inbox"}</td>
                  <td>{r.data.read ? "Yes" : "No"}</td>
                  <td>{r.data.starred ? "Yes" : "No"}</td>
                  <td>
                    <button disabled={busy} onClick={() => open(r.id)}>
                      Open {r.id}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cursor && (
            <button disabled={busy} onClick={() => load(cursor)}>
              Next page
            </button>
          )}
          {currentCursor && (
            <button disabled={busy} onClick={() => load()}>
              First page
            </button>
          )}
        </>
      )}
    </div>
  );
}
