import { redirect } from 'next/navigation';
import FeedClient from '@/components/social/feed-client';
import { userClient } from '@/lib/supabase/server';
import { commitClient } from '@/lib/supabase/server';
import { devEmailAllowed } from '@/modules/auth/dev-mode';
import { sessionIdFromToken } from '@/modules/auth/session-id';
import type { SocialPost } from '@/modules/social/contracts';
import { socialDevEnabled } from '@/modules/social/flags';
import type { State } from '@/modules/tracking/domain';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  if (!socialDevEnabled()) redirect('/dashboard');
  const client = await userClient();
  const { data: identity } = await client.auth.getUser();
  if (!identity.user?.email || !devEmailAllowed(identity.user.email)) redirect('/login');
  const { data } = await client.rpc('read_core');
  if (!data) redirect('/account');
  const { data: session } = await client.auth.getSession();
  const sessionId = sessionIdFromToken(session.session?.access_token);
  if (!sessionId) redirect('/login');
  const { data: feed, error } = await commitClient().rpc('social_feed', {
    p_owner: identity.user.id,
    p_session: sessionId,
    p_at: null,
    p_id: null,
    p_limit: 20,
  });
  if (error && error.code !== '42501') throw new Error('Feed unavailable');
  const state = data.state as State;
  const entries = state.entries
    .filter((entry) => !entry.deleted)
    .slice(-20)
    .reverse()
    .map((entry) => ({
      id: entry.id,
      label: entry.module === 'finance' ? 'Sudah mencatat keuangan' : entry.name,
      module: entry.module,
    }));
  return (
    <FeedClient
      owner={identity.user.id}
      language={state.preferences.language}
      name={state.preferences.name}
      theme={state.preferences.theme}
      entries={entries}
      initial={feed as { posts: SocialPost[]; hasMore: boolean } | null}
    />
  );
}
