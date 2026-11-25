'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/client-api';

export function Auth({ mode = 'login', configured }: { mode?: 'login' | 'register' | 'recover' | 'update-password'; configured: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [accountType, setAccountType] = useState('client');
  const register = mode === 'register', recovery = mode === 'recover', reset = mode === 'update-password';
  return <section className="auth"><div><p className="eyebrow">YOUR CREATIVE WORKSPACE</p>
    <h1>{register ? 'Make room for what’s next.' : recovery || reset ? 'A fresh start.' : 'Welcome to your next chapter.'}</h1>
    <p>A shared space for ideas, progress and possibility.</p>
    <div className="auth-assurance"><ShieldCheck aria-hidden="true"/><p>Your brief. Your creative team.<br/>One considered direction, managed by Desaier.</p></div>
    <p className="note">Exploring the experience? <Link className="text-link" href="/demo/client">View the demo workspace</Link>. Demo content is separate from your account.</p>
  </div><form className="panel" aria-busy={busy} onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ redirect?: string; message?: string }>(`/api/auth/${mode}`, Object.fromEntries(form));
      if (result.redirect) { router.replace(result.redirect); router.refresh(); }
      else setMessage(result.message || 'Saved.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  }}>
    <LockKeyhole className="form-icon" size={26} aria-hidden="true"/>
    <h2>{register ? 'Create your account' : recovery ? 'Recover your account' : reset ? 'Choose a new password' : 'Log in'}</h2>
    {!configured && <p className="banner" role="status">The workspace is being prepared. Account access will be available soon.</p>}
    <fieldset disabled={!configured || busy}>
      {register && <fieldset className="account-type" aria-describedby="account-type-help"><legend>I want to join as</legend><div>
        <label><input type="radio" name="account_type" value="client" checked={accountType === 'client'} onChange={() => setAccountType('client')}/><span><strong>Client</strong><small>Start a project with Desaier</small></span></label>
        <label><input type="radio" name="account_type" value="designer" checked={accountType === 'designer'} onChange={() => setAccountType('designer')}/><span><strong>Designer</strong><small>Apply to join the creative team</small></span></label>
      </div></fieldset>}
      {register && <label>Name<input name="name" required maxLength={100} autoComplete="name" placeholder="Your name"/></label>}
      {!reset && <label>Email<input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com"/></label>}
      {!recovery && <label>Password<input name="password" type="password" required minLength={register || reset ? 12 : 1} maxLength={128} autoComplete={register || reset ? 'new-password' : 'current-password'} placeholder={register || reset ? 'At least 12 characters' : 'Your password'}/></label>}
      {register && <p id="account-type-help">{accountType === 'designer' ? 'After confirming your email, you can track your application. An agency operator reviews it before you receive designer access.' : 'Create your account to share a brief and follow your projects.'}</p>}
      <Button className="pill" type="submit">{busy ? 'Please wait…' : register ? 'Create account' : recovery ? 'Send recovery email' : reset ? 'Save new password' : 'Enter workspace'}</Button>
    </fieldset>
    <Suspense fallback={null}><ConfirmationNotice/></Suspense>
    {error && <p className="feedback error" role="alert">{error}</p>}
    {message && <p className="feedback" role="status">{message}</p>}
    <p>{register ? 'Already have an account?' : 'New to Desaier?'} <Link className="text-link" href={register ? '/login' : '/register'}>{register ? 'Log in' : 'Register'}</Link></p>
    <Link className="text-link" href={recovery || reset ? '/login' : '/forgot-password'}>{recovery || reset ? 'Back to login' : 'Forgot your password?'}</Link>
  </form></section>;
}
function ConfirmationNotice() {
  const params = useSearchParams();
  return params.get('confirmation') === 'failed' ? <p className="feedback error" role="alert">This confirmation link is invalid or expired. Request a new recovery email.</p> : null;
}
