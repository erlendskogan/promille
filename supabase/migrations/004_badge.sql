-- Promille: special profile badges. Only settable from the dashboard (no write access for the app).
alter table public.users add column if not exists badge text check (badge in ('gold'));
update public.users set badge = 'gold' where key = 'erlend';
