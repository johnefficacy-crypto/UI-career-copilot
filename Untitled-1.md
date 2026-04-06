lib/db/notifications.ts:
Conversion of type '{ type: any; }[]' to type '{ type: string; }' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Property 'type' is missing in type '{ type: any; }[]' but required in type '{ type: string; }'.

   * supabase/functions/scheduled-scraper/index.ts :
   import { createClient } from "https://esm.sh/@supabase/supabase-js@2" ERROR : Cannot find module 'https://esm.sh/@supabase/supabase-js@2' or its corresponding type declarations.
async function extractWithClaude(
  text:      string,
  sourceName: string,
  sourceUrl:  string,
  currentYear: number
): Promise<ExtractedRecruitment | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? ""
  if (!apiKey) return null 
  ERROR: Cannot find name 'Deno'.
  Parameter '_req' implicitly has an 'any' type.
  
  at app/admin/scrape/page.tsx:
    {/* Trigger scraper — server action form */}
          <form action={adminTriggerScraper}>
            <button
              type="submit"
              className="cc-btn-primary"
              style={{ width: "auto", padding: "0.625rem 1.25rem" }}
            > ERROR: Type '() => Promise<{ success: boolean; message: string; runId?: string | undefined; itemsNew?: number | undefined; }>' is not assignable to type 'string | ((formData: FormData) => void | Promise<void>) | undefined'.
  Type '() => Promise<{ success: boolean; message: string; runId?: string | undefined; itemsNew?: number | undefined; }>' is not assignable to type '(formData: FormData) => void | Promise<void>'.
    Type 'Promise<{ success: boolean; message: string; runId?: string | undefined; itemsNew?: number | undefined; }>' is not assignable to type 'void | Promise<void>'.
      Type 'Promise<{ success: boolean; message: string; runId?: string | undefined; itemsNew?: number | undefined; }>' is not assignable to type 'Promise<void>'.
        Type '{ success: boolean; message: string; runId?: string | undefined; itemsNew?: number | undefined; }' is not assignable to type 'void'.
      at   <StatTile
            label="Items found (last)"
            value={lastRun?.items_found ?? 0}
            sub={`${lastRun?.items_new ?? 0} new · ${lastRun?.items_duplicate ?? 0} dup`}
          />ERROR:   Property 'items_duplicate' does not exist on type '{ id: string; status: string; items_new: number; items_found: number; started_at: string; }'.

          AT admin/scrape/page.tsx :  <form action={adminTriggerScraper}>
            <button
              type="submit"
              className="cc-btn-primary"
              style={{ width: "auto", padding: "0.625rem 1.25rem" }}
            >ERROR: 

            AT app/admin/page.tsx: 
              {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <a
          href="/admin/recruitments/new"
          className="flex flex-col gap-1 px-5 py-4 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.14] transition-colors cursor-pointer"
        >Do not use an `<a>` element to navigate to `/admin/recruitments/new/`. Use `<Link />` from `next/link` instead. See: https://nextjs.org/docs/messages/no-html-link-for-pages

        AT lib/db/scraping.ts
        export async function getRunById(id: string): Promise<ScrapeRun | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("scrape_runs")
    .select("*")
    .eq("id", id)
    .single()
  return data ?? null
}ERROR: Type '{ error_log: Json; finished_at: string | null; id: string; items_duplicate: number; items_found: number; items_new: number; sources_checked: number; started_at: string; status: string; triggered_by: string; triggered_by_user: string | null; } | null' is not assignable to type 'ScrapeRun | null'.
  Type '{ error_log: Json; finished_at: string | null; id: string; items_duplicate: number; items_found: number; items_new: number; sources_checked: number; started_at: string; status: string; triggered_by: string; triggered_by_user: string | null; }' is not assignable to type 'ScrapeRun'.
    Types of property 'status' are incompatible.
      Type 'string' is not assignable to type 'ScrapeRunStatus'.
      export async function upsertSource(source: Partial<ScrapeSource>): Promise<void> {
  const supabase = await createClient()
  await supabase.from("scrape_sources").upsert(source, { onConflict: "base_url" })
}ERROR: No overload matches this call.
  Overload 1 of 2, '(values: { base_url: string; created_at?: string | undefined; id?: string | undefined; is_active?: boolean | undefined; last_scraped_at?: string | null | undefined; name: string; notification_path?: string | ... 1 more ... | undefined; org_type: string; scrape_interval_hours?: number | undefined; selector_config?: Json | undefined; state?: string | ... 1 more ... | undefined; }, options?: { ...; } | undefined): PostgrestFilterBuilder<...>', gave the following error.
    Argument of type 'Partial<ScrapeSource>' is not assignable to parameter of type '{ base_url: string; created_at?: string | undefined; id?: string | undefined; is_active?: boolean | undefined; last_scraped_at?: string | null | undefined; name: string; notification_path?: string | ... 1 more ... | undefined; org_type: string; scrape_interval_hours?: number | undefined; selector_config?: Json | und...'.
      Types of property 'base_url' are incompatible.
        Type 'string | undefined' is not assignable to type 'string'.
          Type 'undefined' is not assignable to type 'string'.
  Overload 2 of 2, '(values: { base_url: string; created_at?: string | undefined; id?: string | undefined; is_active?: boolean | undefined; last_scraped_at?: string | null | undefined; name: string; notification_path?: string | ... 1 more ... | undefined; org_type: string; scrape_interval_hours?: number | undefined; selector_config?: Json | undefined; state?: string | ... 1 more ... | undefined; }[], options?: { ...; } | undefined): PostgrestFilterBuilder<...>', gave the following error.
    Argument of type 'Partial<ScrapeSource>' is not assignable to parameter of type '{ base_url: string; created_at?: string | undefined; id?: string | undefined; is_active?: boolean | undefined; last_scraped_at?: string | null | undefined; name: string; notification_path?: string | ... 1 more ... | undefined; org_type: string; scrape_interval_hours?: number | undefined; selector_config?: Json | und...'.
      Type 'Partial<ScrapeSource>' is missing the following properties from type '{ base_url: string; created_at?: string | undefined; id?: string | undefined; is_active?: boolean | undefined; last_scraped_at?: string | null | undefined; name: string; notification_path?: string | ... 1 more ... | undefined; org_type: string; scrape_interval_hours?: number | undefined; selector_config?: Json | und...': length, pop, push, concat, and 35 more.