const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail ?? 'Request failed');
  }
  return res.json() as Promise<T>;
}

export type TokenResponse = { access_token: string; token_type: string };
export type UserResponse = {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
};

export const api = {
  auth: {
    register: (email: string, password: string, fullName?: string) =>
      request<TokenResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name: fullName }),
      }),

    login: (email: string, password: string) =>
      request<TokenResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    me: (token: string) =>
      request<UserResponse>('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      }),
  },
};
