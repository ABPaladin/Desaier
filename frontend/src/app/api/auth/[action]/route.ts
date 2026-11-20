import { database, identity } from '@/lib/server/supabase';
import { bodyOf, handle, json } from '@/lib/server/http';
import { AppError, passwordField, textField } from '@/lib/validation';

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  return handle(async () => {
    const body = await bodyOf(request);
    const { action } = await context.params;
    const db = await database();
    if (action === 'logout') {
      const { error } = await db.auth.signOut();
      if (error) throw new AppError('Could not log out. Please try again.', 503);
      return json({ redirect: '/login' });
    }
    if (action === 'update-password') {
      await identity();
      const password = passwordField(body, 12);
      const { error } = await db.auth.updateUser({ password });
      if (error) throw new AppError('Password could not be changed. Use a new recovery link and try again.');
      await db.auth.signOut({ scope: 'global' });
      return json({ redirect: '/login', message: 'Password updated. Log in again.' });
    }
    if (!['login', 'register', 'recover'].includes(action)) throw new AppError('Not found.', 404);
    const email = textField(body, 'email', 3, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Enter a valid email address.');
    const origin = new URL(process.env.APP_ORIGIN!).origin;
    if (action === 'recover') {
      const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/confirm?next=recovery` });
      if (error && error.status === 429) throw new AppError('Please wait before requesting another email.', 429);
      if (error && error.status && error.status >= 500) throw new AppError('Email delivery is temporarily unavailable.', 503);
      return json({ message: 'If this address has an account, a recovery email is on its way.' });
    }
    // Existing users may have older passwords; registration and reset enforce 12 characters.
    const password = passwordField(body, action === 'register' ? 12 : 1);
    if (action === 'register') {
      const name = textField(body, 'name', 1, 100);
      const { error } = await db.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: `${origin}/auth/confirm` } });
      if (error) throw new AppError(error.status === 429 ? 'Please wait before trying again.' : 'Registration could not be completed. Try logging in or recovering your account.', error.status === 429 ? 429 : 400);
      // Always require a deliberate login after signup, even on misconfigured providers.
      await db.auth.signOut({ scope: 'local' });
      return json({ message: 'Check your email to confirm your account, then log in. If you already registered, use account recovery.' });
    }
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new AppError('Login failed. Check your details and confirm your email.', 401);
    const { profile } = await identity();
    return json({ redirect: `/dashboard/${profile.role}` });
  });
}
