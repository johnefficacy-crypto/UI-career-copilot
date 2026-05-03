import Link from "next/link"

export const metadata = { title: "Study Demo — Career Copilot" }

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#e8d5a3]">Demo route</p>
        <h1 className="text-2xl font-semibold mt-2">Study Demo</h1>
        <p className="text-white/70 mt-2">Prototype preview for Study OS flows.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-[#e8d5a3] text-black text-sm">Go to dashboard</Link>
          <Link href="/study" className="px-4 py-2 rounded-lg border border-white/20 text-white/80 text-sm">Open current production page</Link>
        </div>
      </div>
    </main>
  )
}
