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
- [x] Identified existing production project `oueolnrsoicnamrkxawc`; applied `202611200001` through the authorized CLI workflow and verified hosted tables, RLS, policies, function grants and private bucket on November 25.
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
- [x] Prepared official Supabase CLI 3.3.0 configuration, single-method migration runbook and read-only preflight/catalog checks. All 19 local tests pass; migration file remains unchanged.
- [x] CLI login/link and read-only preflight verified production project `oueolnrsoicnamrkxawc` (dashboard name Desair). Remote history/schema/bucket are empty; dry-run proposes only `202611200001_agency.sql`.
- [x] Owner confirmed continuation; unchanged migration applied once through CLI to the exact approved production target. History matches locally/remotely; all seven tables, RLS, 15 functions, 10 policies, Auth trigger and private bucket verified. No additional policies.
- [x] Re-ran 19 local tests, lint, TypeScript and production build. Verified Vercel homepage is reachable at `https://desaier-cjyd.vercel.app`; health correctly reports 503 `missing_or_invalid`.
- [ ] Configure Vercel Production variables and redeploy, then test real signup/confirmation/recovery, operator bootstrap and cross-role workflow. Keep Git push pending until Supabase GitHub configuration-deployment behavior is understood; only CLI was authorized for this migration.
- [ ] Final integrated production smoke, permissions and visual review.
- [x] Improved configuration build errors to identify each missing/invalid variable without exposing values. Twenty tests, lint, TypeScript and build pass; reproduced an invalid-origin build and verified its specific diagnostic. Actual Vercel values still require correction in the dashboard.
- [ ] Commit/push release state, verify Vercel deployment and hand over operator setup/runbook.

Academy enrollment and payments are not inferred from the concept document. Academy remains Coming Soon; no payment flow has been added.

## November 25 — authenticated navigation and visual refinement

- [x] Owner reports production Supabase configuration, email registration and real client login working. This supersedes the earlier configuration blockers above. Read-only production smoke passed at `https://desaier-cjyd.vercel.app`; no live account mutations were performed in this milestone.
- [x] Server-rendered account navigation validates with Supabase `getUser` and protected profile role/active status. Only name and role reach the public shell; HttpOnly cookie settings, RLS and database migrations are unchanged. A page proxy persists refreshed cookies before rendering.
- [x] Accessible desktop/mobile account disclosure, role-specific dashboard and project actions, designer-only functional profile link, logout feedback, immediate login/logout updates, tab synchronization and focus/route revalidation. No unsupported Settings link.
- [x] Historical asterisk logo from `028a8dc` restored as a static SVG in header/footer and shared brand placements; no emoji or logo animation.
- [x] Asymmetric 24-path ribbon with three independent transform layers, richer orchid/amethyst lighting, pointer response, pause/offscreen suspension and reduced motion. Varied public text/artwork/service/process reveals, scroll accents and animated portfolio expansion; dashboards remain calm. No new dependencies.
- [x] Lint, TypeScript, 20 authorization/configuration/validation tests and production build. Targeted navigation/session/motion browser checks; existing complete agency workflow and 30 responsive checks. Updated desktop/mobile screenshots inspected. Evidence and limits in `docs/VERIFICATION.md`.
- [ ] Deploy this reviewed local milestone, then perform authenticated acceptance against the live provider. No Git push, Vercel deployment, production migration or policy change was made for this task.

## November 26 — single satin sculpture and authorized production rollout

- [x] Replaced the multi-line vortex with one continuous, softly shaded sculpture. Native SVG morphing changes its silhouette and aperture over 21 seconds; restrained CSS float and pointer response preserve the existing hero composition.
- [x] Removed orbital decoration, improved desktop/mobile proportions and retained pause, offscreen/hidden-tab suspension and initial/live reduced-motion support. No dependencies or authentication/database/infrastructure changes.
- [x] Fixed an observed scroll-animation hydration warning by controlling paused Web Animations rather than mutating server-rendered style attributes.
- [x] Lint, TypeScript, production build, 20 authorization/application tests, all-role navigation/login/logout checks and targeted sculpture/motion/responsive checks passed. Reviewed desktop, mobile and three animation poses.
- Production push and automatic Vercel rollout explicitly authorized by the owner. Previous successful production baseline: `2d3f8d5805f476e100a0f8deca8af7c3dc936dbb`, Vercel project `desaier-cjyd`. Verify this exact target and canonical homepage after push; retain the baseline for rollback if a serious regression appears.
- [x] Commit `83bbaed325ec422b57b7025f06c96211d0201f9d` pushed to main. Canonical deployment succeeded; production desktop/mobile sculpture, homepage, login form, navigation, health 200 and anonymous workspace 401 verified without account mutations.

## November 26 — designer applications (verified locally)

- [x] Owner selected operator-approved applications. Added Client / Designer signup, persistent pending/declined status, operator approval/refusal and designer access after approval.
- [x] New migration preserves existing roles, original migration and RLS policies. Metadata cannot grant staff access; project-history restrictions remain enforced.
- [x] Lint, TypeScript, production build, 22 tests, signup/review browser checks, all-role navigation and full agency workflow passed. Updated desktop/mobile screenshots inspected.
- [x] Read-only production preflight and dry run: one new migration proposed; no active operator yet. Exact target, hash, effects and rollout order in [DESIGNER_APPLICATIONS.md](DESIGNER_APPLICATIONS.md).
- [x] Owner explicitly authorized publication. Applied `202611260001` once to the reviewed production project; history matches both local versions, application columns/RPC present, catalog checks pass (16 functions, seven protected tables, ten original policies, no extra policies, valid Auth trigger/private bucket). No real account roles changed.
- [x] Pushed `88d5a84657c8df6ff0a66bfc93d8c40b1c3acd25` to main. Canonical Vercel deployment [BZNjRvKxrrhLf3rQhTa1nw9HjVAj](https://vercel.com/a-bs-projects-4445252c/desaier-cjyd/BZNjRvKxrrhLf3rQhTa1nw9HjVAj) succeeded. Read-only production browser checks passed homepage/sculpture, enabled login/signup, Client/Designer choice/approval notice, desktop/mobile navigation, no overflow or page/hydration errors, health 200 and anonymous workspace 401. Production screenshots inspected.
- [ ] Real-account email confirmation and designer approval acceptance with owner-designated accounts; owner operator bootstrap remains necessary (zero active operators at release). Local end-to-end coverage passed, but no live accounts were created for verification.
- Continuation context and file/test pointers: [CONTINUE_FRONTEND.md](CONTINUE_FRONTEND.md). Subsequent changes in this release handoff are documentation, read-only smoke test and screenshots only.

## November 27 — hero lighting and Academy composition

- Expanded the animated light layer across the hero and feathered its edges to remove the vertical gradient seam. Centered the Academy SVG explicitly, removed inherited glyph line-box sizing, and reserved a separate mobile area for it.
- Increased sculpture path deformation and shortened morph timing to 15 seconds; independent 13-second float changes orientation and proportions gently. Pause and reduced-motion behavior retained.
- Lint, TypeScript, build, 22 tests and tests/visual-seams-browser.js passed. Desktop/mobile screenshots inspected in artifacts/hero-seam-* and academy-position-*.
- Next requested work: collect complete designer/client information during registration, show it to operators before approval, and retain profile forms only for subsequent edits without reapproval. Pending user clarification: should client accounts also require approval, or only designer applications as currently? No registration/schema changes made in this milestone.
- AI code inspected: Responses API adapter, operator-only brief analysis and candidate suggestions, internal results and database-enforced hourly quota exist. Production OPENAI_API_KEY/OPENAI_MODEL availability and a real request remain unverified; no paid provider call made.

## November 27 — optimized 3D sculpture and delayed Academy light

- Replaced the primary SVG visual with one procedural WebGL surface (10,240 triangles, indexed static UV mesh). Vertex shaders deform and orient the actual 3D geometry; computed normals drive violet/orchid lighting and satin highlights. No added packages, textures, model download or postprocessing.
- Render cap 30fps, DPR cap 1.5, maximum 1100-square drawing buffer; offscreen/hidden-tab suspension, explicit pause, pointer easing and static reduced-motion pose. Retained server-rendered SVG fallback for unavailable/lost WebGL; hidden fallback animation stops while GPU renderer is active. Physical-device GPU performance remains unmeasured.
- Academy hover/focus illumination starts after 180ms and eases over 0.9–1.2 seconds; fade-out is smooth, with reduced-motion transitions disabled. Header/footer logos stay static.
- Lint, TypeScript, production build and 22 tests passed. Targeted Playwright verified render/animation, resolution cap, pause/resume, offscreen suspension, reduced motion, context-loss fallback, hover delay/light, mobile navigation and no page errors. Inspected desktop/mobile model and lit Academy screenshots. Test: tests/sculpture-3d-browser.js uses current browser origin and supports local/production read-only checks.
- Renderer implementation follows conservative resource sizing and explicit GPU cleanup guidance: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices . Existing SVG motion test now explicitly exercises the fallback.
- Expanded registration remains a separate unfinished request, awaiting whether clients also require operator approval. No authentication, schema or AI configuration changes in this visual milestone.

## November 27 — restore SVG at owner request

- Owner rejected the WebGL model and requested the previous visual. Restored LivingSculpture and SVG lifecycle from 27780ff, removed the GPU renderer and its overrides, and restored SVG-targeted browser tests. Preserved the separately requested delayed Academy illumination, corrected gradient and Academy positioning.
- Lint, TypeScript, production build, 22 tests and desktop/mobile visual-seams browser checks passed. SVG morph, pause, reduced motion and symbol containment verified; desktop capture inspected.
- Registration status clarified to owner: extended profile collection is NOT implemented. Existing signup still only collects name/email/password and Client/Designer choice, with operator-approved designer applications. Full pre-approval profile review and client details remain outstanding; no schema or authentication changes in this restoration.
