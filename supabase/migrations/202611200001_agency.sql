-- Agency MVP. Apply once through Supabase migrations or the SQL editor.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  role text not null default 'client' check (role in ('client','designer','operator')),
  active boolean not null default true,
  skills text not null default '' check(char_length(skills)<=500),
  bio text not null default '' check(char_length(bio)<=2000),
  languages text not null default '' check(char_length(languages)<=200),
  timezone text not null default '' check(char_length(timezone)<=80),
  portfolio_url text not null default '' check(char_length(portfolio_url)<=500 and (portfolio_url='' or portfolio_url ~ '^https://[^[:space:]]+$')),
  available boolean not null default true,
  created_at timestamptz not null default now()
);
create function public.new_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,name) values(new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),'New client'),100));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_profile();
-- Existing Auth accounts are always imported as clients, never from metadata roles.
insert into public.profiles(id,name)
  select id,left(coalesce(nullif(trim(raw_user_meta_data->>'name'),''),'New client'),100) from auth.users
  on conflict(id) do nothing;

create function public.agency_role() returns text language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and active;
$$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id),
  designer_id uuid references public.profiles(id),
  title text not null check (char_length(trim(title)) between 3 and 120),
  service text not null check (service in ('Brand strategy & identity','Digital experiences','Creative & motion')),
  brief text not null check (char_length(trim(brief)) between 20 and 10000),
  requirements jsonb not null default '{}' check(jsonb_typeof(requirements)='object' and octet_length(requirements::text)<=4000),
  status text not null default 'submitted' check (status in ('submitted','in_progress','in_review','changes_requested','delivered','archived')),
  due_date date,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_client_idx on public.projects(client_id);
create index projects_designer_idx on public.projects(designer_id);
create function public.can_access_project(project uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select public.agency_role() is not null and exists(select 1 from public.projects p where p.id=project
    and (public.agency_role()='operator' or p.client_id=auth.uid() or p.designer_id=auth.uid()));
$$;
create function public.project_staff(project uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_access_project(project) and public.agency_role() in ('operator','designer');
$$;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  author_id uuid not null references public.profiles(id),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_project_idx on public.comments(project_id,created_at);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  title text not null check (char_length(trim(title)) between 3 and 200),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index tasks_project_idx on public.tasks(project_id);
create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  uploader_id uuid not null references public.profiles(id),
  path text not null unique,
  filename text not null check (char_length(filename) between 1 and 160),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index deliveries_project_idx on public.deliveries(project_id);
create table public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id),
  actor_id uuid not null references public.profiles(id),
  action text not null,
  created_at timestamptz not null default now()
);
create index events_project_idx on public.events(project_id,created_at);
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  actor_id uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  result text check (char_length(result) <= 16000),
  created_at timestamptz not null default now()
);
create index ai_runs_usage_idx on public.ai_runs(created_at,actor_id);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.comments enable row level security;
alter table public.tasks enable row level security;
alter table public.deliveries enable row level security;
alter table public.events enable row level security;
alter table public.ai_runs enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (id=auth.uid() or public.agency_role()='operator');
create policy projects_read on public.projects for select to authenticated using (public.can_access_project(id));
create policy comments_read on public.comments for select to authenticated using (public.can_access_project(project_id) and (not internal or public.project_staff(project_id)));
create policy tasks_read on public.tasks for select to authenticated using (public.can_access_project(project_id));
create policy deliveries_read on public.deliveries for select to authenticated using (public.can_access_project(project_id) and (approved or public.project_staff(project_id)));
create policy events_read on public.events for select to authenticated using (public.agency_role()='operator' or public.can_access_project(project_id));
create policy ai_read on public.ai_runs for select to authenticated using (public.agency_role()='operator');
-- All mutations run through narrow transactional functions. No table write grants.
revoke all on public.profiles,public.projects,public.comments,public.tasks,public.deliveries,public.events,public.ai_runs from anon,authenticated;
grant select on public.profiles,public.projects,public.comments,public.tasks,public.deliveries,public.events,public.ai_runs to authenticated;

create function public.create_project(p_title text,p_service text,p_brief text,p_requirements jsonb default '{}') returns uuid
language plpgsql security definer set search_path = '' as $$
declare pid uuid; entry record;
begin
  if public.agency_role() is distinct from 'client' then raise exception 'Client access required' using errcode='42501'; end if;
  if p_requirements is null or jsonb_typeof(p_requirements)<>'object' then raise exception 'Invalid project requirements' using errcode='22023'; end if;
  for entry in select * from jsonb_each_text(p_requirements) loop
    if entry.key not in ('industry','audience','style','budget','deadline','language') or jsonb_typeof(p_requirements->entry.key)<>'string' or entry.value is null or char_length(entry.value)>500 then raise exception 'Invalid brief detail' using errcode='22023'; end if;
  end loop;
  insert into public.projects(client_id,title,service,brief,requirements) values(auth.uid(),trim(p_title),p_service,trim(p_brief),p_requirements) returning id into pid;
  insert into public.events(project_id,actor_id,action) values(pid,auth.uid(),'Brief submitted');
  return pid;
end; $$;

create function public.manage_project(p_id uuid,p_version integer,p_action text,p_designer uuid default null,p_due date default null,p_delivery uuid default null,p_feedback text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.projects;
begin
  if public.agency_role() is distinct from 'operator' then raise exception 'Operator access required' using errcode='42501'; end if;
  select * into p from public.projects where id=p_id for update;
  if not found then raise exception 'Project not found' using errcode='P0002'; end if;
  if p.version is distinct from p_version then raise exception 'Project changed. Refresh and try again.' using errcode='40001'; end if;
  if p_action='assign' and p.status in ('submitted','in_progress','changes_requested') then
    if not exists(select 1 from public.profiles where id=p_designer and role='designer' and active) then raise exception 'Choose an active designer' using errcode='22023'; end if;
    update public.projects set designer_id=p_designer,status='in_progress',due_date=p_due where id=p_id;
  elsif p_action='schedule' and p.status not in ('archived','delivered') then
    update public.projects set due_date=p_due where id=p_id;
  elsif p_action='approve' and p.status='in_review' then
    if not exists(select 1 from public.deliveries where id=p_delivery and project_id=p_id and not approved)
      or p_delivery is distinct from (select id from public.deliveries where project_id=p_id order by created_at desc,id desc limit 1) then raise exception 'Choose the latest delivery awaiting approval' using errcode='22023'; end if;
    update public.deliveries set approved=true where id=p_delivery;
    update public.projects set status='delivered' where id=p_id;
  elsif p_action='request_changes' and p.status='in_review' then
    if coalesce(char_length(trim(p_feedback)),0) not between 3 and 4000 then raise exception 'Provide review feedback' using errcode='22023'; end if;
    insert into public.comments(project_id,author_id,body,internal) values(p_id,auth.uid(),trim(p_feedback),true);
    update public.projects set status='changes_requested' where id=p_id;
  elsif p_action='archive' and p.status in ('submitted','delivered') then
    update public.projects set status='archived' where id=p_id;
  else raise exception 'Action unavailable at this project stage' using errcode='22023';
  end if;
  update public.projects set version=version+1,updated_at=now() where id=p_id;
  insert into public.events(project_id,actor_id,action) values(p_id,auth.uid(),case p_action when 'assign' then 'Designer assigned' when 'approve' then 'Delivery approved' when 'request_changes' then 'Refinement requested' when 'archive' then 'Project archived' else 'Schedule updated' end);
end; $$;

create function public.update_designer_profile(p_skills text,p_bio text,p_languages text,p_timezone text,p_portfolio text,p_available boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.agency_role() is distinct from 'designer' then raise exception 'Designer access required' using errcode='42501'; end if;
  if p_timezone<>'' and not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise exception 'Use an IANA timezone such as Europe/Chisinau' using errcode='22023'; end if;
  update public.profiles set skills=trim(p_skills),bio=trim(p_bio),languages=trim(p_languages),timezone=p_timezone,portfolio_url=trim(p_portfolio),available=p_available where id=auth.uid();
end; $$;

create function public.add_comment(p_project uuid,p_body text,p_internal boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_access_project(p_project) or (p_internal and not public.project_staff(p_project)) then raise exception 'Access denied' using errcode='42501'; end if;
  if exists(select 1 from public.projects where id=p_project and status='archived') then raise exception 'Project is archived' using errcode='22023'; end if;
  insert into public.comments(project_id,author_id,body,internal) values(p_project,auth.uid(),trim(p_body),p_internal);
end; $$;

create function public.manage_task(p_project uuid,p_title text default null,p_task uuid default null,p_done boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.project_staff(p_project) then raise exception 'Staff access required' using errcode='42501'; end if;
  if exists(select 1 from public.projects where id=p_project and status in ('archived','delivered')) then raise exception 'Project is closed' using errcode='22023'; end if;
  if p_task is null then
    if public.agency_role()<>'operator' then raise exception 'Operator access required' using errcode='42501'; end if;
    insert into public.tasks(project_id,title) values(p_project,trim(p_title));
  else
    update public.tasks set done=p_done where id=p_task and project_id=p_project;
    if not found then raise exception 'Task not found' using errcode='P0002'; end if;
  end if;
end; $$;

create function public.can_upload(project uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select public.project_staff(project) and exists(select 1 from public.projects where id=project and status in ('in_progress','changes_requested'));
$$;
create function public.submit_delivery(p_project uuid,p_version integer,p_path text,p_filename text,p_note text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare p public.projects; did uuid;
begin
  select * into p from public.projects where id=p_project for update;
  if not public.can_upload(p_project) then raise exception 'Delivery access denied' using errcode='42501'; end if;
  if p.version is distinct from p_version then raise exception 'Project changed. Refresh and try again.' using errcode='40001'; end if;
  if split_part(p_path,'/',1)<>p_project::text or split_part(p_path,'/',2)<>auth.uid()::text
    or not exists(select 1 from storage.objects where bucket_id='deliverables' and name=p_path) then
    raise exception 'Upload the file before submitting' using errcode='22023';
  end if;
  insert into public.deliveries(project_id,uploader_id,path,filename) values(p_project,auth.uid(),p_path,p_filename) returning id into did;
  if coalesce(char_length(trim(p_note)),0)>0 then
    insert into public.comments(project_id,author_id,body,internal) values(p_project,auth.uid(),p_note,true);
  end if;
  update public.projects set status='in_review',version=version+1,updated_at=now() where id=p_project;
  insert into public.events(project_id,actor_id,action) values(p_project,auth.uid(),'Delivery submitted for operator review');
  return did;
end; $$;

create function public.manage_member(p_id uuid,p_role text,p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.agency_role() is distinct from 'operator' then raise exception 'Operator access required' using errcode='42501'; end if;
  if p_id=auth.uid() or p_role not in ('client','designer') or p_role is null or p_active is null then raise exception 'Invalid member change' using errcode='22023'; end if;
  -- Role changes on existing projects could grant inappropriate access or invalidate ownership.
  if exists(select 1 from public.profiles where id=p_id and role<>p_role) and exists(select 1 from public.projects where client_id=p_id or designer_id=p_id) then
    raise exception 'A member with project history cannot change roles' using errcode='22023';
  end if;
  update public.profiles set role=p_role,active=p_active where id=p_id and role<>'operator';
  if not found then raise exception 'Member unavailable' using errcode='22023'; end if;
  insert into public.events(actor_id,action) values(auth.uid(),'Member '||p_id::text||' updated to '||p_role||case when p_active then ' (active)' else ' (suspended)' end);
end; $$;

create function public.reserve_ai_run(p_project uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  if public.agency_role() is distinct from 'operator' then raise exception 'Operator access required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(7102026);
  if (select count(*) from public.ai_runs where actor_id=auth.uid() and created_at>now()-interval '1 hour')>=10
    or (select count(*) from public.ai_runs where created_at>now()-interval '1 hour')>=100 then
    raise exception 'AI request limit reached. Try again later.' using errcode='P0001';
  end if;
  insert into public.ai_runs(project_id,actor_id) values(p_project,auth.uid()) returning id into rid;
  return rid;
end; $$;
create function public.finish_ai_run(p_id uuid,p_result text,p_success boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.agency_role() is distinct from 'operator' then raise exception 'Operator access required' using errcode='42501'; end if;
  update public.ai_runs set status=case when p_success then 'completed' else 'failed' end,result=p_result where id=p_id and actor_id=auth.uid() and status='pending';
end; $$;

-- Private, immutable uploads. Approval grants client access to the exact reviewed file.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('deliverables','deliverables',false,20971520,array['application/pdf','image/png','image/jpeg','image/webp','application/zip','application/x-zip-compressed']);
create policy delivery_upload on storage.objects for insert to authenticated with check (
  bucket_id='deliverables' and split_part(name,'/',2)=auth.uid()::text
  and split_part(name,'/',1) in (select id::text from public.projects where public.can_upload(id))
);
create function public.own_orphan_upload(object_path text) returns boolean language sql stable security definer set search_path = '' as $$
  select split_part(object_path,'/',2)=auth.uid()::text and public.agency_role() is not null
    and not exists(select 1 from public.deliveries where path=object_path);
$$;
create policy delivery_read on storage.objects for select to authenticated using (
  bucket_id='deliverables' and (public.own_orphan_upload(name) or exists(select 1 from public.deliveries d where d.path=name and public.can_access_project(d.project_id) and (d.approved or public.project_staff(d.project_id))))
);
create policy orphan_cleanup on storage.objects for delete to authenticated using (
  bucket_id='deliverables' and public.own_orphan_upload(name)
);

-- Functions are not callable anonymously, including SECURITY DEFINER helpers.
revoke execute on function public.new_profile() from public,anon,authenticated;
revoke execute on function public.agency_role(),public.can_access_project(uuid),public.project_staff(uuid),public.can_upload(uuid),public.own_orphan_upload(text),
  public.create_project(text,text,text,jsonb),public.manage_project(uuid,integer,text,uuid,date,uuid,text),public.update_designer_profile(text,text,text,text,text,boolean),
  public.add_comment(uuid,text,boolean),public.manage_task(uuid,text,uuid,boolean),public.submit_delivery(uuid,integer,text,text,text),
  public.manage_member(uuid,text,boolean),public.reserve_ai_run(uuid),public.finish_ai_run(uuid,text,boolean) from public,anon;
grant execute on function public.agency_role(),public.can_access_project(uuid),public.project_staff(uuid),public.can_upload(uuid),public.own_orphan_upload(text),
  public.create_project(text,text,text,jsonb),public.manage_project(uuid,integer,text,uuid,date,uuid,text),public.update_designer_profile(text,text,text,text,text,boolean),
  public.add_comment(uuid,text,boolean),public.manage_task(uuid,text,uuid,boolean),public.submit_delivery(uuid,integer,text,text,text),
  public.manage_member(uuid,text,boolean),public.reserve_ai_run(uuid),public.finish_ai_run(uuid,text,boolean) to authenticated;
commit;
