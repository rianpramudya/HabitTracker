import { fail } from '@/lib/http';
export function POST() {
  return fail('Telegram belum diaktifkan', 503);
}
