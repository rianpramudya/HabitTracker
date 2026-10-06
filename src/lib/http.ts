import { NextResponse } from 'next/server';
export function fail(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !!origin && origin === (process.env.APP_ORIGIN ?? new URL(request.url).origin);
}
