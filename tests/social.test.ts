import { describe, expect, it } from 'vitest';
import { socialAction, socialCursor } from '@/modules/social/contracts';

describe('social input', () => {
  it('keeps posts private by default and rejects empty/oversized text', () => {
    expect(
      socialAction.parse({ action: 'create', id: crypto.randomUUID(), body: '  Halo  ' }),
    ).toMatchObject({ body: 'Halo', visibility: 'private' });
    expect(
      socialAction.safeParse({ action: 'create', id: crypto.randomUUID(), body: ' ' }).success,
    ).toBe(false);
    expect(
      socialAction.safeParse({ action: 'create', id: crypto.randomUUID(), body: 'x'.repeat(2001) })
        .success,
    ).toBe(false);
  });
  it('requires a version for edit and delete and validates pagination cursors', () => {
    expect(
      socialAction.safeParse({ action: 'edit', id: crypto.randomUUID(), body: 'baru' }).success,
    ).toBe(false);
    expect(
      socialAction.safeParse({ action: 'delete', id: crypto.randomUUID(), version: 1 }).success,
    ).toBe(true);
    expect(socialCursor.safeParse({ at: 'not-a-date', id: crypto.randomUUID() }).success).toBe(
      false,
    );
  });
  it('limits report text and prevents client supplied snapshot fields', () => {
    expect(
      socialAction.safeParse({ action: 'report', id: crypto.randomUUID(), reason: 'x'.repeat(501) })
        .success,
    ).toBe(false);
    expect(
      socialAction.safeParse({
        action: 'create',
        id: crypto.randomUUID(),
        body: 'Halo',
        snapshot: { amount: 1000000 },
      }).success,
    ).toBe(false);
  });
});
