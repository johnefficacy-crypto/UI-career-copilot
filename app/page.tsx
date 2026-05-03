import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <section className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <aside className="bg-white border border-slate-200 rounded-lg p-4 h-fit">
          <h2 className="text-sm font-semibold text-indigo-700 mb-2">Career Copilot</h2>
          <p className="text-sm text-slate-600 mb-4">Eligibility-first exam operating system.</p>
          <nav className="flex flex-col gap-2" aria-label="Landing navigation">
            <Link href="/today" className="px-3 py-2 rounded border border-slate-200 hover:bg-slate-50 text-sm">Today</Link>
            <Link href="/exams" className="px-3 py-2 rounded border border-slate-200 hover:bg-slate-50 text-sm">Exams</Link>
            <Link href="/study" className="px-3 py-2 rounded border border-slate-200 hover:bg-slate-50 text-sm">Study</Link>
            <Link href="/community" className="px-3 py-2 rounded border border-slate-200 hover:bg-slate-50 text-sm">Community</Link>
            <Link href="/marketplace" className="px-3 py-2 rounded border border-slate-200 hover:bg-slate-50 text-sm">Marketplace</Link>
          </nav>
        </aside>

        <div className="bg-white border border-slate-200 rounded-lg p-8">
          <h1 className="text-3xl font-semibold mb-3">Prepare with confidence</h1>
          <p className="text-slate-600 mb-6">Track official recruitments, get deterministic eligibility outcomes, and plan your study workflow from one place.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/signup" className="px-4 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700">Create account</Link>
            <Link href="/auth/login" className="px-4 py-2 rounded border border-slate-300 text-slate-700 text-sm hover:bg-slate-50">Sign in</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
