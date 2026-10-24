import type { Form, Values } from "./index";
export interface Entry {
  formId: string;
  form: Form;
  values: Values;
  createdAt: string;
  notification: "pending" | "sent" | "failed" | "skipped";
  status?: "inbox" | "spam" | "trash";
  read?: boolean;
  starred?: boolean;
  reference?: string;
  notes?: Array<{
    id: string;
    text: string;
    createdAt: string;
    authorId: string;
  }>;
  fingerprint?: string;
}
