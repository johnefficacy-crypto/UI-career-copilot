/* ChatPane — AI career chat with starter chips */

const STARTERS = [
  { icon: "target",        label: "Which exams am I eligible for right now?" },
  { icon: "calendar-days", label: "Build me a 12-week plan for RBI Grade B" },
  { icon: "book-open",     label: "Best strategy for SEBI Grade A paper II" },
  { icon: "scale",         label: "Compare RBI Grade B vs SEBI Grade A" },
  { icon: "landmark",      label: "What changed in UPSC syllabus this year?" },
  { icon: "bar-chart-3",   label: "Show my weak subjects from logged sessions" },
];

const SEED_CONVO = [
  { role: "user", content: "Which exams am I eligible for right now?" },
  { role: "assistant", content: "Based on your profile (26, OBC, M.Sc Economics, 2 attempts used), you're eligible for **12 open recruitments** this week. The tightest deadlines:\n\n• **RBI Grade B** — 14 Oct (14 days)\n• **SEBI Grade A** — 21 Oct\n• **NABARD Grade A** — 12 Nov\n\nWant me to walk through the eligibility reasoning for any one of these?" },
];

function ChatPane({ onGoTo }) {
  const [started, setStarted] = React.useState(true);
  const [draft, setDraft] = React.useState("");
  const [convo, setConvo] = React.useState(SEED_CONVO);
  const [thinking, setThinking] = React.useState(false);

  const send = (text) => {
    const msg = text || draft;
    if (!msg.trim()) return;
    setStarted(true);
    setConvo(c => [...c, { role: "user", content: msg }]);
    setDraft("");
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setConvo(c => [...c, { role: "assistant", content: "Here's a breakdown tailored to your profile. [This is a UI-kit mock — in production this streams from Claude.]" }]);
    }, 1400);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", display: "flex", flexDirection: "column" }}>
      <AppNav active="chat" onGoTo={onGoTo} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 820, width: "100%", margin: "0 auto", padding: "24px 24px 0", width: "100%" }}>
        {!started ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 80 }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <Pill tone="gold" icon="sparkles">Powered by Claude</Pill>
              <h1 className="cc-serif" style={{ fontSize: 36, margin: "16px 0 10px" }}>Ask your career copilot.</h1>
              <p style={{ fontSize: 15, color: "var(--text-muted)" }}>Eligibility, study plans, exam comparisons — grounded in your profile.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 720, margin: "0 auto", width: "100%" }}>
              {STARTERS.map((s, i) => (
                <button key={i} onClick={() => send(s.label)}
                  style={{
                    display: "flex", gap: 10, alignItems: "center",
                    background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14,
                    padding: "14px 16px", color: "var(--text-body)", textAlign: "left", fontSize: 13,
                    cursor: "pointer", fontFamily: "inherit", transition: "all var(--dur-fast) var(--ease)"
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold-border)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                  <span style={{ color: "var(--gold)", flexShrink: 0 }}><Icon name={s.icon} size={16} /></span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: "auto", padding: "24px 0", display: "flex", flexDirection: "column", gap: 20 }}>
            {convo.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 9999, flexShrink: 0,
                  background: m.role === "user" ? "var(--gold-faint)" : "var(--bg-surface-md)",
                  border: "1px solid var(--border)", color: m.role === "user" ? "var(--gold)" : "var(--text-body)",
                  display: "grid", placeItems: "center", fontFamily: "var(--font-serif)", fontSize: 12, fontWeight: 500
                }}>{m.role === "user" ? "P" : "★"}</div>
                <div style={{ flex: 1, fontSize: 14, color: "var(--text-body)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {m.content.split("**").map((chunk, j) => j % 2 === 1 ? <strong key={j} style={{ color: "var(--text-primary)" }}>{chunk}</strong> : <React.Fragment key={j}>{chunk}</React.Fragment>)}
                </div>
              </div>
            ))}
            {thinking && (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: 9999, background: "var(--bg-surface-md)", border: "1px solid var(--border)", color: "var(--text-body)", display: "grid", placeItems: "center", fontFamily: "var(--font-serif)", fontSize: 12 }}>★</div>
                <span className="cc-bounce"><i /><i /><i /></span>
              </div>
            )}
          </div>
        )}

        <div style={{ position: "sticky", bottom: 0, padding: "16px 0 24px", background: "linear-gradient(to bottom, transparent, var(--bg-app) 30%)" }}>
          <div style={{ display: "flex", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--border-md)", borderRadius: 20, padding: "8px 8px 8px 16px", alignItems: "flex-end" }}>
            <textarea value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about eligibility, deadlines, or strategy…"
              rows={1}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontSize: 14, resize: "none", padding: "8px 0", lineHeight: 1.5 }} />
            <button onClick={() => send()} style={{
              background: "var(--gold)", color: "#0c0c0c", width: 36, height: 36, borderRadius: 9999,
              border: "none", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0
            }}><Icon name="arrow-up" size={16} /></button>
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-dim)", marginTop: 10 }}>AI career chat requires a Pro or Elite plan after 5 free messages.</div>
        </div>
      </main>
    </div>
  );
}

window.ChatPane = ChatPane;
