/** JSON request to an admin API route; resolves with the status and parsed body, never throws on HTTP errors. */
export async function sendJson<T = Record<string, unknown>>(url: string, method: string, body?: unknown) {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as T & { error?: string; fields?: Record<string, string[]> };
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Couldn't reach the server. Check your connection and try again." } as T & { error?: string; fields?: Record<string, string[]> } };
  }
}
