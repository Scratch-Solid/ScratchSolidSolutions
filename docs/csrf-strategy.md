# CSRF Protection Strategy

This documents why most mutating API routes in `internal-portal` and
`marketing-site` don't call `withCsrf`, so that absence reads as a deliberate
design rather than an oversight to "fix" by bolting it onto every route.

## How requests are actually authenticated

`withAuth` accepts two forms of credential, in this order (`getRequestAuthToken`
in `lib/middleware.ts`):

1. **`Authorization: Bearer <token>` header** — the primary mechanism. The
   frontend stores the token in `localStorage` and attaches it manually to
   every `fetch()` call. This is how the overwhelming majority of requests in
   both apps authenticate.
2. **`auth_token` cookie** — a fallback, set by the handful of routes that call
   `setAuthCookies` (`auth/login`, `auth/cleaner/login`,
   `auth/cleaner/setup-password`, `auth/refresh`). This cookie is `httpOnly`,
   `secure` in production, and `SameSite=Lax`.

## Why Bearer-authenticated routes don't need `withCsrf`

`withCsrf` (in `lib/middleware.ts`) already detects Bearer auth and no-ops for
it:

```ts
const hasBearerAuth = request.headers.get('Authorization')?.startsWith('Bearer ');
if (hasBearerAuth) return null;
```

This is correct, not a hole: a cross-site attacker page cannot read another
origin's `localStorage`, and cannot set a custom `Authorization` header on a
request without triggering a CORS preflight the browser will block for an
unapproved origin. There is no way to forge a Bearer-authenticated request
from another site. Calling `withCsrf` on a route that's only ever hit with a
Bearer token would be a no-op every time — which is why the ~100+ routes that
skip it are not a gap, as long as they're only reached with a Bearer token in
practice (true for essentially every route today; the frontend always sends
one).

## Why the cookie fallback is still reasonably safe without `withCsrf`

For the smaller set of routes that could be authenticated via the `auth_token`
cookie alone (no Authorization header), `SameSite=Lax` is the load-bearing
protection: modern browsers do not attach a `Lax` cookie to cross-site
state-changing requests (POST/PUT/PATCH/DELETE via form submission, fetch, or
XHR) — only to top-level `GET` navigations. That already blocks the classic
CSRF attack shape for every mutating method `withCsrf` cares about.

`withCsrf`'s explicit `X-CSRF-Token` check is a defense-in-depth layer on top
of that, for cookie-authenticated requests specifically — it's what actually
runs when there's no Bearer header. It correctly rejects a missing or invalid
token in that case.

## The actual gap, if any

Any route that:
- uses `withAuth` (so it accepts the cookie fallback), **and**
- is a mutating method, **and**
- never calls `withCsrf`

is relying on `SameSite=Lax` alone rather than `SameSite=Lax` **and** an
explicit token, for the cookie-auth case specifically. That's an acceptable
baseline today, not an active vulnerability — but if a route's own logic ever
changes to accept the cookie as sufficient without also checking for a Bearer
header being present, it's worth adding `withCsrf` at that point rather than
assuming the existing pattern automatically covers it.

## Summary for future changes

- Route only ever called with a Bearer token → `withCsrf` is unnecessary.
- Route reachable via the `auth_token` cookie for a mutating action → already
  covered by `SameSite=Lax`; add `withCsrf` for defense-in-depth if the route
  is sensitive enough to want two independent protections instead of one.
- Don't add `withCsrf` uniformly "for consistency" — it's a no-op wherever a
  Bearer token is present, so doing so has no security effect and just adds
  noise to every route.
