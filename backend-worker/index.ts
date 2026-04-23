/**
 * Edge worker: health check + reverse proxy to FastAPI (BACKEND_URL).
 * Production: set BACKEND_URL to your deployed API (e.g. Render) or tunnel URL.
 */
export interface Env {
  BACKEND_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" || url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "edge-worker" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const backendBase =
      env.BACKEND_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";
    let path = url.pathname;
    if (path.startsWith("/api")) {
      path = path.replace(/^\/api/, "") || "/";
    }
    const target = new URL(path + url.search, backendBase);

    const headers = new Headers(request.headers);
    headers.delete("host");

    try {
      const resp = await fetch(target.toString(), {
        method: request.method,
        headers,
        body:
          request.method === "GET" || request.method === "HEAD"
            ? undefined
            : await request.arrayBuffer(),
        redirect: "manual",
      });
      return resp;
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: "upstream_unreachable",
          detail: String(e),
          backend: backendBase,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
