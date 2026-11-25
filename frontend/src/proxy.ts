import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { validBackendConfig } from '@/lib/backend-config';

// Refresh cookie sessions before the server-rendered shell reads them. API routes
// retain their existing cookie writer and authorization; no role is trusted here.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!validBackendConfig(process.env) || !request.cookies.getAll().some(cookie => /^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name))) return response;
  const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: new URL(process.env.APP_ORIGIN!).protocol === 'https:', path: '/' },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: values => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await db.auth.getUser();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/((?!api/|auth/|_next/|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)'] };
