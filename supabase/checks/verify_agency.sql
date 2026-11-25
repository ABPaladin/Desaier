-- Read-only catalog verification. Complements, not replaces, authenticated live tests.
with expected_tables(name) as (values
  ('profiles'),('projects'),('tasks'),('comments'),('deliveries'),('events'),('ai_runs')
), table_checks as (
  select e.name, c.oid is not null as present, coalesce(c.relrowsecurity,false) as rls,
    coalesce(has_table_privilege('authenticated',c.oid,'SELECT'),false) as authenticated_select,
    coalesce(has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'),false) as anon_access,
    coalesce(has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE,TRUNCATE'),false) as authenticated_write
  from expected_tables e left join pg_class c on c.oid=to_regclass('public.'||e.name) and c.relkind='r'
), expected_functions(signature,client_callable) as (values
  ('public.new_profile()',false),
  ('public.agency_role()',true),
  ('public.can_access_project(uuid)',true),
  ('public.project_staff(uuid)',true),
  ('public.can_upload(uuid)',true),
  ('public.own_orphan_upload(text)',true),
  ('public.create_project(text,text,text,jsonb)',true),
  ('public.manage_project(uuid,integer,text,uuid,date,uuid,text)',true),
  ('public.update_designer_profile(text,text,text,text,text,boolean)',true),
  ('public.add_comment(uuid,text,boolean)',true),
  ('public.manage_task(uuid,text,uuid,boolean)',true),
  ('public.submit_delivery(uuid,integer,text,text,text)',true),
  ('public.manage_member(uuid,text,boolean)',true),
  ('public.review_designer_application(uuid,text)',true),
  ('public.reserve_ai_run(uuid)',true),
  ('public.finish_ai_run(uuid,text,boolean)',true)
), function_checks as (
  select e.signature, p.oid is not null as present, coalesce(p.prosecdef,false) as security_definer,
    coalesce('search_path=""'=any(p.proconfig),false) as empty_search_path,
    coalesce(has_function_privilege('anon',p.oid,'EXECUTE'),false) as anon_execute,
    coalesce(has_function_privilege('authenticated',p.oid,'EXECUTE'),false)=e.client_callable as correct_authenticated_grant,
    exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE') as public_execute
  from expected_functions e left join pg_proc p on p.oid=to_regprocedure(e.signature)
), expected_policies(schema_name,table_name,policy_name,command) as (values
  ('public','profiles','profiles_read','SELECT'),('public','projects','projects_read','SELECT'),
  ('public','comments','comments_read','SELECT'),('public','tasks','tasks_read','SELECT'),
  ('public','deliveries','deliveries_read','SELECT'),('public','events','events_read','SELECT'),
  ('public','ai_runs','ai_read','SELECT'),('storage','objects','delivery_upload','INSERT'),
  ('storage','objects','delivery_read','SELECT'),('storage','objects','orphan_cleanup','DELETE')
), policy_checks as (
  select e.policy_name, p.policyname is not null as present,
    coalesce(p.cmd=e.command and p.roles=array['authenticated']::name[],false) as correct_command_and_role,
    p.qual as using_expression,p.with_check as check_expression
  from expected_policies e left join pg_policies p on p.schemaname=e.schema_name and p.tablename=e.table_name and p.policyname=e.policy_name
), bucket_check as (
  select exists(select 1 from storage.buckets where id='deliverables' and name='deliverables'
    and public=false and file_size_limit=20971520
    and allowed_mime_types @> array['application/pdf','image/png','image/jpeg','image/webp','application/zip','application/x-zip-compressed']
    and allowed_mime_types <@ array['application/pdf','image/png','image/jpeg','image/webp','application/zip','application/x-zip-compressed']) as valid
), trigger_check as (
  select exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass
    and tgname='on_auth_user_created' and tgfoid=to_regprocedure('public.new_profile()')
    and tgenabled='O' and tgtype=5 and not tgisinternal) as valid
)
select jsonb_build_object(
  'catalog_checks_pass',
    (select bool_and(present and rls and authenticated_select and not anon_access and not authenticated_write) from table_checks)
    and (select bool_and(present and security_definer and empty_search_path and not anon_execute and not public_execute and correct_authenticated_grant) from function_checks)
    and (select bool_and(present and correct_command_and_role) from policy_checks)
    and (select valid from bucket_check) and (select valid from trigger_check)
    and (select relrowsecurity from pg_class where oid='storage.objects'::regclass),
  'tables', (select jsonb_agg(to_jsonb(t) order by name) from table_checks t),
  'functions', (select jsonb_agg(to_jsonb(f) order by signature) from function_checks f),
  'policies', (select jsonb_agg(to_jsonb(p) order by policy_name) from policy_checks p),
  'bucket_valid', (select valid from bucket_check),
  'auth_trigger_valid', (select valid from trigger_check),
  'additional_policies_to_review', (select coalesce(jsonb_agg(jsonb_build_object('schema',p.schemaname,'table',p.tablename,'name',p.policyname,'using',p.qual,'check',p.with_check)),'[]')
    from pg_policies p where ((p.schemaname='public' and p.tablename in (select name from expected_tables)) or (p.schemaname='storage' and p.tablename='objects'))
    and not exists(select 1 from expected_policies e where e.schema_name=p.schemaname and e.table_name=p.tablename and e.policy_name=p.policyname)),
  'scope', 'Expected catalog objects and grants only. Review policy expressions and additional policies; verify migration history separately and test authenticated workflows.'
) as verification;
