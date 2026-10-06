import { describe, expect, it } from 'vitest';
import { authRequest, authDestination } from '@/modules/auth/contracts';
describe('auth request boundaries', () => {
  it('requires a strong password during temporary registration and rejects extra fields', () => {
    expect(
      authRequest.safeParse({
        action: 'register',
        email: 'person@example.test',
        adult: true,
        password: 'short',
      }).success,
    ).toBe(false);
    expect(
      authRequest.safeParse({
        action: 'register',
        email: 'person@example.test',
        adult: true,
        password: 'long-example-password',
        role: 'admin',
      }).success,
    ).toBe(false);
  });
  it('requires adult declaration and rejects caller supplied ownership or roles', () => {
    expect(
      authRequest.safeParse({
        action: 'register',
        email: 'person@example.test',
        password: 'long-example-password',
        adult: false,
      }).success,
    ).toBe(false);
    expect(
      authRequest.safeParse({
        action: 'login',
        email: 'person@example.test',
        password: 'long-password',
        role: 'admin',
      }).success,
    ).toBe(false);
  });
  it('accepts plus-tag email without rewriting the identity', () => {
    const request = authRequest.parse({
      action: 'register',
      email: 'a.b+tag@example.test',
      password: 'long-example-password',
      adult: true,
    });
    expect('email' in request && request.email).toBe('a.b+tag@example.test');
  });
  it('does not expose OTP commands while email delivery is postponed', () => {
    expect(
      authRequest.safeParse({ action: 'verify', email: 'victim@example.test', code: '001234' })
        .success,
    ).toBe(false);
    expect(authRequest.safeParse({ action: 'recover', email: 'victim@example.test' }).success).toBe(
      false,
    );
  });
  it('validates long registration passwords without truncating', () => {
    expect(
      authRequest.safeParse({
        action: 'register',
        email: 'person@example.test',
        password: 'x'.repeat(14),
        adult: true,
      }).success,
    ).toBe(false);
    expect(
      authRequest.parse({
        action: 'register',
        email: 'person@example.test',
        password: 'x'.repeat(128),
        adult: true,
      }),
    ).toHaveProperty('password', 'x'.repeat(128));
  });
  it('maps only internal destinations', () => {
    expect(authDestination('account')).toBe('/account');
    expect(authDestination('login')).toBe('/login');
  });
});
