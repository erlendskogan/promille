-- Peach badge (Andy)
alter table public.users drop constraint if exists users_badge_check;
alter table public.users add constraint users_badge_check check (badge in ('gold', 'monogram', 'peach'));
update public.users set badge = 'peach' where key = 'andy';
