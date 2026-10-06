import 'server-only';
import { z } from 'zod';

// Caller must validate the user with getUser; this only extracts the session lookup key.
export function sessionIdFromToken(token: string | undefined) {
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as {
      session_id?: unknown;
    };
    const parsed = z.uuid().safeParse(payload.session_id);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
