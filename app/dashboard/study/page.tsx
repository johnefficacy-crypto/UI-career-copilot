import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getUserPlans, getPlanStats, getStudyLogs } from "@/lib/db/study-planner"

type BacklogRiskItem = { subject: string; pendingTasks: number; risk: "low" | "medium" | "high" }
type MockResult = { id: string; title: string; score: number; maxScore: number; attemptedOn: string }
type ResourceProgress = { id: string; title: string; progress: number; kind: "video" | "book" | "practice" }

function riskClass(risk: BacklogRiskItem["risk"]) {
  if (risk === "high") return "risk-high"
  if (risk === "medium") return "risk-medium"
  return "risk-low"
}

export const metadata = { title: "Study — Career Copilot" }

export default async function StudyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const plans = await getUserPlans(user.id)
  const activePlan = plans[0] ?? null
  const stats = activePlan ? await getPlanStats(activePlan.id, user.id) : null
  const logs = activePlan ? await getStudyLogs(user.id, activePlan.id, 7) : []

  const { data: studyTasks } = await supabase
    .from("study_tasks")
    .select("id,title,status,subject,task_type")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30)

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single()

  const backlogRisk: BacklogRiskItem[] = studyTasks && studyTasks.length > 0
    ? Object.entries(studyTasks.reduce<Record<string, number>>((acc, task) => {
        const key = (task.subject ?? task.task_type ?? "General").toString()
        if (task.status !== "completed") acc[key] = (acc[key] ?? 0) + 1
        return acc
      }, {})).map(([subject, pendingTasks]) => ({
        subject,
        pendingTasks,
        risk: pendingTasks >= 7 ? "high" : pendingTasks >= 4 ? "medium" : "low",
      }))
    : [
      { subject: "General Aptitude", pendingTasks: 0, risk: "low" },
      { subject: "Reasoning", pendingTasks: 0, risk: "low" },
      { subject: "Current Affairs", pendingTasks: 0, risk: "low" },
    ]

  // TEMP placeholders until dedicated datasets are available.
  const mockResults: MockResult[] = [{ id: "temp-1", title: "Weekly Mock", score: 0, maxScore: 100, attemptedOn: "Not attempted" }]
  const resourceProgress: ResourceProgress[] = [{ id: "temp-r1", title: "Resource analytics coming soon", progress: 0, kind: "video" }]

  const tierClass = profile?.plan_id === "elite" ? "tier-elite" : profile?.plan_id === "pro" ? "tier-pro" : "tier-free"

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="text-sm text-gray-500">Study OS</p>
          <h1 className="text-3xl font-semibold text-gray-900">Study</h1>
          <p className="text-sm text-gray-600 mt-1">Focus sessions, weekly momentum, and deterministic progress tracking.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/study-plan/new" className="btn btn-primary">Generate AI plan</Link>
          <Link href="/dashboard/study-plan/focus" className="btn btn-outline">Open focus timer</Link>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">AI Study Plan</h2>
            <span className={`tier-badge ${tierClass}`}>{(profile?.plan_id ?? "free").toUpperCase()}</span>
          </div>
          {activePlan ? (
            <>
              <p className="text-sm text-gray-700">{activePlan.exam_name}</p>
              <p className="text-xs text-gray-500 mt-1">{activePlan.weekly_days} days/week · {activePlan.daily_hours}h/day · {activePlan.current_level}</p>
              <div className="progress-bar-track mt-4"><div className="progress-bar-fill" style={{ width: `${stats?.percentComplete ?? 0}%` }} /></div>
              <p className="text-xs text-gray-600 mt-2">{stats?.percentComplete ?? 0}% completed</p>
              <Link className="btn btn-outline mt-4" href={`/dashboard/study-plan/${activePlan.id}`}>View full weekly plan</Link>
            </>
          ) : <p className="text-sm text-gray-600">No active plan yet. Generate one to get started.</p>}
        </section>

        <section className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Weekly plan</h2>
          {logs.length === 0 ? <p className="text-sm text-gray-600">No study logs in the last 7 entries.</p> : logs.map((log) => (
            <div key={log.id} className="list-item">
              <p className="list-item-title">{log.hours_studied}h studied</p>
              <p className="list-item-sub">{log.logged_date} · {(log.topics_covered ?? []).join(", ") || "No topics tagged"}</p>
            </div>
          ))}
          <Link href="/dashboard/study-plan/weekly-review" className="btn btn-outline mt-4">Weekly review</Link>
        </section>
      </div>

      <div className="grid-3 mt-4">
        <section className="card"><h3 className="text-base font-semibold mb-3">Backlog risk heatmap</h3>{backlogRisk.map((item) => <div key={item.subject} className="truth-panel-item mb-2"><span className="text-sm text-gray-700">{item.subject}</span><span className={`text-sm font-semibold ${riskClass(item.risk)}`}>{item.pendingTasks} pending</span></div>)}</section>
        <section className="card"><h3 className="text-base font-semibold mb-3">Mock-test results</h3>{mockResults.map((item) => <div key={item.id} className="list-item"><p className="list-item-title">{item.title}</p><p className="list-item-sub">Score: {item.score}/{item.maxScore} · {item.attemptedOn}</p></div>)}</section>
        <section className="card"><h3 className="text-base font-semibold mb-3">Resource progress</h3>{resourceProgress.map((item) => <div key={item.id} className="mb-3"><div className="flex items-center justify-between text-sm mb-1"><span>{item.title}</span><span>{item.progress}%</span></div><div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${item.progress}%` }} /></div></div>)}</section>
      </div>
    </div>
  )
}
