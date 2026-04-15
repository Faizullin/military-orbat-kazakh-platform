// Custom API client — PROTECTED from upstream sync
const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
