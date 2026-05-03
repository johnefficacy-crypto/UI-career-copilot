import Link from "next/link"
import { LandingRecruitmentList } from "@/components/landing/LandingRecruitmentList"
import { getLandingRecruitments } from "@/lib/db/landing"

const landingNav = [
  { href: "/today", label: "Today" },
  { href: "/exams", label: "Exams" },
  { href: "/study", label: "Study OS" },
  { href: "/community", label: "Community" },
  { href: "/marketplace", label: "Mentors" },
]

const pillars = [
  {
    title: "Discover official recruitments",
    body: "Verified notifications from trusted government sources with canonical apply links.",
  },
  {
    title: "Match with deterministic eligibility",
    body: "Know exactly where you qualify, why you qualify, and what profile data is missing.",
  },
  {
    title: "Prepare with a daily execution system",
    body: "Run your preparation with study tasks, focus sessions, mock tracking, and weekly reviews.",
  },
  {
    title: "Act before deadlines",
    body: "Stay on top of applications, reminders, and next actions from one mission-control dashboard.",
  },
]

export default async function Home() {
  const recruitments = await getLandingRecruitments()

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-6 py-10 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Career Copilot</p>
          <h2 className="mt-2 text-lg font-semibold leading-tight">Exam preparation operating system</h2>
          <p className="mt-2 text-sm text-slate-600">
            Eligibility-first workflow for serious aspirants preparing for Indian government jobs.
          </p>
          <nav className="mt-5 flex flex-col gap-2" aria-label="Landing navigation">
            {landingNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-900">
            Trusted by aspirants who need control over eligibility, deadlines, and daily preparation decisions.
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Official-source-first platform</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
              Stop juggling Telegram, PDFs, and spreadsheets.
            </h1>
            <p className="mt-4 max-w-3xl text-base text-slate-600">
              Career Copilot gives you one trusted system to discover recruitments, check eligibility, plan preparation,
              and track execution from notification to application.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/auth/signup"
                className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                Start free
              </Link>
              <Link
                href="/auth/login"
                className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Sign in
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            {pillars.map((pillar) => (
              <article key={pillar.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">{pillar.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{pillar.body}</p>
              </article>
            ))}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Latest verified recruitments</h2>
              <Link href="/exams" className="text-sm font-medium text-indigo-700 hover:text-indigo-800">
                View all exams →
              </Link>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              User-facing listings prioritize official notifications and application links.
            </p>
            <div className="mt-5">
              <LandingRecruitmentList items={recruitments} />
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
