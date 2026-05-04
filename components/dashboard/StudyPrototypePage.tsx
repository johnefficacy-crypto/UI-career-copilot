"use client"

import { useMemo, useState } from "react"

type Plan = { id: string; exam_name: string; daily_hours: number | null; study_weeks?: { id: string; title: string; week_number: number; status: string | null }[] }
type Stats = { percentComplete: number; streak: number; totalHours: number; completedWeeks: number; totalWeeks: number } | null
type MockTest = { id: string; exam_name: string; test_name: string | null; scored_marks: number | null; total_marks: number | null; percentile: number | null; attempted_at: string; breakdowns?: { subject: string; scored_marks: number | null }[] }

export function StudyPrototypePage({ primaryPlan, planStats, mockTests }: { primaryPlan: Plan | null; planStats: Stats; mockTests: MockTest[] }) {
  const [showTimer, setShowTimer] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const totalSeconds = 25 * 60

  const weekly = primaryPlan?.study_weeks?.slice(0, 5) ?? []
  // TODO: Wire from database tables when backlog risk/resource tracking schema is finalized.
  const riskTopics = [
    { topic: "Modern History", risk: "high", planned: 3, done: 1 },
    { topic: "Indian Polity", risk: "medium", planned: 3, done: 2 },
    { topic: "Current Affairs", risk: "medium", planned: 4, done: 1 },
    { topic: "Reasoning", risk: "low", planned: 2, done: 2 },
  ] as const
  const resources = [
    { name: "Laxmikanth Notes", progress: 68 },
    { name: "Spectrum Modern India", progress: 44 },
    { name: "Monthly CA Revision", progress: 31 },
  ]

  const completion = useMemo(() => Math.min(100, Math.round((seconds / totalSeconds) * 100)), [seconds])

  return <div className="page"><div className="page-header"><h1>Study</h1><p>Plan smart. Execute daily. Track what improves your results.</p></div>
    <div className="grid-2">
      <section className="card"><h2>✨ AI Study Plan</h2><p className="list-item-sub">{primaryPlan ? `${primaryPlan.exam_name} · ${primaryPlan.daily_hours ?? 2}h/day` : "No active plan yet"}</p><div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${planStats?.percentComplete ?? 0}%` }} /></div><p className="list-item-sub" style={{ marginTop: 8 }}>{planStats?.percentComplete ?? 0}% complete · {planStats?.streak ?? 0} day streak</p></section>
      <section className="card"><h2>🗓 Weekly Plan</h2>{weekly.length === 0 ? <p className="list-item-sub">No weekly breakdown yet.</p> : weekly.map((w) => <div key={w.id} className="list-item"><div><div className="list-item-title">Week {w.week_number}: {w.title}</div></div><span className={`tag ${w.status === "completed" ? "tag-green" : "tag-blue"}`}>{w.status}</span></div>)}</section>
    </div>
    <div className="grid-2" style={{ marginTop: "1.25rem" }}>
      <section className="card"><h2>⏱ Focus Timer</h2><p className="list-item-sub">Use timed focus sessions to stay consistent.</p><button className="btn btn-primary" onClick={() => setShowTimer(true)}>Start focus session</button></section>
      <section className="card"><h2>🔥 Backlog Risk Heatmap</h2>{riskTopics.map((t) => <div key={t.topic} className="list-item"><div><div className="list-item-title">{t.topic}</div><div className="list-item-sub">{t.done}/{t.planned} planned sessions</div></div><span className={`tag ${t.risk === "high" ? "tag-red" : t.risk === "medium" ? "tag-yellow" : "tag-green"}`}>{t.risk}</span></div>)}</section>
    </div>
    <div className="grid-2" style={{ marginTop: "1.25rem" }}>
      <section className="card"><h2>📊 Mock-test Results</h2>{mockTests.length === 0 ? <p className="list-item-sub">No mock tests logged yet.</p> : mockTests.map((m) => <div key={m.id} className="list-item"><div><div className="list-item-title">{m.test_name ?? m.exam_name}</div><div className="list-item-sub">{new Date(m.attempted_at).toLocaleDateString()}</div></div><div style={{ textAlign: "right" }}><div className="list-item-title">{m.scored_marks ?? 0}/{m.total_marks ?? 0}</div><span className="tag tag-purple">P{m.percentile ?? "—"}</span></div></div>)}</section>
      <section className="card"><h2>📚 Resource Progress</h2>{resources.map((r) => <div key={r.name} style={{ marginBottom: 12 }}><div className="list-item-title">{r.name}</div><div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${r.progress}%` }} /></div></div>)}</section>
    </div>
    {showTimer && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowTimer(false)}><div className="card" style={{ width: 380, textAlign: "center" }} onClick={(e) => e.stopPropagation()}><h2 style={{ justifyContent: "center" }}>⏱ Focus Session</h2><div style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 12 }}>{Math.floor(seconds / 60).toString().padStart(2, "0")}:{(seconds % 60).toString().padStart(2, "0")}</div><div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${completion}%` }} /></div><div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}><button className="btn btn-primary" onClick={() => setSeconds((s) => Math.min(totalSeconds, s + 60))}>+1 min</button><button className="btn btn-outline" onClick={() => setSeconds(0)}>Reset</button><button className="btn btn-outline" onClick={() => setShowTimer(false)}>Close</button></div></div></div>}
  </div>
}
