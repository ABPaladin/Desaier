-- Read-only release preflight; no names, emails, credentials or customer records.
select jsonb_build_object(
  'database',current_database(),
  'migration_history',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
  'application_columns',(select coalesce(jsonb_agg(column_name order by column_name),'[]') from information_schema.columns where table_schema='public' and table_name='profiles' and column_name like 'designer_application_%'),
  'review_function_present',to_regprocedure('public.review_designer_application(uuid,text)') is not null,
  'profiles_rls',(select relrowsecurity from pg_class where oid='public.profiles'::regclass),
  'active_operator_count',(select count(*) from public.profiles where role='operator' and active),
  'auth_trigger_present',exists(select 1 from pg_trigger where tgname='on_auth_user_created' and tgrelid='auth.users'::regclass and not tgisinternal)
) as designer_applications_preflight;
