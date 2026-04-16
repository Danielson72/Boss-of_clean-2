-- Chat sessions table for AI widget rate limiting.
-- Stores only session_id + message count + IP. No PII.
create table if not exists public.chat_sessions (
  id            uuid primary key default gen_random_uuid(),
  session_id    text not null unique,
  message_count integer not null default 0,
  window_start  timestamptz not null default now(),
  last_ip       text,
  created_at    timestamptz not null default now()
);

-- Index for fast lookup by session_id
create index if not exists idx_chat_sessions_session_id on public.chat_sessions (session_id);

-- Expire rows older than 48 hours via RLS (service role bypasses, public has no access)
alter table public.chat_sessions enable row level security;

-- Only the service role (server-side API route) can read/write
create policy "service_role_only" on public.chat_sessions
  as restrictive
  for all
  using (false);
