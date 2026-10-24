import type { PluginContext } from "emdash/plugin";
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
interface Window {
  minute: number;
  total: number;
  buckets: Record<string, number>;
}
// Fixed-size approximate client buckets: no IP addresses or unbounded client keys persist.
// Shared buckets may conservatively throttle unrelated clients; host edge limits remain recommended.
export async function allowSubmission(
  c: PluginContext,
  formId: string,
  ip: string | null,
  now = Date.now(),
) {
  const key = "state:rate:" + formId,
    minute = Math.floor(now / 60000);
  const bucket = ip
    ? String(
        parseInt(
          (await digest(formId + ":" + minute + ":" + ip)).slice(0, 8),
          16,
        ) % 64,
      )
    : "unknown";
  for (let attempt = 0; attempt < 5; attempt++) {
    const old = await c.kv.getVersioned<Window>(key);
    const window: Window =
      old?.value.minute === minute
        ? old.value
        : { minute, total: 0, buckets: {} };
    if (window.total >= 120 || (window.buckets[bucket] ?? 0) >= 20)
      return false;
    const next = {
      minute,
      total: window.total + 1,
      buckets: {
        ...window.buckets,
        [bucket]: (window.buckets[bucket] ?? 0) + 1,
      },
    };
    const result = await c.kv.compareAndSet(key, old?.revision ?? null, next);
    if (result.applied) return true;
  }
  return false;
}
