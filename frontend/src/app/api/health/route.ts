import { connection } from 'next/server';
import { backendConfigured } from '@/lib/server/supabase';
import { json } from '@/lib/server/http';

export async function GET() {
  await connection();
  const configured = backendConfigured();
  // No credentials, user data, provider calls or paid operations. This is not a readiness probe.
  return json({
    application: 'ok',
    configuration: configured ? 'valid' : 'missing_or_invalid',
    externalServices: 'not_checked',
  }, configured ? 200 : 503);
}
