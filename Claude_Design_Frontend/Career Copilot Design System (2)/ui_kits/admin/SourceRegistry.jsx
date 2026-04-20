/* SourceRegistry — source list + inspector panel */

const SOURCES = [
  { host: "rbi.org.in",          path: "/careers",                freq: "6h",  ok: "99.8%", last: "12m",  status: "ok" },
  { host: "sebi.gov.in",         path: "/careers",                freq: "6h",  ok: "97.2%", last: "1h",   status: "warn" },
  { host: "upsc.gov.in",         path: "/notifications",          freq: "1h",  ok: "91.0%", last: "2h",   status: "fail" },
  { host: "ssc.nic.in",          path: "/Portal/Notifications",   freq: "6h",  ok: "98.8%", last: "12h",  status: "ok" },
  { host: "ibps.in",             path: "/home/current-openings",  freq: "6h",  ok: "99.5%", last: "6h",   status: "ok" },
  { host: "nabard.org",          path: "/careers",                freq: "12h", ok: "99.9%", last: "6h",   status: "ok" },
  { host: "irdai.gov.in",        path: "/careers",                freq: "12h", ok: "96.2%", last: "14h",  status: "warn" },
];

function SourceRegistry() {
  const [sel, setSel] = React.useState(2);
  const s = SOURCES[sel];

  return (
    <div style={{ padding: "32px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 className="a-serif" style={{ fontSize: 26, margin: "0 0 4px" }}>Source registry</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>342 active sources · 7 with issues · managed by Scraper QA admins</p>
        </div>
        <Button iconLeft="plus" size="sm">Add source</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div className="a-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="a-table">
            <thead>
              <tr><th>Host</th><th>Path</th><th>Freq</th><th>Uptime 30d</th><th>Last</th><th>Status</th></tr>
            </thead>
            <tbody>
              {SOURCES.map((src, i) => (
                <tr key={i} onClick={() => setSel(i)} style={{ cursor: "pointer", background: i === sel ? "rgba(232,213,163,0.04)" : undefined }}>
                  <td className="a-mono" style={{ color: "var(--text-primary)" }}>{src.host}</td>
                  <td className="a-mono" style={{ color: "var(--text-muted)", fontSize: 11 }}>{src.path}</td>
                  <td className="a-mono" style={{ color: "var(--text-muted)" }}>{src.freq}</td>
                  <td className="a-mono" style={{ color: src.status === "ok" ? "var(--success)" : src.status === "warn" ? "#fcd34d" : "#f87171" }}>{src.ok}</td>
                  <td className="a-mono" style={{ color: "var(--text-muted)" }}>{src.last} ago</td>
                  <td><Pill tone={src.status === "ok" ? "success" : src.status === "warn" ? "warning" : "danger"}>{src.status === "ok" ? "healthy" : src.status === "warn" ? "degraded" : "failing"}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* inspector panel */}
        <div className="a-card" style={{ alignSelf: "flex-start", position: "sticky", top: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div className="a-mono" style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>{s.host}</div>
              <div className="a-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.path}</div>
            </div>
            <Pill tone={s.status === "ok" ? "success" : s.status === "warn" ? "warning" : "danger"}>{s.status}</Pill>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div className="a-stat"><div className="lbl">Scraped in 30d</div><div className="val" style={{ fontSize: 20 }}>312</div></div>
            <div className="a-stat"><div className="lbl">Fails in 30d</div><div className="val" style={{ fontSize: 20 }}>28</div></div>
          </div>

          {s.status === "fail" && (
            <div style={{ padding: "10px 12px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: 10, fontSize: 12, color: "#f87171", marginBottom: 14 }}>
              Last 3 runs failed with <span className="a-mono">HTTP 504</span>. Upstream host is likely under load — scraper will retry with exponential backoff.
            </div>
          )}

          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>Change log</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "var(--text-body)" }}>
            {[
              { ts: "2h ago",   msg: "Scrape failed · 504", mono: "err" },
              { ts: "8h ago",   msg: "Scrape completed · 0 new", mono: "ok" },
              { ts: "2d ago",   msg: "Selector updated by aanya.m", mono: "info" },
              { ts: "5d ago",   msg: "Source re-enabled by kabir.r", mono: "info" },
            ].map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span className="a-mono" style={{ fontSize: 10, color: "var(--text-dim)", minWidth: 50 }}>{e.ts}</span>
                <span style={{ color: e.mono === "err" ? "#f87171" : e.mono === "ok" ? "var(--success)" : "var(--text-body)" }}>{e.msg}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <Button iconLeft="refresh-cw" size="sm">Re-fetch now</Button>
            <Button variant="ghost" iconLeft="eye" size="sm">Preview parse</Button>
            <Button variant="ghost" size="sm">Disable</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.SourceRegistry = SourceRegistry;
