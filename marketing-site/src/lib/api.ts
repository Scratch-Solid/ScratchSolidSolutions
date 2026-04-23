/**
 * FastAPI backend base URL. Set NEXT_PUBLIC_API_URL in .env.local for production.
 */
export const API_URL =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "http://localhost:8000";

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${p}`;
}

/** Bearer token: sessionStorage (after login) or NEXT_PUBLIC_API_TOKEN for demos only. */
export function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const t =
      sessionStorage.getItem("access_token") ||
      process.env.NEXT_PUBLIC_API_TOKEN;
    if (t) headers["Authorization"] = `Bearer ${t}`;
  } else if (process.env.NEXT_PUBLIC_API_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`;
  }
  return headers;
}
