# PeopleLogic

AI-native, team-level workforce intelligence for retention decisions. Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Auth, Postgres, RLS) · Gemini.

## Setup
1. `npm install`
2. Create a Supabase project; run `supabase/migrations/0001_core_schema.sql` (SQL editor or `supabase db push`).
3. Copy `.env.example` to `.env.local` and fill in values (see below). Never commit `.env.local`.
4. In Supabase Auth settings, set the Site URL / redirect URL to `NEXT_PUBLIC_APP_URL` (+ `/auth/callback`).
5. `npm run dev`

## Environment variables
| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Used solely for credit reservation/refund functions |
| `GEMINI_API_KEY` (`GEMINI_MODEL` optional) | Server-side AI |
| `PROFESSIONAL_PAYMENT_LINK`, `ENTERPRISE_PAYMENT_LINK` | External checkout links (https) opened via `/api/billing/checkout` |
| `NEXT_PUBLIC_APP_URL` | Absolute app URL (auth redirects, invite links) |
| `PLAN_ENTITLEMENTS`, `CREDIT_COSTS` | Optional JSON; nothing is invented if unset |

## Scripts
`npm run dev | build | lint | typecheck | test`

## Key design points
- **Team-level only.** No individual risk scores. Teams under the minimum group size (default 8, floor 5, admin-configurable) are suppressed from team detail, reports and the AI context.
- **Indicators are descriptive.** No predictive model is trained or validated; results are labelled observed indicators / potential risk signals / hypotheses.
- **RLS on all tenant tables**; dept managers are scoped to assigned teams; survey responses readable only by HR/analytics roles. Credit functions are service-role only.
- **AI**: Gemini via server code, Zod-validated JSON, aggregated context only, atomic credit reservation with refund on failure. Orgs with no `credit_balances` row are unmetered (usage logged only).
- **Credits**: 1 credit per AI operation unless `CREDIT_COSTS` overrides. To meter an org: `insert into credit_balances (org_id, balance, low_threshold) values (...)`.

## Recording subscription status
Payment is via external links; returning from checkout grants nothing. `/api/billing/webhook` returns 501 until the provider's signature format is confirmed. After verifying a payment manually, record it with the service role / SQL editor:
`insert into subscriptions (org_id, plan, status, verified_at) values ('<org>', 'professional', 'active', now()) on conflict (org_id) do update set plan=excluded.plan, status='active', verified_at=now();`

## Not implemented / needs external access
- BambooHR, Workday, Rippling, survey tools, Jira, Asana connectors (shown as "Coming soon").
- Payment webhook verification; invitation emails (links are shared manually).
- Scheduled retention purge (button in Settings; schedule `apply_retention` with pg_cron).
- Compensation, promotion and CV-based analyses.
- Tests against a live Supabase instance (RLS is checked statically; run a real-database test before launch). No compliance certifications are claimed.
