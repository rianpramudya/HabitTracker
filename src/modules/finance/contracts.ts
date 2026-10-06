import { z } from 'zod';

const amount = z.number().int().positive().max(1_000_000_000_000);
export const financialCommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('bill.create'), name: z.string().trim().min(1).max(100), amount, dueDate: z.iso.date(), frequency: z.enum(['once', 'weekly', 'monthly']), category: z.string().trim().min(1).max(60), note: z.string().max(2000) }),
  z.object({ action: z.literal('bill.archive'), id: z.uuid() }),
  z.object({ action: z.literal('bill.pay'), id: z.uuid(), amount, walletId: z.string().min(1), method: z.string().trim().min(1).max(60) }),
  z.object({ action: z.literal('option.create'), kind: z.enum(['category', 'method']), name: z.string().trim().min(1).max(60) }),
  z.object({ action: z.literal('option.archive'), id: z.uuid() }),
  z.object({ action: z.literal('wallet.rename'), id: z.string().min(1), name: z.string().trim().min(1).max(60) }),
]);
export type FinancialCommand = z.infer<typeof financialCommandSchema>;
export type FinancialOption = { id: string; kind: 'category' | 'method'; name: string; archived: boolean };
export type FinancialBill = { id: string; name: string; amount: number; dueDate: string; frequency: 'once' | 'weekly' | 'monthly'; category: string; note: string; archived: boolean; paid: number };
export type FinancialPayment = { id: string; billId: string; entryId: string; amount: number; createdAt: string };
export type FinancialSnapshot = { options: FinancialOption[]; bills: FinancialBill[]; payments: FinancialPayment[] };
