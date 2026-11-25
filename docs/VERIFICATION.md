# Verification — November 17, 2026

## Latest verification — November 24

Update November 25: applied unchanged migration `202611200001` once to authorized production project `oueolnrsoicnamrkxawc` with official CLI 3.3.0. Remote migration history matches local. `supabase/checks/verify_agency.sql` ran read-only on hosted PostgreSQL and returned `catalog_checks_pass=true`, seven tables/RLS, 15 function checks, ten policies, valid Auth trigger and private bucket, no additional policies. Re-ran all 19 local tests, lint, TypeScript and build successfully.

The online smoke test now targets the owner's confirmed `https://desaier-cjyd.vercel.app`. Homepage passed; configuration check failed with HTTP 503. Direct health inspection confirmed `application: ok`, `configuration: missing_or_invalid`, `externalServices: not_checked`, and `Cache-Control: private, no-store`. A live Chromium check of `/login` confirmed the preparation notice and disabled email/password/submit controls. This identifies pending Vercel configuration/redeploy; it does not invalidate the successful database migration. No real-account signup, email, Storage transfer or paid AI test was performed in this pass. Earlier results follow.

Passed lint, TypeScript, 18 tests (including two deployment-configuration tests), production builds with local fixture configuration and with no backend configuration, and npm production audit with zero reported vulnerabilities. Initial test launch was blocked by sandbox access to the OS user profile; the same suite passed outside the sandbox.

Re-ran the complete local MVP browser workflow, 18 route/viewport checks, 12 further layout checks, motion/keyboard checks and unconfigured-account checks. `/api/health` returns uncached 200 for valid configuration and 503 without configuration, always stating that external services are not checked. Updated screenshot evidence in `artifacts/refined-*`, `artifacts/mvp-test-*`, and `artifacts/launch-hero-{desktop,mobile}.png`; visually reviewed both hero viewports. The fixture transport still simulates Auth/Storage and cannot establish hosted readiness.

`node tests/online-smoke.mjs https://YOUR-CANONICAL-DOMAIN` provides read-only deployment checks. It has not been run against production because the actual domain/access is unavailable. Follow the authenticated provider acceptance checklist in [ONLINE_SETUP.md](ONLINE_SETUP.md) before calling the MVP live.

The historical results below describe earlier milestones.

Passed: npm run lint, npm run typecheck, npm run build.

Playwright CLI against production server on port 3002:
- Nine routes at 1440 x 900 and 390 x 900; all rendered an h1, no horizontal overflow.
- Full-page screenshots for each route in artifacts.
- Mobile menu navigation, portfolio expansion.
- Client brief validation/submission feedback.
- Designer submission transitions to operator review.
- Operator assignment, approval, change request.
- Login and registration demo forms navigate to client workspace.
- Reduced motion disables sculpture animation.
- No uncaught page errors; final production console has no errors or warnings.

Visual inspection: desktop/mobile homepage and desktop operator layout. Fixed encoding artifacts and Next smooth-scroll attribute warning during verification. Screenshots are review artifacts, not pixel-diff baselines. Chrome only; physical-device and cross-engine checks remain unperformed.

## Creative refinement verification
Re-ran lint, typecheck and production build successfully. Production preview for this pass: port 3003.

- Existing 18 route/viewport checks and all core workflow checks passed.
- Added tests/motion-smoke.js: pause/resume, pointer drift, offscreen suspension, live reduced-motion change, portfolio hover and keyboard skip-link entry.
- Added 12 layout checks across 320, 768 and 1024px on home, services, designers and operator routes. Fixed a 320px discipline-strip overflow.
- Checked content visibility with JavaScript disabled. Production console: zero errors/warnings.
- Regenerated all 18 route screenshots, plus normal-motion hero screenshots and portfolio hover evidence. Full-page captures use reduced motion for stable review; motion is exercised separately.
- Visually reviewed desktop/mobile hero, desktop designers and mobile services. Removed a decorative mobile caption collision.

Reports: artifacts/playwright-report.txt and artifacts/motion-report.txt. Chrome only; no claim of physical-device testing, cross-browser validation or measured frame-rate performance.

## November 20 — functional MVP implementation

Passed: lint, TypeScript, production builds with and without backend configuration, 16 PostgreSQL/validation tests, and npm production dependency audit (zero reported vulnerabilities).

`frontend/tests/database.test.mjs` applies the actual SQL migration to PGlite PostgreSQL. Tests use `authenticated`/`anon` roles and distinct user identities. Coverage: untrusted signup metadata, cross-client isolation, direct-table mutation denial, staff assignment, active-account checks, stale/null versions, structured-brief validation, tasks, shared/internal messages, private Storage policies, immutable submissions, newest-revision approval, suspension, designer profiles, hourly AI limits and audit preservation.

`tests/mvp-browser.js` passed against the production Next.js server and the local test provider. It uses four isolated browser accounts and real application endpoints, executing the real PostgreSQL functions/RLS. Verified login cookies, role redirects, persistence after reload, brief context, operator assignment/date/tasks, designer profile, private notes, upload/submit, approval, signed downloads, CSRF, unauthorized operations, conflicting edits, suspension and logout. Six desktop/mobile workspace screenshots are in `artifacts/mvp-test-*`. The selectors explicitly exclude inactive pages retained by Next.js.

Auth and Storage HTTP services in this integration test are **test doubles**. Live signup/email confirmation/recovery, token refresh, hosted Storage transfer and a real OpenAI request are not verified. AI adapter tests cover bounded inputs/output, no tools, disabled response storage, provider errors and incomplete responses; no paid provider request was made.

Frontend: 18 desktop/mobile route checks and 12 additional viewport checks passed. Motion pause/resume, drift, offscreen suspension, live reduced-motion changes, keyboard skip navigation and portfolio expansion passed. Reviewed mobile homepage and desktop/mobile workspaces; corrected process-marker overlap, hidden skip-link screenshot artifacts and selected-project/list synchronization. No uncaught browser page errors. Chrome only.

Reports: `artifacts/refinement-report.txt`, `artifacts/refined-motion-report.txt`, `artifacts/mvp-browser-report.txt`. Screenshots contain labeled demo/test fixtures, not customer data.

The unconfigured build also passes `tests/configuration-smoke.js`: four disabled account forms, unavailable private APIs with no-store headers, isolated demo content, blocked cross-site mutations and safe invalid-callback redirects. Report: `artifacts/configuration-report.txt`.

### Reproduce integration tests

From `frontend`, start the in-memory test transport in terminal 1:

```powershell
node tests/provider-harness.mjs
```

In terminal 2, also in `frontend`:

```powershell
$env:APP_ORIGIN='http://localhost:3003'
$env:NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:54329'
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='local-fixture-publishable-key'
npm.cmd run build
npm.cmd run start -- --port 3003
```

From repository root, in terminal 3:

```powershell
playwright-cli.cmd open http://localhost:3003
playwright-cli.cmd run-code --filename=tests/mvp-browser.js
playwright-cli.cmd run-code --filename=tests/visual-smoke.js
playwright-cli.cmd run-code --filename=tests/motion-smoke.js
```

Restart the test provider before repeating the MVP workflow: fixtures are temporary, and the test deliberately suspends a designer at the end. Stop both servers afterward. Remove the three test environment variables from that terminal (or open a fresh terminal) and rebuild before using real configuration. Never deploy these local test URLs/keys. The test password in source is only for in-memory fixtures.
