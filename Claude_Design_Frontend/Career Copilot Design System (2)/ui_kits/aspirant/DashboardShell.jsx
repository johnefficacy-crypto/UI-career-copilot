/* DashboardShell — command center */

const EXAM_TARGETS = [
  { org: "RBI",  code: "Grade B", meta: "Central · 2026",
    title: "RBI Grade B — Officer (General)", sub: "Reserve Bank of India",
    deadline: "14 Oct", notified: "12 Aug", days: 14, pct: 66, status: { tone: "warning", label: "Closing soon" } },
  { org: "SEBI", code: "Grade A", meta: "Regulatory · 2026",
    title: "SEBI Grade A — Officer (General)", sub: "Securities & Exchange Board of India",
    deadline: "21 Oct", notified: "01 Sep", days: 21, pct: 45, status: { tone: "warning", label: "Closing soon" } },
];

const ELIGIBLE = [
  { org: "NABARD", title: "NABARD Grade A Assistant Manager", deadline: "12 Nov", tags: ["Central", "OBC", "PG"] },
  { org: "SSC",    title: "SSC CGL 2026 Tier I",              deadline: "04 Nov", tags: ["Central", "Graduate"] },
  { org: "IRDAI",  title: "IRDAI Assistant Manager",          deadline: "28 Oct", tags: ["Regulatory", "PG"] },
];

const NOTIFS = [
  { dot: "danger",  title: "SEBI Grade A — 1 day left to apply", meta: "SEBI · Regulatory · Last day!", ts: "2h ago" },
  { dot: "gold",    title: "UPSC CSE 2026 — Prelims notification dropped", meta: "UPSC · Central · New", ts: "8h ago" },
  { dot: "muted",   title: "NABARD Grade A — vacancies increased 2100 → 2340", meta: "NABARD · Updated", ts: "1d ago" },
];

function ExamTargetCard({ ex }) {
  return (
    <div className="cc-row-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>{ex.meta}</div>
          <h3 className="cc-serif-h3" style={{ fontSize: 16, margin: "0 0 2px" }}>{ex.title}</h3>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{ex.sub}</div>
        </div>
        <Pill tone={ex.status.tone}>{ex.status.label}</Pill>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
        Notified: <span style={{ color: "var(--text-body)" }}>{ex.notified}</span> &nbsp; Deadline: <span style={{ color: "var(--text-body)" }}>{ex.deadline}</span>
      </div>
      <ProgressBar pct={ex.pct} color="var(--warning)" />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11 }}>
        <span className="cc-mono" style={{ color: "var(--text-muted)" }}>Application progress</span>
        <span className="cc-mono" style={{ color: "#fcd34d" }}>{ex.days}d left</span>
      </div>
    </div>
  );
}

function DashboardShell({ onGoTo }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <AppNav active="dashboard" onGoTo={onGoTo} />
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        {/* greeting */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="cc-serif" style={{ fontSize: 28, margin: 0 }}>Good morning, Priya.</h1>
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            You have <span style={{ color: "var(--gold)" }}>2 recruitments closing this month</span> and 7 new matches since yesterday.
          </div>
        </div>

        {/* stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatTile label="Exam targets"      value="04" sub="tracked" />
          <StatTile label="Eligible matches"  value="12" sub="across open recruitments" accent />
          <StatTile label="Attempts used"     value="02" sub="across exams" />
          <StatTile label="Current streak"    value="14" sub="days" />
        </div>

        {/* grid — main + sidebar */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
          {/* main column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Eyebrow>Exam targets</Eyebrow>
                <a style={{ fontSize: 12, color: "var(--gold)", cursor: "pointer" }}>Manage targets →</a>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {EXAM_TARGETS.map((ex, i) => <ExamTargetCard key={i} ex={ex} />)}
              </div>
            </Card>

            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Eyebrow>Matched for you</Eyebrow>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }} className="cc-mono">based on your profile</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ELIGIBLE.map((r, i) => (
                  <div key={i} className="cc-row-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>{r.title}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                        {r.tags.map((t, j) => (<React.Fragment key={j}>{j > 0 && <span>·</span>}<span>{t}</span></React.Fragment>))}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="cc-mono" style={{ fontSize: 12, color: "var(--text-body)" }}>by {r.deadline}</div>
                      <Pill tone="gold" icon="star">Track</Pill>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Eyebrow>Notifications</Eyebrow>
                <a onClick={() => onGoTo("notifications")} style={{ fontSize: 12, color: "var(--gold)", cursor: "pointer" }}>All →</a>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {NOTIFS.map((n, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: 9999, flexShrink: 0, marginTop: 6,
                      background: n.dot === "danger" ? "var(--danger)" : n.dot === "gold" ? "var(--gold)" : "rgba(255,255,255,0.20)"
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.4 }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, display: "flex", justifyContent: "space-between" }}>
                        <span>{n.meta}</span><span>{n.ts}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Eyebrow>Study plan · week 05/24</Eyebrow>
                <span className="cc-mono" style={{ fontSize: 11, color: "var(--gold)" }}>66%</span>
              </div>
              <div style={{ fontSize: 14, color: "var(--text-primary)", marginBottom: 4, fontWeight: 500 }}>Quant — Data Interpretation</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>3 of 5 sessions logged this week</div>
              <ProgressBar pct={66} />
              <Button variant="ghost" size="sm" style={{ marginTop: 14, width: "100%", justifyContent: "center" }} iconLeft="plus">Log session</Button>
            </Card>

            <Card>
              <Eyebrow style={{ marginBottom: 12 }}>Your profile</Eyebrow>
              <div style={{ fontSize: 13, color: "var(--text-body)", lineHeight: 1.7 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Age</span><span>26</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Category</span><span>OBC</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Education</span><span>M.Sc Economics</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>State</span><span>Maharashtra</span></div>
              </div>
              <Button variant="ghost" size="sm" style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>Update profile</Button>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

window.DashboardShell = DashboardShell;
