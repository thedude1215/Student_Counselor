BEGIN;

-- Public catalog tables can be read by anyone, but writes stay server/admin-only.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['universities','programs','stories','acceptances','scholarships']
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Public read ' || table_name, table_name);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
        'Public read ' || table_name,
        table_name,
        table_name
      );
    END IF;
  END LOOP;
END $$;

-- Profile ownership uses profiles.id = auth.uid().
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Profiles are self readable" ON public.profiles;
    DROP POLICY IF EXISTS "Profiles are self insertable" ON public.profiles;
    DROP POLICY IF EXISTS "Profiles are self updatable" ON public.profiles;
    CREATE POLICY "Profiles are self readable"
      ON public.profiles FOR SELECT TO authenticated
      USING ((select auth.uid()) = id);
    CREATE POLICY "Profiles are self insertable"
      ON public.profiles FOR INSERT TO authenticated
      WITH CHECK ((select auth.uid()) = id);
    CREATE POLICY "Profiles are self updatable"
      ON public.profiles FOR UPDATE TO authenticated
      USING ((select auth.uid()) = id)
      WITH CHECK ((select auth.uid()) = id);
  END IF;
END $$;

-- User-owned workspace tables use profile_id = auth.uid().
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'college_list_items',
    'tasks',
    'task_suggestions',
    'essays',
    'activities',
    'honors',
    'chat_messages',
    'push_subscriptions',
    'scholarship_matches'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users read own ' || table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users insert own ' || table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users update own ' || table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users delete own ' || table_name, table_name);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((select auth.uid()) = profile_id)',
        'Users read own ' || table_name,
        table_name,
        table_name
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = profile_id)',
        'Users insert own ' || table_name,
        table_name,
        table_name
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((select auth.uid()) = profile_id) WITH CHECK ((select auth.uid()) = profile_id)',
        'Users update own ' || table_name,
        table_name,
        table_name
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((select auth.uid()) = profile_id)',
        'Users delete own ' || table_name,
        table_name,
        table_name
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
