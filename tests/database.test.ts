import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { previewState } from '@/lib/preview';
let db: PGlite;
const a = '00000000-0000-4000-8000-000000000001',
  b = '00000000-0000-4000-8000-000000000002';
const session = '00000000-0000-4000-8000-000000000003';
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid',true),'')::uuid $$;create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt',true),''),'{}')::jsonb $$;grant usage on schema auth to authenticated,service_role;grant execute on function auth.uid(),auth.jwt() to authenticated;`,
  );
  for (const file of readdirSync('supabase/migrations').sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
  await db.exec(
    `insert into auth.users values('${a}',now()),('${b}',now());insert into auth.sessions values('${session}','${a}',now()+interval '7 days');insert into private.account_access values('${a}',true,'active'),('${b}',true,'active');insert into private.entitlements(owner_id,status,source,actor_id,reason) values('${a}','active','beta_grant','${a}','Synthetic test');insert into private.session_guards values('${session}','${a}',now(),now()+interval '7 days',now()+interval '24 hours',false);insert into public.profiles values('${a}','Alex',0),('${b}','Blair',0);insert into public.preferences values('${a}','id','system','Asia/Jakarta',array['custom','exercise','study','water','finance','reflection']),('${b}','id','system','Asia/Jakarta',array['custom']);`,
  );
});
afterAll(async () => {
  await db?.close();
});
async function asUser(sql: string, user = a, sid = session) {
  return db.transaction(async (tx) => {
    await tx.exec(
      `set local role authenticated;select set_config('request.uid','${user}',true);select set_config('request.jwt','{"session_id":"${sid}"}',true);`,
    );
    return tx.query(sql);
  });
}
async function asService(sql: string) {
  return db.transaction(async (tx) => {
    await tx.exec('set local role service_role');
    return tx.query(sql);
  });
}
describe('PostgreSQL policies and atomic commit', () => {
  it('migration compiles and RLS blocks account B and direct writes', async () => {
    const result = await asUser('select owner_id from public.profiles');
    expect(result.rows).toEqual([{ owner_id: a }]);
    await expect(
      asUser(`insert into public.wallets values('bad','${a}','Bad',0,false)`),
    ).rejects.toThrow();
    await expect(
      asUser(`select public.commit_core('${a}','${session}',0,gen_random_uuid(),'{}','{}')`),
    ).rejects.toThrow();
  });
  it('atomically saves and replays idempotent operations', async () => {
    const state = previewState();
    const op = '00000000-0000-4000-8000-000000000004';
    const input = { action: 'seed.synthetic' };
    const run = () =>
      db.query(`select public.commit_core($1,$2,0,$3,$4,$5) as result`, [
        a,
        session,
        op,
        JSON.stringify(input),
        JSON.stringify(state),
      ]);
    const first = await run();
    const second = await run();
    expect(second.rows).toEqual(first.rows);
    const result = await asUser('select public.read_core() as snapshot');
    const snapshot = result.rows[0] as {
      snapshot: { state: { entries: unknown[] }; revision: number };
    };
    expect(snapshot.snapshot.state.entries).toHaveLength(5);
    expect(snapshot.snapshot.revision).toBe(1);
  });
  it('cross-owner references cannot enter ledger', async () => {
    await expect(
      db.exec(
        `insert into public.entries(id,owner_id,module,local_date,occurred_at,timezone,name,amount,type,wallet_id,category,method,note) values('attack','${b}','finance',current_date,now(),'UTC','Attack',10,'expense','bank','','','')`,
      ),
    ).rejects.toThrow();
  });
  it('revision conflicts leave balances unchanged', async () => {
    const state = previewState();
    await expect(
      db.query(`select public.commit_core($1,$2,0,$3,'{}',$4)`, [
        a,
        session,
        '00000000-0000-4000-8000-000000000005',
        JSON.stringify(state),
      ]),
    ).rejects.toThrow(/concurrent change/);
    const count = await db.query('select count(*)::integer as n from public.entries');
    expect(count.rows[0]).toMatchObject({ n: 5 });
  });
  it('failed transfer snapshot rolls back all rows and revision', async () => {
    const state = previewState();
    state.entries[4].destinationId = 'missing';
    state.entries[4].type = 'transfer';
    await expect(
      db.query(`select public.commit_core($1,$2,1,$3,'{}',$4)`, [
        a,
        session,
        '00000000-0000-4000-8000-000000000006',
        JSON.stringify(state),
      ]),
    ).rejects.toThrow();
    expect(
      (await db.query('select revision from public.profiles where owner_id=$1', [a])).rows[0],
    ).toMatchObject({ revision: 1 });
  });
  it('rejects reuse of operation key with different payload', async () => {
    await expect(
      db.query(`select public.commit_core($1,$2,1,$3,'{"different":true}',$4)`, [
        a,
        session,
        '00000000-0000-4000-8000-000000000004',
        JSON.stringify(previewState()),
      ]),
    ).rejects.toThrow(/key reused/);
  });
  it('revoking grants blocks RLS including existing session', async () => {
    await db.exec(`update private.entitlements set status='revoked' where owner_id='${a}'`);
    expect((await asUser('select * from public.entries')).rows).toEqual([]);
    await expect(asUser('select public.read_core()')).rejects.toThrow(/access denied/);
    await db.exec(`update private.entitlements set status='active' where owner_id='${a}'`);
  });
  it('suspension blocks every private table despite active grant', async () => {
    await db.exec(`update private.account_access set status='suspended' where owner_id='${a}'`);
    expect((await asUser('select * from public.wallets')).rows).toEqual([]);
    await db.exec(`update private.account_access set status='active' where owner_id='${a}'`);
  });
  it('keeps social posts private, filters blocks, and denies direct Data API reads', async () => {
    const bSession = '00000000-0000-4000-8000-000000000007';
    const privatePost = '00000000-0000-4000-8000-000000000008';
    const communityPost = '00000000-0000-4000-8000-000000000009';
    await db.exec(`insert into auth.sessions values('${bSession}','${b}',now()+interval '7 days');
      insert into private.entitlements(owner_id,status,source,actor_id,reason) values('${b}','active','beta_grant','${b}','Synthetic test');
      insert into private.session_guards values('${bSession}','${b}',now(),now()+interval '7 days',now()+interval '24 hours',false);`);
    await db.query('select public.social_join($1,$2)', [a, session]);
    await db.query('select public.social_join($1,$2)', [b, bSession]);
    await db.query('select public.social_create($1,$2,$3,$4,$5,$6)', [
      a,
      session,
      privatePost,
      'private note',
      'private',
      null,
    ]);
    await db.query('select public.social_create($1,$2,$3,$4,$5,$6)', [
      a,
      session,
      communityPost,
      'shared note',
      'community',
      null,
    ]);
    const feed = await db.query('select public.social_feed($1,$2,null,null,20) as result', [
      b,
      bSession,
    ]);
    const posts = (feed.rows[0] as { result: { posts: { id: string }[] } }).result.posts;
    expect(posts.map((post) => post.id)).toEqual([communityPost]);
    const serviceFeed = await asService(
      `select public.social_feed('${b}','${bSession}',null,null,20) as result`,
    );
    expect(
      (serviceFeed.rows[0] as { result: { posts: { id: string }[] } }).result.posts.map(
        (post) => post.id,
      ),
    ).toEqual([communityPost]);
    await expect(asUser(`select private.social_author_active('${a}')`)).rejects.toThrow(
      /permission denied/,
    );
    await expect(asUser('select * from public.social_posts')).rejects.toThrow(/permission denied/);
    await db.query('select public.social_report($1,$2,$3,$4)', [
      b,
      bSession,
      communityPost,
      'Spam',
    ]);
    expect(
      (await db.query('select count(*)::integer as n from private.social_reports')).rows[0],
    ).toMatchObject({ n: 1 });
    await db.query('select public.social_block($1,$2,$3,true)', [b, bSession, a]);
    const blocked = await db.query('select public.social_feed($1,$2,null,null,20) as result', [
      b,
      bSession,
    ]);
    expect((blocked.rows[0] as { result: { posts: unknown[] } }).result.posts).toEqual([]);
    await expect(
      db.query('select public.social_edit($1,$2,$3,1,$4,$5)', [
        b,
        bSession,
        communityPost,
        'attack',
        'community',
      ]),
    ).rejects.toThrow();
    await db.query('select public.social_block($1,$2,$3,false)', [b, bSession, a]);
    await db.exec(`insert into private.roles values('${b}','moderator')`);
    const queue = await db.query('select public.social_moderation_queue($1,$2) as result', [
      b,
      bSession,
    ]);
    const report = (queue.rows[0] as { result: { id: string }[] }).result[0];
    expect(report).toMatchObject({ body: 'shared note', reason: 'Spam' });
    await db.query('select public.social_moderate($1,$2,$3,true,$4)', [
      b,
      bSession,
      report.id,
      'Confirmed spam',
    ]);
    const hidden = await db.query('select public.social_feed($1,$2,null,null,20) as result', [
      b,
      bSession,
    ]);
    expect((hidden.rows[0] as { result: { posts: unknown[] } }).result.posts).toEqual([]);
    await db.exec(`update private.entitlements set status='revoked' where owner_id='${a}'`);
    await expect(
      db.query('select public.social_feed($1,$2,null,null,20)', [a, session]),
    ).rejects.toThrow(/access denied/);
    await db.exec(`update private.entitlements set status='active' where owner_id='${a}'`);
  });
  it('searches visible members and gates profile photos and private stories', async () => {
    const bSession = '00000000-0000-4000-8000-000000000007';
    const people = await asService(
      `select public.social_people('${a}','${session}','Bl') as result`,
    );
    expect(
      (people.rows[0] as { result: { id: string }[] }).result.map((person) => person.id),
    ).toEqual([b]);
    const profile = await asService(
      `select public.social_profile('${b}','${bSession}','${a}') as result`,
    );
    expect(
      (profile.rows[0] as { result: { mine: boolean; posts: { visibility: string }[] } }).result,
    ).toMatchObject({ mine: false });
    expect(
      (profile.rows[0] as { result: { posts: { visibility: string }[] } }).result.posts.every(
        (post) => post.visibility === 'community',
      ),
    ).toBe(true);
    const own = await asService(
      `select public.social_profile('${a}','${session}','${a}') as result`,
    );
    expect(
      (own.rows[0] as { result: { posts: { body: string }[] } }).result.posts.some(
        (post) => post.body === 'private note',
      ),
    ).toBe(true);
    await expect(asUser(`select public.social_people('${a}','${session}','Bl')`)).rejects.toThrow();
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString('base64');
    const upload = await asService(
      `select public.social_avatar_put('${a}','${session}','image/png','${png}') as version`,
    );
    expect((upload.rows[0] as { version: string }).version).toBeTruthy();
    const photo = await asService(
      `select public.social_avatar_get('${b}','${bSession}','${a}') as result`,
    );
    expect((photo.rows[0] as { result: { data: string } }).result.data).toBe(png);
    await expect(
      asService(`select public.social_avatar_put('${a}','${bSession}','image/png','${png}')`),
    ).rejects.toThrow(/access denied/);
    await expect(
      asService(
        `select public.social_avatar_put('${a}','${session}','image/png','invalid-base64')`,
      ),
    ).rejects.toThrow();
    const unchanged = await asService(
      `select public.social_avatar_get('${a}','${session}','${a}') as result`,
    );
    expect((unchanged.rows[0] as { result: { data: string } }).result.data).toBe(png);
    await expect(asUser(`select * from private.social_avatars`)).rejects.toThrow();
    await asService(`select public.social_block('${b}','${bSession}','${a}',true)`);
    const blocked = await asService(
      `select public.social_avatar_get('${b}','${bSession}','${a}') as result`,
    );
    expect((blocked.rows[0] as { result: unknown }).result).toBeNull();
    const hidden = await asService(
      `select public.social_profile('${b}','${bSession}','${a}') as result`,
    );
    expect((hidden.rows[0] as { result: unknown }).result).toBeNull();
    await asService(`select public.social_block('${b}','${bSession}','${a}',false)`);
    const revision = (await asService(`select revision from public.profiles where owner_id='${a}'`))
      .rows[0] as { revision: number };
    const renamed = await asService(
      `select public.social_profile_rename('${a}','${session}',${revision.revision},'Alex New') as revision`,
    );
    expect((renamed.rows[0] as { revision: number }).revision).toBe(revision.revision + 1);
    await expect(
      asService(
        `select public.social_profile_rename('${a}','${session}',${revision.revision},'Stale')`,
      ),
    ).rejects.toThrow(/profile conflict/);
    await asService(`select public.social_avatar_remove('${a}','${session}')`);
    const removed = await asService(
      `select public.social_avatar_get('${a}','${session}','${a}') as result`,
    );
    expect((removed.rows[0] as { result: unknown }).result).toBeNull();
  });
  it('deleted native auth session blocks stale JWT', async () => {
    await db.exec(
      `delete from private.session_guards where id='${session}';delete from auth.sessions where id='${session}'`,
    );
    expect((await asUser('select * from public.profiles')).rows).toEqual([]);
  });
});
