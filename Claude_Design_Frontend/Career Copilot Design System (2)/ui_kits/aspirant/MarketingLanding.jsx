/* MarketingLanding — recreates app/page.tsx */

const EXAMS = ["UPSC", "SEBI", "RBI", "SSC", "IBPS", "NABARD", "IRDAI", "Railways", "State PSC"];

const FEATURES = [
  { icon: "bell",          title: "Notification tracker", desc: "Every recruitment notification from 500+ bodies — auto-tracked, deduplicated, and delivered to your feed the moment it drops." },
  { icon: "check-circle",  title: "Eligibility engine",   desc: "Your age, category, education, and attempt history matched against each post's exact criteria. No manual checking, ever again." },
  { icon: "calendar-days", title: "AI study planner",     desc: "Claude AI builds a week-by-week schedule tailored to your exam, your deadline, and your weak subjects. Adjusts as you log sessions." },
  { icon: "book-open",     title: "Course marketplace",   desc: "Buy test series, notes, and video courses from toppers and educators. Sell your own. Zero setup." },
  { icon: "message-square",title: "Structured forum",     desc: "Exam-specific discussion — not scattered across 40 Telegram groups. Searchable, moderated, permanent." },
  { icon: "bar-chart-3",   title: "Progress tracker",     desc: "Daily study logs, streak tracking, and week completion — so you know exactly where you stand at any moment." },
];

const TESTIMONIALS = [
  { name: "Priya Sharma",    role: "RBI Grade B 2024",       quote: "I was tracking 6 exams manually on a spreadsheet. Career Copilot collapsed it into one feed. The eligibility check alone saved me 3 pointless applications." },
  { name: "Arjun Mehta",     role: "SEBI Grade A aspirant",  quote: "The AI study plan actually accounted for my weak spots in Quant and gave me 3 extra weeks on it. First time I felt like I had a real coach." },
  { name: "Sneha Patel",     role: "SSC CGL 2023 qualifier", quote: "Stopped using four different apps and three Telegram channels. Everything I need is here. Especially the deadline countdown — saved me once already." },
];

function TopNav({ onGoTo }) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50, height: 56,
      borderBottom: "1px solid var(--border)",
      background: "rgba(12,12,12,0.80)", backdropFilter: "blur(12px)",
    }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 24px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "var(--gold)", fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}>Career Copilot</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <a className="cc-nav-link" style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Pricing</a>
          <a className="cc-nav-link" style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Forum</a>
          <a className="cc-nav-link" onClick={() => onGoTo("dashboard")} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Sign in →</a>
          <Button onClick={() => onGoTo("onboarding")} style={{ marginLeft: 8 }}>Create free account</Button>
        </div>
      </div>
    </nav>
  );
}

function Hero({ onGoTo }) {
  return (
    <section style={{ position: "relative", padding: "112px 24px 80px", overflow: "hidden" }}>
      <div className="cc-grid-bg" style={{ position: "absolute", inset: 0, opacity: 0.5 }} />
      <div className="cc-gold-glow" style={{ top: -120, left: "50%", transform: "translateX(-50%)" }} />
      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", position: "relative" }} className="cc-fade-up">
        <Pill tone="gold" icon="shield-check"><span style={{ fontSize: 11 }}>Trusted by 50,000+ aspirants</span></Pill>
        <h1 className="cc-serif-h1" style={{ marginTop: 20, marginBottom: 20 }}>
          The recruitment intel<br/>aspirants <em style={{ color: "var(--gold)", fontStyle: "italic" }}>actually trust.</em>
        </h1>
        <p style={{ fontSize: 18, color: "var(--text-body)", maxWidth: 620, margin: "0 auto 32px", lineHeight: 1.6 }}>
          Every recruitment from 500+ government, PSU, banking and regulatory bodies — filtered to just the ones <em style={{ color: "var(--gold)", fontStyle: "italic" }}>you</em> are eligible for. With the deadlines, the reasons, the source links.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Button onClick={() => onGoTo("onboarding")} iconRight="arrow-right">Start for free</Button>
          <Button variant="ghost" onClick={() => onGoTo("dashboard")}>See a live dashboard</Button>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-dim)" }}>No credit card · Free plan forever · 2-minute setup</div>
      </div>
    </section>
  );
}

function ExamStrip() {
  return (
    <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "20px 24px" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
        <span className="cc-eyebrow" style={{ color: "var(--text-dim)" }}>Tracking</span>
        {EXAMS.map(e => (
          <span key={e} className="cc-mono" style={{ fontSize: 13, color: "var(--text-muted)" }}>{e}</span>
        ))}
        <span className="cc-mono" style={{ fontSize: 13, color: "var(--gold)" }}>+ 490 more</span>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section style={{ padding: "112px 24px" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <Eyebrow style={{ textAlign: "center", marginBottom: 12 }}>What it does</Eyebrow>
        <h2 className="cc-serif-h2" style={{ textAlign: "center", marginBottom: 64, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
          Six jobs, one interface.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {FEATURES.map((f, i) => (
            <Card key={i} className="cc-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "var(--gold-faint)", border: "1px solid var(--gold-border)",
                display: "grid", placeItems: "center", color: "var(--gold)", marginBottom: 16
              }}>
                <Icon name={f.icon} size={18} />
              </div>
              <h3 className="cc-serif-h3" style={{ marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-body)", lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section style={{ padding: "112px 24px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <Eyebrow style={{ textAlign: "center", marginBottom: 12 }}>Aspirants</Eyebrow>
        <h2 className="cc-serif-h2" style={{ textAlign: "center", marginBottom: 64 }}>
          <em style={{ fontStyle: "italic", color: "var(--gold)" }}>Enough</em> of four apps and three Telegrams.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {TESTIMONIALS.map((t, i) => (
            <Card key={i}>
              <p style={{ fontSize: 15, color: "var(--text-body)", lineHeight: 1.6, margin: "0 0 20px" }}>"{t.quote}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9999, background: "var(--gold-faint)", color: "var(--gold)", display: "grid", placeItems: "center", fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 500 }}>{t.name[0]}</div>
                <div>
                  <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ onGoTo }) {
  return (
    <section style={{ padding: "112px 24px", textAlign: "center", position: "relative" }}>
      <div className="cc-gold-glow" style={{ top: 0, left: "50%", transform: "translateX(-50%)", opacity: 0.6 }} />
      <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
        <h2 className="cc-serif-h2" style={{ marginBottom: 16 }}>Stop missing the notification that matters.</h2>
        <p style={{ fontSize: 17, color: "var(--text-body)", marginBottom: 32 }}>Set up your profile in 2 minutes. See your eligible recruitments today.</p>
        <Button onClick={() => onGoTo("onboarding")} iconRight="arrow-right">Start for free</Button>
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-dim)" }}>No credit card · Free plan forever</div>
      </div>
    </section>
  );
}

function MarketingLanding({ onGoTo }) {
  return (
    <div className="cc-grain" style={{ background: "var(--bg-root)", minHeight: "100vh", position: "relative" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <TopNav onGoTo={onGoTo} />
        <Hero onGoTo={onGoTo} />
        <ExamStrip />
        <Features />
        <Testimonials />
        <FinalCta onGoTo={onGoTo} />
        <footer style={{ borderTop: "1px solid var(--border)", padding: "32px 24px", textAlign: "center", fontSize: 12, color: "var(--text-dim)" }}>
          © 2026 Career Copilot · Made in India for aspirants of Indian exams
        </footer>
      </div>
    </div>
  );
}

window.MarketingLanding = MarketingLanding;
