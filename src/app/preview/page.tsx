import { previewState } from '@/lib/preview';
import Dashboard from '@/components/dashboard';
export const dynamic = 'force-dynamic';
export default function Preview() {
  return <Dashboard initial={previewState()} preview />;
}
