# MVP implementation decisions — November 20, 2026

Deadline: November 25. Continue the reviewed Next.js frontend on Vercel.

The repository contains the November 19 demo plan only. The original full MVP specification has been requested; do not represent inferred features as previously confirmed. The [founder's concept document](https://docs.google.com/document/d/1xxoOxTHH7qgS0Wi2FpdA1zCoCGjvz4q_/edit) was recovered from Drive. Sections 6–7 support structured briefs, central coordination, revisions, private deliverables, editable designer skills/portfolio profiles and AI-assisted matching with human oversight. It is a concept document, not a dated acceptance checklist. Retained project decisions: client/designer/operator roles, operator staffing and approval, Academy Coming Soon, labeled concept content.

Implementation: Supabase PostgreSQL, Auth and private Storage; Next.js server endpoints; server-only OpenAI Responses API for operator brief analysis and designer suggestions. No service-role key in application requests. Database policies and transactional functions enforce permissions even through direct API access. Public registration always creates clients; operators can designate designers and suspend non-operator accounts. Operator promotion requires trusted database administration. No automatic AI approvals or assignments.

Real account routes fail closed when infrastructure is unavailable; demo routes remain explicitly isolated. Production credentials and external service configuration are release prerequisites. No payments or Academy enrollment inferred from the demo.

Validation: execute the migration against embedded PostgreSQL in tests, exercise row policies and workflow transitions under separate identities, test endpoints and browser behavior, then verify live Supabase Auth/Storage and AI when configured.

## Implementation boundaries

- One assigned designer per project; broader multi-person teams require a confirmed scope and membership migration.
- Session refresh occurs in Route Handlers, where cookies can be updated. Server-rendered marketing shells contain no private data; APIs verify the user with Auth and read active roles from PostgreSQL on every request.
- Submitted files are immutable. Revisions create new objects; only the newest submission can be approved. Internal delivery notes are stored as internal comments, never on client-readable delivery rows.
- Up to 20 MB per file, PDF/PNG/JPG/WebP/ZIP. Downloads are attachment links valid for 60 seconds. Supabase's signed upload token lifetime is provider-controlled; registration rechecks current permissions and project version.
- AI sends only the chosen brief and up to 30 available designer skill/bio/language/timezone profiles with candidate identifiers. No email addresses, files or private conversations. Output is plain text, operator-only, and stored as a draft. PostgreSQL reserves at most 10 requests/operator/hour and 100/agency/hour, including failed attempts; provider project budgets are a separate setup step.
- Workspace lists show the latest 200 projects; detail views show the latest 200 messages/deliveries, 100 activity events and 10 AI runs. Team roster cap is 500. These are explicit MVP limits, not full-history pagination.
- Availability is a designer-declared signal, not an automatic staffing restriction. Operators may assign unavailable designers deliberately.
- No background notifications, billing, Academy enrollment, malware scanning or multi-designer project membership has been inferred from the demo. Live deployment is not claimed.
