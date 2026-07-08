/**
 * @module useTokenRefresh
 * @description Silently refreshes the access token on a periodic interval
 * to prevent session expiry during long user sessions.
 *
 * Calls /api/auth/refresh every 5 minutes. If the refresh succeeds, the
 * new token is stored in localStorage. If it fails, the hook is silent
 * (the authFetch interceptor or useSessionTimeout will handle redirect).
 */

import { useEffect, useRef } from 'react';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useTokenRefresh() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            localStorage.setItem('authToken', data.token);
          }
        }
      } catch {
        // Silent — don't disrupt the user
      }
    };

    // Start periodic refresh
    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL);

    // Also refresh on tab focus (user returning to the app)
    const handleFocus = () => refresh();
    window.addEventListener('focus', handleFocus);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
}
