# Career Copilot — Operations Runbook
_Last updated: 2026-04-29_

This runbook covers day-to-day ops: applying migrations, deploying edge functions, refreshing the materialized view, triggering the scraper, and diagnosing common errors.

---

## 1. Applying migrations

Migrations live in `supabase/migrations/`. Apply them in numeric order via the Supabase SQL Editor or the CLI.

### Via Supabase SQL Editor (recommended for production)
1. Open **Supabase Dashboard → SQL Editor**
2. Paste the contents of each migration file
3. Run in the order shown below

### Via CLI (local dev)
```bash
supabase db push
```

### Migration dependency order for 027–030

These four migrations have a strict dependency chain. Do not apply out of order.

```
027_user_events_and_form_submissions.sql   ← no dependencies
028_user_recruitment_state.sql             ← depends on 027 (user_events table)
029_exam_summary_support.sql               ← depends on 028 (user_recruitment_state view)
030_embeddings.sql                         ← independent; requires pgvector extension
```

After applying 027 and 028, refresh the materialized view:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_recruitment_state;
```

---

## 2. Refreshing the materialized view

`user_recruitment_state` is a materialized view. It does **not** update automatically. Refresh it:

### Manual refresh (Supabase SQL Editor)
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_recruitment_state;
```
The `CONCURRENTLY` flag allows reads during refresh (requires the unique index `user_recruitment_state_uidx` to exist — created by migration 028).

### Automatic refresh via pg_cron
```sql
SELECT cron.schedule(
  'refresh-user-recruitment-state',
  '*/30 * * * *',           -- every 30 minutes
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_recruitment_state;$$
);
```

### Triggered by eligibility consumer
The eligibility consumer Edge Function should call the refresh API after draining a batch. Current status: manual only.

---

## 3. Triggering the scraper manually

The scraper runs automatically every 6 hours via pg_cron. To trigger it manually:

### Via Supabase Dashboard
**Edge Functions → scheduled-scraper → Invoke**

### Via curl (service role key required)
```bash
curl -X POST \
  "$SUPABASE_URL/functions/v1/scheduled-scraper" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

> Both `Authorization` and `apikey` headers are required. A 401 means one of them is missing or wrong.

---

## 4. Deploying Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Deploy one function
supabase functions deploy scheduled-scraper
supabase functions deploy eligibility-consumer
supabase functions deploy email-dispatcher
supabase functions deploy deadline-sweep
```

### Environment variables
Set in Supabase Dashboard → **Project Settings → Edge Functions → Secrets**:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (write access) |
| `SUPABASE_ANON_KEY` | Anon key (for triggering other functions) |
| `RESEND_API_KEY` | Email provider (Phase 3C, not yet wired) |

---

## 5. Common errors and fixes

### `ERROR: 42P01: relation "public.user_events" does not exist`
**Cause**: Migration 028 was applied before 027.
**Fix**: Apply `027_user_events_and_form_submissions.sql` first, then re-run 028.

### `ERROR: 42P01: relation "public.user_recruitment_state" does not exist`
**Cause**: Migration 029 was applied before 028, or 028 failed silently.
**Fix**: Ensure 028 ran successfully. The materialized view must exist before the views in 029 can reference it.

### `ERROR: 42P01: relation "public.admin_audit_log" does not exist`
**Cause**: The table is named `admin_audit_logs` (with `s`). Migration 023 had a typo in the original draft.
**Fix**: Use the corrected `023_fix_service_role_policies.sql` which references `admin_audit_logs`.

### `ERROR: column "created_at" does not exist` (in notification_alerts query)
**Cause**: `notification_alerts` uses `sent_at`, not `created_at`.
**Fix**: Replace `created_at` with `sent_at` in any query against `notification_alerts`.

### `ERROR: 42P01: relation "public.exams" does not exist`
**Cause**: There is no `public.exams` table. The canonical table is `public.recruitments`.
**Fix**: See `docs/database-domain-model.md`. Replace `public.exams` references with `public.recruitments`. Use `recruitment_id` as the foreign key.

### Mission-control dashboard shows empty feed
**Causes and checks** (in order):
1. `user_recruitment_state` mat view hasn't been refreshed yet → run `REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_recruitment_state;`
2. `user_exam_summary` view (migration 029) not applied → apply migration 029
3. Eligibility engine hasn't run for this user → trigger via `POST /api/eligibility/recompute`
4. The user has no eligible posts in the engine's verdict → expected; the feed will show not-eligible rows
5. `lib/db/mission-control.ts` querying wrong columns → must use `user_exam_summary` columns (`has_any_eligible_post`, `has_conditional_result`, `fail_reasons`, `is_tracked`, `clicked_apply`)

### Eligibility consumer 401 / not draining the queue
**Cause**: Edge Function env vars missing or wrong service role key.
**Fix**: Check Supabase Edge Function secrets. Both `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` must be set.

### Scraper runs but no recruitments appear
**Checks**:
1. `scrape_queue` has rows — check in SQL Editor: `SELECT COUNT(*) FROM scrape_queue WHERE status = 'pending';`
2. Admin approval pending — go to `/admin/scraper` to approve queue items
3. `promoteToRecruitments()` failing — check Edge Function logs
4. RLS blocking reads — verify policies on `recruitments` allow authenticated users to SELECT

---

## 6. Eligibility recompute

Trigger for a specific user (e.g. after profile update):
```bash
curl -X POST \
  "$NEXT_PUBLIC_SITE_URL/api/eligibility/recompute" \
  -H "Cookie: <session cookie>" \
  -H "Content-Type: application/json" \
  -d '{"userId": "<user_id>"}'
```

Or via Server Action: `runEligibilityForUser(userId)` in `lib/eligibility/runner.ts`.

After recompute, refresh the mat view to update the mission-control dashboard:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_recruitment_state;
```

---

## 7. Database schema key facts

| Table / View | Purpose | Notes |
|---|---|---|
| `public.recruitments` | Canonical exam/recruitment entity | Use `recruitment_id` for FKs |
| `public.eligibility_results` | Per-user per-post eligibility cache | Refreshed by engine |
| `public.user_events` | Behavioural telemetry | Migration 027 |
| `public.user_recruitment_state` | Materialized view: eligibility + tracking | Migration 028; refresh manually |
| `public.user_exam_summary` | View: user_recruitment_state + exam_summary | Migration 029; used by API + dashboard |
| `public.notification_alerts` | Per-user alert rows | Uses `sent_at` not `created_at` |
| `public.admin_audit_logs` | Admin action log (plural name) | Append-only |
| `public.tracked_recruitments` | User watchlist | Columns: user_id, recruitment_id only |

---

## 8. Notification email rollout checklist

Before enabling emails for users:

- [ ] Apply migration 014 (`notification_preferences` table)
- [ ] Confirm `email_enabled` defaults to `false` (DPDP compliance)
- [ ] Set `RESEND_API_KEY` in Edge Function secrets
- [ ] Wire email-dispatcher Edge Function to read from `v_notification_feed`
- [ ] Test `buildSubject` / `buildBody` with unit tests: `npm test -- --run`
- [ ] Verify `app/dashboard/notifications/preferences/page.tsx` is accessible
- [ ] Enable a pg_cron job to fire email-dispatcher daily at 8am IST:
  ```sql
  SELECT cron.schedule(
    'email-digest-daily',
    '30 2 * * *',   -- 08:00 IST = 02:30 UTC
    $$SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/email-dispatcher',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'apikey', current_setting('app.anon_key')
      )
    );$$
  );
  ```
