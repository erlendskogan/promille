-- Monogram badge (Sven 10)
alter table public.users drop constraint if exists users_badge_check;
alter table public.users add constraint users_badge_check check (badge in ('gold', 'monogram'));
update public.users set badge = 'monogram' where key = 'sven 10';
