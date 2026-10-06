import 'server-only';

// Temporary local development path. Password signup does not prove email ownership;
// product access additionally requires explicit consent and a short-lived grant.
export function devAccountEnabled() {
  return process.env.NODE_ENV === 'development' && process.env.DEV_PASSWORD_SIGNUP === 'true';
}

export function devPersonalEnabled() {
  return devAccountEnabled() && process.env.DEV_PERSONAL_DATA === 'true';
}

export function devEmailAllowed(email: string) {
  const allowed = (process.env.DEV_SIGNUP_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return devAccountEnabled() && allowed.includes(email.toLowerCase());
}

export function localRequest(request: Request) {
  const host = new URL(request.url).hostname;
  return host === '127.0.0.1' || host === 'localhost';
}
