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

function allowedPublicKey(env: Environment, hosted: boolean) {
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

/** Safe for build logs: return variable names and instructions, never supplied values. */
export function backendConfigIssues(env: Environment): string[] {
  const hosted = env.VERCEL === '1';
  const issues: string[] = [];
  for (const name of ['APP_ORIGIN', 'NEXT_PUBLIC_SUPABASE_URL'] as const) {
    if (!env[name]) issues.push(`${name}: missing. Set it in the Vercel environment being deployed.`);
    else if (!safeOrigin(env[name], hosted)) issues.push(`${name}: invalid origin. Use HTTPS with no trailing slash, path, query, credentials, quotes or surrounding whitespace (HTTP loopback is allowed only locally).`);
  }
  if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const alias = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? ' NEXT_PUBLIC_SUPABASE_ANON_KEY is present, but this app reads NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; copy the publishable/anon value under that exact name.' : '';
    issues.push(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: missing. Set the project publishable key.${alias}`);
  } else if (!allowedPublicKey(env, hosted)) {
    issues.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: invalid public key. Use sb_publishable_... or a legacy anon JWT, without quotes or whitespace; never use a secret/service_role key.');
  }
  return issues;
}

/** Reject privileged keys and invalid origins without returning configuration values. */
export function validBackendConfig(env: Environment) {
  return backendConfigIssues(env).length === 0;
}
