import { requireUser } from "@/utils/supabase/requireUser"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { ensureProfileRow, saveProfile } from "./actions"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await requireUser()

  // Ensure blank profile row ALWAYS exists (prevents broken flow)
  const cookieStore = await cookies()
  const supabase = await createClient()
  await ensureProfileRow(user.id, supabase)

  const { error: errorParam } = await searchParams
  const errorMessage = errorParam

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#020617] to-black text-white">
      
      <form
        action={saveProfile}
        className="w-full max-w-lg p-10 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl space-y-6"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to Career Copilot 🚀
          </h1>
          <p className="text-gray-300">
            Let’s create your aspirant profile.
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        <input
          name="full_name"
          placeholder="Full Name"
          required
          className="w-full p-3 rounded-lg bg-black/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <select
          name="career_stage"
          className="w-full p-3 rounded-lg bg-black/40 border border-white/10"
        >
          <option value="student">Student</option>
          <option value="graduate">Graduate</option>
          <option value="working">Working Professional</option>
        </select>

        <select
          name="target_type"
          className="w-full p-3 rounded-lg bg-black/40 border border-white/10"
        >
          <option value="govt">Government Jobs</option>
          <option value="both">Govt + Private</option>
        </select>

        <input
          name="target_exam"
          placeholder="Dream Exam (optional)"
          className="w-full p-3 rounded-lg bg-black/40 border border-white/10"
        />

        <input
          name="graduation_year"
          placeholder="Graduation Year"
          className="w-full p-3 rounded-lg bg-black/40 border border-white/10"
        />

        <button className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition font-semibold">
          Continue →
        </button>
      </form>
    </div>
  )
}