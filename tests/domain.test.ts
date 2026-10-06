import { describe, it, expect } from 'vitest';
import { previewState } from '@/lib/preview';
import {
  applyCommand,
  dayProgress,
  balance,
  finance,
  localDate,
  ruleFor,
  type Command,
} from '@/modules/tracking/domain';
import { accessLevel, type Access } from '@/modules/access/domain';
const now = new Date('2026-10-05T05:00:00Z');
const date = '2026-10-05';
function water(amount: number): Command {
  return {
    action: 'entry.create',
    entry: {
      module: 'water',
      date,
      occurredAt: now.toISOString(),
      timezone: 'Asia/Jakarta',
      name: 'Air',
      amount,
      habitId: null,
      type: 'log',
      walletId: null,
      destinationId: null,
      category: '',
      method: 'cash',
      note: '',
    },
  };
}
describe('tracking and local history', () => {
  it('AC07 sums water once and derives completion from source', () => {
    let s = previewState(now);
    s.entries = s.entries.filter((e) => e.module !== 'water');
    s = applyCommand(s, water(250), 'a', now);
    s = applyCommand(s, water(500), 'b', now);
    expect(dayProgress(s, date).completed).toBe(3);
    s = applyCommand(s, water(1250), 'c', now);
    expect(dayProgress(s, date).completed).toBe(4);
  });
  it('AC06 no schedule means no artificial percent', () => {
    const s = previewState(now);
    s.habits.forEach((h) => (h.rules[0].days = [3]));
    expect(dayProgress(s, date)).toMatchObject({ total: 0, percent: null });
  });
  it('AC06 target change preserves historical rules', () => {
    const s = applyCommand(
      previewState(now),
      {
        action: 'habit.rule',
        id: 'water',
        effective: '2026-10-06',
        target: 2500,
        days: [0, 1, 2, 3, 4, 5, 6],
      },
      'x',
      now,
    );
    expect(ruleFor(s.habits[3], date)?.target).toBe(2000);
    expect(ruleFor(s.habits[3], '2026-10-06')?.target).toBe(2500);
  });
  it('rejects future and inconsistent timestamps', () => {
    const c = water(250);
    if (c.action === 'entry.create') c.entry.date = '2026-10-06';
    expect(() => applyCommand(previewState(now), c, 'x', now)).toThrow(/masa depan/);
  });
  it('AC09 disabling dependent module requires explicit archive', () => {
    const s = previewState(now);
    const preferences = {
      ...s.preferences,
      enabled: s.preferences.enabled.filter((m) => m !== 'water'),
    };
    expect(() =>
      applyCommand(
        s,
        { action: 'preferences.update', preferences, archiveDependents: false },
        'x',
        now,
      ),
    ).toThrow(/Arsipkan/);
    const n = applyCommand(
      s,
      { action: 'preferences.update', preferences, archiveDependents: true },
      'x',
      now,
    );
    expect(n.habits[3].archived).toBe(date);
    expect(n.entries).toEqual(s.entries);
  });
  it('does not create a habit from an unlinked module log', () => {
    const s = previewState(now);
    expect(applyCommand(s, water(250), 'x', now).habits).toEqual(s.habits);
  });
  it('AC13 timezone change leaves historical dates intact', () => {
    const s = previewState(now);
    const n = applyCommand(
      s,
      {
        action: 'preferences.update',
        preferences: { ...s.preferences, timezone: 'America/New_York' },
        archiveDependents: false,
      },
      'x',
      now,
    );
    expect(n.entries[0].date).toBe(date);
    expect(localDate(new Date('2026-10-05T00:00:00Z'), 'America/New_York')).toBe('2026-10-04');
  });
  it('rejects duplicate checklist and enforces edit version', () => {
    const s = previewState(now);
    const e = s.entries[2];
    const { id: _, version: __, deleted: ___, ...entry } = e;
    void _;
    void __;
    void ___;
    expect(() => applyCommand(s, { action: 'entry.create', entry }, 'x', now)).toThrow(
      /sudah selesai/,
    );
    expect(() =>
      applyCommand(s, { action: 'entry.delete', id: e.id, version: 0 }, 'x', now),
    ).toThrow(/berubah/);
  });
  it('rejects owner-foreign object IDs and invalid quantities', () => {
    const s = previewState(now);
    const c = water(250);
    if (c.action === 'entry.create') {
      c.entry.habitId = 'another-users-habit';
      c.entry.module = 'exercise';
    }
    expect(() => applyCommand(s, c, 'x', now)).toThrow(/Habit/);
    expect(() => applyCommand(s, water(-1), 'x', now)).toThrow();
  });
});
describe('ledger', () => {
  it('AC11 transfers affect two balances and no income/expense', () => {
    const s = previewState(now);
    const c = water(100000);
    if (c.action !== 'entry.create') throw Error();
    Object.assign(c.entry, {
      module: 'finance',
      type: 'transfer',
      walletId: 'bank',
      destinationId: 'cash',
      name: 'Transfer',
    });
    const n = applyCommand(s, c, 'x', now);
    expect(balance(n, 'bank')).toBe(balance(s, 'bank') - 100000);
    expect(balance(n, 'cash')).toBe(balance(s, 'cash') + 100000);
    expect(finance(n, date).expense).toBe(finance(s, date).expense);
    expect(n.entries.filter((e) => e.type === 'transfer')).toHaveLength(1);
  });
  it('AC12 deletion reverses expense and restores balance', () => {
    const s = previewState(now);
    const n = applyCommand(s, { action: 'entry.delete', id: 'e5', version: 1 }, 'x', now);
    expect(balance(n, 'bank')).toBe(1500000);
    expect(finance(n, date).expense).toBe(0);
    expect(n.entries[4].version).toBe(2);
  });
  it('rejects same-wallet transfer', () => {
    const c = water(100);
    if (c.action === 'entry.create')
      Object.assign(c.entry, {
        module: 'finance',
        type: 'transfer',
        walletId: 'bank',
        destinationId: 'bank',
      });
    expect(() => applyCommand(previewState(now), c, 'x', now)).toThrow(/différent|khác|berbeda/);
  });
});
describe('access matrix', () => {
  const active: Access = {
    verified: true,
    setup: true,
    status: 'active',
    entitlement: 'active',
    expires: null,
    sessionExpires: '2026-10-12T05:00:00Z',
    idleExpires: '2026-10-06T05:00:00Z',
  };
  it('AC03 separates verification setup entitlement suspension', () => {
    expect(accessLevel(active, now)).toBe('product');
    expect(accessLevel({ ...active, verified: false }, now)).toBe('verify');
    expect(accessLevel({ ...active, setup: false }, now)).toBe('setup');
    expect(accessLevel({ ...active, entitlement: 'none' }, now)).toBe('limited');
    expect(accessLevel({ ...active, status: 'suspended' }, now)).toBe('suspended');
  });
  it('AC26 grant expiry and stale session do not permit product', () => {
    expect(accessLevel({ ...active, expires: '2026-10-04T00:00:00Z' }, now)).toBe('limited');
    expect(accessLevel({ ...active, idleExpires: '2026-10-04T00:00:00Z' }, now)).toBe('expired');
  });
});

describe('source contracts', () => {
  it('exercise session counts are independent of minutes', () => {
    const s = previewState(now);
    s.habits[0].kind = 'count';
    s.habits[0].unit = 'sesi';
    s.habits[0].rules[0].target = 2;
    expect(dayProgress(s, date).completed).toBe(2);
  });
  it('water never accepts explicit habit linkage', () => {
    const c = water(250);
    if (c.action === 'entry.create') c.entry.habitId = 'water';
    expect(() => applyCommand(previewState(now), c, 'x', now)).toThrow(/tanpa tautan/);
  });
});

describe('hydration effective dates', () => {
  it('scheduled archive does not permit overlapping active water targets', () => {
    const s = previewState(now);
    s.habits[3].archived = '2026-10-07';
    expect(() =>
      applyCommand(
        s,
        {
          action: 'habit.create',
          name: 'Air kedua',
          module: 'water',
          kind: 'count',
          unit: 'ml',
          target: 2000,
          days: [0, 1, 2, 3, 4, 5, 6],
          effective: '2026-10-06',
        },
        'x',
        now,
      ),
    ).toThrow(/satu habit/);
  });
});
