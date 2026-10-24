export async function api(route: string, input?: unknown) {
  const r = await fetch("/_emdash/api/plugins/quixforms/" + route, {
    credentials: "same-origin",
    headers: { "X-EmDash-Request": "1", "Content-Type": "application/json" },
    ...(input ? { method: "POST", body: JSON.stringify(input) } : {}),
  });
  const body = await r.json();
  if (!r.ok || !body.success)
    throw new Error("Request failed. Check your permissions.");
  return body.data;
}
