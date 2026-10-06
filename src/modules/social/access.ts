import 'server-only';
import { userClient } from '@/lib/supabase/server';
import { devEmailAllowed } from '@/modules/auth/dev-mode';
import { sessionIdFromToken } from '@/modules/auth/session-id';
import type { State } from '@/modules/tracking/domain';

export async function socialIdentity() {
  const client = await userClient();
  const { data: identity } = await client.auth.getUser();
  if (!identity.user?.email || !devEmailAllowed(identity.user.email)) return null;
  const { data: snapshot } = await client.rpc('read_core');
  if (!snapshot) return null;
  const { data: session } = await client.auth.getSession();
  const sessionId = sessionIdFromToken(session.session?.access_token);
  if (!sessionId) return null;
  return { owner: identity.user.id, sessionId, state: snapshot.state as State };
}
