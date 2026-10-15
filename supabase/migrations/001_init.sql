-- Promille: database schema. Paste into Supabase → SQL Editor → Run.

create table if not exists public.users (
  key        text primary key,
  name       text not null check (char_length(name) between 1 and 32),
  weight     int  not null check (weight between 30 and 250),
  sex        text not null check (sex in ('m', 'f')),
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id         text primary key,
  user_key   text not null references public.users (key) on delete cascade on update cascade,
  drink_id   text not null,
  name       text not null,
  ml         real not null check (ml > 0 and ml <= 5000),
  abv        real not null check (abv >= 0 and abv <= 100),
  count      int  not null default 1 check (count between 1 and 50),
  time       timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists entries_user_time on public.entries (user_key, time desc);
create index if not exists entries_time on public.entries (time desc);

-- Login is name-only, so the app talks to the database with the public anon key.
alter table public.users enable row level security;
alter table public.entries enable row level security;

drop policy if exists "open users" on public.users;
create policy "open users" on public.users for all to anon using (true) with check (true);
drop policy if exists "open entries" on public.entries;
create policy "open entries" on public.entries for all to anon using (true) with check (true);

grant select, insert, update, delete on public.users, public.entries to anon;

-- Live updates
alter table public.entries replica identity full;
alter table public.users replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.users, public.entries;
exception when duplicate_object then null;
end $$;
