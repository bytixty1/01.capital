// Session management. The JWT lives in an httpOnly cookie set by
// /api/session — client JS never reads or stores it (the pre-2026-06
// localStorage token was XSS-exfiltratable). The /api/backend proxy attaches
// it as a Bearer header server-side; middleware.ts gates app routes on it.

export async function setSession(accessToken: string): Promise<void> {
  await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken }),
  });
}

export async function clearSession(): Promise<void> {
  await fetch('/api/session', { method: 'DELETE' });
}
