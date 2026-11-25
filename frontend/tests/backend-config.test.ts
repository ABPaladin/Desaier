import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backendConfigIssues, validBackendConfig } from '../src/lib/backend-config';

const base = { APP_ORIGIN: 'https://desaier.example', NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', VERCEL: '1' };
test('deployment configuration fails closed for privileged keys and malformed origins', () => {
  assert.equal(validBackendConfig(base), true);
  for (const origin of ['', 'not a url', 'http://desaier.example', 'http://localhost:3003', 'https://desaier.example/path', 'https://user:pass@desaier.example', 'https://desaier.example/']) {
    assert.equal(validBackendConfig({ ...base, APP_ORIGIN: origin }), false);
    assert.equal(validBackendConfig({ ...base, NEXT_PUBLIC_SUPABASE_URL: origin }), false);
  }
  for (const role of ['anon', 'service_role', 'authenticated']) {
    const key = `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
    assert.equal(validBackendConfig({ ...base, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }), role === 'anon');
  }
  for (const key of ['', 'sb_secret_test', 'malformed', 'a.b.c', 'local-fixture-publishable-key']) {
    assert.equal(validBackendConfig({ ...base, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }), false);
  }
});
test('local harness configuration is accepted only locally with its exact origins', () => {
  const local = { APP_ORIGIN: 'http://localhost:3003', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-fixture-publishable-key' };
  assert.equal(validBackendConfig(local), true);
  assert.equal(validBackendConfig({ ...local, VERCEL: '1' }), false);
  assert.equal(validBackendConfig({ ...local, APP_ORIGIN: 'https://desaier.example' }), false);
});

test('configuration diagnostics name every invalid variable without echoing credentials', () => {
  assert.deepEqual(backendConfigIssues(base), []);
  assert.equal(backendConfigIssues({}).length, 3);
  const secret = 'sb_secret_' + 'never-print-me';
  const issues = backendConfigIssues({ ...base, APP_ORIGIN: 'https://user:private-password@desaier.example', NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co/', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: secret });
  assert.equal(issues.length, 3);
  assert.match(issues[0], /^APP_ORIGIN: invalid origin/);
  assert.match(issues[1], /^NEXT_PUBLIC_SUPABASE_URL: invalid origin/);
  assert.match(issues[2], /^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: invalid public key/);
  for (const value of [secret, 'private-password', 'example.supabase.co']) assert.equal(issues.join('\n').includes(value), false);
  const aliasIssues = backendConfigIssues({ ...base, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'not-logged' });
  assert.equal(aliasIssues.length, 1);
  assert.match(aliasIssues[0], /NEXT_PUBLIC_SUPABASE_ANON_KEY is present/);
  assert.equal(aliasIssues[0].includes('not-logged'), false);
});
