-- Serverless-safe rate limiting.
--
-- Both the Express API and the nova-agent service previously tracked rate
-- limits in an in-process Map/dict. On Vercel, each request can hit a
-- different serverless invocation with its own fresh memory, so the counter
-- resets constantly and the limits don't actually hold. This moves the
-- counter into Postgres, shared by every invocation.

begin;

create table if not exists public.rate_limit_events (
  id bigserial primary key,
  user_id uuid not null,
  bucket text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_user_bucket_idx
  on public.rate_limit_events (user_id, bucket, created_at);

alter table public.rate_limit_events enable row level security;
-- No policies: only ever touched via the SECURITY DEFINER function below or
-- the service-role key (server/nova-agent), both of which bypass RLS anyway.

create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_bucket text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Self-cleaning: drop this user/bucket's rows outside the window so the
  -- table doesn't grow unbounded for repeat callers.
  delete from public.rate_limit_events
  where user_id = p_user_id
    and bucket = p_bucket
    and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count
  from public.rate_limit_events
  where user_id = p_user_id
    and bucket = p_bucket
    and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max then
    return false;
  end if;

  insert into public.rate_limit_events (user_id, bucket) values (p_user_id, p_bucket);
  return true;
end;
$$;

commit;
