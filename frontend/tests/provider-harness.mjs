// Local test transport only. Emulates Auth/Storage HTTP contracts while running
// the actual migration and RLS in PostgreSQL. Never deploy or use real credentials.
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { applyMigrations } from './migrations.mjs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth; create schema storage;
  create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema public,auth,storage to anon,authenticated;
  grant execute on function auth.uid() to anon,authenticated;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
  alter table storage.objects enable row level security;
  grant select,insert,update,delete on storage.objects to authenticated;
`);
await applyMigrations(db);
const users = new Map(), sessions = new Map(), refreshTokens = new Map(), uploads = new Map();
for (const [index, role] of ['client', 'other', 'designer', 'operator'].entries()) {
  const id = `20000000-0000-4000-8000-00000000000${index + 1}`;
  const email = `${role}@demo.test`;
  users.set(email, { id, email, role: 'authenticated', aud: 'authenticated', email_confirmed_at: new Date().toISOString(), user_metadata: { name: `Demo ${role}` }, created_at: new Date().toISOString() });
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [id, JSON.stringify({ name: `Demo ${role}` })]);
  await db.query('update public.profiles set role=$1 where id=$2', [role === 'other' ? 'client' : role, id]);
}
// All connections share an embedded database; serialize transactions to avoid
// leaking SET ROLE between concurrent HTTP requests in this test harness.
let queue = Promise.resolve();
const queryAs = (user, sql, values = []) => {
  const result = queue.then(async () => {
    await db.exec('begin; set local role authenticated');
    try {
      await db.query(`select set_config('request.jwt.claim.sub',$1,true)`, [user.id]);
      const result = await db.query(sql, values); await db.exec('commit'); return result.rows;
    } catch (error) { await db.exec('rollback'); throw error; }
  });
  queue = result.catch(() => {}); return result;
};
const ident = text => { if (!/^[a-z_]+$/.test(text)) throw new Error('Unsupported identifier'); return `"${text}"`; };
const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3003');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,content-type,x-client-info,x-upsert');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1:54329');
  try {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    const body = req.headers['content-type']?.startsWith('application/json') && bytes.length ? JSON.parse(bytes) : {};
    const token = req.headers.authorization?.replace('Bearer ', '');
    let user = sessions.get(token);
    if (url.pathname === '/auth/v1/signup') {
      if (users.has(body.email)) return send(res, 200, { user: { identities: [] } });
      const id = randomUUID();
      // Fixture auto-confirms email; production confirmation remains Supabase-owned.
      const created = { id, email: body.email, role: 'authenticated', aud: 'authenticated', email_confirmed_at: new Date().toISOString(), user_metadata: body.data || {}, created_at: new Date().toISOString() };
      const provision = queue.then(() => db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [id, JSON.stringify(body.data || {})]));
      queue = provision.catch(() => {});
      await provision;
      users.set(body.email, created);
      return send(res, 200, { user: created, session: null });
    }
    if (url.pathname === '/auth/v1/token') {
      const refreshing = url.searchParams.get('grant_type') === 'refresh_token';
      user = refreshing ? refreshTokens.get(body.refresh_token) : users.get(body.email);
      if (!user || (!refreshing && body.password !== 'demo-test-password')) return send(res, 400, { error_code: 'invalid_credentials', msg: 'Invalid test credentials' });
      const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'), randomUUID()].join('.');
      sessions.set(jwt, user);
      const refreshToken = randomUUID();
      refreshTokens.set(refreshToken, user);
      return send(res, 200, { access_token: jwt, refresh_token: refreshToken, token_type: 'bearer', expires_in: 3600, user });
    }
    if (url.pathname === '/auth/v1/logout') {
      sessions.delete(token);
      for (const [key, value] of refreshTokens) if (value.id === user?.id) refreshTokens.delete(key);
      return send(res, 200, {});
    }
    if (url.pathname === '/auth/v1/user') return send(res, user ? 200 : 401, user || { msg: 'Unauthenticated' });
    const signedUpload = url.pathname.startsWith('/storage/v1/object/upload/sign/');
    const objectPath = decodeURIComponent(url.pathname.split('/deliverables/')[1] || '');
    if (signedUpload && req.method === 'PUT') {
      const signed = uploads.get(url.searchParams.get('token'));
      if (!signed || signed.path !== objectPath) return send(res, 403, { message: 'Invalid upload token' });
      await queryAs(signed.user, `insert into storage.objects(bucket_id,name) values('deliverables',$1)`, [objectPath]);
      uploads.delete(url.searchParams.get('token'));
      return send(res, 200, { Key: `deliverables/${objectPath}` });
    }
    if (!user) return send(res, 401, { message: 'Unauthenticated' });
    if (signedUpload && req.method === 'POST') {
      const allowed = (await queryAs(user, 'select public.can_upload($1) as allowed', [objectPath.split('/')[0]]))[0].allowed;
      if (!allowed) return send(res, 403, { message: 'Upload denied' });
      const uploadToken = randomUUID(); uploads.set(uploadToken, { path: objectPath, user });
      return send(res, 200, { url: `/object/upload/sign/deliverables/${objectPath}?token=${uploadToken}` });
    }
    if (url.pathname.startsWith('/storage/v1/object/sign/')) {
      const visible = await queryAs(user, 'select name from storage.objects where name=$1', [objectPath]);
      return send(res, visible.length ? 200 : 403, visible.length ? { signedURL: `/object/sign/deliverables/${objectPath}?token=demo-download` } : { message: 'Access denied' });
    }
    if (url.pathname === '/storage/v1/object/deliverables' && req.method === 'DELETE') {
      for (const path of body.prefixes) await queryAs(user, 'delete from storage.objects where name=$1', [path]);
      return send(res, 200, []);
    }
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const name = url.pathname.split('/').at(-1);
      const keys = Object.keys(body);
      const values = Object.values(body).map(value => typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
      const rows = await queryAs(user, `select public.${ident(name)}(${keys.map((key, i) => `${ident(key)} => $${i + 1}`).join(',')}) as result`, values);
      return send(res, 200, rows[0].result);
    }
    if (url.pathname.startsWith('/rest/v1/') && req.method === 'GET') {
      const table = url.pathname.split('/').at(-1), values = [], clauses = [];
      for (const [key, value] of url.searchParams) {
        if (['select', 'order', 'limit'].includes(key)) continue;
        if (!value.startsWith('eq.')) throw new Error('Unsupported test filter');
        values.push(value.slice(3)); clauses.push(`${ident(key)}=$${values.length}`);
      }
      const columns = url.searchParams.get('select') || '*';
      const selection = columns === '*' ? '*' : columns.split(',').map(ident).join(',');
      const order = url.searchParams.get('order')?.split(',').map(value => { const [key, direction] = value.split('.'); return `${ident(key)} ${direction === 'desc' ? 'desc' : 'asc'}`; }).join(',');
      const limit = Math.min(500, Number(url.searchParams.get('limit') || 500));
      const rows = await queryAs(user, `select ${selection} from public.${ident(table)}${clauses.length ? ` where ${clauses.join(' and ')}` : ''}${order ? ` order by ${order}` : ''} limit ${limit}`, values);
      if (req.headers.accept?.includes('application/vnd.pgrst.object+json')) return send(res, rows.length === 1 ? 200 : 406, rows.length === 1 ? rows[0] : { code: 'PGRST116', message: 'No row', details: 'The result contains 0 rows' });
      return send(res, 200, rows);
    }
    send(res, 404, { message: 'Test transport endpoint not implemented' });
  } catch (error) { send(res, 400, { code: error.code || 'TEST_ERROR', message: error.message }); }
});
server.listen(54329, '127.0.0.1', () => console.log('Local TEST provider ready on 127.0.0.1:54329. Demo fixtures only.'));
