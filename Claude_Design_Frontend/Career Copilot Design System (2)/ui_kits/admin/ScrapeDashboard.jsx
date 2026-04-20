/* ScrapeDashboard — scrape runs + review queue */

const RUNS_FULL = [
  { status: "completed", src: "rbi.org.in/careers",          new: 3, changed: 0, ts: "12m",  dur: "4.2s" },
  { status: "partial",   src: "sebi.gov.in/careers",         new: 5, changed: 2, ts: "1h",   dur: "11.8s", note: "2 items missing deadline" },
  { status: "failed",    src: "upsc.gov.in/notifications",   new: 0, changed: 0, ts: "2h",   dur: "—",     note: "HTTP 504 gateway timeout" },
  { status: "completed", src: "ibps.in/home/current-openings",new:1, changed: 1, ts: "6h",   dur: "2.1s" },
  { status: "completed", src: "nabard.org/careers",          new: 0, changed: 0, ts: "6h",   dur: "3.4s" },
  { status: "completed", src: "ssc.nic.in/Portal/Notifications",new:2,changed:0, ts: "12h",  dur: "8.7s" },
];

const REVIEW = [
  { src: "rbi.org.in/careers/notif-2026-q4.pdf",  title: "RBI Grade B Officer (General) — Q4 2026",  ts: "12m ago", confidence: 0.91 },
  { src: "sebi.gov.in/careers/ga-2026",           title: "SEBI Grade A 2026 — General, Legal, IT",   ts: "1h ago",  confidence: 0.82 },
  { src: "ibps.in/home/current-openings/po-xiv",  title: "IBPS PO XIV — 4,135 vacancies",            ts: "6h ago",  confidence: 0.94 },
  { src: "nabard.org/careers/ga-am-2026.pdf",     title: "NABARD Grade A Asst. Manager — draft v2",  ts: "8h ago",  confidence: 0.76 },
];

function ScrapeDashboard() {
  return (
    <div style={{ padding: "32px 40px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className="a-serif" style={{ fontSize: 26, margin: "0 0 4px" }}>Scrape dashboard</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>System runs every 6 hours · last full sweep <span className="a-mono" style={{ color: "var(--text-body)" }}>12 min ago</span></p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" iconLeft="file-text" size="sm">Logs</Button>
          <Button iconLeft="play" size="sm">Trigger manual run</Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <div className="a-stat"><div className="lbl">Sources</div><div className="val">342</div></div>
        <div className="a-stat accent"><div className="lbl">Pending review</div><div className="val">4</div></div>
        <div className="a-stat"><div className="lbl">Runs · 24h</div><div className="val">156</div></div>
        <div className="a-stat"><div className="lbl">Fail rate · 24h</div><div className="val">2.4%</div></div>
      </div>

      {/* pending review queue */}
      <div className="a-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 className="a-serif" style={{ fontSize: 16, margin: 0 }}>Pending review</h2>
          <span className="a-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>4 items · sorted by confidence</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {REVIEW.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: 9999, background: r.confidence > 0.9 ? "var(--success)" : r.confidence > 0.8 ? "#fcd34d" : "#f59e0b", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, marginBottom: 2 }}>{r.title}</div>
                <div className="a-mono" style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.src}</div>
              </div>
              <span className="a-mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>conf {r.confidence.toFixed(2)}</span>
              <span className="a-mono" style={{ fontSize: 11, color: "var(--text-dim)", minWidth: 50, textAlign: "right" }}>{r.ts}</span>
              <Button variant="ghost" size="sm">Inspect</Button>
              <Button size="sm" style={{ background: "var(--success-bg)", color: "var(--success)", border: "1px solid var(--success-border)" }}>Approve</Button>
              <Button variant="ghost" size="sm" style={{ color: "#f87171", borderColor: "var(--danger-border)" }}>Reject</Button>
            </div>
          ))}
        </div>
      </div>

      {/* run history */}
      <div className="a-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="a-serif" style={{ fontSize: 16, margin: 0 }}>Recent runs</h2>
        </div>
        <table className="a-table">
          <thead>
            <tr><th>Status</th><th>Source</th><th>New</th><th>Changed</th><th>Duration</th><th>When</th><th>Note</th></tr>
          </thead>
          <tbody>
            {RUNS_FULL.map((r, i) => (
              <tr key={i}>
                <td><Pill tone={r.status === "completed" ? "success" : r.status === "partial" ? "warning" : "danger"}>{r.status}</Pill></td>
                <td className="a-mono" style={{ fontSize: 12, color: "var(--text-body)" }}>{r.src}</td>
                <td className="a-mono" style={{ color: "var(--text-body)" }}>{r.new}</td>
                <td className="a-mono" style={{ color: "var(--text-body)" }}>{r.changed}</td>
                <td className="a-mono" style={{ color: "var(--text-muted)" }}>{r.dur}</td>
                <td className="a-mono" style={{ color: "var(--text-muted)" }}>{r.ts} ago</td>
                <td style={{ color: r.status === "failed" ? "#f87171" : "var(--text-muted)", fontSize: 12 }}>{r.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.ScrapeDashboard = ScrapeDashboard;
