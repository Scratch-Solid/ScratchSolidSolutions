import { useDashboardStore } from './store';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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
        // Unauthorized - clear auth and redirect
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        window.location.href = '/auth/login';
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
