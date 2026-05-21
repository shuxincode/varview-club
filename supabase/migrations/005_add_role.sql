-- VARview.club Schema Update
-- Migration 005: Add role column for RBAC (chairman / user)

alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'chairman'));
