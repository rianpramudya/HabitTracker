import { z } from 'zod';

const id = z.uuid();
const body = z.string().trim().min(1).max(2000);
const visibility = z.enum(['private', 'community']);

export const socialAction = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('join'), consent: z.literal('social-dev-v1') }),
  z.strictObject({
    action: z.literal('create'),
    id,
    body,
    visibility: visibility.default('private'),
    entryId: z.string().max(100).nullable().default(null),
  }),
  z.strictObject({
    action: z.literal('edit'),
    id,
    version: z.number().int().positive(),
    body,
    visibility,
  }),
  z.strictObject({ action: z.literal('delete'), id, version: z.number().int().positive() }),
  z.strictObject({ action: z.literal('block'), ownerId: id }),
  z.strictObject({ action: z.literal('unblock'), ownerId: id }),
  z.strictObject({ action: z.literal('report'), id, reason: z.string().trim().min(1).max(500) }),
]);

export const socialCursor = z.strictObject({ at: z.iso.datetime({ offset: true }), id });
export type SocialAction = z.infer<typeof socialAction>;

export type SocialPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarVersion: string | null;
  body: string;
  visibility: 'private' | 'community';
  snapshot: { kind: string; label: string; amount?: number; unit?: string } | null;
  version: number;
  createdAt: string;
  mine: boolean;
};
