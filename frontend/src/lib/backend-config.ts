type Environment = Record<string, string | undefined>;

function safeOrigin(value: string | undefined, hosted: boolean) {
  if (!value) return false;
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return url.origin === value && !url.username && !url.password
      && (url.protocol === 'https:' || (!hosted && local && url.protocol === 'http:'));
  } catch { return false; }
}

/** Reject privileged keys and invalid origins without returning configuration values. */
export function validBackendConfig(env: Environment) {
  const hosted = env.VERCEL === '1';
  if (!safeOrigin(env.APP_ORIGIN, hosted) || !safeOrigin(env.NEXT_PUBLIC_SUPABASE_URL, hosted)) return false;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  // This exact key is used only by the isolated local integration harness.
  if (!hosted && key === 'local-fixture-publishable-key'
    && env.NEXT_PUBLIC_SUPABASE_URL === 'http://127.0.0.1:54329'
    && env.APP_ORIGIN === 'http://localhost:3003') return true;
  try {
    const parts = key.split('.');
    if (parts.length !== 3) return false;
    // This is configuration validation, not JWT authentication or signature verification.
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role === 'anon';
  } catch { return false; }
}
