const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003/api";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers);

  // Only set Content-Type for non-FormData bodies
  if (!(options?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Auto-attach JWT token if available
  if (!headers.has("Authorization")) {
    const token = typeof window !== "undefined"
      ? localStorage.getItem("clinicdesk_token")
      : null;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  return res.json();
}
