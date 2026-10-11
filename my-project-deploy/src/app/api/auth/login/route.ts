import { NextResponse } from 'next/server';

const disabled = () => NextResponse.json(
  { error: 'API deshabilitada: esta aplicación solo ofrece perfiles ficticios.' },
  { status: 410, headers: { 'Cache-Control': 'no-store, max-age=0' } },
);

export const GET = disabled;
export const POST = disabled;
export const PUT = disabled;
export const PATCH = disabled;
export const DELETE = disabled;

