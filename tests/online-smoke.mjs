// Read-only deployment checks. Does not create accounts, send email or invoke AI.
import assert from 'node:assert/strict';
const origin = process.argv[2];
assert.ok(origin && new URL(origin).origin === origin, 'Pass the canonical origin without a trailing slash.');
assert.equal(new URL(origin).protocol, 'https:', 'Online checks require HTTPS.');
async function get(path) {
  return fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
}
const home = await get('/');
assert.equal(home.status, 200, 'Homepage must be accessible at the canonical origin.');
const health = await get('/api/health');
assert.match(health.headers.get('cache-control') ?? '', /no-store/);
const status = await health.json();
assert.equal(health.status, 200, 'Server configuration is missing/invalid or the current commit is not deployed.');
assert.equal(status.configuration, 'valid');
assert.equal(status.externalServices, 'not_checked');
const privateApi = await get('/api/workspace');
assert.equal(privateApi.status, 401, 'Unauthenticated workspace access must be denied.');
assert.match(privateApi.headers.get('cache-control') ?? '', /no-store/);
console.log('PASS: homepage, configuration probe and anonymous access denial. Hosted database, email, storage and AI still require the authenticated acceptance checks in docs/ONLINE_SETUP.md.');
