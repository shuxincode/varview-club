-- VARview.club Database Schema
-- Migration 001: Core tables, RLS policies, and functions

-- 0. Extensions
create extension if not exists "pgcrypto";

-- 1. Profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'monthly', 'unlimited')),
  credits integer not null default 0 check (credits >= 0),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Fixtures
create table if not exists public.fixtures (
  id bigint primary key generated always as identity,
  api_fixture_id bigint not null unique,
  league_id bigint not null,
  league_name text not null,
  season integer not null,
  round text,
  home_team text not null,
  away_team text not null,
  home_logo text,
  away_logo text,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_play', 'finished', 'postponed', 'cancelled')),
  scheduled_date timestamptz not null,
  home_goals integer,
  away_goals integer,
  home_ht_goals integer,
  away_ht_goals integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_fixtures_status on fixtures(status);
create index idx_fixtures_date on fixtures(scheduled_date);
create index idx_fixtures_league on fixtures(league_id);
create index idx_fixtures_teams on fixtures(home_team, away_team);

-- 3. AI Analyses
create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  fixture_id bigint not null references public.fixtures(id) on delete cascade,
  chairman_signed boolean not null default false,
  chairman_report text,
  analyst_a_report text,
  analyst_b_report text,
  -- 4 Pillars
  total_goals_prediction text not null check (total_goals_prediction in ('over_2.5', 'under_2.5')),
  total_goals_confidence real not null check (total_goals_confidence >= 0 and total_goals_confidence <= 1),
  btts_prediction text not null check (btts_prediction in ('yes', 'no')),
  btts_confidence real not null check (btts_confidence >= 0 and btts_confidence <= 1),
  winner_prediction text not null check (winner_prediction in ('home', 'away', 'draw')),
  winner_confidence real not null check (winner_confidence >= 0 and winner_confidence <= 1),
  first_half_goals_prediction text not null check (first_half_goals_prediction in ('over_0.5', 'under_0.5')),
  first_half_goals_confidence real not null check (first_half_goals_confidence >= 0 and first_half_goals_confidence <= 1),
  -- Dixon-Coles params
  lambda_home real not null,
  lambda_away real not null,
  -- Bayesian confidence interval
  confidence_interval_low real not null,
  confidence_interval_high real not null,
  -- Results
  success_rate real,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(fixture_id)
);

create index idx_ai_analyses_signed on ai_analyses(chairman_signed);

-- 4. User Predictions
create table if not exists public.user_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fixture_id bigint not null references public.fixtures(id) on delete cascade,
  total_goals_prediction text not null check (total_goals_prediction in ('over_2.5', 'under_2.5')),
  btts_prediction text not null check (btts_prediction in ('yes', 'no')),
  winner_prediction text not null check (winner_prediction in ('home', 'away', 'draw')),
  first_half_goals_prediction text not null check (first_half_goals_prediction in ('over_0.5', 'under_0.5')),
  is_correct boolean,
  created_at timestamptz not null default now(),
  unique(user_id, fixture_id)
);

create index idx_user_predictions_user on user_predictions(user_id);

-- 5. Credit Transactions
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  fixture_id bigint references public.fixtures(id),
  created_at timestamptz not null default now()
);

create index idx_credit_tx_user on credit_transactions(user_id);

-- 6. Rate Limits (for API rate limiting across serverless functions)
create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  ip_address text,
  route text not null,
  request_count integer not null default 1,
  window_start timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, route, window_start)
);

create index idx_rate_limits_lookup on rate_limits(user_id, route, window_start);

-- ===== Functions =====

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, credits)
  values (new.id, new.email, 5); -- 5 free credits on signup
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reveal match analysis (credits deducted only on valid reveal, with replay protection)
create or replace function public.reveal_match_analysis(p_fixture_id bigint)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_user_id uuid;
  v_credits integer;
  v_analysis jsonb;
  v_fixture_status text;
  v_existing_transaction integer;
  v_is_admin boolean;
begin
  -- Get authenticated user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select is_admin into v_is_admin from public.profiles where id = v_user_id;

  -- REPLAY PROTECTION: Check if user already paid for this fixture
  select count(*) into v_existing_transaction
  from public.credit_transactions
  where user_id = v_user_id
    and fixture_id = p_fixture_id
    and reason = 'reveal_match_analysis';

  if v_existing_transaction > 0 then
    -- User already paid — return the analysis without charging again
    select jsonb_build_object(
      'analysis', row_to_json(a.*)::jsonb,
      'fixture', row_to_json(f.*)::jsonb,
      'credits_remaining', (select credits from public.profiles where id = v_user_id)
    ) into v_analysis
    from public.ai_analyses a
    join public.fixtures f on f.id = a.fixture_id
    where a.fixture_id = p_fixture_id;

    if v_analysis is not null then
      return v_analysis;
    end if;
  end if;

  -- ADMIN BYPASS: skip credit check and deduction for admins
  if v_is_admin then
    select jsonb_build_object(
      'analysis', row_to_json(a.*)::jsonb,
      'fixture', row_to_json(f.*)::jsonb,
      'credits_remaining', (select credits from public.profiles where id = v_user_id)
    ) into v_analysis
    from public.ai_analyses a
    join public.fixtures f on f.id = a.fixture_id
    where a.fixture_id = p_fixture_id;

    if v_analysis is not null then
      return v_analysis;
    end if;
  end if;

  -- Get user credits
  select credits into v_credits from public.profiles where id = v_user_id;
  if v_credits is null or v_credits < 1 then
    raise exception 'Insufficient credits';
  end if;

  -- Check fixture is not postponed/cancelled
  select status into v_fixture_status from public.fixtures where id = p_fixture_id;
  if v_fixture_status in ('postponed', 'cancelled') then
    raise exception 'Fixture is postponed or cancelled';
  end if;

  -- Deduct credit
  update public.profiles set credits = credits - 1 where id = v_user_id;

  -- Log transaction
  insert into public.credit_transactions (user_id, amount, reason, fixture_id)
  values (v_user_id, -1, 'reveal_match_analysis', p_fixture_id);

  -- Return analysis (any fixture, not just chairman_signed)
  select jsonb_build_object(
    'analysis', row_to_json(a.*)::jsonb,
    'fixture', row_to_json(f.*)::jsonb,
    'credits_remaining', (select credits from public.profiles where id = v_user_id)
  ) into v_analysis
  from public.ai_analyses a
  join public.fixtures f on f.id = a.fixture_id
  where a.fixture_id = p_fixture_id;

  if v_analysis is null then
    -- Refund on failure
    update public.profiles set credits = credits + 1 where id = v_user_id;
    raise exception 'Analysis not available for this fixture';
  end if;

  return v_analysis;
end;
$$;

-- Auto-refund if fixture postponed/cancelled
create or replace function public.handle_fixture_status_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status in ('postponed', 'cancelled') and old.status not in ('postponed', 'cancelled') then
    -- Refund all users who spent credits on this fixture
    update public.profiles p
    set credits = p.credits + 1
    from public.credit_transactions ct
    where ct.user_id = p.id
      and ct.fixture_id = new.id
      and ct.reason = 'reveal_match_analysis';

    -- Log refund transactions
    insert into public.credit_transactions (user_id, amount, reason, fixture_id)
    select ct.user_id, 1, 'auto_refund_postponed_cancelled', new.id
    from public.credit_transactions ct
    where ct.fixture_id = new.id
      and ct.reason = 'reveal_match_analysis';
  end if;
  return new;
end;
$$;

drop trigger if exists on_fixture_status_change on public.fixtures;
create trigger on_fixture_status_change
  after update of status on public.fixtures
  for each row
  when (new.status in ('postponed', 'cancelled'))
  execute function public.handle_fixture_status_change();

-- ===== Row Level Security =====

alter table public.profiles enable row level security;
alter table public.fixtures enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.user_predictions enable row level security;
alter table public.credit_transactions enable row level security;

-- Profiles: users can read own profile, admin can read all
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admin can read all profiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Fixtures: public read
create policy "Fixtures are publicly readable"
  on public.fixtures for select
  using (true);

-- AI Analyses: only revealed via RPC
create policy "Analyses are readable via RPC only"
  on public.ai_analyses for select
  using (false);

-- User Predictions: own predictions
create policy "Users can read own predictions"
  on public.user_predictions for select
  using (auth.uid() = user_id);

create policy "Users can insert own predictions"
  on public.user_predictions for insert
  with check (auth.uid() = user_id);

-- Admin can read all predictions
create policy "Admin can read all predictions"
  on public.user_predictions for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Credit Transactions: own transactions
create policy "Users can read own transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

-- ===== Additional RPC Functions =====

-- Read analysis bypassing RLS (used by insight page)
create or replace function public.get_analysis_for_fixture(p_fixture_id bigint)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  select row_to_json(a)::jsonb into v_result
  from public.ai_analyses a
  where a.fixture_id = p_fixture_id;
  return v_result;
end;
$$;

-- Upsert analysis with full agent reports
create or replace function public.upsert_analysis(
  p_fixture_id bigint,
  p_total_goals_prediction text,
  p_total_goals_confidence real,
  p_btts_prediction text,
  p_btts_confidence real,
  p_winner_prediction text,
  p_winner_confidence real,
  p_first_half_goals_prediction text,
  p_first_half_goals_confidence real,
  p_lambda_home real,
  p_lambda_away real,
  p_confidence_interval_low real,
  p_confidence_interval_high real,
  p_chairman_signed boolean default false,
  p_analyst_a_report text default null,
  p_analyst_b_report text default null,
  p_chairman_report text default null
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  insert into public.ai_analyses (
    fixture_id, total_goals_prediction, total_goals_confidence,
    btts_prediction, btts_confidence,
    winner_prediction, winner_confidence,
    first_half_goals_prediction, first_half_goals_confidence,
    lambda_home, lambda_away,
    confidence_interval_low, confidence_interval_high,
    chairman_signed, analyst_a_report, analyst_b_report, chairman_report
  ) values (
    p_fixture_id, p_total_goals_prediction, p_total_goals_confidence,
    p_btts_prediction, p_btts_confidence,
    p_winner_prediction, p_winner_confidence,
    p_first_half_goals_prediction, p_first_half_goals_confidence,
    p_lambda_home, p_lambda_away,
    p_confidence_interval_low, p_confidence_interval_high,
    p_chairman_signed, p_analyst_a_report, p_analyst_b_report, p_chairman_report
  )
  on conflict (fixture_id) do update set
    total_goals_prediction = excluded.total_goals_prediction,
    total_goals_confidence = excluded.total_goals_confidence,
    btts_prediction = excluded.btts_prediction,
    btts_confidence = excluded.btts_confidence,
    winner_prediction = excluded.winner_prediction,
    winner_confidence = excluded.winner_confidence,
    first_half_goals_prediction = excluded.first_half_goals_prediction,
    first_half_goals_confidence = excluded.first_half_goals_confidence,
    lambda_home = excluded.lambda_home,
    lambda_away = excluded.lambda_away,
    confidence_interval_low = excluded.confidence_interval_low,
    confidence_interval_high = excluded.confidence_interval_high,
    chairman_signed = excluded.chairman_signed,
    analyst_a_report = coalesce(excluded.analyst_a_report, ai_analyses.analyst_a_report),
    analyst_b_report = coalesce(excluded.analyst_b_report, ai_analyses.analyst_b_report),
    chairman_report = coalesce(excluded.chairman_report, ai_analyses.chairman_report),
    updated_at = now()
  returning row_to_json(ai_analyses)::jsonb into v_result;
  return v_result;
end;
$$;
