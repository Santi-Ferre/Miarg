import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE_NAME = 'demo_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;

function signature(expiration: string, secret: string) {
  return createHmac('sha256', secret).update(`demo-admin:v1:${expiration}`).digest('hex');
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createAdminSession(secret: string) {
  const expiration = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return { value: `${expiration}.${signature(expiration, secret)}`, maxAge: SESSION_SECONDS };
}

export function isValidAdminSession(value: string | undefined, secret: string | undefined) {
  if (!value || !secret || secret.length < 32) return false;
  const [expiration, providedSignature, ...extra] = value.split('.');
  if (extra.length || !/^\d{10,}$/.test(expiration ?? '') || !providedSignature) return false;
  if (Number(expiration) <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(providedSignature, signature(expiration, secret));
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}
