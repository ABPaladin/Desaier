export class AppError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function textField(body: Record<string, unknown>, key: string, min: number, max: number) {
  const value = body[key];
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new AppError(`${key}: enter ${min}–${max} characters.`);
  return value.trim();
}
export function passwordField(body: Record<string, unknown>, min: number) {
  const value = body.password;
  if (typeof value !== 'string' || value.length < min || value.length > 128) throw new AppError(`Password must contain ${min}–128 characters.`);
  return value;
}
export function uuidField(body: Record<string, unknown>, key: string) {
  const value = textField(body, key, 36, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new AppError(`Invalid ${key}.`);
  return value;
}
export function versionField(body: Record<string, unknown>) {
  if (!Number.isSafeInteger(body.version) || Number(body.version) < 1) throw new AppError('Refresh the project and try again.');
  return Number(body.version);
}
export function dateField(body: Record<string, unknown>) {
  if (body.due_date === null || body.due_date === '') return null;
  const value = textField(body, 'due_date', 10, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new AppError('Enter a valid due date.');
  return value;
}
export const allowedFiles: Record<string, string[]> = {
  'application/pdf': ['pdf'], 'image/png': ['png'], 'image/jpeg': ['jpg', 'jpeg'],
  'image/webp': ['webp'], 'application/zip': ['zip'], 'application/x-zip-compressed': ['zip'],
};
export function validateFile(name: string, type: string, size: number) {
  const extension = name.split('.').at(-1)?.toLowerCase() ?? '';
  if (!allowedFiles[type]?.includes(extension) || !Number.isSafeInteger(size) || size <= 0 || size > 20 * 1024 * 1024) throw new AppError('Choose a PDF, PNG, JPG, WebP or ZIP file up to 20 MB.');
  return extension;
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get('origin');
  // Never trust forwarded host headers for mutation authorization.
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== new URL(expected).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new AppError('Request origin is not allowed.', 403);
}
