# Desaier frontend demo
November 19, 2026 founder-review milestone. Centrally managed creative agency; Academy Coming Soon.

## Run
Requires Node.js 20.9+ and npm.

```sh
cd frontend
npm ci
npm run dev
```
Open http://localhost:3000. For production preview: `npm run build` then `npm run start -- --port 3002`.

## Checks
From frontend: `npm run lint`, `npm run typecheck`, `npm run build`.
With the production preview running on port 3002, run from the repository root:

```sh
playwright-cli open http://localhost:3002
playwright-cli run-code --filename=tests/visual-smoke.js
```
Playwright CLI and its official skill are installed. Fresh machines can follow https://github.com/microsoft/playwright-cli (`npm install -g @playwright/cli@latest`, then `playwright-cli install --skills`).

## Included
Responsive homepage, services, concept portfolio and illustrative team profiles, Academy Coming Soon, login/register UI, and client/designer/operator previews. Operator assignment and approval, designer submission, client brief submission, portfolio expansion and mobile navigation are interactive.

All account/project actions are local demonstrations. No authentication, backend, file delivery or cross-role persistence is implemented. Use fictional form details. Portfolio and team content are labeled examples, awaiting founder-provided assets.

## Structure
- `frontend/src/app`: routes and shared styles/layout
- `frontend/src/components/site.tsx`: navigation, footer and marketing components
- `frontend/src/components/workspace.tsx`: isolated demo interactions
- `frontend/src/components/ui`: shadcn/ui primitives
- `frontend/src/lib/demo.ts`: marketing fixtures for future API replacement
- `docs`: design, milestone and verification notes
- `tests/visual-smoke.js`: Playwright CLI browser checks
- `artifacts`: desktop/mobile screenshots and execution transcript

## Status
Lint, TypeScript and production build passed November 17. Production Chrome checks passed across 9 routes at 1440px and 390px, with no horizontal overflow or page errors. Core interactions and reduced motion passed. Screenshots reviewed for homepage and dashboard layout. Other browser engines and physical devices have not been tested. No deployment was requested or performed.

Tooling: Next.js, TypeScript, Tailwind, shadcn/ui and official Playwright CLI. Context7 was absent and omitted; CSS handles motion without GSAP. MITP informed structural progression: https://mitp.md/ro/pagina-acasa/.
