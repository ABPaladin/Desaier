import { identity } from '@/lib/server/supabase';
import { bodyOf, dbCheck, handle, json } from '@/lib/server/http';
import { AppError, uuidField } from '@/lib/validation';
import { analyzeBrief } from '@/lib/ai';

export const maxDuration = 45;
export async function POST(request: Request) {
  return handle(async () => {
    const body = await bodyOf(request);
    const { db, profile } = await identity();
    if (profile.role !== 'operator') throw new AppError('Operator access required.', 403);
    const key = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL;
    if (!key || !model) throw new AppError('AI assistance is not available yet.', 503);
    const id = uuidField(body, 'project_id');
    const { data: project, error } = await db.from('projects').select('title,service,brief,requirements').eq('id', id).maybeSingle();
    dbCheck(error);
    if (!project) throw new AppError('Project not found.', 404);
    const candidates = await db.from('profiles').select('id,skills,bio,languages,timezone').eq('role', 'designer').eq('active', true).eq('available', true).order('id').limit(31);
    dbCheck(candidates.error);
    if ((candidates.data?.length ?? 0) > 30) throw new AppError('The available roster exceeds 30 designers. Narrow availability before requesting AI matching.');
    const reservation = await db.rpc('reserve_ai_run', { p_project: id });
    dbCheck(reservation.error);
    try {
      const result = await analyzeBrief({ ...project, candidates: candidates.data ?? [] }, { key, model });
      const saved = await db.rpc('finish_ai_run', { p_id: reservation.data, p_result: result, p_success: true });
      dbCheck(saved.error);
      return json({ result });
    } catch (error) {
      await db.rpc('finish_ai_run', { p_id: reservation.data, p_result: null, p_success: false });
      throw error;
    }
  });
}
