import { NextResponse } from 'next/server';
export function GET() {
  return NextResponse.json(
    { status: 'ok', release: 'development', productOpen: false },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
