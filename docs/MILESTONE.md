# Development checklist

Final deadline: **November 25, 2026**. Continue the existing project; centrally managed agency throughout.

## November 19 — frontend review (complete)
- [x] Marketing, services, portfolio, illustrative team and Academy Coming Soon.
- [x] Three role previews, responsive layouts, sculpture and accessible motion.
- [x] Founder review received; existing Vercel demo deployed by the user.

## November 20 — functional implementation (complete locally)
- [x] Decorative glyphs replaced by SVG/icons; expanded purple, orchid and iris palette.
- [x] Auth flows, cookie sessions, role-aware workspaces and isolated demo routes.
- [x] PostgreSQL migration, profile provisioning, RLS and transactional workflow functions.
- [x] Structured briefs, assignments, deadlines, tasks, shared/internal comments and audit history.
- [x] Private uploads, revisions, operator approval and signed client downloads.
- [x] Operator member controls; designer skills, portfolio and availability editing.
- [x] OpenAI adapter, brief analysis and designer suggestions, operator-only access and usage caps.
- [x] Lint, TypeScript, build, PostgreSQL authorization tests, browser integration and motion/visual checks.
- [x] Dependency audit patched to zero reported vulnerabilities.
- [x] Setup instructions, reproducible tests and explicit verification limits.
- [x] Implementation committed as `a6c67ad`; developer handoff in `6981a7a`. Both pushed to `origin/main` on November 24 after credential-pattern and tracked-file review.

## November 24 — deployment preparation and visual refinement
- [x] Actual architecture audited: Next.js API routes + Supabase, deployable together on Vercel; no Spring Boot or additional Java hosting required.
- [x] Romanian `ONLINE_SETUP.md`: accounts, database access, migration, SMTP, exact variables, operator bootstrap, live acceptance and blockers.
- [x] Fail-closed configuration validation and build guard against privileged public keys, invalid origins and hosted local fixtures.
- [x] Uncached `/api/health` configuration probe and read-only `tests/online-smoke.mjs`; neither falsely claims hosted-provider readiness.
- [x] Richer orchid/amethyst sculpture, violet section lighting, lavender portfolio treatment and differentiated service hover accents.
- [x] Final local verification: lint, TypeScript, 18 tests, both build configurations, full workflow browser check, 30 layout checks, motion/keyboard checks and dependency audit. Evidence in `VERIFICATION.md`.
- [x] Preparation milestone verified and ready for Git synchronization; cloud activation remains a separate pending milestone.
- [ ] Obtain the canonical Vercel URL and authorized provider access; GitHub exposes no deployment URL. Cloud migration, SMTP and real AI remain unverified.

## November 21–22 — hosted integration (pending access)
- [ ] Identify/provision the intended Supabase project; apply migration and verify RLS on hosted PostgreSQL.
- [ ] Configure production Auth URL, email confirmation, SMTP, password policy and rate limits.
- [ ] Set Vercel environment variables; bootstrap the first operator through trusted SQL.
- [ ] Configure OpenAI credentials/model and exercise a real, approved test brief.
- [ ] Verify signup/email confirmation/recovery/refresh, actual storage upload/download and usage caps against live providers.
- [ ] Reconcile the original full development plan/acceptance criteria with the recovered founder concept document.

## November 23–24 — founder acceptance and release
- [ ] Replace illustrative marketing people/projects with approved content when supplied.
- [ ] Founder acceptance across client, designer and operator flows; triage fixes.
- [ ] Production backup/restore, logging and usage-budget configuration; preview-to-production deployment check.
- [ ] Cross-browser and real-device checks for critical account/upload flows.

## November 25 — release
- [ ] Final integrated production smoke, permissions and visual review.
- [ ] Commit/push release state, verify Vercel deployment and hand over operator setup/runbook.

Academy enrollment and payments are not inferred from the concept document. Academy remains Coming Soon; no payment flow has been added.
