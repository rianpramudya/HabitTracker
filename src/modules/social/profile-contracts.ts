import { z } from 'zod';
import type { SocialPost } from './contracts';

export const memberId = z.uuid();
export const peopleQuery = z.string().trim().min(2).max(60);
export const profileRename = z.strictObject({
  name: z.string().trim().min(1).max(60),
  revision: z.number().int().nonnegative(),
});
export type Member = { id: string; name: string; avatarVersion: string | null };
export type MemberProfile = Member & {
  mine: boolean;
  revision: number | null;
  posts: SocialPost[];
};
