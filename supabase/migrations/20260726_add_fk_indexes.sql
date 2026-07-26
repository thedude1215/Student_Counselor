-- Adds covering indexes for foreign keys the performance advisor flagged as
-- unindexed. Without these, every join/filter on the FK column (and every
-- FK-triggered cascade check) forces a sequential scan of the child table.
-- Tables are small today, but this is exactly the kind of thing that becomes
-- an expensive migration later instead of a cheap one now.

begin;

create index if not exists idx_activities_profile_id
  on public.activities (profile_id);

create index if not exists idx_college_list_items_university_id
  on public.college_list_items (university_id);

create index if not exists idx_essays_university_id
  on public.essays (university_id);

create index if not exists idx_honors_profile_id
  on public.honors (profile_id);

create index if not exists idx_scholarship_matches_scholarship_id
  on public.scholarship_matches (scholarship_id);

create index if not exists idx_task_suggestions_university_id
  on public.task_suggestions (university_id);

create index if not exists idx_tasks_university_id
  on public.tasks (university_id);

commit;
