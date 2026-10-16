-- Promille: Widmark factor for women 0.55 -> 0.60
create or replace function public._promille_dose(p_key text, p_ml real, p_abv real, p_count int) returns real
language sql stable security definer set search_path = public as $$
  select (p_ml * (p_abv / 100) * 0.789 * p_count / (weight * case when sex = 'm' then 0.68 else 0.6 end))::real
  from user_private where key = p_key;
$$;
revoke execute on function public._promille_dose(text, real, real, int) from public, anon, authenticated;

update public.entries set dose = public._promille_dose(user_key, ml, abv, count);
