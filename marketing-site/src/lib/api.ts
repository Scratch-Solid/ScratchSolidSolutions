/**
 * @deprecated This file is a legacy remnant of an earlier FastAPI backend.
 * It is not imported anywhere in the codebase and is safe to delete.
 *
 * All API calls now use Next.js API routes at /api/... directly.
 * Authentication tokens are stored in localStorage under the key 'authToken'
 * and read via lib/auth helpers — not sessionStorage or NEXT_PUBLIC_API_TOKEN.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
