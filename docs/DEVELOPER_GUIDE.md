# Desaier developer handoff

Last updated: November 20, 2026. Target release: November 25.

Implementation checkpoint: Git commit `a6c67ad`. Changes are committed locally; they have not been pushed or deployed.

## What exists now

The original Next.js frontend has been extended, not rebuilt. The code now includes real Supabase-backed account/project endpoints, database authorization, private delivery review and OpenAI assistance. The current Vercel deployment is still the previously deployed demo until these changes are pushed and deployed.

**There is no hosted database connected to this checkout yet.** No production credentials were available. Two different things exist locally:

1. **The production database definition:** `supabase/migrations/202611200001_agency.sql`. This file is the blueprint, not a running database or a file containing client data. It creates the tables and security rules when applied to Supabase.
2. **Temporary test databases:** tests use PGlite, an embedded PostgreSQL engine. They live in memory and disappear when the test process stops. The local HTTP test provider on port 54329 also uses an in-memory database with explicitly labeled demo accounts. It must never be used for production.

Once Supabase is configured, real users and projects live in that Supabase project's hosted PostgreSQL database. Files live in its private Storage bucket. Vercel runs the web application and API handlers; it does not store project data on its filesystem.

## Where to access everything

| What | Where |
| --- | --- |
| Website hosting and deployments | Existing Desaier project in the Vercel dashboard. Root directory: `frontend`. |
| Database tables | Supabase dashboard → intended project → Table Editor → `public` schema. |
| SQL migrations and queries | Supabase dashboard → SQL Editor, or the Supabase CLI used by your team. |
| Accounts and email settings | Supabase project → Authentication. |
| Uploaded files | Supabase project → Storage → private `deliverables` bucket. |
| Public API URL and publishable key | Supabase project connection/API settings. These populate the two `NEXT_PUBLIC_SUPABASE_*` variables. |
| OpenAI key, model access and spending controls | The agency's OpenAI API project. Key stays server-side. |
| Development progress | `docs/MILESTONE.md`. |

Dashboard labels can change; use the provider's current documentation for exact navigation. Detailed configuration, email templates and acceptance checks are in [SETUP.md](SETUP.md).

## First-time setup, in order

1. Obtain access to the existing Vercel project and the intended Supabase project. If no Supabase project exists, the agency owner/developer creates one in the correct organization and records its project reference. Do not create unrelated duplicate infrastructure.
2. Apply the SQL migration once. Confirm the tables and private bucket appear. Do not disable row-level security to work around an error.
3. Configure Supabase email confirmation, production SMTP and the exact site/callback URLs as described in `SETUP.md`.
4. Copy `frontend/.env.example` to `frontend/.env.local`. Fill in the intended project URL/public key and `APP_ORIGIN`. Add OpenAI variables only when the agency is ready to activate AI. The real `.env.local` is ignored by Git.
5. Install dependencies and start the app:

```powershell
Set-Location C:\Users\alexa\Downloads\Desaier\frontend
npm.cmd ci
npm.cmd run dev -- --port 3003
```

6. Open `http://localhost:3003/register`, register the owner's account and confirm the email. In the Supabase dashboard, find that account's verified UUID. Run the operator-promotion SQL from `SETUP.md`. Never promote users based on data they supplied during signup.
7. Log in as the operator. Designers create and confirm their own accounts; the operator designates them as designers in **People & access**, before they have project history. Designers then fill in **Creative profile**.
8. Run the live acceptance checklist. After it passes, configure the same variables for the intended Vercel environment and deploy. Preview and production should use separate Supabase projects. Setting environment variables requires a rebuild because the public upload configuration is bundled at build time.

## How the application is used

**Client:** register/confirm → log in → New brief → provide service, goals and optional context → submit → follow milestones and shared messages → download files after operator approval.

**Operator:** open incoming project → choose designer and target date → add milestones → coordinate using internal/shared notes → review uploaded file → request changes with feedback or approve final delivery → archive completed work. The operator can also activate/suspend client/designer accounts. Operator-level access is administered through trusted database operations.

**Designer:** fill in skills, portfolio, languages, timezone and availability → open assigned project → complete tasks → coordinate with operator → upload a PDF/image/ZIP up to 20 MB → submit for review → revise if requested. Designers cannot assign projects or approve final delivery.

**AI assistance:** the operator chooses Analyze brief with AI. The brief and available designers' skill profiles are sent to OpenAI. Results are private suggestions only; the operator still makes staffing and approval decisions. No API key means a disabled AI control, not simulated output.

Use **Refresh** to fetch changes made in another session. Opening a project refreshes that project's details. This version does not send background notifications or use realtime subscriptions.

## Code map

| Path | Responsibility |
| --- | --- |
| `frontend/src/app/api/auth/[action]/route.ts` | Signup, login, recovery, password update and logout. |
| `frontend/src/app/auth/confirm/route.ts` | One-use email confirmation/recovery callbacks. |
| `frontend/src/app/api/workspace/route.ts` | Workspace reads, briefs, assignments, member controls, tasks, comments and designer profiles. |
| `frontend/src/app/api/projects/[id]/route.ts` | Authorized project detail. |
| `frontend/src/app/api/files/route.ts` | Signed uploads/downloads and submission registration. |
| `frontend/src/app/api/ai/route.ts` | Operator checks, usage reservation and AI draft persistence. |
| `frontend/src/lib/server` | Cookie-backed Supabase client, identity checks, bounded request handling and safe errors. |
| `frontend/src/lib/ai.ts` | Responses API adapter; no tools or automatic project mutations. |
| `frontend/src/components/live-workspace.tsx` | Real client/designer/operator interface. |
| `frontend/src/components/auth.tsx` | Real account forms. |
| `frontend/src/components/workspace.tsx` | Isolated demo interactions only. |
| `frontend/src/app/workspace.css` | Founder palette refinements and workspace styles. |
| `frontend/src/components/motion.tsx` | Existing sculpture and accessible motion. |
| `supabase/migrations` | Versioned database definition and permissions. |

Database tables: `profiles`, `projects`, `tasks`, `comments`, `deliveries`, `events`, `ai_runs`. Auth credentials are managed by Supabase Auth, not stored in these application tables. Table writes are denied to normal users; narrow SQL functions enforce each allowed mutation. Reads use row-level policies. The application does not use a service-role key.

## Development and Git workflow

Before changing something, read `AGENTS.md`, `frontend/AGENTS.md`, `docs/MILESTONE.md` and only the relevant code. For this Next.js version, consult the matching installed guides in `frontend/node_modules/next/dist/docs`.

```powershell
git status --short
git switch -c feature/short-description
# Implement one coherent milestone.
Set-Location frontend
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
Set-Location ..
# Run the relevant browser checks; instructions are in docs/VERIFICATION.md.
git diff --check
git diff --stat
# Stage explicit paths after reviewing the diff; never stage secrets.
git add <reviewed-paths>
git commit -m "feat: describe the completed milestone"
```

Update `docs/MILESTONE.md` with actual results, then commit. Push only when the intended deployment is ready: the existing Git remote may trigger Vercel automatically. Make future database changes as **new migration files** after the initial migration has been applied to a shared environment; do not rewrite a deployed migration. Back up production before destructive changes.

## Current limits and next work

- Hosted provider activation and live tests remain unfinished; local transport tests do not verify real email delivery, hosted Storage or a paid OpenAI request.
- The recovered founder concept document supports the implemented workflow; the original detailed MVP acceptance checklist still needs reconciliation.
- One assigned designer per project. Lists are bounded for the MVP; see `MVP.md` for exact limits.
- Public team/portfolio content is still labeled illustrative/demo until approved real assets are supplied.
- Academy remains Coming Soon. No payments, course enrollment or background notification system has been introduced.

Next developer task: follow `SETUP.md` to connect the intended hosted services, execute its live acceptance checklist, then continue founder acceptance and release preparation in `MILESTONE.md`.
