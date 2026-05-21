-- VARview.club Admin-Only Mode
-- Migration 003: Remove credit/payment infrastructure, simplify RPC

-- 1. Drop credit_transactions table and related objects
drop trigger if exists on_fixture_status_change on public.fixtures;
drop function if exists public.handle_fixture_status_change();

-- 2. Simplify profiles — remove unused columns
alter table public.profiles
  drop column if exists subscription_tier,
  drop column if exists credits;

-- 3. Simplify handle_new_user — no more free credits
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- 4. Simplify reveal_match_analysis — remove credit checks, admin bypass, transactions
create or replace function public.reveal_match_analysis(p_fixture_id bigint)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_analysis jsonb;
begin
  -- Return analysis directly, no authentication or credit checks needed
  select jsonb_build_object(
    'analysis', row_to_json(a.*)::jsonb,
    'fixture', row_to_json(f.*)::jsonb
  ) into v_analysis
  from public.ai_analyses a
  join public.fixtures f on f.id = a.fixture_id
  where a.fixture_id = p_fixture_id;

  if v_analysis is null then
    raise exception 'Analysis not available for this fixture';
  end if;

  return v_analysis;
end;
$$;
