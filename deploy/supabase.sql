-- Run once in the Supabase SQL Editor. Re-running preserves existing records.
create table if not exists public.onway_state (
 id text primary key check (id = 'main'),
 revision bigint not null default 0 check (revision >= 0),
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.onway_state enable row level security;
revoke all on public.onway_state from anon, authenticated;
grant select, insert, update on public.onway_state to service_role;
insert into public.onway_state (id, revision, payload)
values ('main', 0, '{"revision":0,"workspace":{"version":2,"view":"admin","activeGroupId":"","groups":[]},"links":{}}'::jsonb)
on conflict (id) do nothing;
