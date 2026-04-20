/* NotificationsFeed — full-screen feed with filter bar */

const ALL_NOTIFS = [
  { dot: "danger", title: "SEBI Grade A — 1 day left to apply", org: "SEBI", cat: "Regulatory", ts: "2h ago", tag: "Last day!" },
  { dot: "gold",   title: "UPSC CSE 2026 — Prelims notification dropped", org: "UPSC", cat: "Central", ts: "8h ago", tag: "New opening" },
  { dot: "gold",   title: "RBI Grade B — deadline extended to 28 Oct", org: "RBI",  cat: "Central", ts: "1d ago", tag: "Deadline change" },
  { dot: "muted",  title: "NABARD Grade A — vacancies increased 2,100 → 2,340", org: "NABARD", cat: "Central", ts: "1d ago", tag: "Vacancies updated" },
  { dot: "gold",   title: "IBPS PO — tier II admit card released", org: "IBPS", cat: "Banking", ts: "2d ago", tag: "Admit card" },
  { dot: "muted",  title: "SSC CGL 2026 — corrigendum #2 published", org: "SSC", cat: "Central", ts: "3d ago", tag: "Corrigendum" },
  { dot: "muted",  title: "NABARD Grade A — official answer key uploaded", org: "NABARD", cat: "Central", ts: "4d ago", tag: "Answer key" },
  { dot: "muted",  title: "MPSC State Service — tentative calendar 2026", org: "MPSC", cat: "State PSC", ts: "5d ago", tag: "Calendar" },
];

function NotificationsFeed({ onGoTo }) {
  const [activeTab, setActiveTab] = React.useState("all");
  const tabs = [
    { id: "all", label: "All", count: 28 },
    { id: "matched", label: "Matched for you", count: 12 },
    { id: "tracked", label: "Tracked", count: 4 },
    { id: "archived", label: "Archived" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <AppNav active="notifications" onGoTo={onGoTo} />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 20 }}>
          <Eyebrow>Notifications</Eyebrow>
          <h1 className="cc-serif" style={{ fontSize: 32, margin: "8px 0 6px" }}>Everything that moved.</h1>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
            The system runs every 6 hours. Last checked <span className="cc-mono" style={{ color: "var(--text-body)" }}>12 min ago</span>.
          </div>
        </div>

        {/* filter bar */}
        <div style={{
          display: "flex", gap: 8, padding: "10px 12px",
          background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14,
          marginBottom: 16, alignItems: "center", flexWrap: "wrap"
        }}>
          <Icon name="search" size={14} />
          <input className="cc-input" placeholder="Search recruitments, orgs…"
                 style={{ flex: 1, minWidth: 180, background: "transparent", border: "none", padding: "4px 0", fontSize: 13 }} />
          <Pill tone="gold">Central ×</Pill>
          <Pill tone="gold">OBC ×</Pill>
          <Pill tone="muted">+ Deadline</Pill>
          <Pill tone="muted">+ Min vacancies</Pill>
        </div>

        {/* tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                padding: "10px 14px", fontSize: 13, fontFamily: "var(--font-sans)",
                color: activeTab === t.id ? "var(--text-primary)" : "var(--text-muted)",
                borderBottom: `2px solid ${activeTab === t.id ? "var(--gold)" : "transparent"}`,
                marginBottom: -1, display: "flex", gap: 6, alignItems: "center"
              }}>
              {t.label}
              {t.count != null && <span className="cc-mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ALL_NOTIFS.map((n, i) => (
            <div key={i} style={{
              display: "flex", gap: 12, padding: "14px 16px",
              background: n.dot === "danger" ? "rgba(239,68,68,0.04)" : n.dot === "gold" ? "rgba(232,213,163,0.03)" : "transparent",
              border: `1px solid ${n.dot === "danger" ? "rgba(239,68,68,0.35)" : "var(--border)"}`,
              borderRadius: 14, alignItems: "flex-start",
              cursor: "pointer", transition: "background var(--dur-fast) var(--ease)"
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: 9999, flexShrink: 0, marginTop: 6,
                background: n.dot === "danger" ? "var(--danger)" : n.dot === "gold" ? "var(--gold)" : "rgba(255,255,255,0.20)"
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500, marginBottom: 3 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span>{n.org}</span><span>·</span>
                  <span>{n.cat}</span><span>·</span>
                  <span style={{ color: n.dot === "danger" ? "#f87171" : n.dot === "gold" ? "var(--gold)" : "inherit" }}>{n.tag}</span>
                </div>
              </div>
              <span className="cc-mono" style={{ fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }}>{n.ts}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, padding: 24, textAlign: "center", fontSize: 13, color: "var(--text-muted)", border: "1px dashed var(--border)", borderRadius: 14 }}>
          You're all caught up. The system runs every 6 hours.
        </div>
      </main>
    </div>
  );
}

window.NotificationsFeed = NotificationsFeed;
