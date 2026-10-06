import { z } from 'zod';
export const modules = [
  'custom',
  'exercise',
  'water',
  'study',
  'fasting',
  'finance',
  'reflection',
] as const;
export type Module = (typeof modules)[number];
export type Habit = {
  id: string;
  name: string;
  module: Module;
  kind: 'checklist' | 'count' | 'duration';
  unit: string;
  created: string;
  archived: string | null;
  rules: { effective: string; target: number; days: number[] }[];
};
export type Entry = {
  id: string;
  module: Module;
  date: string;
  occurredAt: string;
  timezone: string;
  name: string;
  amount: number;
  habitId: string | null;
  type: 'log' | 'income' | 'expense' | 'transfer';
  walletId: string | null;
  destinationId: string | null;
  category: string;
  method: string;
  note: string;
  version: number;
  deleted: boolean;
};
export type Wallet = { id: string; name: string; opening: number; archived: boolean };
export type Preferences = {
  name: string;
  language: 'id' | 'en';
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  enabled: Module[];
};
export type State = {
  habits: Habit[];
  entries: Entry[];
  wallets: Wallet[];
  preferences: Preferences;
};
const date = z.iso.date();
const positive = z.number().int().positive().max(1_000_000_000_000);
const entry = z.object({
  module: z.enum(modules),
  date,
  occurredAt: z.iso.datetime(),
  timezone: z.string().min(1).max(60),
  name: z.string().min(1).max(100),
  amount: positive,
  habitId: z.string().nullable(),
  type: z.enum(['log', 'income', 'expense', 'transfer']),
  walletId: z.string().nullable(),
  destinationId: z.string().nullable(),
  category: z.string().max(60),
  method: z.string().max(60),
  note: z.string().max(2000),
});
export const commandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('entry.create'), entry }),
  z.object({ action: z.literal('entry.edit'), id: z.string(), version: z.number().int(), entry }),
  z.object({ action: z.literal('entry.delete'), id: z.string(), version: z.number().int() }),
  z.object({
    action: z.literal('habit.create'),
    name: z.string().trim().min(1).max(80),
    module: z.enum(modules),
    kind: z.enum(['checklist', 'count', 'duration']),
    unit: z.string().max(20),
    target: positive,
    days: z.array(z.number().int().min(0).max(6)).min(1),
    effective: date,
  }),
  z.object({
    action: z.literal('habit.rule'),
    id: z.string(),
    effective: date,
    target: positive,
    days: z.array(z.number().int().min(0).max(6)).min(1),
  }),
  z.object({ action: z.literal('habit.archive'), id: z.string(), effective: date }),
  z.object({
    action: z.literal('wallet.create'),
    name: z.string().trim().min(1).max(60),
    opening: z.number().int().min(-1_000_000_000_000).max(1_000_000_000_000),
  }),
  z.object({ action: z.literal('wallet.archive'), id: z.string() }),
  z.object({
    action: z.literal('preferences.update'),
    preferences: z.object({
      name: z.string().trim().min(1).max(60),
      language: z.enum(['id', 'en']),
      theme: z.enum(['light', 'dark', 'system']),
      timezone: z.string().refine((v) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, 'Zona waktu tidak valid'),
      enabled: z.array(z.enum(modules)),
    }),
    archiveDependents: z.boolean(),
  }),
]);
export type Command = z.infer<typeof commandSchema>;
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function localDate(now: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function ruleFor(h: Habit, d: string) {
  return h.rules
    .filter((r) => r.effective <= d)
    .sort((a, b) => b.effective.localeCompare(a.effective))[0];
}
export function scheduled(h: Habit, d: string) {
  const r = ruleFor(h, d);
  return (
    !!r &&
    h.created <= d &&
    (!h.archived || h.archived > d) &&
    r.days.includes(new Date(`${d}T12:00:00Z`).getUTCDay())
  );
}
export function valueFor(state: State, h: Habit, d: string) {
  return state.entries
    .filter(
      (e) =>
        !e.deleted &&
        e.date === d &&
        e.type === 'log' &&
        (h.module === 'water' ? e.module === 'water' : e.habitId === h.id),
    )
    .reduce((s, e) => s + (h.module === 'exercise' && h.kind === 'count' ? 1 : e.amount), 0);
}
export function dayProgress(state: State, d: string) {
  const habits = state.habits.filter((h) => scheduled(h, d));
  const completed = habits.filter(
    (h) => valueFor(state, h, d) >= (ruleFor(h, d)?.target ?? Infinity),
  ).length;
  return {
    habits,
    completed,
    total: habits.length,
    percent: habits.length ? Math.round((completed / habits.length) * 100) : null,
  };
}
export function finance(state: State, from: string, to = from) {
  const entries = state.entries.filter((e) => !e.deleted && e.date >= from && e.date <= to);
  return {
    income: entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0),
    expense: entries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    count: entries.filter((e) => e.type !== 'log').length,
  };
}
export function balance(state: State, wallet: string) {
  const w = state.wallets.find((w) => w.id === wallet);
  if (!w) throw new DomainError('Dompet tidak ditemukan');
  return state.entries
    .filter((e) => !e.deleted)
    .reduce(
      (s, e) =>
        s +
        (e.walletId === wallet
          ? e.type === 'income'
            ? e.amount
            : e.type === 'expense' || e.type === 'transfer'
              ? -e.amount
              : 0
          : 0) +
        (e.destinationId === wallet && e.type === 'transfer' ? e.amount : 0),
      w.opening,
    );
}
export function applyCommand(state: State, input: unknown, id: string, now = new Date()): State {
  const result = commandSchema.safeParse(input);
  if (!result.success)
    throw new DomainError(result.error.issues[0]?.message ?? 'Input tidak valid');
  const c = result.data;
  const next = structuredClone(state);
  const today = localDate(now, state.preferences.timezone);
  if (c.action.startsWith('entry.') && c.action !== 'entry.delete') {
    const e = (c as Extract<Command, { action: 'entry.create' | 'entry.edit' }>).entry;
    if (e.date > today) throw new DomainError('Pencatatan masa depan tidak diizinkan');
    if (!state.preferences.enabled.includes(e.module)) {
      if (c.action === 'entry.create') throw new DomainError('Modul belum aktif');
    }
    if (localDate(new Date(e.occurredAt), e.timezone) !== e.date)
      throw new DomainError('Tanggal dan waktu kejadian tidak konsisten');
    if (e.type === 'log') {
      if (
        e.module === 'reflection' &&
        state.entries.some(
          (x) =>
            !x.deleted &&
            x.module === 'reflection' &&
            x.date === e.date &&
            x.id !== (c.action === 'entry.edit' ? c.id : ''),
        )
      )
        throw new DomainError('Refleksi harian sudah ada; edit catatan melalui Riwayat', 409);
      if (e.module === 'water' && e.habitId !== null)
        throw new DomainError('Air memakai semua log harian, tanpa tautan habit');
      if (e.module === 'finance' && e.habitId === null)
        throw new DomainError('Pilih checklist keuangan');
      if (e.habitId) {
        const h = state.habits.find((h) => h.id === e.habitId);
        if (!h || h.module !== e.module || !scheduled(h, e.date))
          throw new DomainError('Habit tidak terjadwal');
        if (e.module === 'water' && e.habitId !== null)
          throw new DomainError('Air memakai semua log harian, tanpa tautan habit');
        if (h.kind === 'checklist' && e.amount !== 1)
          throw new DomainError('Checklist harus bernilai satu');
        if (
          h.kind === 'checklist' &&
          state.entries.some(
            (x) =>
              !x.deleted &&
              x.habitId === h.id &&
              x.date === e.date &&
              x.id !== (c.action === 'entry.edit' ? c.id : ''),
          )
        )
          throw new DomainError('Checklist sudah selesai', 409);
      } else if (e.module === 'custom' || e.module === 'fasting')
        throw new DomainError('Pilih habit untuk pencatatan ini');
    } else {
      if (e.module !== 'finance' || e.habitId !== null)
        throw new DomainError('Tipe transaksi tidak valid');
      const w = state.wallets.find((w) => w.id === e.walletId);
      if (!w || (w.archived && c.action === 'entry.create'))
        throw new DomainError('Dompet tidak tersedia');
      if (e.type !== 'transfer' && !e.category.trim())
        throw new DomainError('Kategori transaksi wajib');
      if (!e.method.trim()) throw new DomainError('Metode pembayaran wajib');
      if (e.type === 'transfer') {
        const dest = state.wallets.find((w) => w.id === e.destinationId);
        if (!dest || (dest.archived && c.action === 'entry.create') || dest.id === w.id)
          throw new DomainError('Dompet tujuan harus berbeda dan aktif');
      } else if (e.destinationId !== null) throw new DomainError('Tujuan hanya untuk transfer');
    }
  }
  switch (c.action) {
    case 'entry.create':
      next.entries.push({ ...c.entry, id, version: 1, deleted: false });
      break;
    case 'entry.edit':
    case 'entry.delete': {
      const e = next.entries.find((e) => e.id === c.id && !e.deleted);
      if (!e) throw new DomainError('Catatan tidak ditemukan', 404);
      if (e.version !== c.version)
        throw new DomainError('Data berubah di perangkat lain. Muat versi terbaru.', 409);
      if (c.action === 'entry.edit') Object.assign(e, c.entry);
      else e.deleted = true;
      e.version++;
      break;
    }
    case 'habit.create':
      if (c.effective < today)
        throw new DomainError('Habit baru tidak boleh menulis ulang jadwal masa lalu');
      if (c.module === 'water' && (c.kind !== 'count' || c.unit !== 'ml'))
        throw new DomainError('Habit air menggunakan jumlah ml');
      if (c.module === 'study' && c.kind !== 'duration')
        throw new DomainError('Habit belajar menggunakan durasi');
      if (c.module === 'exercise' && c.kind === 'checklist')
        throw new DomainError('Habit olahraga menggunakan jumlah sesi atau durasi');
      if (
        c.module === 'water' &&
        next.habits.some((h) => h.module === 'water' && (!h.archived || h.archived > c.effective))
      )
        throw new DomainError('Hanya satu habit air aktif');
      if (
        (c.module === 'fasting' && c.kind !== 'checklist') ||
        (c.module === 'finance' && c.kind !== 'checklist')
      )
        throw new DomainError('Modul ini menggunakan checklist');
      next.habits.push({
        id,
        name: c.name,
        module: c.module,
        kind: c.kind,
        unit: c.unit,
        created: c.effective,
        archived: null,
        rules: [{ effective: c.effective, target: c.target, days: c.days }],
      });
      break;
    case 'habit.rule': {
      const h = next.habits.find((h) => h.id === c.id);
      if (!h) throw new DomainError('Habit tidak ditemukan');
      if (c.effective <= today) throw new DomainError('Perubahan target berlaku paling awal besok');
      if (h.rules.some((r) => r.effective === c.effective))
        throw new DomainError('Aturan tanggal ini sudah ada', 409);
      h.rules.push({ effective: c.effective, target: c.target, days: c.days });
      break;
    }
    case 'habit.archive': {
      const h = next.habits.find((h) => h.id === c.id);
      if (!h || c.effective < today) throw new DomainError('Tanggal arsip tidak valid');
      h.archived = c.effective;
      break;
    }
    case 'wallet.create':
      next.wallets.push({ id, name: c.name, opening: c.opening, archived: false });
      break;
    case 'wallet.archive': {
      const w = next.wallets.find((w) => w.id === c.id);
      if (!w) throw new DomainError('Dompet tidak ditemukan');
      w.archived = true;
      break;
    }
    case 'preferences.update': {
      const dependencies = next.habits.filter(
        (h) => !h.archived && !c.preferences.enabled.includes(h.module),
      );
      if (dependencies.length && !c.archiveDependents)
        throw new DomainError('Arsipkan habit terkait atau batalkan penonaktifan modul');
      for (const h of dependencies) h.archived = today;
      next.preferences = c.preferences;
      break;
    }
  }
  return next;
}
