import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from './migrations.mjs';

test('PostgreSQL migration, RLS and transactional agency workflow', async t => {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth,storage to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to authenticated;
    -- Mirror Supabase defaults to ensure the migration explicitly removes unsafe grants.
    alter default privileges in schema public grant all on tables to anon,authenticated;
    alter default privileges in schema public grant execute on functions to anon,authenticated;
  `);
  const preflight = (await db.query(await readFile(new URL('../../supabase/checks/preflight.sql', import.meta.url), 'utf8'))).rows[0].preflight;
  assert.deepEqual(preflight.public_tables, []);
  assert.deepEqual(preflight.deliverables_bucket, []);
  assert.equal(preflight.migration_history_relation, null);
  await db.exec(await readFile(new URL('../../supabase/migrations/202611200001_agency.sql', import.meta.url), 'utf8'));
  const legacy = '10000000-0000-4000-8000-000000000090';
  await db.query(`insert into auth.users(id,raw_user_meta_data) values($1,'{"name":"Existing fixture"}')`, [legacy]);
  await db.query(`update public.profiles set role='designer' where id=$1`, [legacy]);
  await applyMigrations(db, '202611200001');
  await t.test('deployment catalog verification detects expected schema and unsafe extra grants', async () => {
    const sql = await readFile(new URL('../../supabase/checks/verify_agency.sql', import.meta.url), 'utf8');
    const report = (await db.query(sql)).rows[0].verification;
    assert.equal(report.catalog_checks_pass, true, JSON.stringify(report));
    assert.equal(report.tables.length, 7);
    assert.equal(report.functions.length, 16);
    assert.equal(report.policies.length, 10);
    assert.deepEqual(report.additional_policies_to_review, []);
    await db.exec('grant update on public.projects to authenticated');
    assert.equal((await db.query(sql)).rows[0].verification.catalog_checks_pass, false);
    await db.exec('revoke update on public.projects from authenticated');
  });
  const client = '10000000-0000-4000-8000-000000000001';
  const other = '10000000-0000-4000-8000-000000000002';
  const designer = '10000000-0000-4000-8000-000000000003';
  const operator = '10000000-0000-4000-8000-000000000004';
  const newMember = '10000000-0000-4000-8000-000000000005';
  for (const id of [client, other, designer, operator, newMember]) await db.query(`insert into auth.users(id,raw_user_meta_data) values($1,'{"name":"Test fixture","role":"operator"}')`, [id]);
  await db.query(`update public.profiles set role='designer' where id=$1`, [designer]);
  await db.query(`update public.profiles set role='operator' where id=$1`, [operator]);
  async function as(id, sql, params = [], role = 'authenticated') {
    await db.exec(`set role ${role}`);
    await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id || '']);
    try { return (await db.query(sql, params)).rows; }
    finally { await db.exec('reset role'); }
  }
  const denied = (id, sql, params, code = '42501') => assert.rejects(as(id, sql, params), error => error.code === code);
  let project, otherProject, task, delivery, secondDelivery;
  const path = id => `${project}/${id}/concept.pdf`;
  await t.test('signup cannot claim an operator role through metadata', async () => {
    assert.equal((await as(client, 'select role from public.profiles where id=$1', [client]))[0].role, 'client');
    assert.equal((await as(client, 'select * from public.profiles')).length, 1);
    await denied(client, `update public.profiles set role='operator' where id=$1`, [client]);
    await assert.rejects(as(null, `select public.create_project('Evil','Digital experiences','This is a forged agency project')`, [], 'anon'), e => e.code === '42501');
    await assert.rejects(as(null, `select * from public.projects`, [], 'anon'), e => e.code === '42501');
  });
  await t.test('client creates durable briefs with field constraints and isolated reads', async () => {
    project = (await as(client, `select public.create_project($1,$2,$3) as id`, ['Identity launch', 'Brand strategy & identity', 'Develop a thoughtful identity for a new creative studio.']))[0].id;
    otherProject = (await as(other, `select public.create_project($1,$2,$3) as id`, ['Other client project', 'Digital experiences', 'Design a digital experience for another client entirely.']))[0].id;
    assert.equal((await as(client, 'select * from public.projects')).length, 1);
    assert.equal((await as(other, 'select * from public.projects where id=$1', [project])).length, 0);
    assert.equal((await as(operator, 'select * from public.projects')).length, 2);
    await denied(designer, `select public.create_project('Hello','Digital experiences','This should never be created')`);
    await denied(client, `select public.create_project('x','Digital experiences','short')`, [], '23514');
    await denied(client, `update public.projects set status='delivered' where id=$1`, [project]);
    await denied(client, `select public.create_project('Invalid details','Digital experiences','This is a valid length brief','{"role":"operator"}')`, [], '22023');
    await denied(client, `select public.create_project('Invalid details','Digital experiences','This is a valid length brief','{"industry":{"nested":true}}')`, [], '22023');
  });
  await t.test('operator assigns active designers; clients cannot bypass staffing', async () => {
    await denied(client, `select public.manage_project($1,1,'assign',$2)`, [project, designer]);
    await denied(operator, `select public.manage_project($1,1,'assign',$2)`, [project, client], '22023');
    await as(operator, `select public.manage_project($1,1,'assign',$2,'2026-11-25')`, [project, designer]);
    assert.equal((await as(designer, 'select * from public.projects')).length, 1);
    await denied(operator, `select public.manage_project($1,1,'schedule',null,'2026-11-24')`, [project], '40001');
    await denied(operator, `select public.manage_project($1,null,'schedule',null,'2026-11-24')`, [project], '40001');
    assert.equal((await as(client, 'select version from public.projects where id=$1', [project]))[0].version, 2);
  });
  await t.test('conversation and task authorization protect internal content', async () => {
    await as(operator, `select public.add_comment($1,'Internal art direction',true)`, [project]);
    await as(client, `select public.add_comment($1,'Shared project question',false)`, [project]);
    assert.equal((await as(client, 'select * from public.comments')).length, 1);
    assert.equal((await as(designer, 'select * from public.comments')).length, 2);
    await denied(client, `select public.add_comment($1,'Forged internal message',true)`, [project]);
    await denied(other, `select public.add_comment($1,'Cross tenant message',false)`, [project]);
    await denied(designer, `select public.manage_task($1,'Unapproved task')`, [project]);
    await as(operator, `select public.manage_task($1,'Develop first concepts')`, [project]);
    task = (await as(designer, 'select * from public.tasks'))[0].id;
    await denied(client, `select public.manage_task($1,null,$2,true)`, [project, task]);
    await denied(designer, `select public.manage_task($1,null,$2,true)`, [otherProject, task]);
    await as(designer, `select public.manage_task($1,null,$2,true)`, [project, task]);
    assert.equal((await as(client, 'select done from public.tasks'))[0].done, true);
  });
  await t.test('storage requires valid project, current staff role and owned folder', async () => {
    await denied(client, `insert into storage.objects(bucket_id,name) values('deliverables',$1)`, [path(client)]);
    await denied(designer, `insert into storage.objects(bucket_id,name) values('deliverables',$1)`, [path(operator)]);
    await denied(designer, `select public.submit_delivery($1,2,$2,'Missing.pdf','')`, [project, path(designer)], '22023');
    await as(designer, `insert into storage.objects(bucket_id,name) values('deliverables',$1)`, [path(designer)]);
    delivery = (await as(designer, `select public.submit_delivery($1,2,$2,'Concept.pdf','Internal production note') as id`, [project, path(designer)]))[0].id;
    assert.equal((await as(client, 'select * from public.deliveries')).length, 0);
    assert.equal((await as(client, 'select * from storage.objects')).length, 0);
    assert.equal((await as(designer, 'select * from storage.objects')).length, 1);
    await as(designer, `update storage.objects set name='changed.pdf' where name=$1`, [path(designer)]);
    await as(designer, `delete from storage.objects where name=$1`, [path(designer)]);
    assert.equal((await db.query('select * from storage.objects')).rows.length, 1);
    await denied(designer, `select public.manage_project($1,3,'approve',null,null,$2)`, [project, delivery]);
  });
  await t.test('review feedback and revisions remain private until final approval', async () => {
    await denied(operator, `select public.manage_project($1,3,'request_changes')`, [project], '22023');
    await as(operator, `select public.manage_project($1,3,'request_changes',null,null,null,'Refine the typographic hierarchy.')`, [project]);
    assert.equal((await as(client, 'select * from public.comments')).length, 1);
    await as(designer, `insert into storage.objects(bucket_id,name) values('deliverables',$1)`, [path(designer).replace('concept', 'refined')]);
    secondDelivery = (await as(designer, `select public.submit_delivery($1,4,$2,'Refined.pdf','Revised direction') as id`, [project, path(designer).replace('concept', 'refined')]))[0].id;
    await denied(operator, `select public.manage_project($1,5,'approve',null,null,$2)`, [project, delivery], '22023');
    await as(operator, `select public.manage_project($1,5,'approve',null,null,$2)`, [project, secondDelivery]);
    assert.equal((await as(client, 'select * from public.deliveries')).length, 1);
    assert.equal((await as(client, 'select * from public.deliveries'))[0].note, undefined);
    assert.equal((await as(client, 'select * from storage.objects')).length, 1);
    assert.equal((await as(other, 'select * from storage.objects')).length, 0);
    assert.equal((await as(client, 'select status from public.projects'))[0].status, 'delivered');
    await denied(designer, `select public.submit_delivery($1,6,$2,'Replaced.pdf','')`, [project, path(designer)]);
    await denied(operator, `select public.manage_project($1,5,'approve',null,null,$2)`, [project, secondDelivery], '40001');
  });
  await t.test('suspension revokes reads and actions; cleanup cannot delete registered files', async () => {
    await as(operator, `select public.manage_member($1,'designer',false)`, [designer]);
    assert.equal((await as(designer, 'select * from public.projects')).length, 0);
    assert.equal((await as(designer, 'select * from storage.objects')).length, 0);
    await denied(designer, `select public.add_comment($1,'Suspended account',false)`, [project]);
    await as(operator, `select public.manage_member($1,'designer',true)`, [designer]);
    await db.query('update public.projects set designer_id=null where id=$1', [project]);
    assert.equal((await as(designer, 'select public.own_orphan_upload($1) as allowed', [path(designer)]))[0].allowed, false);
    await as(designer, `delete from storage.objects where name=$1`, [path(designer)]);
    assert.equal((await db.query('select * from storage.objects')).rows.length, 2);
    await db.query('update public.projects set designer_id=$1 where id=$2', [designer, project]);
  });
  await t.test('staff provisioning cannot promote operators or change historical roles', async () => {
    await denied(client, `select public.manage_member($1,'designer',true)`, [newMember]);
    await denied(operator, `select public.manage_member($1,'operator',true)`, [newMember], '22023');
    await denied(operator, `select public.manage_member($1,'designer',false)`, [operator], '22023');
    await denied(operator, `select public.manage_member($1,'designer',true)`, [client], '22023');
    await as(operator, `select public.manage_member($1,'designer',true)`, [newMember]);
    assert.equal((await as(newMember, 'select role from public.profiles'))[0].role, 'designer');
  });
  await t.test('designers control only their own skills profile, not account permissions', async () => {
    await as(designer, `select public.update_designer_profile('Branding, Figma','Visual systems','English','Europe/Chisinau','https://example.com/portfolio',true)`);
    assert.equal((await as(designer, 'select skills from public.profiles'))[0].skills, 'Branding, Figma');
    await denied(client, `select public.update_designer_profile('Branding','','','','',true)`);
    await denied(designer, `select public.update_designer_profile('Branding','','','MadeUp/Timezone','',true)`, [], '22023');
    await denied(designer, `select public.update_designer_profile('Branding','','','','javascript:alert(1)',true)`, [], '23514');
    assert.equal((await as(client, 'select * from public.profiles where id=$1', [designer])).length, 0);
    assert.equal((await as(operator, 'select portfolio_url from public.profiles where id=$1', [designer]))[0].portfolio_url, 'https://example.com/portfolio');
  });
  await t.test('AI reservations are operator-only and have a database-enforced hourly cap', async () => {
    await denied(client, `select public.reserve_ai_run($1)`, [project]);
    for (let i = 0; i < 10; i++) await as(operator, `select public.reserve_ai_run($1)`, [project]);
    await denied(operator, `select public.reserve_ai_run($1)`, [project], 'P0001');
    assert.equal((await as(client, 'select * from public.ai_runs')).length, 0);
    assert.equal((await as(designer, 'select * from public.ai_runs')).length, 0);
  });
  await t.test('archived projects preserve audit history and reject further edits', async () => {
    await as(operator, `select public.manage_project($1,6,'archive')`, [project]);
    await denied(client, `select public.add_comment($1,'Should be closed',false)`, [project], '22023');
    await denied(operator, `select public.manage_task($1,'Closed task')`, [project], '22023');
    assert.equal((await as(client, 'select * from public.events where project_id=$1', [project])).length, 7);
    assert.equal((await as(other, 'select * from public.events where project_id=$1', [project])).length, 0);
    await denied(client, 'delete from public.events');
  });
  await t.test('designer application migration preserves existing staff and never trusts requested privileges', async () => {
    const existing = (await db.query('select role,active,designer_application_status from public.profiles where id=$1', [legacy])).rows[0];
    assert.deepEqual(existing, { role: 'designer', active: true, designer_application_status: 'none' });
    const applicant = '10000000-0000-4000-8000-000000000020';
    await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [applicant, JSON.stringify({ name: 'Demo applicant', account_type: 'designer', role: 'operator', designer_application_status: 'approved' })]);
    const own = (await as(applicant, 'select role,designer_application_status from public.profiles'))[0];
    assert.deepEqual(own, { role: 'client', designer_application_status: 'pending' });
    await denied(applicant, `update public.profiles set designer_application_status='approved'`);
    await denied(applicant, `select public.review_designer_application($1,'approved')`, [applicant]);
    await denied(designer, `select public.review_designer_application($1,'approved')`, [applicant]);
    await assert.rejects(as(null, `select public.review_designer_application($1,'approved')`, [applicant], 'anon'), e => e.code === '42501');
    await denied(applicant, `select public.update_designer_profile('Branding','','','','',true)`);
    assert.equal((await as(other, 'select * from public.profiles where id=$1', [applicant])).length, 0);
    await denied(operator, `select public.review_designer_application($1,'operator')`, [applicant], '22023');
    await as(operator, `select public.review_designer_application($1,'approved')`, [applicant]);
    const approved = (await as(applicant, 'select role,designer_application_status,designer_application_reviewed_at from public.profiles'))[0];
    assert.equal(approved.role, 'designer'); assert.equal(approved.designer_application_status, 'approved'); assert.ok(approved.designer_application_reviewed_at);
    await as(applicant, `select public.update_designer_profile('Branding','','','','',true)`);
    await denied(operator, `select public.review_designer_application($1,'declined')`, [applicant], '22023');
  });
  await t.test('declining, suspension and project history cannot accidentally grant designer access', async () => {
    for (const suffix of ['21','22','23','24']) {
      await db.query(`insert into auth.users(id,raw_user_meta_data) values($1,'{"name":"Demo review fixture","account_type":"designer"}')`, [`10000000-0000-4000-8000-0000000000${suffix}`]);
    }
    const rejected = '10000000-0000-4000-8000-000000000021', suspended = '10000000-0000-4000-8000-000000000022', history = '10000000-0000-4000-8000-000000000023', manual = '10000000-0000-4000-8000-000000000024';
    await as(operator, `select public.review_designer_application($1,'declined')`, [rejected]);
    assert.deepEqual((await as(rejected, 'select role,designer_application_status from public.profiles'))[0], { role: 'client', designer_application_status: 'declined' });
    await denied(operator, `select public.review_designer_application($1,'approved')`, [rejected], '40001');
    await as(operator, `select public.manage_member($1,'client',false)`, [suspended]);
    await denied(operator, `select public.review_designer_application($1,'approved')`, [suspended], '22023');
    await as(history, `select public.create_project('Client history','Digital experiences','A sufficiently detailed client project brief.')`);
    await denied(operator, `select public.review_designer_application($1,'approved')`, [history], '22023');
    assert.deepEqual((await as(history, 'select role,designer_application_status from public.profiles'))[0], { role: 'client', designer_application_status: 'pending' });
    await as(operator, `select public.manage_member($1,'designer',true)`, [manual]);
    assert.equal((await as(manual, 'select designer_application_status from public.profiles'))[0].designer_application_status, 'approved');
  });
  await db.close();
});
