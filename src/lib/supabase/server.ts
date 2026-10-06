import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
export async function userClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase belum dikonfigurasi');
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        for (const { name, value, options } of values)
          store.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          });
      },
    },
  });
}
// Only narrow commit RPC uses privileged client; all normal reads use userClient/RLS.
export function commitClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Penulisan server belum dikonfigurasi');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function devAdminAuthClient() {
  if (process.env.NODE_ENV !== 'development' || process.env.DEV_PASSWORD_SIGNUP !== 'true')
    throw new Error('Development signup is disabled');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Development auth is not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
