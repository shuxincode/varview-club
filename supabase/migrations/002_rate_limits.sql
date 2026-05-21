-- VARview.club Rate Limiting
-- Migration 002: Atomic rate limit increment function

-- Atomic increment for rate_limits table (prevents race conditions)
create or replace function public.increment_rate_limit(
  p_user_id uuid,
  p_route text,
  p_window_start timestamptz
)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits (user_id, route, request_count, window_start)
  values (p_user_id, p_route, 1, p_window_start)
  on conflict (user_id, route, window_start) do update
  set request_count = public.rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count;
end;
$$;

-- Index for IP-based rate limit lookups
create index if not exists idx_rate_limits_ip
  on public.rate_limits(ip_address, route, window_start);
