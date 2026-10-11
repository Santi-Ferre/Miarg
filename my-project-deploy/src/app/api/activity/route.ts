import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
const allowedTypes = new Set(['visit', 'generated', 'credential', 'service']);
const noStore = { 'Cache-Control': 'no-store, max-age=0' };

export async function POST(request: NextRequest) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return NextResponse.json({ error: 'Las métricas globales aún no están configuradas.' }, { status: 503, headers: noStore });

  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    if (!origin || !host || new URL(origin).host !== host) {
      return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403, headers: noStore });
    }
    if (Number(request.headers.get('content-length') ?? 0) > 128) {
      return NextResponse.json({ error: 'Evento demasiado grande.' }, { status: 413, headers: noStore });
    }
    const rawBody = await request.text();
    if (rawBody.length > 128) return NextResponse.json({ error: 'Evento demasiado grande.' }, { status: 413, headers: noStore });
    const body = JSON.parse(rawBody);
    if (!body || Object.keys(body).length !== 1 || typeof body.type !== 'string' || !allowedTypes.has(body.type)) {
      return NextResponse.json({ error: 'Evento inválido.' }, { status: 400, headers: noStore });
    }

    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const globalKey = `mi-demo:global:${body.type}`;
    const dailyKey = `mi-demo:daily:${day}`;
    const response = await fetch(`${url.replace(/\/$/, '')}/multi-exec`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', globalKey],
        ['INCR', dailyKey],
        ['EXPIRE', dailyKey, 7776000],
      ]),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('metrics backend failed');
    const result = await response.json();
    if (!Array.isArray(result) || result.some((item) => item?.error)) throw new Error('metrics command failed');
    return NextResponse.json({ ok: true }, { status: 202, headers: noStore });
  } catch {
    return NextResponse.json({ error: 'No se pudo registrar la métrica.' }, { status: 503, headers: noStore });
  }
}
