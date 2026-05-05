'use client';

import { useEffect, useState } from 'react';
import { api, UserResponse } from '@/lib/api';
import { clearToken, isAuthenticated } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/login';
      return;
    }
    api.auth
      .me()
      .then(setUser)
      .catch(() => {
        clearToken();
        window.location.href = '/login';
      })
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    clearToken();
    window.location.href = '/login';
  }

  return { user, loading, logout };
}
