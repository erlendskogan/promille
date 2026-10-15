-- Run after the app no longer reads users.weight / users.sex
alter table public.users drop column if exists weight;
alter table public.users drop column if exists sex;
