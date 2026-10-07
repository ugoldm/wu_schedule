const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const OWNER = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';

test('PostgreSQL enforces ownership, Google-only access, valid selections and revisions', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.jwt() returns jsonb language sql stable as
        $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
      create function auth.uid() returns uuid language sql stable as
        $$ select (auth.jwt()->>'sub')::uuid $$;
      grant usage on schema auth to authenticated, anon;
      grant execute on all functions in schema auth to authenticated, anon;
      insert into auth.users values ('${OWNER}'), ('${OTHER}');
    `);
    for (const file of fs.readdirSync('supabase/migrations').sort()) await db.exec(fs.readFileSync(`supabase/migrations/${file}`, 'utf8'));
    await db.query('insert into private.owner_accounts values ($1)', [OWNER]);
    const signIn = async (uid, provider = 'google', role = 'authenticated') => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: uid, app_metadata: { provider } })]);
      await db.exec(`set role ${role}`);
    };
    const context = async () => (await db.query("select public.get_schedule_context('26W') as context")).rows[0].context;
    const save = async (ids, profile = 'custom', expected = 0) => (await db.query(
      "select public.save_schedule_plan('26W', $1::text[], $2, $3::bigint) as plan", [ids, profile, expected]
    )).rows[0].plan;

    await signIn(OWNER);
    assert.equal((await context()).is_owner, true);
    assert.equal((await context()).presets.iurii.name, 'Iurii');
    const selected = ['1312', '1327', '1195', '1314', '2432'];
    const created = await save(selected, 'both');
    assert.equal(created.revision, 1);
    assert.equal(created.profile, 'both');
    assert.equal((await save(selected, 'anna', 1)).revision, 2);
    await assert.rejects(save(selected, 'both', 1), error => error.code === '40001');
    assert.equal((await context()).plan.profile, 'anna', 'stale writes do not overwrite the server');

    await signIn(OTHER);
    assert.deepEqual((await context()).presets, {});
    assert.equal((await context()).is_owner, false);
    assert.equal((await context()).plan, null);
    assert.equal((await db.query('select * from public.user_plans')).rows.length, 0, 'RLS hides owner plan');
    await assert.rejects(save(['1192', '2430'], 'iurii'), error => error.code === '42501');
    await assert.rejects(save(['1192', '2430', '9999']), error => error.code === '22023');
    await assert.rejects(save(['1192', '1312', '2430']), error => error.code === '22023');
    await assert.rejects(save(['1192', '1192', '2430']), error => error.code === '22023');
    await assert.rejects(save(['1192']), error => error.code === '22023');
    await assert.rejects(save(['1192', null, '2430']), error => error.code === '22023');
    await assert.rejects(save(['1192', '2430'], 'custom', null), error => error.code === '22023');
    await assert.rejects(db.query('select * from private.owner_accounts'), error => error.code === '42501');
    await assert.rejects(db.query('select * from private.preset_templates'), error => error.code === '42501');
    await assert.rejects(db.query('update public.user_plans set profile = $1', ['both']), error => error.code === '42501');
    await assert.rejects(db.query('delete from public.user_plans'), error => error.code === '42501');
    await assert.rejects(db.query(`insert into public.user_plans values ('${OWNER}', '26W', '{1192,2430}', 'custom', 99, now())`), error => error.code === '42501');
    const ordinary = await save(['1192', '2430']);
    assert.equal(ordinary.revision, 1);
    assert.equal((await db.query('select * from public.user_plans')).rows.length, 1);
    await assert.rejects(save(['1192', '2430'], 'custom', 0), error => error.code === '40001', 'duplicate first saves cannot overwrite');

    await signIn(OTHER, 'email');
    assert.equal((await db.query('select * from public.user_plans')).rows.length, 0);
    await assert.rejects(context(), error => error.code === '42501');
    await assert.rejects(save(['1192', '2430'], 'custom', 1), error => error.code === '42501');
    await signIn(null, '', 'anon');
    await assert.rejects(context(), error => error.code === '42501');
    await assert.rejects(db.query('select * from public.user_plans'), error => error.code === '42501');
    await db.exec('reset role');
    await db.query('delete from auth.users where id=$1', [OWNER]);
    assert.equal((await db.query('select * from private.owner_accounts')).rows.length, 0);
    assert.equal((await db.query('select * from public.user_plans')).rows.length, 1);
  } finally { await db.close(); }
});
