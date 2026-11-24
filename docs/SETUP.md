# Backend and Vercel activation

Use the existing Vercel project with root directory `frontend`. The local test provider under `frontend/tests` must never be used in production.

## Supabase

1. Follow [DATABASE_ACTIVATION.md](DATABASE_ACTIVATION.md). The owner selected the official CLI as the single migration method, with verified project identity, history, dry-run and explicit authorization before production schema changes. Apply `supabase/migrations/202611200001_agency.sql` once through CLI; do not also execute it through SQL Editor, MCP or GitHub automation. It creates Auth profile provisioning, agency tables, RLS, narrow mutation functions and the private `deliverables` bucket.
2. In Auth, enable email/password signup and email confirmation. Set the password minimum to at least 12 characters. Configure production SMTP and verify delivery. Review provider signup/login/email rate limits for expected traffic before launch.
3. Set Site URL to the exact production origin, and allow the exact development/preview origins you intend to use. Do not allow arbitrary wildcard domains.
4. Set confirmation email links to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup` and recovery links to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`. These one-use hash links work across devices. For preview testing, use a dedicated staging Auth project with its own Site URL. The handler also supports PKCE code callbacks.
5. Register and confirm the agency owner's account. Verify its UUID in Auth. Promote that exact UUID using trusted SQL:

```sql
update public.profiles set role = 'operator'
where id = '<verified-owner-auth-user-uuid>';
```

All other signups start as clients, regardless of user metadata. Designers register, confirm their emails, then an operator designates their accounts in **People & access** before they have project history. Operators cannot promote other operators or change their own access through the application.

## Environment

Copy `frontend/.env.example` to ignored `frontend/.env.local` for local development. For Vercel, configure environment variables through the existing project's settings, scoped to the appropriate environment, then rebuild/redeploy:

| Variable | Purpose |
| --- | --- |
| `APP_ORIGIN` | Exact canonical origin, e.g. the production HTTPS domain. Local preview uses `http://localhost:3003`. Required for auth redirects, mutation-origin checks and cookie security. |
| `NEXT_PUBLIC_SUPABASE_URL` | Intended Supabase project's HTTPS API URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public/publishable key. User sessions plus RLS are used, never a service-role key. |
| `OPENAI_API_KEY` | Optional server-only provider credential; configure to activate AI. |
| `OPENAI_MODEL` | Model available to that OpenAI project supporting the Responses API. No unverified model choice is hardcoded. |

Do not paste secrets into chat, source files or commits. Public Supabase variables are intentionally included in the browser build to upload directly to private Storage with signed tokens. Public values must be correct at build time. AI remains visibly unavailable until both server variables are present; it never returns fabricated output.

## Live acceptance before production

- Confirm signup, email confirmation, invalid/successful login, recovery, session expiry/refresh, logout and suspension. Confirm cookies are HttpOnly, SameSite=Lax and Secure on HTTPS.
- Create two clients, one designer and one operator using labeled test content. Confirm clients cannot see each other's projects or files, and changing URLs cannot grant another role.
- Submit a brief; assign a designer and date; add tasks and shared/internal messages. Refresh both roles to verify persistence.
- Upload a real test PDF, request revisions, submit a new file and approve it. Confirm the client cannot see earlier drafts or internal notes, and can download only the approved file. Test MIME and 20 MB limits against actual Storage; bytes go directly to Storage to avoid Vercel request-body limits.
- Generate one AI draft with approved non-sensitive test content. Check matching suggestions, provider failures, database usage caps and provider billing limits. AI never applies assignments or approvals.
- Review database backups/restore, monitoring and operational ownership. Configure provider spending limits. Files are not malware-scanned by this MVP; establish the agency's accepted-file review process.
- Remove abandoned uploads through trusted storage administration only after confirming they have no `deliveries` reference. Submitted files are protected from application deletion.

References: [Supabase server-side Auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [private Storage access](https://supabase.com/docs/guides/storage/security/access-control), [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create).
