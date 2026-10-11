import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, createAdminSession, isSameOrigin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/admin',
};
const noStore = { 'Cache-Control': 'no-store, max-age=0' };

export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!adminPassword || adminPassword.length < 16 || !sessionSecret || sessionSecret.length < 32) {
    return NextResponse.json({ error: 'El acceso administrador no está configurado correctamente.' }, { status: 503, headers: noStore });
  }
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403, headers: noStore });

  try {
    if (Number(request.headers.get('content-length') ?? 0) > 1024) {
      return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413, headers: noStore });
    }
    const rawBody = await request.text();
    if (rawBody.length > 1024) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413, headers: noStore });
    const body = JSON.parse(rawBody);
    if (!body || Object.keys(body).length !== 1 || typeof body.password !== 'string' || body.password.length > 512) {
      return NextResponse.json({ error: 'Clave inválida.' }, { status: 400, headers: noStore });
    }
    const candidate = Buffer.from(body.password);
    const expected = Buffer.from(adminPassword);
    const valid = candidate.length === expected.length && timingSafeEqual(candidate, expected);
    if (!valid) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 401, headers: noStore });

    const session = createAdminSession(sessionSecret);
    const response = NextResponse.json({ ok: true }, { headers: noStore });
    response.cookies.set(ADMIN_COOKIE_NAME, session.value, { ...cookieOptions, maxAge: session.maxAge });
    return response;
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400, headers: noStore });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true }, { headers: noStore });
  response.cookies.set(ADMIN_COOKIE_NAME, '', { ...cookieOptions, maxAge: 0 });
  return response;
}
