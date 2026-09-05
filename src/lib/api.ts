export async function apiFetch(url: string, init?: RequestInit) {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    return response;
  } catch (error) {
    window.dispatchEvent(new CustomEvent('workspace-error', { detail: error instanceof Error ? error.message : 'Network request failed' }));
    throw error;
  }
}
export async function api<T = any>(url: string, method = 'GET', body?: unknown) : Promise<T> {
  return (await apiFetch(url, { method, headers: { 'Content-Type': 'application/json', ...(method === 'POST' ? { 'Idempotency-Key': crypto.randomUUID() } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })).json();
}
