import React from "react";
import type { Field, Rule } from "@emquix/quixforms-engine";
export function Logic({
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
  fields = fields.filter(
    (f) => !["content", "section", "page"].includes(f.type),
  );
  if (!fields.length)
    return <p>Add an input field before configuring conditions.</p>;
  if (!rule)
    return (
      <button
        onClick={() =>
          onChange({
            op: "and",
            rules: [{ field: fields[0].id, op: "notEmpty" }],
          })
        }
      >
        Add condition group
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
            onChange={(next) => {
              const rules = next
                ? rule.rules.map((old, j) => (j === i ? next : old))
                : rule.rules.filter((_, j) => j !== i);
              onChange(rules.length ? { ...rule, rules } : undefined);
            }}
          />
        ))}
        <button
          disabled={rule.rules.length >= 10}
          onClick={() =>
            onChange({
              ...rule,
              rules: [...rule.rules, { field: fields[0].id, op: "notEmpty" }],
            })
          }
        >
          Add condition
        </button>
        {depth < 3 && rule.rules.length < 10 && (
          <button
            onClick={() =>
              onChange({
                ...rule,
                rules: [
                  ...rule.rules,
                  {
                    op: "or",
                    rules: [{ field: fields[0].id, op: "notEmpty" }],
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
        onChange={(e) => onChange({ field: e.target.value, op: "notEmpty" })}
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
          onChange({
            ...rule,
            op: e.target.value as typeof rule.op,
            value: undefined,
          })
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
          <option key={o} value={o}>
            {
              (
                {
                  eq: "Equals",
                  ne: "Does not equal",
                  contains: "Contains",
                  notContains: "Does not contain",
                  gt: "Greater than",
                  lt: "Less than",
                  empty: "Is empty",
                  notEmpty: "Is not empty",
                  startsWith: "Starts with",
                  endsWith: "Ends with",
                  selected: "Is selected",
                  notSelected: "Is not selected",
                } as Record<string, string>
              )[o]
            }
          </option>
        ))}
      </select>
      {!["empty", "notEmpty"].includes(rule.op) &&
        (fields.find((f) => f.id === rule.field)?.type === "consent" ? (
          <select
            aria-label="Comparison value"
            value={String(rule.value ?? "")}
            onChange={(e) =>
              onChange({ ...rule, value: e.target.value === "true" })
            }
          >
            <option value="" disabled>
              Select a value
            </option>
            <option value="true">Checked</option>
            <option value="false">Unchecked</option>
          </select>
        ) : (
          <input
            aria-label="Comparison value"
            type={
              fields.find((f) => f.id === rule.field)?.type === "number"
                ? "number"
                : "text"
            }
            value={String(rule.value ?? "")}
            onChange={(e) =>
              onChange({
                ...rule,
                value:
                  e.target.value !== "" &&
                  fields.find((f) => f.id === rule.field)?.type === "number"
                    ? Number(e.target.value)
                    : e.target.value,
              })
            }
          />
        ))}
      <button onClick={() => onChange(undefined)}>Remove condition</button>
    </div>
  );
}
