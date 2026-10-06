import { fail } from '@/lib/http';
export function POST() {
  return fail('Pembelian belum dibuka', 503);
}
