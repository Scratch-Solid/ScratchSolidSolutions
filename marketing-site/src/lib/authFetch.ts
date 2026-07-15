/**
 * @module authFetch
 * @description Wrapper around fetch that automatically refreshes expired tokens.
 *
 * When a request returns 401, this utility attempts to refresh the access token
 * via the /api/auth/refresh endpoint (using the httpOnly refresh cookie). If the
 * refresh succeeds, the original request is retried with the new token. If the
 * refresh fails, the user is redirected to the auth page.
 *
 * Usage:
 *   import { authFetch } from '@/lib/authFetch';
 *   const res = await authFetch('/api/bookings', { method: 'POST', ... });
 */

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        return data.token as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('authToken');

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  // FormData needs the browser to set its own multipart Content-Type with
  // the boundary param - setting application/json here breaks file uploads
  // (the server can't parse the body as either format).
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // If 401, try to refresh the token and retry once
  if (response.status === 401) {
    const newToken = await refreshToken();

    if (newToken) {
      // Retry the original request with the new token
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      if (!retryHeaders.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
        retryHeaders.set('Content-Type', 'application/json');
      }

      return fetch(url, {
        ...options,
        headers: retryHeaders,
        credentials: 'include',
      });
    }

    // Refresh failed — clear auth data and redirect to login
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userAddress');

    // Only redirect if we're in a browser context
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
      window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname);
    }
  }

  return response;
}

/**
 * Get CSRF token from the API, with caching.
 * Tokens are stateless (HMAC-signed) so we can reuse a single token for multiple requests.
 */
let cachedCsrfToken: string | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedCsrfToken) return cachedCsrfToken;

  try {
    const res = await fetch('/api/csrf-token');
    const data = await res.json();
    cachedCsrfToken = data.csrfToken || '';
    return cachedCsrfToken;
  } catch {
    return '';
  }
}
