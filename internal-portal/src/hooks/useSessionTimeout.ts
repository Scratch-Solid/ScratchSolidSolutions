/**
 * @module useSessionTimeout
 * @description Auto-logout hook for session inactivity timeout.
 *
 * Tracks user activity (mouse, keyboard, touch, scroll) and automatically
 * logs out the user after 5 minutes of inactivity for security.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export function useSessionTimeout(enabled: boolean = true) {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    try {
      // Call logout API to invalidate session on server
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    // Clear all auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userAddress');
    
    // Clear cookies
    document.cookie.split(";").forEach(c => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Redirect to auth page
    router.push('/auth/login');
  }, [router]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (enabled) {
      timeoutRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
    }
  }, [logout, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initial timer start
    resetTimer();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer, enabled]);

  return { logout };
}
