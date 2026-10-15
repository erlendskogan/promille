-- Promille: shared photo feed.
-- Metadata and image data live in separate tables so realtime only carries the small rows.

create table if not exists public.posts (
  id         text primary key,
  user_key   text not null references public.users (key) on delete cascade on update cascade,
  caption    text not null default '' check (char_length(caption) <= 500),
  width      int  not null check (width between 1 and 4000),
  height     int  not null check (height between 1 and 4000),
  promille   real,
  created_at timestamptz not null default now()
);

create index if not exists posts_created on public.posts (created_at desc);

create table if not exists public.post_images (
  post_id text primary key references public.posts (id) on delete cascade,
  data    text not null check (char_length(data) <= 1500000)
);

alter table public.posts enable row level security;
alter table public.post_images enable row level security;
drop policy if exists "read posts" on public.posts;
drop policy if exists "read post images" on public.post_images;
create policy "read posts" on public.posts for select to anon using (true);
create policy "read post images" on public.post_images for select to anon using (true);
revoke insert, update, delete on public.posts, public.post_images from anon, authenticated;
grant select on public.posts, public.post_images to anon;

alter table public.posts replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null;
end $$;

create or replace function public.promille_create_post(
  p_token text, p_id text, p_caption text, p_data text, p_width int, p_height int, p_promille real
) returns void
language plpgsql security definer set search_path = public as $$
declare k text := _promille_user(p_token);
begin
  if p_data not like 'data:image/jpeg;base64,%' then
    raise exception 'bad_image';
  end if;
  insert into posts (id, user_key, caption, width, height, promille)
  values (p_id, k, btrim(coalesce(p_caption, '')), p_width, p_height, p_promille);
  insert into post_images (post_id, data) values (p_id, p_data);
end $$;

create or replace function public.promille_delete_post(p_token text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare k text := _promille_user(p_token);
begin
  delete from posts where id = p_id and user_key = k;
end $$;

grant execute on function
  public.promille_create_post(text, text, text, text, int, int, real),
  public.promille_delete_post(text, text)
to anon;
