import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/session-cookie';

// Server-side base URL for the FastAPI service. BACKEND_URL wins so prod can
// point at an internal address; NEXT_PUBLIC_API_URL kept as fallback for dev.
const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

/**
 * Catch-all proxy to the FastAPI backend. Reads the httpOnly session cookie
 * and attaches it as a Bearer header server-side — the browser never sees or
 * stores the JWT. Streams the backend response through unchanged (JSON and
 * the MFA QR PNG both pass through).
 */
async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await ctx.params;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const target = `${BACKEND_URL}/${path.join('/')}${req.nextUrl.search}`;

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const backendRes = await fetch(target, {
    method: req.method,
    headers: {
      'Content-Type': req.headers.get('Content-Type') ?? 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(hasBody ? { body: await req.arrayBuffer() } : {}),
    cache: 'no-store',
  });

  const headers = new Headers();
  const contentType = backendRes.headers.get('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);
  // Forward the download filename for binary documents (PDF exports).
  const contentDisposition = backendRes.headers.get('Content-Disposition');
  if (contentDisposition) headers.set('Content-Disposition', contentDisposition);
  return new Response(backendRes.body, { status: backendRes.status, headers });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
