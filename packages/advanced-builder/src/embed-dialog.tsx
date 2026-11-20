import React, { useState } from "react";
import type { Form } from "@emquix/quixforms-engine";
import { Modal } from "./modal";
import { useSetupStatus } from "./setup";
export function EmbedDialog({
  form,
  dirty,
  busy,
  onPublish,
  onClose,
}: {
  form: Form;
  dirty: boolean;
  busy: boolean;
  onPublish: () => Promise<boolean>;
  onClose: () => void;
}) {
  const { status, error } = useSetupStatus();
  const [message, setMessage] = useState("");
  const code = `---\nimport Form from '@emquix/quixforms-astro/Form.astro';\n---\n<Form id="${form.id}" />`;
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied to clipboard.");
    } catch {
      setMessage("Copy unavailable. Select the code and copy it manually.");
    }
  }
  return (
    <Modal title="Embed your form" onClose={onClose}>
      <p>
        Put <strong>{form.title}</strong> on your site.
      </p>
      <ol className="qf-launch-steps">
        <li>
          <strong>
            {form.status === "published" ? "Published" : "Publish your form"}
          </strong>
          <p>
            {form.status === "published"
              ? dirty
                ? "You have newer unsaved edits. Save them before sharing."
                : "Your saved definition is available to the public renderer."
              : "Drafts are private. Publish when you are ready to share."}
          </p>
          {form.status === "draft" && (
            <button
              className="qf-primary"
              disabled={busy}
              onClick={async () => {
                setMessage("");
                if (!(await onPublish()))
                  setMessage(
                    "Publishing failed. Close this dialog and review the save message.",
                  );
              }}
            >
              {busy ? "Publishing…" : "Publish form"}
            </button>
          )}
        </li>
        <li>
          <strong>Check spam protection and notifications</strong>
          <p>
            {error ||
              (!status
                ? "Checking spam protection…"
                : status.turnstileConfigured
                  ? "Turnstile keys are configured. Verify a real public submission before launch."
                  : "CAPTCHA is off. Forms accept submissions without a bot check. Configure both Turnstile keys to enable it.")}
          </p>
          <p>
            {form.notifications.filter((n) => n.enabled !== false).length} email
            notifications enabled. Delivery requires your site’s configured
            email provider.
          </p>
          <a
            href="/_emdash/admin/plugins-manager/quixforms/settings"
            target="_blank"
            rel="noreferrer"
          >
            Open Core settings ↗
          </a>
        </li>
        <li>
          <strong>Add the form to a page</strong>
          <p>
            Install the Astro companion once, place this component on a
            server-rendered page, and rebuild your site.
          </p>
          <pre tabIndex={0}>
            <code>{code}</code>
          </pre>
          <div className="qf-inline-actions">
            <button onClick={() => void copy(code)}>Copy embed code</button>
            <button onClick={() => void copy(form.id)}>Copy form ID</button>
          </div>
          <p>
            If the dynamic companion route is installed, your form is available
            at{" "}
            <a href={"/forms/" + form.id} target="_blank" rel="noreferrer">
              /forms/{form.id}
            </a>
            . Publishing does not install that route.
          </p>
        </li>
      </ol>
      <p className="qf-muted">
        Test the public page, stored entry and email notification before sharing
        the link.
      </p>
      <p role="status">{message}</p>
    </Modal>
  );
}
