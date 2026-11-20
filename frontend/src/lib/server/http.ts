import 'server-only';
import { AppError, assertOrigin } from '@/lib/validation';
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' } });
}
export async function bodyOf(request: Request) {
  assertOrigin(request);
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new AppError('JSON request required.', 415);
  if (Number(request.headers.get('content-length')) > 64000) throw new AppError('Request is too large.', 413);
  // Bound streamed requests too, including when content-length is absent.
  const reader = request.body?.getReader();
  if (!reader) throw new AppError('Request body required.');
  const chunks: Uint8Array[] = []; let total = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    total += value.length;
    if (total > 64000) { await reader.cancel(); throw new AppError('Request is too large.', 413); }
    chunks.push(value);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new AppError('Invalid JSON request.'); }
}
export function dbCheck(error: { code?: string; message?: string } | null) {
  if (!error) return;
  const known: Record<string, [number, string]> = {
    '42501': [403, 'You do not have permission for this action.'],
    '40001': [409, 'This project changed. Refresh and try again.'],
    'P0002': [404, 'This record is no longer available.'],
    'P0001': [429, 'The AI request limit has been reached. Try again later.'],
    '22023': [400, error.message || 'This action is unavailable.'],
    '23514': [400, 'Check the form fields and try again.'],
    '23505': [409, 'This item was already submitted. Refresh your workspace.'],
    '23503': [400, 'A referenced item is no longer available.'],
  };
  const mapped = known[error.code ?? ''];
  throw new AppError(mapped?.[1] ?? 'The workspace could not save this change. Please try again.', mapped?.[0] ?? 503);
}
export async function handle(work: () => Promise<Response>) {
  try { return await work(); }
  catch (error) {
    if (error instanceof AppError) return json({ error: error.message }, error.status);
    // Do not log credentials, briefs, provider responses or recovery tokens.
    console.error('Workspace request failed:', error instanceof Error ? error.name : 'UnknownError');
    return json({ error: 'The service is temporarily unavailable. Please try again.' }, 503);
  }
}
