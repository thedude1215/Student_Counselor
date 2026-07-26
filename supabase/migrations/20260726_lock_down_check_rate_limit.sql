-- check_rate_limit is only ever called by Express/nova-agent using the
-- service-role key (which bypasses grants entirely). Left at its default
-- grants, PostgREST also exposed it to anon/authenticated callers, who could
-- pass an arbitrary p_user_id and grief another user's rate limit.

revoke execute on function public.check_rate_limit(uuid, text, int, int) from anon, authenticated, public;
