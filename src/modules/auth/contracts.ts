import { z } from 'zod';

const email = z
  .email()
  .max(254)
  .transform((value) => value.trim());
const password = z.string().min(15).max(128);
export const authRequest = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('login'), email, password: z.string().min(1).max(128) }),
  z.strictObject({ action: z.literal('register'), email, password, adult: z.literal(true) }),
  z.strictObject({ action: z.literal('logout') }),
]);
export type AuthRequest = z.infer<typeof authRequest>;
export type AuthScreen = 'login' | 'register';
export const authScreens: AuthScreen[] = ['login', 'register'];
export type AuthFailure = 'unavailable' | 'invalid' | 'rate_limited' | 'credentials' | 'network';
export type AuthResult =
  | { ok: false; code: AuthFailure; retryAfter?: number }
  | { ok: true; next: 'account' | 'dashboard' | 'login' };

// Destinations come from this allowlist, never an arbitrary next/redirect URL.
export function authDestination(next: Extract<AuthResult, { ok: true }>['next']) {
  return next === 'dashboard' ? '/dashboard' : next === 'account' ? '/account' : '/login';
}
