-- Promille: 4-digit PIN per user.
-- Reading stays open (friends see each other); every write goes through
-- the functions below, which require a session from promille_login/register.

create extension if not exists pgcrypto with schema extensions;

-- Names: anything non-empty
alter table public.users drop constraint if exists users_name_check;
alter table public.users add constraint users_name_check check (char_length(btrim(name)) between 1 and 50);

create table if not exists public.user_secrets (
  key          text primary key references public.users (key) on delete cascade on update cascade,
  pin_hash     text,
  failed       int not null default 0,
  locked_until timestamptz
);

create table if not exists public.sessions (
  token_hash text primary key,
  user_key   text not null references public.users (key) on delete cascade on update cascade,
  created_at timestamptz not null default now()
);

alter table public.user_secrets enable row level security;
alter table public.sessions enable row level security;
revoke all on public.user_secrets, public.sessions from anon, authenticated;

-- Existing users have no PIN yet; they choose one at their next login
insert into public.user_secrets (key) select key from public.users on conflict do nothing;

-- Read-only access for the app
drop policy if exists "open users" on public.users;
drop policy if exists "open entries" on public.entries;
drop policy if exists "read users" on public.users;
drop policy if exists "read entries" on public.entries;
create policy "read users" on public.users for select to anon using (true);
create policy "read entries" on public.entries for select to anon using (true);
revoke insert, update, delete on public.users, public.entries from anon, authenticated;
grant select on public.users, public.entries to anon;

-- ───── internal helpers ─────

create or replace function public._promille_token(p_key text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text := encode(gen_random_bytes(24), 'hex');
begin
  insert into sessions (token_hash, user_key) values (encode(digest(t, 'sha256'), 'hex'), p_key);
  return t;
end $$;

create or replace function public._promille_user(p_token text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare k text;
begin
  select user_key into k from sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if k is null then
    raise exception 'invalid_session' using errcode = '28000';
  end if;
  return k;
end $$;

revoke execute on function public._promille_token(text), public._promille_user(text) from public, anon, authenticated;

-- ───── auth ─────

create or replace function public.promille_register(p_name text, p_weight int, p_sex text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare k text := lower(btrim(p_name));
begin
  if p_pin !~ '^\d{4}$' then return json_build_object('error', 'bad_pin'); end if;
  if exists (select 1 from users where key = k) then return json_build_object('error', 'name_taken'); end if;
  insert into users (key, name, weight, sex) values (k, btrim(p_name), p_weight, p_sex);
  insert into user_secrets (key, pin_hash) values (k, crypt(p_pin, gen_salt('bf')));
  return json_build_object('token', _promille_token(k), 'key', k);
end $$;

create or replace function public.promille_login(p_name text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  k text := lower(btrim(p_name));
  s user_secrets;
begin
  select * into s from user_secrets where key = k for update;
  if not found then
    if not exists (select 1 from users where key = k) then return json_build_object('error', 'no_user'); end if;
    insert into user_secrets (key) values (k) returning * into s;
  end if;
  if s.locked_until is not null and s.locked_until > now() then
    return json_build_object('error', 'locked', 'until', s.locked_until);
  end if;
  if p_pin !~ '^\d{4}$' then return json_build_object('error', 'bad_pin'); end if;

  -- user from before PINs existed: the first PIN entered becomes theirs
  if s.pin_hash is null then
    update user_secrets set pin_hash = crypt(p_pin, gen_salt('bf')), failed = 0, locked_until = null where key = k;
    return json_build_object('token', _promille_token(k), 'key', k, 'claimed', true);
  end if;

  if crypt(p_pin, s.pin_hash) = s.pin_hash then
    update user_secrets set failed = 0, locked_until = null where key = k;
    return json_build_object('token', _promille_token(k), 'key', k);
  end if;

  if s.failed + 1 >= 5 then
    update user_secrets set failed = 0, locked_until = now() + interval '15 minutes' where key = k;
    return json_build_object('error', 'locked', 'until', now() + interval '15 minutes');
  end if;
  update user_secrets set failed = s.failed + 1 where key = k;
  return json_build_object('error', 'wrong_pin', 'left', 5 - (s.failed + 1));
end $$;

create or replace function public.promille_has_pin(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_secrets where key = lower(btrim(p_name)) and pin_hash is not null);
$$;

create or replace function public.promille_whoami(p_token text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select user_key from sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

create or replace function public.promille_logout(p_token text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

create or replace function public.promille_change_pin(p_token text, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare k text := _promille_user(p_token);
begin
  if p_pin !~ '^\d{4}$' then raise exception 'bad_pin'; end if;
  update user_secrets set pin_hash = crypt(p_pin, gen_salt('bf')), failed = 0, locked_until = null where key = k;
end $$;

-- ───── writes ─────

create or replace function public.promille_add_entries(p_token text, p_entries jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare k text := _promille_user(p_token);
begin
  insert into entries (id, user_key, drink_id, name, ml, abv, count, time)
  select e->>'id', k, e->>'drink_id', e->>'name', (e->>'ml')::real, (e->>'abv')::real,
         (e->>'count')::int, (e->>'time')::timestamptz
  from jsonb_array_elements(p_entries) e
  on conflict (id) do nothing;
end $$;

create or replace function public.promille_delete_entry(p_token text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare k text := _promille_user(p_token);
begin
  delete from entries where id = p_id and user_key = k;
end $$;

create or replace function public.promille_clear_entries(p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare k text := _promille_user(p_token);
begin
  delete from entries where user_key = k;
end $$;

create or replace function public.promille_update_profile(p_token text, p_weight int, p_sex text) returns void
language plpgsql security definer set search_path = public as $$
declare k text := _promille_user(p_token);
begin
  update users set weight = coalesce(p_weight, weight), sex = coalesce(p_sex, sex) where key = k;
end $$;

create or replace function public.promille_delete_user(p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare k text := _promille_user(p_token);
begin
  delete from users where key = k;
end $$;

grant execute on function
  public.promille_register(text, int, text, text),
  public.promille_login(text, text),
  public.promille_has_pin(text),
  public.promille_whoami(text),
  public.promille_logout(text),
  public.promille_change_pin(text, text),
  public.promille_add_entries(text, jsonb),
  public.promille_delete_entry(text, text),
  public.promille_clear_entries(text),
  public.promille_update_profile(text, int, text),
  public.promille_delete_user(text)
to anon;
