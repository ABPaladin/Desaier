import { randomUUID } from 'node:crypto';
import { identity } from '@/lib/server/supabase';
import { bodyOf, dbCheck, handle, json } from '@/lib/server/http';
import { AppError, textField, uuidField, validateFile, versionField } from '@/lib/validation';

export async function POST(request: Request) {
  return handle(async () => {
    const body = await bodyOf(request);
    const { db, user } = await identity();
    if (body.action === 'download') {
      const id = uuidField(body, 'delivery_id');
      const delivery = await db.from('deliveries').select('path,filename').eq('id', id).maybeSingle();
      dbCheck(delivery.error);
      if (!delivery.data) throw new AppError('Delivery unavailable.', 404);
      const { data, error } = await db.storage.from('deliverables').createSignedUrl(delivery.data.path, 60, { download: delivery.data.filename });
      if (error) throw new AppError('Download unavailable. Please try again.', 503);
      return json({ url: data.signedUrl });
    }
    const project = uuidField(body, 'project_id');
    if (body.action === 'upload') {
      const name = textField(body, 'filename', 1, 160);
      const extension = validateFile(name, String(body.type), Number(body.size));
      const { data: allowed, error: permissionError } = await db.rpc('can_upload', { project });
      dbCheck(permissionError);
      if (!allowed) throw new AppError('Files can only be submitted by the assigned team during production.', 403);
      const path = `${project}/${user.id}/${randomUUID()}.${extension}`;
      const { data, error } = await db.storage.from('deliverables').createSignedUploadUrl(path, { upsert: false });
      if (error) throw new AppError('Upload could not be prepared. Please try again.', 503);
      return json({ path: data.path, token: data.token });
    }
    if (body.action === 'submit') {
      const { data, error } = await db.rpc('submit_delivery', {
        p_project: project, p_version: versionField(body), p_path: textField(body, 'path', 1, 400),
        p_filename: textField(body, 'filename', 1, 160), p_note: typeof body.note === 'string' ? body.note.trim().slice(0, 4000) : '',
      });
      dbCheck(error); return json({ id: data }, 201);
    }
    if (body.action === 'cleanup') {
      const path = textField(body, 'path', 1, 400);
      if (!path.startsWith(`${project}/${user.id}/`)) throw new AppError('Invalid upload.', 403);
      const { error } = await db.storage.from('deliverables').remove([path]);
      if (error) throw new AppError('Could not remove the unused upload.', 503);
      return json({ ok: true });
    }
    throw new AppError('Unknown file action.');
  });
}
