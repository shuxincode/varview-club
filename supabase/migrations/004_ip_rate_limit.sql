-- VARview.club Rate Limiting
-- Migration 004: IP-based rate limit unique constraint and atomic increment

alter table public.rate_limits
  add constraint rate_limits_ip_route_window_unique
  unique (ip_address, route, window_start);

-- Atomic increment for IP-based rate limits
create or replace function public.increment_rate_limit_by_ip(
  p_ip_address text,
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
  insert into public.rate_limits (ip_address, route, request_count, window_start)
  values (p_ip_address, p_route, 1, p_window_start)
  on conflict (ip_address, route, window_start) do update
  set request_count = public.rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count;
end;
$$;
