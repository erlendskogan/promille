-- Promille: weight and sex are private.
-- They move to a closed table; each entry instead carries its promille contribution
-- ("dose"), computed in the database, so friends' curves need no one's weight.

create table if not exists public.user_private (
  key      text primary key references public.users (key) on delete cascade on update cascade,
  weight   int  not null check (weight between 30 and 250),
  sex      text not null check (sex in ('m', 'f')),
  is_admin boolean not null default false
);
alter table public.user_private enable row level security;
revoke all on public.user_private from anon, authenticated;

insert into public.user_private (key, weight, sex)
select key, weight, sex from public.users
on conflict (key) do nothing;
update public.user_private set is_admin = true where key = 'erlend';

-- Promille contribution of one entry for its owner (Widmark)
create or replace function public._promille_dose(p_key text, p_ml real, p_abv real, p_count int) returns real
language sql stable security definer set search_path = public as $$
  select (p_ml * (p_abv / 100) * 0.789 * p_count / (weight * case when sex = 'm' then 0.68 else 0.55 end))::real
  from user_private where key = p_key;
$$;

alter table public.entries add column if not exists dose real;

create or replace function public._promille_entry_dose() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.dose := _promille_dose(new.user_key, new.ml, new.abv, new.count);
  return new;
end $$;

drop trigger if exists entries_dose on public.entries;
create trigger entries_dose before insert or update of ml, abv, count, user_key on public.entries
for each row execute function public._promille_entry_dose();

create or replace function public._promille_redose() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update entries set dose = _promille_dose(new.key, ml, abv, count) where user_key = new.key;
  return new;
end $$;

drop trigger if exists user_private_redose on public.user_private;
create trigger user_private_redose after update of weight, sex on public.user_private
for each row execute function public._promille_redose();

update public.entries set dose = public._promille_dose(user_key, ml, abv, count);

revoke execute on function public._promille_dose(text, real, real, int), public._promille_entry_dose(), public._promille_redose()
from public, anon, authenticated;

-- Functions that used users.weight / users.sex
create or replace function public.promille_register(p_name text, p_weight int, p_sex text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare k text := lower(btrim(p_name));
begin
  if p_pin !~ '^\d{4}$' then return json_build_object('error', 'bad_pin'); end if;
  if exists (select 1 from users where key = k) then return json_build_object('error', 'name_taken'); end if;
  insert into users (key, name) values (k, btrim(p_name));
  insert into user_private (key, weight, sex) values (k, p_weight, p_sex);
  insert into user_secrets (key, pin_hash) values (k, crypt(p_pin, gen_salt('bf')));
  return json_build_object('token', _promille_token(k), 'key', k);
end $$;

create or replace function public.promille_update_profile(p_token text, p_weight int, p_sex text) returns void
language plpgsql security definer set search_path = public as $$
declare k text := _promille_user(p_token);
begin
  update user_private set weight = coalesce(p_weight, weight), sex = coalesce(p_sex, sex) where key = k;
end $$;

-- Your own private profile
create or replace function public.promille_me(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare k text := _promille_user(p_token);
begin
  return (select json_build_object('weight', weight, 'sex', sex, 'is_admin', is_admin) from user_private where key = k);
end $$;

-- Admin: everyone's private profile
create or replace function public.promille_admin_users(p_token text) returns table (key text, name text, weight int, sex text)
language plpgsql stable security definer set search_path = public as $$
declare k text := _promille_user(p_token);
begin
  if not exists (select 1 from user_private p where p.key = k and p.is_admin) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return query select u.key, u.name, p.weight, p.sex from users u join user_private p on p.key = u.key order by lower(u.name);
end $$;

grant execute on function public.promille_me(text), public.promille_admin_users(text) to anon;

-- Old app versions may still be open; let their reads work until 008 drops the columns
alter table public.users alter column weight drop not null;
alter table public.users alter column sex drop not null;
