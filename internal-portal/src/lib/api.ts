import { useDashboardStore } from './store';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = MAX_RETRIES
): Promise<Response> {
  const { setError } = useDashboardStore.getState();

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('authToken') : ''}`,
        },
      });

      if (response.ok) {
        return response;
      }

      if (response.status === 401) {
        // Attempt token refresh before giving up
        const newToken = await refreshToken();
        if (newToken) {
          // Retry with new token
          continue;
        }
        // Refresh failed — clear auth and redirect
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/login';
        }
        throw new Error('Unauthorized');
      }

      if (i === retries - 1) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        const errorMessage = (errorData as any)?.error || 'Request failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
    } catch (error) {
      if (i === retries - 1) {
        setError((error as Error).message);
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
    }
  }

  throw new Error('Max retries exceeded');
}

export async function get(url: string) {
  return fetchWithRetry(url, { method: 'GET' });
}

export async function post(url: string, data: any) {
  return fetchWithRetry(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function put(url: string, data: any) {
  return fetchWithRetry(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function del(url: string) {
  return fetchWithRetry(url, { method: 'DELETE' });
}
