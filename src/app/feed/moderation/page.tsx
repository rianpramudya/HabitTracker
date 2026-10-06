import { redirect } from 'next/navigation';
import ModerationClient from '@/components/social/moderation-client';
import { commitClient, userClient } from '@/lib/supabase/server';
import { devEmailAllowed } from '@/modules/auth/dev-mode';
import { sessionIdFromToken } from '@/modules/auth/session-id';
import { socialDevEnabled } from '@/modules/social/flags';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  if (!socialDevEnabled()) redirect('/dashboard');
  const client = await userClient();
  const { data: identity } = await client.auth.getUser();
  if (!identity.user?.email || !devEmailAllowed(identity.user.email)) redirect('/login');
  const { data: session } = await client.auth.getSession();
  const token = session.session?.access_token;
  const sessionId = sessionIdFromToken(token);
  if (!token || !sessionId) redirect('/login');
  const { data: assurance, error: mfaError } =
    await client.auth.mfa.getAuthenticatorAssuranceLevel(token);
  if (mfaError || assurance.currentLevel !== 'aal2') redirect('/feed');
  const { data, error } = await commitClient().rpc('social_moderation_queue', {
    p_owner: identity.user.id,
    p_session: sessionId,
  });
  if (error) redirect('/feed');
  return (
    <ModerationClient
      initial={
        data as {
          id: string;
          postId: string;
          body: string;
          authorName: string;
          reason: string;
          createdAt: string;
        }[]
      }
    />
  );
}
