-- Telegram Bot Payment Subscription Schema
-- Supports one-time $89 payment → Telegram DM delivery flow

-- Subscribers who have paid but not yet opened the bot
create table pending_subscriber (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  stripe_customer_email text not null,
  start_token text unique not null,
  amount_paid_cents integer not null,
  created_at timestamptz default now(),
  consumed_at timestamptz
);

-- Subscribers who have completed the Telegram handshake
create table active_subscriber (
  id uuid primary key default gen_random_uuid(),
  pending_subscriber_id uuid references pending_subscriber(id),
  telegram_chat_id bigint unique not null,
  telegram_username text,
  telegram_first_name text,
  stripe_customer_email text not null,
  is_active boolean default true,
  joined_at timestamptz default now(),
  revoked_at timestamptz,
  revoked_reason text
);

-- Audit log of every broadcast sent
create table broadcast_log (
  id uuid primary key default gen_random_uuid(),
  message_text text not null,
  sent_at timestamptz default now(),
  recipients_total integer not null,
  recipients_succeeded integer not null,
  recipients_failed integer not null
);

create index idx_pending_token on pending_subscriber(start_token);
create index idx_active_chat on active_subscriber(telegram_chat_id);
create index idx_active_status on active_subscriber(is_active);
