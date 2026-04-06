/**
 * supabase/functions/deadline-sweep/index.ts
 * Career Copilot — Notification Engine v2
 *
 * Deploy:  supabase functions deploy deadline-sweep
 * Schedule: 8:00 AM IST every day
 *   30 2 * * *   (UTC = 2:30am = 8am IST)
 *
 * What it does:
 *  1. Calls fn_deadline_approaching_sweep() to generate deadline_approaching events
 *  2. Processes all pending alert_events fan-out
 *  3. Marks expired open recruitments as closed
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")             ?? ""
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

function db() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

Deno.serve(async () => {
  const supabase = db()
  const now      = new Date()
  let eventsCreated = 0
  let usersNotified = 0
  let recruitmentsClosed = 0

  // ── 1. Generate deadline_approaching events ──
  const { data: sweepCount } = await supabase.rpc("fn_deadline_approaching_sweep")
  eventsCreated = (sweepCount as number) ?? 0

  // ── 2. Close expired recruitments ──
  const { count: closedCount } = await supabase
    .from("recruitments")
    .update({ status: "closed" })
    .eq("status", "open")
    .lt("apply_end_date", now.toISOString().split("T")[0])
    .select("id", { count: "exact" })
  recruitmentsClosed = closedCount ?? 0

  // ── 3. Fan-out all pending alert events ──
  const { data: pendingEvents } = await supabase
    .from("alert_events")
    .select("id,priority")
    .eq("fanout_status", "pending")
    .order("priority", { ascending: true })
    .limit(100)

  for (const evt of pendingEvents ?? []) {
    try {
      const { data: count } = await supabase.rpc("fn_fanout_alert_event", {
        p_event_id: evt.id,
      })
      usersNotified += (count as number) ?? 0
    } catch {
      // non-fatal
    }
  }

  return new Response(
    JSON.stringify({
      eventsCreated,
      usersNotified,
      recruitmentsClosed,
      processedAt: now.toISOString(),
    }),
    { headers: { "Content-Type": "application/json" } }
  )
})