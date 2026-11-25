import { identity } from '@/lib/server/supabase';
import { bodyOf, dbCheck, handle, json } from '@/lib/server/http';
import { AppError, dateField, textField, uuidField, versionField } from '@/lib/validation';
import { serviceNames } from '@/lib/contracts';

export async function GET() {
  return handle(async () => {
    const { db, profile } = await identity();
    const [projects, members] = await Promise.all([
      db.from('projects').select('*').order('updated_at', { ascending: false }).limit(200),
      profile.role === 'operator' ? db.from('profiles').select('*').order('designer_application_status', { ascending: false }).order('name').limit(500) : Promise.resolve({ data: [], error: null }),
    ]);
    dbCheck(projects.error); dbCheck(members.error);
    return json({ profile, projects: projects.data, members: members.data, aiEnabled: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    const body = await bodyOf(request);
    const { db, profile } = await identity();
    const action = textField(body, 'action', 1, 40);
    if (action === 'review-designer') {
      if (profile.role !== 'operator') throw new AppError('Operator access required.', 403);
      if (body.decision !== 'approved' && body.decision !== 'declined') throw new AppError('Choose an application decision.');
      const { error } = await db.rpc('review_designer_application', { p_id: uuidField(body, 'member_id'), p_decision: body.decision });
      dbCheck(error); return json({ ok: true });
    }
    if (action === 'create') {
      if (profile.role !== 'client') throw new AppError('Client access required.', 403);
      const service = textField(body, 'service', 1, 100);
      if (!(serviceNames as readonly string[]).includes(service)) throw new AppError('Choose a service.');
      const requirements = Object.fromEntries(['industry', 'audience', 'style', 'budget', 'deadline', 'language'].map(key => [key, textField({ [key]: body[key] ?? '' }, key, 0, 500)]));
      const { data, error } = await db.rpc('create_project', { p_title: textField(body, 'title', 3, 120), p_service: service, p_brief: textField(body, 'brief', 20, 10000), p_requirements: requirements });
      dbCheck(error); return json({ id: data }, 201);
    }
    if (action === 'profile') {
      if (profile.role !== 'designer') throw new AppError('Designer access required.', 403);
      const portfolio = textField(body, 'portfolio_url', 0, 500);
      if (portfolio) {
        let url: URL; try { url = new URL(portfolio); } catch { throw new AppError('Enter a valid HTTPS portfolio URL.'); }
        if (url.protocol !== 'https:' || url.username || url.password) throw new AppError('Enter a public HTTPS portfolio URL.');
      }
      if (typeof body.available !== 'boolean') throw new AppError('Set your availability.');
      const { error } = await db.rpc('update_designer_profile', { p_skills: textField(body, 'skills', 0, 500), p_bio: textField(body, 'bio', 0, 2000), p_languages: textField(body, 'languages', 0, 200), p_timezone: textField(body, 'timezone', 0, 80), p_portfolio: portfolio, p_available: body.available });
      dbCheck(error); return json({ ok: true });
    }
    if (action === 'member') {
      if (profile.role !== 'operator') throw new AppError('Operator access required.', 403);
      if (!['client', 'designer'].includes(String(body.role)) || typeof body.active !== 'boolean') throw new AppError('Invalid member settings.');
      const { error } = await db.rpc('manage_member', { p_id: uuidField(body, 'member_id'), p_role: body.role, p_active: body.active });
      dbCheck(error); return json({ ok: true });
    }
    const id = uuidField(body, 'project_id');
    if (action === 'comment') {
      if (typeof body.internal !== 'boolean') throw new AppError('Choose note visibility.');
      const { error } = await db.rpc('add_comment', { p_project: id, p_body: textField(body, 'body', 1, 4000), p_internal: body.internal });
      dbCheck(error); return json({ ok: true });
    }
    if (action === 'task') {
      if (typeof body.done !== 'boolean') throw new AppError('Invalid task state.');
      const { error } = await db.rpc('manage_task', {
        p_project: id, p_task: body.task_id ? uuidField(body, 'task_id') : null,
        p_title: body.task_id ? null : textField(body, 'title', 3, 200), p_done: body.done,
      });
      dbCheck(error); return json({ ok: true });
    }
    if (!['assign', 'schedule', 'approve', 'request_changes', 'archive'].includes(action)) throw new AppError('Unknown action.');
    if (profile.role !== 'operator') throw new AppError('Operator access required.', 403);
    const { error } = await db.rpc('manage_project', {
      p_id: id, p_version: versionField(body), p_action: action,
      p_designer: action === 'assign' ? uuidField(body, 'designer_id') : null,
      p_due: ['assign', 'schedule'].includes(action) ? dateField(body) : null,
      p_delivery: action === 'approve' ? uuidField(body, 'delivery_id') : null,
      p_feedback: action === 'request_changes' ? textField(body, 'feedback', 3, 4000) : null,
    });
    dbCheck(error); return json({ ok: true });
  });
}
