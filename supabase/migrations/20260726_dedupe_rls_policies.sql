-- Removes legacy duplicate RLS policies left over from an earlier schema
-- iteration. Several tables ended up with two permissive policies covering
-- the same role + command (e.g. "Users read own activities" for
-- {authenticated} using the optimized `(select auth.uid())` form, alongside
-- an older "activities_select_own" for {public} using the bare, per-row
-- `auth.uid()` form). Postgres evaluates every permissive policy on a query
-- and ORs the results, so the duplicates cost extra planning/execution work
-- on every request without changing behavior. Keeping the newer,
-- `authenticated`-scoped, subselect-optimized policy and dropping the older
-- `public`-scoped one.

begin;

-- activities
drop policy if exists "activities_delete_own" on public.activities;
drop policy if exists "activities_insert_own" on public.activities;
drop policy if exists "activities_select_own" on public.activities;
drop policy if exists "activities_update_own" on public.activities;

-- chat_messages
drop policy if exists "Users insert own chats" on public.chat_messages;
drop policy if exists "Users read own chats" on public.chat_messages;

-- college_list_items
drop policy if exists "Users delete own college list" on public.college_list_items;
drop policy if exists "Users insert own college list" on public.college_list_items;
drop policy if exists "Users read own college list" on public.college_list_items;
drop policy if exists "Users update own college list" on public.college_list_items;

-- honors
drop policy if exists "honors_delete_own" on public.honors;
drop policy if exists "honors_insert_own" on public.honors;
drop policy if exists "honors_select_own" on public.honors;
drop policy if exists "honors_update_own" on public.honors;

-- profiles
drop policy if exists "Users insert own profile" on public.profiles;
drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;

-- push_subscriptions — the blanket "ALL" policy duplicates the four
-- per-command policies that already exist below it.
drop policy if exists "Users manage own subscriptions" on public.push_subscriptions;

-- scholarship_matches — same "ALL" duplication as push_subscriptions.
drop policy if exists "scholarship_matches_owner_all" on public.scholarship_matches;

-- scholarships — two identical public-read policies.
drop policy if exists "scholarships_public_read" on public.scholarships;

-- task_suggestions
drop policy if exists "own task_suggestions delete" on public.task_suggestions;
drop policy if exists "own task_suggestions insert" on public.task_suggestions;
drop policy if exists "own task_suggestions select" on public.task_suggestions;
drop policy if exists "own task_suggestions update" on public.task_suggestions;

-- notification_log's one policy still uses the bare, per-row auth.uid() form.
-- Not a duplicate, but the same auth_rls_initplan cost as the ones above.
drop policy if exists "Users can view own notification logs" on public.notification_log;
create policy "Users can view own notification logs" on public.notification_log
  for select to authenticated
  using (profile_id = (select auth.uid()));

commit;
