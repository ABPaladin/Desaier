# Desaier

Centrally managed creative agency. Next.js on Vercel, Supabase PostgreSQL/Auth/private Storage, and server-side OpenAI assistance. Deadline: **November 25, 2026**.

The reviewed frontend is preserved. Real workspaces now use authenticated endpoints and database-enforced permissions. Demo workflows live separately at `/demo/client`, `/demo/designer` and `/demo/operator`; marketing concept work and team fixtures remain labeled.

## Run

Requires Node.js 22.13+ and npm (validated on Node 24).

```sh
cd frontend
npm ci
# Copy .env.example to .env.local and configure it; see docs/SETUP.md.
npm run dev -- --port 3003
```

Without configuration, marketing and demos work; real accounts show an unavailable state. Production preview: `npm run build` then `npm run start -- --port 3003`.

## Implemented

- Email/password signup, confirmation, login, recovery, logout; HttpOnly cookie sessions.
- Client briefs with structured requirements; persistent project status and due dates.
- Operator staffing, milestones, review, revisions, delivery approval, archive and member access controls.
- Designer skills, portfolio, language, timezone and availability profiles.
- Shared conversations, private team notes and project audit history.
- Private immutable file submissions, with client download access only after operator approval.
- Operator AI brief analysis and designer suggestions; human decisions, bounded usage, no automatic assignments.
- SVG brand elements, richer purple accents, preserved responsive sculpture and reduced-motion support.

## Verification

From `frontend`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

Database tests execute the actual migration in embedded PostgreSQL and exercise RLS with separate identities. Browser checks use the existing Playwright CLI:

```sh
# From repository root, with the production preview on port 3003:
playwright-cli open http://localhost:3003
playwright-cli run-code --filename=tests/visual-smoke.js
playwright-cli run-code --filename=tests/motion-smoke.js
```

For integration checks against the local test provider, see [verification](docs/VERIFICATION.md). The test provider is not application infrastructure.

## Release state

Local implementation and integrated tests are complete for the documented agency workflow. **Hosted backend activation and live-provider verification are still pending**: Supabase project/migration, email configuration, Vercel environment variables, first operator, and OpenAI credentials/model. The founder's concept document was recovered; the original detailed MVP acceptance plan is still needed to reconcile any additional requirements.

Start with the [online launch guide in Romanian](docs/ONLINE_SETUP.md) for exact dashboard pages, environment variables and live acceptance checks. The [developer guide](docs/DEVELOPER_GUIDE.md) covers database access and day-to-day work. See also the [checklist](docs/MILESTONE.md), [architecture and scope](docs/MVP.md), and [setup](docs/SETUP.md). The two previously local commits were pushed to `origin/main` on November 24. Production activation is still unverified.
