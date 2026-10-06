import type { State, Entry } from '@/modules/tracking/domain';
import { localDate } from '@/modules/tracking/domain';
export function previewState(now = new Date()): State {
  const date = localDate(now, 'Asia/Jakarta');
  const all = [0, 1, 2, 3, 4, 5, 6];
  const base = {
    created: date,
    archived: null,
    rules: [{ effective: date, target: 1, days: all }],
  };
  const state: State = {
    preferences: {
      name: 'Alex',
      language: 'id',
      theme: 'system',
      timezone: 'Asia/Jakarta',
      enabled: ['custom', 'exercise', 'water', 'study', 'fasting', 'finance', 'reflection'],
    },
    wallets: [
      { id: 'bank', name: 'Rekening utama', opening: 1500000, archived: false },
      { id: 'cash', name: 'Tunai', opening: 200000, archived: false },
    ],
    habits: [
      {
        ...base,
        id: 'exercise',
        name: 'Bergerak lebih aktif',
        module: 'exercise',
        kind: 'duration',
        unit: 'menit',
        rules: [{ effective: date, target: 45, days: all }],
      },
      {
        ...base,
        id: 'study',
        name: 'Waktu untuk belajar',
        module: 'study',
        kind: 'duration',
        unit: 'menit',
        rules: [{ effective: date, target: 30, days: all }],
      },
      {
        ...base,
        id: 'custom',
        name: 'Meditasi sejenak',
        module: 'custom',
        kind: 'checklist',
        unit: '',
      },
      {
        ...base,
        id: 'water',
        name: 'Minum air',
        module: 'water',
        kind: 'count',
        unit: 'ml',
        rules: [{ effective: date, target: 2000, days: all }],
      },
      {
        ...base,
        id: 'read',
        name: 'Baca beberapa halaman',
        module: 'custom',
        kind: 'checklist',
        unit: '',
      },
    ],
    entries: [],
  };
  const e = (
    id: string,
    module: Entry['module'],
    amount: number,
    habitId: string | null,
    name: string,
  ): Entry => ({
    id,
    module,
    amount,
    habitId,
    name,
    date,
    occurredAt: now.toISOString(),
    timezone: 'Asia/Jakarta',
    type: 'log',
    walletId: null,
    destinationId: null,
    category: '',
    method: '',
    note: '',
    version: 1,
    deleted: false,
  });
  state.entries = [
    e('e1', 'exercise', 45, 'exercise', 'Bergerak lebih aktif'),
    e('e2', 'study', 30, 'study', 'Waktu untuk belajar'),
    e('e3', 'custom', 1, 'custom', 'Meditasi sejenak'),
    e('e4', 'water', 750, null, 'Minum air'),
    {
      ...e('e5', 'finance', 75000, null, 'Makan siang'),
      type: 'expense',
      walletId: 'bank',
      category: 'Makanan',
      method: 'debit',
    },
  ];
  return state;
}
