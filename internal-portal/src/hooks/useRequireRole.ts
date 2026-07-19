/**
 * @module useRequireRole
 * @description Client-side page guard: redirects away if the logged-in
 * user's role isn't one of `allowedRoles`. Login already redirects each role
 * to its own dashboard correctly, but nothing previously stopped a logged-in
 * user from typing a different dashboard's URL directly (middleware only
 * guards /api/*, not pages) - this closes that gap.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OWN_DASHBOARD } from '@/lib/roleRouting';

export function useRequireRole(allowedRoles: string[]) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');

    if (!token) {
      router.replace('/auth/login');
      return;
    }
    if (!role || !allowedRoles.includes(role)) {
      // Send them to the dashboard their own role actually owns, not just
      // back to login (they're already authenticated - just misrouted).
      // 'cleaner' isn't in the shared OWN_DASHBOARD map (its real landing
      // needs a training-status API call, done elsewhere) - '/cleaner-dashboard'
      // here is just a reasonable best-effort fallback, not the authoritative
      // route.
      const fallback: Record<string, string> = { ...OWN_DASHBOARD, cleaner: '/cleaner-dashboard' };
      router.replace((role && fallback[role]) || '/auth/login');
      return;
    }
    setAuthorized(true);
    setChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { authorized, checked };
}
