import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/session-cookie';

/**
 * Session endpoint: the browser exchanges a backend-issued JWT for an
 * httpOnly cookie here, so client JS never holds the token after login
 * (XSS cannot exfiltrate it). The proxy route attaches it as a Bearer
 * header server-side.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as { access_token?: unknown };
  if (typeof body.access_token !== 'string' || body.access_token.length === 0) {
    return NextResponse.json({ detail: 'access_token required' }, { status: 400 });
  }
  (await cookies()).set(SESSION_COOKIE, body.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // No maxAge: session cookie. JWT expiry is enforced by the backend —
    // an expired token yields 401s and the client returns to /login.
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(): Promise<NextResponse> {
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
