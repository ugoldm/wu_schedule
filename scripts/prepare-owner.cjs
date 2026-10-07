const fs = require('node:fs');
const email = process.argv[2];
if (!/^[^\s'<>]+@[^\s'<>]+\.[^\s'<>]+$/.test(email || '')) throw new Error('Provide the Google email of the owner account.');
// This file is ignored by Git. Run it only in the trusted Supabase SQL editor,
// after that Google account has signed in once.
fs.writeFileSync('supabase/owner-account.local.sql', `-- Run after the owner signs in with Google once.\n\ndo $$
declare v_user uuid; v_count integer;
begin
  select count(distinct u.id), min(u.id::text)::uuid into v_count, v_user
  from auth.users u join auth.identities i on i.user_id = u.id
  where i.provider = 'google'
    and lower(i.identity_data ->> 'email') = lower('${email}')
    and u.email_confirmed_at is not null;
  if v_count <> 1 then
    raise exception 'Expected exactly one verified Google account. Sign in with the owner account first.';
  end if;
  insert into private.owner_accounts(user_id) values(v_user) on conflict do nothing;
end;
$$;
`);
console.log('Created supabase/owner-account.local.sql (excluded from Git).');
