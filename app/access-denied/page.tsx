import Link from "next/link"

export const metadata = { title: "Access denied — Career Copilot" }

export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen bg-[#0c0c0c] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-red-300/80 mb-3">Access denied</p>
        <h1 className="text-2xl font-semibold mb-3">You don&apos;t have permission to view this area.</h1>
        <p className="text-white/60 text-sm mb-6">
          If you believe this is a mistake, contact a super admin with the section you tried to access.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-[#e8d5a3] text-black text-sm font-medium">
            Back to dashboard
          </Link>
          <Link href="/" className="px-4 py-2 rounded-lg border border-white/20 text-white/80 text-sm">
            Go to home
          </Link>
        </div>
      </div>
    </main>
  )
}
