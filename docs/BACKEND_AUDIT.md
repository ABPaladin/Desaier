# Backend audit — November 24, 2026

## November 25 update

The existing Supabase production project `oueolnrsoicnamrkxawc` (dashboard name Desair) is now migrated through the owner-authorized CLI workflow. Version `202611200001` matches local and remote history. Read-only hosted verification passed for all seven tables/RLS, 15 function signatures/grants/search paths, ten policies, Auth trigger and private 20 MB bucket, with no extra policies. The policy expressions were reviewed against the migration.

The live site is `https://desaier-cjyd.vercel.app`; homepage is reachable, but `/api/health` returns 503 `configuration: missing_or_invalid`. Vercel variables/redeploy, SMTP, first operator and actual authenticated integration tests remain pending. All 19 local tests, lint, TypeScript and build pass. The table below records the earlier pre-migration audit; its hosted-database limitation is superseded by this update.

The repository, migration, API handlers and tests were inspected. The two missing remote commits (`a6c67ad`, `6981a7a`) were pushed to existing `main` without rewriting history. GitHub previously lacked the local functional implementation.

| Component | Actual implementation | Verification / remaining work |
| --- | --- | --- |
| Framework/deployment | Next.js App Router; `frontend/src/app/api`; Vercel Functions | Production builds pass. No Java/Spring, Docker, separate REST host or S3 adapter exists or is required here. Actual Vercel deployment unverified. |
| Authentication | Supabase Auth, SSR cookie adapter, signup/login/recovery/update-password/logout and confirmation callback | Local login/session/logout/role browser tests pass against test transport. Real signup, mail links and token renewal remain unverified. |
| Authorization | Auth `getUser`, active profiles, client/designer/operator gates, PostgreSQL RLS and narrow transactional RPCs | Actual migration tested in PGlite with different identities. No self-provisioning staff roles; operator bootstrap is trusted SQL. Hosted policies need verification. |
| Database | `supabase/migrations/202611200001_agency.sql`, seven agency tables | Versioned migration passes locally; no hosted application confirmed. No runtime schema auto-update or JDBC credentials. |
| Projects | `/api/workspace`, `/api/projects/[id]`, shared contracts and `live-workspace.tsx` | Brief, assignment, tasks/messages, revisions, approval and archive tested locally; optimistic versions, internal note isolation and suspension covered. |
| Files | `/api/files`; private Supabase Storage, signed direct uploads, immutable delivery records, short-lived downloads | Local policies/workflow pass; Auth/Storage HTTP transport is simulated. Actual MIME/size enforcement and persistence across redeploy require live tests. |
| AI | `/api/ai`, `lib/ai.ts`, OpenAI Responses API, operator only, quotas, timeout, persisted drafts | Adapter/error/quota tests pass; no paid request made. Key + model required. No Spring AI, automatic staffing or final approval. |
| Email | Supabase Auth templates and SMTP provider configuration | Auth flows exist; external SMTP unconfigured/unverified. Project notification emails are missing; no queue/worker implemented. |
| Environment/health | `.env.example`, configuration/build guard, `/api/health`, online smoke script | Malformed origins, privileged keys and hosted fixtures rejected. Probe is configuration-only, not external readiness. |
| Demo content | `/demo/*`, `lib/demo.ts`, public concept portfolio/team, `tests/provider-harness.mjs` | Labeled fixtures isolated from real workspace APIs. Harness is temporary test infrastructure, never a production backend. |

Current verification: lint, TypeScript, 18 PostgreSQL/configuration/validation tests, configured and unconfigured production builds, full local browser workflow, 30 layout checks, motion/keyboard checks, and zero reported production dependency vulnerabilities. Credential-pattern scanning of HEAD and two relevant historical snapshots found no matches; only `.env.example` is tracked. This is not a claim of exhaustive secret detection.

Missing/unverified launch dependencies: canonical Vercel domain/access, Supabase project/migration, SMTP/domain, operator bootstrap, real AI request, live cross-role acceptance, backup/restore and operational monitoring. No service was provisioned or paid operation executed. GitHub public metadata exposes no homepage or deployment URL.

Other scope limits: manual refresh, one assigned designer per project, bounded lists without full pagination, no malware scanning or automatic project email notifications. Payments and Academy enrollment remain outside confirmed scope. The original full acceptance plan has not been recovered; the founder concept and current documented requirements guide implementation.

Use [ONLINE_SETUP.md](ONLINE_SETUP.md) for the launch sequence, [VERIFICATION.md](VERIFICATION.md) for local reproduction, and [MILESTONE.md](MILESTONE.md) for the checklist.
