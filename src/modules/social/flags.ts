import 'server-only';
import { devPersonalEnabled } from '@/modules/auth/dev-mode';

// No public or beta feed until moderation, identity, and operational gates pass.
export function socialDevEnabled() {
  return devPersonalEnabled() && process.env.SOCIAL_DEV_ENABLED === 'true';
}
