-- Read-only: inspect collisions before authorizing the initial agency migration.
select jsonb_build_object(
  'database', current_database(),
  'server_version', current_setting('server_version'),
  'public_tables', (select coalesce(jsonb_agg(tablename order by tablename),'[]')
    from pg_tables where schemaname='public'),
  'public_functions', (select coalesce(jsonb_agg(p.oid::regprocedure::text order by p.proname),'[]')
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
  'auth_trigger', (select coalesce(jsonb_agg(jsonb_build_object('name',tgname,'definition',pg_get_triggerdef(oid))),'[]')
    from pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created'),
  'deliverables_bucket', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'public',public)),'[]')
    from storage.buckets where id='deliverables'),
  'storage_policies', (select coalesce(jsonb_agg(jsonb_build_object('name',policyname,'command',cmd,'roles',roles,'using',qual,'check',with_check)),'[]')
    from pg_policies where schemaname='storage' and tablename='objects'),
  'migration_history_relation', to_regclass('supabase_migrations.schema_migrations')::text
) as preflight;
