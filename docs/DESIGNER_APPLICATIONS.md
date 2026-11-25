# Designer applications — November 26, 2026

Implemented and verified locally; production migration and rollout are pending.

## Behavior

Registration offers Client or Designer. Designer creates a pending application; the protected database role remains client until an active operator approves it. Email confirmation and deliberate login remain unchanged. Candidates see their application status instead of client onboarding. Refresh or a new login picks up approval and opens the designer workspace.

Operators approve or decline in People & access. Decisions record a review time. Pending applications appear first within the existing 500-member display limit. Public registration cannot grant operator access; existing accounts and project-history role restrictions are preserved.

Production preflight found **zero active operators**. The owner must bootstrap an operator through trusted administration (see ONLINE_SETUP.md); this migration does not promote anyone. Keep the owner account as operator and use a separate account to test designer applications.

## Exact migration awaiting authorization

Follow [DATABASE_ACTIVATION.md, section 2](DATABASE_ACTIVATION.md#2-punct-obligatoriu-de-autorizare). Earlier permission to deploy visual changes did not identify this schema migration.

| Item | Reviewed value |
| --- | --- |
| Organization | `fhajerdziizyqfihlifk` |
| Project / environment | Desair / production, `ACTIVE_HEALTHY`, eu-west-1 |
| Project ref | `oueolnrsoicnamrkxawc` |
| Dashboard | https://supabase.com/dashboard/project/oueolnrsoicnamrkxawc |
| Remote migration history | `202611200001` only |
| Dry-run proposal | Only `202611260001_designer_applications.sql`; no seeds or roles |
| File | `supabase/migrations/202611260001_designer_applications.sql` |
| SHA-256 of reviewed local bytes | `1C1D59F1D4569E3A143D7C712E66DCA161D6CCFB4BE1CBE0C79FEFDCDEC39CFE` |

The transaction adds `designer_application_status` and `designer_application_reviewed_at` to profiles, extends the existing profile-provisioning and member-management functions, and adds an operator-checked review RPC. The Auth trigger itself, RLS policies, existing roles, credentials and infrastructure configuration remain unchanged. Signup metadata can request review but cannot grant privileges. The original migration is untouched. Recalculate the hash if line endings change.

Read-only preflight confirmed the new columns/RPC do not exist and profile RLS and the Auth trigger are enabled. No personal records were inspected or changed; operator availability was checked as an aggregate count.

## Rollout after authorization

1. Recheck hash, linked target, remote history and dry run. Do not push the frontend first: its operator query needs the new columns.
2. Apply once with `npx.cmd --yes supabase@3.3.0 db push --remote=oueolnrsoicnamrkxawc --skip-vault --yes`. No reset, seeds, include-all or second deployment mechanism.
3. Verify history and run `supabase/checks/designer_applications_preflight.sql` and `supabase/checks/verify_agency.sql` read-only. Expect both new columns/RPC, 16 valid functions, seven protected tables, the original ten policies, valid trigger and private bucket.
4. Push verified main and monitor canonical Vercel project **desaier-cjyd**, https://desaier-cjyd.vercel.app. Verify health, navigation and signup choices. The legacy project named desaier is not the production target.
5. Verify real confirmation email and approval with owner-designated accounts. Local fixture confirmation does not prove hosted email delivery.

Frontend rollback baseline: `83bbaed325ec422b57b7025f06c96211d0201f9d`. The additive schema is compatible with that frontend; avoid destructive database rollback. Its old registration form continues provisioning ordinary clients.

## Local verification

Lint, TypeScript, production build and 22 tests passed. Playwright passed signup/review, all-role navigation and the complete agency workflow. Desktop/mobile screenshots in `artifacts/designer-*` were inspected, with no horizontal overflow. PostgreSQL runs actual migrations/RLS; Auth/Storage transport and email confirmation are local fixtures. No production schema/account mutation or Git push was performed for this milestone.
