/* OnboardingStep — multi-step profile builder */

const STEPS = [
  { id: "identity",   label: "Identity" },
  { id: "education",  label: "Education" },
  { id: "experience", label: "Experience" },
  { id: "attempts",   label: "Attempts" },
  { id: "preferences",label: "Preferences" },
];

function OnboardingStep({ onGoTo }) {
  const [stepIdx, setStepIdx] = React.useState(2);

  return (
    <div className="cc-grain" style={{ minHeight: "100vh", background: "var(--bg-root)", position: "relative" }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>

        {/* top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <span style={{ color: "var(--gold)", fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500, cursor: "pointer" }} onClick={() => onGoTo("marketing")}>Career Copilot</span>
          <span className="cc-mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{`Step 0${stepIdx + 1} of 0${STEPS.length}`}</span>
        </div>

        {/* step bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 48, paddingBottom: 20, borderBottom: "1px solid var(--border)" }}>
          {STEPS.map((s, i) => {
            const done = i < stepIdx, now = i === stepIdx;
            return (
              <React.Fragment key={s.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12,
                              color: done ? "var(--success)" : now ? "var(--gold)" : "var(--text-dim)" }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 9999,
                    background: done ? "var(--success-bg)" : now ? "var(--gold-faint)" : "transparent",
                    border: `1px solid ${done ? "var(--success-border)" : now ? "var(--gold-border-md)" : "var(--border-md)"}`,
                    display: "grid", placeItems: "center",
                    fontFamily: "var(--font-mono)", fontSize: 10
                  }}>
                    {done ? "✓" : String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontWeight: now ? 500 : 400 }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: done ? "var(--success-border)" : "var(--border)", margin: "0 10px" }} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* step content */}
        <div className="cc-fade-up">
          <Eyebrow>{STEPS[stepIdx].label}</Eyebrow>
          <h1 className="cc-serif" style={{ fontSize: 36, margin: "10px 0 8px" }}>Work experience, if any.</h1>
          <p style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 32, lineHeight: 1.55 }}>
            Relevant work exp boosts eligibility for certain PSU and regulatory posts — and excludes you from some "fresher only" roles. We need the years only; no CV upload required.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label className="cc-eyebrow" style={{ display: "block", marginBottom: 6 }}>Years of experience</label>
              <Input defaultValue="2" />
            </div>
            <div>
              <label className="cc-eyebrow" style={{ display: "block", marginBottom: 6 }}>Sector</label>
              <Input defaultValue="Banking / BFSI" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="cc-eyebrow" style={{ display: "block", marginBottom: 6 }}>Most recent role</label>
            <Input defaultValue="Credit Analyst · HDFC Bank" />
          </div>

          <label style={{ display: "flex", gap: 10, padding: 14, border: "1px solid var(--border)", borderRadius: 16, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" defaultChecked style={{ marginTop: 2, accentColor: "var(--gold)" }} />
            <div>
              <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>I'd like exams with work-experience requirements surfaced first</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>e.g. RBI Grade B (experienced), NHB Assistant Manager</div>
            </div>
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40 }}>
            <Button variant="ghost" onClick={() => setStepIdx(i => Math.max(0, i - 1))}>← Back</Button>
            <Button onClick={() => stepIdx < STEPS.length - 1 ? setStepIdx(i => i + 1) : onGoTo("dashboard")} iconRight="arrow-right">
              {stepIdx < STEPS.length - 1 ? "Continue" : "Finish · see my dashboard"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.OnboardingStep = OnboardingStep;
