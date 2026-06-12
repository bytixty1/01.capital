import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-cookie';

/**
 * Route-level auth guard (CLAUDE.md rule 9: guards at the route level, not in
 * component render logic) using Next 16's proxy convention (middleware.ts is
 * deprecated). Presence-checks the session cookie only — token validity is
 * enforced by the backend on every proxied request; a stale cookie just
 * yields 401s and a client-side return to /login.
 */
export function proxy(req: NextRequest): NextResponse {
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL('/login', req.url);
  login.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/dashboard/:path*', '/companies/:path*', '/account/:path*'],
};
