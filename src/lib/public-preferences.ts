import 'server-only';
import { cookies } from 'next/headers';
export async function publicLanguage(): Promise<'id' | 'en'> {
  return (await cookies()).get('ht-language')?.value === 'en' ? 'en' : 'id';
}
