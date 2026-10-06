export type Access = {
  verified: boolean;
  setup: boolean;
  status: 'active' | 'suspended';
  entitlement: 'none' | 'active' | 'revoked';
  expires: string | null;
  sessionExpires: string;
  idleExpires: string;
};
export function accessLevel(
  a: Access,
  now = new Date(),
): 'verify' | 'setup' | 'suspended' | 'expired' | 'limited' | 'product' {
  if (a.status === 'suspended') return 'suspended';
  if (!a.verified) return 'verify';
  if (!a.setup) return 'setup';
  if (Date.parse(a.sessionExpires) <= +now || Date.parse(a.idleExpires) <= +now) return 'expired';
  if (a.entitlement !== 'active' || (a.expires !== null && Date.parse(a.expires) <= +now))
    return 'limited';
  return 'product';
}
