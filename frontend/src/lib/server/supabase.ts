import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AppError } from '@/lib/validation';
import type { Profile } from '@/lib/contracts';

export function backendConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.APP_ORIGIN);
}
export async function database() {
  if (!backendConfigured()) throw new AppError('The workspace is not available yet. Please try again later.', 503);
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: new URL(process.env.APP_ORIGIN!).protocol === 'https:', path: '/' },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => { values.forEach(({ name, value, options }) => jar.set(name, value, options)); },
    },
  });
}
export async function identity() {
  const db = await database();
  // Online validation also rejects revoked users; never authorize from getSession().
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new AppError('Please log in to your workspace.', 401);
  const { data: profile, error: profileError } = await db.from('profiles').select('*').eq('id', user.id).single();
  if (profileError) throw new AppError('Your workspace could not be loaded. Please try again.', 503);
  if (!profile?.active) throw new AppError('Your account is inactive. Contact your agency operator.', 403);
  return { db, user, profile: profile as Profile };
}
