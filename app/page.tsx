import Link from "next/link";
import ThemeToggle from "./components/ThemeToggle";
import HeroProductStack from "./components/HeroProductStack";
import LandingProductCarousel from "./components/LandingProductCarousel";
import AspirantModePreview from "./components/AspirantModePreview";

const EXAM_CHIPS = ["UPSC", "SSC", "IBPS", "SBI", "RBI", "SEBI", "NABARD", "Railways", "State PSC", "PSU"];

export default function LandingPage() {
  return (
    <div className="cc-page-shell cc-grid-bg">
      <header className="cc-nav"><div className="cc-nav-inner"><Link href="/" className="cc-logo">Career Copilot</Link><nav className="cc-nav-links" aria-label="Marketing"><a href="#product" className="cc-nav-link">Product</a><a href="#eligibility" className="cc-nav-link">Eligibility</a><a href="#pricing" className="cc-nav-link">Pricing</a><Link href="/auth/login" className="cc-nav-link">Sign in</Link><ThemeToggle /><Link href="/auth/signup" className="cc-btn-primary">Get started</Link></nav></div></header>
      <main>
        <section className="cc-section cc-hero cc-hero-layout">
          <div>
            <div className="cc-pill cc-gold-glow">Official-source-first exam intelligence</div>
            <h1 className="cc-hero-title">Stop missing the right government exams.</h1>
            <p className="cc-hero-subtitle">Career Copilot tracks official recruitment notifications, checks your eligibility post-wise, and turns every deadline into a clear next action.</p>
            <p className="cc-hero-support">For UPSC, SSC, Banking, Railways, Regulatory bodies, State PSCs, PSUs and more.</p>
            <div className="cc-cta-row"><Link href="/auth/signup" className="cc-btn-primary">Check my eligible exams</Link><Link href="/dashboard" className="cc-btn-secondary">Explore official notifications</Link></div>
            <div className="cc-chip-row">{EXAM_CHIPS.map((chip) => <span key={chip} className="cc-pill">{chip}</span>)}</div>
          </div>
          <HeroProductStack />
        </section>

        <section id="product" className="cc-section"><p className="cc-section-label">Interactive workflow preview</p><LandingProductCarousel /></section>

        <section className="cc-section"><p className="cc-section-label">Mission Control sample preview</p><div className="cc-dashboard-preview"><div className="cc-stats-grid"><div className="cc-stat-tile"><strong>12</strong><span>Eligible now</span></div><div className="cc-stat-tile"><strong>3</strong><span>Urgent deadlines</span></div><div className="cc-stat-tile"><strong>Domicile, PwBD status</strong><span>Missing fields</span></div></div><p><strong>Next action:</strong> Complete SEBI Grade A application.</p><p><strong>Today’s study target:</strong> Quant mock analysis, 90 minutes.</p><div className="cc-stat-visual"><div><span>Readiness</span><div className="cc-progress"><i style={{ width: '68%' }} /></div></div><div><span>Application tracker</span><div className="cc-lifecycle"><span className="is-done">Not started</span><span className="is-active">Draft</span><span>Submitted</span><span>Admit card</span><span>Result</span></div></div></div></div></section>

        <section className="cc-section"><p className="cc-section-label">Your preparation, converted into action.</p><div className="cc-workflow-grid"><article className="cc-card"><h3>Weekly target</h3><div className="cc-progress-ring" aria-label="8.5 of 14 hours completed"><svg viewBox="0 0 36 36"><path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" /><path className="cc-ring-value" d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" /></svg><strong>8.5 / 14h</strong></div></article><article className="cc-card"><h3>Mock trend</h3><div className="cc-mini-chart"><span style={{ height: '42%' }} /><span style={{ height: '55%' }} /><span style={{ height: '67%' }} /><span style={{ height: '74%' }} /></div><p>62 → 71 | Weak area: Quant</p></article><article className="cc-card"><h3>Focus streak</h3><p>6 days</p><p>Today: 90 min revision</p></article></div></section>

        <section className="cc-section"><p className="cc-section-label">Application lifecycle</p><ul className="cc-card"><li>SEBI Grade A: Draft</li><li>SSC CGL: Submitted</li><li>RBI Assistant: Not started</li></ul><div className="cc-lifecycle"><span>Not started</span><span>Draft</span><span>Submitted</span><span>Admit card</span><span>Appeared</span><span>Result</span></div></section>

        <section className="cc-section"><p className="cc-section-label">Official-source trust pipeline</p><div className="cc-pipeline"><span>Official source detected</span><span>Scraper captures evidence</span><span>Admin verifies recruitment</span><span>Deterministic engine matches profile</span><span>User gets action alert</span></div><div className="cc-chip-row"><span className="cc-pill">Official link</span><span className="cc-pill">Admin verified</span><span className="cc-pill">Deterministic engine</span><span className="cc-pill">Canonical apply URL</span><span className="cc-pill">No aggregator dependency</span></div></section>

        <section className="cc-section cc-before-after"><article className="cc-card"><h3>Before</h3><ul><li>12 Telegram groups</li><li>PDFs saved randomly</li><li>Manual eligibility confusion</li><li>Missed deadlines</li><li>No application state</li></ul></article><article className="cc-card"><h3>After Career Copilot</h3><ul><li>Official notification feed</li><li>Post-wise eligibility</li><li>Deadline-first action plan</li><li>Application tracker</li><li>AI study OS</li><li>Exam-specific community</li></ul></article></section>

        <section className="cc-section"><p className="cc-section-label">Aspirant mode sample preview</p><AspirantModePreview /></section>

        <section id="eligibility" className="cc-section"><p className="cc-section-label">Eligibility intelligence</p><div className="cc-card"><h2>Eligibility is not a checkbox. It is your opportunity map.</h2><p>Sample preview: deterministic engine checks eligibility. AI explains outcomes and next actions.</p></div></section>

        <section id="pricing" className="cc-section cc-final-cta"><h2>Your next exam opportunity should not slip past you.</h2><Link href="/auth/signup" className="cc-btn-primary">Create free account</Link></section>
      </main>
      <footer className="cc-footer"><div>© {new Date().getFullYear()} Career Copilot</div><div className="cc-footer-links"><a href="#product">Product</a><a href="#pricing">Pricing</a><Link href="/marketplace">Marketplace</Link><Link href="/auth/login">Sign in</Link></div></footer>
    </div>
  );
}
