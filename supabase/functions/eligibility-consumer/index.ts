/**
 * supabase/functions/eligibility-consumer/index.ts
 *
 * Deno Edge Function — consumes eligibility_recompute_queue.
 *
 * Phase 3B follow-up rewrite (P0, April 19 code review fix):
 *   Previously this function shipped its OWN minimal rule engine (age + edu
 *   level only). That silently diverged from `lib/eligibility/engine.ts`
 *   whenever we added rules (relaxation caps, ex-serviceman, domicile,
 *   appearing-candidates), so users were flagged eligible by one path and
 *   ineligible by the other. The reviewer correctly called this a split-brain.
 *
 *   The fix: this function now just drains the queue and POSTs each user to
 *   `/api/eligibility/recompute`, which runs the authoritative engine inside
 *   the Next.js runtime with a service-role client. One rule engine. One
 *   source of truth.
 *
 * Deploy:
 *   supabase functions deploy eligibility-consumer
 *
 * Trigger (pg_cron, every 5 minutes):
 *   select net.http_post(
 *     url := 'https://<project>.supabase.co/functions/v1/eligibility-consumer',
 *     headers := '{"Authorization":"Bearer <service_role_key>"}',
 *     body := '{}'
 *   );
 *
 * Required env vars (set via `supabase secrets set`):
 *   SUPABASE_URL                    — auto-provided
 *   SUPABASE_SERVICE_ROLE_KEY       — auto-provided
 *   APP_BASE_URL                    — e.g. https://career-copilot.app
 *                                     (no trailing slash)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BATCH_SIZE   = 20
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? ""

Deno.serve(async (_req: Request) => {
  if (!APP_BASE_URL) {
    return Response.json(
      { error: "APP_BASE_URL env var not set on Edge Function" },
      { status: 500 },
    )
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  // ── 1. Claim a batch ──────────────────────────────────────────────────
  const { data: batch, error: fetchErr } = await supabase
    .from("eligibility_recompute_queue")
    .select("id, user_id, recruitment_id, reason")
    .eq("status", "pending")
    .order("queued_at", { ascending: true })
    .limit(BATCH_SIZE)

  if (fetchErr) {
    return Response.json({ error: fetchErr.message }, { status: 500 })
  }
  if (!batch?.length) {
    return Response.json({ processed: 0, message: "queue empty" })
  }

  const ids = batch.map((r: { id: string }) => r.id)

  await supabase
    .from("eligibility_recompute_queue")
    .update({ status: "processing" })
    .in("id", ids)

  // ── 2. Dedupe by user — one POST per distinct user per batch ──────────
  // The authoritative engine recomputes ALL posts for the user anyway, so
  // calling it once per (user, recruitment) is wasteful. Group by user and
  // mark every queue row for that user as completed/failed together.
  const byUser = new Map<string, { id: string; recruitment_id: string }[]>()
  for (const item of batch) {
    const list = byUser.get(item.user_id) ?? []
    list.push({ id: item.id, recruitment_id: item.recruitment_id })
    byUser.set(item.user_id, list)
  }

  let succeeded = 0
  let failed    = 0
  const errors: string[] = []

  for (const [userId, rows] of byUser) {
    const rowIds = rows.map((r) => r.id)
    try {
      const resp = await fetch(`${APP_BASE_URL}/api/eligibility/recompute`, {
        method: "POST",
        headers: {
          "content-type":  "application/json",
          "authorization": `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ user_id: userId }),
      })

      if (!resp.ok) {
        const detail = await resp.text().catch(() => "")
        throw new Error(`HTTP ${resp.status}: ${detail.slice(0, 300)}`)
      }

      await supabase
        .from("eligibility_recompute_queue")
        .update({ status: "completed", processed_at: new Date().toISOString() })
        .in("id", rowIds)

      succeeded += rows.length
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[eligibility-consumer] user=${userId} failed: ${msg}`)
      errors.push(`user ${userId}: ${msg}`)

      await supabase
        .from("eligibility_recompute_queue")
        .update({ status: "failed" })
        .in("id", rowIds)

      failed += rows.length
    }
  }

  return Response.json({
    processed: batch.length,
    users:     byUser.size,
    succeeded,
    failed,
    errors:    errors.length ? errors : undefined,
  })
})
