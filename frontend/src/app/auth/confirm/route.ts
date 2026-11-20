import { NextResponse } from 'next/server';
import { database } from '@/lib/server/supabase';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.APP_ORIGIN || url.origin;
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const code = url.searchParams.get('code');
  let ok = false;
  try {
    const db = await database();
    if (token_hash && (type === 'signup' || type === 'recovery' || type === 'email')) {
      const { error } = await db.auth.verifyOtp({ token_hash, type }); ok = !error;
    } else if (code) {
      const { error } = await db.auth.exchangeCodeForSession(code); ok = !error;
    }
  } catch { /* Show a safe error without leaking the single-use token. */ }
  const destination = ok ? (type === 'recovery' || url.searchParams.get('next') === 'recovery' ? '/reset-password' : '/dashboard') : '/login?confirmation=failed';
  const response = NextResponse.redirect(new URL(destination, origin));
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
