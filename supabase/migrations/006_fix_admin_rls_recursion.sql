-- Fix RLS infinite recursion on profiles table.
-- The admin policy previously queried profiles itself, causing recursion.
-- Solution: security definer function bypasses RLS for the admin check.

-- 1. Create an admin-check function that bypasses RLS via security definer
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

-- 2. Drop the recursive admin policy on profiles
drop policy if exists "Admin can read all profiles" on public.profiles;

-- 3. Recreate using the security-definer function (no recursion)
create policy "Admin can read all profiles"
  on public.profiles for select
  using (public.is_admin());

-- 4. Also fix the same pattern on user_predictions (for consistency)
drop policy if exists "Admin can read all predictions" on public.user_predictions;

create policy "Admin can read all predictions"
  on public.user_predictions for select
  using (public.is_admin());

-- 5. Ensure authenticated role has SELECT on profiles (needed for RLS to evaluate)
grant select on public.profiles to authenticated;

-- 6. Ensure anon and authenticated roles have needed table-level permissions
grant select on public.fixtures to anon, authenticated;
grant select, insert on public.user_predictions to authenticated;
grant select on public.credit_transactions to authenticated;
