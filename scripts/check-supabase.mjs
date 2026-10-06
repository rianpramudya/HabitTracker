// Read-only network smoke test; never prints credentials or response payloads.
import { readFileSync } from 'node:fs';
const values = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const at = line.indexOf('=');
      return [line.slice(0, at), line.slice(at + 1).trim()];
    }),
);
const url = values.NEXT_PUBLIC_SUPABASE_URL;
const key = values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('URL or publishable key missing');
let failures = 0;
for (const path of [
  '/rest/v1/profiles?select=owner_id&limit=1',
  '/rest/v1/entries?select=id&limit=1',
  '/rest/v1/rpc/read_core',
  '/rest/v1/rpc/commit_core',
]) {
  const rpc = path.includes('/rpc/');
  const response = await fetch(url + path, {
    method: rpc ? 'POST' : 'GET',
    headers: { apikey: key, ...(rpc ? { 'Content-Type': 'application/json' } : {}) },
    ...(rpc
      ? {
          body: JSON.stringify(
            path.endsWith('/commit_core')
              ? {
                  p_owner: '00000000-0000-4000-8000-000000000001',
                  p_session: '00000000-0000-4000-8000-000000000002',
                  p_revision: 0,
                  p_operation: '00000000-0000-4000-8000-000000000003',
                  p_input: {},
                  p_state: {},
                }
              : {},
          ),
        }
      : {}),
    signal: AbortSignal.timeout(15000),
  });
  const denied = [401, 403, 404].includes(response.status);
  if (!denied) failures++;
  console.log(
    `${path.split('?')[0]}: ${response.status}, ${denied ? 'anonymous access denied' : 'UNEXPECTED RESULT'}`,
  );
}
const settings = await fetch(url + '/auth/v1/settings', {
  headers: { apikey: key },
  signal: AbortSignal.timeout(15000),
});
if (settings.ok) {
  const data = await settings.json();
  console.log(
    JSON.stringify({
      authSettingsReadable: true,
      signupDisabled: data.disable_signup,
      emailEnabled: data.external?.email,
      emailAutoconfirm: data.mailer_autoconfirm,
    }),
  );
}
if (failures) process.exitCode = 1;
