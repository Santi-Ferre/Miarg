import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, isValidAdminSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store, max-age=0' };
const activityTypes = ['visit', 'generated', 'credential', 'service'] as const;

function count(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export async function GET(request: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidAdminSession(session, secret)) {
    return NextResponse.json({ error: 'Se requiere acceso de administrador.' }, { status: 401, headers: noStore });
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return NextResponse.json({ error: 'Falta configurar el almacenamiento de métricas.' }, { status: 503, headers: noStore });

  const dates = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    day.setUTCDate(day.getUTCDate() - (6 - index));
    return day.toISOString().slice(0, 10);
  });
  const keys = [
    ...activityTypes.map((type) => `mi-demo:global:${type}`),
    ...dates.map((date) => `mi-demo:daily:${date}`),
  ];

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['MGET', ...keys]]),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('metrics backend failed');
    const result = await response.json();
    const values = result?.[0]?.result;
    if (!Array.isArray(values) || values.length !== keys.length) throw new Error('metrics response invalid');
    return NextResponse.json({
      totals: Object.fromEntries(activityTypes.map((type, index) => [type, count(values[index])])),
      days: dates.map((date, index) => ({ date, count: count(values[activityTypes.length + index]) })),
    }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: 'No se pudieron cargar las estadísticas.' }, { status: 503, headers: noStore });
  }
}
