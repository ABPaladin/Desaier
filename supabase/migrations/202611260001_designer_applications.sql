-- Designer signup is a request, never an authorization grant.
-- Existing accounts, project ownership and RLS policies remain unchanged.
begin;
alter table public.profiles
  add column designer_application_status text not null default 'none'
    check (designer_application_status in ('none','pending','approved','declined')),
  add column designer_application_reviewed_at timestamptz;

create or replace function public.new_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,name,designer_application_status)
  values(new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),'New client'),100),
    case when new.raw_user_meta_data->>'account_type' = 'designer' then 'pending' else 'none' end);
  -- role/active/review status from Auth metadata are deliberately ignored.
  return new;
end; $$;

create or replace function public.manage_member(p_id uuid,p_role text,p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.agency_role() is distinct from 'operator' then raise exception 'Operator access required' using errcode='42501'; end if;
  if p_id=auth.uid() or p_role not in ('client','designer') or p_role is null or p_active is null then raise exception 'Invalid member change' using errcode='22023'; end if;
  -- Keep the existing project-history safeguard for all staff provisioning paths.
  if exists(select 1 from public.profiles where id=p_id and role<>p_role) and exists(select 1 from public.projects where client_id=p_id or designer_id=p_id) then
    raise exception 'A member with project history cannot change roles' using errcode='22023';
  end if;
  update public.profiles set role=p_role,active=p_active,
    designer_application_status=case when p_role='designer' and designer_application_status='pending' then 'approved' else designer_application_status end,
    designer_application_reviewed_at=case when p_role='designer' and designer_application_status='pending' then now() else designer_application_reviewed_at end
  where id=p_id and role<>'operator';
  if not found then raise exception 'Member unavailable' using errcode='22023'; end if;
end; $$;

create function public.review_designer_application(p_id uuid,p_decision text) returns void
language plpgsql security definer set search_path = '' as $$
declare applicant public.profiles;
begin
  if public.agency_role() is distinct from 'operator' then raise exception 'Operator access required' using errcode='42501'; end if;
  if p_id=auth.uid() or p_decision is null or p_decision not in ('approved','declined') then
    raise exception 'Invalid application decision' using errcode='22023';
  end if;
  select * into applicant from public.profiles where id=p_id for update;
  if not found or applicant.role<>'client' or not applicant.active then
    raise exception 'Applicant unavailable' using errcode='22023';
  end if;
  if applicant.designer_application_status<>'pending' then
    raise exception 'Application already reviewed. Refresh the workspace.' using errcode='40001';
  end if;
  if p_decision='approved' then perform public.manage_member(p_id,'designer',true); end if;
  update public.profiles set designer_application_status=p_decision,designer_application_reviewed_at=now() where id=p_id;
end; $$;
revoke execute on function public.review_designer_application(uuid,text) from public,anon;
grant execute on function public.review_designer_application(uuid,text) to authenticated;
commit;
