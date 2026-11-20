import { identity } from '@/lib/server/supabase';
import { dbCheck, handle, json } from '@/lib/server/http';
import { AppError, uuidField } from '@/lib/validation';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const id = uuidField(await context.params, 'id');
    const { db, profile } = await identity();
    const project = await db.from('projects').select('*').eq('id', id).maybeSingle();
    dbCheck(project.error);
    if (!project.data) throw new AppError('Project not found.', 404);
    const [comments, tasks, deliveries, events, ai] = await Promise.all([
      db.from('comments').select('id,author_id,body,internal,created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(200),
      db.from('tasks').select('id,title,done').eq('project_id', id).order('created_at').limit(200),
      db.from('deliveries').select('id,filename,approved,created_at').eq('project_id', id).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(200),
      db.from('events').select('id,action,created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(100),
      profile.role === 'operator' ? db.from('ai_runs').select('id,status,result,created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [], error: null }),
    ]);
    for (const result of [comments, tasks, deliveries, events, ai]) dbCheck(result.error);
    return json({ project: project.data, comments: comments.data, tasks: tasks.data, deliveries: deliveries.data, events: events.data, ai: ai.data });
  });
}
