/* AdminOverview — app/admin/page.tsx recreation */

const STATS = [
  { label: "Organizations",       value: 524 },
  { label: "Total recruitments",  value: "1,842" },
  { label: "Open now",            value: 96,   accent: true },
  { label: "Upcoming",            value: 31 },
  { label: "Posts defined",       value: "12,406" },
  { label: "Registered users",    value: "51,290" },
  { label: "Eligible matches",    value: "8,214", accent: true },
  { label: "Pending review",      value: 4,    accent: true },
];

const RUNS = [
  { status: "completed", source: "rbi.org.in/careers",          items: 3,  changed: 0, ts: "12 min ago",  duration: "4.2s" },
  { status: "partial",   source: "sebi.gov.in/careers",         items: 5,  changed: 2, ts: "1h ago",      duration: "11.8s" },
  { status: "failed",    source: "upsc.gov.in/notifications",   items: 0,  changed: 0, ts: "2h ago",      duration: "—", err: "HTTP 504 gateway timeout" },
];

function AdminOverview() {
  return (
    <div style={{ padding: "32px 40px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 className="a-serif" style={{ fontSize: 26, margin: "0 0 4px" }}>Admin overview</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Manage notifications, posts, and eligibility.</p>
      </div>

      <div style={{ padding: "10px 16px", borderRadius: 14, background: "var(--success-bg)", border: "1px solid var(--success-border)", color: "var(--success)", fontSize: 13 }}>
        Eligibility recompute completed — 8,214 matches updated across 51,290 aspirants.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {STATS.map(s => (
          <div key={s.label} className={`a-stat ${s.accent ? "accent" : ""}`}>
            <div className="lbl">{s.label}</div>
            <div className="val">{s.value}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 className="a-serif" style={{ fontSize: 16, margin: 0 }}>Quick actions</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { title: "Add recruitment", desc: "Create a notification with posts, criteria, deadlines", icon: "plus" },
            { title: "Scrape dashboard", desc: "4 items pending review · trigger manual run", icon: "refresh-cw" },
            { title: "Source registry", desc: "Manage scraping sources, inspect URLs, add portals", icon: "folder-tree" },
          ].map((a, i) => (
            <div key={i} className="a-card tight" style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "var(--gold)", background: "var(--gold-faint)", border: "1px solid var(--gold-border)", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center" }}><Icon name={a.icon} size={14} /></span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{a.title}</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{a.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="a-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 className="a-serif" style={{ fontSize: 16, margin: 0 }}>Scraper status</h2>
          <a style={{ fontSize: 12, color: "rgba(232,213,163,0.6)", cursor: "pointer" }}>Full dashboard →</a>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {RUNS.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: 9999, background: r.status === "completed" ? "var(--success)" : r.status === "partial" ? "#f59e0b" : "var(--danger)", flexShrink: 0 }} />
              <span className="a-mono" style={{ fontSize: 12, color: "var(--text-body)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.source}</span>
              <span className="a-mono" style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 90 }}>{r.items} items · {r.changed} changed</span>
              <span className="a-mono" style={{ fontSize: 11, color: "var(--text-dim)", minWidth: 70 }}>{r.duration}</span>
              <span className="a-mono" style={{ fontSize: 11, color: "var(--text-dim)", minWidth: 80, textAlign: "right" }}>{r.ts}</span>
              <Pill tone={r.status === "completed" ? "success" : r.status === "partial" ? "warning" : "danger"}>{r.status}</Pill>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.AdminOverview = AdminOverview;
