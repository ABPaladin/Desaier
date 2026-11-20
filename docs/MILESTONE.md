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
- [x] Implementation committed locally as `a6c67ad`; developer handoff included in the following documentation commit. No push/deployment yet.

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
