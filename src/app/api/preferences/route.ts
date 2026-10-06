import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sameOrigin, fail } from '@/lib/http';
const schema = z.strictObject({ language: z.enum(['id', 'en']) });
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail('Origin tidak diizinkan', 403);
  const body = await request.text();
  if (body.length > 256) return fail('Input terlalu besar', 413);
  let parsed;
  try {
    parsed = schema.safeParse(JSON.parse(body));
  } catch {
    return fail('Input tidak valid', 400);
  }
  if (!parsed.success) return fail('Input tidak valid', 400);
  const response = NextResponse.json(
    { language: parsed.data.language },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set('ht-language', parsed.data.language, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 31536000,
  });
  return response;
}
