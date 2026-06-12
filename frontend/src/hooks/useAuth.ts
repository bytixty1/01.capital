'use client';

import { useEffect, useState } from 'react';
import { api, UserResponse } from '@/lib/api';
import { clearSession } from '@/lib/auth';

/**
 * Current-user state for app pages. Route access is already gated by
 * middleware.ts (cookie presence); this hook resolves the actual user and
 * bounces to /login if the session token is stale or revoked.
 */
export function useAuth() {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => {
        window.location.href = '/login';
      })
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await clearSession();
    window.location.href = '/login';
  }

  return { user, loading, logout };
}
