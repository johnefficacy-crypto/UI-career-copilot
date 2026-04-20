/* RecruitmentsTable — dense admin data table */

const ROWS = [
  { org: "RBI",    title: "RBI Grade B — Officer (General)",      posts: 3, vac: "330",  cat: "Central",    dl: "14 Oct 2026", src: "ok",   status: "closing"  },
  { org: "SEBI",   title: "SEBI Grade A — Officer (General)",     posts: 2, vac: "97",   cat: "Regulatory", dl: "21 Oct 2026", src: "ok",   status: "urgent"   },
  { org: "SSC",    title: "SSC CGL 2026 — Tier I",                posts: 7, vac: "17,727",cat: "Central",   dl: "04 Nov 2026", src: "pend", status: "open"     },
  { org: "IBPS",   title: "IBPS PO 2026 — Probationary Officer",  posts: 1, vac: "4,135",cat: "Banking",    dl: "28 Oct 2026", src: "ok",   status: "open"     },
  { org: "NABARD", title: "NABARD Grade A — Assistant Manager",   posts: 4, vac: "150",  cat: "Central",    dl: "12 Nov 2026", src: "ok",   status: "open"     },
  { org: "IRDAI",  title: "IRDAI Assistant Manager 2026",         posts: 2, vac: "45",   cat: "Regulatory", dl: "28 Oct 2026", src: "ok",   status: "open"     },
  { org: "Railways",title:"RRB NTPC 2026",                        posts: 6, vac: "35,281",cat:"Central",    dl: "—",           src: "pend", status: "upcoming" },
  { org: "MPSC",   title: "MPSC State Service Pre",               posts: 5, vac: "620",  cat: "State PSC",  dl: "18 Sep 2026", src: "ok",   status: "closed"   },
];

const STATUS_PILL = {
  urgent:   { tone: "danger",  label: "Urgent · 1d" },
  closing:  { tone: "warning", label: "Closing · 14d" },
  open:     { tone: "success", label: "Open" },
  upcoming: { tone: "info",    label: "Upcoming" },
  closed:   { tone: "muted",   label: "Closed" },
};

function RecruitmentsTable() {
  return (
    <div style={{ padding: "32px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 className="a-serif" style={{ fontSize: 26, margin: "0 0 4px" }}>Recruitments</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>1,842 total · 96 open · 4 pending review</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" iconLeft="download" size="sm">Export CSV</Button>
          <Button iconLeft="plus" size="sm">Add recruitment</Button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Icon name="search" size={14} />
        <input className="a-input" placeholder="Search recruitment, org, or post…" style={{ flex: 1, minWidth: 220, background: "transparent", border: "none", padding: 0 }} />
        <Pill tone="gold">Open ×</Pill>
        <Pill tone="gold">Central ×</Pill>
        <Pill tone="muted">+ Organization</Pill>
        <Pill tone="muted">+ Deadline</Pill>
        <Pill tone="muted">+ Source status</Pill>
      </div>

      <div className="a-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="a-table">
          <thead>
            <tr>
              <th>Recruitment</th><th>Org</th><th>Posts</th><th>Vacancies</th><th>Category</th><th>Deadline</th><th>Source</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => {
              const s = STATUS_PILL[r.status];
              return (
                <tr key={i}>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{r.title}</td>
                  <td><span className="a-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.org}</span></td>
                  <td className="a-mono" style={{ color: "var(--text-body)" }}>{r.posts}</td>
                  <td className="a-mono" style={{ color: "var(--text-body)" }}>{r.vac}</td>
                  <td style={{ color: "var(--text-muted)" }}>{r.cat}</td>
                  <td className="a-mono" style={{ color: "var(--text-body)" }}>{r.dl}</td>
                  <td>{r.src === "ok" ? <span style={{ color: "var(--success)", fontSize: 12 }}>✓ official</span> : <span style={{ color: "#fcd34d", fontSize: 12 }}>⚠ pending</span>}</td>
                  <td><Pill tone={s.tone}>{s.label}</Pill></td>
                  <td style={{ textAlign: "right" }}><a style={{ color: "rgba(232,213,163,0.6)", fontSize: 12, cursor: "pointer" }}>Edit →</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 11, color: "var(--text-muted)" }}>
        <span className="a-mono">Showing 8 of 1,842</span>
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant="ghost" size="sm">← Prev</Button>
          <Button variant="ghost" size="sm">Next →</Button>
        </div>
      </div>
    </div>
  );
}

window.RecruitmentsTable = RecruitmentsTable;
